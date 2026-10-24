/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - STUDENT GRADE CARDS (A4 PORTRAIT) ENGINE
 * Symbiosis Skills & Professional University, Pune
 * =========================================================================
 */

(function(window) {
  'use strict';

  let cachedStudentsList = [];

  // Lazy wrappers so load order of common.js never matters at IIFE eval time
  const escapeHtml = (str) => commonUI.escapeHtml(str);
  const escapeAttr = (str) => commonUI.escapeAttr(str);

  /* ---------------- Helper: Clean and Sanitize Grade String ---------------- */
  function cleanGradeVal(val) {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '' || s.toUpperCase() === 'NULL' || s.toUpperCase() === 'NUL' || s.toUpperCase() === 'NIL' || s === '-') return '';
    return s;
  }

  /* ---------------- Helper: Grade Badge Styling Class ---------------- */
  function getGradeClass(g) {
    if (!g || g === '-') return 'grd-badge-default';
    const first = String(g).split('/')[0].trim().toUpperCase();
    if (['O', 'A+', 'A'].includes(first)) return 'grd-badge-o';
    if (['B+', 'B'].includes(first)) return 'grd-badge-b';
    if (['C', 'P'].includes(first)) return 'grd-badge-c';
    if (first === 'F') return 'grd-badge-f';
    return 'grd-badge-default';
  }

  /* ---------------- Dropdown Synchronization ---------------- */
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

      if (!periodEl.value) {
        periodEl.value = periods[0] || '2024-2025';
      }
    }

    const period = periodEl ? periodEl.value : '';
    const prevDept = deptEl ? deptEl.value : '';
    const prevCourse = courseEl ? courseEl.value : '';
    const prevTerm = termEl ? termEl.value : '';
    const prevSem = semEl ? semEl.value : '';

    if (deptEl) {
      const depts = dataStore.getFilteredDistinctValues('DepartmentCode', { AcademicPeriod: period });
      deptEl.innerHTML = '<option value="">-- All Departments --</option>';
      depts.forEach(d => deptEl.innerHTML += `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`);
      deptEl.value = depts.includes(prevDept) ? prevDept : '';
    }

    const activeDept = deptEl ? deptEl.value : '';
    if (courseEl) {
      const courses = dataStore.getFilteredDistinctValues('CM_Course_Name', {
        AcademicPeriod: period,
        DepartmentCode: activeDept
      });
      courseEl.innerHTML = '<option value="">-- Choose Programme --</option>';
      courses.forEach(c => courseEl.innerHTML += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
      if (prevCourse && courses.includes(prevCourse)) {
        courseEl.value = prevCourse;
      } else if (courses.length > 0) {
        courseEl.value = courses[0];
      }
    }

    const activeCourse = courseEl ? courseEl.value : '';
    const courseToDeptMap = dataStore.getCourseToDeptMap();
    if (activeCourse && courseToDeptMap[activeCourse] && deptEl && !deptEl.value) {
      deptEl.value = courseToDeptMap[activeCourse];
    }

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

    if (examTypeEl) {
      if (examTypeEl.options.length === 0) {
        examTypeEl.innerHTML = `
          <option value="ALL">Both</option>
          <option value="REGULAR">Regular</option>
          <option value="BACKLOG">Backlog</option>
        `;
      }
    }

    // Dependent Badges
    const badgeDept = document.getElementById('badgeDept');
    if (badgeDept) badgeDept.style.display = (deptEl && deptEl.value) ? 'inline-block' : 'none';
    const badgeTerm = document.getElementById('badgeTerm');
    if (badgeTerm) badgeTerm.style.display = (termEl && termEl.value) ? 'inline-block' : 'none';
    const badgeSem = document.getElementById('badgeSem');
    if (badgeSem) badgeSem.style.display = (semEl && semEl.value) ? 'inline-block' : 'none';
  }

  function onTermChange() {
    syncDropdowns();
    applyFiltersAndRender();
  }

  /* ---------------- Reset All Dropdowns & Filters ---------------- */
  function resetAllFilters() {
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
    if (document.getElementById('cardTemplate')) document.getElementById('cardTemplate').value = 'template1';
    syncDropdowns();
    applyFiltersAndRender();
  }

  /* ---------------- Core Filter & Render Engine ---------------- */
  function applyFiltersAndRender() {
    const period = document.getElementById('filterPeriod')?.value || '';
    const course = document.getElementById('filterCourse')?.value || '';
    const term = document.getElementById('filterTerm')?.value || '';
    const sem = document.getElementById('filterSem')?.value || '';
    const examTypeFilter = document.getElementById('filterExamType')?.value || 'ALL';
    const query = (document.getElementById('searchQuery')?.value || '').trim().toLowerCase();
    const cardTemplate = document.getElementById('cardTemplate')?.value || 'template1';

    const viewport = document.getElementById('cardsViewport');
    const kpiStrip = document.getElementById('gradeCardsKpiStrip') || document.getElementById('kpiRowGradeCards');
    if (!viewport) return;

    if (!course) {
      if (kpiStrip) kpiStrip.style.display = 'none';
      viewport.innerHTML = `
        <div style="background:var(--sspu-card-bg); border:1px solid var(--sspu-border); border-radius:12px; padding:60px 20px; text-align:center; max-width:600px; margin:40px auto; box-shadow:var(--shadow-sm);">
          <div style="font-size:36px; margin-bottom:12px;">🪪</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:6px;">Select a Programme</h3>
          <p style="font-size:13px; color:#64748b;">Please select an Academic Period and Programme to view individual Student Grade Cards.</p>
        </div>
      `;
      return;
    }

    const cohortRows = dataStore.getCohortRows(period, course, sem, term);
    const colMap = dataStore.getColMap();
    const appearancesMap = new Map();
    const nIdx = colMap['StudentName'] !== undefined ? colMap['StudentName'] : colMap['Student Full Name'];

    cohortRows.forEach(row => {
      const roll = String(row[colMap['StudentRollNo']]);
      const att = Number(row[colMap['AttemptNo']]) || 1;
      const subCode = String(row[colMap['SubjectCode']]);
      const key = roll + '_att_' + att;

      if (!appearancesMap.has(key)) {
        appearancesMap.set(key, {
          roll,
          name: (nIdx !== undefined && row[nIdx]) ? String(row[nIdx]).trim() : '',
          period: row[colMap['AcademicPeriod']],
          dept: row[colMap['DepartmentCode']],
          course: row[colMap['CM_Course_Name']],
          sem: row[colMap['Semester']],
          examDate: row[colMap['ExamYear']] || row[colMap['ExamDate']],
          sgpa: row[colMap['SGPA']],
          cgpa: row[colMap['CGPA']],
          result: row[colMap['Result']],
          attempt: att,
          isRegular: att === 1,
          examType: att === 1 ? 'Regular' : 'Backlog',
          subjects: {}
        });
      }

      const rec = appearancesMap.get(key);
      const markVal = dataStore.sanitizeMarkVal(row[colMap['Mark']]);
      rec.subjects[subCode] = {
        code: subCode,
        name: row[colMap['SM_Subject_Name']] || subCode,
        caTh: row[colMap['CA_Theory']],
        caPr: row[colMap['CA_Practical']],
        ia: row[colMap['IA_Marks']],
        eseTh: row[colMap['ESE_Theory']],
        esePr: row[colMap['ESE_Practical']],
        mark: markVal !== null ? markVal : '-',
        maxMk: row[colMap['MaxMk']] || 100,
        passMk: row[colMap['PassMk']] || 40,
        grd: row[colMap['Grd']],
        thGrd: row[colMap['Theory_Grade']],
        prGrd: row[colMap['Practical_Grade']],
        crTh: row[colMap['Credit_Alloted_Theory']],
        crPr: row[colMap['Credit_Alloted_Practical']],
        result: row[colMap['FA_Rslt']] || row[colMap['Result']]
      };
    });

    let students = Array.from(appearancesMap.values());
    if (examTypeFilter === 'REGULAR') {
      students = students.filter(s => s.isRegular);
    } else if (examTypeFilter === 'BACKLOG') {
      students = students.filter(s => !s.isRegular);
    }

    const studentNamesMap = commonUI.getStudentNamesMap();
    if (query) {
      students = students.filter(s => {
        const name = (s.name || studentNamesMap[s.roll] || '').toLowerCase();
        return s.roll.toLowerCase().includes(query) || name.includes(query);
      });
    }

    cachedStudentsList = students;

    // Update Persistent KPI Strip
    if (kpiStrip) {
      if (students.length > 0) {
        kpiStrip.style.display = 'flex';
        const regCount = students.filter(s => s.isRegular).length;
        const bklCount = students.filter(s => !s.isRegular).length;
        const passCount = students.filter(s => String(s.result || '').toUpperCase().includes('PASS')).length;
        const failCount = students.length - passCount;

        const elTot = document.getElementById('kpiTotalStudents');
        const elReg = document.getElementById('kpiRegularStudents');
        const elBkl = document.getElementById('kpiBacklogStudents');
        const elPass = document.getElementById('kpiPassedStudents');
        const elFail = document.getElementById('kpiFailedStudents');

        if (elTot) elTot.innerText = students.length.toLocaleString();
        if (elReg) elReg.innerText = regCount.toLocaleString();
        if (elBkl) elBkl.innerText = bklCount.toLocaleString();
        if (elPass) elPass.innerText = passCount.toLocaleString();
        if (elFail) elFail.innerText = failCount.toLocaleString();
      } else {
        kpiStrip.style.display = 'none';
      }
    }

    viewport.innerHTML = buildCardsHtml(students, cardTemplate);
  }

  /* ---------------- Professional University Marksheet Builder ---------------- */
  function buildCardsHtml(students, cardTemplate = 'template1') {
    if (students.length === 0) {
      return `
        <div style="background:var(--sspu-card-bg); border:1px solid var(--sspu-border); border-radius:12px; padding:60px 20px; text-align:center; max-width:600px; margin:40px auto; box-shadow:var(--shadow-sm);">
          <div style="font-size:36px; margin-bottom:12px;">🔍</div>
          <h3 style="font-size:18px; font-weight:700;">No Candidate Cards Found</h3>
          <p style="font-size:13px; color:#64748b;">Try adjusting your search query, exam type filter, or choose another semester.</p>
        </div>
      `;
    }

    const isTemplate2 = cardTemplate === 'template2';
    const studentNamesMap = commonUI.getStudentNamesMap();
    let html = '<div class="cards-grid-container">';

    students.forEach((stud, idx) => {
      const sr = idx + 1;
      const roll = stud.roll;
      const displayName = stud.name || studentNamesMap[roll] || '';
      const isPass = String(stud.result || '').toUpperCase().includes('PASS');
      const sg = Number(stud.sgpa);
      const cg = Number(stud.cgpa);
      const sgpaStr = (!isNaN(sg) && sg >= 0) ? sg.toFixed(2) : '-';
      const cgpaStr = (!isNaN(cg) && cg >= 0) ? cg.toFixed(2) : '-';

      // Format Examination Session
      let examSession = (typeof dataStore !== 'undefined' && dataStore.formatExamSession)
        ? dataStore.formatExamSession(stud.examDate, stud.period, stud.sem)
        : 'MAY - JUNE 2024';
      examSession = String(examSession).replace(/\bEXAMINATIONS\b/gi, '').replace(/\s+/g, ' ').trim();

      // Aggregate Performance Metrics for Footer Totals
      let totalAllottedCredits = 0;
      let totalEarnedCredits = 0;
      let totalMarksObtained = 0;
      let totalMaxMarks = 0;

      const subjectKeys = Object.keys(stud.subjects);
      let subjectRowsHtml = '';

      subjectKeys.forEach((sc, sIdx) => {
        const sub = stud.subjects[sc];
        const crTh = Number(sub.crTh) || 0;
        const crPr = Number(sub.crPr) || 0;
        const totalCr = crTh + crPr;
        totalAllottedCredits += totalCr;

        const caThVal = Number(sub.caTh) || 0;
        const caPrVal = Number(sub.caPr) || 0;
        const caTotal = caThVal + caPrVal;

        const eseThVal = Number(sub.eseTh) || 0;
        const esePrVal = Number(sub.esePr) || 0;
        const eseTotal = eseThVal + esePrVal;

        const markNum = Number(sub.mark);
        const hasNumericMark = !isNaN(markNum) && sub.mark !== '-' && sub.mark !== '' && sub.mark !== null;
        if (hasNumericMark) {
          totalMarksObtained += markNum;
        }

        const maxMkNum = Number(sub.maxMk) || 100;
        totalMaxMarks += maxMkNum;

        const passMkNum = Number(sub.passMk);
        const isSubFail = String(sub.result || '').toUpperCase().includes('FAIL') ||
                          (hasNumericMark && !isNaN(passMkNum) && passMkNum > 0 && markNum < passMkNum) ||
                          cleanGradeVal(sub.grd) === 'F' ||
                          cleanGradeVal(sub.thGrd) === 'F' ||
                          cleanGradeVal(sub.prGrd) === 'F';

        if (!isSubFail) {
          totalEarnedCredits += totalCr;
        }

        // Format Component Displays
        let marksCellsHtml = '';
        if (isTemplate2) {
          // Template 2: Separate CAT, CAP, IA, EST, ESP
          marksCellsHtml = `
            <td class="col-mark" title="Continuous Assessment Theory (CAT)">${dataStore.formatSingleMark(sub.caTh)}</td>
            <td class="col-mark" title="Continuous Assessment Practical (CAP)">${dataStore.formatSingleMark(sub.caPr)}</td>
            <td class="col-mark" title="IA: Industry Assessment">${dataStore.formatSingleMark(sub.ia)}</td>
            <td class="col-mark" title="End Semester Theory (EST)">${dataStore.formatSingleMark(sub.eseTh)}</td>
            <td class="col-mark" title="End Semester Practical (ESP)">${dataStore.formatSingleMark(sub.esePr)}</td>
          `;
        } else {
          // Template 1: Combined CA, IA, ESE
          let caDisplay = '-';
          if (caTotal > 0) {
            caDisplay = dataStore.formatSingleMark(caTotal);
          } else if (sub.caTh !== undefined && sub.caTh !== 'NULL') {
            caDisplay = dataStore.formatSingleMark(sub.caTh);
          }

          let eseDisplay = '-';
          if (eseTotal > 0) {
            eseDisplay = dataStore.formatSingleMark(eseTotal);
          } else if (sub.eseTh !== undefined && sub.eseTh !== 'NULL') {
            eseDisplay = dataStore.formatSingleMark(sub.eseTh);
          }

          const caTooltip = (caThVal > 0 && caPrVal > 0) ? `CA Theory: ${sub.caTh}, Practical: ${sub.caPr}` : 'Continuous Assessment';
          const eseTooltip = (eseThVal > 0 && esePrVal > 0) ? `ESE Theory: ${sub.eseTh}, Practical: ${sub.esePr}` : 'End Semester Examination';

          marksCellsHtml = `
            <td class="col-mark" title="${escapeHtml(caTooltip)}">
              ${caDisplay}
            </td>
            <td class="col-mark" title="IA: Industry Assessment">
              ${dataStore.formatSingleMark(sub.ia)}
            </td>
            <td class="col-mark" title="${escapeHtml(eseTooltip)}">
              ${eseDisplay}
            </td>
          `;
        }

        subjectRowsHtml += `
          <tr>
            <td class="col-sr">${sIdx + 1}</td>
            <td class="col-sub-code"><b>${escapeHtml(sub.code)}</b></td>
            <td class="col-sub-name">${escapeHtml(sub.name)}</td>
            <td class="col-credits">
              <b>${totalCr > 0 ? totalCr : '-'}</b>
              ${(crTh > 0 && crPr > 0) ? `<span class="cr-breakdown">(${crTh}+${crPr})</span>` : ''}
            </td>
            ${marksCellsHtml}
            <td class="col-mark col-tot ${isSubFail ? 'fail-mark' : ''}">
              <b>${sub.mark !== null && sub.mark !== undefined ? escapeHtml(sub.mark) : '-'}</b>
            </td>
            <td class="col-max">${escapeHtml(sub.maxMk || 100)}</td>
            <td class="col-grd ${cleanGradeVal(sub.thGrd) === 'F' ? 'fail-mark' : ''}"><b>${escapeHtml(cleanGradeVal(sub.thGrd)) || '-'}</b></td>
            <td class="col-grd ${cleanGradeVal(sub.prGrd) === 'F' ? 'fail-mark' : ''}"><b>${escapeHtml(cleanGradeVal(sub.prGrd)) || '-'}</b></td>
            <td class="col-status">
              <span class="${isSubFail ? 'badge-fail' : 'badge-pass'}">${isSubFail ? 'FAIL' : 'PASS'}</span>
            </td>
          </tr>
        `;
      });

      // Round to 2 decimals to avoid float drift in displayed totals
      totalMarksObtained = Math.round(totalMarksObtained * 100) / 100;

      const percentageStr = totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(1) + '%' : '-';

      // Marksheet Header columns definition
      const theadHtml = isTemplate2 ? `
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:85px;">Course Code</th>
            <th style="text-align:left;">Course Title / Subject Name</th>
            <th style="width:45px;" title="Total Credits (Theory + Practical)">Cr</th>
            <th style="width:46px;" title="Continuous Assessment Theory (CAT)">CAT</th>
            <th style="width:46px;" title="Continuous Assessment Practical (CAP)">CAP</th>
            <th style="width:46px;" title="IA: Industry Assessment">IA</th>
            <th style="width:46px;" title="End Semester Theory (EST)">EST</th>
            <th style="width:46px;" title="End Semester Practical (ESP)">ESP</th>
            <th style="width:55px;" title="Total Marks Obtained">Total</th>
            <th style="width:46px;" title="Maximum Marks">Max</th>
            <th style="width:55px;" title="Theory Grade">Th Grd</th>
            <th style="width:55px;" title="Practical Grade">Pr Grd</th>
            <th style="width:58px;" title="Result Status">Status</th>
          </tr>
        </thead>
      ` : `
        <thead>
          <tr>
            <th style="width:32px;">#</th>
            <th style="width:90px;">Course Code</th>
            <th style="text-align:left;">Course Title / Subject Name</th>
            <th style="width:48px;" title="Total Credits (Theory + Practical)">Cr</th>
            <th style="width:52px;" title="Continuous Assessment (CA)">CA</th>
            <th style="width:52px;" title="IA: Industry Assessment">IA</th>
            <th style="width:52px;" title="End Semester Examination (ESE)">ESE</th>
            <th style="width:58px;" title="Total Marks Obtained">Total</th>
            <th style="width:48px;" title="Maximum Marks">Max</th>
            <th style="width:60px;" title="Theory Grade">Th Grd</th>
            <th style="width:60px;" title="Practical Grade">Pr Grd</th>
            <th style="width:62px;" title="Result Status">Status</th>
          </tr>
        </thead>
      `;

      // Marksheet Footer totals definition
      const tfootHtml = `
        <tfoot>
          <tr class="tfoot-totals-row">
            <td colspan="3" class="tfoot-summary-title">
              <b>TOTALS &amp; SEMESTER PERFORMANCE</b>
            </td>
            <td class="tfoot-credits-total" title="Earned Credits / Total Credits Allotted">
              <b>${totalEarnedCredits} / ${totalAllottedCredits}</b>
            </td>
            <td colspan="${isTemplate2 ? 5 : 3}" class="tfoot-marks-label">
              <span>Marks Aggregation:</span>
            </td>
            <td class="tfoot-total-obtained">
              <b>${totalMarksObtained}</b>
            </td>
            <td class="tfoot-total-max">
              <b>${totalMaxMarks}</b>
            </td>
            <td colspan="2" class="tfoot-gpa-data">
              <span>SGPA: <b>${sgpaStr}</b></span>
              <span class="gpa-sep">|</span>
              <span>CGPA: <b>${cgpaStr}</b></span>
              <span style="margin-left: 6px; font-weight: 800; color: #1e3a8a;">(${percentageStr})</span>
            </td>
            <td class="tfoot-result-status">
              <span class="${isPass ? 'badge-pass' : 'badge-fail'}">${isPass ? 'PASS' : 'FAIL'}</span>
            </td>
          </tr>
        </tfoot>
      `;

      const legendText = isTemplate2
        ? '<b>Abbreviations &amp; Legends:</b> CAT: Continuous Assessment Theory | CAP: Continuous Assessment Practical | IA: Industry Assessment | EST: End Semester Theory | ESP: End Semester Practical | Th: Theory | Pr: Practical | Cr: Credits'
        : '<b>Abbreviations &amp; Legends:</b> CA: Continuous Assessment | IA: Industry Assessment | ESE: End Semester Exam | Th: Theory | Pr: Practical | Cr: Credits';

      html += `
        <div class="student-card" id="card-${escapeHtml(roll)}">
          <!-- 1. Institutional Marksheet Header -->
          <div class="card-inst-header">
            <div class="inst-brand">
              <img src="../symbioais logo.jpeg" alt="SSPU" class="card-brand-logo" onerror="this.src='symbioais logo.jpeg';">
              <div class="card-brand-text">
                <div class="univ-heading">SYMBIOSIS SKILLS &amp; PROFESSIONAL UNIVERSITY, PUNE</div>
                <div class="univ-subheading">A State Open Skills University • Directorate of Examinations • Kiwale, Pune - 412101</div>
                <div class="card-sheet-title">STUDENT STATEMENT OF MARKS &amp; GRADES</div>
              </div>
            </div>

            <div class="card-header-meta">
              <div class="card-meta-badges">
                <span class="chip-item chip-period">${escapeHtml(stud.period) || '-'}</span>
                <span class="chip-item ${stud.attempt > 1 ? 'chip-backlog' : 'chip-regular'}">
                  ${stud.attempt > 1 ? `Backlog (Attempt ${stud.attempt})` : 'Regular Examination'}
                </span>
                <span class="chip-item ${isPass ? 'chip-pass' : 'chip-fail'}">
                  <b>${isPass ? 'PASS' : 'FAIL'}</b>
                </span>
              </div>
              <div class="card-exam-session">
                Examination: <b>${escapeHtml(examSession)}</b>
              </div>
            </div>
          </div>

          <!-- 2. Candidate Particulars Matrix -->
          <div class="candidate-details-grid">
            <div class="detail-cell">
              <span class="detail-label">PRN / Roll No:</span>
              <span class="detail-value prn-bold">${escapeHtml(roll)}</span>
            </div>
            <div class="detail-cell detail-name-cell">
              <span class="detail-label">Candidate Name:</span>
              <span class="detail-value student-name-link" onclick="gradeCardsApp.editStudentName('${escapeAttr(roll)}', this)" title="Click to edit name">
                ${displayName ? escapeHtml(displayName) : '<span class="name-empty">Click to add name</span>'}
              </span>
            </div>
            <div class="detail-cell">
              <span class="detail-label">Programme:</span>
              <span class="detail-value">${escapeHtml(stud.course) || '-'}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-label">Semester / Term:</span>
              <span class="detail-value">Semester ${escapeHtml(stud.sem) || '-'}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-label">School / Dept:</span>
              <span class="detail-value">${escapeHtml(stud.dept) || '-'}</span>
            </div>
            <div class="detail-cell">
              <span class="detail-label">SGPA / CGPA:</span>
              <span class="detail-value">SGPA: <b>${sgpaStr}</b> | CGPA: <b>${cgpaStr}</b></span>
            </div>
          </div>

          <!-- 3. Professional Marksheet Table -->
          <div class="marksheet-table-container">
            <table class="card-subject-table">
              ${theadHtml}
              <tbody>
                ${subjectRowsHtml}
              </tbody>
              ${tfootHtml}
            </table>
          </div>

          <!-- 4. Card Bottom Strip / Legends & Official Signatures -->
          <div class="card-footer-strip">
            <div class="card-legend-line">
              ${legendText}
            </div>
            <div class="card-signatures-grid">
              <div class="sig-col">
                <div class="sig-line"></div>
                <span class="sig-title">Prepared By</span>
              </div>
              <div class="sig-col">
                <div class="sig-line"></div>
                <span class="sig-title">Checked &amp; Verified By</span>
              </div>
              <div class="sig-col">
                <div class="sig-line"></div>
                <span class="sig-title">Controller of Examinations</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /* ---------------- Student Name Editing ---------------- */
  function editStudentName(roll, el) {
    const existing = el.innerText === 'Click to add name' ? '' : el.innerText;
    const newName = prompt(`Enter student name for PRN ${roll}:`, existing);
    if (newName !== null) {
      commonUI.saveStudentName(roll, newName.trim());
      el.innerText = newName.trim() || 'Click to add name';
      commonUI.showToast(`Updated name for PRN ${roll}`, 'success');
    }
  }

  /* ---------------- Print Action ---------------- */
  function handlePrintAction() {
    window.print();
  }

  /* ---------------- Page Initialization ---------------- */
  async function initGradeCardsPage() {
    commonUI.renderNavbar('grade-cards');
    const initResult = await dataStore.init();
    commonUI.updateNavStatus(initResult.count);

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

    const urlParams = commonUI.getUrlParams();
    if (urlParams.period && pEl) pEl.value = urlParams.period;

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
    if (urlParams.template && document.getElementById('cardTemplate')) {
      document.getElementById('cardTemplate').value = urlParams.template;
    }

    applyFiltersAndRender();
  }

  // React to dataset uploads, restores or appends dynamically
  window.addEventListener('sspu-data-updated', () => {
    initGradeCardsPage();
  });

  window.gradeCardsApp = {
    initGradeCardsPage,
    syncDropdowns,
    onTermChange,
    applyFiltersAndRender,
    resetAllFilters,
    editStudentName,
    handlePrintAction
  };

})(window);
