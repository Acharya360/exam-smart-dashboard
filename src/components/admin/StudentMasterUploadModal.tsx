import { useState, useRef, useMemo } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  Users, 
  BookOpen, 
  Layers, 
  Download, 
  AlertCircle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { localRequest } from '../../services/localDb';
import type { Program, StudentImportRow, StudentUploadMismatch, StudentUploadResult } from '../../types';

interface StudentMasterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: string) => void;
  programs: Program[];
}

function clean(s: unknown): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function mapStudentRow(raw: Record<string, unknown>): StudentImportRow {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g, '');
  const get = (...names: string[]) => {
    for (const n of names) {
      const key = Object.keys(raw).find(k => norm(k) === n);
      if (key !== undefined) {
        const v = raw[key];
        if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
      }
    }
    return '';
  };
  return {
    prn: get('prn', 'studentid', 'studentprn', 'enrollmentno'),
    student_name: get('studentname', 'name', 'fullname'),
    program_code: get('programcode', 'programmecode', 'program', 'coursecode', 'programname'),
    semester: get('semester', 'sem'),
    academic_year: get('academicyear', 'ay'),
    exam_year: get('examyear', 'examsession', 'session', 'examinationyear'),
    paper_codes: get('papercodes', 'papercode', 'subjectcodes', 'subjectcode', 'mappedpapers', 'mappedsubjects', 'papers', 'subjects'),
    course_name: get('coursename', 'course', 'subjectname', 'subject', 'sm_subject_name')
  };
}

