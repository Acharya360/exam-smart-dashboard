import { validateParsedEntities } from '../src/utils/validation/parsedValidator';
import type { MasterRecord } from '../src/utils/validation/types';

interface CourseDraft {
  cm_course_name: string;
  semester: string;
  paper_code: string;
  sm_subject_name: string;
  grading_category?: string;
}

const programmes: MasterRecord[] = [
  { id: '1', code: 'BTECH-CSE', name: 'B.Tech Computer Science' },
  { id: '2', code: 'BTECH-AI', name: 'B.Tech Artificial Intelligence' },
];

const items: CourseDraft[] = [
  { cm_course_name: 'B.Tech Computer Science', semester: '3', paper_code: 'CS301', sm_subject_name: 'Data Structures' },
  { cm_course_name: 'B.Tech Computer Sciece', semester: '3', paper_code: 'CS302', sm_subject_name: 'Algorithms' }, // typo -> suggestion
  { cm_course_name: 'B.Com', semester: '1', paper_code: 'BC101', sm_subject_name: 'Accounting' }, // unknown programme
  { cm_course_name: 'B.Tech Computer Science', semester: '3', paper_code: 'CS301', sm_subject_name: 'Data Structures (dup)' }, // duplicate key
];

const result = validateParsedEntities<CourseDraft>({
  moduleName: 'Course Master',
  fileName: 'test.xlsx',
  items,
  labels: { cm_course_name: 'Programme', semester: 'Semester', paper_code: 'Subject Code' },
  duplicateKeyFields: ['cm_course_name', 'semester', 'paper_code'],
  parserErrors: ['Row 99: example parser notice'],
  masterChecks: [{ field: 'cm_course_name', fieldLabel: 'Programme', masterType: 'programme', severity: 'warning', allowSuggest: true, master: programmes }],
  fieldsOf: (c) => ({ cm_course_name: c.cm_course_name, semester: c.semester, paper_code: c.paper_code }),
});

let pass = 0, fail = 0;
const check = (name: string, cond: boolean) => { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); };

console.log('Summary:', JSON.stringify(result.summary));
check('totalRows=4', result.summary.totalRows === 4);
check('duplicateRows=1', result.summary.duplicateRows === 1);
check('importable=3 (dup excluded)', result.summary.importableRows === 3);
check('data length=3', result.data.length === 3);
check('typo row is warning w/ suggestion', result.rows[1].status === 'warning' && !!result.rows[1].suggestedMatch);
check('unknown B.Com flagged as warning (not invalid)', result.rows[2].status === 'warning');
check('duplicate row status=duplicate', result.rows[3].status === 'duplicate');
check('parser errors preserved', result.errors.some(e => e.includes('Row 99')));
check('suggestion points to Computer Science', result.rows[1].suggestedMatch === 'B.Tech Computer Science');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
