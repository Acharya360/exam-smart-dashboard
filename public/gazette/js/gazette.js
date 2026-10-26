/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - TABULATION REGISTER (A3 MATRIX) ENGINE
 * =========================================================================
 */

(function(window) {
  'use strict';

  let currentGazettePages = [];
  let currentGazettePageIndex = 0;
  let cachedStudentsList = [];
  let cachedDisplayColumns = [];
  let userExplicitlyClearedCourse = false;
  let isContinuousView = false;

  // Lazy wrappers so load order of common.js never matters at IIFE eval time
  const escapeHtml = (str) => commonUI.escapeHtml(str);
  const escapeAttr = (str) => commonUI.escapeAttr(str);

  /* ---------------- Grade & Value Sanitization Helper ---------------- */
  function cleanGradeVal(val) {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '' || s.toUpperCase() === 'NULL' || s.toUpperCase() === 'NUL' || s.toUpperCase() === 'NIL' || s === '-') return '';
    return s;
  }

  /* ---------------- Subject Maximum & Passing Marks Resolvers ---------------- */
  function computeSubjectMaxMarks(sub) {
    if (!sub) return 100;
    const caThMax = Number(sub.caThMax) || 0;
    const caPrMax = Number(sub.caPrMax) || 0;
    const eseThMax = Number(sub.eseThMax) || 0;
    const esePrMax = Number(sub.esePrMax) || 0;
    const iaMax = Number(sub.iaMax) || 0;
    const sumComponentMax = caThMax + caPrMax + eseThMax + esePrMax + iaMax;

    if (sumComponentMax > 0) {
      return sumComponentMax;
    }

    const rawMax = Number(sub.maxMk);
    if (!isNaN(rawMax) && rawMax > 0) {
      return rawMax;
    }

    return 100;
  }

  function computeSubjectPassMarks(sub, maxMk) {
    if (!sub) return 40;
    const caThMin = Number(sub.caThMin) || 0;
    const caPrMin = Number(sub.caPrMin) || 0;
    const eseThMin = Number(sub.eseThMin) || 0;
    const esePrMin = Number(sub.esePrMin) || 0;
    const iaMin = Number(sub.iaMin) || 0;
    const sumComponentMin = caThMin + caPrMin + eseThMin + esePrMin + iaMin;

    if (sumComponentMin > 0) {
      return sumComponentMin;
    }

    const rawPass = Number(sub.passMk);
    if (!isNaN(rawPass) && rawPass > 0) {
      return rawPass;
    }

    return Math.round((maxMk || 100) * 0.4);
  }

  /* ---------------- Credit Formatter (Theory + Practical Breakdown) ---------------- */
  function formatSubjectCredits(sub, isElective = false) {
    if (!sub) return 'CR : 2+2=4';
    const thRaw = sub.crTh;
    const prRaw = sub.crPr;
    const hasTh = thRaw !== null && thRaw !== undefined && thRaw !== '' && thRaw !== 'NULL';
    const hasPr = prRaw !== null && prRaw !== undefined && prRaw !== '' && prRaw !== 'NULL';
    const th = Number(thRaw) || 0;
    const pr = Number(prRaw) || 0;
    const tot = th + pr;

    if (hasTh || hasPr) {
      if (tot === 4) {
        if (th === 2 && pr === 2) return 'CR : 2+2=4';
        if (th === 0 && pr === 0) return 'CR : 2+2=4';
        return `CR : ${th}+${pr}=4`;
      } else if (tot > 0) {
        return `CR : ${th}+${pr}=${tot}`;
      } else {
        return 'CR : 0';
      }
    }

    const fallbackTot = Number(sub.credits || sub.cr || sub.totalCredits) || 0;
    if (fallbackTot === 4) return 'CR : 2+2=4';
    if (fallbackTot === 3) return 'CR : 2+1=3';
    if (fallbackTot === 2) return 'CR : 1+1=2';
    if (fallbackTot > 0) return `CR : ${fallbackTot}`;

    return 'CR : 2+2=4';
  }

  /* ---------------- Component Mark Validity Helper ---------------- */
  function isValidComponentMark(val) {
    if (val === null || val === undefined) return false;
    const s = String(val).trim();
    if (s === '' || s === '-' || s.toUpperCase() === 'NULL' || s.toUpperCase() === 'NUL' || s.toUpperCase() === 'NIL') return false;
    return true;
  }

  /* ---------------- Dynamic Sub-Column Pruning (Remove All-NULL Columns) ---------------- */
  function computeActiveSubColumns(col, students, template = 'template1') {
    const hasCohortRecords = Array.isArray(students) && students.length > 0;

    if (template === 'template2') {
      let hasCAT = false;
      let hasCAP = false;
      let hasCA = false;
      let hasIA = false;
      let hasEST = false;
      let hasESP = false;
      let hasESE = false;
      let hasThGrd = false;
      let hasPrGrd = false;
      let hasGrd = false;

      // 1. Only check syllabus definitions as fallback when no cohort students are loaded
      if (!hasCohortRecords) {
        if (col.type === 'core' && col.subject) {
          const s = col.subject;
          if ((Number(s.caThMax) || 0) > 0) hasCAT = true;
          if ((Number(s.caPrMax) || 0) > 0) hasCAP = true;
          if ((Number(s.iaMax) || 0) > 0) hasIA = true;
          if ((Number(s.eseThMax) || 0) > 0) hasEST = true;
          if ((Number(s.esePrMax) || 0) > 0) hasESP = true;
        } else if (col.type === 'elective' && Array.isArray(col.subjects)) {
          col.subjects.forEach(s => {
            if ((Number(s.caThMax) || 0) > 0) hasCAT = true;
            if ((Number(s.caPrMax) || 0) > 0) hasCAP = true;
            if ((Number(s.iaMax) || 0) > 0) hasIA = true;
            if ((Number(s.eseThMax) || 0) > 0) hasEST = true;
            if ((Number(s.esePrMax) || 0) > 0) hasESP = true;
          });
        }
      } else {
        // 2. Strict Data-Driven Pruning: Only show component if at least one student in cohort has valid data
        for (let stud of students) {
          let rec = null;
          if (col.type === 'elective') {
            for (let s of col.subjects) {
              if (stud.subjects && stud.subjects[s.code]) {
                rec = stud.subjects[s.code];
                break;
              }
            }
          } else if (col.subject) {
            rec = stud.subjects && stud.subjects[col.subject.code];
          }

          if (rec) {
            if (!hasCAT && isValidComponentMark(rec.caTh)) hasCAT = true;
            if (!hasCAP && isValidComponentMark(rec.caPr)) hasCAP = true;
            if (!hasCA && (isValidComponentMark(rec.caTh) || isValidComponentMark(rec.caPr))) hasCA = true;
            if (!hasIA && isValidComponentMark(rec.ia)) hasIA = true;
            if (!hasEST && isValidComponentMark(rec.eseTh)) hasEST = true;
            if (!hasESP && isValidComponentMark(rec.esePr)) hasESP = true;
            if (!hasESE && (isValidComponentMark(rec.eseTh) || isValidComponentMark(rec.esePr))) hasESE = true;
            if (!hasThGrd && cleanGradeVal(rec.thGrd) !== '') hasThGrd = true;
            if (!hasPrGrd && cleanGradeVal(rec.prGrd) !== '') hasPrGrd = true;
            if (!hasGrd && cleanGradeVal(rec.grd) !== '') hasGrd = true;
          }
        }
      }

      // Fallbacks to avoid completely empty blocks
      if (!hasCAT && !hasCAP && !hasCA && !hasIA && !hasEST && !hasESP && !hasESE) {
        hasIA = true;
      }
      if (!hasThGrd && !hasPrGrd && !hasGrd) {
        hasGrd = true;
      }

      const subCols = [];
      // Elective group: Add Selected Course (Code - Name) column first
      if (col.type === 'elective') {
        subCols.push({ id: 'electiveCourse', label: 'Selected Course<br>(Code - Name)', thClass: 'subcol-elective-course', tdClass: 'col-elective-course' });
      }

      if (hasCAT) {
        subCols.push({ id: 'cat', label: '<div class="vert-hdr"><span>C</span><span>A</span><span>T</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }
      if (hasCAP) {
        subCols.push({ id: 'cap', label: '<div class="vert-hdr"><span>C</span><span>A</span><span>P</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }
      if (!hasCAT && !hasCAP && hasCA) {
        subCols.push({ id: 'ca', label: '<div class="vert-hdr"><span>C</span><span>A</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }

      if (hasEST) {
        subCols.push({ id: 'est', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>T</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }
      if (hasESP) {
        subCols.push({ id: 'esp', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>P</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }
      if (!hasEST && !hasESP && hasESE) {
        subCols.push({ id: 'ese', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>E</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }

      if (hasIA) {
        subCols.push({ id: 'ia', label: '<div class="vert-hdr"><span>I</span><span>A</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
      }

      subCols.push({ id: 'tot', label: 'Tot', thClass: 'subcol-tot', tdClass: 'col-tot' });

      if (hasThGrd) {
        subCols.push({ id: 'thGrd', label: 'Th<br>Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
      }
      if (hasPrGrd) {
        subCols.push({ id: 'prGrd', label: 'Pr<br>Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
      }
      if (hasGrd) {
        subCols.push({ id: 'grd', label: 'Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
      }

      return subCols;
    }

    // Default / Template 1 (Combined CA / ESE):
    let hasCA = false;
    let hasIA = false;
    let hasESE = false;
    let hasThGrd = false;
    let hasPrGrd = false;
    let hasGrd = false;

    if (!hasCohortRecords) {
      if (col.type === 'core' && col.subject) {
        const s = col.subject;
        if ((Number(s.caThMax) || 0) > 0 || (Number(s.caPrMax) || 0) > 0) hasCA = true;
        if ((Number(s.iaMax) || 0) > 0) hasIA = true;
        if ((Number(s.eseThMax) || 0) > 0 || (Number(s.esePrMax) || 0) > 0) hasESE = true;
      } else if (col.type === 'elective' && Array.isArray(col.subjects)) {
        col.subjects.forEach(s => {
          if ((Number(s.caThMax) || 0) > 0 || (Number(s.caPrMax) || 0) > 0) hasCA = true;
          if ((Number(s.iaMax) || 0) > 0) hasIA = true;
          if ((Number(s.eseThMax) || 0) > 0 || (Number(s.esePrMax) || 0) > 0) hasESE = true;
        });
      }
    } else {
      // Inspect candidate student records across the cohort
      for (let stud of students) {
        let rec = null;
        if (col.type === 'elective') {
          for (let s of col.subjects) {
            if (stud.subjects && stud.subjects[s.code]) {
              rec = stud.subjects[s.code];
              break;
            }
          }
        } else if (col.subject) {
          rec = stud.subjects && stud.subjects[col.subject.code];
        }

        if (rec) {
          if (!hasCA) {
            const caTotal = (Number(rec.caTh) || 0) + (Number(rec.caPr) || 0);
            if (caTotal > 0 || isValidComponentMark(rec.caTh) || isValidComponentMark(rec.caPr)) {
              hasCA = true;
            }
          }
          if (!hasIA && isValidComponentMark(rec.ia)) {
            hasIA = true;
          }
          if (!hasESE) {
            const eseTotal = (Number(rec.eseTh) || 0) + (Number(rec.esePr) || 0);
            if (eseTotal > 0 || isValidComponentMark(rec.eseTh) || isValidComponentMark(rec.esePr)) {
              hasESE = true;
            }
          }
          if (!hasThGrd && cleanGradeVal(rec.thGrd) !== '') {
            hasThGrd = true;
          }
          if (!hasPrGrd && cleanGradeVal(rec.prGrd) !== '') {
            hasPrGrd = true;
          }
          if (!hasGrd && cleanGradeVal(rec.grd) !== '') {
            hasGrd = true;
          }
        }
      }
    }

    // Fallbacks to avoid completely empty blocks
    if (!hasCA && !hasIA && !hasESE) {
      hasIA = true;
    }
    if (!hasThGrd && !hasPrGrd && !hasGrd) {
      hasGrd = true;
    }

    const subCols = [];
    // Elective group: Add Selected Course (Code - Name) column first
    if (col.type === 'elective') {
      subCols.push({ id: 'electiveCourse', label: 'Selected Course<br>(Code - Name)', thClass: 'subcol-elective-course', tdClass: 'col-elective-course' });
    }

    if (hasCA) {
      subCols.push({ id: 'ca', label: '<div class="vert-hdr"><span>C</span><span>A</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
    }
    if (hasESE) {
      subCols.push({ id: 'ese', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>E</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
    }
    if (hasIA) {
      subCols.push({ id: 'ia', label: '<div class="vert-hdr"><span>I</span><span>A</span></div>', thClass: 'subcol-comp', tdClass: 'col-comp' });
    }
    subCols.push({ id: 'tot', label: 'Tot', thClass: 'subcol-tot', tdClass: 'col-tot' });

    if (hasThGrd) {
      subCols.push({ id: 'thGrd', label: 'Th<br>Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
    }
    if (hasPrGrd) {
      subCols.push({ id: 'prGrd', label: 'Pr<br>Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
    }
    if (hasGrd) {
      subCols.push({ id: 'grd', label: 'Grd', thClass: 'subcol-grd', tdClass: 'col-grd' });
    }

    return subCols;
  }

  /* ---------------- Sync Dropdowns ---------------- */
  function syncDropdowns() {
    const periodEl = document.getElementById('filterPeriod');
    const deptEl = document.getElementById('filterDept');
    const courseEl = document.getElementById('filterCourse');
    const termEl = document.getElementById('filterTerm');
    const semEl = document.getElementById('filterSem');
    const examTypeEl = document.getElementById('filterExamType');

    // 0. Academic Periods: Populate descending (latest academic year first, e.g. 2024-2025)
    if (periodEl) {
      let periods = dataStore.getFilteredDistinctValues('AcademicPeriod');
      if (!periods || periods.length === 0) {
        periods = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
      } else {
        periods = Array.from(new Set(periods)).sort().reverse();
      }

      const prevPeriodVal = periodEl.value;
      if (periodEl.options.length <= 1) {
        periodEl.innerHTML = '';
        periods.forEach(p => {
          periodEl.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
        });
        periodEl.innerHTML += `<option value="">-- All Periods --</option>`;
        if (prevPeriodVal && (periods.includes(prevPeriodVal) || prevPeriodVal === '')) {
          periodEl.value = prevPeriodVal;
        } else {
          periodEl.value = periods[0] || '2024-2025';
        }
      }

      // Default to real academic year (2024-2025) instead of empty / All Periods
      if (!periodEl.value) {
        periodEl.value = periods[0] || '2024-2025';
      }
    }

    const period = periodEl ? periodEl.value : '';
    const prevDept = deptEl ? deptEl.value : '';
    const prevCourse = courseEl ? courseEl.value : '';
    const prevTerm = termEl ? termEl.value : '';
    const prevSem = semEl ? semEl.value : '';
    const prevExamType = examTypeEl ? examTypeEl.value : 'ALL';

    // 1. Departments
    if (deptEl) {
      const depts = dataStore.getFilteredDistinctValues('DepartmentCode', { AcademicPeriod: period });
      deptEl.innerHTML = '<option value="">-- All Departments --</option>';
      depts.forEach(d => deptEl.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
      deptEl.value = depts.includes(prevDept) ? prevDept : '';
    }

    // 2. Programmes / Courses
    const activeDept = deptEl ? deptEl.value : '';
    let availableCourses = [];
    if (courseEl) {
      availableCourses = dataStore.getFilteredDistinctValues('CM_Course_Name', {
        AcademicPeriod: period,
        DepartmentCode: activeDept
      });
      courseEl.innerHTML = '<option value="">-- Choose Programme --</option>';
      availableCourses.forEach(c => courseEl.innerHTML += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);

      if (userExplicitlyClearedCourse) {
        courseEl.value = '';
      } else if (prevCourse && availableCourses.includes(prevCourse)) {
        courseEl.value = prevCourse;
      } else if (availableCourses.length > 0) {
        courseEl.value = availableCourses[0];
      } else {
        courseEl.value = '';
      }
    }

    const activeCourse = courseEl ? courseEl.value : '';
    const courseToDeptMap = dataStore.getCourseToDeptMap();
    if (activeCourse && courseToDeptMap[activeCourse] && deptEl && !deptEl.value) {
      deptEl.value = courseToDeptMap[activeCourse];
    }

    // 3. Terms (Dependent on Academic Period & Programme)
    if (termEl) {
      const terms = dataStore.getFilteredDistinctValues('Term', {
        AcademicPeriod: period,
        DepartmentCode: activeDept,
        CM_Course_Name: activeCourse
      }) || ['Term I', 'Term II'];

      termEl.innerHTML = '<option value="">-- All Terms --</option>';
      terms.forEach(t => termEl.innerHTML += `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`);
      if (prevTerm && terms.includes(prevTerm)) {
        termEl.value = prevTerm;
      } else {
        termEl.value = '';
      }
    }

    const activeTerm = termEl ? termEl.value : '';

    // 4. Semesters (Cascaded from Programme & Term)
    if (semEl) {
      if (!activeCourse) {
        semEl.innerHTML = '<option value="">-- Select Programme First --</option>';
        semEl.disabled = true;
      } else {
        semEl.disabled = false;
        const sems = dataStore.getFilteredDistinctValues('Semester', {
          AcademicPeriod: period,
          CM_Course_Name: activeCourse,
          Term: activeTerm
        });
        semEl.innerHTML = '';
        sems.forEach(s => semEl.innerHTML += `<option value="${escapeHtml(s)}">Semester ${escapeHtml(s)}</option>`);
        if (sems.includes(prevSem)) {
          semEl.value = prevSem;
        } else if (sems.length > 0) {
          semEl.value = sems[0];
        }
      }
    }

    // 5. Exam Type: Both, Regular, and Backlog
    if (examTypeEl) {
      examTypeEl.innerHTML = `
        <option value="ALL">Both</option>
        <option value="REGULAR">Regular</option>
        <option value="BACKLOG">Backlog</option>
      `;

      if (prevExamType === 'BACKLOG') {
        examTypeEl.value = 'BACKLOG';
      } else if (prevExamType === 'REGULAR') {
        examTypeEl.value = 'REGULAR';
      } else {
        examTypeEl.value = 'ALL';
      }
    }

    // Filter indicator badges
    const badgeDept = document.getElementById('badgeDept');
    if (badgeDept) badgeDept.style.display = (deptEl && deptEl.value) ? 'inline-block' : 'none';
    const badgeTerm = document.getElementById('badgeTerm');
    if (badgeTerm) badgeTerm.style.display = (termEl && termEl.value) ? 'inline-block' : 'none';
    const badgeSem = document.getElementById('badgeSem');
    if (badgeSem) badgeSem.style.display = (semEl && semEl.value) ? 'inline-block' : 'none';
  }

  function onPeriodChange() {
    userExplicitlyClearedCourse = false;
    syncDropdowns();
    applyFiltersAndRender();
  }

  function onDeptChange() {
    userExplicitlyClearedCourse = false;
    syncDropdowns();
    applyFiltersAndRender();
  }

  function onCourseChange() {
    const courseEl = document.getElementById('filterCourse');
    if (courseEl && !courseEl.value) {
      userExplicitlyClearedCourse = true;
    } else {
      userExplicitlyClearedCourse = false;
    }
    syncDropdowns();
    applyFiltersAndRender();
  }

  function onTermChange() {
    syncDropdowns();
    applyFiltersAndRender();
  }

  function onSemChange() {
    applyFiltersAndRender();
  }

  function onExamDateChange() {
    applyFiltersAndRender();
  }

  function onTemplateChange() {
    applyFiltersAndRender();
  }

  function pickCourseQuick(courseName) {
    userExplicitlyClearedCourse = false;
    const courseToDeptMap = (typeof dataStore !== 'undefined' && dataStore.getCourseToDeptMap) ? dataStore.getCourseToDeptMap() : {};
    const targetDept = courseToDeptMap[courseName];
    const deptEl = document.getElementById('filterDept');
    if (deptEl) {
      deptEl.value = targetDept || '';
    }
    const courseEl = document.getElementById('filterCourse');
    if (courseEl) courseEl.value = courseName;
    syncDropdowns();
    applyFiltersAndRender();
  }

  function resetAllFilters() {
    userExplicitlyClearedCourse = false;
    const pEl = document.getElementById('filterPeriod');
    if (pEl) {
      let periods = dataStore.getFilteredDistinctValues('AcademicPeriod');
      if (!periods || periods.length === 0) {
        periods = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
      } else {
        periods = Array.from(new Set(periods)).sort().reverse();
      }
      pEl.value = periods[0] || '2024-2025';
    }
    if (document.getElementById('filterDept')) document.getElementById('filterDept').value = '';
    if (document.getElementById('filterCourse')) document.getElementById('filterCourse').value = '';
    if (document.getElementById('filterTerm')) document.getElementById('filterTerm').value = '';
    if (document.getElementById('filterExamType')) document.getElementById('filterExamType').value = 'ALL';
    if (document.getElementById('searchQuery')) document.getElementById('searchQuery').value = '';
    if (document.getElementById('gazetteTemplate')) document.getElementById('gazetteTemplate').value = 'template1';
    syncDropdowns();
    applyFiltersAndRender();
  }

  /* ---------------- Core Gazette Generator ---------------- */
  function applyFiltersAndRender() {
    const periodEl = document.getElementById('filterPeriod');
    const deptEl = document.getElementById('filterDept');
    const courseEl = document.getElementById('filterCourse');
    const termEl = document.getElementById('filterTerm');
    const semEl = document.getElementById('filterSem');
    const examTypeEl = document.getElementById('filterExamType');
    const examDateEl = document.getElementById('filterExamDate');
    const searchEl = document.getElementById('searchQuery');
    const perPageEl = document.getElementById('studentsPerPage');
    const templateEl = document.getElementById('gazetteTemplate');

    const period = periodEl ? periodEl.value : '';
    const dept = deptEl ? deptEl.value : '';
    const course = courseEl ? courseEl.value : '';
    const term = termEl ? termEl.value : '';
    const sem = semEl ? semEl.value : '';
    const examTypeFilter = examTypeEl ? examTypeEl.value : 'ALL';
    const examDate = examDateEl ? examDateEl.value : '';
    const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const studentsPerPageOpt = perPageEl ? perPageEl.value : '25';
    const templateType = templateEl ? templateEl.value : 'template1';

    const colMap = dataStore.getColMap();
    const pIdx = colMap['AcademicPeriod'];
    const dIdx = colMap['DepartmentCode'];
    const cIdx = colMap['CM_Course_Name'];
    const sIdx = colMap['Semester'];
    const tIdx = colMap['Term'];
    const eIdx = colMap['ExamYear'] !== undefined ? colMap['ExamYear'] : colMap['ExamDate'];
    const rIdx = colMap['StudentRollNo'];
    const nIdx = colMap['StudentName'] !== undefined ? colMap['StudentName'] : colMap['Student Full Name'];
    const resIdx = colMap['Result'];
    const attIdx = colMap['AttemptNo'];

    // If no course selected, show Programme Selection Dashboard while keeping core KPIs visible
    if (!course) {
      updateStatsBanner([]);
      const nb = document.getElementById('gazetteNavBar');
      if (nb) nb.style.display = 'none';
      renderCourseSelectionDashboard(period, dept);
      return;
    }

    // 1. Gather cohort rows
    let cohortRows = dataStore.getCohortRows(period, course, sem, term);
    cohortRows.sort((a,b) => (Number(a[attIdx])||1) - (Number(b[attIdx])||1));

    // 2. Build Candidate Appearances Map
    const appearancesMap = new Map();
    const subjectsMap = new Map();
    const studentHistory = new Map();

    cohortRows.forEach(row => {
      const roll = String(row[rIdx]);
      const att = Number(row[attIdx]) || 1;
      const subCode = String(row[colMap['SubjectCode']]);

      let rowTerm = (tIdx !== undefined && row[tIdx] !== null && row[tIdx] !== undefined) ? String(row[tIdx]).trim() : '';
      if (!rowTerm && row[sIdx]) {
        const sn = Number(row[sIdx]);
        if (!isNaN(sn) && sn > 0) {
          rowTerm = (sn % 2 !== 0) ? 'Term I' : 'Term II';
        }
      }
      if (rowTerm && dataStore.normalizeTerm) {
        rowTerm = dataStore.normalizeTerm(rowTerm);
      }

      const key = roll + '_att_' + att;
      if (!appearancesMap.has(key)) {
        appearancesMap.set(key, {
          roll,
          name: (nIdx !== undefined && row[nIdx]) ? String(row[nIdx]).trim() : '',
          period: row[pIdx],
          dept: row[dIdx],
          course: row[cIdx],
          term: rowTerm || (term ? (dataStore.normalizeTerm ? dataStore.normalizeTerm(term) : term) : 'Term I'),
          sem: row[sIdx],
          examDate: row[eIdx] || examDate,
          sgpa: row[colMap['SGPA']],
          cgpa: row[colMap['CGPA']],
          result: row[resIdx],
          attempt: att,
          isRegular: att === 1,
          examType: att === 1 ? 'Regular' : 'Backlog',
          subjects: {}
        });
      }

      const rec = appearancesMap.get(key);
      const markVal = dataStore.sanitizeMarkVal(row[colMap['Mark']]);
      const isCarriedForward = att > 1 && (markVal === null || markVal === '');

      const caThMax = Number(row[colMap['CA_Theory_Max']]) || 0;
      const caPrMax = Number(row[colMap['CA_Practical_Max']]) || 0;
      const eseThMax = Number(row[colMap['ESE_Theory_Max']]) || 0;
      const esePrMax = Number(row[colMap['ESE_Practical_Max']]) || 0;
      const iaMax = Number(row[colMap['IA_Max']]) || 0;
      const sumComponentMax = caThMax + caPrMax + eseThMax + esePrMax + iaMax;
      const rawMaxMk = Number(row[colMap['MaxMk']]);
      const resolvedMaxMk = sumComponentMax > 0 ? sumComponentMax : (!isNaN(rawMaxMk) && rawMaxMk > 0 ? rawMaxMk : 100);

      const caThMin = Number(row[colMap['CA_Theory_Min']]) || 0;
      const caPrMin = Number(row[colMap['CA_Practical_Min']]) || 0;
      const eseThMin = Number(row[colMap['ESE_Theory_Min']]) || 0;
      const esePrMin = Number(row[colMap['ESE_Practical_Min']]) || 0;
      const iaMin = Number(row[colMap['IA_Min']]) || 0;
      const sumComponentMin = caThMin + caPrMin + eseThMin + esePrMin + iaMin;
      const rawPassMk = Number(row[colMap['PassMk']]);
      const resolvedPassMk = sumComponentMin > 0 ? sumComponentMin : (!isNaN(rawPassMk) && rawPassMk > 0 ? rawPassMk : Math.round(resolvedMaxMk * 0.4));

      const egIdx = colMap['Elective_Group'];
      const egRaw = (egIdx !== undefined && row[egIdx] !== undefined && row[egIdx] !== null) ? String(row[egIdx]).trim() : '';
      const electiveGroup = (egRaw && egRaw !== 'NULL' && egRaw !== 'null') ? egRaw : '';

      rec.subjects[subCode] = {
        code: subCode,
        name: row[colMap['SM_Subject_Name']] || '',
        crTh: row[colMap['Credit_Alloted_Theory']],
        crPr: row[colMap['Credit_Alloted_Practical']],
        caTh: row[colMap['CA_Theory']],
        caPr: row[colMap['CA_Practical']],
        ia: row[colMap['IA_Marks']],
        eseTh: row[colMap['ESE_Theory']],
        esePr: row[colMap['ESE_Practical']],
        mark: markVal !== null ? markVal : '-',
        maxMk: resolvedMaxMk,
        passMk: resolvedPassMk,
        caThMax,
        caPrMax,
        eseThMax,
        esePrMax,
        iaMax,
        caThMin,
        caPrMin,
        eseThMin,
        esePrMin,
        iaMin,
        electiveGroup,
        grd: cleanGradeVal(row[colMap['Grd']]),
        thGrd: cleanGradeVal(row[colMap['Theory_Grade']]),
        prGrd: cleanGradeVal(row[colMap['Practical_Grade']]),
        result: row[colMap['FA_Rslt']] || row[colMap['Result']],
        isCarriedForward,
        attempt: att
      };

      if (!subjectsMap.has(subCode)) {
        subjectsMap.set(subCode, {
          code: subCode,
          name: row[colMap['SM_Subject_Name']] || '',
          crTh: row[colMap['Credit_Alloted_Theory']],
          crPr: row[colMap['Credit_Alloted_Practical']],
          isElective: false,
          groupCode: row[colMap['GrpCd']] || '',
          mgp: row[colMap['MGP']] || '',
          maxMk: resolvedMaxMk,
          passMk: resolvedPassMk,
          caThMax,
          caPrMax,
          iaMax,
          eseThMax,
          esePrMax,
          caThMin,
          caPrMin,
          iaMin,
          eseThMin,
          esePrMin,
          electiveGroup
        });
      }
    });

    let appearancesList = Array.from(appearancesMap.values());

    // Filter by Exam Type: Both (ALL), Regular (REGULAR), Backlog (BACKLOG)
    if (examTypeFilter === 'REGULAR') {
      appearancesList = appearancesList.filter(a => a.isRegular);
    } else if (examTypeFilter === 'BACKLOG') {
      appearancesList = appearancesList.filter(a => !a.isRegular);
    }

    // Search Query filter
    const studentNamesMap = commonUI.getStudentNamesMap();
    if (query) {
      appearancesList = appearancesList.filter(a => {
        const name = (a.name || studentNamesMap[a.roll] || '').toLowerCase();
        return a.roll.toLowerCase().includes(query) || name.includes(query);
      });
    }

    // Sort: Regular (Attempt 1) first, then Roll No
    appearancesList.sort((a,b) => {
      if (a.attempt !== b.attempt) return a.attempt - b.attempt;
      return String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true });
    });

    // 3. Detect Elective Groups (Multi-Group Support from Elective_Group Column)
    const allSubjectsList = Array.from(subjectsMap.values());
    const rollToSubCount = new Map();
    appearancesList.forEach(app => {
      Object.keys(app.subjects).forEach(sc => {
        rollToSubCount.set(sc, (rollToSubCount.get(sc) || 0) + 1);
      });
    });

    const totalStudents = appearancesList.length;
    const electiveGroupsMap = new Map(); // groupTitle -> Array<Subject>
    const coreSubjects = [];

    allSubjectsList.forEach(sub => {
      const appearanceCount = rollToSubCount.get(sub.code) || 0;
      const explicitEg = sub.electiveGroup;

      if (explicitEg) {
        // Tagged explicitly with Elective_Group (e.g. 'IDSC - II', 'Elective 1', 'Elective', etc.)
        sub.isElective = true;
        if (!electiveGroupsMap.has(explicitEg)) {
          electiveGroupsMap.set(explicitEg, []);
        }
        electiveGroupsMap.get(explicitEg).push(sub);
      } else if (totalStudents > 2 && appearanceCount < totalStudents * 0.70) {
        // Heuristic fallback for legacy records without explicit Elective_Group
        sub.isElective = true;
        const fallbackTitle = 'ELECTIVE / OPTIONAL';
        if (!electiveGroupsMap.has(fallbackTitle)) {
          electiveGroupsMap.set(fallbackTitle, []);
        }
        electiveGroupsMap.get(fallbackTitle).push(sub);
      } else {
        coreSubjects.push(sub);
      }
    });

    const displayColumns = [];
    electiveGroupsMap.forEach((subs, groupTitle) => {
      const s0 = subs[0] || {};
      const maxMk = computeSubjectMaxMarks(s0);
      displayColumns.push({
        type: 'elective',
        title: groupTitle,
        groupName: groupTitle,
        subjects: subs,
        maxMk: maxMk
      });
    });

    coreSubjects.forEach(sub => {
      sub.maxMk = computeSubjectMaxMarks(sub);
      displayColumns.push({
        type: 'core',
        subject: sub,
        maxMk: sub.maxMk
      });
    });

    // Prune NULL columns dynamically across the cohort ("all null then remove column")
    displayColumns.forEach(col => {
      col.activeSubCols = computeActiveSubColumns(col, appearancesList, templateType);
      col.colspan = col.activeSubCols.length;
    });

    cachedStudentsList = appearancesList;
    cachedDisplayColumns = displayColumns;

    // Filter cohort rows aligned with active students (candidate filter + search query)
    const activeStudentRolls = new Set(appearancesList.map(a => String(a.roll)));
    const filteredCohortRows = cohortRows.filter(r => activeStudentRolls.has(String(r[rIdx])));
    const filteredRowsCount = filteredCohortRows.length;

    // Update Stats Banner as per active filters
    updateStatsBanner(appearancesList, filteredRowsCount);

    // 4. Render Pages
    renderGazettePages(appearancesList, displayColumns, studentsPerPageOpt);
  }

  /* ---------------- Stats Banner ---------------- */
  function updateStatsBanner(students, filteredCohortRowCount) {
    const sb = document.getElementById('statsBanner');
    if (!sb) return;
    sb.style.display = 'flex';

    const periodEl = document.getElementById('filterPeriod');
    const deptEl = document.getElementById('filterDept');
    const courseEl = document.getElementById('filterCourse');
    const semEl = document.getElementById('filterSem');

    const period = periodEl ? periodEl.value : '';
    const dept = deptEl ? deptEl.value : '';
    const course = courseEl ? courseEl.value : '';
    const sem = semEl ? semEl.value : '';

    const rawRows = dataStore.getRawRows();
    const totalMasterRows = rawRows ? rawRows.length : 0;
    const totalMasterPrograms = dataStore.getFilteredDistinctValues('CM_Course_Name').length || 26;
    const totalMasterBatches = 80;

    let activeRowsCount = totalMasterRows;
    let activeProgramsCount = totalMasterPrograms;
    let activeBatchesCount = totalMasterBatches;
    let rowsSublabel = 'Master Database';
    let progsSublabel = 'Total Programmes';
    let batchesSublabel = 'Master Batches';

    const cache = dataStore.getDataCache ? dataStore.getDataCache() : null;
    const cohortRowsMap = (cache && cache.cohortRows) ? cache.cohortRows : null;

    if (course) {
      // Course is selected: strictly align with the current active cohort
      activeRowsCount = (filteredCohortRowCount !== undefined) 
        ? filteredCohortRowCount 
        : (students ? students.length : 0);
      rowsSublabel = 'Filtered Records';

      activeProgramsCount = 1;
      progsSublabel = 'Active Programme';

      if (sem) {
        activeBatchesCount = 1;
        batchesSublabel = 'Active Batch';
      } else {
        const sems = dataStore.getFilteredDistinctValues('Semester', { AcademicPeriod: period, CM_Course_Name: course });
        activeBatchesCount = sems.length || 1;
        batchesSublabel = 'Programme Batches';
      }
    } else if (dept || period) {
      // Department or Period filter active on dashboard
      const filteredProgs = dataStore.getFilteredDistinctValues('CM_Course_Name', { AcademicPeriod: period, DepartmentCode: dept });
      activeProgramsCount = filteredProgs.length;
      progsSublabel = dept ? 'Department Programmes' : 'Period Programmes';

      let rCount = 0;
      let bCount = 0;
      const progSet = new Set(filteredProgs);

      if (cohortRowsMap) {
        Object.keys(cohortRowsMap).forEach(key => {
          const parts = key.split('|');
          const p = parts[0];
          const c = parts[1];
          if (period && p !== period) return;
          if (dept && !progSet.has(c)) return;
          rCount += cohortRowsMap[key].length;
          bCount++;
        });
      }

      activeRowsCount = rCount || totalMasterRows;
      rowsSublabel = dept ? 'Department Records' : 'Period Records';
      activeBatchesCount = bCount || (filteredProgs.length * 2);
      batchesSublabel = dept ? 'Department Batches' : 'Period Batches';
    }

    // Update Compact Toolbar KPI Badges (Non-duplicated, Essential Metrics)
    const elKpiRows = document.getElementById('kpiRows');
    const elKpiRowsLbl = document.getElementById('kpiRowsLbl');
    if (elKpiRows) elKpiRows.innerText = activeRowsCount.toLocaleString();
    if (elKpiRowsLbl) elKpiRowsLbl.innerText = (course || dept || period) ? 'Records' : 'Total Records';

    const elKpiCohort = document.getElementById('kpiFilteredRecords');
    const elKpiPass = document.getElementById('kpiPass');
    const elKpiFail = document.getElementById('kpiFail');

    // Filter-wise stats
    if (!students || students.length === 0) {
      if (elKpiCohort) elKpiCohort.innerText = course ? '0' : '--';
      if (elKpiPass) elKpiPass.innerText = course ? '0' : '--';
      if (elKpiFail) elKpiFail.innerText = course ? '0' : '--';
      return;
    }

    let total = students.length;
    let regCount = 0;
    let bklgCount = 0;
    let passCount = 0;
    let failCount = 0;

    students.forEach(a => {
      if (a.isRegular) regCount++; else bklgCount++;
      const res = String(a.result || '').toUpperCase();
      if (res.includes('PASS')) passCount++; else failCount++;
    });

    if (elKpiCohort) elKpiCohort.innerText = total.toLocaleString();
    if (elKpiPass) elKpiPass.innerText = passCount.toLocaleString();
    if (elKpiFail) elKpiFail.innerText = failCount.toLocaleString();
  }

  /* ---------------- Robust Gazette Page Partitioning (With Orphan Prevention) ---------------- */
  function partitionGazettePages(students, perPageOpt) {
    if (!students || students.length === 0) return [];
    if (perPageOpt === 'ALL') return [students.slice()];

    const pageSize = parseInt(perPageOpt, 10) || 25;
    const pages = [];
    for (let i = 0; i < students.length; i += pageSize) {
      pages.push(students.slice(i, i + pageSize));
    }

    // Orphan Prevention (Keep-With-Next Logic):
    if (pages.length > 1) {
      const lastPage = pages[pages.length - 1];
      const prevPage = pages[pages.length - 2];

      if (lastPage.length < 2 && prevPage.length > 2) {
        // Carry over from prevPage to lastPage so lastPage has at least 2 records
        const countToMove = Math.min(2 - lastPage.length, Math.floor(prevPage.length / 2));
        const moved = prevPage.splice(prevPage.length - countToMove, countToMove);
        lastPage.unshift(...moved);
      } else if (lastPage.length === pageSize) {
        // If student records fill page completely, carry over last 2 records to final page
        // so statistics and signatures are accompanied by student data
        const moved = lastPage.splice(lastPage.length - 2, 2);
        pages.push(moved);
      }
    }

    return pages;
  }

  /* ---------------- Cohort Result Analysis Summary Calculator ---------------- */
  function computeResultAnalysisSummary(studentsList) {
    const totalEnrolled = studentsList.length;
    let totalAbsent = 0;
    let totalPassed = 0;

    studentsList.forEach(stud => {
      let isAbsent = false;
      const subList = Object.values(stud.subjects || {});
      if (subList.length > 0) {
        const allAb = subList.every(s => {
          const m = String(s.mark).trim().toUpperCase();
          const r = String(s.result).trim().toUpperCase();
          return m === 'AB' || m === 'ABSENT' || r === 'AB' || r === 'ABSENT';
        });
        if (allAb) isAbsent = true;
      }
      if (String(stud.result || '').trim().toUpperCase() === 'AB') isAbsent = true;

      if (isAbsent) {
        totalAbsent++;
      }

      const isPass = String(stud.result || '').toUpperCase().includes('PASS');
      if (isPass) {
        totalPassed++;
      }
    });

    const totalPresent = totalEnrolled - totalAbsent;
    const totalFailed = totalEnrolled - totalPassed;
    const passPct = totalEnrolled > 0 ? ((totalPassed / totalEnrolled) * 100).toFixed(2) : '0.00';
    const failPct = totalEnrolled > 0 ? ((totalFailed / totalEnrolled) * 100).toFixed(2) : '0.00';

    return {
      totalEnrolled,
      totalPresent,
      totalAbsent,
      totalPassed,
      totalFailed,
      passPct,
      failPct
    };
  }

  /* ---------------- Pagination & DOM Rendering ---------------- */
  function renderGazettePages(students, cols, perPageOpt) {
    const viewport = document.getElementById('gazetteViewport');
    if (!viewport) return;
    viewport.innerHTML = '';

    if (students.length === 0) {
      viewport.innerHTML = `
        <div style="background:var(--sspu-card-bg); border:1px solid var(--sspu-border); border-radius:12px; padding:60px 20px; text-align:center; max-width:600px; margin:40px auto; box-shadow:var(--shadow-sm);">
          <div style="font-size:36px; margin-bottom:12px;">📋</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:6px; color:var(--sspu-text);">No Student Records Found</h3>
          <p style="font-size:13px; color:#64748b;">No candidate appearances matched the chosen filters (Academic Period, Programme, Semester, or Exam Type).</p>
        </div>
      `;
      const nb = document.getElementById('gazetteNavBar');
      if (nb) nb.style.display = 'none';
      return;
    }

    currentGazettePages = partitionGazettePages(students, perPageOpt);
    currentGazettePageIndex = 0;

    const nb = document.getElementById('gazetteNavBar');
    if (nb) {
      nb.style.display = 'flex';
      updatePaginationControls();
    }

    if (isContinuousView) {
      renderAllPagesFullDOM();
    } else {
      renderActiveGazettePage();
    }
  }

  function renderActiveGazettePage() {
    const viewport = document.getElementById('gazetteViewport');
    if (!viewport || !currentGazettePages.length) return;
    viewport.innerHTML = '';

    const pIdx = currentGazettePageIndex;
    const pageStudents = currentGazettePages[pIdx];
    const totalPages = currentGazettePages.length;
    let startSr = 1;
    for (let i = 0; i < pIdx; i++) {
      startSr += currentGazettePages[i].length;
    }

    const pageEl = buildSingleGazettePageElement(pageStudents, cachedDisplayColumns, pIdx + 1, totalPages, startSr);
    viewport.appendChild(pageEl);

    updatePaginationControls();
  }

  function renderAllPagesFullDOM() {
    const viewport = document.getElementById('gazetteViewport');
    if (!viewport || !currentGazettePages.length) return;
    viewport.innerHTML = '';

    const totalPages = currentGazettePages.length;
    let runningSr = 1;

    currentGazettePages.forEach((pageStudents, idx) => {
      const pageEl = buildSingleGazettePageElement(pageStudents, cachedDisplayColumns, idx + 1, totalPages, runningSr);
      viewport.appendChild(pageEl);
      runningSr += pageStudents.length;
    });

    updatePaginationControls();
  }

  function updatePaginationControls() {
    const curEl = document.getElementById('currentPageNumber');
    const totEl = document.getElementById('totalPagesCount');
    const rangeEl = document.getElementById('pageRecordRange');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    const jumpInput = document.getElementById('jumpPageInput');

    const totalPages = currentGazettePages.length;
    const curPage = currentGazettePageIndex + 1;

    if (curEl) curEl.innerText = curPage;
    if (totEl) totEl.innerText = totalPages;
    if (jumpInput) {
      jumpInput.value = curPage;
      jumpInput.max = totalPages;
    }

    if (prevBtn) prevBtn.disabled = (currentGazettePageIndex === 0);
    if (nextBtn) nextBtn.disabled = (currentGazettePageIndex >= totalPages - 1);

    if (rangeEl && currentGazettePages[currentGazettePageIndex]) {
      const pStudents = currentGazettePages[currentGazettePageIndex];
      let start = 1;
      for (let i = 0; i < currentGazettePageIndex; i++) {
        start += currentGazettePages[i].length;
      }
      const end = start + pStudents.length - 1;
      rangeEl.innerText = `Showing Records ${start} - ${end} of ${cachedStudentsList.length}`;
    }
  }

  function onSdSignToggle() {
    if (isContinuousView) {
      renderAllPagesFullDOM();
    } else {
      renderActiveGazettePage();
    }
  }

  function changeGazettePage(direction) {
    const newIdx = currentGazettePageIndex + direction;
    if (newIdx >= 0 && newIdx < currentGazettePages.length) {
      currentGazettePageIndex = newIdx;
      renderActiveGazettePage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function jumpToGazettePage(pageNo) {
    const p = parseInt(pageNo, 10) - 1;
    if (p >= 0 && p < currentGazettePages.length) {
      currentGazettePageIndex = p;
      renderActiveGazettePage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function toggleContinuousPages() {
    isContinuousView = !isContinuousView;
    const btn = document.getElementById('btnToggleContinuous');
    if (btn) {
      btn.innerText = isContinuousView ? '📄 Single Page Mode' : '📜 Continuous Pages';
      btn.classList.toggle('active', isContinuousView);
    }
    if (isContinuousView) {
      renderAllPagesFullDOM();
    } else {
      renderActiveGazettePage();
    }
  }

  /* ---------------- Single Gazette Page DOM Builder ---------------- */
  function buildSingleGazettePageElement(students, cols, pageNum, totalPages, startSr) {
    const templateType = (document.getElementById('gazetteTemplate')?.value) || 'template1';
    const perPageVal = (document.getElementById('studentsPerPage')?.value) || '25';
    const densityClass = perPageVal === '30' ? 'gazette-page-density-30' : (perPageVal === '35' ? 'gazette-page-density-35' : 'gazette-page-density-25');
    const pageDiv = document.createElement('div');
    pageDiv.className = `gazette-page ${templateType === 'template2' ? 'gazette-template-2' : 'gazette-template-1'} ${densityClass}`;
    pageDiv.id = `gazettePage_${pageNum}`;

    const sample = students[0] || {};
    const period = sample.period || (document.getElementById('filterPeriod') ? document.getElementById('filterPeriod').value : '') || '2024-2025';
    const course = sample.course || (document.getElementById('filterCourse') ? document.getElementById('filterCourse').value : '') || '';
    const semRaw = sample.sem || (document.getElementById('filterSem') ? document.getElementById('filterSem').value : '') || '1';
    const cleanSemNum = String(semRaw || '1').replace(/[^0-9]/g, '').trim() || String(semRaw || '1').trim();
    let semText = String(semRaw).trim();
    if (!semText.toLowerCase().startsWith('sem')) {
      semText = `Semester ${semText}`;
    }

    const activeCourse = course || (document.getElementById('filterCourse') ? document.getElementById('filterCourse').value : '');
    const courseToDeptMap = (typeof dataStore !== 'undefined' && dataStore.getCourseToDeptMap) ? dataStore.getCourseToDeptMap() : {};
    const dept = sample.dept || (document.getElementById('filterDept') ? document.getElementById('filterDept').value : '') || courseToDeptMap[activeCourse] || 'School of Data Science';

    const rawExamDate = sample.examDate || (document.getElementById('filterExamDate') ? document.getElementById('filterExamDate').value : '');
    let examSession = (typeof dataStore !== 'undefined' && dataStore.formatExamSession) 
      ? dataStore.formatExamSession(rawExamDate, period, semRaw)
      : 'NOVEMBER 2024';
    examSession = String(examSession).replace(/\bEXAMINATIONS\b/gi, '').replace(/\s+/g, ' ').trim();

    const examTypeFilter = document.getElementById('filterExamType') ? document.getElementById('filterExamType').value : 'ALL';
    const termEl = document.getElementById('filterTerm');
    const selectedTerm = termEl ? termEl.value : '';
    let activeTerm = selectedTerm || sample.term || '';
    if (!activeTerm && semRaw) {
      const sNum = parseInt(semRaw, 10);
      if (!isNaN(sNum) && sNum > 0) {
        activeTerm = (sNum % 2 !== 0) ? 'Term I' : 'Term II';
      }
    }
    if (activeTerm && typeof dataStore !== 'undefined' && dataStore.normalizeTerm) {
      activeTerm = dataStore.normalizeTerm(activeTerm);
    }

    const declDate = sample.declarationDate || sample.declDate || sample.resultDate || (typeof dataStore !== 'undefined' && dataStore.getDeclarationDate ? dataStore.getDeclarationDate() : '') || '';

    let examCategoryText = 'Regular';
    if (examTypeFilter === 'BACKLOG') examCategoryText = 'Backlog';
    else if (examTypeFilter === 'ALL') {
      const allBacklog = students.length > 0 && students.every(s => !s.isRegular);
      examCategoryText = allBacklog ? 'Backlog' : 'Regular';
    }

    let headingTitle = 'TABULATION REGISTER / RESULT GAZETTE (REGULAR EXAMINATION)';
    if (examTypeFilter === 'BACKLOG') {
      headingTitle = 'TABULATION REGISTER / RESULT GAZETTE (BACKLOG EXAMINATION)';
    } else if (examTypeFilter === 'ALL') {
      const allBacklog = students.length > 0 && students.every(s => !s.isRegular);
      headingTitle = allBacklog 
        ? 'TABULATION REGISTER / RESULT GAZETTE (BACKLOG EXAMINATION)'
        : 'TABULATION REGISTER / RESULT GAZETTE (REGULAR EXAMINATION)';
    }

    const cleanPeriod = (period && String(period).trim() && String(period).trim().toUpperCase() !== 'ALL') ? String(period).trim() : '';

    if (cleanPeriod && activeTerm) {
      headingTitle += ` : ${cleanPeriod} (${activeTerm})`;
    } else if (cleanPeriod) {
      headingTitle += ` : ${cleanPeriod}`;
    } else if (activeTerm) {
      headingTitle += ` (${activeTerm})`;
    }

    // Header HTML: Centered University Title Block, Watermark Seal Circle & Structured Metadata Table
    let html = `
      <div class="gazette-header-block">
        <div class="univ-header-top">
          <div class="univ-logo-wrap">
            <img src="../symbioais logo.jpeg" alt="SSPU Logo" class="univ-logo-img" onerror="this.src='symbioais logo.jpeg';">
          </div>
          <div class="univ-title-center">
            <h1 class="univ-title">SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY</h1>
            <div class="univ-sub">A STATE PRIVATE UNIVERSITY ENACTED BY GOVT. OF MAHARASHTRA ACT NO. XXXVII OF 2017</div>
            <div class="univ-gazette-title">${escapeHtml(headingTitle)}</div>
          </div>
          <div class="univ-seal-wrap">
            <div class="univ-seal-watermark" title="Seal">
              <div class="seal-watermark-inner">
                <span class="seal-watermark-text">Seal</span>
              </div>
            </div>
          </div>
        </div>

        <table class="gazette-meta-table">
          <tbody>
            <tr>
              <th class="meta-lbl" style="width: 10%;">School / Dept:</th>
              <td class="meta-val" style="width: 24%; font-weight: 600;">${escapeHtml(dept)}</td>
              <th class="meta-lbl" style="width: 9%;">Programme:</th>
              <td class="meta-val font-bold" style="width: 24%; color: var(--sspu-navy);">${escapeHtml(course)}</td>
              <th class="meta-lbl" style="width: 9%;">Semester:</th>
              <td class="meta-val font-bold" style="width: 24%;">${escapeHtml(cleanSemNum)}</td>
            </tr>
            <tr>
              <th class="meta-lbl">Examination:</th>
              <td class="meta-val font-bold">${escapeHtml(examSession)}</td>
              <th class="meta-lbl">Exam Category:</th>
              <td class="meta-val font-bold" style="color: var(--sspu-navy);">${examCategoryText}</td>
              <th class="meta-lbl">Declaration Date:</th>
              <td class="meta-val">${escapeHtml(declDate)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    // Matrix Table HTML
    html += buildMatrixTableHtml(students, cols, startSr, templateType);

    // Result Analysis Summary Block (Immediately following final student records on last page)
    if (pageNum === totalPages && cachedStudentsList.length > 0) {
      const summary = computeResultAnalysisSummary(cachedStudentsList);
      html += `
        <div class="result-analysis-summary-block">
          <div class="summary-block-header">
            <span class="summary-block-title">Result Analysis Summary</span>
          </div>
          <table class="analysis-summary-table">
            <thead>
              <tr>
                <th>Total Enrolled Students</th>
                <th>Total Present Students</th>
                <th>Total Absent Students</th>
                <th>Total Passed Students</th>
                <th>Total Failed Students</th>
                <th>Passing Percentage (%)</th>
                <th>Failing Percentage (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${summary.totalEnrolled}</td>
                <td>${summary.totalPresent}</td>
                <td>${summary.totalAbsent}</td>
                <td class="stat-pass"><b>${summary.totalPassed}</b></td>
                <td class="stat-fail"><b>${summary.totalFailed}</b></td>
                <td class="stat-pass"><b>${summary.passPct}%</b></td>
                <td class="stat-fail"><b>${summary.failPct}%</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    // Running Footer & Signatures (Sd/- Digital vs Manual Blank Line)
    const sdCheckbox = document.getElementById('toggleSdSign');
    const isSdSigned = sdCheckbox ? sdCheckbox.checked : true;
    const isLastPage = (pageNum === totalPages);

    let signaturesHtml = '';
    if (!isLastPage) {
      // Intermediate pages: Two signatures (Prepared By and Verified By)
      signaturesHtml = `
        <div class="signatures-row signatures-two-tier">
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Prepared By:</strong><br>
              <span class="sig-desig">Exam Coordinator</span>
            </div>
          </div>
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Verified By:</strong><br>
              <span class="sig-desig">Assistant Controller of Examinations / Sr. Exam Coordinator</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // Final page: Full 4-tier approval layout
      signaturesHtml = `
        <div class="signatures-row signatures-four-tier">
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Prepared By:</strong><br>
              <span class="sig-desig">Exam Coordinator</span>
            </div>
          </div>
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Verified By:</strong><br>
              <span class="sig-desig">Assistant Controller of Examinations / Sr. Exam Coordinator</span>
            </div>
          </div>
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Reviewed By:</strong><br>
              <span class="sig-desig">Deputy Controller of Examinations (SSPU - Exam)</span>
            </div>
          </div>
          <div class="sig-block">
            ${isSdSigned ? '<div class="sig-val-sd">Sd/-</div>' : '<div class="sig-line"></div>'}
            <div class="sig-label">
              <strong>Approved By:</strong><br>
              <span class="sig-desig">Controller of Examinations (SSPU - Exam)</span>
            </div>
          </div>
        </div>
      `;
    }

    const legendsText = templateType === 'template2'
      ? '<b>Legends:</b> CAT: Continuous Assessment Theory | CAP: Continuous Assessment Practical | IA: Industry Assessment | EST: End Semester Theory | ESP: End Semester Practical | Tot: Total Marks | Th: Theory | Pr: Practical | AB: Absent | <b>Bold Red</b>: Failed component<br>'
      : '<b>Legends:</b> CA: Continuous Assessment | IA: Industry Assessment | ESE: End Semester Exam | Tot: Total Marks | Th: Theory | Pr: Practical | AB: Absent | <b>Bold Red</b>: Failed component<br>';

    html += `
      <div class="gazette-footer">
        <div class="footer-note">
          ${legendsText}
          - Denotes Carried Forward / Earlier Passed Marks. Official Tabulation Register certified by Controller of Examinations, Symbiosis Skills and Professional University.
        </div>
        ${signaturesHtml}
        <div class="page-num-strip">
          <span class="footer-univ-tag">Symbiosis Skills and Professional University</span>
          <span class="sheet-page-bottom"><b>SHEET PAGE:</b> Page <b>${pageNum}</b> of <b>${totalPages}</b></span>
        </div>
      </div>
    `;

    pageDiv.innerHTML = html;
    return pageDiv;
  }

  /* ---------------- Gazette Matrix HTML Generator ---------------- */
  function buildMatrixTableHtml(students, cols, startSr, templateType = 'template1') {
    const studentNamesMap = commonUI.getStudentNamesMap();
    let html = '<div class="matrix-table-wrap"><table class="gazette-matrix">';

    // Define column group to enforce explicit widths in fixed table layout
    html += '<colgroup>';
    html += '<col class="col-sr">';
    html += '<col class="col-roll">';
    html += '<col class="col-name">';

    cols.forEach(col => {
      const subCols = col.activeSubCols || (templateType === 'template2' ? [
        { id: 'cat', thClass: 'subcol-comp' },
        { id: 'cap', thClass: 'subcol-comp' },
        { id: 'est', thClass: 'subcol-comp' },
        { id: 'esp', thClass: 'subcol-comp' },
        { id: 'ia', thClass: 'subcol-comp' },
        { id: 'tot', thClass: 'subcol-tot' },
        { id: 'thGrd', thClass: 'subcol-grd' },
        { id: 'prGrd', thClass: 'subcol-grd' }
      ] : [
        { id: 'ca', thClass: 'subcol-comp' },
        { id: 'ese', thClass: 'subcol-comp' },
        { id: 'ia', thClass: 'subcol-comp' },
        { id: 'tot', thClass: 'subcol-tot' },
        { id: 'thGrd', thClass: 'subcol-grd' },
        { id: 'prGrd', thClass: 'subcol-grd' },
        { id: 'grd', thClass: 'subcol-grd' }
      ]);

      subCols.forEach(sc => {
        if (sc.id === 'electiveCourse') {
          html += '<col class="col-elective-course">';
        } else if (sc.id === 'tot') {
          html += '<col class="col-tot">';
        } else if (sc.id === 'thGrd' || sc.id === 'prGrd' || sc.id === 'grd') {
          html += '<col class="col-grd">';
        } else {
          html += '<col class="col-comp">';
        }
      });
    });

    // Compute modal registered credits across the cohort
    const allStudsForCohort = (Array.isArray(cachedStudentsList) && cachedStudentsList.length > 0) ? cachedStudentsList : students;
    const regCrFreq = {};
    let cohortModalRegCr = 0;
    let maxFreq = 0;
    allStudsForCohort.forEach(s => {
      let rCr = 0;
      Object.values(s.subjects || {}).forEach(subRec => {
        let cr = (Number(subRec.crTh) || 0) + (Number(subRec.crPr) || 0);
        if (cr === 0) cr = 4;
        rCr += cr;
      });
      if (rCr > 0) {
        regCrFreq[rCr] = (regCrFreq[rCr] || 0) + 1;
        if (regCrFreq[rCr] > maxFreq) {
          maxFreq = regCrFreq[rCr];
          cohortModalRegCr = rCr;
        }
      }
    });

    html += '<col class="col-credits">';
    html += '<col class="col-sgpa">';
    html += '<col class="col-cgpa">';
    html += '<col class="col-res">';
    html += '</colgroup><thead>';

    // Header Row 1: Candidate Meta + Subject Title Blocks
    html += '<tr class="subject-head-row">';
    html += '<th class="col-sr" rowspan="2">SR</th>';
    html += '<th class="col-roll" rowspan="2">STUDENT PRN</th>';
    html += '<th class="col-name" rowspan="2">STUDENT NAME</th>';

    cols.forEach(col => {
      const colspan = (col.activeSubCols && col.activeSubCols.length) || 7;
      const isNarrow = colspan <= 3;
      const narrowClass = isNarrow ? 'th-narrow' : '';

      if (col.type === 'elective') {
        const s0 = (col.subjects && col.subjects[0]) || {};
        const maxMk = col.maxMk || computeSubjectMaxMarks(s0);
        const crStr = formatSubjectCredits(s0, true);
        const groupTitle = escapeHtml(col.groupName || col.title || 'ELECTIVE / OPTIONAL');
        html += `<th colspan="${colspan}" class="th-subject elective-th ${narrowClass}">
          <div class="th-sub-name elective-title">${groupTitle}</div>
          <div class="th-sub-code elective-code">${col.subjects.length} OFFERINGS</div>
          <div class="th-sub-credits elective-cr" title="Elective Group: ${groupTitle} (${col.subjects.length} Offerings Available) | Maximum Marks: ${escapeHtml(maxMk)} | Credits: ${crStr}">
            <span class="sub-cr-max">M: ${escapeHtml(maxMk)}</span>
            <span class="sub-cr-div">|</span>
            <span class="sub-cr-val">${crStr}</span>
          </div>
        </th>`;
      } else {
        const sub = col.subject;
        const maxMk = col.maxMk || computeSubjectMaxMarks(sub);
        const crStr = formatSubjectCredits(sub, false);
        html += `<th colspan="${colspan}" class="th-subject ${narrowClass}">
          <div class="th-sub-name" title="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</div>
          <div class="th-sub-code">${escapeHtml(sub.code)}</div>
          <div class="th-sub-credits" title="Maximum Marks: ${escapeHtml(maxMk)} | Credits Breakdown (Theory + Practical): ${crStr}">
            <span class="sub-cr-max">M: ${escapeHtml(maxMk)}</span>
            <span class="sub-cr-div">|</span>
            <span class="sub-cr-val">${crStr}</span>
          </div>
        </th>`;
      }
    });

    const crHdrTitle = cohortModalRegCr > 0 ? `Total Credits (Registered: ${cohortModalRegCr})` : 'Total Credits (Earned / Registered)';
    const crHdrText = cohortModalRegCr > 0 ? `Cr (${cohortModalRegCr})` : 'Cr';
    html += `<th class="col-credits" rowspan="2" title="${crHdrTitle}">${crHdrText}</th>`;
    html += '<th class="col-sgpa" rowspan="2" title="Semester Grade Point Average"><div class="vert-hdr"><span>S</span><span>G</span><span>P</span><span>A</span></div></th>';
    html += '<th class="col-cgpa" rowspan="2" title="Cumulative Grade Point Average"><div class="vert-hdr"><span>C</span><span>G</span><span>P</span><span>A</span></div></th>';
    html += '<th class="col-res" rowspan="2">RESULT</th>';
    html += '</tr>';

    // Header Row 2: Sub-columns per subject (Auto-pruned of all-null columns)
    html += '<tr class="subcol-row">';
    cols.forEach(col => {
      const subCols = col.activeSubCols || (templateType === 'template2' ? [
        { id: 'cat', label: '<div class="vert-hdr"><span>C</span><span>A</span><span>T</span></div>', thClass: 'subcol-comp' },
        { id: 'cap', label: '<div class="vert-hdr"><span>C</span><span>A</span><span>P</span></div>', thClass: 'subcol-comp' },
        { id: 'est', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>T</span></div>', thClass: 'subcol-comp' },
        { id: 'esp', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>P</span></div>', thClass: 'subcol-comp' },
        { id: 'ia', label: '<div class="vert-hdr"><span>I</span><span>A</span></div>', thClass: 'subcol-comp' },
        { id: 'tot', label: 'Tot', thClass: 'subcol-tot' },
        { id: 'thGrd', label: 'Th<br>Grd', thClass: 'subcol-grd' },
        { id: 'prGrd', label: 'Pr<br>Grd', thClass: 'subcol-grd' }
      ] : [
        { id: 'ca', label: '<div class="vert-hdr"><span>C</span><span>A</span></div>', thClass: 'subcol-comp' },
        { id: 'ese', label: '<div class="vert-hdr"><span>E</span><span>S</span><span>E</span></div>', thClass: 'subcol-comp' },
        { id: 'ia', label: '<div class="vert-hdr"><span>I</span><span>A</span></div>', thClass: 'subcol-comp' },
        { id: 'tot', label: 'Tot', thClass: 'subcol-tot' },
        { id: 'thGrd', label: 'Th<br>Grd', thClass: 'subcol-grd' },
        { id: 'prGrd', label: 'Pr<br>Grd', thClass: 'subcol-grd' },
        { id: 'grd', label: 'Grd', thClass: 'subcol-grd' }
      ]);
      subCols.forEach(sc => {
        html += `<th class="${sc.thClass}">${sc.label}</th>`;
      });
    });
    html += '</tr></thead>';

    // Body: Students (Strict 26px uniform row height)
    html += '<tbody>';
    students.forEach((stud, idx) => {
      const sr = startSr + idx;
      const roll = stud.roll;
      const displayName = stud.name || studentNamesMap[roll] || '';
      const isPass = String(stud.result || '').toUpperCase().includes('PASS');

      // PRN Cell: Clean roll for regular students, badge for backlog students
      const examBadge = (!stud.isRegular || stud.attempt > 1) 
        ? `<br><span class="badge-backlog" style="font-size:5.8pt; padding:1px 4px; margin-top:2px; display:inline-block;">Backlog (Att ${stud.attempt})</span>` 
        : '';

      html += '<tr>';
      html += `<td class="col-sr">${sr}</td>`;
      html += `<td class="col-roll">${escapeHtml(roll)}${examBadge}</td>`;
      
      // Editable Student Name Column
      html += `<td class="col-name student-name-cell" onclick="gazetteApp.editStudentName('${escapeAttr(roll)}', this)">
        <span class="name-display" id="name_${escapeHtml(roll)}">${displayName ? escapeHtml(displayName) : '<span style="color:#a0aec0; font-style:italic;">Click to add name</span>'}</span>
      </td>`;

      // Subject Columns (Aligned with activeSubCols)
      cols.forEach(col => {
        const subCols = col.activeSubCols || (templateType === 'template2' ? [
          { id: 'cat', tdClass: 'col-comp' },
          { id: 'cap', tdClass: 'col-comp' },
          { id: 'est', tdClass: 'col-comp' },
          { id: 'esp', tdClass: 'col-comp' },
          { id: 'ia', tdClass: 'col-comp' },
          { id: 'tot', tdClass: 'col-tot' },
          { id: 'thGrd', tdClass: 'col-grd' },
          { id: 'prGrd', tdClass: 'col-grd' }
        ] : [
          { id: 'ca', tdClass: 'col-comp' },
          { id: 'ese', tdClass: 'col-comp' },
          { id: 'ia', tdClass: 'col-comp' },
          { id: 'tot', tdClass: 'col-tot' },
          { id: 'thGrd', tdClass: 'col-grd' },
          { id: 'prGrd', tdClass: 'col-grd' },
          { id: 'grd', tdClass: 'col-grd' }
        ]);

        let chosenRec = null;
        let passMk = 40;
        if (col.type === 'elective') {
          for (let s of col.subjects) {
            if (stud.subjects && stud.subjects[s.code]) {
              chosenRec = stud.subjects[s.code];
              if (!chosenRec.code) chosenRec.code = s.code;
              if (!chosenRec.name) chosenRec.name = s.name;
              passMk = s.passMk || 40;
              break;
            }
          }
        } else if (col.subject) {
          chosenRec = stud.subjects && stud.subjects[col.subject.code];
          passMk = col.subject.passMk || 40;
        }

        if (chosenRec) {
          const caTotal = (Number(chosenRec.caTh) || 0) + (Number(chosenRec.caPr) || 0);
          const eseTotal = (Number(chosenRec.eseTh) || 0) + (Number(chosenRec.esePr) || 0);
          const markNum = Number(chosenRec.mark);
          const isSubFail = String(chosenRec.result || '').toUpperCase() === 'FAIL' || 
            (!isNaN(markNum) && passMk && markNum < passMk) || 
            cleanGradeVal(chosenRec.grd).toUpperCase() === 'F' ||
            cleanGradeVal(chosenRec.thGrd).toUpperCase() === 'F' ||
            cleanGradeVal(chosenRec.prGrd).toUpperCase() === 'F';

          subCols.forEach(sc => {
            if (sc.id === 'electiveCourse') {
              const code = chosenRec.code || '';
              const name = chosenRec.name || '';
              const titleText = name ? `${code} - ${name}` : code;
              const displayText = name ? `${code} - ${name}` : (code ? code : '-');
              html += `<td class="${sc.tdClass}" title="${escapeHtml(titleText)}"><div class="elective-course-cell">${escapeHtml(displayText)}</div></td>`;
            } else if (sc.id === 'cat') {
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(chosenRec.caTh)}</td>`;
            } else if (sc.id === 'cap') {
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(chosenRec.caPr)}</td>`;
            } else if (sc.id === 'ca') {
              const val = caTotal > 0 ? caTotal : chosenRec.caTh;
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(val)}</td>`;
            } else if (sc.id === 'est') {
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(chosenRec.eseTh)}</td>`;
            } else if (sc.id === 'esp') {
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(chosenRec.esePr)}</td>`;
            } else if (sc.id === 'ese') {
              const val = eseTotal > 0 ? eseTotal : chosenRec.eseTh;
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(val)}</td>`;
            } else if (sc.id === 'ia') {
              html += `<td class="${sc.tdClass}">${dataStore.formatSingleMark(chosenRec.ia)}</td>`;
            } else if (sc.id === 'tot') {
              html += `<td class="${sc.tdClass} ${isSubFail ? 'fail-mark' : ''}">${chosenRec.mark ? escapeHtml(chosenRec.mark) : '-'}</td>`;
            } else if (sc.id === 'thGrd') {
              const g = cleanGradeVal(chosenRec.thGrd);
              const isFail = g.toUpperCase() === 'F' || g.toUpperCase().startsWith('F*') || g.toUpperCase() === 'FAIL';
              html += `<td class="${sc.tdClass} ${isFail ? 'fail-mark grade-f' : ''}">${isFail ? `<span class="badge-grade-f">${escapeHtml(g)}</span>` : (escapeHtml(g) || '-')}</td>`;
            } else if (sc.id === 'prGrd') {
              const g = cleanGradeVal(chosenRec.prGrd);
              const isFail = g.toUpperCase() === 'F' || g.toUpperCase().startsWith('F*') || g.toUpperCase() === 'FAIL';
              html += `<td class="${sc.tdClass} ${isFail ? 'fail-mark grade-f' : ''}">${isFail ? `<span class="badge-grade-f">${escapeHtml(g)}</span>` : (escapeHtml(g) || '-')}</td>`;
            } else if (sc.id === 'grd') {
              const g = cleanGradeVal(chosenRec.grd);
              const isFail = g.toUpperCase() === 'F' || g.toUpperCase().startsWith('F*') || g.toUpperCase() === 'FAIL';
              html += `<td class="${sc.tdClass} ${isFail ? 'fail-mark grade-f' : ''}">${isFail ? `<span class="badge-grade-f">${escapeHtml(g)}</span>` : (escapeHtml(g) || '-')}</td>`;
            }
          });
        } else {
          subCols.forEach(sc => {
            html += `<td class="${sc.tdClass}" style="color:#cbd5e1;">-</td>`;
          });
        }
      });

      // Compute Credits: Earned / Registered
      let regCr = 0;
      let earnCr = 0;
      Object.values(stud.subjects || {}).forEach(subRec => {
        let cr = (Number(subRec.crTh) || 0) + (Number(subRec.crPr) || 0);
        if (cr === 0) cr = 4;
        regCr += cr;
        const isSubPass = String(subRec.result || '').toUpperCase() === 'PASS' && 
          cleanGradeVal(subRec.grd) !== 'F' &&
          cleanGradeVal(subRec.thGrd) !== 'F' &&
          cleanGradeVal(subRec.prGrd) !== 'F';
        if (isSubPass) {
          earnCr += cr;
        }
      });
      let creditsDisplay = '-';
      if (regCr > 0) {
        if (cohortModalRegCr > 0 && regCr === cohortModalRegCr) {
          creditsDisplay = `${earnCr}`;
        } else {
          creditsDisplay = `${earnCr}|${regCr}`;
        }
      }

      // SGPA, CGPA, Result
      const sg = Number(stud.sgpa);
      const cg = Number(stud.cgpa);
      html += `<td class="col-credits">${creditsDisplay}</td>`;
      html += `<td class="col-sgpa">${(!isNaN(sg) && sg >= 0) ? sg.toFixed(2) : '-'}</td>`;
      html += `<td class="col-cgpa">${(!isNaN(cg) && cg >= 0) ? cg.toFixed(2) : '-'}</td>`;
      html += `<td class="col-res"><span class="${isPass ? 'badge-pass' : 'badge-fail'}">${isPass ? 'PASS' : 'FAIL'}</span></td>`;
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    return html;
  }

  /* ---------------- Inline Name Editing ---------------- */
  function editStudentName(roll, cellEl) {
    const displaySpan = cellEl.querySelector('.name-display');
    const existing = displaySpan ? displaySpan.innerText.trim() : '';
    const cleanExisting = (existing === 'Click to add name') ? '' : existing;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = cleanExisting;
    input.className = 'name-inline-input';
    input.style.width = '100%';
    input.style.padding = '2px 4px';
    input.style.fontSize = '7.5pt';
    input.style.fontFamily = 'inherit';

    cellEl.innerHTML = '';
    cellEl.appendChild(input);
    input.focus();
    input.select();

    input.onblur = function() {
      finishEdit(roll, cellEl, input.value);
    };
    input.onkeydown = function(e) {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        cellEl.innerHTML = `<span class="name-display" id="name_${escapeHtml(roll)}">${cleanExisting ? escapeHtml(cleanExisting) : '<span style="color:#a0aec0; font-style:italic;">Click to add name</span>'}</span>`;
      }
    };
  }

  function finishEdit(roll, cellEl, newName) {
    const trimmed = (newName || '').trim();
    commonUI.saveStudentName(roll, trimmed);
    cellEl.innerHTML = `<span class="name-display" id="name_${escapeHtml(roll)}">${trimmed ? escapeHtml(trimmed) : '<span style="color:#a0aec0; font-style:italic;">Click to add name</span>'}</span>`;
    commonUI.showToast(`Saved name for PRN ${roll}`, 'success');
  }

  /* ---------------- Course Selection Dashboard ---------------- */
  function renderCourseSelectionDashboard(period, dept) {
    const viewport = document.getElementById('gazetteViewport');
    if (!viewport) return;

    const courses = dataStore.getFilteredDistinctValues('CM_Course_Name', {
      AcademicPeriod: period,
      DepartmentCode: dept
    });

    if (courses.length === 0) {
      viewport.innerHTML = `
        <div style="background:var(--sspu-card-bg); border:1px solid var(--sspu-border); border-radius:12px; padding:60px 20px; text-align:center; max-width:600px; margin:40px auto; box-shadow:var(--shadow-sm);">
          <div style="font-size:36px; margin-bottom:12px;">🔍</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:6px; color:var(--sspu-text);">No Programmes Available</h3>
          <p style="font-size:13px; color:#64748b;">No courses were found matching the selected period and school.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="max-width:1200px; margin:30px auto; padding:0 16px;">
        <div style="margin-bottom:24px; text-align:center;">
          <h2 style="font-size:22px; font-weight:800; color:var(--sspu-navy); margin-bottom:6px;">Select a Programme to Generate Gazette</h2>
          <p style="font-size:13.5px; color:#64748b;">Choose any examination programme below to load the full Tabulation Register with exact A3 landscape styling.</p>
        </div>
        <div class="course-dashboard-grid">
    `;

    courses.forEach(c => {
      const sems = dataStore.getFilteredDistinctValues('Semester', {
        AcademicPeriod: period,
        CM_Course_Name: c
      });
      html += `
        <div class="course-dash-card" onclick="gazetteApp.pickCourseQuick('${escapeAttr(c)}')">
          <div class="course-dash-icon">🎓</div>
          <div class="course-dash-title">${escapeHtml(c)}</div>
          <div class="course-dash-meta">
            <span>Available Semesters: <b>${escapeHtml(sems.join(', '))}</b></span>
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:14px; width:100%;">Open Result Gazette &rarr;</button>
        </div>
      `;
    });

    html += '</div></div>';
    viewport.innerHTML = html;
  }

  /* ---------------- Print Action ---------------- */
  function handlePrintAction() {
    renderAllPagesFullDOM();
    setTimeout(() => {
      window.print();
    }, 400);
  }

  // Native Browser Print Listeners (Handles Ctrl+P and Browser Print Menu)
  window.addEventListener('beforeprint', () => {
    renderAllPagesFullDOM();
  });
  window.addEventListener('afterprint', () => {
    if (!isContinuousView) {
      renderActiveGazettePage();
    }
  });

  /* ---------------- Excel Export ---------------- */
  function exportToExcel() {
    if (!cachedStudentsList || cachedStudentsList.length === 0) {
      alert('No student records to export.');
      return;
    }

    const tmpl = document.getElementById('gazetteTemplate')?.value || 'template1';
    const studentNamesMap = commonUI.getStudentNamesMap();
    const headers = ['SR', 'PRN', 'Student Name', 'Period', 'Course', 'Term', 'Semester', 'Exam Type'];

    // Dynamic Subject Columns aligned with Active Sub-columns
    cachedDisplayColumns.forEach(col => {
      const subTitle = col.type === 'elective' ? (col.groupName || col.title || 'ELECTIVE') : (col.subject.code || col.subject.name);
      (col.activeSubCols || []).forEach(sc => {
        const cleanLabel = sc.label.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        headers.push(`${subTitle} [${cleanLabel}]`);
      });
    });

    headers.push('Cr', 'SGPA', 'CGPA', 'Result');

    const rows = cachedStudentsList.map((stud, idx) => {
      const name = stud.name || studentNamesMap[stud.roll] || '';
      const r = [
        idx + 1,
        stud.roll,
        name,
        stud.period,
        stud.course,
        stud.term || (stud.sem ? (Number(stud.sem) % 2 !== 0 ? 'Term I' : 'Term II') : ''),
        stud.sem,
        stud.examType
      ];

      cachedDisplayColumns.forEach(col => {
        let chosenRec = null;
        if (col.type === 'elective') {
          for (let s of col.subjects) {
            if (stud.subjects && stud.subjects[s.code]) {
              chosenRec = stud.subjects[s.code];
              break;
            }
          }
        } else if (col.subject) {
          chosenRec = stud.subjects && stud.subjects[col.subject.code];
        }

        const caTotal = chosenRec ? ((Number(chosenRec.caTh) || 0) + (Number(chosenRec.caPr) || 0)) : 0;
        const eseTotal = chosenRec ? ((Number(chosenRec.eseTh) || 0) + (Number(chosenRec.esePr) || 0)) : 0;

        (col.activeSubCols || []).forEach(sc => {
          if (!chosenRec) {
            r.push('-');
            return;
          }
          if (sc.id === 'electiveCourse') {
            const code = chosenRec.code || '';
            const name = chosenRec.name || '';
            r.push(name ? `${code} - ${name}` : (code || '-'));
          } else if (sc.id === 'cat') r.push(chosenRec.caTh !== null && chosenRec.caTh !== '' && String(chosenRec.caTh).toUpperCase() !== 'NULL' ? chosenRec.caTh : '-');
          else if (sc.id === 'cap') r.push(chosenRec.caPr !== null && chosenRec.caPr !== '' && String(chosenRec.caPr).toUpperCase() !== 'NULL' ? chosenRec.caPr : '-');
          else if (sc.id === 'ca') r.push(caTotal > 0 ? caTotal : (chosenRec.caTh || '-'));
          else if (sc.id === 'est') r.push(chosenRec.eseTh !== null && chosenRec.eseTh !== '' && String(chosenRec.eseTh).toUpperCase() !== 'NULL' ? chosenRec.eseTh : '-');
          else if (sc.id === 'esp') r.push(chosenRec.esePr !== null && chosenRec.esePr !== '' && String(chosenRec.esePr).toUpperCase() !== 'NULL' ? chosenRec.esePr : '-');
          else if (sc.id === 'ese') r.push(eseTotal > 0 ? eseTotal : (chosenRec.eseTh || '-'));
          else if (sc.id === 'ia') r.push(chosenRec.ia !== null && chosenRec.ia !== '' && String(chosenRec.ia).toUpperCase() !== 'NULL' ? chosenRec.ia : '-');
          else if (sc.id === 'tot') r.push(chosenRec.mark || '-');
          else if (sc.id === 'thGrd') r.push(cleanGradeVal(chosenRec.thGrd) || '-');
          else if (sc.id === 'prGrd') r.push(cleanGradeVal(chosenRec.prGrd) || '-');
          else if (sc.id === 'grd') r.push(cleanGradeVal(chosenRec.grd) || '-');
          else r.push('-');
        });
      });

      let regCr = 0;
      let earnCr = 0;
      Object.values(stud.subjects || {}).forEach(subRec => {
        let cr = (Number(subRec.crTh) || 0) + (Number(subRec.crPr) || 0);
        if (cr === 0) cr = 4;
        regCr += cr;
        const isSubPass = String(subRec.result || '').toUpperCase() === 'PASS' && 
          cleanGradeVal(subRec.grd) !== 'F' &&
          cleanGradeVal(subRec.thGrd) !== 'F' &&
          cleanGradeVal(subRec.prGrd) !== 'F';
        if (isSubPass) earnCr += cr;
      });
      const crExport = regCr > 0 ? `${earnCr}/${regCr}` : '-';

      r.push(crExport, stud.sgpa || '-', stud.cgpa || '-', stud.result || '-');
      return r;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Gazette_Cohort');

    const prog = document.getElementById('filterCourse')?.value || 'Programme';
    const sem = document.getElementById('filterSem')?.value || 'Sem';
    XLSX.writeFile(wb, `SSPU_Gazette_${prog}_Sem${sem}_${tmpl}.xlsx`);
    commonUI.showToast(`Exported filtered cohort (${tmpl === 'template2' ? 'Template 2: Detailed' : 'Template 1: Standard'}) to Excel`, 'success');
  }

  /* ---------------- Page Bootstrap ---------------- */
  async function initGazettePage() {
    commonUI.renderNavbar('gazette');
    const initResult = await dataStore.init();
    commonUI.updateNavStatus(initResult.count);

    // Initial period populate: descending order, defaulting to 2024-2025
    const pEl = document.getElementById('filterPeriod');
    let periods = dataStore.getFilteredDistinctValues('AcademicPeriod');
    if (!periods || periods.length === 0) {
      periods = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
    } else {
      periods = Array.from(new Set(periods)).sort().reverse();
    }
    if (pEl) {
      pEl.innerHTML = '';
      periods.forEach(p => pEl.innerHTML += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`);
      pEl.innerHTML += `<option value="">-- All Periods --</option>`;
      pEl.value = periods[0] || '2024-2025';
    }

    // Apply URL params if provided
    const urlParams = commonUI.getUrlParams();
    if (urlParams.period && pEl) pEl.value = urlParams.period;
    if (urlParams.template && document.getElementById('gazetteTemplate')) {
      document.getElementById('gazetteTemplate').value = urlParams.template;
    }

    syncDropdowns();

    if (urlParams.dept && document.getElementById('filterDept')) {
      document.getElementById('filterDept').value = urlParams.dept;
      syncDropdowns();
    }
    if (urlParams.course && document.getElementById('filterCourse')) {
      document.getElementById('filterCourse').value = urlParams.course;
      syncDropdowns();
    }
    if (urlParams.term && document.getElementById('filterTerm')) {
      document.getElementById('filterTerm').value = urlParams.term;
      syncDropdowns();
    }
    if (urlParams.sem && document.getElementById('filterSem')) {
      document.getElementById('filterSem').value = urlParams.sem;
    }
    if (urlParams.examType && document.getElementById('filterExamType')) {
      document.getElementById('filterExamType').value = urlParams.examType;
    }

    applyFiltersAndRender();
  }

  // React to dataset uploads, restores or appends dynamically
  window.addEventListener('sspu-data-updated', () => {
    initGazettePage();
  });

  // Export public API
  window.gazetteApp = {
    initGazettePage,
    syncDropdowns,
    onPeriodChange,
    onDeptChange,
    onCourseChange,
    onTermChange,
    onSemChange,
    onExamDateChange,
    onTemplateChange,
    onSdSignToggle,
    pickCourseQuick,
    resetAllFilters,
    applyFiltersAndRender,
    changeGazettePage,
    jumpToGazettePage,
    toggleContinuousPages,
    handlePrintAction,
    exportToExcel,
    editStudentName
  };

})(window);