export function downloadStudentTemplate() {
  const sample = [
    {
      'PRN': '2500701088',
      'Student Name': 'Samarpita Roy',
      'Program Code': 'B. Arch',
      'Semester': '1',
      'Academic Year': '2026-27',
      'Exam Year': 'Dec 2026',
      'Paper Codes': 'ARCH0101',
      'Course Name': 'Basic Design and Visual Arts'
    },
    {
      'PRN': '2500701088',
      'Student Name': 'Samarpita Roy',
      'Program Code': 'B. Arch',
      'Semester': '1',
      'Academic Year': '2026-27',
      'Exam Year': 'Dec 2026',
      'Paper Codes': 'ARCH0102',
      'Course Name': 'Graphics and Visualization-I'
    },
    {
      'PRN': '2500701147',
      'Student Name': 'Nithya Pappur',
      'Program Code': 'B. Arch',
      'Semester': '1',
      'Academic Year': '2026-28',
      'Exam Year': 'Dec 2026',
      'Paper Codes': 'ARCH0101',
      'Course Name': 'Basic Design and Visual Arts'
    },
    {
      'PRN': '2600201001',
      'Student Name': 'Rohan Sharma',
      'Program Code': 'B.Tech (Mechatronics Engineering)',
      'Semester': '3',
      'Academic Year': '2026-27',
      'Exam Year': 'MAY 2027',
      'Paper Codes': 'MECH0301',
      'Course Name': 'Digital Electronics & Microcontrollers'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sample, {
    header: ['PRN', 'Student Name', 'Program Code', 'Semester', 'Academic Year', 'Exam Year', 'Paper Codes', 'Course Name']
  });
  
  // Set column widths
  ws['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 10 },
    { wch: 15 },
    { wch: 14 },
    { wch: 16 },
    { wch: 35 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'student_master_template.xlsx');
}

export function StudentMasterUploadModal({
  isOpen,
  onClose,
  onSuccess,
  programs
}: StudentMasterUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<StudentImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [showMismatches, setShowMismatches] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, status: '' });
  const [completedStats, setCompletedStats] = useState<{
    studentsImported: number;
    registrationsCreated: number;
    duplicatesSkipped: number;
    coursesProvisioned: number;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate parsed rows against programmes
  const validation = useMemo(() => {
    if (!parsedRows.length) return null;

    const prns = new Set<string>();
    const progsInFile = new Set<string>();
    const papersInFile = new Set<string>();
    const mismatches: StudentUploadMismatch[] = [];
    const validRows: StudentImportRow[] = [];

    const progLookup = new Map<string, Program>();
    programs.forEach(p => {
      progLookup.set(clean(p.program_name), p);
      progLookup.set(clean(p.program_code), p);
    });

    parsedRows.forEach((r, idx) => {
      if (r.prn) prns.add(r.prn);
      if (r.program_code) progsInFile.add(r.program_code);
      if (r.paper_codes) papersInFile.add(r.paper_codes);

      const pMatch = progLookup.get(clean(r.program_code));
      if (!pMatch) {
        mismatches.push({
          row: idx + 1,
          prn: r.prn || 'N/A',
          studentName: r.student_name || 'N/A',
          program: r.program_code || 'Empty',
          reason: `Program "${r.program_code || 'Empty'}" not registered`
        });
      } else if (!r.prn || !r.student_name || !r.semester || !r.paper_codes) {
        mismatches.push({
          row: idx + 1,
          prn: r.prn || 'Missing',
          studentName: r.student_name || 'Missing',
          program: r.program_code,
          reason: 'Missing mandatory PRN, student name, semester or paper code'
        });
      } else {
        validRows.push(r);
      }
    });

    return {
      totalRows: parsedRows.length,
      uniquePrns: prns.size,
      uniquePrograms: progsInFile.size,
      uniquePapers: papersInFile.size,
      mismatches,
      validRows
    };
  }, [parsedRows, programs]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    setError('');
    setCompletedStats(null);

    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      // Use 'Students' sheet if available, otherwise first sheet
      const sheetName = wb.SheetNames.includes('Students') ? 'Students' : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error('No sheets found in workbook.');

      const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      if (!rawJson.length) throw new Error(`Sheet "${sheetName}" contains no data rows.`);

      const mapped = rawJson.map(mapStudentRow);
      setParsedRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file.');
      setParsedRows([]);
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const startUpload = async () => {
    if (!parsedRows.length) return;
    setUploading(true);
    setError('');
    setProgress({ current: 0, total: 0, percent: 0, status: 'Initializing upload...' });

    const rowsToUpload = skipInvalid && validation?.validRows ? validation.validRows : parsedRows;
    const CHUNK_SIZE = 3000;
    const totalChunks = Math.ceil(rowsToUpload.length / CHUNK_SIZE);

    let totImported = 0;
    let totRegs = 0;
    let totDupes = 0;
    let totCourses = 0;

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, rowsToUpload.length);
        const chunk = rowsToUpload.slice(start, end);
        const isFirstChunk = i === 0;

        const currentPct = Math.round(((i) / totalChunks) * 100);
        setProgress({
          current: i + 1,
          total: totalChunks,
          percent: currentPct,
          status: `Uploading batch ${i + 1} of ${totalChunks} (${end.toLocaleString()} / ${rowsToUpload.length.toLocaleString()} rows)...`
        });

        const res = await localRequest<StudentUploadResult>('/examination/students/bulk', 'POST', {
          students: chunk,
          clearExisting: isFirstChunk && mode === 'replace',
          skipInvalid
        });

        totImported += res.studentsImported || 0;
        totRegs += res.registrationsCreated || 0;
        totDupes += res.duplicatesSkipped || 0;
        totCourses += res.coursesProvisioned || 0;
      }

      setProgress({
        current: totalChunks,
        total: totalChunks,
        percent: 100,
        status: 'Upload completed successfully!'
      });

      const finalStats = {
        studentsImported: totImported,
        registrationsCreated: totRegs,
        duplicatesSkipped: totDupes,
        coursesProvisioned: totCourses
      };
      setCompletedStats(finalStats);

      const summaryText = `Imported ${finalStats.studentsImported.toLocaleString()} students, ${finalStats.registrationsCreated.toLocaleString()} registrations${finalStats.coursesProvisioned ? `, auto-provisioned ${finalStats.coursesProvisioned} new courses` : ''}${finalStats.duplicatesSkipped ? `, skipped ${finalStats.duplicatesSkipped} duplicates` : ''}.`;
      onSuccess(summaryText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Student master upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setParsedRows([]);
    setCompletedStats(null);
    setError('');
    setShowMismatches(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Student Master & Subject Registrations</h2>
              <p className="text-xs text-slate-500">
                Supports standard 8-column format (PRN, Name, Program, Semester, AY, Exam Session, Papers, Course Name)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Download Template Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-indigo-600 shrink-0" />
              <span>
                Need the official format? Download the standardized 8-column Excel template.
              </span>
            </div>
            <button
              onClick={downloadStudentTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
            >
              <Download size={14} /> Download template (.xlsx)
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Import Error</p>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Completed Success Summary */}
          {completedStats && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600" />
                <div>
                  <h3 className="font-bold text-emerald-950 text-base">Import Completed Successfully</h3>
                  <p className="text-xs text-emerald-800">Student master registry and examination registrations have been updated.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Students Enrolled</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{completedStats.studentsImported.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Registrations Created</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{completedStats.registrationsCreated.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Courses Provisioned</p>
                  <p className="text-xl font-bold text-indigo-700 mt-1">{completedStats.coursesProvisioned.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-100 shadow-xs">
                  <p className="text-xs text-slate-500 font-medium">Duplicates Skipped</p>
                  <p className="text-xl font-bold text-amber-700 mt-1">{completedStats.duplicatesSkipped.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetAll}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          {!parsedRows.length && !completedStats && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md text-indigo-600 group-hover:scale-105 transition">
                <FileSpreadsheet size={28} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">
                {parsing ? 'Parsing Excel spreadsheet...' : 'Choose or drop Student Master Excel file'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                Reads the <span className="font-semibold text-slate-700">'Students'</span> sheet or first worksheet. Supports files up to 50,000+ rows.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Upload size={16} /> Select Excel File
              </button>
            </div>
          )}

          {/* Parsed File Overview & Validation */}
          {parsedRows.length > 0 && !completedStats && (
            <div className="space-y-5">
              
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file?.name}</p>
                    <p className="text-xs text-slate-500">
                      {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ` : ''}
                      {parsedRows.length.toLocaleString()} total rows parsed
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={resetAll}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Change File
                  </button>
                )}
              </div>

              {/* Statistics Grid */}
              {validation && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <Layers size={14} /> Total Rows
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-slate-900">{validation.totalRows.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <Users size={14} /> Unique PRNs
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-indigo-700">{validation.uniquePrns.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <BookOpen size={14} /> Distinct Programmes
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-slate-900">{validation.uniquePrograms.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <CheckCircle2 size={14} /> Distinct Papers
                    </div>
                    <p className="mt-1.5 text-xl font-bold text-slate-900">{validation.uniquePapers.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Validation & Programme Registry Match Status */}
              {validation && (
                <>
                  {validation.mismatches.length === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>
                        <strong>All {validation.uniquePrograms} programme names / codes</strong> in this file match registered university programmes.
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-amber-900">
                              Programme Registry Mismatch: {validation.mismatches.length.toLocaleString()} of {validation.totalRows.toLocaleString()} rows need attention
                            </p>
                            <p className="text-xs text-amber-800 mt-0.5">
                              {validation.validRows.length.toLocaleString()} rows are valid and ready to upload.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMismatches(!showMismatches)}
                          className="text-xs font-semibold text-amber-800 underline hover:text-amber-950"
                        >
                          {showMismatches ? 'Hide report' : 'View report'}
                        </button>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={skipInvalid}
                          onChange={e => setSkipInvalid(e.target.checked)}
                          className="rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                        />
                        Skip mismatched records and import the {validation.validRows.length.toLocaleString()} valid rows (Recommended)
                      </label>

                      {showMismatches && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-white p-3 text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                                <th className="pb-1">Row</th>
                                <th className="pb-1">PRN</th>
                                <th className="pb-1">Student</th>
                                <th className="pb-1">Programme in File</th>
                                <th className="pb-1">Issue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {validation.mismatches.slice(0, 50).map(m => (
                                <tr key={m.row} className="hover:bg-amber-50/50">
                                  <td className="py-1 font-mono text-slate-400">{m.row}</td>
                                  <td className="py-1 font-mono">{m.prn}</td>
                                  <td className="py-1">{m.studentName}</td>
                                  <td className="py-1 font-medium text-rose-700">{m.program}</td>
                                  <td className="py-1 text-slate-500">{m.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {validation.mismatches.length > 50 && (
                            <p className="mt-2 text-center text-slate-400 text-xs">
                              Showing first 50 of {validation.mismatches.length} mismatched rows.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Upload Mode Selector */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Import Mode</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    mode === 'append' ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={mode === 'append'}
                      onChange={() => setMode('append')}
                      disabled={uploading}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">🔄 Append & Update (Safe)</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Adds new registrations, updates student names, auto-provisions unmapped courses, and skips duplicates without touching existing marks.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    mode === 'replace' ? 'border-rose-600 bg-rose-50/40 ring-1 ring-rose-600' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      disabled={uploading}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-rose-900">⚠️ Clear Current Records & Replace</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Wipes current student registrations and replaces them completely with this uploaded master dataset.
                      </p>
                    </div>
                  </label>
                </div>

                {mode === 'replace' && (
                  <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">
                    <strong>Warning:</strong> All existing records in the student examination registration registry will be purged before importing this file.
                  </p>
                )}
              </div>

              {/* Data Preview (First 10 rows) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Preview (First 10 records)</span>
                  <span>Total {parsedRows.length.toLocaleString()} rows</span>
                </div>
                <div className="max-h-52 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">PRN</th>
                        <th className="px-3 py-2">Student Name</th>
                        <th className="px-3 py-2">Programme</th>
                        <th className="px-3 py-2">Sem</th>
                        <th className="px-3 py-2">AY</th>
                        <th className="px-3 py-2">Exam Session</th>
                        <th className="px-3 py-2">Paper Code</th>
                        <th className="px-3 py-2">Course Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-mono font-medium text-slate-800">{r.prn}</td>
                          <td className="px-3 py-1.5 font-medium">{r.student_name}</td>
                          <td className="px-3 py-1.5">{r.program_code}</td>
                          <td className="px-3 py-1.5">{r.semester}</td>
                          <td className="px-3 py-1.5">{r.academic_year}</td>
                          <td className="px-3 py-1.5">{r.exam_year}</td>
                          <td className="px-3 py-1.5 font-mono text-indigo-700 font-semibold">{r.paper_codes}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.course_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-950">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin text-indigo-600" />
                      {progress.status}
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-200">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && !completedStats && (
            <div className="flex items-center gap-3">
              <button
                onClick={startUpload}
                disabled={uploading || (validation?.validRows.length === 0)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Uploading ({progress.percent}%)…
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Start Import ({skipInvalid && validation?.validRows ? validation.validRows.length.toLocaleString() : parsedRows.length.toLocaleString()} rows)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
