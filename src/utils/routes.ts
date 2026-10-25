/**
 * Acharya360 ExamTrack URL Routing & Navigation Sync
 * 
 * Maps internal application view identifiers to clean, bookmarkable, and shareable URLs.
 * Enables HTML5 History API integration, browser Back/Forward navigation, and direct deep-linking.
 */

export const VIEW_TO_PATH: Record<string, string> = {
  dashboard: '/',
  upload: '/upload',
  timetable: '/timetable',
  timetableGenerator: '/timetable-generator',
  tasks: '/tasks',
  programs: '/programs',
  courseMaster: '/course-master',
  students: '/students',
  assessment: '/assessment',
  studentMarks: '/student-marks',
  marksMatrix: '/marks-matrix',
  results: '/results',
  tng: '/tng',
  sgpa: '/sgpa',
  trsheet: '/tr-sheet',
  users: '/users',
  schema: '/schema',
  facultyAllocation: '/faculty-allocation',
  classroomMaster: '/classroom-master',
  seatingMaster: '/seating-master',
  performanceReports: '/performance-reports',
};

const PATH_ALIASES: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/overview': 'dashboard',
  '/upload': 'upload',
  '/excel-upload': 'upload',
  '/ingestion': 'upload',
  '/import': 'upload',
  '/timetable': 'timetable',
  '/schedules': 'timetable',
  '/timetable-generator': 'timetableGenerator',
  '/timetablegenerator': 'timetableGenerator',
  '/generator': 'timetableGenerator',
  '/tasks': 'tasks',
  '/workflow': 'tasks',
  '/programs': 'programs',
  '/program': 'programs',
  '/course-master': 'courseMaster',
  '/coursemaster': 'courseMaster',
  '/courses': 'courseMaster',
  '/faculty-allocation': 'facultyAllocation',
  '/faculty': 'facultyAllocation',
  '/faculties': 'facultyAllocation',
  '/teaching-staff': 'facultyAllocation',
  '/classroom-master': 'classroomMaster',
  '/classroommaster': 'classroomMaster',
  '/classrooms': 'classroomMaster',
  '/venues': 'classroomMaster',
  '/halls': 'classroomMaster',
  '/seating-master': 'seatingMaster',
  '/seatingmaster': 'seatingMaster',
  '/seating': 'seatingMaster',
  '/seating-plans': 'seatingMaster',
  '/seatingplans': 'seatingMaster',
  '/hall-plans': 'seatingMaster',
  '/performance-reports': 'performanceReports',
  '/performance': 'performanceReports',
  '/reports': 'performanceReports',
  '/analytics': 'performanceReports',
  '/students': 'students',
  '/registrations': 'students',
  '/assessment': 'assessment',
  '/grading': 'assessment',
  '/student-marks': 'studentMarks',
  '/studentmarks': 'studentMarks',
  '/marks': 'studentMarks',
  '/marks-matrix': 'marksMatrix',
  '/marksmatrix': 'marksMatrix',
  '/matrix': 'marksMatrix',
  '/results': 'results',
  '/eligibility': 'results',
  '/tng': 'tng',
  '/sgpa': 'sgpa',
  '/tr-sheet': 'trsheet',
  '/trsheet': 'trsheet',
  '/tabulation': 'trsheet',
  '/users': 'users',
  '/schema': 'schema',
  '/database': 'schema',
};

/**
 * Parses the current browser URL (pathname, hash, or query param)
 * and returns the corresponding internal view ID.
 */
export function getViewFromLocation(): string {
  if (typeof window === 'undefined') return 'dashboard';

  // 1. Check hash routing if user entered via hash (e.g. #/timetable or #programs)
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  if (hash) {
    const normalizedHash = ('/' + hash).toLowerCase();
    if (PATH_ALIASES[normalizedHash]) return PATH_ALIASES[normalizedHash];
    if (VIEW_TO_PATH[hash]) return hash;
  }

  // 2. Check query string: ?view=programs
  const params = new URLSearchParams(window.location.search);
  const qView = params.get('view');
  if (qView && VIEW_TO_PATH[qView]) {
    return qView;
  }

  // 3. Check clean pathname: /timetable, /programs, etc.
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (PATH_ALIASES[pathname]) {
    return PATH_ALIASES[pathname];
  }

  return 'dashboard';
}

/**
 * Parses query parameters from window.location.search into an object.
 */
export function getUrlSearchParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((v, k) => {
    if (v) result[k] = v;
  });
  return result;
}

/**
 * Synchronizes the browser address bar with the current view and optional query parameters.
 * Uses window.history.pushState or replaceState.
 */
export function syncUrlWithView(view: string, replace = false, queryParams?: Record<string, string>): void {
  if (typeof window === 'undefined') return;

  const targetPath = VIEW_TO_PATH[view] || '/';
  let targetUrl = targetPath;
  if (queryParams && Object.keys(queryParams).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    if (qs) targetUrl += `?${qs}`;
  }

  const currentUrl = (window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/') + window.location.search;

  if (currentUrl !== targetUrl) {
    if (replace) {
      window.history.replaceState({ view, queryParams }, '', targetUrl);
    } else {
      window.history.pushState({ view, queryParams }, '', targetUrl);
    }
  }
}
