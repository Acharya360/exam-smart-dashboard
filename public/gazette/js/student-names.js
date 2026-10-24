/**
 * =========================================================================
 * SSPU GAZETTE SYSTEM - STUDENT NAMES DIRECTORY & IMPORT ENGINE
 * =========================================================================
 */

(function(window) {
  'use strict';

  let currentSearchQuery = '';
  let showAllRows = false;
  let stagedFileData = null;
  let isProcessing = false;

  /* ---------------- UI Render: Directory Table ---------------- */
  function renderNamesDirectory() {
    const tableBody = document.getElementById('namesDirectoryBody');
    const totalCountEl = document.getElementById('totalNamesCount');
    const heroCountEl = document.getElementById('heroNamesBadge');
    if (!tableBody) return;

    const namesMap = commonUI.getStudentNamesMap();
    const rolls = Object.keys(namesMap);

    let filteredRolls = rolls;
    if (currentSearchQuery) {
      filteredRolls = rolls.filter(r => {
        const name = (namesMap[r] || '').toLowerCase();
        return r.toLowerCase().includes(currentSearchQuery) || name.includes(currentSearchQuery);
      });
    }

    if (totalCountEl) {
      totalCountEl.innerText = `${rolls.length.toLocaleString()} Registered Names`;
    }
    if (heroCountEl) {
      heroCountEl.innerText = `${rolls.length.toLocaleString()} Active PRN Mappings`;
    }

    if (filteredRolls.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:36px 20px; color:#64748b;">
            <div style="font-size:26px; margin-bottom:8px;">👥</div>
            <div style="font-size:13px; font-weight:600; color:var(--sspu-navy);">
              ${rolls.length === 0 ? 'No student names registered yet' : 'No students found matching your search'}
            </div>
            <div style="font-size:11.5px; margin-top:4px;">
              ${rolls.length === 0 ? 'Upload an Excel / CSV spreadsheet or paste TSV data to link candidate full names.' : 'Try adjusting your PRN or Name search query above.'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const displayLimit = showAllRows ? filteredRolls.length : Math.min(filteredRolls.length, 100);
    const visibleRolls = filteredRolls.slice(0, displayLimit);

    let html = '';
    visibleRolls.forEach((roll, idx) => {
      const name = namesMap[roll];
      html += `
        <tr>
          <td style="color:#64748b; font-size:11px;">${idx + 1}</td>
          <td><b style="letter-spacing:0.3px;">${escapeHtml(roll)}</b></td>
          <td class="student-name-cell" onclick="studentNamesApp.editRowName('${escapeAttr(roll)}', this)" title="Click to edit name directly">
            <span class="name-display">${escapeHtml(name)}</span>
            <span style="font-size:10px; color:#94a3b8; margin-left:6px;">✎</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="studentNamesApp.deleteRowName('${escapeAttr(roll)}')" style="color:#c53030; padding:2px 8px; font-size:10px;" title="Remove this student name mapping">Remove</button>
          </td>
        </tr>
      `;
    });

    if (filteredRolls.length > 100 && !showAllRows) {
      html += `
        <tr>
          <td colspan="4" style="text-align:center; font-size:11.5px; color:#64748b; padding:10px; background:var(--sspu-light);">
            Showing first 100 of ${filteredRolls.length.toLocaleString()} entries. 
            <button class="btn btn-secondary btn-sm" onclick="studentNamesApp.toggleShowAll(true)" style="margin-left:8px; padding:2px 8px; font-size:11px;">Show All ${filteredRolls.length.toLocaleString()}</button>
          </td>
        </tr>
      `;
    } else if (showAllRows && filteredRolls.length > 100) {
      html += `
        <tr>
          <td colspan="4" style="text-align:center; font-size:11px; color:#64748b; padding:8px; background:var(--sspu-light);">
            Showing all ${filteredRolls.length.toLocaleString()} entries. 
            <button class="btn btn-secondary btn-sm" onclick="studentNamesApp.toggleShowAll(false)" style="margin-left:8px; padding:1px 6px; font-size:10px;">Collapse to 100</button>
          </td>
        </tr>
      `;
    }

    tableBody.innerHTML = html;
  }

  function toggleShowAll(show) {
    showAllRows = Boolean(show);
    renderNamesDirectory();
  }

  function handleSearchInput(query) {
    currentSearchQuery = (query || '').trim().toLowerCase();
    renderNamesDirectory();
  }

  /* ---------------- Tab Switcher ---------------- */
  function switchTab(tabName) {
    const uploadTabBtn = document.getElementById('tabUploadBtn');
    const pasteTabBtn = document.getElementById('tabPasteBtn');
    const uploadTabContent = document.getElementById('uploadTabContent');
    const pasteTabContent = document.getElementById('pasteTabContent');

    if (tabName === 'upload') {
      if (uploadTabBtn) uploadTabBtn.classList.add('active');
      if (pasteTabBtn) pasteTabBtn.classList.remove('active');
      if (uploadTabContent) uploadTabContent.classList.add('active');
      if (pasteTabContent) pasteTabContent.classList.remove('active');
    } else {
      if (uploadTabBtn) uploadTabBtn.classList.remove('active');
      if (pasteTabBtn) pasteTabBtn.classList.add('active');
      if (uploadTabContent) uploadTabContent.classList.remove('active');
      if (pasteTabContent) pasteTabContent.classList.add('active');
    }
  }

  /* ---------------- Template Generator & Downloader ---------------- */
  function downloadTemplate(format = 'xlsx') {
    const sampleData = [
      ['StudentRollNo', 'StudentName'],
      ['2100810001', 'Aarav Sharma'],
      ['2100810002', 'Ananya Verma'],
      ['2100810003', 'Rohan Patil'],
      ['2100810004', 'Pooja Deshmukh'],
      ['2100810005', 'Aditya Kulkarni'],
      ['2100810006', 'Sneha Joshi'],
      ['2100810007', 'Rahul Mehta'],
      ['2100810008', 'Priya Nair']
    ];

    if (format === 'csv') {
      let csvContent = 'StudentRollNo,StudentName\r\n';
      for (let i = 1; i < sampleData.length; i++) {
        csvContent += `${sampleData[i][0]},"${sampleData[i][1]}"\r\n`;
      }
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SSPU_Student_Names_Template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      commonUI.showToast('Downloaded official Student Names CSV template!', 'success');
      return;
    }

    // Default: XLSX
    if (typeof XLSX !== 'undefined') {
      try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(sampleData);
        ws['!cols'] = [{ wch: 18 }, { wch: 28 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Student_Names_Template');
        XLSX.writeFile(wb, 'SSPU_Student_Names_Template.xlsx');
        commonUI.showToast('Downloaded official Student Names Excel template (.xlsx)!', 'success');
        return;
      } catch (e) {
        console.warn('In-memory XLSX generation failed, falling back to static file:', e);
      }
    }

    // Fallback direct link to physical template
    const a = document.createElement('a');
    a.href = '../SSPU_Student_Names_Template.xlsx';
    a.download = 'SSPU_Student_Names_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    commonUI.showToast('Downloaded official Student Names Excel template (.xlsx)!', 'success');
  }

  /* ---------------- Drag & Drop and File Picker Engine ---------------- */
  function initDropZone() {
    const dropZone = document.getElementById('namesDropZone');
    const fileInput = document.getElementById('namesFileInput');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!stagedFileData && !isProcessing) {
          dropZone.classList.add('dragover');
        }
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
      if (isProcessing) return;
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        processSelectedFile(files[0]);
      }
    }, false);
  }

  function handleFileInput(input) {
    if (isProcessing) return;
    if (input.files && input.files.length > 0) {
      processSelectedFile(input.files[0]);
    }
  }

  /* ---------------- Robust Spreadsheet & CSV Parsing ---------------- */
  function processSelectedFile(file) {
    if (!file) return;

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValid) {
      commonUI.showToast('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.', 'warning');
      return;
    }

    isProcessing = true;
    showDropProcessingState(file.name);

    const reader = new FileReader();
    const isCsv = lowerName.endsWith('.csv');

    reader.onload = function(evt) {
      try {
        let parseResult;
        if (typeof XLSX !== 'undefined') {
          const data = isCsv ? evt.target.result : new Uint8Array(evt.target.result);
          const readType = isCsv ? 'string' : 'array';
          const wb = XLSX.read(data, { type: readType });
          parseResult = parseWorkbookData(wb);
        } else if (isCsv) {
          parseResult = parseCsvText(evt.target.result);
        } else {
          throw new Error('Spreadsheet parser library (XLSX) not ready. Please refresh the page.');
        }

        if (!parseResult.success) {
          clearStagedFile();
          isProcessing = false;
          alert(parseResult.error || 'Could not extract student names from file. Please ensure columns: StudentRollNo and StudentName.');
          return;
        }

        stagedFileData = {
          file: file,
          map: parseResult.map,
          count: parseResult.count,
          preview: parseResult.preview,
          skipped: parseResult.skipped,
          sheetName: parseResult.sheetName
        };

        renderStagedFileState(file, parseResult);
        isProcessing = false;
        commonUI.showToast(`Found ${parseResult.count.toLocaleString()} valid student names in "${file.name}"!`, 'info');

      } catch (err) {
        console.error('Spreadsheet parse exception:', err);
        clearStagedFile();
        isProcessing = false;
        alert('Failed to parse spreadsheet: ' + err.message);
      }
    };

    reader.onerror = function() {
      clearStagedFile();
      isProcessing = false;
      alert('File reading error occurred. Please try again.');
    };

    if (isCsv && typeof XLSX === 'undefined') {
      reader.readAsText(file);
    } else if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  function parseWorkbookData(wb) {
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return { success: false, error: 'The workbook contains no sheets.' };
    }

    let targetSheetName = sheetNames[0];
    const preferredNames = ['student_names_template', 'student names', 'names', 'student_names', 'sheet1', 'students'];
    for (const sName of sheetNames) {
      if (preferredNames.includes(sName.trim().toLowerCase())) {
        targetSheetName = sName;
        break;
      }
    }

    const sheet = wb.Sheets[targetSheetName];
    if (!sheet) {
      return { success: false, error: `Could not access sheet "${targetSheetName}".` };
    }

    // Convert sheet to array of rows, formatting cells as strings to avoid scientific notation
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return { success: false, error: 'The selected spreadsheet sheet is empty.' };
    }

    return extractNamesFrom2DArray(rawRows, targetSheetName);
  }

  function parseCsvText(text) {
    if (!text || !text.trim()) {
      return { success: false, error: 'CSV file is empty.' };
    }

    const lines = text.split(/\r\n|\n|\r/);
    const rawRows = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Handle comma or tab separated
      const delimiter = trimmed.includes('\t') ? '\t' : (trimmed.includes(';') ? ';' : ',');
      const parts = trimmed.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
      rawRows.push(parts);
    });

    return extractNamesFrom2DArray(rawRows, 'CSV');
  }

  function extractNamesFrom2DArray(rawRows, sourceName) {
    let headerRowIndex = -1;
    let prnColIndex = -1;
    let nameColIndex = -1;

    const prnKeywords = [
      'studentrollno', 'student_roll_no', 'student roll no', 'rollno', 'roll_no', 'roll no',
      'prn', 'prn_no', 'prn no', 'studentprn', 'student prn', 'candidateprn', 'candidate prn',
      'enrollmentno', 'enrollment no', 'enrollment', 'seatno', 'seat no'
    ];

    const nameKeywords = [
      'studentname', 'student_name', 'student name', 'fullname', 'full_name', 'full name',
      'studentfullname', 'student full name', 'student_full_name', 'name of student',
      'candidatename', 'candidate name', 'name'
    ];

    // 1. Exact / normalized scan in first 10 rows
    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      let pIdx = -1;
      let nIdx = -1;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toLowerCase().replace(/[\s_\-]/g, '');
        if (pIdx === -1 && prnKeywords.some(k => k.replace(/[\s_\-]/g, '') === val)) {
          pIdx = c;
        }
        if (nIdx === -1 && nameKeywords.some(k => k.replace(/[\s_\-]/g, '') === val)) {
          nIdx = c;
        }
      }

      if (pIdx !== -1 && nIdx !== -1 && pIdx !== nIdx) {
        headerRowIndex = r;
        prnColIndex = pIdx;
        nameColIndex = nIdx;
        break;
      }
    }

    // 2. Partial match scan if exact match didn't find both
    if (headerRowIndex === -1) {
      for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;

        let pIdx = -1;
        let nIdx = -1;

        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim().toLowerCase();
          if (pIdx === -1 && (val.includes('roll') || val.includes('prn') || val.includes('enroll'))) {
            pIdx = c;
          }
          if (nIdx === -1 && (val.includes('name') || val.includes('student'))) {
            nIdx = c;
          }
        }

        if (pIdx !== -1 && nIdx !== -1 && pIdx !== nIdx) {
          headerRowIndex = r;
          prnColIndex = pIdx;
          nameColIndex = nIdx;
          break;
        }
      }
    }

    // 3. Fallback: Column 0 and 1 if no headers found
    let startRow = 0;
    if (headerRowIndex !== -1) {
      startRow = headerRowIndex + 1;
    } else {
      for (let r = 0; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (row && row.length >= 2 && String(row[0]).trim()) {
          prnColIndex = 0;
          nameColIndex = 1;
          const firstVal = String(row[0]).trim().toLowerCase();
          if (firstVal.includes('roll') || firstVal.includes('prn') || firstVal.includes('name')) {
            startRow = r + 1;
          } else {
            startRow = r;
          }
          break;
        }
      }
    }

    if (prnColIndex === -1 || nameColIndex === -1) {
      return { 
        success: false, 
        error: 'Could not detect PRN and Student Name columns. Please use the official template headers: StudentRollNo and StudentName.' 
      };
    }

    const resultMap = {};
    const previewList = [];
    let validCount = 0;
    let skippedCount = 0;

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row)) continue;

      let roll = String(row[prnColIndex] !== undefined ? row[prnColIndex] : '').trim().replace(/^["']|["']$/g, '');
      let name = String(row[nameColIndex] !== undefined ? row[nameColIndex] : '').trim().replace(/^["']|["']$/g, '');

      // Normalize multiple internal spaces
      name = name.replace(/\s+/g, ' ');

      if (!roll && !name) continue;

      const lowerRoll = roll.toLowerCase();
      if (lowerRoll === 'prn' || lowerRoll === 'studentrollno' || lowerRoll === 'rollno' || lowerRoll.includes('roll no')) {
        continue;
      }

      // Valid PRN: alphanumeric (mirrors savePastedNames validation), at least 4 characters, non-empty name
      if (/^[a-zA-Z0-9_\-]{4,25}$/.test(roll) && name.length >= 1) {
        resultMap[roll] = name;
        validCount++;
        if (previewList.length < 6) {
          previewList.push({ roll, name });
        }
      } else {
        skippedCount++;
      }
    }

    if (validCount === 0) {
      return { 
        success: false, 
        error: 'No valid [PRN, Student Name] student records could be parsed. Check that PRNs and student names are not blank.' 
      };
    }

    return {
      success: true,
      map: resultMap,
      count: validCount,
      skipped: skippedCount,
      preview: previewList,
      sheetName: sourceName
    };
  }

  /* ---------------- UI State Helpers for Drop Zone ---------------- */
  function showDropProcessingState(fileName) {
    const promptState = document.getElementById('dropPromptState');
    const attachedState = document.getElementById('dropAttachedState');
    const actionsBar = document.getElementById('stagedActionsBar');

    if (promptState) {
      promptState.style.display = 'flex';
      promptState.innerHTML = `
        <div class="drop-icon" style="animation: spin 1s linear infinite;">⏳</div>
        <div class="drop-title" style="color:var(--sspu-accent);">Analyzing "${escapeHtml(fileName)}"...</div>
        <div class="drop-subtitle">Parsing sheets and extracting PRN mappings...</div>
      `;
    }
    if (attachedState) attachedState.style.display = 'none';
    if (actionsBar) actionsBar.style.display = 'none';
  }

  function renderStagedFileState(file, parsedResult) {
    const dropZone = document.getElementById('namesDropZone');
    const promptState = document.getElementById('dropPromptState');
    const attachedState = document.getElementById('dropAttachedState');
    const nameEl = document.getElementById('attachedFileName');
    const sizeEl = document.getElementById('attachedFileSize');
    const countEl = document.getElementById('attachedNamesCount');
    const skippedTag = document.getElementById('attachedSkippedTag');
    const skippedCountEl = document.getElementById('attachedSkippedCount');
    const chipsList = document.getElementById('attachedPreviewChips');
    const actionsBar = document.getElementById('stagedActionsBar');
    const importMergeBtn = document.getElementById('btnImportMerge');

    if (dropZone) dropZone.classList.add('is-attached');
    if (promptState) promptState.style.display = 'none';
    if (attachedState) attachedState.style.display = 'flex';

    if (nameEl) nameEl.innerText = file.name;

    const sizeStr = file.size > 1048576 
      ? `${(file.size / 1048576).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;
    if (sizeEl) sizeEl.innerText = sizeStr;

    if (countEl) countEl.innerText = `${parsedResult.count.toLocaleString()} Records`;

    if (skippedTag && skippedCountEl) {
      if (parsedResult.skipped > 0) {
        skippedTag.style.display = 'inline-block';
        skippedCountEl.innerText = parsedResult.skipped;
      } else {
        skippedTag.style.display = 'none';
      }
    }

    if (chipsList) {
      let chipsHtml = '';
      parsedResult.preview.forEach(item => {
        chipsHtml += `<span class="preview-chip"><b>${escapeHtml(item.roll)}</b>: ${escapeHtml(item.name)}</span>`;
      });
      if (parsedResult.count > parsedResult.preview.length) {
        chipsHtml += `<span class="preview-chip" style="background:rgba(0,0,0,0.04); color:#64748b;">+${(parsedResult.count - parsedResult.preview.length).toLocaleString()} more</span>`;
      }
      chipsList.innerHTML = chipsHtml;
    }

    if (actionsBar) actionsBar.style.display = 'flex';
    if (importMergeBtn) {
      importMergeBtn.innerHTML = `<span>➕</span> Merge &amp; Append (${parsedResult.count.toLocaleString()} Names)`;
    }
  }

  function clearStagedFile() {
    stagedFileData = null;
    const dropZone = document.getElementById('namesDropZone');
    const promptState = document.getElementById('dropPromptState');
    const attachedState = document.getElementById('dropAttachedState');
    const actionsBar = document.getElementById('stagedActionsBar');
    const progressWrap = document.getElementById('importProgressWrap');
    const fileInput = document.getElementById('namesFileInput');

    if (fileInput) fileInput.value = '';

    if (dropZone) dropZone.classList.remove('is-attached', 'dragover');
    if (attachedState) attachedState.style.display = 'none';
    if (actionsBar) actionsBar.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'none';

    if (promptState) {
      promptState.style.display = 'flex';
      promptState.innerHTML = `
        <div class="drop-icon">📁</div>
        <div class="drop-title">Click to Browse or Drag &amp; Drop Excel / CSV File</div>
        <div class="drop-subtitle">Supports <b>.xlsx, .xls, .csv</b> with columns: <code>StudentRollNo</code> and <code>StudentName</code></div>
        <div class="drop-hint">
          <span>💡 Don't have a spreadsheet yet?</span>
          <a href="javascript:void(0)" onclick="event.stopPropagation(); studentNamesApp.downloadTemplate('xlsx')" class="drop-hint-link">Download Official Template</a>
        </div>
      `;
    }
  }

  /* ---------------- Execute Import (Merge vs Replace) ---------------- */
  function executeImport(mode = 'merge') {
    if (!stagedFileData || !stagedFileData.map) {
      alert('No staged spreadsheet data to import.');
      return;
    }

    const { map, count, file } = stagedFileData;

    if (mode === 'replace') {
      const existingCount = Object.keys(commonUI.getStudentNamesMap()).length;
      const msg = existingCount > 0
        ? `Are you sure you want to REPLACE ALL stored student names with ${count.toLocaleString()} names from "${file.name}"?\n\nThis will overwrite all ${existingCount.toLocaleString()} current records in the directory.`
        : `Replace directory with ${count.toLocaleString()} student names from "${file.name}"?`;

      if (!confirm(msg)) return;
    }

    const progressWrap = document.getElementById('importProgressWrap');
    const progressFill = document.getElementById('importProgressFill');
    const progressPct = document.getElementById('importProgressPct');
    const progressText = document.getElementById('importProgressText');

    if (progressWrap) progressWrap.style.display = 'block';
    if (progressFill) progressFill.style.width = '40%';
    if (progressPct) progressPct.innerText = '40%';
    if (progressText) progressText.innerText = mode === 'replace' ? 'Clearing and storing records...' : 'Merging records into directory...';

    setTimeout(() => {
      if (mode === 'replace') {
        commonUI.clearAllStudentNames();
        commonUI.saveBulkStudentNames(map);
      } else {
        commonUI.saveBulkStudentNames(map);
      }

      // Notify other modules and components
      window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: map }));

      if (progressFill) progressFill.style.width = '100%';
      if (progressPct) progressPct.innerText = '100%';
      if (progressText) progressText.innerText = 'Registration complete!';

      setTimeout(() => {
        clearStagedFile();
        renderNamesDirectory();

        const toastMsg = mode === 'replace'
          ? `Directory replaced with ${count.toLocaleString()} student names!`
          : `Successfully registered & merged ${count.toLocaleString()} student names!`;
        commonUI.showToast(toastMsg, 'success');
      }, 300);

    }, 200);
  }

  /* ---------------- TSV / Manual Paste Engine ---------------- */
  function savePastedNames() {
    const textarea = document.getElementById('tsvInput');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) {
      alert('Please paste some Tab or Comma Separated text into the box.');
      return;
    }

    const lines = text.split(/\r\n|\n|\r/);
    let addedCount = 0;
    const newMap = {};

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/[\t,;]+/);
      if (parts.length >= 2) {
        let roll = parts[0].trim().replace(/^["']|["']$/g, '');
        let name = parts.slice(1).join(' ').trim().replace(/^["']|["']$/g, '');
        name = name.replace(/\s+/g, ' ');

        const lowerRoll = roll.toLowerCase();
        if (lowerRoll === 'studentrollno' || lowerRoll === 'prn' || lowerRoll.includes('roll no')) {
          return;
        }

        // Accept alphanumeric PRN with minimum 4 chars
        if (/^[a-zA-Z0-9_\-]{4,25}$/.test(roll) && name.length > 0) {
          newMap[roll] = name;
          addedCount++;
        }
      }
    });

    if (addedCount > 0) {
      commonUI.saveBulkStudentNames(newMap);
      window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: newMap }));
      textarea.value = '';
      renderNamesDirectory();
      commonUI.showToast(`Successfully registered ${addedCount.toLocaleString()} student names!`, 'success');
    } else {
      alert('No valid [PRN, Student Name] pairs could be identified.\nEnsure format is: PRN <Tab> Full Name');
    }
  }

  /* ---------------- Inline Table Editing ---------------- */
  function editRowName(roll, cellEl) {
    const displaySpan = cellEl.querySelector('.name-display');
    const existing = displaySpan ? displaySpan.innerText.trim() : '';

    const newName = prompt(`Edit student full name for PRN ${roll}:`, existing);
    if (newName !== null) {
      commonUI.saveStudentName(roll, newName.trim());
      window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: { [roll]: newName.trim() } }));
      renderNamesDirectory();
      commonUI.showToast(`Updated name for PRN ${roll}`, 'success');
    }
  }

  function deleteRowName(roll) {
    if (!confirm(`Remove student name mapping for PRN ${roll}?`)) return;
    commonUI.saveStudentName(roll, '');
    window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: { [roll]: '' } }));
    renderNamesDirectory();
    commonUI.showToast(`Removed name for PRN ${roll}`, 'info');
  }

  function clearAllNames() {
    const count = Object.keys(commonUI.getStudentNamesMap()).length;
    if (count === 0) {
      alert('There are no registered student names to clear.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ALL ${count.toLocaleString()} stored student names? This action cannot be undone.`)) return;
    commonUI.clearAllStudentNames();
    window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: {} }));
    renderNamesDirectory();
    commonUI.showToast('Cleared all student names from directory.', 'warning');
  }

  /* ---------------- Export Directory to CSV & Excel ---------------- */
  function exportNamesCSV() {
    const namesMap = commonUI.getStudentNamesMap();
    const rolls = Object.keys(namesMap);
    if (rolls.length === 0) {
      alert('No student names registered to export.');
      return;
    }

    let csvContent = 'StudentRollNo,StudentName\r\n';
    rolls.forEach(r => {
      const escapedName = `"${namesMap[r].replace(/"/g, '""')}"`;
      csvContent += `${r},${escapedName}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SSPU_Student_Names_Directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    commonUI.showToast(`Exported ${rolls.length.toLocaleString()} student names to CSV!`, 'success');
  }

  function exportNamesExcel() {
    const namesMap = commonUI.getStudentNamesMap();
    const rolls = Object.keys(namesMap);
    if (rolls.length === 0) {
      alert('No student names registered to export.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      exportNamesCSV();
      return;
    }

    const data = [['StudentRollNo', 'StudentName']];
    rolls.forEach(r => {
      data.push([r, namesMap[r]]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Names');
    XLSX.writeFile(wb, `SSPU_Student_Names_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    commonUI.showToast(`Exported ${rolls.length.toLocaleString()} student names to Excel (.xlsx)!`, 'success');
  }

  /* ---------------- Demo Generator ---------------- */
  function populateDemoNames() {
    const rawRows = (typeof dataStore !== 'undefined' && dataStore.getRawRows) ? dataStore.getRawRows() : [];
    const colMap = (typeof dataStore !== 'undefined' && dataStore.getColMap) ? dataStore.getColMap() : {};
    const rIdx = colMap['StudentRollNo'];

    if (rIdx === undefined || rawRows.length === 0) {
      alert('No database loaded yet to generate sample names from.');
      return;
    }

    const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Pooja', 'Aditya', 'Sneha', 'Rahul', 'Priya', 'Karan', 'Neha', 'Vikram', 'Divya', 'Siddharth', 'Tanvi', 'Varun', 'Anushka', 'Kunal', 'Isha'];
    const lastNames = ['Sharma', 'Verma', 'Patil', 'Deshmukh', 'Joshi', 'Kulkarni', 'Mehta', 'Nair', 'Singh', 'Gupta', 'Pawar', 'Chavan', 'Bhosale', 'Shinde', 'Kadam', 'More', 'Gaikwad', 'Jadhav'];

    const newMap = {};
    const seen = new Set();
    let count = 0;

    for (let i = 0; i < rawRows.length && count < 100; i++) {
      const roll = String(rawRows[i][rIdx]).trim();
      if (roll && !seen.has(roll)) {
        seen.add(roll);
        const fn = firstNames[count % firstNames.length];
        const ln = lastNames[(count * 3) % lastNames.length];
        newMap[roll] = `${fn} ${ln}`;
        count++;
      }
    }

    if (count > 0) {
      commonUI.saveBulkStudentNames(newMap);
      window.dispatchEvent(new CustomEvent('sspu-student-names-updated', { detail: newMap }));
      renderNamesDirectory();
      commonUI.showToast(`Populated ${count} sample student names from Master Database!`, 'success');
    } else {
      alert('Could not identify student PRNs from loaded dataset.');
    }
  }

  /* ---------------- Initialization ---------------- */
  async function initStudentNamesPage() {
    commonUI.renderNavbar('student-names');
    const initResult = await dataStore.init();
    commonUI.updateNavStatus(initResult.count);
    initDropZone();
    renderNamesDirectory();
  }

  /* Helper sanitize functions */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  /* ---------------- Global Namespace ---------------- */
  window.studentNamesApp = {
    initStudentNamesPage,
    initDropZone,
    handleFileInput,
    clearStagedFile,
    executeImport,
    switchTab,
    downloadTemplate,
    handleSearchInput,
    toggleShowAll,
    savePastedNames,
    editRowName,
    deleteRowName,
    clearAllNames,
    exportNamesCSV,
    exportNamesExcel,
    populateDemoNames
  };

})(window);
