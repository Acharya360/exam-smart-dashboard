import express from 'express';
import { hashPassword, verifyPassword, createRateLimiter, classifyStoredPassword } from './server/passwordSecurity.js';
import { spawn } from 'child_process';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'node:crypto';
import { registerExamination } from './server/examination.js';
import { calculateResult } from './src/services/resultEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const sessions = new Map();
const safeProfile = ({ password, ...user }) => user;
async function requireSession(req, res, next) {
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('exam_session='));
  const token = cookie?.slice('exam_session='.length);
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) { sessions.delete(token); return res.status(401).json({ error: 'Please sign in to continue.' }); }
  try {
    const user = (await executeSql('SELECT * FROM dbo.profiles WHERE id=@id', { id: session.userId })).data[0];
    if (!user) return res.status(401).json({ error: 'Account is unavailable.' });
    req.user = safeProfile(user); req.sessionToken = token; next();
  } catch { res.status(503).json({ error: 'Database unavailable.' }); }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
  const allowedOrigins = new Set(['http://localhost:3000', 'http://127.0.0.1:3000', `http://localhost:${PORT}`]);
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) return res.status(403).json({error:'Origin not allowed.'});
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============================================================================
// Persistent SQL Server Worker Bridge (acharya360\SQLEXPRESS -> SSPU_Exam)
// ============================================================================

let psProcess = null;
let reqId = 0;
const callbacks = new Map();
let isDbReady = false;
let shuttingDown = false;

function initSqlWorker() {
  const scriptPath = path.join(__dirname, 'sql_worker.ps1');
  console.log(`[SQL Bridge] Launching persistent SQL worker with script: ${scriptPath}`);
  
  psProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-Server', 'acharya360\\SQLEXPRESS',
    '-Database', 'SSPU_Exam'
  ]);

  const rl = readline.createInterface({ input: psProcess.stdout });

  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'ready') {
        isDbReady = true;
        console.log(`[SQL Bridge] Connected to SQL Server instance: ${msg.status} (DB: ${msg.database})`);
        return;
      }
      if (callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.success) {
          resolve(msg);
        } else {
          reject(new Error(msg.error || 'SQL execution failed'));
        }
      }
    } catch (err) {
      console.error('[SQL Bridge] Error parsing worker message:', line, err);
    }
  });

  psProcess.stderr.on('data', (data) => {
    console.error(`[SQL Bridge Stderr]: ${data.toString()}`);
  });

  psProcess.on('close', (code) => {
    if (shuttingDown) return;
    console.warn(`[SQL Bridge] Worker process exited with code ${code}. Reconnecting in 2s...`);
    isDbReady = false;
    setTimeout(initSqlWorker, 2000);
  });
}

initSqlWorker();

