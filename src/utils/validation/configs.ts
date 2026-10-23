// ============================================================================
// Module-specific import configs. Rules live here, NOT in the engine, so the
// pipeline stays generic. Programmes/subjects/students are injected at runtime
// from the existing master tables — nothing is hardcoded.
// ============================================================================
import type { StudentMark } from '../../types';
import type { ImportModuleConfig, MasterRecord } from './types';
import { canonicalSemester, canonicalCode } from './normalizer';

export interface MarksMasterData {
  programmes: MasterRecord[];
  subjects: MasterRecord[];
  students: MasterRecord[];
}

/** Student Marks import config. */
export function buildStudentMarksConfig(master: MarksMasterData): ImportModuleConfig<StudentMark> {
  return {
    moduleName: 'Student Marks',
    columnAliases: {
      prn: ['PRN', 'Enrollment', 'EnrollmentNo', 'Enrollment_No'],
      student_name: ['Name of the Student', 'StudentName', 'Name'],
      cm_course_name: ['CM_Course_Name', 'CourseName', 'Programme', 'Program'],
      semester: ['Semester', 'Sem', 'SemNo'],
      paper_code: ['PaperCode', 'SubjectCode', 'Paper'],
      sm_subject_name: ['SM_Subject_Name', 'SubjectName', 'Subject'],
      academic_year: ['Academic_Year', 'AcademicYear', 'Session'],
      exam_year: ['Exam Year', 'ExamYear'],
      assessment_type: ['Assessment_Type', 'AssessmentType', 'Assessment'],
      theory: ['Theory', 'CAT', 'InternalTheory'],
      practical: ['Practical', 'Practial', 'CAP'],
      skills: ['Skills', 'CAS'],
    },
    labels: {
      prn: 'Student PRN', student_name: 'Student Name', cm_course_name: 'Programme',
      semester: 'Semester', paper_code: 'Subject Code', sm_subject_name: 'Subject Name',
      academic_year: 'Academic Year', exam_year: 'Exam Year', assessment_type: 'Assessment Type',
      theory: 'Theory Marks', practical: 'Practical Marks', skills: 'Skills Marks',
    },
    fields: {
      prn: { required: true, label: 'Student PRN' },
      cm_course_name: { required: true, label: 'Programme' },
      semester: { required: true, label: 'Semester', normalizer: canonicalSemester },
      paper_code: { required: true, label: 'Subject Code', normalizer: canonicalCode },
      academic_year: { required: true, label: 'Academic Year' },
      exam_year: { required: true, label: 'Exam Year' },
      assessment_type: { required: true, label: 'Assessment Type', enumValues: ['CA1', 'CA2', 'CA3', 'ESE'] },
      theory: { label: 'Theory Marks', min: 0, allowAbsent: true, allowNotApplicable: true },
      practical: { label: 'Practical Marks', min: 0, allowAbsent: true, allowNotApplicable: true },
      skills: { label: 'Skills Marks', min: 0, allowAbsent: true, allowNotApplicable: true },
    },
    duplicateKeyFields: ['prn', 'cm_course_name', 'semester', 'paper_code', 'academic_year', 'exam_year', 'assessment_type'],
    dbKeyFields: ['prn', 'cm_course_name', 'semester', 'paper_code', 'academic_year', 'exam_year', 'assessment_type'],
    masterChecks: [
      { field: 'cm_course_name', fieldLabel: 'Programme', masterType: 'programme', master: master.programmes, severity: 'error', allowSuggest: true },
      { field: 'paper_code', fieldLabel: 'Subject Code', masterType: 'subject', master: master.subjects, severity: 'error', constraintFields: [{ field: 'cm_course_name', masterKey: 'cm_course_name' }, { field: 'semester', masterKey: 'semester' }], allowSuggest: true },
      { field: 'prn', fieldLabel: 'Student PRN', masterType: 'student', master: master.students, severity: 'warning', allowSuggest: false },
    ],
    transformRow: (row) => ({
      id: '',
      prn: row.prn,
      student_name: row.student_name,
      cm_course_name: row.cm_course_name,
      semester: row.semester,
      paper_code: row.paper_code,
      sm_subject_name: row.sm_subject_name,
      academic_year: row.academic_year,
      exam_year: row.exam_year,
      assessment_type: row.assessment_type,
      theory: toMark(row.theory),
      practical: toMark(row.practical),
      skills: toMark(row.skills),
    }),
  };
}

function toMark(value: string): StudentMark['theory'] {
  if (value === '' ) return null;
  if (value === 'AB') return 'AB';
  if (value === 'NA') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
