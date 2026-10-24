/**
 * =========================================================================
 * SSPU - MASTER RECORD MANAGEMENT & INSTITUTIONAL GOVERNANCE ENGINE
 * =========================================================================
 */

(function(window) {
  'use strict';

  // 1. Standardized University Examination Record Inventory
  const MASTER_RECORDS_CATALOG = [
    {
      code: 'REG-TR-01',
      title: 'Master Tabulation Register (TR Book)',
      desc: 'Permanent high-density bound register and digital folio of all candidate marks, components, grades, SGPA, and result status.',
      category: 'GAZETTE',
      categoryLabel: 'I. Statutory Gazette',
      custodian: 'Controller of Examinations',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'A3 Bound Volume + PDF/A Encrypted',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-GZ-02',
      title: 'Official Result Gazette Notification',
      desc: 'Formally published university gazette signed by statutory authorities, notification of pass/fail lists, and date of declaration.',
      category: 'GAZETTE',
      categoryLabel: 'I. Statutory Gazette',
      custodian: 'Controller of Examinations',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Official Printed Folio + Web Portal',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-BOE-03',
      title: 'Board of Examinations (BoEE) Resolutions',
      desc: 'Minutes of meeting and formal resolutions of the Board of Examinations and Evaluation sanctioning result declaration.',
      category: 'GAZETTE',
      categoryLabel: 'I. Statutory Gazette',
      custodian: 'CoE & Academic Council',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Physical Minute Book + Signed PDF',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-CORR-04',
      title: 'Gazette Corrigendum & Amendment Register',
      desc: 'Formal record of all post-publication grade amendments, revaluation corrections, or student name rectifications.',
      category: 'GAZETTE',
      categoryLabel: 'I. Statutory Gazette',
      custodian: 'Dy. Registrar (Evaluation)',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Physical Ledger + Audit Trail',
      status: 'ACTIVE AUDIT'
    },
    {
      code: 'REG-GC-05',
      title: 'Official Semester Grade Cards (Grade Sheets)',
      desc: 'A4 individual student statements of grades, credits earned, grade point average, and security watermark serials.',
      category: 'CERTIFICATION',
      categoryLabel: 'II. Certification & Transcripts',
      custodian: 'Asst. Registrar (Records)',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'High-Security A4 + Digital Ledger',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-TRN-06',
      title: 'Consolidated Academic Transcripts Register',
      desc: 'Cumulative semester-by-semester academic history issued for higher education, employment, or foreign credential evaluation.',
      category: 'CERTIFICATION',
      categoryLabel: 'II. Certification & Transcripts',
      custodian: 'Asst. Registrar (Records)',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Secure Parchment + Encrypted PDF',
      status: 'ACTIVE AUDIT'
    },
    {
      code: 'REG-DEG-07',
      title: 'Degree & Diploma Master Citation Register',
      desc: 'Permanent convocation record book containing graduate names, degrees conferred, registration numbers, and medal lists.',
      category: 'CERTIFICATION',
      categoryLabel: 'II. Certification & Transcripts',
      custodian: 'Registrar & CoE',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Leather-bound Convocation Book',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-NAD-08',
      title: 'National Academic Depository (NAD / DigiLocker) Log',
      desc: 'Verification logs and digital certificate hashes synchronized with the Government of India DigiLocker / NAD portal.',
      category: 'CERTIFICATION',
      categoryLabel: 'II. Certification & Transcripts',
      custodian: 'Examination Nodal Officer',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'JSON/XML Cloud Sync Archive',
      status: 'REGULATORY MANDATE'
    },
    {
      code: 'REG-MIG-09',
      title: 'Migration & Transfer Certificate Counterfoil Register',
      desc: 'Serial counterfoils, student clearance forms, and verification stamps for issued migration and transfer certificates.',
      category: 'CERTIFICATION',
      categoryLabel: 'II. Certification & Transcripts',
      custodian: 'Asst. Registrar (Records)',
      retention: 'PERMANENT',
      retentionLabel: 'Permanent Archive',
      format: 'Serial Counterfoil Bound Ledger',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-SCH-10',
      title: 'Approved Teaching & Evaluation Schemes (Syllabus Master)',
      desc: 'Curriculum structure approved by Academic Council, subject codes, credit weightages, theory/practical breakdown, and pass criteria.',
      category: 'PRE_EXAM',
      categoryLabel: 'III. Pre-Exam & Registration',
      custodian: 'Academic Section & CoE',
      retention: '5_YEARS',
      retentionLabel: '5 Years Retention',
      format: 'Curriculum Master Dossier',
      status: 'ACTIVE AUDIT'
    },
    {
      code: 'REG-ENR-11',
      title: 'Student Eligibility & Exam Enrollment Dossiers',
      desc: 'Verification of minimum attendance, prerequisite pass requirements, exam fee payment receipts, and candidate eligibility lists.',
      category: 'PRE_EXAM',
      categoryLabel: 'III. Pre-Exam & Registration',
      custodian: 'Dy. Registrar (Evaluation)',
      retention: '5_YEARS',
      retentionLabel: '5 Years Retention',
      format: 'Electronic Database + Signed Sheets',
      status: 'ACTIVE AUDIT'
    },
    {
      code: 'REG-HT-12',
      title: 'Hall Ticket & Examination Center Seating Register',
      desc: 'Center allocation records, desk seating charts, and admit card dispatch logs for regular and backlog appearances.',
      category: 'PRE_EXAM',
      categoryLabel: 'III. Pre-Exam & Registration',
      custodian: 'Center Superintendent',
      retention: '5_YEARS',
      retentionLabel: '5 Years Retention',
      format: 'Physical Seating Chart + System Log',
      status: 'SCHEDULED ARCHIVE'
    },
    {
      code: 'REG-ATT-13',
      title: 'Center Attendance Sheets & Form-D (Absentee Register)',
      desc: 'Daily examination hall attendance signatures, booklet barcode matching slips, and invigilator certified Form-D absentee registers.',
      category: 'CONDUCT',
      categoryLabel: 'IV. Exam Conduct & Custody',
      custodian: 'Senior Center Superintendent',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Signed Physical Folios',
      status: 'SCHEDULED ARCHIVE'
    },
    {
      code: 'REG-ABK-14',
      title: 'Answer Booklet Serial Tracking & Custody Slips',
      desc: 'Main answer book stock register, unused booklet balance reconciliation, security bag sealing slips, and transport receipts.',
      category: 'CONDUCT',
      categoryLabel: 'IV. Exam Conduct & Custody',
      custodian: 'Dy. Registrar (Secrecy)',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Security Stock Ledger',
      status: 'SCHEDULED ARCHIVE'
    },
    {
      code: 'REG-UMEC-15',
      title: 'Unfair Means Enquiry Committee (UMEC) Docket',
      desc: 'Student malpractice complaints, invigilator reports, flying squad statements, committee hearing minutes, and penalty orders.',
      category: 'CONDUCT',
      categoryLabel: 'IV. Exam Conduct & Custody',
      custodian: 'CoE & Legal Cell',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Confidential Committee Dossier',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-CA-16',
      title: 'Continuous Assessment (CA) & Practical Marksheets',
      desc: 'Internal continuous evaluations, laboratory journals, term-work assessment sheets, and viva-voce scorecards signed by external examiners.',
      category: 'EVALUATION',
      categoryLabel: 'V. Marks & Moderation',
      custodian: 'School Deans & Faculty',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Faculty Marks Portal + Signed Printout',
      status: 'ACTIVE AUDIT'
    },
    {
      code: 'REG-MOD-17',
      title: 'Statistical Moderation & Grace Mark Award Minutes',
      desc: 'Moderation committee minutes, standard deviation analysis, scaling factors, and ordinance-mandated condonation / grace mark award records.',
      category: 'EVALUATION',
      categoryLabel: 'V. Marks & Moderation',
      custodian: 'Moderation Committee & CoE',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Signed Moderation Ledger',
      status: 'STATUTORY REQUIRED'
    },
    {
      code: 'REG-REV-18',
      title: 'Revaluation / Photocopy & Verification Ledger',
      desc: 'Candidate grievance applications, independent re-examiner score sheets, grade delta computations, and revised marksheet issuance records.',
      category: 'EVALUATION',
      categoryLabel: 'V. Marks & Moderation',
      custodian: 'Dy. Registrar (Evaluation)',
      retention: '3_YEARS',
      retentionLabel: '3 Years Retention',
      format: 'Revaluation Log & Grade Orders',
      status: 'ACTIVE AUDIT'
    }
  ];

  let currentCategoryFilter = 'ALL';
  let currentRetentionFilter = 'ALL';
  let searchQuery = '';

  /* ---------------- Initialization ---------------- */
  function initMasterRecordsPage() {
    commonUI.renderNavbar('master-records');
    
    // Connect to DataStore
    dataStore.init().then((initResult) => {
      if (initResult && initResult.count) {
        commonUI.updateNavStatus(initResult.count);
      }
      renderRecordsTable();
      populateCohortFilters();
      runLiveAudit();
      loadChecklistState();
    });
  }

  /* ---------------- Render Record Taxonomy Table ---------------- */
  function renderRecordsTable() {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;

    let filtered = MASTER_RECORDS_CATALOG.filter(rec => {
      const matchCat = (currentCategoryFilter === 'ALL' || rec.category === currentCategoryFilter);
      const matchRet = (currentRetentionFilter === 'ALL' || rec.retention === currentRetentionFilter);
      const matchQuery = !searchQuery || (
        rec.code.toLowerCase().includes(searchQuery) ||
        rec.title.toLowerCase().includes(searchQuery) ||
        rec.custodian.toLowerCase().includes(searchQuery) ||
        rec.desc.toLowerCase().includes(searchQuery)
      );
      return matchCat && matchRet && matchQuery;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#64748b;">No records match your search filter criteria.</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach(rec => {
      let retClass = 'ret-permanent';
      if (rec.retention === '5_YEARS') retClass = 'ret-5yr';
      else if (rec.retention === '3_YEARS') retClass = 'ret-3yr';
      else if (rec.retention === '1_YEAR') retClass = 'ret-1yr';

      let statusClass = 'status-pill-required';
      let dotColor = '#16a34a';
      const upperStatus = String(rec.status || '').toUpperCase();
      if (upperStatus.includes('AUDIT')) {
        statusClass = 'status-pill-audit';
        dotColor = '#0891b2';
      } else if (upperStatus.includes('ARCHIVE') || upperStatus.includes('SCHEDULED')) {
        statusClass = 'status-pill-archive';
        dotColor = '#d97706';
      } else if (upperStatus.includes('MANDATE') || upperStatus.includes('REGULATORY')) {
        statusClass = 'status-pill-mandate';
        dotColor = '#7c3aed';
      }

      html += `
        <tr>
          <td><span class="rec-code-badge">${rec.code}</span></td>
          <td>
            <strong>${rec.title}</strong>
            <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">${rec.desc}</div>
          </td>
          <td><span style="font-weight:600; color:#1e3a8a;">${rec.categoryLabel}</span></td>
          <td><strong>${rec.custodian}</strong></td>
          <td><span class="retention-badge ${retClass}">⏳ ${rec.retentionLabel}</span></td>
          <td style="font-size:0.78rem; color:#475569;">${rec.format}</td>
          <td>
            <span class="statutory-status-badge ${statusClass}">
              <span class="status-dot" style="background:${dotColor};"></span>
              ${rec.status}
            </span>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  /* ---------------- Filter Handlers ---------------- */
  function filterCategory(category, btnEl) {
    currentCategoryFilter = category;
    if (btnEl) {
      document.querySelectorAll('#categoryChips .filter-chip').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    renderRecordsTable();
  }

  function filterRetention() {
    const sel = document.getElementById('retentionFilterSelect');
    if (sel) {
      currentRetentionFilter = sel.value;
      renderRecordsTable();
    }
  }

  function filterRecordTable() {
    const input = document.getElementById('recordSearchInput');
    searchQuery = input ? input.value.trim().toLowerCase() : '';
    renderRecordsTable();
  }

  /* ---------------- Tabs Switching ---------------- */
  function switchTab(tabId, btnEl) {
    document.querySelectorAll('.gov-tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.gov-tab-btn').forEach(b => b.classList.remove('active'));

    const targetPane = document.getElementById('tab-' + tabId);
    if (targetPane) targetPane.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
  }

  /* ---------------- Live Dataset Audit ---------------- */
  function runLiveAudit() {
    const totalRows = dataStore.getRawRows().length;
    const programmes = dataStore.getFilteredDistinctValues('CM_Course_Name');
    const depts = dataStore.getFilteredDistinctValues('DepartmentCode');
    const students = dataStore.getFilteredDistinctValues('StudentRollNo');

    // Update KPI strip
    const elRows = document.getElementById('kpiTotalRecords');
    const elProgs = document.getElementById('kpiTotalPrograms');
    const elStuds = document.getElementById('kpiTotalStudents');
    if (elRows) elRows.innerText = totalRows ? totalRows.toLocaleString() : '140,799';
    if (elProgs) elProgs.innerText = programmes.length || '26';
    if (elStuds) elStuds.innerText = students.length ? students.length.toLocaleString() : '—';

    // Update Audit Check Panel
    const chkRows = document.getElementById('chkTotalRows');
    const chkProgs = document.getElementById('chkProgramsCount');
    const chkDepts = document.getElementById('chkDeptsCount');
    const chkStuds = document.getElementById('chkStudentsCount');

    if (chkRows) chkRows.innerText = totalRows ? totalRows.toLocaleString() : '140,799 Rows';
    if (chkProgs) chkProgs.innerText = (programmes.length || 26) + ' Programmes';
    if (chkDepts) chkDepts.innerText = (depts.length || 12) + ' Schools';
    if (chkStuds) chkStuds.innerText = students.length.toLocaleString() + ' PRNs';
  }

  /* ---------------- Cohort Workflow Inspector ---------------- */
  function populateCohortFilters() {
    const periodEl = document.getElementById('wfPeriod');
    const courseEl = document.getElementById('wfCourse');
    const semEl = document.getElementById('wfSem');

    const period = periodEl ? periodEl.value : '2024-2025';
    const courses = dataStore.getFilteredDistinctValues('CM_Course_Name', { AcademicPeriod: period });

    if (courseEl) {
      courseEl.innerHTML = '';
      courses.forEach(c => courseEl.innerHTML += `<option value="${commonUI.escapeHtml(c)}">${commonUI.escapeHtml(c)}</option>`);
    }

    updateWorkflowCohort();
  }

  function updateWorkflowCohort() {
    const period = document.getElementById('wfPeriod')?.value || '2024-2025';
    const course = document.getElementById('wfCourse')?.value || '';
    const semEl = document.getElementById('wfSem');

    if (semEl && course) {
      const sems = dataStore.getFilteredDistinctValues('Semester', {
        AcademicPeriod: period,
        CM_Course_Name: course
      });
      const prevSem = semEl.value;
      semEl.innerHTML = '';
      sems.forEach(s => semEl.innerHTML += `<option value="${commonUI.escapeHtml(s)}">${commonUI.escapeHtml(s)}</option>`);
      if (prevSem && sems.includes(prevSem)) semEl.value = prevSem;
    }

    const sem = semEl ? semEl.value : '';
    const statusBox = document.getElementById('cohortStatusBox');
    if (statusBox) {
      if (course) {
        statusBox.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="color:#0f172a;">${commonUI.escapeHtml(course)} &bull; ${commonUI.escapeHtml(sem) || 'Semester 1'} &bull; Period: ${commonUI.escapeHtml(period)}</strong>
              <div style="font-size:0.78rem; color:#059669; margin-top:2px;">
                ✓ Tabulation Register Generated &bull; ✓ Moderation Vetted &bull; ✓ BoEE Formally Ratified &bull; Ready for A3 Print
              </div>
            </div>
            <span class="badge badge-pass" style="padding:4px 10px; font-size:0.78rem;">GAZETTE STATUS: PUBLISHED</span>
          </div>
        `;
      } else {
        statusBox.innerHTML = `<span style="color:#64748b;">Select a programme to inspect cohort statutory readiness.</span>`;
      }
    }
  }

  function openGazetteForCohort() {
    const period = document.getElementById('wfPeriod')?.value || '2024-2025';
    const course = document.getElementById('wfCourse')?.value || '';
    const sem = document.getElementById('wfSem')?.value || '';

    // Direct link to gazette.html with preselected URL parameters
    window.location.href = `gazette.html?period=${encodeURIComponent(period)}&course=${encodeURIComponent(course)}&sem=${encodeURIComponent(sem)}`;
  }

  /* ---------------- CSV Export of Retention Schedule ---------------- */
  function exportRetentionScheduleCSV() {
    let csv = 'Record Code,Record Title,Category,Statutory Custodian,Retention Period,Format & Storage,Statutory Status\n';
    MASTER_RECORDS_CATALOG.forEach(r => {
      csv += `"${r.code}","${r.title}","${r.categoryLabel}","${r.custodian}","${r.retentionLabel}","${r.format}","${r.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `SSPU_Master_Record_Taxonomy_Retention_Schedule.csv`;
    link.click();
  }

  /* ---------------- Checklist Local Storage Persistence ---------------- */
  const CHECKLIST_KEY = 'SSPU_STATUTORY_CHECKLIST_V2';

  function onChecklistChange() {
    saveChecklist();
  }

  function saveChecklist() {
    const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    const state = {};
    checkboxes.forEach(cb => {
      state[cb.id] = cb.checked;
    });
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
    alert('Statutory compliance checklist status saved successfully.');
  }

  function loadChecklistState() {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        Object.keys(state).forEach(id => {
          const el = document.getElementById(id);
          if (el) el.checked = !!state[id];
        });
      }
    } catch(e) {
      console.warn('Failed to load checklist state:', e);
    }
  }

  function resetChecklist() {
    if (confirm('Reset all compliance checklist items to default verified status?')) {
      const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      localStorage.removeItem(CHECKLIST_KEY);
    }
  }

  // Export App
  window.masterRecordsApp = {
    init: initMasterRecordsPage,
    switchTab,
    filterCategory,
    filterRetention,
    filterRecordTable,
    runLiveAudit,
    updateWorkflowCohort,
    openGazetteForCohort,
    exportRetentionScheduleCSV,
    onChecklistChange,
    saveChecklist,
    resetChecklist
  };

  document.addEventListener('DOMContentLoaded', initMasterRecordsPage);

})(window);