function executeSql(sql, params = {}, type = 'query') {
  return new Promise((resolve, reject) => {
    if (!psProcess) {
      return reject(new Error('SQL Bridge is not initialized'));
    }
    const id = ++reqId;
    const timeout = setTimeout(() => {
      if (callbacks.has(id)) {
        callbacks.delete(id);
        reject(new Error(`SQL command timeout for query: ${sql.slice(0, 50)}...`));
      }
    }, 45000);

    callbacks.set(id, {
      resolve: (val) => {
        clearTimeout(timeout);
        resolve(val);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      }
    });

    const payload = JSON.stringify({ id, sql, params, type });
    psProcess.stdin.write(payload + '\n');
  });
}

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Health & Status
app.get('/api/health', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 'profiles' AS tbl, COUNT(*) AS cnt FROM dbo.profiles
      UNION ALL SELECT 'programs', COUNT(*) FROM dbo.programs
      UNION ALL SELECT 'exam_schedules', COUNT(*) FROM dbo.exam_schedules
      UNION ALL SELECT 'exam_tasks', COUNT(*) FROM dbo.exam_tasks
      UNION ALL SELECT 'course_master', COUNT(*) FROM dbo.course_master
      UNION ALL SELECT 'student_marks', COUNT(*) FROM dbo.student_marks;
    `;
    const result = await executeSql(statsQuery);
    const counts = {};
    if (result.data) {
      result.data.forEach(r => { counts[r.tbl] = r.cnt; });
    }
    res.json({
      status: 'ok',
      data_mode: (await executeSql('SELECT data_mode FROM dbo.exam_environment WHERE id=1')).data[0]?.data_mode || 'LIVE',
      database: 'SSPU_Exam',
      server: 'acharya360\\SQLEXPRESS',
      auth: 'Windows Integrated Security',
      counts
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Authentication (Login with password verification)
app.post('/api/auth/login', createRateLimiter(20), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || password.length > 1024) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = 'SELECT TOP 1 * FROM dbo.profiles WHERE LOWER(email) = LOWER(@email)';
    const result = await executeSql(query, { email: email.trim() });
    
    if (!result.data || result.data.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.data[0];
    // Check password (supports default Admin@123 or whatever is stored)
    if (!await verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (classifyStoredPassword(user.password) === 'legacy') await executeSql('UPDATE dbo.profiles SET password=@hash WHERE id=@id AND password=@previous', {id:user.id,hash:await hashPassword(password),previous:user.password}, 'execute');
    // Return user object without sensitive hash
    const { password: _, ...safeUser } = user;
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { userId: user.id, expires: Date.now() + 8 * 60 * 60 * 1000 });
    res.cookie('exam_session', token, { httpOnly: true, sameSite: 'strict', secure: req.secure, maxAge: 8 * 60 * 60 * 1000 });
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireSession, (req,res) => res.json({ user: req.user }));
app.post('/api/auth/logout', (req,res) => {
  const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('exam_session='));
  sessions.delete(cookie?.slice('exam_session='.length)); res.clearCookie('exam_session'); res.json({ success:true });
});
app.use('/api', requireSession);
app.use('/api', async (req,res,next) => {
  if (req.user.role !== 'COORDINATOR' || req.path.startsWith('/examination')) return next();
    if (req.method !== 'GET' && !(req.method === 'PATCH' && (req.path.startsWith('/tasks/') || req.path === `/profiles/${req.user.id}`)) && req.path !== '/auth/change-password') return res.status(403).json({ error:'Super Admin access required.' });
  try {
    const programs = (await executeSql('SELECT * FROM dbo.programs WHERE primary_coordinator_id=@id OR alternate_coordinator_id=@id', {id:req.user.id})).data;
    const codes = new Set(programs.map(p=>p.program_code)); const names = new Set(programs.map(p=>p.program_name));
    req.allowedProgrammeNames = [...names];
    if (req.path.startsWith('/tasks/') && req.method === 'PATCH') {
      const task=(await executeSql('SELECT * FROM dbo.exam_tasks WHERE id=@id',{id:req.path.split('/').pop()})).data[0];
      if (!task || !codes.has(task.program_code)) return res.status(403).json({error:'Task is outside your assigned programmes.'});
    }
    const json = res.json.bind(res);
    res.json = data => json(Array.isArray(data) ? data.filter(r => req.path === '/profiles' || (r.program_code ? codes.has(r.program_code) : names.has(r.cm_course_name))) : data);
    next();
  } catch { res.status(503).json({error:'Unable to verify programme access.'}); }
});
const examination = registerExamination(app, executeSql, requireSession);
app.get('/api/examination/template',(req,res)=>{
  if(req.user.role==='COORDINATOR')return res.status(403).json({error:'Super Admin access required.'});
  res.download(path.join(__dirname,'docs','Sample Templete.xlsx'),'Examination_Marks_Template.xlsx');
});

// 3. Change Password
app.post('/api/auth/change-password', createRateLimiter(10), async (req, res) => {
  try {
    const { email, newPassword, changedBy } = req.body;
    if (req.user.role === 'COORDINATOR' && email?.toLowerCase() !== req.user.email.toLowerCase()) return res.status(403).json({error:'You may only change your own password.'});
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 1024) return res.status(400).json({error:'Use at least eight characters.'});
    if (email?.toLowerCase() === req.user.email.toLowerCase()) {
      const current=(await executeSql('SELECT password FROM dbo.profiles WHERE id=@id',{id:req.user.id})).data[0];
      if(!req.body.currentPassword||!await verifyPassword(req.body.currentPassword,current?.password))return res.status(400).json({error:'Current password is required and must match.'});
    }
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and newPassword are required' });
    }

    const sql = `
      UPDATE dbo.profiles 
      SET password = @newPassword, 
          last_password_change = @now, 
          password_changed_by = @changedBy 
      WHERE LOWER(email) = LOWER(@email)
    `;
    await executeSql(sql, {
      email: email.trim(),
      newPassword: await hashPassword(newPassword),
      now: new Date().toISOString(),
      changedBy: req.user.id
    }, 'execute');

    const target=(await executeSql('SELECT id FROM dbo.profiles WHERE LOWER(email)=LOWER(@email)',{email:email.trim()})).data[0];
    if (!target) return res.status(404).json({error:'Staff account not found.'});
    for(const [token,session] of sessions) if(session.userId===target.id && token!==req.sessionToken) sessions.delete(token);
    await executeSql('INSERT INTO dbo.exam_processing_audit(action,actor,detail) VALUES(@action,@actor,@detail)',{action:'PASSWORD_RESET',actor:req.user.id,detail:JSON.stringify({targetId:target.id})},'execute');
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Profiles / Faculty Users
app.get('/api/profiles', async (req, res) => {
  try {
    const result = await executeSql('SELECT * FROM dbo.profiles ORDER BY full_name ASC');
    res.json((result.data || []).map(safeProfile));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.patch('/api/profiles/:id', async (req,res) => {
  try {
    const p=req.body;
    if(req.user.role==='COORDINATOR'&&req.params.id!==req.user.id)return res.status(403).json({error:'Access denied.'});
    if(p.role && !['COE','DYCOE','ACOE','COORDINATOR'].includes(p.role))return res.status(400).json({error:'Invalid role.'});
    await executeSql(`UPDATE dbo.profiles SET full_name=@name,department=@department,phone=@phone,title=@title WHERE id=@id`,{id:req.params.id,name:p.full_name||req.user.full_name,department:p.department||'',phone:p.phone||'',title:p.title||''},'execute');
    res.json(safeProfile((await executeSql('SELECT * FROM dbo.profiles WHERE id=@id',{id:req.params.id})).data[0]));
  }catch{res.status(400).json({error:'Could not update profile.'});}
});
app.delete('/api/profiles/:id',async(req,res)=>{
  if(req.params.id===req.user.id)return res.status(400).json({error:'You cannot delete your active account.'});
  try{await executeSql('DELETE FROM dbo.profiles WHERE id=@id',{id:req.params.id},'execute');res.json({success:true});}catch{res.status(409).json({error:'This account is linked to university records and cannot be deleted.'});}
});
app.post('/api/profiles/bulk-delete',async(req,res)=>{
  try{
    const {ids}=req.body;
    if(!Array.isArray(ids)||!ids.length)return res.status(400).json({error:'IDs array required.'});
    const targets=ids.filter(id=>id!==req.user.id);
    if(!targets.length)return res.status(400).json({error:'Cannot delete your active account.'});
    const params={activeId:req.user.id};
    const placeholders=targets.map((id,i)=>{params[`id${i}`]=id;return `@id${i}`;}).join(',');
    await executeSql(`DELETE FROM dbo.profiles WHERE id IN (${placeholders}) AND id<>@activeId`,params,'execute');
    res.json({success:true,count:targets.length});
  }catch{res.status(409).json({error:'One or more accounts are linked to university records and cannot be deleted.'});}
});
app.delete('/api/programs/:id',async(req,res)=>{
  try{const linked=(await executeSql('SELECT COUNT(*) n FROM dbo.exam_registrations WHERE program_id=@id',{id:req.params.id})).data[0];if(linked.n)return res.status(409).json({error:'Programme has student registrations. Reassign them before deletion.'});await executeSql('DELETE FROM dbo.programs WHERE id=@id',{id:req.params.id},'execute');res.json({success:true});}catch{res.status(409).json({error:'Programme has linked records and cannot be deleted.'});}
});
app.post('/api/programs/bulk-delete',async(req,res)=>{
  try{
    const {ids}=req.body;
    if(!Array.isArray(ids)||!ids.length)return res.status(400).json({error:'IDs array required.'});
    const params={};
    const placeholders=ids.map((id,i)=>{params[`id${i}`]=id;return `@id${i}`;}).join(',');
    const linked=(await executeSql(`SELECT COUNT(*) n FROM dbo.exam_registrations WHERE program_id IN (${placeholders})`,params)).data[0];
    if(linked.n)return res.status(409).json({error:`${linked.n} student registration(s) are linked to these programmes. Reassign them first.`});
    await executeSql(`DELETE FROM dbo.programs WHERE id IN (${placeholders})`,params,'execute');
    res.json({success:true,count:ids.length});
  }catch{res.status(409).json({error:'Programmes have linked records and cannot be deleted.'});}
});

app.post('/api/profiles', async (req, res) => {
  try {
    const { email, password, full_name, role, department, phone, title } = req.body;
    if (!email || !full_name || !['COE','DYCOE','ACOE','COORDINATOR'].includes(role) || typeof password !== 'string' || password.length<8 || password.length>1024) return res.status(400).json({error:'Name, email, valid role and a password of at least eight characters are required.'});
    const id = req.body.id || `user-${Date.now()}`;
    const sql = `
      IF EXISTS (SELECT 1 FROM dbo.profiles WHERE LOWER(email) = LOWER(@email))
      BEGIN
        UPDATE dbo.profiles 
        SET full_name = @full_name, role = @role, department = @department, phone = @phone, title = @title
        WHERE LOWER(email) = LOWER(@email)
      END
      ELSE
      BEGIN
        INSERT INTO dbo.profiles (id, email, password, full_name, role, department, phone, title, created_at)
        VALUES (@id, @email, @password, @full_name, @role, @department, @phone, @title, GETDATE())
      END
    `;
    await executeSql(sql, {
      id,
      email: email.trim(),
      password: await hashPassword(password),
      full_name: full_name || '',
      role: role || 'COORDINATOR',
      department: department || '',
      phone: phone || '',
      title: title || ''
    }, 'execute');

    const updated = await executeSql('SELECT TOP 1 * FROM dbo.profiles WHERE LOWER(email) = LOWER(@email)', { email: email.trim() });
    res.json(updated.data?.[0] ? safeProfile(updated.data[0]) : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Programs
app.get('/api/programs', async (req, res) => {
  try {
    const result = await executeSql('SELECT * FROM dbo.programs ORDER BY sr_no ASC');
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/programs/bulk', async (req, res) => {
  try {
    const { programs } = req.body;
    if (!Array.isArray(programs) || programs.length === 0) {
      return res.status(400).json({ error: 'Programs array is required' });
    }

    if (programs.some(p=>p.primary_coordinator_id && p.primary_coordinator_id===p.alternate_coordinator_id)) return res.status(400).json({error:'Primary and alternate coordinators must be different staff members.'});
    if (new Set(programs.map(p=>String(p.program_code).trim().toLowerCase())).size!==programs.length) return res.status(400).json({error:'Duplicate programme codes in this request.'});
    for (const p of programs) {
      const id = p.id || `prog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const sql = `
        IF EXISTS (SELECT 1 FROM dbo.programs WHERE LOWER(TRIM(program_code)) = LOWER(TRIM(@program_code)) OR id = @id)
        BEGIN
          UPDATE dbo.programs 
          SET sr_no = COALESCE(@sr_no, sr_no), 
              program_code = @program_code,
              program_name = @program_name, 
              school_name = @school_name,
              primary_coordinator_id = @primary_coordinator_id, 
              alternate_coordinator_id = @alternate_coordinator_id
          WHERE LOWER(TRIM(program_code)) = LOWER(TRIM(@program_code)) OR id = @id
        END
        ELSE
        BEGIN
          DECLARE @next_sr INT = @sr_no;
          IF @next_sr IS NULL OR @next_sr = 0
            SELECT @next_sr = ISNULL(MAX(sr_no), 0) + 1 FROM dbo.programs;
          INSERT INTO dbo.programs (id, sr_no, program_code, program_name, school_name, primary_coordinator_id, alternate_coordinator_id)
          VALUES (@id, @next_sr, @program_code, @program_name, @school_name, @primary_coordinator_id, @alternate_coordinator_id);
        END
      `;
      await executeSql(sql, {
        id,
        sr_no: p.sr_no || null,
        program_code: p.program_code,
        program_name: p.program_name,
        school_name: p.school_name,
        primary_coordinator_id: p.primary_coordinator_id || null,
        alternate_coordinator_id: p.alternate_coordinator_id || null
      }, 'execute');
    }

    const all = await executeSql('SELECT * FROM dbo.programs ORDER BY sr_no ASC');
    res.json(all.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Exam Schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const { program_code } = req.query;
    let sql = 'SELECT * FROM dbo.exam_schedules';
    const params = {};
    if (program_code) {
      sql += ' WHERE program_code = @program_code';
      params.program_code = program_code;
    }
    sql += ' ORDER BY exam_day ASC, pkg_no ASC';
    const result = await executeSql(sql, params);
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedules/bulk', async (req, res) => {
  try {
    const { schedules } = req.body;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({ error: 'Schedules array is required' });
    }

    for (const s of schedules) {
      const id = s.id || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const sql = `
        IF EXISTS (SELECT 1 FROM dbo.exam_schedules WHERE id = @id OR (program_code = @program_code AND paper_code = @paper_code AND exam_date = @exam_date))
        BEGIN
          UPDATE dbo.exam_schedules 
          SET pkg_no = @pkg_no, logic1 = @logic1, cm_school_name = @cm_school_name, cm_course_name = @cm_course_name,
              semester = @semester, elective = @elective, sm_subject_name = @sm_subject_name,
              student_count = @student_count, regular_count = @regular_count, backlog_count = @backlog_count,
              exam_day = @exam_day, date_odd_even = @date_odd_even, am_pm = @am_pm,
              exam_time = @exam_time, exam_type = @exam_type, exam_year = @exam_year
          WHERE id = @id OR (program_code = @program_code AND paper_code = @paper_code AND exam_date = @exam_date)
        END
        ELSE
        BEGIN
          INSERT INTO dbo.exam_schedules (id, pkg_no, logic1, cm_school_name, cm_course_name, program_code, semester, elective, paper_code, sm_subject_name, student_count, regular_count, backlog_count, exam_day, exam_date, date_odd_even, am_pm, exam_time, exam_type, exam_year)
          VALUES (@id, @pkg_no, @logic1, @cm_school_name, @cm_course_name, @program_code, @semester, @elective, @paper_code, @sm_subject_name, @student_count, @regular_count, @backlog_count, @exam_day, @exam_date, @date_odd_even, @am_pm, @exam_time, @exam_type, @exam_year)
        END
      `;
      await executeSql(sql, {
        id,
        pkg_no: s.pkg_no || 0,
        logic1: s.logic1 || '',
        cm_school_name: s.cm_school_name || '',
        cm_course_name: s.cm_course_name || '',
        program_code: s.program_code,
        semester: s.semester || 1,
        elective: s.elective || '',
        paper_code: s.paper_code,
        sm_subject_name: s.sm_subject_name,
        student_count: s.student_count || 0,
        regular_count: s.regular_count || 0,
        backlog_count: s.backlog_count || 0,
        exam_day: s.exam_day || 1,
        exam_date: s.exam_date || '',
        date_odd_even: s.date_odd_even || '',
        am_pm: s.am_pm || 'AM',
        exam_time: s.exam_time || '',
        exam_type: s.exam_type || 'Regular',
        exam_year: s.exam_year || '2026'
      }, 'execute');
    }

    const all = await executeSql('SELECT * FROM dbo.exam_schedules ORDER BY exam_day ASC, pkg_no ASC');
    res.json(all.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeSql('DELETE FROM dbo.exam_tasks WHERE schedule_id = @id; DELETE FROM dbo.exam_schedules WHERE id = @id;', { id }, 'execute');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/schedules/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'IDs array required.' });
    const params = {};
    const placeholders = ids.map((id, i) => { params[`id${i}`] = id; return `@id${i}`; }).join(',');
    await executeSql(`
      DELETE FROM dbo.exam_tasks WHERE schedule_id IN (${placeholders});
      DELETE FROM dbo.exam_schedules WHERE id IN (${placeholders});
    `, params, 'execute');
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Exam Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { program_code, assigned_to } = req.query;
    let sql = 'SELECT * FROM dbo.exam_tasks WHERE 1=1';
    const params = {};
    if (program_code) {
      sql += ' AND program_code = @program_code';
      params.program_code = program_code;
    }
    if (assigned_to) {
      sql += ' AND (assigned_to = @assigned_to OR alternate_user_id = @assigned_to)';
      params.assigned_to = assigned_to;
    }
    sql += ' ORDER BY created_at DESC';
    const result = await executeSql(sql, params);
    res.json(result.data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const t = req.body;
    const id = t.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const sql = `
      INSERT INTO dbo.exam_tasks (id, schedule_id, program_code, task_title, status, assigned_to, alternate_user_id, notes, due_date, updated_at, created_at)
      VALUES (@id, @schedule_id, @program_code, @task_title, @status, @assigned_to, @alternate_user_id, @notes, @due_date, GETDATE(), GETDATE())
    `;
    await executeSql(sql, {
      id,
      schedule_id: t.schedule_id,
      program_code: t.program_code,
      task_title: t.task_title,
      status: t.status || 'PENDING',
      assigned_to: t.assigned_to || null,
      alternate_user_id: t.alternate_user_id || null,
      notes: t.notes || '',
      due_date: t.due_date || ''
    }, 'execute');

    const created = await executeSql('SELECT TOP 1 * FROM dbo.exam_tasks WHERE id = @id', { id });
    res.json(created.data ? created.data[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, escalation_reason } = req.body;
    let { escalated_at, alternate_user_id, assigned_to } = req.body;
    if (!['PENDING','IN_PROGRESS','COMPLETED','ESCALATED_TO_ALTERNATE',undefined].includes(status)) return res.status(400).json({error:'Invalid task status.'});
    if (status === 'ESCALATED_TO_ALTERNATE') {
      const task = (await executeSql('SELECT * FROM dbo.exam_tasks WHERE id=@id',{id})).data[0];
      if (!task?.alternate_user_id || !String(escalation_reason||'').trim()) return res.status(400).json({error:'An alternate coordinator and escalation rationale are required.'});
      assigned_to = task.alternate_user_id; alternate_user_id = task.alternate_user_id; escalated_at = new Date().toISOString();
    } else if (req.user.role === 'COORDINATOR') { assigned_to=undefined; alternate_user_id=undefined; escalated_at=undefined; }
    
    let updates = ['updated_at = GETDATE()'];
    const params = { id };

    if (status !== undefined) {
      updates.push('status = @status');
      params.status = status;
    }
    if (notes !== undefined) {
      updates.push('notes = @notes');
      params.notes = notes;
    }
    if (escalated_at !== undefined) {
      updates.push('escalated_at = @escalated_at');
      params.escalated_at = escalated_at;
    }
    if (escalation_reason !== undefined) {
      updates.push('escalation_reason = @escalation_reason');
      params.escalation_reason = escalation_reason;
    }
    if (alternate_user_id !== undefined) {
      updates.push('alternate_user_id = @alternate_user_id');
      params.alternate_user_id = alternate_user_id;
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = @assigned_to');
      params.assigned_to = assigned_to;
    }

    const sql = `UPDATE dbo.exam_tasks SET ${updates.join(', ')} WHERE id = @id`;
    await executeSql(sql, params, 'execute');

    const updated = await executeSql('SELECT TOP 1 * FROM dbo.exam_tasks WHERE id = @id', { id });
    res.json(updated.data ? updated.data[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Course Master
app.get('/api/course-master/template', (req, res) => {
  const filePath = path.join(__dirname, 'docs', 'Course_Master_LTPS_Template.xlsx');
  res.download(filePath, 'Course_Master_LTPS_Template.xlsx');
});

app.get('/api/course-master', async (req, res) => {
  try {
    const result = await executeSql(`
      SELECT c.*, s.program_id, s.scheme_json 
      FROM dbo.course_master c 
      LEFT JOIN dbo.exam_course_settings s ON c.id = s.course_id 
      ORDER BY c.sr_no ASC
    `);
    const courses = (result.data || []).map(({ scheme_json, ...c }) => ({
      ...c,
      scheme: scheme_json ? JSON.parse(scheme_json) : null
    }));
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/course-master/bulk', async (req, res) => {
  try {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'Courses array is required' });
    }

    const programs = (await executeSql('SELECT id, program_name, program_code FROM dbo.programs')).data || [];

    for (const c of courses) {
      const existing = (await executeSql(
        'SELECT id FROM dbo.course_master WHERE paper_code = @paper_code AND cm_course_name = @cm_course_name',
        { paper_code: c.paper_code, cm_course_name: c.cm_course_name }
      )).data;

      const id = existing && existing.length > 0 ? existing[0].id : (c.id || `cm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`);

      const cat1_max = Number(c.cat1_max || 0);
      const cat1_min = Number(c.cat1_min || 0);
      const cat2_max = Number(c.cat2_max || 0);
      const cat2_min = Number(c.cat2_min || 0);
      const cat3_max = Number(c.cat3_max || 0);
      const cat3_min = Number(c.cat3_min || 0);

      const cap1_max = Number(c.cap1_max || 0);
      const cap1_min = Number(c.cap1_min || 0);
      const cap2_max = Number(c.cap2_max || 0);
      const cap2_min = Number(c.cap2_min || 0);
      const cap3_max = Number(c.cap3_max || 0);
      const cap3_min = Number(c.cap3_min || 0);

      const cas1_max = Number(c.cas1_max || 0);
      const cas1_min = Number(c.cas1_min || 0);
      const cas2_max = Number(c.cas2_max || 0);
      const cas2_min = Number(c.cas2_min || 0);
      const cas3_max = Number(c.cas3_max || 0);
      const cas3_min = Number(c.cas3_min || 0);

      const cat_max_marks = Number(c.cat_max_marks ?? (cat1_max + cat2_max + cat3_max));
      const cat_min_marks = Number(c.cat_min_marks ?? (cat1_min + cat2_min + cat3_min));

      const cap_max_marks = Number(c.cap_max_marks ?? (cap1_max + cap2_max + cap3_max));
      const cap_min_marks = Number(c.cap_min_marks ?? (cap1_min + cap2_min + cap3_min));

      const est_max_marks = Number(c.est_max_marks || 0);
      const est_min_marks = Number(c.est_min_marks || 0);

      const esp_max_marks = Number(c.esp_max_marks || 0);
      const esp_min_marks = Number(c.esp_min_marks || 0);

      const ess_max_marks = Number(c.ess_max_marks || 0);
      const ess_min_marks = Number(c.ess_min_marks || 0);

      const cas_max_marks = cas1_max + cas2_max + cas3_max;
      const cas_min_marks = cas1_min + cas2_min + cas3_min;

      const ia_max_marks = Number(c.ia_max_marks ?? (cat_max_marks + cap_max_marks + cas_max_marks));
      const ia_min_marks = Number(c.ia_min_marks ?? (cat_min_marks + cap_min_marks + cas_min_marks));

      const total_marks = Number(c.total_marks ?? (ia_max_marks + est_max_marks + esp_max_marks + ess_max_marks));
      const total_marks_min = Number(c.total_marks_min ?? (ia_min_marks + est_min_marks + esp_min_marks + ess_min_marks));

      const grading_category = (c.grading_category === 'Architecture' ? 'Architecture' : 'Non-Architecture');

      const params = {
        id,
        sr_no: c.sr_no || null,
        cm_course_name: c.cm_course_name,
        semester: String(c.semester || ''),
        paper_code: c.paper_code,
        sm_subject_name: c.sm_subject_name,
        l: Number(c.l || 0),
        t: Number(c.t || 0),
        p: Number(c.p || 0),
        s: Number(c.s || 0),
        total_credits: Number(c.total_credits || 0),
        grading_category,
        cat1_max, cat1_min,
        cat2_max, cat2_min,
        cat3_max, cat3_min,
        cap1_max, cap1_min,
        cap2_max, cap2_min,
        cap3_max, cap3_min,
        cas1_max, cas1_min,
        cas2_max, cas2_min,
        cas3_max, cas3_min,
        cat_max_marks, cat_min_marks,
        est_max_marks, est_min_marks,
        cap_max_marks, cap_min_marks,
        esp_max_marks, esp_min_marks,
        ess_max_marks, ess_min_marks,
        ia_max_marks, ia_min_marks,
        total_marks, total_marks_min
      };

      const sql = `
        IF EXISTS (SELECT 1 FROM dbo.course_master WHERE id = @id)
        BEGIN
          UPDATE dbo.course_master 
          SET sr_no = @sr_no, semester = @semester, sm_subject_name = @sm_subject_name,
              l = @l, t = @t, p = @p, s = @s, total_credits = @total_credits,
              grading_category = @grading_category,
              cat1_max = @cat1_max, cat1_min = @cat1_min,
              cat2_max = @cat2_max, cat2_min = @cat2_min,
              cat3_max = @cat3_max, cat3_min = @cat3_min,
              cap1_max = @cap1_max, cap1_min = @cap1_min,
              cap2_max = @cap2_max, cap2_min = @cap2_min,
              cap3_max = @cap3_max, cap3_min = @cap3_min,
              cas1_max = @cas1_max, cas1_min = @cas1_min,
              cas2_max = @cas2_max, cas2_min = @cas2_min,
              cas3_max = @cas3_max, cas3_min = @cas3_min,
              cat_max_marks = @cat_max_marks, cat_min_marks = @cat_min_marks,
              est_max_marks = @est_max_marks, est_min_marks = @est_min_marks,
              cap_max_marks = @cap_max_marks, cap_min_marks = @cap_min_marks,
              esp_max_marks = @esp_max_marks, esp_min_marks = @esp_min_marks,
              ess_max_marks = @ess_max_marks, ess_min_marks = @ess_min_marks,
              ia_max_marks = @ia_max_marks, ia_min_marks = @ia_min_marks,
              total_marks = @total_marks, total_marks_min = @total_marks_min,
              updated_at = GETDATE()
          WHERE id = @id
        END
        ELSE
        BEGIN
          INSERT INTO dbo.course_master (
            id, sr_no, cm_course_name, semester, paper_code, sm_subject_name,
            l, t, p, s, total_credits, grading_category,
            cat1_max, cat1_min, cat2_max, cat2_min, cat3_max, cat3_min,
            cap1_max, cap1_min, cap2_max, cap2_min, cap3_max, cap3_min,
            cas1_max, cas1_min, cas2_max, cas2_min, cas3_max, cas3_min,
            cat_max_marks, cat_min_marks, est_max_marks, est_min_marks,
            cap_max_marks, cap_min_marks, esp_max_marks, esp_min_marks,
            ess_max_marks, ess_min_marks, ia_max_marks, ia_min_marks,
            total_marks, total_marks_min, created_at, updated_at
          )
          VALUES (
            @id, @sr_no, @cm_course_name, @semester, @paper_code, @sm_subject_name,
            @l, @t, @p, @s, @total_credits, @grading_category,
            @cat1_max, @cat1_min, @cat2_max, @cat2_min, @cat3_max, @cat3_min,
            @cap1_max, @cap1_min, @cap2_max, @cap2_min, @cap3_max, @cap3_min,
            @cas1_max, @cas1_min, @cas2_max, @cas2_min, @cas3_max, @cas3_min,
            @cat_max_marks, @cat_min_marks, @est_max_marks, @est_min_marks,
            @cap_max_marks, @cap_min_marks, @esp_max_marks, @esp_min_marks,
            @ess_max_marks, @ess_min_marks, @ia_max_marks, @ia_min_marks,
            @total_marks, @total_marks_min, GETDATE(), GETDATE()
          )
        END
      `;
      await executeSql(sql, params, 'execute');

      // Match program_id
      const matchedProg = programs.find(p => p.program_name === c.cm_course_name || p.program_code === c.program_code);
      const programId = matchedProg ? matchedProg.id : null;

      // Construct scheme if not provided
      const theoryActive = (cat1_max + cat2_max + cat3_max + est_max_marks) > 0;
      const practicalActive = (cap1_max + cap2_max + cap3_max + esp_max_marks) > 0;
      const skillsActive = (cas1_max + cas2_max + cas3_max + ess_max_marks) > 0;

      const scheme = c.scheme || {
        category: grading_category,
        credits: Number(c.total_credits || 0),
        internalPass: ia_max_marks > 0 && ia_min_marks > 0 ? Math.round((ia_min_marks / ia_max_marks) * 100) : (grading_category === 'Architecture' ? 45 : 40),
        overallPass: total_marks > 0 && total_marks_min > 0 ? Math.round((total_marks_min / total_marks) * 100) : (grading_category === 'Architecture' ? 45 : 40),
        integerMarks: true,
        approved: true,
        approvalReference: 'University Board of Studies LTPS Scheme',
        heads: {
          theory: {
            active: theoryActive,
            ca: [cat1_max, cat2_max, cat3_max],
            ese: est_max_marks,
            pass: est_max_marks > 0 && est_min_marks > 0 ? Math.round((est_min_marks / est_max_marks) * 100) : (grading_category === 'Architecture' ? 45 : 40),
          },
          practical: {
            active: practicalActive,
            ca: [cap1_max, cap2_max, cap3_max],
            ese: esp_max_marks,
            pass: esp_max_marks > 0 && esp_min_marks > 0 ? Math.round((esp_min_marks / esp_max_marks) * 100) : (grading_category === 'Architecture' ? 45 : 40),
          },
          skills: {
            active: skillsActive,
            ca: [cas1_max, cas2_max, cas3_max],
            ese: ess_max_marks,
            pass: ess_max_marks > 0 && ess_min_marks > 0 ? Math.round((ess_min_marks / ess_max_marks) * 100) : (grading_category === 'Architecture' ? 45 : 40),
          },
        },
      };

      // Save scheme into exam_course_settings
      await executeSql(`
        IF NOT EXISTS (SELECT 1 FROM dbo.exam_course_settings WHERE course_id = @course_id)
          INSERT INTO dbo.exam_course_settings (course_id, program_id, scheme_json, updated_at)
          VALUES (@course_id, @program_id, @scheme_json, SYSUTCDATETIME());
        ELSE
          UPDATE dbo.exam_course_settings
          SET program_id = COALESCE(@program_id, program_id),
              scheme_json = @scheme_json,
              updated_at = SYSUTCDATETIME()
          WHERE course_id = @course_id;
      `, {
        course_id: id,
        program_id: programId,
        scheme_json: JSON.stringify(scheme)
      }, 'execute');
    }

    await examination.sync();

    const result = await executeSql(`
      SELECT c.*, s.program_id, s.scheme_json 
      FROM dbo.course_master c 
      LEFT JOIN dbo.exam_course_settings s ON c.id = s.course_id 
      ORDER BY c.sr_no ASC
    `);
    const all = (result.data || []).map(({ scheme_json, ...c }) => ({
      ...c,
      scheme: scheme_json ? JSON.parse(scheme_json) : null
    }));
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/course-master/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeSql('DELETE FROM dbo.course_master WHERE id = @id', { id }, 'execute');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/course-master/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'IDs array required.' });
    const params = {};
    const placeholders = ids.map((id, i) => { params[`id${i}`] = id; return `@id${i}`; }).join(',');
    await executeSql(`DELETE FROM dbo.course_master WHERE id IN (${placeholders})`, params, 'execute');
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Student Marks
app.get('/api/student-marks', async (req, res) => {
  try {
    const { paper_code, cm_course_name, assessment_type, academic_year, prn, limit = 500, offset = 0 } = req.query;
    let sql = 'SELECT * FROM dbo.student_marks WHERE 1=1';
    const params = {};

    if (paper_code) {
      sql += ' AND paper_code = @paper_code';
      params.paper_code = paper_code;
    }
    if (req.allowedProgrammeNames) {
      if (!req.allowedProgrammeNames.length) return res.json([]);
      const slots=req.allowedProgrammeNames.map((name,i)=>{params[`scope${i}`]=name;return `@scope${i}`;});
      sql+=` AND cm_course_name IN (${slots.join(',')})`;
    }
    if (cm_course_name) {
      sql += ' AND cm_course_name = @cm_course_name';
      params.cm_course_name = cm_course_name;
    }
    if (assessment_type) {
      sql += ' AND assessment_type = @assessment_type';
      params.assessment_type = assessment_type;
    }
    if (academic_year) {
      sql += ' AND academic_year = @academic_year';
      params.academic_year = academic_year;
    }
    if (prn) {
      sql += ' AND prn = @prn';
      params.prn = prn;
    }

    // Count query for total records (used by client-side pagination)
    const countSql = sql.replace(/ORDER BY.*$/,'').replace('SELECT *','SELECT COUNT(*) AS total');
    const countResult = await executeSql(countSql, params, 'recordset');
    const total = countResult.data?.[0]?.total || 0;

    sql += ' ORDER BY prn ASC, assessment_type ASC, id ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    params.offset = parseInt(offset) || 0;
    params.limit = Math.min(parseInt(limit) || 500, 5000);

    const result = await executeSql(sql, params);
    const rows = (result.data || []).map(m=>({...m,theory:m.theory_absent?'AB':m.theory,practical:m.practical_absent?'AB':m.practical,skills:m.skills_absent?'AB':m.skills}));
    res.json({ data: rows, total, page: Math.floor(params.offset / params.limit) + 1, pageSize: params.limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/student-marks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await executeSql('DELETE FROM dbo.student_marks WHERE id = @id', { id }, 'execute');
    await examination.sync();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express server
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Express API] SSPU_Exam Backend Server running at http://localhost:${PORT}`);
  console.log(`[Express API] Connected to Microsoft SQL Server: acharya360\\SQLEXPRESS (Database: SSPU_Exam)`);
});

process.on('SIGINT', () => {
  shuttingDown = true;
  if (psProcess) psProcess.kill();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  shuttingDown = true;
  if (psProcess) psProcess.kill();
  server.close(() => process.exit(0));
});

process.on('uncaughtException', (err) => {
  console.error('[Express API Error] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Express API Error] Unhandled Rejection at:', promise, 'reason:', reason);
});


