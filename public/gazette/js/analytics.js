/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - PROGRAMME & RESULT ANALYTICS ENGINE (ENTERPRISE)
 * =========================================================================
 */

(function(window) {
  'use strict';

  let cachedSchoolStats = {};
  let cachedCourseStats = {};
  let currentSchoolSearch = '';
  let currentCourseSearch = '';

  function renderAnalytics() {
    const rawRows = dataStore.getRawRows();
    const colMap = dataStore.getColMap();
    const stats = dataStore.getSummaryStats();

    // 1. KPI cards
    const totalRecEl = document.getElementById('anaTotalRecords');
    const totalProgEl = document.getElementById('anaTotalProgrammes');
    const passRateEl = document.getElementById('anaPassRate');
    const bklgRateEl = document.getElementById('anaBacklogRate');

    if (totalRecEl) totalRecEl.innerText = stats.totalRecords.toLocaleString();
    if (totalProgEl) totalProgEl.innerText = stats.totalProgrammes;
    if (passRateEl) passRateEl.innerText = `${stats.passPercentage}%`;
    if (bklgRateEl) {
      const bklgPct = stats.regularAppearances + stats.backlogAppearances > 0
        ? ((stats.backlogAppearances / (stats.regularAppearances + stats.backlogAppearances)) * 100).toFixed(1)
        : 0;
      bklgRateEl.innerText = `${bklgPct}%`;
    }

    // 2. School-wise performance breakdown
    const dIdx = colMap['DepartmentCode'];
    const cIdx = colMap['CM_Course_Name'];
    const resIdx = colMap['Result'];
    const rIdx = colMap['StudentRollNo'];
    const sIdx = colMap['Semester'];
    const attIdx = colMap['AttemptNo'];

    cachedSchoolStats = {};
    const seenApp = new Set();
    let totalPassCandidates = 0;
    let totalFailCandidates = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const dept = row[dIdx] || 'General Studies';
      const roll = row[rIdx];
      const sem = row[sIdx];
      const att = Number(row[attIdx]) || 1;
      const key = `${roll}|${sem}|${att}`;

      if (!cachedSchoolStats[dept]) {
        cachedSchoolStats[dept] = { total: 0, pass: 0, fail: 0, courses: new Set() };
      }

      if (row[cIdx]) cachedSchoolStats[dept].courses.add(row[cIdx]);

      if (!seenApp.has(key)) {
        seenApp.add(key);
        cachedSchoolStats[dept].total++;
        const res = String(row[resIdx] || '').toUpperCase();
        if (res.includes('PASS')) {
          cachedSchoolStats[dept].pass++;
          totalPassCandidates++;
        } else {
          cachedSchoolStats[dept].fail++;
          totalFailCandidates++;
        }
      }
    }

    renderSchoolList();
    renderDistributionWidget(totalPassCandidates, totalFailCandidates);

    // 3. Programme-wise detail table
    cachedCourseStats = {};
    const seenCourseApp = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const course = row[cIdx] || 'Unknown';
      const dept = row[dIdx] || '';
      const roll = row[rIdx];
      const sem = row[sIdx];
      const att = Number(row[attIdx]) || 1;
      const key = `${course}|${roll}|${sem}|${att}`;

      if (!cachedCourseStats[course]) {
        cachedCourseStats[course] = { dept, total: 0, pass: 0, fail: 0, reg: 0, bklg: 0 };
      }

      if (!seenCourseApp.has(key)) {
        seenCourseApp.add(key);
        cachedCourseStats[course].total++;
        if (att === 1) cachedCourseStats[course].reg++; else cachedCourseStats[course].bklg++;
        const res = String(row[resIdx] || '').toUpperCase();
        if (res.includes('PASS')) cachedCourseStats[course].pass++; else cachedCourseStats[course].fail++;
      }
    }

    renderProgrammeTable();
  }

  function renderDistributionWidget(passCount, failCount) {
    const total = passCount + failCount;
    const passPct = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;
    const failPct = total > 0 ? (100 - passPct).toFixed(1) : 0;

    const passBar = document.getElementById('distBarPass');
    const failBar = document.getElementById('distBarFail');
    const passLabel = document.getElementById('distLegendPass');
    const failLabel = document.getElementById('distLegendFail');

    if (passBar) passBar.style.width = `${passPct}%`;
    if (failBar) failBar.style.width = `${failPct}%`;
    if (passLabel) passLabel.innerText = `Passed: ${passCount.toLocaleString()} (${passPct}%)`;
    if (failLabel) failLabel.innerText = `Backlog: ${failCount.toLocaleString()} (${failPct}%)`;
  }

  function renderSchoolList() {
    const schoolContainer = document.getElementById('schoolAnalyticsContainer');
    if (!schoolContainer) return;

    let depts = Object.keys(cachedSchoolStats).sort();
    if (currentSchoolSearch) {
      depts = depts.filter(d => d.toLowerCase().includes(currentSchoolSearch));
    }

    if (depts.length === 0) {
      schoolContainer.innerHTML = `
        <div style="text-align:center; padding:30px; color:#64748b; font-size:12.5px;">
          No schools found matching "${escapeHtml(currentSchoolSearch)}".
        </div>
      `;
      return;
    }

    let html = '';
    depts.forEach(dept => {
      const item = cachedSchoolStats[dept];
      const pct = item.total > 0 ? ((item.pass / item.total) * 100).toFixed(1) : 0;
      
      let pillClass = 'pill-pass-mid';
      let gradient = 'linear-gradient(90deg, #2563eb, #3b82f6)';
      if (pct >= 80) {
        pillClass = 'pill-pass-high';
        gradient = 'linear-gradient(90deg, #16a34a, #22c55e)';
      } else if (pct < 70) {
        pillClass = 'pill-pass-low';
        gradient = 'linear-gradient(90deg, #d97706, #f59e0b)';
      }

      html += `
        <div class="school-perf-item">
          <div class="school-perf-top">
            <span class="school-name-text">${escapeHtml(dept)}</span>
            <span class="school-stats-pill ${pillClass}">
              <span>●</span> ${pct}% Pass
            </span>
          </div>
          <div class="school-perf-meta">
            <span>${item.courses.size} Academic Programmes</span> • 
            <span>${item.total.toLocaleString()} Candidate Appearances</span> (${item.pass.toLocaleString()} Passed, ${item.fail.toLocaleString()} Backlog)
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%; background:${gradient};"></div>
          </div>
        </div>
      `;
    });

    schoolContainer.innerHTML = html;
  }

  function renderProgrammeTable() {
    const tableBody = document.getElementById('courseAnalyticsBody');
    if (!tableBody) return;

    let courses = Object.keys(cachedCourseStats).sort();
    if (currentCourseSearch) {
      courses = courses.filter(c => {
        const item = cachedCourseStats[c];
        return c.toLowerCase().includes(currentCourseSearch) || (item.dept && item.dept.toLowerCase().includes(currentCourseSearch));
      });
    }

    if (courses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:36px; color:#64748b; font-size:13px;">
            No programmes found matching "${escapeHtml(currentCourseSearch)}".
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    courses.forEach((c, idx) => {
      const item = cachedCourseStats[c];
      const pct = item.total > 0 ? ((item.pass / item.total) * 100).toFixed(1) : 0;
      
      let pillClass = 'pill-pass-mid';
      if (pct >= 80) pillClass = 'pill-pass-high';
      else if (pct < 70) pillClass = 'pill-pass-low';

      html += `
        <tr>
          <td style="color:#64748b; font-size:11px;">${idx + 1}</td>
          <td><b>${escapeHtml(c)}</b></td>
          <td><small style="color:#64748b; font-weight:500;">${escapeHtml(item.dept)}</small></td>
          <td style="font-weight:700;">${item.total.toLocaleString()}</td>
          <td class="num-regular">${item.reg.toLocaleString()}</td>
          <td class="num-backlog">${item.bklg.toLocaleString()}</td>
          <td class="num-passed">${item.pass.toLocaleString()}</td>
          <td class="num-failed">${item.fail.toLocaleString()}</td>
          <td>
            <span class="pass-pill-badge ${pillClass}">
              ${pct}%
            </span>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  function filterSchools(query) {
    currentSchoolSearch = (query || '').trim().toLowerCase();
    renderSchoolList();
  }

  function filterProgrammes(query) {
    currentCourseSearch = (query || '').trim().toLowerCase();
    renderProgrammeTable();
  }

  async function initAnalyticsPage() {
    commonUI.renderNavbar('analytics');
    const initResult = await dataStore.init();
    commonUI.updateNavStatus(initResult.count);
    renderAnalytics();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // React to cross-tab updates dynamically
  window.addEventListener('sspu-data-updated', () => {
    initAnalyticsPage();
  });

  window.analyticsApp = {
    initAnalyticsPage,
    filterSchools,
    filterProgrammes
  };

})(window);
