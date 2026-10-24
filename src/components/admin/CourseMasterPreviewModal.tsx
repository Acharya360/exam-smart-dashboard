import React, { useState, useMemo } from 'react';
import { CourseMaster, Program } from '../../types';
import type { ValidationResult } from '../../utils/validation';
import {
  validateCoursesAgainstPrograms,
  downloadCourseMismatchReport,
  findMatchingProgram,
} from '../../utils/courseProgramValidator';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Search,
  BookOpen,
  Sparkles,
  Layers,
  Award,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
} from 'lucide-react';

type CourseDraft = Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>;

interface CourseMasterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coursesToImport: CourseDraft[], clearExisting: boolean) => Promise<void>;
  courses: CourseDraft[];
  existingCourses: CourseMaster[];
  errors: string[];
  validation?: ValidationResult<CourseDraft> | null;
  onDownloadReport?: () => void;
  isSaving: boolean;
  registeredPrograms: Program[];
}

export const CourseMasterPreviewModal: React.FC<CourseMasterPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  courses,
  existingCourses,
  errors,
  validation,
  onDownloadReport,
  isSaving,
  registeredPrograms,
}) => {
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState<'standard' | 'detailed'>('detailed');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [programFilter, setProgramFilter] = useState<'ALL' | 'MATCHED' | 'MISMATCHED'>('ALL');

  // Validate courses against registered programs in http://localhost:3000/programs
  const programValidation = useMemo(() => {
    return validateCoursesAgainstPrograms(courses, registeredPrograms);
  }, [courses, registeredPrograms]);

  const { matchedCourses, mismatchedCourses, distinctUnmatchedPrograms, hasMismatches } = programValidation;

  if (!isOpen) return null;

  const isExisting = (c: CourseDraft) =>
    existingCourses.some(
      (e) => e.paper_code === c.paper_code && e.cm_course_name === c.cm_course_name
    );

  const newCount = courses.filter((c) => !isExisting(c)).length;
  const updateCount = courses.filter((c) => isExisting(c)).length;
  const archCount = courses.filter((c) => c.grading_category === 'Architecture').length;
  const nonArchCount = courses.filter((c) => c.grading_category === 'Non-Architecture').length;

  const filtered = courses.filter((c) => {
    // 1. Program Match Filter
    if (programFilter === 'MATCHED') {
      const match = findMatchingProgram(c, registeredPrograms);
      if (!match.program) return false;
    } else if (programFilter === 'MISMATCHED') {
      const match = findMatchingProgram(c, registeredPrograms);
      if (match.program) return false;
    }

    // 2. Search Query Filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.cm_course_name || '').toLowerCase().includes(q) ||
      (c.paper_code || '').toLowerCase().includes(q) ||
      (c.sm_subject_name || '').toLowerCase().includes(q) ||
      (c.academic_period || '').toLowerCase().includes(q) ||
      (c.term || '').toLowerCase().includes(q) ||
      (c.program_code || '').toLowerCase().includes(q) ||
      (c.regulation_group || '').toLowerCase().includes(q) ||
      (c.subject_type || '').toLowerCase().includes(q) ||
      (c.grading_category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Course Master & LTPS Import Preview
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">
                  {courses.length} Courses
                </span>
                {hasMismatches && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    {mismatchedCourses.length} Programme Mismatch(es)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify LTPS structures, grading categories, and assessment marking schemes before saving to the database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMismatches && (
              <button
                type="button"
                onClick={() => downloadCourseMismatchReport(programValidation, registeredPrograms)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-2xs"
                title="Download report of courses whose program names do not match the Programs Directory"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Mismatch Report ({mismatchedCourses.length})
              </button>
            )}
            {validation && onDownloadReport && (
              <button
                onClick={onDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                title="Download the full validation report"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                Validation Report
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Import Strategy Selection: Add & Update (Keep Old) vs Clear Current Records & Replace All */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Import Strategy & Synchronization Mode</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose whether to merge with existing course records or clear all current courses before importing.
              </p>
            </div>
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  importMode === 'merge'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Update If Exist & Add New (Merge)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  importMode === 'replace'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Current Records & Replace All</span>
              </button>
            </div>
          </div>

          {importMode === 'replace' ? (
            <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-900 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Clear Current Records Mode Active:</span> All current courses in the database will be cleared before importing. Only the uploaded courses will be saved in the database.
              </div>
            </div>
          ) : (
            <div className="mt-2.5 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-900 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <span className="font-bold">Merge Mode Active:</span> Existing courses with matching paper code and programme will be updated, and new courses will be appended. All other current courses are preserved.
              </span>
            </div>
          )}
        </div>

        {/* Programme Mismatch Alert Banner (if any) */}
        {hasMismatches && (
          <div className="px-6 py-3 bg-amber-50/90 border-b border-amber-200 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Programme Name Mismatch ({mismatchedCourses.length} course(s) across {distinctUnmatchedPrograms.length} programme title(s))
                  </span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  These courses belong to program names not registered in the{' '}
                  <span className="font-semibold underline">Programs Directory (http://localhost:3000/programs)</span>.
                  You can download the Mismatch Report, upload only the {matchedCourses.length} matched courses, or upload all.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {distinctUnmatchedPrograms.map((p, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-amber-100 text-amber-950 border border-amber-300"
                    >
                      <span className="font-bold">{p.programName}</span>
                      <span className="text-[10px] text-amber-800">({p.count} courses)</span>
                      {p.suggestedProgram && (
                        <span className="text-[10px] text-indigo-700 font-semibold bg-white/90 px-1.5 py-0.5 rounded border border-indigo-200">
                          Suggested: {p.suggestedProgram.program_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadCourseMismatchReport(programValidation, registeredPrograms)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-2xs shrink-0 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download Mismatch Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Validation summary bar */}
        {validation && (validation.summary.invalidRows > 0 || validation.summary.duplicateRows > 0 || validation.summary.warningRows > 0) && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-medium">
            <span className="text-slate-500 uppercase tracking-wide font-bold">Data Validation</span>
            <span className="text-emerald-700">{validation.summary.validRows} clean</span>
            {validation.summary.warningRows > 0 && <span className="text-amber-700">{validation.summary.warningRows} warnings</span>}
            {validation.summary.duplicateRows > 0 && <span className="text-rose-700">{validation.summary.duplicateRows} duplicates (excluded)</span>}
            {validation.summary.invalidRows > 0 && <span className="text-rose-700">{validation.summary.invalidRows} invalid (excluded)</span>}
          </div>
        )}

        {/* Errors & Warnings Bar (if any) */}
        {errors.length > 0 && (
          <div className="px-6 py-3 bg-rose-50/90 border-b border-rose-200 text-xs">
            <div className="flex items-center gap-2 text-rose-800 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              File Validation Notices ({errors.length})
            </div>
            <ul className="list-disc pl-5 text-rose-700 space-y-0.5 max-h-24 overflow-y-auto">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick KPI stats */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{newCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">New Courses</div>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{updateCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">Existing (Will Update)</div>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{nonArchCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">Non-Architecture (40% Cutoff)</div>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{archCount}</div>
              <div className="text-[10px] text-slate-500 font-medium">Architecture (45% Cutoff)</div>
            </div>
          </div>
        </div>

        {/* Filter bar & View Mode */}
        <div className="px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search program, course name, code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              />
            </div>

            {/* Programme Mismatch Filter Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setProgramFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  programFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({courses.length})
              </button>
              <button
                type="button"
                onClick={() => setProgramFilter('MATCHED')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  programFilter === 'MATCHED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Matched ({matchedCourses.length})
              </button>
              {hasMismatches && (
                <button
                  type="button"
                  onClick={() => setProgramFilter('MISMATCHED')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                    programFilter === 'MISMATCHED'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  <span>Mismatches ({mismatchedCourses.length})</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewMode('standard')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  previewMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Summary View
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('detailed')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  previewMode === 'detailed'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Excel 1:1 view with all 31 template columns"
              >
                <span>Detailed (31 Cols)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">1:1</span>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Showing {filtered.length} of {courses.length} courses
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold shadow-2xs">
              {previewMode === 'standard' ? (
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">#</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Period / Term</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Program & Status</th>
                  <th className="px-3 py-2.5 min-w-[180px]">Course Code & Name</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Regulation Group</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Type</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Sem</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Students</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap" title="L_Cr - T_Cr - P_Cr - S_Cr">L-T-P-S</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap" title="Total Credits">Total Cr.</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Grading Category</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Heads</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Internal (IA)</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap" title="End Semester Exam: EST (Theory) / ESP (Practical) / ESS (Skills)">ESE (EST/ESP/ESS)</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Total Marks</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Sync Action</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-2 py-2.5 w-10 text-center whitespace-nowrap">ID</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Period</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Term</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Prog Code</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Program Name & Status</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Regulation Group</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">Sem</th>
                  <th className="px-2 py-2.5 font-mono whitespace-nowrap">Course Code</th>
                  <th className="px-3 py-2.5 min-w-[180px]">Course Name</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">L_Cr</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">T_Cr</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">P_Cr</th>
                  <th className="px-1.5 py-2.5 text-center whitespace-nowrap">S_Cr</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap bg-indigo-50 text-indigo-900 font-bold">Total Credits</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap border-l border-slate-200">Grading Category</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAT1</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAT2</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAT3</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap bg-blue-50 text-blue-900 font-bold">CAT Max</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAP1</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAP2</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAP3</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap bg-emerald-50 text-emerald-900 font-bold">CAP Max</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAS1</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAS2</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">CAS3</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap bg-amber-50 text-amber-900 font-bold">CAS Max</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">EST Max</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">ESP Max</th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap">ESS Max</th>
                  <th className="px-2.5 py-2.5 text-center whitespace-nowrap bg-purple-50 text-purple-900 font-bold border-l border-slate-200">Total Marks</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap border-l border-slate-200">Sync Action</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, idx) => {
                const existing = isExisting(c);
                const isArch = c.grading_category === 'Architecture';
                const matchResult = findMatchingProgram(c, registeredPrograms);
                const isMatched = !!matchResult.program;

                const thActive = ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0) + (c.est_max_marks || 0) + (c.cat_max_marks || 0)) > 0;
                const prActive = ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0) + (c.esp_max_marks || 0) + (c.cap_max_marks || 0)) > 0;
                const skActive = ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0) + (c.ess_max_marks || 0) + (c.cas_max_marks || 0)) > 0;

                if (previewMode === 'detailed') {
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-indigo-50/20 transition-colors text-[11px] ${
                        !isMatched ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-center text-slate-500 font-mono font-medium">
                        {c.sr_no || idx + 1}
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap text-slate-600">
                        {c.academic_period || '—'}
                      </td>
                      <td className="px-2 py-2 text-center whitespace-nowrap text-slate-600">
                        {c.term || '—'}
                      </td>
                      <td className="px-2 py-2 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {c.program_code || '—'}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{c.cm_course_name}</span>
                          {!isMatched && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                              title="Unmatched Programme: Not found in Programs Directory"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              Unmatched
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {c.regulation_group || '—'}
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-slate-800">
                        {c.semester}
                      </td>
                      <td className="px-2 py-2 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {c.paper_code}
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-medium whitespace-nowrap">
                        {c.sm_subject_name}
                      </td>
                      <td className="px-1.5 py-2 text-center font-mono text-slate-600">{c.l}</td>
                      <td className="px-1.5 py-2 text-center font-mono text-slate-600">{c.t}</td>
                      <td className="px-1.5 py-2 text-center font-mono text-slate-600">{c.p}</td>
                      <td className="px-1.5 py-2 text-center font-mono text-slate-600">{c.s}</td>
                      <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/40">{c.total_credits}</td>
                      <td className="px-2 py-2 text-center whitespace-nowrap border-l border-slate-200">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isArch ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.grading_category || 'Non-Architecture'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cat1_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cat2_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cat3_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-blue-800 bg-blue-50/50">{c.cat_max_marks || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cap1_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cap2_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cap3_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">{c.cap_max_marks || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cas1_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cas2_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-600">{c.cas3_max || 0}</td>
                      <td className="px-2 py-2 text-center font-mono font-bold text-amber-800 bg-amber-50/50">{c.cas_max_marks || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-700">{c.est_max_marks || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-700">{c.esp_max_marks || 0}</td>
                      <td className="px-2 py-2 text-center font-mono text-slate-700">{c.ess_max_marks || 0}</td>
                      <td className="px-2.5 py-2 text-center font-mono font-extrabold text-purple-900 bg-purple-50/50 border-l border-slate-200">
                        {c.total_marks}
                      </td>
                      <td className="px-3 py-2 text-center border-l border-slate-200 whitespace-nowrap">
                        {existing ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Update
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={idx}
                    className={`hover:bg-indigo-50/20 transition-colors ${
                      !isMatched ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                      {c.sr_no || idx + 1}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 whitespace-nowrap text-[11px]">
                      <div>{c.academic_period || '—'}</div>
                      {c.term && <div className="text-[10px] text-slate-400 font-medium">{c.term}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{c.cm_course_name}</span>
                        {!isMatched && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title="Unmatched Programme: Not found in Programs Directory"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            Unmatched
                          </span>
                        )}
                      </div>
                      {c.program_code && (
                        <div className="text-[10px] text-slate-500 font-mono font-medium">{c.program_code}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold text-[11px]">
                          {c.paper_code}
                        </span>
                        <span className="font-medium text-slate-900">{c.sm_subject_name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      {c.regulation_group ? (
                        <span className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700" title={c.regulation_group}>
                          {c.regulation_group}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-[11px] text-slate-600 whitespace-nowrap">
                      {c.subject_type || '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-slate-700 text-[11px]">
                      {c.semester}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-semibold text-slate-700 text-[11px]">
                      {c.student_count !== null && c.student_count !== undefined ? c.student_count : '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-mono tracking-wider text-slate-600 text-[11px] whitespace-nowrap">
                      {c.l}-{c.t}-{c.p}-{c.s}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/40">
                      {c.total_credits}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isArch
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {c.grading_category || 'Non-Architecture'}
                        <span className="text-[9px] font-semibold opacity-80">({isArch ? '45%' : '40%'})</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {thActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`CAT1: ${c.cat1_max}, CAT2: ${c.cat2_max}, CAT3: ${c.cat3_max}, EST: ${c.est_max_marks}`}>
                            Theory
                          </span>
                        )}
                        {prActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title={`CAP1: ${c.cap1_max}, CAP2: ${c.cap2_max}, CAP3: ${c.cap3_max}, ESP: ${c.esp_max_marks}`}>
                            Practical
                          </span>
                        )}
                        {skActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title={`CAS1: ${c.cas1_max}, CAS2: ${c.cas2_max}, CAS3: ${c.cas3_max}, ESS: ${c.ess_max_marks}`}>
                            Skills
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap" title={`CAT Max: ${c.cat_max_marks || 0}, CAP Max: ${c.cap_max_marks || 0}, CAS Max: ${c.cas_max_marks || 0}`}>
                      <div>
                        <span className="font-bold text-slate-800">{c.ia_max_marks}</span>
                        <span className="text-[10px] text-slate-400 mx-1">/</span>
                        <span className="text-emerald-700 font-semibold">{c.ia_min_marks}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono tracking-tight mt-0.5">
                        CAT:{c.cat_max_marks || 0} · CAP:{c.cap_max_marks || 0} · CAS:{c.cas_max_marks || 0}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap" title={`EST: ${c.est_max_marks || 0} (Min: ${c.est_min_marks || 0}), ESP: ${c.esp_max_marks || 0} (Min: ${c.esp_min_marks || 0}), ESS: ${c.ess_max_marks || 0} (Min: ${c.ess_min_marks || 0})`}>
                      {c.est_max_marks || 0} / {c.esp_max_marks || 0} / {c.ess_max_marks || 0}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="font-bold text-slate-900">{c.total_marks}</div>
                      <div className="text-[10px] text-rose-600 font-medium">Min: {c.total_marks_min}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {existing ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Update
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600">
            {hasMismatches ? (
              <div>
                <span className="font-bold text-emerald-700">{matchedCourses.length}</span> matched course(s) ready to import.{' '}
                <span className="font-bold text-amber-700">{mismatchedCourses.length}</span> course(s) have programme mismatches.
              </div>
            ) : (
              <div>
                <span className="font-semibold text-slate-800">{courses.length}</span> course(s) ready for atomic database synchronization.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Cancel
            </button>

            {hasMismatches ? (
              <>
                {/* Primary Recommended Option: Upload Only Matched Courses */}
                <button
                  onClick={() => onConfirm(matchedCourses, importMode === 'replace')}
                  disabled={isSaving || matchedCourses.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                  title={`Upload only the ${matchedCourses.length} courses whose program names match registered programmes`}
                >
                  <UploadCloud className="w-4 h-4" />
                  {isSaving ? 'Importing Matched...' : `Upload Matched Courses (${matchedCourses.length})`}
                </button>

                {/* Secondary Option: Upload All (including mismatches) */}
                <button
                  onClick={() => onConfirm(courses, importMode === 'replace')}
                  disabled={isSaving || courses.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                  title="Upload all courses including mismatched programmes"
                >
                  <span>Upload All ({courses.length})</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onConfirm(courses, importMode === 'replace')}
                disabled={isSaving || courses.length === 0}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg text-white transition-colors shadow-xs disabled:opacity-50 ${
                  importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                {isSaving
                  ? 'Saving & Configuring Schemes...'
                  : importMode === 'replace'
                  ? `Clear & Replace All (${courses.length} Courses)`
                  : `Confirm & Import (${courses.length} Courses)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
