/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - CENTRAL DATA STORE & CACHE ENGINE
 * =========================================================================
 * Manages master examination records, cross-page persistence, fuzzy column
 * resolution, O(1) indexed cohort caching, and robust value formatters.
 */

(function(window) {
  'use strict';

  // Global State in DataStore
  let rawRows = [];
  let colMap = {};
  let originalHeaders = [];
  let courseToDeptMap = {};
  let datasetInfo = {
    fileName: 'Master_File.xlsx',
    source: 'Official University Master File (SSPU_Master_Cleaned)',
    fileSize: '35.9 MB',
    uploadedAt: 'Active Embedded Master',
    isCustom: false
  };
  let dataCache = {
    isIndexed: false,
    distinctValues: {},
    cohortRows: {},
    cohortCounts: {}
  };

  const DB_NAME = 'SSPU_GAZETTE_DB';
  const DB_VERSION = 2;
  const STORE_NAME = 'custom_dataset';
  const LOCAL_STORAGE_KEY = 'SSPU_CUSTOM_DATASET_BACKUP';

  /* ---------------- Term Normalization Helper ---------------- */
  function normalizeTerm(val) {
    if (!val) return '';
    const s = String(val).trim();
    if (/^(term\s*[-_]?\s*1|term\s*[-_]?\s*i)$/i.test(s) || /^t\s*1$/i.test(s) || /^tr\s*1$/i.test(s)) {
      return 'Term I';
    }
    if (/^(term\s*[-_]?\s*2|term\s*[-_]?\s*ii)$/i.test(s) || /^t\s*2$/i.test(s) || /^tr\s*2$/i.test(s)) {
      return 'Term II';
    }
    if (/^sem\s*(1|3|5|7|9|11)$/i.test(s)) return 'Term I';
    if (/^sem\s*(2|4|6|8|10|12)$/i.test(s)) return 'Term II';
    return s;
  }

  /* ---------------- Robust Canonical Column Mapping ---------------- */
  function buildCanonicalColMap(headers) {
    const map = {};
    if (!Array.isArray(headers)) return map;

    // 1. Direct trimmed header match
    headers.forEach((h, i) => {
      if (h !== null && h !== undefined) {
        map[String(h).trim()] = i;
      }
    });

    // 2. Canonical aliases map
    const aliasDefinitions = {
      'AcademicPeriod': ['academicperiod', 'academic period', 'academic_period', 'academic session', 'academic_session', 'period', 'session', 'batch', 'exam year', 'examyear', 'exam_year', 'academicyear', 'academic_year', 'year'],
      'Term': ['term', 'term_name', 'term name', 'academic term', 'academic_term', 'tr', 'exam term', 'exam_term', 'term_no', 'term no'],
      'DepartmentCode': ['departmentcode', 'department code', 'department_code', 'department', 'dept', 'school', 'school code', 'schoolcode', 'school / department', 'faculty', 'institute', 'school_name', 'school name'],
      'CM_Course_Name': ['cm_course_name', 'cm course name', 'course name', 'coursename', 'course_name', 'course', 'programme', 'program', 'programme name', 'program name', 'cm_coursename', 'branch', 'specialization', 'stream'],
      'CourseCode': ['coursecode', 'course code', 'course_code', 'progcode', 'prog code', 'program code', 'programmecode'],
      'Semester': ['semester', 'sem', 'semester no', 'sem no', 'semester_no', 'sem_no'],
      'StudentRollNo': ['studentrollno', 'student roll no', 'student_roll_no', 'student_rollno', 'rollno', 'roll no', 'roll_no', 'prn', 'student prn', 'prn no', 'prn_no', 'seat no', 'seatno', 'seat_no', 'enrollment', 'enrollment no', 'roll'],
      'StudentName': ['studentname', 'student full name', 'student_full_name', 'student_name', 'candidate name', 'candidatename', 'name of student', 'student', 'full name', 'fullname', 'name'],
      'AttemptNo': ['attemptno', 'attempt no', 'attempt_no', 'attempt', 'att', 'att no', 'attno', 'appearance'],
      'Result': ['result', 'status', 'final result', 'final_result', 'fa_rslt', 'pass/fail', 'exam result', 'result status'],
      'SubjectCode': ['subjectcode', 'subject code', 'subject_code', 'subcode', 'sub code', 'course code', 'paper code'],
      'SM_Subject_Name': ['sm_subject_name', 'sm subject name', 'subject name', 'subjectname', 'subject_name', 'subject', 'course title', 'paper name', 'title'],
      'Mark': ['mark', 'marks', 'total mark', 'total marks', 'totalmarks', 'total_marks', 'tot', 'final mark', 'obtained marks', 'grand total'],
      'MaxMk': ['maxmk', 'max marks', 'maxmarks', 'max_mk', 'maximum marks', 'max mk', 'total max', 'out of'],
      'PassMk': ['passmk', 'pass marks', 'passmarks', 'pass_mk', 'passing marks', 'pass mk', 'min marks', 'min mark'],
      'SGPA': ['sgpa', 'sgpa marks', 'sem gpa', 'sgpa_marks', 'gpa', 'sgpa_score'],
      'CGPA': ['cgpa', 'cgpa marks', 'cumulative gpa', 'cgpa_marks', 'cgpa_score'],
      'CA_Theory': ['ca_theory', 'ca theory', 'ca_th', 'ca (theory)', 'continuous assessment theory', 'ca-th'],
      'CA_Practical': ['ca_practical', 'ca practical', 'ca_pr', 'ca (practical)', 'continuous assessment practical', 'ca-pr'],
      'IA_Marks': ['ia_marks', 'ia marks', 'ia', 'industry assessment', 'indurstry assessment', 'internal assessment', 'internal marks', 'industry marks', 'ia_mark'],
      'ESE_Theory': ['ese_theory', 'ese theory', 'ese_th', 'ese (theory)', 'end semester theory', 'ese-th', 'th marks'],
      'ESE_Practical': ['ese_practical', 'ese practical', 'ese_pr', 'ese (practical)', 'end semester practical', 'ese-pr', 'pr marks'],
      'Theory_Grade': ['theory_grade', 'theory grade', 'th_grd', 'th grd', 'theory_grd', 'th grade'],
      'Practical_Grade': ['practical_grade', 'practical grade', 'pr_grd', 'pr grd', 'practical_grd', 'pr grade'],
      'Grd': ['grd', 'grade', 'final grade', 'letter grade', 'final_grd'],
      'Credit_Alloted_Theory': ['credit_alloted_theory', 'credit alloted theory', 'theory credit', 'cr_th', 'cr th', 'theory_credit'],
      'Credit_Alloted_Practical': ['credit_alloted_practical', 'credit alloted practical', 'practical credit', 'cr_pr', 'cr pr', 'practical_credit'],
      'ExamYear': ['examyear', 'exam year', 'exam_year', 'exam session', 'exam date', 'examdate', 'session_date']
    };

    Object.keys(aliasDefinitions).forEach(canonKey => {
      if (map[canonKey] !== undefined) return;
      const aliases = aliasDefinitions[canonKey];
      for (let i = 0; i < headers.length; i++) {
        const cleanHeader = String(headers[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!cleanHeader) continue;
        for (let alias of aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanHeader === cleanAlias) {
            map[canonKey] = i;
            return;
          }
        }
      }
    });

    return map;
  }

  /* ---------------- Auto-Detect Missing Columns From Data ---------------- */
  function autoDetectMissingColumns(rows, map) {
    if (!rows || rows.length === 0) return;
    const sample = rows.slice(0, Math.min(20, rows.length));

    // Detect AcademicPeriod if missing: search for 4-digit year patterns like "2021-2022" or "2022"
    if (map['AcademicPeriod'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesYear = sample.every(r => {
          const val = String(r[c] || '').trim();
          return val === '' || /^\d{4}([-/]\d{2,4})?$/.test(val);
        });
        if (matchesYear && sample.some(r => /^\d{4}/.test(String(r[c] || '').trim()))) {
          map['AcademicPeriod'] = c;
          console.log('Auto-detected AcademicPeriod at column index', c);
          break;
        }
      }
    }

    // Detect StudentRollNo if missing: search for 7-15 digit numeric IDs
    if (map['StudentRollNo'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesRoll = sample.some(r => /^\d{7,15}$/.test(String(r[c] || '').trim()));
        if (matchesRoll) {
          map['StudentRollNo'] = c;
          console.log('Auto-detected StudentRollNo at column index', c);
          break;
        }
      }
    }

    // Detect Semester if missing: search for 1-10 numbers
    if (map['Semester'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesSem = sample.every(r => {
          const num = Number(r[c]);
          return !isNaN(num) && num >= 1 && num <= 12;
        });
        if (matchesSem) {
          map['Semester'] = c;
          console.log('Auto-detected Semester at column index', c);
          break;
        }
      }
    }

    // Detect Term if missing: search for "term i", "term ii", "term 1", "term 2"
    if (map['Term'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesTerm = sample.some(r => {
          const val = String(r[c] || '').trim().toLowerCase();
          return /^term\s*([12]|i{1,2})$/i.test(val);
        });
        if (matchesTerm) {
          map['Term'] = c;
          console.log('Auto-detected Term at column index', c);
          break;
        }
      }
    }

    // Detect CM_Course_Name if missing: search for programme words
    if (map['CM_Course_Name'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesProg = sample.some(r => {
          const str = String(r[c] || '').toLowerCase();
          return str.includes('b.tech') || str.includes('bba') || str.includes('b.sc') || str.includes('diploma') || str.includes('master') || str.includes('bachelor');
        });
        if (matchesProg) {
          map['CM_Course_Name'] = c;
          console.log('Auto-detected CM_Course_Name at column index', c);
          break;
        }
      }
    }

    // Detect DepartmentCode if missing: search for "school of"
    if (map['DepartmentCode'] === undefined) {
      for (let c = 0; c < sample[0].length; c++) {
        const matchesDept = sample.some(r => String(r[c] || '').toLowerCase().includes('school of'));
        if (matchesDept) {
          map['DepartmentCode'] = c;
          console.log('Auto-detected DepartmentCode at column index', c);
          break;
        }
      }
    }
  }

  /* ---------------- IndexedDB Persistence with Bulletproof Safety Timeout ---------------- */
  function openDatabase() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };

      // 800ms safety timeout: IndexedDB can never freeze page load
      const timer = setTimeout(() => {
        finish(null);
      }, 800);

      if (!window.indexedDB) {
        clearTimeout(timer);
        return finish(null);
      }

      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          try {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          } catch (ex) {
            console.warn('onupgradeneeded error:', ex);
          }
        };
        req.onsuccess = () => {
          clearTimeout(timer);
          const db = req.result;
          db.onversionchange = () => {
            try { db.close(); } catch (e) {}
          };
          finish(db);
        };
        req.onerror = () => {
          clearTimeout(timer);
          finish(null);
        };
        req.onblocked = () => {
          clearTimeout(timer);
          console.warn('IndexedDB blocked by another active tab; using fallback.');
          finish(null);
        };
      } catch (e) {
        clearTimeout(timer);
        finish(null);
      }
    });
  }

  async function loadCustomDataFromDB() {
    try {
      const db = await openDatabase();
      if (!db || !db.objectStoreNames.contains(STORE_NAME)) {
        return loadFromLocalStorageFallback();
      }
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          resolve(loadFromLocalStorageFallback());
        }, 1200);

        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get('active_dataset');
          req.onsuccess = () => {
            clearTimeout(timer);
            if (req.result && req.result.rows && req.result.rows.length > 0 && req.result.headers) {
              resolve(req.result);
            } else {
              resolve(loadFromLocalStorageFallback());
            }
          };
          req.onerror = () => {
            clearTimeout(timer);
            resolve(loadFromLocalStorageFallback());
          };
        } catch (e) {
          clearTimeout(timer);
          resolve(loadFromLocalStorageFallback());
        }
      });
    } catch (err) {
      return loadFromLocalStorageFallback();
    }
  }

  function loadFromLocalStorageFallback() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  async function saveCustomDataToDB(dataset) {
    try {
      // Also save to localStorage if dataset is reasonably sized (< 4MB)
      try {
        if (dataset && dataset.rows && dataset.rows.length <= 15000) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataset));
        } else {
          // Remove stale backup so the fallback loader cannot resurrect old data
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (e) {}

      const db = await openDatabase();
      if (!db || !db.objectStoreNames.contains(STORE_NAME)) return true;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(dataset, 'active_dataset');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (err) {
      console.warn('saveCustomDataToDB error:', err);
      return false;
    }
  }

  async function removeCustomDataFromDB() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      const db = await openDatabase();
      if (!db || !db.objectStoreNames.contains(STORE_NAME)) return true;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete('active_dataset');
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (err) {
      return false;
    }
  }

  /* ---------------- Fast Cache Index Builder ---------------- */
  function buildFastCacheIndex() {
    console.time('FastCacheIndexing');
    autoDetectMissingColumns(rawRows, colMap);

    const pIdx = colMap['AcademicPeriod'];
    const cIdx = colMap['CM_Course_Name'];
    const sIdx = colMap['Semester'];
    const tIdx = colMap['Term'];
    const attIdx = colMap['AttemptNo'];
    const rIdx = colMap['StudentRollNo'];
    const dIdx = colMap['DepartmentCode'];

    dataCache = {
      isIndexed: true,
      distinctValues: {},
      cohortRows: {},
      cohortCounts: {}
    };

    const periodSet = new Set();
    const allCoursesSet = new Set();
    const allDeptsSet = new Set();
    const allSemsSet = new Set();
    const allTermsSet = new Set();
    
    const periodToDeptMap = {};
    const deptToCourseMap = {};
    const courseToSemMap = {};
    const periodDeptToCourseMap = {};
    const periodCourseToSemMap = {};
    const cohortSeenRegular = {};
    const cohortSeenBacklog = {};

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const p = pIdx !== undefined && row[pIdx] !== null && row[pIdx] !== undefined ? String(row[pIdx]).trim() : '';
      const d = dIdx !== undefined && row[dIdx] !== null && row[dIdx] !== undefined ? String(row[dIdx]).trim() : '';
      const c = cIdx !== undefined && row[cIdx] !== null && row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
      const s = sIdx !== undefined && row[sIdx] !== null && row[sIdx] !== undefined ? String(row[sIdx]).trim() : '';
      let t = tIdx !== undefined && row[tIdx] !== null && row[tIdx] !== undefined ? String(row[tIdx]).trim() : '';
      if (!t && s) {
        const sNum = Number(s);
        if (!isNaN(sNum) && sNum > 0) {
          t = (sNum % 2 !== 0) ? 'Term I' : 'Term II';
        }
      }
      if (t) t = normalizeTerm(t);
      const att = attIdx !== undefined && Number(row[attIdx]) ? Number(row[attIdx]) : 1;
      const roll = rIdx !== undefined && row[rIdx] !== null && row[rIdx] !== undefined ? String(row[rIdx]).trim() : '';

      if (p) periodSet.add(p);
      if (c) allCoursesSet.add(c);
      if (d) allDeptsSet.add(d);
      if (s) allSemsSet.add(s);
      if (t) allTermsSet.add(t);

      // Period -> Department
      if (p && d) {
        if (!periodToDeptMap[p]) periodToDeptMap[p] = new Set();
        periodToDeptMap[p].add(d);
      }

      // Dept -> Course
      if (d && c) {
        if (!deptToCourseMap[d]) deptToCourseMap[d] = new Set();
        deptToCourseMap[d].add(c);
      }

      // Course -> Semester
      if (c && s) {
        if (!courseToSemMap[c]) courseToSemMap[c] = new Set();
        courseToSemMap[c].add(s);
      }

      // Period + Dept -> Course
      if (c) {
        const pdKey = `${p}|${d}`;
        if (!periodDeptToCourseMap[pdKey]) periodDeptToCourseMap[pdKey] = new Set();
        periodDeptToCourseMap[pdKey].add(c);

        const pWildKey = `${p}|`;
        if (!periodDeptToCourseMap[pWildKey]) periodDeptToCourseMap[pWildKey] = new Set();
        periodDeptToCourseMap[pWildKey].add(c);
      }

      // Period + Course -> Semester
      if (c && s) {
        const pcsKey = `${p}|${c}`;
        if (!periodCourseToSemMap[pcsKey]) periodCourseToSemMap[pcsKey] = new Set();
        periodCourseToSemMap[pcsKey].add(s);

        // Group rows by Period|Course|Semester
        const fullKey = `${p}|${c}|${s}`;
        if (!dataCache.cohortRows[fullKey]) dataCache.cohortRows[fullKey] = [];
        dataCache.cohortRows[fullKey].push(row);

        // Track regular vs backlog counts
        if (!dataCache.cohortCounts[fullKey]) {
          dataCache.cohortCounts[fullKey] = { regular: 0, backlog: 0, total: 0 };
          cohortSeenRegular[fullKey] = new Set();
          cohortSeenBacklog[fullKey] = new Set();
        }
        if (att === 1) {
          if (!cohortSeenRegular[fullKey].has(roll)) {
            cohortSeenRegular[fullKey].add(roll);
            dataCache.cohortCounts[fullKey].regular++;
          }
        } else {
          if (!cohortSeenBacklog[fullKey].has(roll)) {
            cohortSeenBacklog[fullKey].add(roll);
            dataCache.cohortCounts[fullKey].backlog++;
          }
        }
      }
    }

    // Finalize counts
    Object.keys(dataCache.cohortCounts).forEach(k => {
      const cc = dataCache.cohortCounts[k];
      cc.total = cc.regular + cc.backlog;
    });

    dataCache.distinctValues = {
      periodSet,
      allCoursesSet,
      allDeptsSet,
      allSemsSet,
      allTermsSet,
      periodToDeptMap,
      deptToCourseMap,
      courseToSemMap,
      periodDeptToCourseMap,
      periodCourseToSemMap
    };

    console.timeEnd('FastCacheIndexing');
    console.log(`Indexed ${rawRows.length} rows: ${periodSet.size} periods, ${allDeptsSet.size} departments, ${allCoursesSet.size} programmes.`);
  }

  function buildCourseDeptIndex() {
    autoDetectMissingColumns(rawRows, colMap);
    const cIdx = colMap['CM_Course_Name'];
    const dIdx = colMap['DepartmentCode'];
    if (cIdx === undefined || dIdx === undefined) return;
    courseToDeptMap = {};
    for (let i = 0; i < rawRows.length; i++) {
      const course = rawRows[i][cIdx];
      const dept = rawRows[i][dIdx];
      if (course && dept && !courseToDeptMap[course]) {
        courseToDeptMap[course] = dept;
      }
    }
  }

  /* ---------------- Filter & Query Methods (Self-Healing) ---------------- */
  function getFilteredDistinctValues(field, filters = {}) {
    const period = filters.AcademicPeriod ? String(filters.AcademicPeriod).trim() : '';
    const dept = filters.DepartmentCode ? String(filters.DepartmentCode).trim() : '';
    const course = filters.CM_Course_Name ? String(filters.CM_Course_Name).trim() : '';
    const term = filters.Term ? normalizeTerm(filters.Term) : '';

    if (dataCache.isIndexed && dataCache.distinctValues) {
      const dv = dataCache.distinctValues;

      // 1. Academic Periods (Sorted descending so most recent academic year is first)
      if (field === 'AcademicPeriod') {
        const arr = Array.from(dv.periodSet || []).filter(Boolean).sort().reverse();
        if (arr.length > 0) return arr;
      }

      // 2. Department / School
      if (field === 'DepartmentCode') {
        if (period && dv.periodToDeptMap && dv.periodToDeptMap[period]) {
          const arr = Array.from(dv.periodToDeptMap[period]).filter(Boolean).sort();
          if (arr.length > 0) return arr;
        }
        // Fallback: If no period selected or period has no dept map, return ALL distinct departments
        if (dv.allDeptsSet && dv.allDeptsSet.size > 0) {
          return Array.from(dv.allDeptsSet).filter(Boolean).sort();
        }
      }

      // 3. Programme / Course
      if (field === 'CM_Course_Name') {
        const pdKey = `${period}|${dept}`;
        if (dv.periodDeptToCourseMap && dv.periodDeptToCourseMap[pdKey]) {
          const arr = Array.from(dv.periodDeptToCourseMap[pdKey]).filter(Boolean).sort();
          if (arr.length > 0) return arr;
        }
        if (dept && dv.deptToCourseMap && dv.deptToCourseMap[dept]) {
          const arr = Array.from(dv.deptToCourseMap[dept]).filter(Boolean).sort();
          if (arr.length > 0) return arr;
        }
        if (period) {
          const pWildKey = `${period}|`;
          if (dv.periodDeptToCourseMap && dv.periodDeptToCourseMap[pWildKey]) {
            const arr = Array.from(dv.periodDeptToCourseMap[pWildKey]).filter(Boolean).sort();
            if (arr.length > 0) return arr;
          }
        }
        // Fallback: return ALL programmes
        if (dv.allCoursesSet && dv.allCoursesSet.size > 0) {
          return Array.from(dv.allCoursesSet).filter(Boolean).sort();
        }
      }

      // 4. Term
      if (field === 'Term') {
        if (dv.allTermsSet && dv.allTermsSet.size > 0) {
          return Array.from(dv.allTermsSet).filter(Boolean).sort();
        }
        return ['Term I', 'Term II'];
      }

      // 5. Semesters
      if (field === 'Semester') {
        const pcKey = `${period}|${course}`;
        let arr = [];
        if (dv.periodCourseToSemMap && dv.periodCourseToSemMap[pcKey]) {
          arr = Array.from(dv.periodCourseToSemMap[pcKey]).filter(Boolean);
        } else if (course && dv.courseToSemMap && dv.courseToSemMap[course]) {
          arr = Array.from(dv.courseToSemMap[course]).filter(Boolean);
        } else if (dv.allSemsSet && dv.allSemsSet.size > 0) {
          arr = Array.from(dv.allSemsSet).filter(Boolean);
        }
        if (term && arr.length > 0) {
          const isTerm1 = term.toUpperCase().includes('I') && !term.toUpperCase().includes('II');
          const isTerm2 = term.toUpperCase().includes('II') || term.includes('2');
          if (isTerm1) {
            arr = arr.filter(s => (Number(s) % 2 !== 0));
          } else if (isTerm2) {
            arr = arr.filter(s => (Number(s) % 2 === 0));
          }
        }
        if (arr.length > 0) return arr.sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
      }
    }

    // Direct scan fallback if index not populated
    const idx = colMap[field];
    if (field === 'Term' && idx === undefined) {
      return ['Term I', 'Term II'];
    }
    if (idx === undefined) return [];
    const set = new Set();
    const pIdx = colMap['AcademicPeriod'];
    const dIdx = colMap['DepartmentCode'];
    const cIdx = colMap['CM_Course_Name'];
    const sIdx = colMap['Semester'];
    const tIdx = colMap['Term'];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (period && pIdx !== undefined && String(row[pIdx] || '').trim() !== period) continue;
      if (dept && dIdx !== undefined && String(row[dIdx] || '').trim() !== dept) continue;
      if (course && cIdx !== undefined && String(row[cIdx] || '').trim() !== course) continue;
      if (term) {
        let rowTerm = (tIdx !== undefined && row[tIdx] !== null && row[tIdx] !== undefined) ? String(row[tIdx]).trim() : '';
        if (!rowTerm && sIdx !== undefined && row[sIdx]) {
          const sn = Number(row[sIdx]);
          if (!isNaN(sn) && sn > 0) {
            rowTerm = (sn % 2 !== 0) ? 'Term I' : 'Term II';
          }
        }
        if (normalizeTerm(rowTerm) !== term) continue;
      }
      const val = row[idx];
      if (val !== null && val !== undefined && val !== '') {
        set.add(String(val).trim());
      }
    }

    const arr = Array.from(set).filter(Boolean);
    if (field === 'Semester') {
      return arr.sort((a, b) => (Number(a) || 0) - (Number(b) || 0));
    }
    if (field === 'Term') {
      const res = arr.map(normalizeTerm);
      return Array.from(new Set(res)).sort();
    }
    return arr.sort();
  }

  function getExamTypeCohortCounts(period, course, sem) {
    if (dataCache && dataCache.isIndexed && period && course && sem) {
      const key = `${period}|${course}|${sem}`;
      if (dataCache.cohortCounts[key]) {
        return dataCache.cohortCounts[key];
      }
    }

    const pIdx = colMap['AcademicPeriod'];
    const cIdx = colMap['CM_Course_Name'];
    const sIdx = colMap['Semester'];
    const attIdx = colMap['AttemptNo'];
    const rIdx = colMap['StudentRollNo'];

    let regular = 0;
    let backlog = 0;
    const seenReg = new Set();
    const seenBacklog = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (period && pIdx !== undefined && String(row[pIdx] || '').trim() !== String(period).trim()) continue;
      if (course && cIdx !== undefined && String(row[cIdx] || '').trim() !== String(course).trim()) continue;
      if (sem && sIdx !== undefined && String(row[sIdx] || '').trim() !== String(sem).trim()) continue;

      const roll = rIdx !== undefined ? String(row[rIdx] || '') : String(i);
      const att = attIdx !== undefined && Number(row[attIdx]) ? Number(row[attIdx]) : 1;
      if (att === 1) {
        if (!seenReg.has(roll)) { seenReg.add(roll); regular++; }
      } else {
        if (!seenBacklog.has(roll)) { seenBacklog.add(roll); backlog++; }
      }
    }
    return { regular, backlog, total: regular + backlog };
  }

  function getCohortRows(period, course, sem, term) {
    const key = `${period}|${course}|${sem}`;
    let rows = [];
    if (dataCache && dataCache.isIndexed && sem && dataCache.cohortRows[key]) {
      rows = dataCache.cohortRows[key].slice();
    } else {
      const pIdx = colMap['AcademicPeriod'];
      const cIdx = colMap['CM_Course_Name'];
      const sIdx = colMap['Semester'];
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (period && pIdx !== undefined && String(row[pIdx] || '').trim() !== String(period).trim()) continue;
        if (course && cIdx !== undefined && String(row[cIdx] || '').trim() !== String(course).trim()) continue;
        if (sem && sIdx !== undefined && String(row[sIdx] || '').trim() !== String(sem).trim()) continue;
        rows.push(row);
      }
    }

    if (term) {
      const targetTerm = normalizeTerm(term);
      const tIdx = colMap['Term'];
      const sIdx = colMap['Semester'];
      rows = rows.filter(r => {
        let tVal = (tIdx !== undefined && r[tIdx] !== null && r[tIdx] !== undefined) ? String(r[tIdx]).trim() : '';
        if (!tVal && sIdx !== undefined && r[sIdx]) {
          const sn = Number(r[sIdx]);
          if (!isNaN(sn) && sn > 0) {
            tVal = (sn % 2 !== 0) ? 'Term I' : 'Term II';
          }
        }
        return normalizeTerm(tVal) === targetTerm;
      });
    }

    return rows;
  }

  /* ---------------- Data Formatting Helpers ---------------- */
  function sanitizeMarkVal(val) {
    if (val === null || val === undefined) return null;
    let str = String(val).trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;
    str = str.replace(/AB\s*\(?Theory\)?/i, 'AB')
             .replace(/AB\s*\(?Practical\)?/i, 'AB')
             .replace(/\(Theory\)/gi, '')
             .replace(/\(Practical\)/gi, '')
             .trim();
    return str;
  }

  function hasValidMarkValue(val) {
    const s = sanitizeMarkVal(val);
    return s !== null && s !== '';
  }

  function formatSingleMark(val) {
    const clean = sanitizeMarkVal(val);
    if (clean === null) return '-';
    if (clean.toUpperCase() === 'AB' || clean.toUpperCase() === 'ABSENT') return '<span class="ab-mark">AB</span>';
    return clean;
  }

  function formatComponentMark(val, minMk, maxMk) {
    const clean = sanitizeMarkVal(val);
    if (clean === null) return '-';
    const sUpper = clean.toUpperCase();
    if (sUpper === 'AB' || sUpper === 'ABSENT') return '<span class="ab-mark">AB</span>';

    const num = Number(clean);
    const minVal = Number(minMk);
    if (!isNaN(num) && !isNaN(minVal) && minVal > 0 && num < minVal) {
      return `<span class="fail-mark">${clean}</span>`;
    }
    return clean;
  }

  function formatSubcolHeaderLabel(label) {
    if (!label) return '';
    const clean = String(label).trim();
    if (clean.toLowerCase() === 'th grd') return 'Th<br>Grd';
    if (clean.toLowerCase() === 'pr grd') return 'Pr<br>Grd';
    return clean;
  }

  function formatExamSession(examYearStr, period, sem) {
    if (!examYearStr && !period) return 'NOVEMBER 2024';
    let str = String(examYearStr || '').trim();
    str = str.replace(/\s+EXAMINATIONS?$/i, '').trim();

    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];

    // 1. Check for Excel numeric serial date (e.g. 45597 -> NOVEMBER 2024)
    const num = Number(str);
    if (!isNaN(num) && num > 20000 && num < 70000) {
      // Excel epoch: Dec 30, 1899. Add 12 hours (0.5 day) to avoid UTC/timezone boundary drift
      const utcMs = Math.round((num - 25569 + 0.5) * 86400 * 1000);
      const d = new Date(utcMs);
      if (!isNaN(d.getTime())) {
        const monthName = monthNames[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        return `${monthName} ${year}`;
      }
    }

    // 2. Check for "Month YYYY" or "Month-YYYY" or "Mon YYYY" (e.g. "November 2024", "Nov 2024", "May-2024")
    const monthYearMatch = str.match(/^([A-Za-z]+)[- ]+(\d{4}|\d{2})$/);
    if (monthYearMatch) {
      const mStr = monthYearMatch[1].toUpperCase();
      let yStr = monthYearMatch[2];
      if (yStr.length === 2) yStr = '20' + yStr;
      const fullMonth = monthNames.find(m => m.startsWith(mStr.substring(0, 3))) || mStr;
      return `${fullMonth} ${yStr}`;
    }

    // 3. Check for 4-digit Year only (e.g. "2024")
    if (/^\d{4}$/.test(str)) {
      const semNum = Number(sem) || 1;
      const isOddSem = semNum % 2 !== 0;
      const defaultMonth = isOddSem ? 'NOVEMBER' : 'MAY';
      return `${defaultMonth} ${str}`;
    }

    // 4. Check for ISO or Date string (e.g. "2024-11-01", "2024/11/01", "01-11-2024")
    if (/[\/\-]/.test(str)) {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
        const monthName = monthNames[parsedDate.getMonth()];
        const year = parsedDate.getFullYear();
        return `${monthName} ${year}`;
      }
    }

    // 5. Fallback from AcademicPeriod if examYearStr was missing (e.g. "2024-2025")
    if (period && /^\d{4}-\d{4}$/.test(String(period).trim())) {
      const years = String(period).trim().split('-');
      const semNum = Number(sem) || 1;
      const isOddSem = semNum % 2 !== 0;
      if (isOddSem) {
        return `NOVEMBER ${years[0]}`;
      } else {
        return `MAY ${years[1]}`;
      }
    }

    if (str) {
      return `${str.toUpperCase()}`;
    }

    return 'NOVEMBER 2024';
  }

  /* ---------------- Summary Statistics ---------------- */
  function getSummaryStats() {
    autoDetectMissingColumns(rawRows, colMap);
    const pIdx = colMap['AcademicPeriod'];
    const cIdx = colMap['CM_Course_Name'];
    const rIdx = colMap['StudentRollNo'];
    const sIdx = colMap['Semester'];
    const attIdx = colMap['AttemptNo'];
    const resIdx = colMap['Result'];

    const periods = new Set();
    const courses = new Set();
    const students = new Set();
    let regularCount = 0;
    let backlogCount = 0;
    let passCount = 0;
    let failCount = 0;

    const seenAppearances = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (pIdx !== undefined && row[pIdx]) periods.add(String(row[pIdx]).trim());
      if (cIdx !== undefined && row[cIdx]) courses.add(String(row[cIdx]).trim());
      const roll = rIdx !== undefined && row[rIdx] !== null ? String(row[rIdx]).trim() : '';
      if (roll) students.add(roll);

      const att = attIdx !== undefined && Number(row[attIdx]) ? Number(row[attIdx]) : 1;
      const sem = sIdx !== undefined ? row[sIdx] : '';
      const appKey = `${roll}|${sem}|${att}`;
      if (!seenAppearances.has(appKey)) {
        seenAppearances.add(appKey);
        if (att === 1) regularCount++; else backlogCount++;
        const res = resIdx !== undefined ? String(row[resIdx] || '').toUpperCase() : '';
        if (res.includes('PASS')) passCount++; else failCount++;
      }
    }

    const totalAppearances = regularCount + backlogCount;
    const passPercentage = totalAppearances > 0 ? ((passCount / totalAppearances) * 100).toFixed(1) : 0;

    return {
      totalRecords: rawRows.length,
      uniqueStudents: students.size,
      totalProgrammes: courses.size,
      totalPeriods: periods.size,
      regularAppearances: regularCount,
      backlogAppearances: backlogCount,
      passedAppearances: passCount,
      failedAppearances: failCount,
      passPercentage
    };
  }

  /* ---------------- Master Initialization ---------------- */
  function waitForEmbeddedData(timeoutMs = 8000) {
    return new Promise((resolve) => {
      if (window.EMBEDDED_MASTER_DATA_COMPACT && window.EMBEDDED_MASTER_DATA_COMPACT.rows && window.EMBEDDED_MASTER_DATA_COMPACT.rows.length > 0) {
        return resolve(window.EMBEDDED_MASTER_DATA_COMPACT);
      }
      const start = Date.now();
      const interval = setInterval(() => {
        if (window.EMBEDDED_MASTER_DATA_COMPACT && window.EMBEDDED_MASTER_DATA_COMPACT.rows && window.EMBEDDED_MASTER_DATA_COMPACT.rows.length > 0) {
          clearInterval(interval);
          resolve(window.EMBEDDED_MASTER_DATA_COMPACT);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(null);
        }
      }, 50);
    });
  }

  async function init() {
    // 1. Check if user uploaded a custom dataset into IndexedDB or LocalStorage
    const customData = await loadCustomDataFromDB();

    if (customData && customData.rows && customData.rows.length > 0 && customData.headers) {
      console.log('Loaded user custom dataset with', customData.rows.length, 'records.');
      originalHeaders = customData.headers;
      colMap = buildCanonicalColMap(customData.headers);
      rawRows = customData.rows;
      datasetInfo = {
        fileName: customData.fileName || 'Master_File.xlsx',
        source: customData.source || 'Uploaded Spreadsheet',
        fileSize: customData.fileSize || `${(customData.rows.length * 0.00025).toFixed(1)} MB`,
        uploadedAt: customData.updatedAt || new Date().toLocaleString(),
        isCustom: true
      };
      buildCourseDeptIndex();
      buildFastCacheIndex();
      return { source: 'custom_dataset', count: rawRows.length, datasetInfo };
    }

    // 2. Fall back to pre-extracted compact master data (140,799 rows) with robust readiness wait
    const compact = await waitForEmbeddedData(8000);
    if (compact && compact.rows && compact.rows.length > 0) {
      console.log('Loading pre-extracted compact master data with', compact.rows.length, 'records...');
      originalHeaders = compact.headers;
      colMap = buildCanonicalColMap(compact.headers);
      rawRows = compact.rows;
      datasetInfo = {
        fileName: 'Master_File.xlsx',
        source: 'Official University Master File (SSPU_Master_Cleaned)',
        fileSize: '35.9 MB',
        uploadedAt: 'Active Embedded Master',
        isCustom: false
      };
      buildCourseDeptIndex();
      buildFastCacheIndex();
      return { source: 'embedded_compact', count: rawRows.length, datasetInfo };
    }

    console.warn('No preloaded or custom data found.');
    return { source: 'none', count: 0, datasetInfo };
  }

  /* ---------------- Custom Upload & Reset ---------------- */
  async function saveCustomUpload(newRows, headers, mode = 'replace', fileMeta = {}) {
    if (mode === 'append' && rawRows.length > 0) {
      // Appending with a different header order would re-map stored rows with
      // wrong column indexes on next load, so only exact matches may append.
      const stored = Array.isArray(originalHeaders) ? originalHeaders : [];
      const headersMatch = stored.length === headers.length &&
        stored.every((h, i) => String(h === null || h === undefined ? '' : h).trim() === String(headers[i] === null || headers[i] === undefined ? '' : headers[i]).trim());
      if (!headersMatch) {
        const msg = 'Append rejected: the new file\'s headers/column order differ from the stored dataset. Appending would corrupt existing records. Use "Replace" instead, or match the original column order exactly.';
        if (window.commonUI && typeof window.commonUI.showToast === 'function') {
          window.commonUI.showToast(msg, 'error');
        } else {
          alert(msg);
        }
        return null;
      }
    }

    originalHeaders = headers;
    const newColMap = buildCanonicalColMap(headers);

    if (mode === 'append' && rawRows.length > 0) {
      rawRows = rawRows.concat(newRows);
    } else {
      rawRows = newRows;
      colMap = newColMap;
    }

    const szStr = fileMeta.fileSize 
      ? (fileMeta.fileSize > 1048576 ? `${(fileMeta.fileSize / 1048576).toFixed(1)} MB` : `${Math.round(fileMeta.fileSize / 1024)} KB`)
      : `${(rawRows.length * 0.00025).toFixed(1)} MB`;

    datasetInfo = {
      fileName: fileMeta.fileName || 'Master_File.xlsx',
      source: 'Uploaded Custom Spreadsheet',
      fileSize: szStr,
      uploadedAt: new Date().toLocaleString(),
      isCustom: true
    };

    await saveCustomDataToDB({
      fileName: datasetInfo.fileName,
      fileSize: datasetInfo.fileSize,
      source: datasetInfo.source,
      headers: headers.length > 0 ? headers : originalHeaders,
      rows: rawRows,
      updatedAt: datasetInfo.uploadedAt,
      isCustom: true
    });

    buildCourseDeptIndex();
    buildFastCacheIndex();

    // Broadcast update across tabs
    try {
      window.dispatchEvent(new CustomEvent('sspu-data-updated', { detail: { count: rawRows.length, datasetInfo } }));
      localStorage.setItem('SSPU_LAST_DATA_UPDATE', String(Date.now()));
    } catch (e) {}

    return rawRows.length;
  }

  async function restoreDefault() {
    await removeCustomDataFromDB();
    if (window.EMBEDDED_MASTER_DATA_COMPACT && window.EMBEDDED_MASTER_DATA_COMPACT.rows) {
      const compact = window.EMBEDDED_MASTER_DATA_COMPACT;
      originalHeaders = compact.headers;
      colMap = buildCanonicalColMap(compact.headers);
      rawRows = compact.rows;
      datasetInfo = {
        fileName: 'Master_File.xlsx',
        source: 'Official University Master File (SSPU_Master_Cleaned)',
        fileSize: '35.9 MB',
        uploadedAt: 'Active Embedded Master',
        isCustom: false
      };
      buildCourseDeptIndex();
      buildFastCacheIndex();
      try {
        window.dispatchEvent(new CustomEvent('sspu-data-updated', { detail: { count: rawRows.length, datasetInfo } }));
        localStorage.setItem('SSPU_LAST_DATA_UPDATE', String(Date.now()));
      } catch (e) {}
      return rawRows.length;
    }
    rawRows = [];
    return 0;
  }

  async function clearAll() {
    rawRows = [];
    datasetInfo = {
      fileName: 'None (Database Cleared)',
      source: 'Memory Cleared',
      fileSize: '0 KB',
      uploadedAt: null,
      isCustom: true
    };
    await removeCustomDataFromDB();
    await saveCustomDataToDB({ headers: originalHeaders, rows: [], updatedAt: new Date().toISOString(), isCustom: true });
    buildFastCacheIndex();
    try {
      window.dispatchEvent(new CustomEvent('sspu-data-updated', { detail: { count: 0, datasetInfo } }));
      localStorage.setItem('SSPU_LAST_DATA_UPDATE', String(Date.now()));
    } catch (e) {}
    return 0;
  }

  // Export public API
  window.dataStore = {
    init,
    getRawRows: () => rawRows,
    getColMap: () => colMap,
    getOriginalHeaders: () => originalHeaders,
    getCourseToDeptMap: () => courseToDeptMap,
    getDataCache: () => dataCache,
    getDatasetInfo: () => datasetInfo,
    getFilteredDistinctValues,
    getExamTypeCohortCounts,
    getCohortRows,
    getSummaryStats,
    sanitizeMarkVal,
    hasValidMarkValue,
    formatSingleMark,
    formatComponentMark,
    formatSubcolHeaderLabel,
    formatExamSession,
    normalizeTerm,
    saveCustomUpload,
    restoreDefault,
    clearAll
  };

})(window);
