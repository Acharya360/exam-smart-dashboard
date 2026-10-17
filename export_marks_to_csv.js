import fs from 'fs';
import xlsx from 'xlsx';

console.log('Reading docs/Sample Templete.xlsx...');
const wb = xlsx.readFile('docs/Sample Templete.xlsx');
const sheet = wb.Sheets['Marks '];
const rows = xlsx.utils.sheet_to_json(sheet);

console.log(`Loaded ${rows.length} rows from Excel.`);

// Convert to CSV with headers matching student_marks table
// Columns: id, prn, student_name, cm_course_name, semester, paper_code, sm_subject_name, academic_year, exam_year, assessment_type, theory, practical, skills, uploaded_by, uploaded_at, updated_at

const out = fs.createWriteStream('marks_export.csv', { encoding: 'utf8' });
out.write('id\tprn\tstudent_name\tcm_course_name\tsemester\tpaper_code\tsm_subject_name\tacademic_year\texam_year\tassessment_type\ttheory\tpractical\tskills\tuploaded_by\n');

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const id = `sm-${r.ID || (i + 1)}`;
  const prn = String(r.PRN || '').trim();
  const name = String(r['Name of the Student'] || '').replace(/[\t\r\n]/g, ' ').trim();
  const course = String(r.CM_Course_Name || '').replace(/[\t\r\n]/g, ' ').trim();
  const sem = String(r.Semester || '').trim();
  const paper = String(r.PaperCode || '').trim();
  const subject = String(r.SM_Subject_Name || '').replace(/[\t\r\n]/g, ' ').trim();
  const acadYear = String(r.Academic_Year || '').trim();
  const examYear = String(r['Exam Year'] || '').trim();
  const assess = String(r.Assessment_Type || '').trim();
  const theory = parseFloat(r.Theory) || 0;
  const practical = parseFloat(r.Practial || r.Practical) || 0;
  const skills = parseFloat(r.Skills) || 0;
  const uploader = 'user-coe-1';

  out.write(`${id}\t${prn}\t${name}\t${course}\t${sem}\t${paper}\t${subject}\t${acadYear}\t${examYear}\t${assess}\t${theory}\t${practical}\t${skills}\t${uploader}\n`);
}

out.end(() => {
  console.log('Exported marks_export.csv successfully.');
});
