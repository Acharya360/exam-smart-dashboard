/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - COMMON UI & SHARED UTILITIES
 * =========================================================================
 */

(function(window) {
  'use strict';

  /* ---------------- Dark / Light Mode ---------------- */
  function initTheme() {
    if (!document.body) return;
    let saved = 'light';
    try {
      saved = localStorage.getItem('SSPU_THEME') || 'light';
    } catch (e) {}
    if (saved === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  function toggleTheme() {
    if (!document.body) return;
    document.body.classList.toggle('dark-mode');
    const isDark = document.body ? document.body.classList.contains('dark-mode') : false;
    try {
      localStorage.setItem('SSPU_THEME', isDark ? 'dark' : 'light');
    } catch (e) {}
    const themeBtnText = document.getElementById('themeBtnText');
    if (themeBtnText) {
      themeBtnText.innerText = isDark ? 'Light' : 'Dark';
    }
    const sideThemeText = document.getElementById('sidebarThemeBtnText');
    if (sideThemeText) {
      sideThemeText.innerText = isDark ? 'Light Mode' : 'Dark Mode';
    }
  }

  /* ---------------- Back Navigation ---------------- */
  function goBack() {
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      const isPagesFolder = window.location.pathname.includes('/pages/');
      window.location.href = isPagesFolder ? '../index.html' : 'index.html';
    }
  }

  /* ---------------- Floating Navigation (Back & Scroll-To-Top) ---------------- */
  function initFloatingNav(activePage) {
    if (document.getElementById('floatingNavContainer')) return;
    if (!document.body) return;

    const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
    const isDashboard = activePage === 'dashboard' || path.endsWith('index.html') || path === '/' || (!path.includes('/pages/') && !path.includes('.html'));
    const isPagesFolder = path.includes('/pages/') || 
                          path.includes('gazette.html') || 
                          path.includes('grade-cards.html') || 
                          path.includes('data-hub.html') || 
                          path.includes('student-names.html') || 
                          path.includes('master-records.html') || 
                          path.includes('analytics.html');

    const container = document.createElement('div');
    container.className = 'floating-nav-container no-print';
    container.id = 'floatingNavContainer';

    let backBtnHtml = '';
    let modulesBtnHtml = '';

    // Show floating back and modules buttons ONLY on inner module pages (never on dashboard)
    if (!isDashboard && isPagesFolder) {
      backBtnHtml = `
        <button class="floating-back-btn" onclick="commonUI.goBack()" title="Return to Previous Page / Dashboard">
          <span class="floating-back-arrow">←</span>
          <span class="floating-back-label">Back</span>
        </button>
      `;
      modulesBtnHtml = `
        <button class="floating-modules-btn" onclick="commonUI.toggleSidebar()" title="Toggle Navigation Sidebar Modules">
          <span class="floating-modules-icon">☰</span>
          <span class="floating-modules-label">Modules</span>
        </button>
      `;
    }

    const scrollTopBtnHtml = `
      <button class="floating-scroll-top-btn" id="floatingScrollTopBtn" onclick="window.scrollTo({top:0, behavior:'smooth'})" title="Scroll to top of page">
        <span class="floating-top-arrow">↑</span>
      </button>
    `;

    container.innerHTML = backBtnHtml + modulesBtnHtml + scrollTopBtnHtml;
    document.body.appendChild(container);

    // Scroll listener to reveal the scroll-to-top arrow button
    window.addEventListener('scroll', () => {
      const topBtn = document.getElementById('floatingScrollTopBtn');
      if (topBtn) {
        if (window.scrollY > 250) {
          topBtn.classList.add('visible');
        } else {
          topBtn.classList.remove('visible');
        }
      }
    }, { passive: true });
  }

  // Auto-mount floating back navigation on module pages
  function autoMountFloatingNav() {
    const path = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
    const isDashboard = path.endsWith('index.html') || path === '/' || (!path.includes('/pages/') && !path.includes('.html'));
    if (!isDashboard) {
      initFloatingNav('module');
    } else {
      initFloatingNav('dashboard');
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', autoMountFloatingNav);
  } else {
    autoMountFloatingNav();
  }

  /* ---------------- Toast Notification System ---------------- */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '⚠️';
    else if (type === 'warning') icon = '🔔';

    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  /* ---------------- HTML / Attribute Escaping (XSS-safe interpolation) ---------------- */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // For values embedded inside inline event handlers (JS string within an HTML attribute)
  function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    const js = String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');
    return escapeHtml(js);
  }

  /* ---------------- Student Names Persistence ---------------- */
  const NAMES_KEY = 'SSPU_STUDENT_NAMES';

  function getStudentNamesMap() {
    try {
      const data = localStorage.getItem(NAMES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  function saveStudentName(roll, name) {
    const map = getStudentNamesMap();
    if (name && name.trim()) {
      map[roll] = name.trim();
    } else {
      delete map[roll];
    }
    localStorage.setItem(NAMES_KEY, JSON.stringify(map));
  }

  function saveBulkStudentNames(newMap) {
    const current = getStudentNamesMap();
    const merged = Object.assign({}, current, newMap);
    localStorage.setItem(NAMES_KEY, JSON.stringify(merged));
    return Object.keys(merged).length;
  }

  function clearAllStudentNames() {
    localStorage.removeItem(NAMES_KEY);
  }

  /* ---------------- URL Query Parameters ---------------- */
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const obj = {};
    for (const [key, val] of params.entries()) {
      obj[key] = val;
    }
    return obj;
  }

  /* ---------------- Sidebar Navigation Drawer ---------------- */
  function toggleSidebar(forceState) {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;

    const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', isOpen);
    if (backdrop) backdrop.classList.toggle('open', isOpen);
    try {
      localStorage.setItem('SSPU_SIDEBAR_OPEN', isOpen ? '1' : '0');
    } catch (e) {}
  }

  // Close sidebar on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleSidebar(false);
    }
  });

  /* ---------------- App Navigation Bar & Sidebar ---------------- */
  function renderNavbar(activePage = 'dashboard') {
    const rawPath = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    const isPagesFolder = rawPath.includes('/pages/') ||
                          rawPath.endsWith('/gazette.html') ||
                          rawPath.endsWith('/grade-cards.html') ||
                          rawPath.endsWith('/data-hub.html') ||
                          rawPath.endsWith('/student-names.html') ||
                          rawPath.endsWith('/analytics.html') ||
                          rawPath.endsWith('/master-records.html');

    const homeUrl = isPagesFolder ? '../index.html' : 'index.html';
    const logoUrl = isPagesFolder ? '../symbioais logo.jpeg' : 'symbioais logo.jpeg';
    const getPageUrl = (pageName) => isPagesFolder ? `${pageName}.html` : `pages/${pageName}.html`;

    const isDark = document.body ? document.body.classList.contains('dark-mode') : false;

    // 1. Top Navigation Bar HTML
    const navHtml = `
      <nav class="app-navbar no-print">
        <div style="display:flex; align-items:center;">
          <button class="nav-sidebar-toggle" onclick="commonUI.toggleSidebar()" title="Toggle Navigation Sidebar Modules">
            <span class="sidebar-toggle-icon">☰</span>
            <span class="sidebar-toggle-text">Menu</span>
          </button>

          <a href="${homeUrl}" class="nav-brand">
            <img src="${logoUrl}" alt="SSPU Logo" class="nav-brand-logo" onerror="this.style.display='none'">
            <div class="nav-brand-text">
              <span class="nav-brand-title">Symbiosis Skills & Professional University</span>
              <span class="nav-brand-subtitle">Result Gazette & Tabulation Register System</span>
            </div>
          </a>
        </div>

        <ul class="nav-menu">
          <li>
            <a href="/" class="nav-link" title="Back to Admin Dashboard">
              <span class="nav-icon">🖥️</span> Admin Portal
            </a>
          </li>
          <li>
            <a href="${homeUrl}" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
              <span class="nav-icon">🏠</span> Gazette Home
            </a>
          </li>
          <li>
            <a href="${getPageUrl('gazette')}" class="nav-link ${activePage === 'gazette' ? 'active' : ''}">
              <span class="nav-icon">📊</span> Result Gazette (A3)
            </a>
          </li>
          <li>
            <a href="${getPageUrl('grade-cards')}" class="nav-link ${activePage === 'grade-cards' ? 'active' : ''}">
              <span class="nav-icon">🪪</span> Grade Cards (A4)
            </a>
          </li>
          <li>
            <a href="${getPageUrl('data-hub')}" class="nav-link ${activePage === 'data-hub' ? 'active' : ''}">
              <span class="nav-icon">📂</span> Excel Data Hub
            </a>
          </li>
          <li>
            <a href="${getPageUrl('student-names')}" class="nav-link ${activePage === 'student-names' ? 'active' : ''}">
              <span class="nav-icon">👥</span> Student Names
            </a>
          </li>
          <li>
            <a href="${getPageUrl('analytics')}" class="nav-link ${activePage === 'analytics' ? 'active' : ''}">
              <span class="nav-icon">📈</span> Analytics
            </a>
          </li>
          <li>
            <a href="${getPageUrl('master-records')}" class="nav-link ${activePage === 'master-records' ? 'active' : ''}">
              <span class="nav-icon">🏛️</span> Master Records
            </a>
          </li>
        </ul>

        <div class="nav-actions">
          <div class="data-status-badge" id="navDataStatus">
            <span class="data-status-dot"></span>
            <span id="navRecordCount">Loading...</span>
          </div>

          <button class="btn-theme-toggle" onclick="commonUI.toggleTheme()" title="Toggle Dark/Light Mode">
            <span id="themeIcon">🌓</span>
            <span id="themeBtnText">${isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </nav>
    `;

    // 2. Modular Navigation Sidebar HTML
    const sidebarHtml = `
      <aside class="app-sidebar no-print" id="appSidebar">
        <div class="sidebar-header">
          <a href="${homeUrl}" class="sidebar-brand">
            <img src="${logoUrl}" alt="SSPU" class="sidebar-logo" onerror="this.style.display='none'">
            <div class="sidebar-brand-text">
              <span class="sidebar-univ">SSPU PUNE</span>
              <span class="sidebar-sub">Examination Modules</span>
            </div>
          </a>
          <button class="sidebar-close-btn" onclick="commonUI.toggleSidebar(false)" title="Close Sidebar (Esc)">✕</button>
        </div>

        <div class="sidebar-nav-scroll">
          <div class="sidebar-group-title">ADMIN PORTAL</div>
          <ul class="sidebar-menu">
            <li>
              <a href="/" class="sidebar-link">
                <span class="sidebar-icon">🖥️</span>
                <span class="sidebar-label">Admin Dashboard</span>
                <span class="sidebar-badge" style="background:#fef3c7; color:#b45309;">ERP</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-group-title">EXAMINATION REGISTERS</div>
          <ul class="sidebar-menu">
            <li>
              <a href="${getPageUrl('gazette')}" class="sidebar-link ${activePage === 'gazette' ? 'active' : ''}">
                <span class="sidebar-icon">📊</span>
                <span class="sidebar-label">Result Gazette</span>
                <span class="sidebar-badge">A3 Register</span>
              </a>
            </li>
            <li>
              <a href="${getPageUrl('grade-cards')}" class="sidebar-link ${activePage === 'grade-cards' ? 'active' : ''}">
                <span class="sidebar-icon">🪪</span>
                <span class="sidebar-label">Student Grade Cards</span>
                <span class="sidebar-badge">A4 Marksheet</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-group-title">INSTITUTIONAL GOVERNANCE</div>
          <ul class="sidebar-menu">
            <li>
              <a href="${getPageUrl('master-records')}" class="sidebar-link ${activePage === 'master-records' ? 'active' : ''}">
                <span class="sidebar-icon">🏛️</span>
                <span class="sidebar-label">Master Records &amp; Governance</span>
                <span class="sidebar-badge" style="background:#e0f2fe; color:#0369a1;">Audit Ready</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-group-title">DATA MANAGEMENT &amp; TOOLS</div>
          <ul class="sidebar-menu">
            <li>
              <a href="${getPageUrl('data-hub')}" class="sidebar-link ${activePage === 'data-hub' ? 'active' : ''}">
                <span class="sidebar-icon">📂</span>
                <span class="sidebar-label">Excel Data Hub</span>
                <span class="sidebar-badge">Master Import</span>
              </a>
            </li>
            <li>
              <a href="${getPageUrl('student-names')}" class="sidebar-link ${activePage === 'student-names' ? 'active' : ''}">
                <span class="sidebar-icon">👥</span>
                <span class="sidebar-label">Student Names Directory</span>
                <span class="sidebar-badge">PRN Matcher</span>
              </a>
            </li>
            <li>
              <a href="${getPageUrl('analytics')}" class="sidebar-link ${activePage === 'analytics' ? 'active' : ''}">
                <span class="sidebar-icon">📈</span>
                <span class="sidebar-label">Result &amp; Batch Analytics</span>
                <span class="sidebar-badge">Overview</span>
              </a>
            </li>
            <li>
              <a href="${homeUrl}" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
                <span class="sidebar-icon">🏠</span>
                <span class="sidebar-label">Main Dashboard</span>
                <span class="sidebar-badge">Portal</span>
              </a>
            </li>
          </ul>

          <div class="sidebar-group-title">SYSTEM STATUS</div>
          <div class="sidebar-quick-card">
            <div class="sidebar-status-pill">
              <span class="pulse-dot"></span>
              <span id="sidebarStatusText">140,799 Records Active</span>
            </div>
            <div class="sidebar-sub-meta">Official University Tabulation Engine</div>
          </div>
        </div>

        <div class="sidebar-footer">
          <button class="sidebar-action-btn" onclick="commonUI.toggleTheme()" title="Toggle Dark/Light Mode">
            <span>🌓</span>
            <span id="sidebarThemeBtnText">${isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button class="sidebar-action-btn" onclick="commonUI.goBack()" title="Back to Previous Page">
            <span>←</span> Back
          </button>
        </div>
      </aside>
      <div class="sidebar-backdrop no-print" id="sidebarBackdrop" onclick="commonUI.toggleSidebar(false)"></div>
    `;

    const placeholder = document.getElementById('navbarPlaceholder');
    if (placeholder) {
      placeholder.innerHTML = navHtml + sidebarHtml;
    } else {
      document.body.insertAdjacentHTML('afterbegin', navHtml + sidebarHtml);
    }

    // Initialize floating navigation (Back button, Modules Sidebar & Scroll-to-top)
    initFloatingNav(activePage);
  }

  function updateNavStatus(count) {
    const el = document.getElementById('navRecordCount');
    if (el) {
      el.innerText = `${Number(count).toLocaleString()} Records Ready`;
    }
    const sideEl = document.getElementById('sidebarStatusText');
    if (sideEl) {
      sideEl.innerText = `${Number(count).toLocaleString()} Records Active`;
    }
  }

  // Auto initialize theme safely when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Listen for cross-tab dataset updates via storage event
  window.addEventListener('storage', (e) => {
    if (e.key === 'SSPU_LAST_DATA_UPDATE') {
      try {
        window.dispatchEvent(new CustomEvent('sspu-data-updated'));
      } catch (err) {}
    }
  });

  // Export public API
  window.commonUI = {
    initTheme,
    toggleTheme,
    goBack,
    initFloatingNav,
    showToast,
    escapeHtml,
    escapeAttr,
    getStudentNamesMap,
    saveStudentName,
    saveBulkStudentNames,
    clearAllStudentNames,
    getUrlParams,
    renderNavbar,
    updateNavStatus,
    toggleSidebar
  };

})(window);
