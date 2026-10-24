import { CourseMaster, Program } from '../types';
import { canonicalName, editDistance } from './validation/normalizer';
import { exportCourseProgramMismatchReport, type CourseProgramMismatchItem } from '../services/excelParser';

type CourseDraft = Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>;

export interface MismatchedCourseInfo {
  course: CourseDraft;
  index: number;
  reason: string;
  suggestedProgram?: Program;
}

export interface DistinctUnmatchedProgram {
  programName: string;
  programCode?: string | null;
  count: number;
  courseCodes: string[];
  suggestedProgram?: Program;
}

export interface CourseProgramValidationResult {
  allCourses: CourseDraft[];
  matchedCourses: CourseDraft[];
  mismatchedCourses: MismatchedCourseInfo[];
  distinctUnmatchedPrograms: DistinctUnmatchedProgram[];
  hasMismatches: boolean;
}

function norm(s: unknown): string {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectDegreeLevel(s: unknown): string {
  const str = String(s || '').toLowerCase();
  if (str.includes('m.tech') || str.includes('mtech')) return 'mtech';
  if (str.includes('b.tech') || str.includes('btech')) return 'btech';
  if (str.includes('m.sc') || str.includes('msc')) return 'msc';
  if (str.includes('b.sc') || str.includes('bsc')) return 'bsc';
  if (str.includes('mba')) return 'mba';
  if (str.includes('bba')) return 'bba';
  if (str.includes('m.plan') || str.includes('mplan')) return 'mplan';
  if (str.includes('b.arch') || str.includes('barch')) return 'barch';
  if (str.includes('b.des') || str.includes('bdes')) return 'bdes';
  if (str.includes('diploma') || str.includes('dip')) return 'dip';
  return '';
}

export function findMatchingProgram(course: CourseDraft, programs: Program[]): { program?: Program; method?: string } {
  const cName = course.cm_course_name || '';
  const cCode = course.program_code || '';
  const cDegree = detectDegreeLevel(cName) || detectDegreeLevel(cCode);

  // 1. Exact Name match (trimmed, case-insensitive)
  let matched = programs.find(p => p.program_name.trim().toLowerCase() === cName.trim().toLowerCase());
  if (matched) return { program: matched, method: 'exact_name' };

  // 2. Normalized Name match (alphanumeric only)
  matched = programs.find(p => norm(p.program_name) === norm(cName));
  if (matched) return { program: matched, method: 'norm_name' };

  // 3. Program Code match (provided degrees do not conflict)
  if (cCode) {
    matched = programs.find(p => {
      if (norm(p.program_code) !== norm(cCode)) return false;
      const pDegree = detectDegreeLevel(p.program_name) || detectDegreeLevel(p.program_code);
      return !cDegree || !pDegree || cDegree === pDegree;
    });
    if (matched) return { program: matched, method: 'code_match' };
  }

  return {};
}

export function findNearestProgramSuggestion(programName: string, programs: Program[]): Program | undefined {
  if (!programName || !programs.length) return undefined;
  const nameNorm = canonicalName(programName);
  const targetDegree = detectDegreeLevel(programName);

  let best: Program | undefined;
  let bestDist = Infinity;

  for (const p of programs) {
    const pDegree = detectDegreeLevel(p.program_name);
    // Prefer suggestions of same degree level if known
    if (targetDegree && pDegree && targetDegree !== pDegree) continue;

    const pNameNorm = canonicalName(p.program_name);
    const dist = editDistance(nameNorm, pNameNorm);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  // Suggest if distance is reasonable
  if (best && bestDist <= Math.max(15, Math.floor(nameNorm.length * 0.6))) {
    return best;
  }
  return undefined;
}

export function validateCoursesAgainstPrograms(
  courses: CourseDraft[],
  programs: Program[]
): CourseProgramValidationResult {
  const matchedCourses: CourseDraft[] = [];
  const mismatchedCourses: MismatchedCourseInfo[] = [];
  const distinctMap = new Map<string, DistinctUnmatchedProgram>();

  courses.forEach((c, index) => {
    const match = findMatchingProgram(c, programs);
    if (match.program) {
      matchedCourses.push(c);
    } else {
      const pName = c.cm_course_name || 'Unspecified Program';
      const suggestion = findNearestProgramSuggestion(pName, programs);
      const reason = `Program "${pName}" not found in registered Programs Directory (http://localhost:3000/programs)`;

      mismatchedCourses.push({
        course: c,
        index,
        reason,
        suggestedProgram: suggestion,
      });

      const key = `${pName}||${c.program_code || ''}`;
      if (!distinctMap.has(key)) {
        distinctMap.set(key, {
          programName: pName,
          programCode: c.program_code,
          count: 0,
          courseCodes: [],
          suggestedProgram: suggestion,
        });
      }
      const item = distinctMap.get(key)!;
      item.count++;
      if (item.courseCodes.length < 5) {
        item.courseCodes.push(c.paper_code);
      }
    }
  });

  return {
    allCourses: courses,
    matchedCourses,
    mismatchedCourses,
    distinctUnmatchedPrograms: Array.from(distinctMap.values()),
    hasMismatches: mismatchedCourses.length > 0,
  };
}

export function downloadCourseMismatchReport(
  validationResult: CourseProgramValidationResult,
  programs: Program[]
) {
  const mismatchItems: CourseProgramMismatchItem[] = validationResult.mismatchedCourses.map((m) => ({
    rowNum: m.index + 2,
    srNo: m.course.sr_no,
    paperCode: m.course.paper_code,
    courseName: m.course.sm_subject_name,
    semester: String(m.course.semester || ''),
    programNameInExcel: m.course.cm_course_name,
    programCodeInExcel: m.course.program_code,
    reason: m.reason,
    suggestedProgramName: m.suggestedProgram?.program_name,
    suggestedProgramCode: m.suggestedProgram?.program_code,
  }));

  exportCourseProgramMismatchReport(mismatchItems, validationResult.allCourses.length, programs);
}
