// Explicit opt-in, verified full backup, then an atomic replacement of academic data.
import express from 'express';
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { registerExamination } from '../server/examination.js';
import { runMigrations } from './migrate.mjs';
if(!process.argv.includes('--replace-local-academic-data'))throw new Error('Pass --replace-local-academic-data to replace academic records. Staff accounts are preserved.');
const worker=spawn('powershell.exe',['-NoProfile','-File','sql_worker.ps1','-Server','acharya360\\SQLEXPRESS','-Database','SSPU_Exam'],{windowsHide:true});
const callbacks=new Map();let sequence=0;
const ready=new Promise((resolve,reject)=>{worker.on('error',reject);worker.stderr.on('data',d=>process.stderr.write(d));readline.createInterface({input:worker.stdout}).on('line',line=>{const m=JSON.parse(line);if(m.type==='ready')resolve();else{const cb=callbacks.get(m.id);callbacks.delete(m.id);m.success?cb?.resolve(m):cb?.reject(new Error(m.error));}});});
function execute(sql,params={},type='query'){return new Promise((resolve,reject)=>{const id=++sequence;callbacks.set(id,{resolve,reject});worker.stdin.write(JSON.stringify({id,sql,params,type})+'\n');});}
const lit=v=>v===null?'NULL':typeof v==='number'?String(v):typeof v==='boolean'?(v?'1':'0'):"N'"+String(v).replaceAll("'","''")+"'";
const insert=(table,row)=>`INSERT INTO dbo.${table}(${Object.keys(row).join(',')}) VALUES(${Object.values(row).map(lit).join(',')});`;
try{
 await ready;
 const backupDir=(await execute("SELECT CONVERT(nvarchar(2000),SERVERPROPERTY('InstanceDefaultBackupPath')) path")).data[0].path;
 const backupPath=`${backupDir}\\SSPU_Exam_before_demo_${new Date().toISOString().replace(/[:.]/g,'-')}.bak`;
 await execute('BACKUP DATABASE SSPU_Exam TO DISK=@path WITH COPY_ONLY, CHECKSUM',{path:backupPath},'execute');
 await execute('RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM',{path:backupPath},'execute');
 console.log('Verified recovery backup: '+backupPath);
 await runMigrations({ execute, verifiedBackupPath: backupPath });
 const users=(await execute('SELECT id,role FROM dbo.profiles ORDER BY id')).data;
 const coordinators=users.filter(u=>u.role==='COORDINATOR');const actor=users.find(u=>u.role==='COE');
 if(!actor||coordinators.length<2)throw new Error('Existing COE and two coordinator accounts are required.');
 let sql='SET XACT_ABORT ON; BEGIN TRANSACTION; DELETE FROM dbo.exam_tasks; DELETE FROM dbo.exam_schedules; DELETE FROM dbo.student_marks; DELETE FROM dbo.exam_registrations; DELETE FROM dbo.exam_students; DELETE FROM dbo.exam_course_settings; DELETE FROM dbo.course_master; DELETE FROM dbo.programs;';
 const names=['Construction Engineering & Management','Mechatronics Engineering','Computer Science & AI','Electrical & Electronics','Architecture'];
 const titles=['Question Paper Printing & Secure Vault Packaging','Hall Seating Plan, Attendance Sheets & Roll Labels','Invigilation Duty Assignment & Verification','Answer Booklet Collection & Counterfoil Verification'];
 const cases=['PASS','FAIL_ESE','TNG','ABSENT','PENDING','BOUNDARY_PASS','OVERALL_FAIL','ZERO_CA','PASS_HIGH','PASS_MIXED'];
 for(let p=0;p<5;p++){
  const program={id:`demo-program-${p+1}`,sr_no:p+1,program_code:`TEST-${p===4?'ARCH':p+1}`,program_name:`[TEST] ${p===4?'B.Arch.':'B.Tech.'} ${names[p]}`,school_name:`[TEST] School of ${names[p]}`,primary_coordinator_id:coordinators[p%coordinators.length].id,alternate_coordinator_id:coordinators[(p+1)%coordinators.length].id};
  sql+=insert('programs',program);
  for(let c=0;c<3;c++){
   const active=c===0?['theory','practical','skills']:c===1?['practical','skills']:['theory'];
   const courseId=`demo-course-${p+1}-${c+1}`,paper=`T${p+1}0${c+1}`,credits=[4,3,2][c];
   const scheme={category:p===4?'Architecture':'Non-Architecture',internalPass:40,overallPass:p===4?45:40,integerMarks:false,approved:true,approvalReference:'SYNTHETIC TEST SCHEME ONLY — not an academic approval',credits,heads:Object.fromEntries(['theory','practical','skills'].map(h=>[h,{active:active.includes(h),ca:[10,10,10],ese:30,pass:p===4?45:40}]))};
   sql+=insert('course_master',{id:courseId,sr_no:p*3+c+1,cm_course_name:program.program_name,semester:'I',paper_code:paper,sm_subject_name:['Integrated Foundation','Applied Studio & Skills','Core Theory'][c],l:[2,0,2][c],t:[1,0,0][c],p:[1,2,0][c],s:[1,1,0][c],total_credits:credits,cat_max_marks:active.includes('theory')?30:0,cat_min_marks:active.includes('theory')?12:0,cap_max_marks:active.includes('practical')?30:0,cap_min_marks:active.includes('practical')?12:0,ia_max_marks:active.includes('skills')?30:0,ia_min_marks:active.includes('skills')?12:0,est_max_marks:active.includes('theory')?30:0,est_min_marks:active.includes('theory')?(p===4?13.5:12):0,esp_max_marks:active.includes('practical')?30:0,esp_min_marks:active.includes('practical')?(p===4?13.5:12):0,total_marks:active.length*60,total_marks_min:active.length*60*scheme.overallPass/100});
   sql+=insert('exam_course_settings',{course_id:courseId,program_id:program.id,scheme_json:JSON.stringify(scheme)});
   const schedule={id:`demo-schedule-${p+1}-${c+1}`,pkg_no:p*3+c+1,logic1:'TEST',cm_school_name:program.school_name,cm_course_name:program.program_name,program_code:program.program_code,semester:1,elective:'',paper_code:paper,sm_subject_name:['Integrated Foundation','Applied Studio & Skills','Core Theory'][c],student_count:10,regular_count:10,backlog_count:0,exam_day:c+1,exam_date:`${20+c}/10/2026`,date_odd_even:'Odd',am_pm:'AM',exam_time:'10:30 am to 12:30 pm',exam_type:'Regular',exam_year:'2026'};
   sql+=insert('exam_schedules',schedule);
   titles.forEach((title,i)=>{sql+=insert('exam_tasks',{id:`demo-task-${p}-${c}-${i}`,schedule_id:schedule.id,program_code:program.program_code,task_title:title,status:i===0?'COMPLETED':i===1?'IN_PROGRESS':'PENDING',assigned_to:program.primary_coordinator_id,alternate_user_id:program.alternate_coordinator_id,notes:'Synthetic test workflow',due_date:schedule.exam_date});});
   for(let s=0;s<10;s++){
    const scenario=cases[s];
    for(const assessment of ['CA1','CA2','CA3','ESE']){
     const external=assessment==='ESE';const max=external?30:10;
     const m={id:`demo-mark-${p}-${c}-${s}-${assessment}`,prn:`TEST${p+1}${String(s+1).padStart(3,'0')}`,student_name:`Test Student ${p+1}-${String(s+1).padStart(2,'0')} (${scenario})`,cm_course_name:program.program_name,semester:'I',paper_code:paper,sm_subject_name:schedule.sm_subject_name,academic_year:'2026-27',exam_year:'Oct 2026 TEST',assessment_type:assessment,uploaded_by:actor.id};
     for(const h of ['theory','practical','skills']){
      let v=active.includes(h)?max*0.8:null;let absent=false;
      if(v!==null){
       if(scenario==='FAIL_ESE'&&external&&h===active[0])v=max*0.2;
       if(scenario==='TNG')v=external?null:max*0.3;
       if(scenario==='ABSENT'&&external&&h===active[0]){v=null;absent=true;}
       if(scenario==='PENDING'&&assessment==='CA3')v=null;
       if(scenario==='PENDING'&&external)v=null;
       if(scenario==='BOUNDARY_PASS')v=max*scheme.overallPass/100;
       if(scenario==='OVERALL_FAIL')v=max*0.4; // Architecture: internal TG and ESE head failure; independent aggregate case tested in engine suite.
       if(scenario==='ZERO_CA')v=external?null:0;
       if(scenario==='PASS_HIGH')v=max*0.95;
       if(scenario==='PASS_MIXED')v=max*[0.9,0.7,0.5][c];
      }
      m[h]=v;m[`${h}_absent`]=absent;
     }
     sql+=insert('student_marks',m);
    }
   }
  }
 }
 sql+=`IF EXISTS(SELECT 1 FROM dbo.exam_environment WHERE id=1) UPDATE dbo.exam_environment SET data_mode='DEMO',backup_path=${lit(backupPath)} WHERE id=1; ELSE INSERT INTO dbo.exam_environment VALUES(1,'DEMO',${lit(backupPath)});`;
 sql+=insert('exam_processing_audit',{action:'DEMO_DATA_REPLACED',actor:actor.id,detail:JSON.stringify({backupPath,students:50,programs:5,courses:15,registrations:150,marks:600,staffAccounts:'preserved'})});
 sql+='COMMIT;';await execute(sql,{},'execute');
 const api=registerExamination(express(),execute,()=>{});await api.sync();
 const data=await api.load(actor);
 console.log(JSON.stringify({students:new Set(data.registrations.map(r=>r.prn)).size,registrations:data.registrations.length,courses:data.courses.length,statuses:data.registrations.reduce((a,r)=>({...a,[r.status]:(a[r.status]||0)+1}),{})}));
}finally{worker.stdin.write('EXIT\n');worker.stdin.end();}
