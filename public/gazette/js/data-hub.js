/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - EXCEL IMPORT & DATA HUB ENGINE
 * =========================================================================
 */

(function(window) {
  'use strict';

  let stagedFile = null;
  let isUploading = false;

  function initDropZone() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('modalFileInput');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!stagedFile) dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      if (isUploading) return;
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    }, false);

    fileInput.addEventListener('change', (e) => {
      if (isUploading) return;
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  function handleFileSelection(file) {
    if (!file) return;
    stagedFile = file;

    const dropZone = document.getElementById('uploadDropZone');
    const promptState = document.getElementById('dropPromptState');
    const attachedState = document.getElementById('dropAttachedState');
    const nameEl = document.getElementById('attachedFileName');
    const sizeTextEl = document.getElementById('attachedFileSizeText');
    const modDateEl = document.getElementById('attachedFileModDate');
    const sheetsEl = document.getElementById('attachedFileSheets');
    const actionsBar = document.getElementById('uploadActionsBar');
    const progressWrap = document.getElementById('uploadProgressWrap');

    if (promptState) promptState.style.display = 'none';
    if (attachedState) attachedState.style.display = 'flex';
    if (dropZone) dropZone.classList.add('is-attached');

    if (nameEl) nameEl.innerText = file.name;
    const sizeStr = file.size > 1048576 
      ? `${(file.size / 1048576).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    if (sizeTextEl) sizeTextEl.innerText = sizeStr;
    if (modDateEl) {
      modDateEl.innerText = file.lastModified 
        ? new Date(file.lastModified).toLocaleDateString() 
        : 'Today';
    }
    if (sheetsEl) {
      sheetsEl.innerText = file.name.endsWith('.csv') ? 'CSV Table' : 'Reading sheets...';
    }

    // Attempt fast read of sheet names
    if (typeof XLSX !== 'undefined' && !file.name.endsWith('.csv')) {
      const sliceReader = new FileReader();
      sliceReader.onload = function(evt) {
        try {
          const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array', sheetRows: 1 });
          if (wb && wb.SheetNames && sheetsEl) {
            sheetsEl.innerText = `${wb.SheetNames.length} Sheet(s): ${wb.SheetNames.slice(0, 2).join(', ')}${wb.SheetNames.length > 2 ? '...' : ''}`;
          }
        } catch (e) {
          if (sheetsEl) sheetsEl.innerText = 'Excel Sheets';
        }
      };
      sliceReader.readAsArrayBuffer(file.slice(0, Math.min(file.size, 524288)));
    }

    if (actionsBar) actionsBar.style.display = 'grid';
    if (progressWrap) progressWrap.style.display = 'none';

    commonUI.showToast(`Attached file: ${file.name} (${sizeStr})`, 'info');
  }

  function clearStagedFile() {
    if (isUploading) return;
    stagedFile = null;

    const dropZone = document.getElementById('uploadDropZone');
    const promptState = document.getElementById('dropPromptState');
    const attachedState = document.getElementById('dropAttachedState');
    const actionsBar = document.getElementById('uploadActionsBar');
    const fileInput = document.getElementById('modalFileInput');
    const progressWrap = document.getElementById('uploadProgressWrap');

    if (promptState) promptState.style.display = 'flex';
    if (attachedState) attachedState.style.display = 'none';
    if (dropZone) dropZone.classList.remove('is-attached');
    if (actionsBar) actionsBar.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';
    if (fileInput) fileInput.value = '';

    commonUI.showToast('Cleared attached file', 'info');
  }

  function updateProgressBar(percent, stepText, subText, showSpinner = true) {
    const wrap = document.getElementById('uploadProgressWrap');
    const bar = document.getElementById('progressBarFill');
    const pctEl = document.getElementById('progressPercent');
    const stepEl = document.getElementById('progressStepMsg');
    const subEl = document.getElementById('progressSubMsg');
    const spinner = document.getElementById('progressSpinner');

    if (wrap) wrap.style.display = 'block';
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (pctEl) pctEl.innerText = `${Math.round(percent)}%`;
    if (stepEl) stepEl.innerText = stepText;
    if (subEl) subEl.innerText = subText || '';
    if (spinner) spinner.style.display = showSpinner ? 'inline-block' : 'none';
  }

  async function executeUpload(mode = 'append') {
    if (!stagedFile || isUploading) {
      alert('Please select or attach an Excel spreadsheet first.');
      return;
    }

    const confirmMsg = mode === 'replace'
      ? 'WARNING: This will CLEAR all existing examination records and replace them with the uploaded spreadsheet.\n\nProceed?'
      : 'This will merge and append the rows from this spreadsheet into your active database.\n\nProceed?';

    if (!confirm(confirmMsg)) return;

    isUploading = true;
    const btnAppend = document.getElementById('btnAppend');
    const btnReplace = document.getElementById('btnReplace');
    if (btnAppend) btnAppend.disabled = true;
    if (btnReplace) btnReplace.disabled = true;

    updateProgressBar(5, 'Reading file bytes...', 'Preparing file reader...', true);

    const reader = new FileReader();

    reader.onprogress = function(e) {
      if (e.lengthComputable) {
        const readPct = (e.loaded / e.total) * 35;
        updateProgressBar(Math.round(5 + readPct), `Reading spreadsheet bytes (${Math.round((e.loaded / 1048576) * 10) / 10} MB)...`, 'Loading into memory...');
      }
    };

    reader.onload = async function(e) {
      try {
        updateProgressBar(45, 'Parsing workbook sheets...', 'Extracting tables with SheetJS parser...', true);
        
        // Yield to browser paint
        await new Promise(r => setTimeout(r, 60));

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Intelligent sheet detection: if multiple sheets, prioritize master/data/cleaned sheet or sheet with most rows
        let targetSheetName = workbook.SheetNames[0];
        if (workbook.SheetNames.length > 1) {
          const preferred = workbook.SheetNames.find(s => /master|result|gazette|clean|data/i.test(s));
          if (preferred) {
            targetSheetName = preferred;
          } else {
            let maxRows = 0;
            workbook.SheetNames.forEach(s => {
              const ref = workbook.Sheets[s] ? workbook.Sheets[s]['!ref'] : null;
              if (ref) {
                const range = XLSX.utils.decode_range(ref);
                const count = range.e.r - range.s.r + 1;
                if (count > maxRows) {
                  maxRows = count;
                  targetSheetName = s;
                }
              }
            });
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];

        updateProgressBar(65, 'Extracting records...', `Reading sheet "${targetSheetName}" rows...`, true);
        await new Promise(r => setTimeout(r, 40));

        const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (sheetRows.length < 2) {
          alert('Spreadsheet appears empty or has no header row.');
          resetUploadState();
          return;
        }

        const headers = sheetRows[0].map(h => String(h || '').trim());
        const dataRows = sheetRows.slice(1).filter(r => r && r.length > 0 && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));

        updateProgressBar(85, 'Saving to database...', `Indexing ${dataRows.length.toLocaleString()} rows into local memory...`, true);
        await new Promise(r => setTimeout(r, 50));

        const fileMeta = stagedFile ? {
          fileName: stagedFile.name,
          fileSize: stagedFile.size,
          lastModified: stagedFile.lastModified
        } : {};

        const totalRecords = await dataStore.saveCustomUpload(dataRows, headers, mode, fileMeta);

        if (totalRecords === null) {
          // Append rejected due to header mismatch; error already surfaced to user
          resetUploadState();
          return;
        }

        updateProgressBar(100, 'Import Completed Successfully!', `Active database now contains ${totalRecords.toLocaleString()} records.`, false);
        commonUI.updateNavStatus(totalRecords);
        updateDataStats();

        commonUI.showToast(`Successfully ${mode === 'replace' ? 'replaced' : 'appended'} database! Active records: ${totalRecords.toLocaleString()}`, 'success');

        setTimeout(() => {
          resetUploadState();
        }, 2200);

      } catch (err) {
        console.error('File parsing error:', err);
        alert('Failed to parse Excel file: ' + err.message);
        resetUploadState();
      }
    };

    reader.onerror = function() {
      alert('Error reading spreadsheet file.');
      resetUploadState();
    };

    reader.readAsArrayBuffer(stagedFile);
  }

  function resetUploadState() {
    isUploading = false;
    const btnAppend = document.getElementById('btnAppend');
    const btnReplace = document.getElementById('btnReplace');
    if (btnAppend) btnAppend.disabled = false;
    if (btnReplace) btnReplace.disabled = false;
    clearStagedFile();
  }

  async function restoreDefault() {
    if (!confirm('Reset to the official embedded SSPU master dataset? Any custom uploaded files will be cleared.')) return;
    const count = await dataStore.restoreDefault();
    commonUI.updateNavStatus(count);
    updateDataStats();
    commonUI.showToast(`Restored default master dataset (${count.toLocaleString()} records)`, 'success');
  }

  async function clearAllRecords() {
    if (!confirm('DANGER: Are you sure you want to completely clear ALL examination records from memory?')) return;
    const count = await dataStore.clearAll();
    commonUI.updateNavStatus(count);
    updateDataStats();
    commonUI.showToast('Cleared all records from database', 'warning');
  }

  function downloadBlankTemplate() {
    window.location.href = '../SSPU_Gazette_Blank_Template.xlsx';
  }

  function downloadDataTemplate() {
    window.location.href = '../SSPU_Gazette_Data_Template.xlsx';
  }

  function updateDataStats() {
    const stats = dataStore.getSummaryStats();
    const datasetInfo = (typeof dataStore.getDatasetInfo === 'function') 
      ? dataStore.getDatasetInfo() 
      : { fileName: 'Master_File.xlsx', source: 'Embedded Master', fileSize: '35.9 MB' };
    const periods = dataStore.getFilteredDistinctValues('AcademicPeriod') || [];

    // 1. Update Active Attached File Card (Left panel)
    const activeFileNameEl = document.getElementById('activeDbFileName');
    const activeSourceBadgeEl = document.getElementById('activeFileSourceBadge');
    const activeFileSizeEl = document.getElementById('activeDbFileSize');
    const activeRowCountEl = document.getElementById('activeDbRowCount');
    const activeProgCountEl = document.getElementById('activeDbProgCount');
    const activePeriodsEl = document.getElementById('activeDbPeriods');
    const activeStatusTextEl = document.getElementById('activeFileStatusText');

    if (activeFileNameEl) activeFileNameEl.innerText = datasetInfo.fileName || 'Master_File.xlsx';
    if (activeSourceBadgeEl) activeSourceBadgeEl.innerText = datasetInfo.isCustom ? 'Custom Upload' : 'Embedded Master';
    if (activeFileSizeEl) activeFileSizeEl.innerText = datasetInfo.fileSize || '35.9 MB';
    if (activeRowCountEl) activeRowCountEl.innerText = stats.totalRecords.toLocaleString();
    if (activeProgCountEl) activeProgCountEl.innerText = stats.totalProgrammes;
    if (activePeriodsEl) {
      activePeriodsEl.innerText = periods.length > 0 
        ? `${periods.length} Batches (${periods[0]}${periods.length > 1 ? ' - ' + periods[periods.length - 1] : ''})` 
        : '0 Batches';
    }
    if (activeStatusTextEl) {
      activeStatusTextEl.innerText = stats.totalRecords > 0 
        ? 'Active Master File Attached' 
        : 'No Dataset Attached';
    }

    // 2. Update Active Database Status (Right panel)
    const recEl = document.getElementById('statRecCount');
    const progEl = document.getElementById('statProgCount');
    const studEl = document.getElementById('statStudCount');
    const passEl = document.getElementById('statPassPct');
    const statActiveFileNameEl = document.getElementById('statActiveFileName');
    const statPeriodRangeEl = document.getElementById('statPeriodRange');

    if (recEl) recEl.innerText = stats.totalRecords.toLocaleString();
    if (progEl) progEl.innerText = stats.totalProgrammes;
    if (studEl) studEl.innerText = stats.uniqueStudents ? stats.uniqueStudents.toLocaleString() : '—';
    if (passEl) passEl.innerText = `${stats.passPercentage}%`;
    if (statActiveFileNameEl) statActiveFileNameEl.innerText = datasetInfo.fileName || 'Master_File.xlsx';
    if (statPeriodRangeEl) {
      statPeriodRangeEl.innerText = periods.length > 0 
        ? `${periods[0]}${periods.length > 1 ? ' to ' + periods[periods.length - 1] : ''}` 
        : 'None';
    }
  }

  async function initDataHubPage() {
    commonUI.renderNavbar('data-hub');
    const initResult = await dataStore.init();
    commonUI.updateNavStatus(initResult.count);
    initDropZone();
    updateDataStats();
  }

  // React to cross-tab updates dynamically
  window.addEventListener('sspu-data-updated', () => {
    updateDataStats();
  });

  window.dataHubApp = {
    initDataHubPage,
    clearStagedFile,
    executeUpload,
    restoreDefault,
    clearAllRecords,
    downloadBlankTemplate,
    downloadDataTemplate
  };

})(window);
