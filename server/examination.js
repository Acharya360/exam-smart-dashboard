import { calculateResult, validateScheme, HEADS } from '../src/services/resultEngine.ts';
import { canonicalSemester } from '../src/utils/validation/normalizer.ts';

// Examination DDL lives in migrations/NNN_*.sql and is applied by scripts/migrate.mjs with a verified backup.

export function registerExamination(app, executeSql, requireSession) {
  const admin = (req, res, next) => req.user.role === 'COORDINATOR' ? res.status(403).json({ error: 'Super Admin access required.' }) : next();
  const audit = (action, actor, detail) => executeSql('INSERT INTO dbo.exam_processing_audit(action,actor,detail) VALUES(@action,@actor,@detail)', { action, actor, detail: JSON.stringify(detail) }, 'execute');
  const sync = async () => {
    await executeSql(`SET XACT_ABORT ON; BEGIN TRANSACTION;
      INSERT INTO dbo.exam_course_settings(course_id,program_id)
      SELECT c.id, (SELECT MIN(p.id) FROM dbo.programs p WHERE p.program_name=c.cm_course_name HAVING COUNT(*)=1)
      FROM dbo.course_master c WHERE NOT EXISTS(SELECT 1 FROM dbo.exam_course_settings s WHERE s.course_id=c.id);
      INSERT INTO dbo.exam_registrations(prn,student_name,cm_course_name,semester,paper_code,academic_year,exam_year)
      SELECT m.prn,MAX(m.student_name),m.cm_course_name,m.semester,m.paper_code,m.academic_year,m.exam_year
      FROM dbo.student_marks m WHERE NOT EXISTS(SELECT 1 FROM dbo.exam_registrations r
      WHERE r.prn=m.prn AND r.cm_course_name=m.cm_course_name AND r.semester=m.semester AND r.paper_code=m.paper_code AND r.academic_year=m.academic_year AND r.exam_year=m.exam_year)
      GROUP BY m.prn,m.cm_course_name,m.semester,m.paper_code,m.academic_year,m.exam_year;
      UPDATE r SET course_id=(SELECT MIN(c.id) FROM dbo.course_master c
      WHERE c.cm_course_name=r.cm_course_name AND c.semester=r.semester AND c.paper_code=r.paper_code HAVING COUNT(*)=1)
      FROM dbo.exam_registrations r;
      UPDATE r SET program_id=s.program_id FROM dbo.exam_registrations r LEFT JOIN dbo.exam_course_settings s ON s.course_id=r.course_id;
      INSERT INTO dbo.exam_students(prn,student_name) SELECT r.prn,MAX(r.student_name) FROM dbo.exam_registrations r WHERE NOT EXISTS(SELECT 1 FROM dbo.exam_students s WHERE s.prn=r.prn) GROUP BY r.prn;
      COMMIT;`, {}, 'execute');
  };
  const load = async (user) => {
    const programs = (await executeSql('SELECT * FROM dbo.programs')).data;
    const allowed = new Set(programs.filter(p => user.role !== 'COORDINATOR' || p.primary_coordinator_id === user.id || p.alternate_coordinator_id === user.id).map(p => p.id));
    const courses = (await executeSql('SELECT c.*,s.program_id,s.scheme_json FROM dbo.course_master c LEFT JOIN dbo.exam_course_settings s ON c.id=s.course_id')).data
      .filter(c => user.role !== 'COORDINATOR' || allowed.has(c.program_id)).map(({ scheme_json, ...c }) => ({ ...c, scheme: scheme_json ? JSON.parse(scheme_json) : null }));
    const regs = (await executeSql('SELECT * FROM dbo.exam_registrations')).data.filter(r => user.role !== 'COORDINATOR' || allowed.has(r.program_id));
    const marks = (await executeSql('SELECT * FROM dbo.student_marks')).data.map(m=>({...m,theory:m.theory_absent?'AB':m.theory,practical:m.practical_absent?'AB':m.practical,skills:m.skills_absent?'AB':m.skills}));
    const key = r => JSON.stringify([r.prn,r.cm_course_name,r.semester,r.paper_code,r.academic_year,r.exam_year]);
    const grouped = new Map();
    for (const m of marks) { const k = key(m); if (!grouped.has(k)) grouped.set(k, []); grouped.get(k).push(m); }
    const registrations = regs.map(r => {
      const course = courses.find(c => c.id === r.course_id);
      const program = programs.find(p => p.id === r.program_id);
      const rows = grouped.get(key(r)) || [];
      const result = calculateResult(rows, course?.scheme ?? null);
      if (!r.program_id || !r.course_id) { result.status='WITHHELD'; result.reasons.push('Student registration has no unique programme/subject mapping.'); }
      return {
        ...r,
        ...result,
        credits: course?.scheme?.credits ?? course?.total_credits ?? 0,
        records: rows.length,
        school_name: program?.school_name || '',
        sm_subject_name: course?.sm_subject_name || '',
        grading_category: course?.grading_category || course?.scheme?.category || 'Non-Architecture'
      };
    });
    const history = user.role === 'COORDINATOR' ? [] : (await executeSql('SELECT TOP 30 * FROM dbo.exam_processing_audit ORDER BY id DESC')).data;
    return { programs: programs.filter(p => allowed.has(p.id)), courses, registrations, audit: history };
  };
  app.use('/api/examination', requireSession);
  app.get('/api/examination', async (req,res) => {
    try { res.json(await load(req.user)); } catch { res.status(500).json({ error: 'Unable to load examination data. Check the database connection and migration.' }); }
  });
  app.post('/api/examination/sync', admin, async (req,res) => {
    try { await sync(); await audit('SYNC', req.user.id, { source: 'student_marks', mode: 'Preserve marks; exact program/semester/subject matching' }); res.json(await load(req.user)); }
    catch { res.status(500).json({ error: 'Synchronization failed. Existing marks have been preserved.' }); }
  });
  app.post('/api/examination/students/bulk', admin, async (req,res) => {
    try {
      const { students, clearExisting = false, skipInvalid = true } = req.body;
      if (!Array.isArray(students) || !students.length || students.length > 60000) {
        return res.status(400).json({ error: 'Upload between 1 and 60,000 student rows at a time.' });
      }

      if (clearExisting) {
        await executeSql('DELETE FROM dbo.exam_registrations; DELETE FROM dbo.exam_students;', {}, 'execute');
      }

      const programs = (await executeSql('SELECT id, program_code, program_name, school_name FROM dbo.programs')).data;
      const courses = (await executeSql('SELECT id, program_code, cm_course_name, semester, paper_code, sm_subject_name FROM dbo.course_master')).data;
      const existingRegs = (await executeSql('SELECT prn,cm_course_name,semester,paper_code,academic_year,exam_year FROM dbo.exam_registrations')).data;

      const clean = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const str = v => (v === null || v === undefined ? '' : String(v).trim());
      const regKey = r => JSON.stringify([str(r.prn), str(r.cm_course_name), str(r.semester), str(r.paper_code).toUpperCase(), str(r.academic_year), str(r.exam_year)]);
      const seen = new Set(existingRegs.map(regKey));

      const findProgram = pCode => {
        const target = clean(pCode);
        return programs.find(p => clean(p.program_name) === target || clean(p.program_code) === target);
      };

      const newCoursesToInsert = [];
      const getOrProvisionCourse = (program, sem, paper, courseName) => {
        const normPaper = clean(paper);
        const sameProg = c => clean(c.program_code) === clean(program.program_code) || clean(c.cm_course_name) === clean(program.program_name);
        const matches = courses.filter(c => sameProg(c) && clean(c.paper_code) === normPaper);
        if (matches.length > 0) {
          const wantSem = canonicalSemester(sem);
          return matches.find(c => canonicalSemester(c.semester) === wantSem) || matches[0];
        }
        // Auto-provision if not found
        const courseId = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const subjectName = (courseName && courseName.trim()) ? courseName.trim() : paper;
        const newC = {
          id: courseId,
          program_code: program.program_code,
          cm_course_name: program.program_name,
          semester: String(sem).trim(),
          paper_code: paper,
          sm_subject_name: subjectName,
          program_id: program.id
        };
        courses.push(newC);
        newCoursesToInsert.push(newC);
        return newC;
      };

      const seenInUpload = new Set();
      const mismatches = [];
      const validRegistrations = [];
      const uniqueStudentsMap = new Map();
      let duplicatesSkipped = 0;

      for (const [index, s] of students.entries()) {
        const rowNo = index + 1;
        const prn = str(s.prn);
        const name = str(s.student_name);
        const semester = str(s.semester);
        const academicYear = str(s.academic_year);
        const examYear = str(s.exam_year);
        const progStr = str(s.program_code);
        const courseName = str(s.course_name);

        if (!prn || !name || !semester || !academicYear || !examYear || !progStr) {
          const reason = !prn ? 'PRN is required' : !name ? 'Student name is required' : !semester ? 'Semester is required' : !progStr ? 'Program is required' : 'Academic year / Exam year is required';
          if (!skipInvalid) return res.status(400).json({ error: `Row ${rowNo}: ${reason}.` });
          mismatches.push({ row: rowNo, prn, studentName: name, program: progStr, reason });
          continue;
        }

        const program = findProgram(progStr);
        if (!program) {
          const reason = `Program "${progStr}" not found in programme registry`;
          if (!skipInvalid) return res.status(400).json({ error: `Row ${rowNo}: ${reason}.` });
          mismatches.push({ row: rowNo, prn, studentName: name, program: progStr, reason });
          continue;
        }

        let papers = s.paper_codes;
        if (typeof papers === 'string') papers = papers.split(/[,;]/);
        if (!Array.isArray(papers) || !papers.length) {
          if (!skipInvalid) return res.status(400).json({ error: `Row ${rowNo}: At least one paper code is required.` });
          mismatches.push({ row: rowNo, prn, studentName: name, program: progStr, reason: 'No paper code provided' });
          continue;
        }

        if (!uniqueStudentsMap.has(prn)) {
          uniqueStudentsMap.set(prn, name);
        }

        for (const raw of papers) {
          const paper = str(raw).toUpperCase();
          if (!paper) continue;
          const course = getOrProvisionCourse(program, semester, paper, courseName);
          const cmName = course.cm_course_name || program.program_name;
          const key = regKey({ prn, cm_course_name: cmName, semester, paper_code: course.paper_code, academic_year: academicYear, exam_year: examYear });

          if (seenInUpload.has(key)) {
            duplicatesSkipped++;
            continue;
          }
          seenInUpload.add(key);

          if (seen.has(key)) {
            duplicatesSkipped++;
            continue;
          }
          seen.add(key);

          validRegistrations.push({
            prn,
            name,
            cmName,
            sem: semester,
            paper: course.paper_code,
            ay: academicYear,
            ey: examYear,
            courseId: course.id,
            programId: program.id
          });
        }
      }

      // Batch insert any newly provisioned courses
      if (newCoursesToInsert.length > 0) {
        for (let i = 0; i < newCoursesToInsert.length; i += 100) {
          const chunk = newCoursesToInsert.slice(i, i + 100);
          const params = {};
          let sql = '';
          chunk.forEach((c, idx) => {
            params[`cid_${idx}`] = c.id;
            params[`pcode_${idx}`] = c.program_code;
            params[`cname_${idx}`] = c.cm_course_name;
            params[`sem_${idx}`] = c.semester;
            params[`paper_${idx}`] = c.paper_code;
            params[`sname_${idx}`] = c.sm_subject_name;
            params[`pid_${idx}`] = c.program_id;
            sql += `
              IF NOT EXISTS (SELECT 1 FROM dbo.course_master WHERE id = @cid_${idx} OR (program_code = @pcode_${idx} AND semester = @sem_${idx} AND paper_code = @paper_${idx}))
              BEGIN
                INSERT INTO dbo.course_master(id, program_code, cm_course_name, semester, paper_code, sm_subject_name)
                VALUES (@cid_${idx}, @pcode_${idx}, @cname_${idx}, @sem_${idx}, @paper_${idx}, @sname_${idx});
                INSERT INTO dbo.exam_course_settings(course_id, program_id, updated_at)
                VALUES (@cid_${idx}, @pid_${idx}, SYSUTCDATETIME());
              END;`;
          });
          await executeSql(sql, params, 'execute');
        }
      }

      // Batch upsert unique students
      const studentEntries = Array.from(uniqueStudentsMap.entries());
      if (studentEntries.length > 0) {
        for (let i = 0; i < studentEntries.length; i += 200) {
          const chunk = studentEntries.slice(i, i + 200);
          const params = {};
          let sql = '';
          chunk.forEach(([prn, name], idx) => {
            params[`sprn_${idx}`] = prn;
            params[`sname_${idx}`] = name;
            sql += `
              IF EXISTS (SELECT 1 FROM dbo.exam_students WHERE prn = @sprn_${idx})
                UPDATE dbo.exam_students SET student_name = @sname_${idx}, updated_at = SYSUTCDATETIME() WHERE prn = @sprn_${idx};
              ELSE
                INSERT INTO dbo.exam_students(prn, student_name) VALUES (@sprn_${idx}, @sname_${idx});`;
          });
          await executeSql(sql, params, 'execute');
        }
      }

      // Batch insert registrations
      if (validRegistrations.length > 0) {
        for (let i = 0; i < validRegistrations.length; i += 150) {
          const chunk = validRegistrations.slice(i, i + 150);
          const params = {};
          let sql = 'INSERT INTO dbo.exam_registrations(prn, student_name, cm_course_name, semester, paper_code, academic_year, exam_year, course_id, program_id) VALUES ';
          const valueClauses = chunk.map((reg, idx) => {
            params[`rprn_${idx}`] = reg.prn;
            params[`rname_${idx}`] = reg.name;
            params[`rcm_${idx}`] = reg.cmName;
            params[`rsem_${idx}`] = reg.sem;
            params[`rpaper_${idx}`] = reg.paper;
            params[`ray_${idx}`] = reg.ay;
            params[`rey_${idx}`] = reg.ey;
            params[`rcid_${idx}`] = reg.courseId;
            params[`rpid_${idx}`] = reg.programId;
            return `(@rprn_${idx}, @rname_${idx}, @rcm_${idx}, @rsem_${idx}, @rpaper_${idx}, @ray_${idx}, @rey_${idx}, @rcid_${idx}, @rpid_${idx})`;
          });
          sql += valueClauses.join(', ') + ';';
          await executeSql(sql, params, 'execute');
        }
      }

      await audit('STUDENTS_IMPORT', req.user.id, {
        studentsImported: uniqueStudentsMap.size,
        registrationsCreated: validRegistrations.length,
        duplicatesSkipped,
        coursesProvisioned: newCoursesToInsert.length,
        mismatchesCount: mismatches.length
      });

      res.json({
        success: true,
        studentsImported: uniqueStudentsMap.size,
        registrationsCreated: validRegistrations.length,
        duplicatesSkipped,
        coursesProvisioned: newCoursesToInsert.length,
        mismatches
      });
    } catch (err) {
      console.error('[Students Import Error]:', err);
      res.status(500).json({ error: 'Student master import failed. Check database connection and file data.' });
    }
  });
  app.put('/api/examination/courses/:id', admin, async (req,res) => {
    try {
      const { program_id, scheme } = req.body;
      const errors = validateScheme(scheme);
      if (errors.length) return res.status(400).json({ error: errors.join(' ') });
      const c = (await executeSql('SELECT id FROM dbo.course_master WHERE id=@id', { id: req.params.id })).data[0];
      const p = (await executeSql('SELECT id FROM dbo.programs WHERE id=@id', { id: program_id })).data[0];
      if (!c || !p) return res.status(400).json({ error: 'Choose an existing course and programme.' });
      await executeSql(`IF NOT EXISTS(SELECT 1 FROM dbo.exam_course_settings WHERE course_id=@id)
      INSERT INTO dbo.exam_course_settings(course_id) VALUES(@id);
      UPDATE dbo.exam_course_settings SET program_id=@program,scheme_json=@scheme,updated_at=SYSUTCDATETIME() WHERE course_id=@id;`,
      { id: c.id, program: p.id, scheme: JSON.stringify(scheme) }, 'execute');
      await sync(); await audit('SCHEME_SAVED', req.user.id, { course_id: c.id, program_id, scheme });
      res.json(await load(req.user));
    } catch { res.status(500).json({ error: 'Could not save the assessment scheme.' }); }
  });
  app.post('/api/examination/process', admin, async (req,res) => {
    try { const data = await load(req.user); await audit('RESULT_PREVIEW', req.user.id, { total: data.registrations.length, counts: data.registrations.reduce((a,r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {}) }); res.json(data); }
    catch { res.status(500).json({ error: 'Result processing failed.' }); }
  });
  app.post('/api/student-marks/bulk', admin, async (req,res) => {
    try {
      const marks=req.body.marks;
      if(!Array.isArray(marks)||!marks.length||marks.length>5000)return res.status(400).json({error:'Upload between 1 and 5,000 rows at a time.'});
      const key=m=>JSON.stringify([m.prn,m.cm_course_name,m.semester,m.paper_code,m.academic_year,m.exam_year]);
      const sources=(await executeSql('SELECT c.*,s.scheme_json FROM dbo.course_master c LEFT JOIN dbo.exam_course_settings s ON c.id=s.course_id')).data;
      const existing=(await executeSql('SELECT * FROM dbo.student_marks')).data.map(m=>({...m,theory:m.theory_absent?'AB':m.theory,practical:m.practical_absent?'AB':m.practical,skills:m.skills_absent?'AB':m.skills}));
      const seen=new Set();
      for(const [index,m] of marks.entries()) {
        const fail=message=>res.status(400).json({error:`Row ${index+2}: ${message}`});
        if(['prn','student_name','cm_course_name','semester','paper_code','academic_year','exam_year'].some(k=>typeof m[k]!=='string'||!m[k].trim()))return fail('Required student/course/session identifiers are missing.');
        if(!['CA1','CA2','CA3','ESE'].includes(m.assessment_type))return fail('Unknown assessment type.');
        const rowKey=key(m)+m.assessment_type;
        if(seen.has(rowKey))return fail('Duplicate assessment in the uploaded file.');seen.add(rowKey);
        if(existing.filter(r=>key(r)===key(m)&&r.assessment_type===m.assessment_type).length>1)return fail('Existing duplicate marks require reconciliation; no records were changed.');
        const courses=sources.filter(c=>c.cm_course_name===m.cm_course_name&&c.semester===m.semester&&c.paper_code===m.paper_code);
        if(courses.length!==1||!courses[0].scheme_json)return fail('Configure the subject assessment scheme first.');
        const scheme=JSON.parse(courses[0].scheme_json);
        for(const h of HEADS) {
          const value=m[h]; const rule=scheme.heads[h];
          if(!rule.active){if(value!==null&&value!==undefined&&value!==0)return fail(`${h} is not applicable; leave it blank.`);m[h]=null;continue;}
          const max=m.assessment_type==='ESE'?rule.ese:rule.ca[Number(m.assessment_type[2])-1];
          if(value!==null&&value!=='AB'&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max||(scheme.integerMarks&&!Number.isInteger(value))))return fail(`${h} marks must be blank, AB, or within 0–${max}.`);
        }
        if(m.assessment_type==='ESE' && HEADS.some(h=>scheme.heads[h].active && m[h]!==null && m[h]!==undefined)) {
          const incoming=marks.filter(r=>key(r)===key(m));
          const combined=[...existing.filter(r=>key(r)===key(m)&&!incoming.some(n=>n.assessment_type===r.assessment_type)),...incoming];
          const outcome=calculateResult(combined,scheme);
          if(outcome.internalStatus!=='TG'||outcome.reasons.some(r=>r.startsWith('Duplicate')||r.includes('marks must')))return fail('ESE entry requires complete, valid TG internal marks.');
        }
      }
      const payload=marks.map(m=>({...m,id:crypto.randomUUID(),theory_absent:m.theory==='AB',practical_absent:m.practical==='AB',skills_absent:m.skills==='AB',theory:m.theory==='AB'?null:m.theory,practical:m.practical==='AB'?null:m.practical,skills:m.skills==='AB'?null:m.skills}));
      await executeSql(`SET XACT_ABORT ON; BEGIN TRANSACTION;
      MERGE dbo.student_marks WITH(HOLDLOCK) AS t USING (
      SELECT * FROM OPENJSON(@payload) WITH(id nvarchar(100),prn nvarchar(100),student_name nvarchar(255),cm_course_name nvarchar(255),semester nvarchar(50),paper_code nvarchar(100),sm_subject_name nvarchar(255),academic_year nvarchar(50),exam_year nvarchar(100),assessment_type nvarchar(50),theory decimal(6,2),practical decimal(6,2),skills decimal(6,2),theory_absent bit,practical_absent bit,skills_absent bit)) s
      ON t.prn=s.prn AND t.cm_course_name=s.cm_course_name AND t.semester=s.semester AND t.paper_code=s.paper_code AND t.academic_year=s.academic_year AND t.exam_year=s.exam_year AND t.assessment_type=s.assessment_type
      WHEN MATCHED THEN UPDATE SET theory=s.theory,practical=s.practical,skills=s.skills,theory_absent=s.theory_absent,practical_absent=s.practical_absent,skills_absent=s.skills_absent,updated_at=SYSUTCDATETIME(),uploaded_by=@actor
      WHEN NOT MATCHED THEN INSERT(id,prn,student_name,cm_course_name,semester,paper_code,sm_subject_name,academic_year,exam_year,assessment_type,theory,practical,skills,theory_absent,practical_absent,skills_absent,uploaded_by,uploaded_at,updated_at)
      VALUES(s.id,s.prn,s.student_name,s.cm_course_name,s.semester,s.paper_code,s.sm_subject_name,s.academic_year,s.exam_year,s.assessment_type,s.theory,s.practical,s.skills,s.theory_absent,s.practical_absent,s.skills_absent,@actor,SYSUTCDATETIME(),SYSUTCDATETIME());
      INSERT INTO dbo.exam_processing_audit(action,actor,detail) VALUES('MARKS_IMPORT',@actor,@audit);
      COMMIT;`,{payload:JSON.stringify(payload),actor:req.user.id,audit:JSON.stringify({before:existing.filter(r=>marks.some(m=>key(m)===key(r)&&m.assessment_type===r.assessment_type)),after:payload})},'execute');
      await sync();res.json({count:marks.length});
    }catch{res.status(500).json({error:'Import failed. Verify the database and assessment configuration.'});}
  });
  app.patch('/api/student-marks/:id', admin, async (req,res) => {
    try {
      const { id } = req.params;
      const { theory, practical, skills } = req.body;
      const existing = (await executeSql('SELECT * FROM dbo.student_marks WHERE id=@id', { id })).data;
      if (!existing || !existing.length) return res.status(404).json({ error: 'Student mark record not found.' });
      const current = existing[0];

      const parseField = (val, prevAbsent, prevVal) => {
        if (val === undefined) return { val: prevVal, ab: prevAbsent ? 1 : 0 };
        if (val === 'AB') return { val: null, ab: 1 };
        if (val === null || val === '') return { val: null, ab: 0 };
        const num = Number(val);
        if (!Number.isFinite(num)) return { val: null, ab: 0 };
        return { val: num, ab: 0 };
      };

      const t = parseField(theory, current.theory_absent, current.theory);
      const p = parseField(practical, current.practical_absent, current.practical);
      const s = parseField(skills, current.skills_absent, current.skills);

      const sources = (await executeSql('SELECT c.*, s.scheme_json FROM dbo.course_master c LEFT JOIN dbo.exam_course_settings s ON c.id=s.course_id WHERE c.cm_course_name=@course AND c.semester=@semester AND c.paper_code=@paper', {
        course: current.cm_course_name,
        semester: current.semester,
        paper: current.paper_code
      })).data;

      if (sources.length === 1 && sources[0].scheme_json) {
        const scheme = JSON.parse(sources[0].scheme_json);
        const candidate = {
          assessment_type: current.assessment_type,
          theory: t.ab ? 'AB' : t.val,
          practical: p.ab ? 'AB' : p.val,
          skills: s.ab ? 'AB' : s.val
        };
        for (const h of HEADS) {
          const val = candidate[h];
          const rule = scheme.heads[h];
          if (!rule.active) {
            if (val !== null && val !== undefined && val !== 0) {
              return res.status(400).json({ error: `${h} is not applicable for this course; leave it blank.` });
            }
            if (h === 'theory') { t.val = null; t.ab = 0; }
            if (h === 'practical') { p.val = null; p.ab = 0; }
            if (h === 'skills') { s.val = null; s.ab = 0; }
            continue;
          }
          const max = current.assessment_type === 'ESE' ? rule.ese : rule.ca[Number(current.assessment_type[2]) - 1];
          if (val !== null && val !== 'AB' && (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > max || (scheme.integerMarks && !Number.isInteger(val)))) {
            return res.status(400).json({ error: `${h} marks must be blank, AB, or within 0–${max}.` });
          }
        }
      }

      await executeSql(`
        UPDATE dbo.student_marks
        SET theory = @theory,
            practical = @practical,
            skills = @skills,
            theory_absent = @theory_absent,
            practical_absent = @practical_absent,
            skills_absent = @skills_absent,
            updated_at = SYSUTCDATETIME(),
            uploaded_by = @actor
        WHERE id = @id;
        INSERT INTO dbo.exam_processing_audit(action, actor, detail)
        VALUES('MARK_UPDATE', @actor, @audit);
      `, {
        id,
        theory: t.val,
        practical: p.val,
        skills: s.val,
        theory_absent: t.ab,
        practical_absent: p.ab,
        skills_absent: s.ab,
        actor: req.user.id,
        audit: JSON.stringify({ id, before: current, after: { theory: t.val, practical: p.val, skills: s.val, theory_absent: t.ab, practical_absent: p.ab, skills_absent: s.ab } })
      }, 'execute');

      await sync();
      const updated = (await executeSql('SELECT * FROM dbo.student_marks WHERE id=@id', { id })).data[0];
      res.json({
        success: true,
        mark: {
          ...updated,
          theory: updated.theory_absent ? 'AB' : updated.theory,
          practical: updated.practical_absent ? 'AB' : updated.practical,
          skills: updated.skills_absent ? 'AB' : updated.skills
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to update student mark.' });
    }
  });
  app.post('/api/student-marks/bulk-delete', admin, async (req,res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'IDs array required.' });
      const params = { actor: req.user.id, audit: JSON.stringify({ count: ids.length, ids }) };
      const placeholders = ids.map((id, i) => { params[`id${i}`] = id; return `@id${i}`; }).join(',');
      await executeSql(`
        DELETE FROM dbo.student_marks WHERE id IN (${placeholders});
        INSERT INTO dbo.exam_processing_audit(action, actor, detail) VALUES('MARKS_BULK_DELETE', @actor, @audit);
      `, params, 'execute');
      await sync();
      res.json({ success: true, count: ids.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to delete marks.' });
    }
  });
  return { sync, load };
}
