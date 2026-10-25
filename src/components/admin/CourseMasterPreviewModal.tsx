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

  const { matchedCourses, mismatchedCourses, distinctUnmatchedPrograms, hasMismatches } =
    programValidation;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[96vw] xl:max-w-7xl h-[94vh] max-h-[94vh] flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* TOP HEADER WITH PROMINENT UPLOAD BUTTONS & ACTIONS                        */}
        {/* ========================================================================= */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Course Master & LTPS Import Preview
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {courses.length} Courses Parsed
                </span>
                {hasMismatches && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    {mismatchedCourses.length} Programme Mismatches
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review verified LTPS structures, credits, and marking schemes before committing to the database.
              </p>
            </div>
          </div>

          {/* Top Action Buttons (Unmissable Save / Import buttons) */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasMismatches && (
              <button
                type="button"
                onClick={() => downloadCourseMismatchReport(programValidation, registeredPrograms)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs cursor-pointer"
                title="Download Excel report of courses whose program names do not match the Programs Directory"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Mismatch Report</span> ({mismatchedCourses.length})
              </button>
            )}

            {validation && onDownloadReport && (
              <button
                type="button"
                onClick={onDownloadReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                title="Download the full validation report"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Validation Report</span>
              </button>
            )}

            {/* TOP PRIMARY UPLOAD ACTIONS */}
            {hasMismatches ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onConfirm(matchedCourses, importMode === 'replace')}
                  disabled={isSaving || matchedCourses.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title={`Import only the ${matchedCourses.length} courses matching registered programs`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSaving ? 'Importing...' : `Import Matched (${matchedCourses.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConfirm(courses, importMode === 'replace')}
                  disabled={isSaving || courses.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title="Import all courses including 30 mismatched programmes"
                >
                  <span>Import All ({courses.length})</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onConfirm(courses, importMode === 'replace')}
                disabled={isSaving || courses.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Saving to Database...'
                    : importMode === 'replace'
                    ? `Clear & Replace All (${courses.length})`
                    : `Confirm & Save (${courses.length})`}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CLEAR STATUS BANNER: CLARIFIES PREVIEW VS SAVED STATE                     */}
        {/* ========================================================================= */}
        <div className="px-5 py-2 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-950 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
              NOT YET SAVED
            </span>
            <span className="font-medium text-slate-700">
              File parsed successfully. Review data below and click{' '}
              <strong className="text-emerald-700 font-bold">
                {hasMismatches ? `"Import Matched (${matchedCourses.length})"` : '"Confirm & Save"'}
              </strong>{' '}
              to commit these courses to the database.
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-500 hidden md:block">
            Step 2 of 2: Review & Synchronize
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONTROLS BAR: IMPORT STRATEGY & COMPACT KPI CHIPS                         */}
        {/* ========================================================================= */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          {/* Synchronization Mode Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Import Strategy:</span>
            </span>

            <div className="inline-flex p-0.5 bg-white border border-slate-300 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Update Existing & Add New (Merge)</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Current & Replace All</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 hidden lg:inline">
              {importMode === 'merge' ? (
                <span className="text-emerald-700 font-medium">
                  ✓ Preserves other database records; updates matching and adds new.
                </span>
              ) : (
                <span className="text-rose-600 font-medium">
                  ⚠️ Deletes existing course master records before uploading.
                </span>
              )}
            </span>
          </div>

          {/* Compact KPI Stats */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>New: <strong>{newCount}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Update: <strong>{updateCount}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>Non-Arch (40%): <strong>{nonArchCount}</strong></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Arch (45%): <strong>{archCount}</strong></span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPACT PROGRAMME MISMATCH BANNER (IF MISMATCHES EXIST)                   */}
        {/* ========================================================================= */}
        {hasMismatches && (
          <div className="px-5 py-2.5 bg-amber-50/95 border-b border-amber-200 text-xs shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="flex items-start sm:items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-amber-200/80 text-amber-950 border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>{mismatchedCourses.length} Courses</span>
                </span>
                <span className="text-amber-900 font-semibold text-[11px]">
                  belong to {distinctUnmatchedPrograms.length} programme title(s) not in registered Programs:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {distinctUnmatchedPrograms.slice(0, 4).map((p, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-amber-950 border border-amber-300 text-[10px] font-medium"
                    >
                      <strong>{p.programName}</strong> ({p.count})
                    </span>
                  ))}
                  {distinctUnmatchedPrograms.length > 4 && (
                    <span className="text-[10px] text-amber-800 font-bold">
                      +{distinctUnmatchedPrograms.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Direct In-Alert Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onConfirm(matchedCourses, importMode === 'replace')}
                  disabled={isSaving || matchedCourses.length === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                  title="Upload the 1,404 matched courses and exclude the 30 mismatched courses"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Matched Only ({matchedCourses.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadCourseMismatchReport(programValidation, registeredPrograms)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-amber-900 border border-amber-300 hover:bg-amber-100/70 transition-colors cursor-pointer"
                  title="Download Excel report with suggested program mappings"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors Notice (if any) */}
        {errors.length > 0 && (
          <div className="px-5 py-2 bg-rose-50 border-b border-rose-200 text-xs shrink-0 flex items-center justify-between gap-3 text-rose-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-bold">Notice:</span>
              <span>{errors.slice(0, 2).join(' | ')}</span>
              {errors.length > 2 && <span className="font-semibold">+{errors.length - 2} more</span>}
            </div>
            {onDownloadReport && (
              <button
                onClick={onDownloadReport}
                className="text-rose-700 hover:text-rose-900 underline font-semibold text-[11px] shrink-0"
              >
                View Full Log
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* FILTER & SEARCH BAR                                                       */}
        {/* ========================================================================= */}
        <div className="px-5 py-2 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap bg-white shrink-0 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-56 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject, code, program..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setProgramFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
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
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  programFilter === 'MATCHED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Matched ({matchedCourses.length})</span>
              </button>
              {hasMismatches && (
                <button
                  type="button"
                  onClick={() => setProgramFilter('MISMATCHED')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    programFilter === 'MISMATCHED'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Mismatches ({mismatchedCourses.length})</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewMode('standard')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
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
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  previewMode === 'detailed'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Excel 1:1 view with all 31 template columns"
              >
                <span>Detailed (31 Cols)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">
                  1:1
                </span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Showing <strong>{filtered.length}</strong> of {courses.length} courses
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABLE CONTAINER: SCROLLABLE WITH FIXED HEADER & MIN-H-0                   */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-0 overflow-auto bg-slate-50/30">
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
                  <th className="px-2 py-2.5 text-center whitespace-nowrap" title="L_Cr - T_Cr - P_Cr - S_Cr">
                    L-T-P-S
                  </th>
                  <th className="px-2 py-2.5 text-center whitespace-nowrap" title="Total Credits">
                    Total Cr.
                  </th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Grading Category</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Scheme Heads</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">IA Max / Min</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">ESE (EST/ESP/ESS)</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Total Max / Min</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Action</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">#</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">AcademicPeriod</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">Term</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">Program Code</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 min-w-[180px]">Program Name & Status</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">Regulation Group</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">Subject Type</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">Sem</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap">Course Code</th>
                  <th className="px-3 py-2.5 font-bold text-slate-700 min-w-[180px]">Course Name (Subject Title)</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">Students</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">L</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">T</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">P</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">S</th>
                  <th className="px-2 py-2.5 text-center font-bold text-indigo-700 bg-indigo-50/80">Credits</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700 whitespace-nowrap border-r border-slate-200">Category</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAT1</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAT2</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAT3</th>
                  <th className="px-2 py-2.5 text-center font-bold text-blue-900 bg-blue-50/80 border-r border-blue-100">CAT Max</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAP1</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAP2</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAP3</th>
                  <th className="px-2 py-2.5 text-center font-bold text-emerald-900 bg-emerald-50/80 border-r border-emerald-100">CAP Max</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAS1</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAS2</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">CAS3</th>
                  <th className="px-2 py-2.5 text-center font-bold text-amber-900 bg-amber-50/80 border-r border-amber-100">CAS Max</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">EST</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">ESP</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">ESS</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-900 bg-slate-200/60 border-l border-slate-200">Total Marks</th>
                  <th className="px-2 py-2.5 text-center font-bold text-slate-700">Action</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((c, idx) => {
                const existing = isExisting(c);
                const isArch = c.grading_category === 'Architecture';
                const match = findMatchingProgram(c, registeredPrograms);
                const isMatched = !!match.program;

                const thActive =
                  (c.cat1_max || 0) +
                    (c.cat2_max || 0) +
                    (c.cat3_max || 0) +
                    (c.est_max_marks || 0) +
                    (c.cat_max_marks || 0) >
                  0;
                const prActive =
                  (c.cap1_max || 0) +
                    (c.cap2_max || 0) +
                    (c.cap3_max || 0) +
                    (c.esp_max_marks || 0) +
                    (c.cap_max_marks || 0) >
                  0;
                const skActive =
                  (c.cas1_max || 0) +
                    (c.cas2_max || 0) +
                    (c.cas3_max || 0) +
                    (c.ess_max_marks || 0) +
                    (c.cas_max_marks || 0) >
                  0;

                return previewMode === 'detailed' ? (
                  <tr
                    key={idx}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      !isMatched ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {c.academic_period || '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 text-[11px] whitespace-nowrap">
                      {c.term || '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {c.program_code || '—'}
                    </td>
                    <td className="px-3 py-2 min-w-[180px]">
                      <div className="font-semibold text-slate-900 text-xs">{c.cm_course_name}</div>
                      {!isMatched ? (
                        <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Programme not registered</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Verified ({match.program?.program_code})</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-[10px] text-slate-600 whitespace-nowrap">
                      {c.regulation_group || '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-600 text-[11px] whitespace-nowrap">
                      {c.subject_type || '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-slate-700 text-xs">{c.semester}</td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                      {c.paper_code}
                    </td>
                    <td className="px-3 py-2 min-w-[180px] font-medium text-slate-800 text-xs">
                      {c.sm_subject_name}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600 text-xs">
                      {c.student_count !== null && c.student_count !== undefined ? c.student_count : '—'}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600">{c.l}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600">{c.t}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600">{c.p}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600">{c.s}</td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                      {c.total_credits}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-slate-200 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isArch ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {c.grading_category || 'Non-Architecture'}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cat1_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cat2_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cat3_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center font-bold text-blue-900 bg-blue-50/50 border-r border-blue-100">
                      {c.cat_max_marks ?? ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0))}
                    </td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cap1_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cap2_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cap3_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center font-bold text-emerald-900 bg-emerald-50/50 border-r border-emerald-100">
                      {c.cap_max_marks ?? ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0))}
                    </td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cas1_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cas2_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center text-slate-600">{c.cas3_max || 0}</td>
                    <td className="px-2 py-2 font-mono text-center font-bold text-amber-900 bg-amber-50/50 border-r border-amber-100">
                      {c.cas_max_marks ?? ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0))}
                    </td>
                    <td className="px-2 py-2 font-mono text-center font-semibold text-blue-700">
                      {c.est_max_marks || 0}
                    </td>
                    <td className="px-2 py-2 font-mono text-center font-semibold text-emerald-700">
                      {c.esp_max_marks || 0}
                    </td>
                    <td className="px-2 py-2 font-mono text-center font-semibold text-amber-700">
                      {c.ess_max_marks || 0}
                    </td>
                    <td className="px-2 py-2 font-mono text-center font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                      {c.total_marks}
                    </td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      {existing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Update
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={idx}
                    className={`hover:bg-indigo-50/40 transition-colors ${
                      !isMatched ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="font-medium text-slate-700 text-xs">{c.academic_period || '—'}</div>
                      {c.term && <div className="text-[10px] text-slate-400 font-semibold">{c.term}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-xs">{c.cm_course_name}</span>
                        {c.program_code && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {c.program_code}
                          </span>
                        )}
                      </div>
                      {!isMatched ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Programme not registered</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified ({match.program?.program_code})</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-bold text-xs">
                          {c.paper_code}
                        </span>
                        <span className="font-medium text-slate-800 text-xs">{c.sm_subject_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {c.regulation_group ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-50 text-slate-700 border border-slate-200">
                          {c.regulation_group}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="text-xs text-slate-600">{c.subject_type || '—'}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-slate-700 text-xs">{c.semester}</td>
                    <td className="px-2 py-2 text-center font-mono text-slate-600 text-xs">
                      {c.student_count !== null && c.student_count !== undefined ? c.student_count : '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-slate-500 font-mono tracking-widest whitespace-nowrap text-xs">
                      {c.l}-{c.t}-{c.p}-{c.s}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/50 text-xs">
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
                        <span className="text-[9px] font-semibold opacity-80">
                          ({isArch ? '45%' : '40%'})
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {thActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Theory
                          </span>
                        )}
                        {prActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Practical
                          </span>
                        )}
                        {skActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Skills
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div>
                        <span className="font-bold text-slate-800">{c.ia_max_marks}</span>
                        <span className="text-[10px] text-slate-400 mx-1">/</span>
                        <span className="text-emerald-700 font-semibold">{c.ia_min_marks}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
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

        {/* ========================================================================= */}
        {/* PERMANENT STICKY BOTTOM ACTION BAR (NEVER CUT OFF)                         */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg z-20">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            {hasMismatches ? (
              <div>
                <strong className="text-emerald-700 font-bold">{matchedCourses.length}</strong> clean courses ready for database import.{' '}
                <span className="text-amber-800 font-semibold">({mismatchedCourses.length} programme mismatches)</span>
              </div>
            ) : (
              <div>
                <strong className="text-slate-900 font-bold">{courses.length}</strong> course(s) ready for database import.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>

            {hasMismatches ? (
              <>
                {/* Secondary Option: Upload All */}
                <button
                  type="button"
                  onClick={() => onConfirm(courses, importMode === 'replace')}
                  disabled={isSaving || courses.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-2xs cursor-pointer"
                  title="Upload all 1,434 courses including mismatched programmes"
                >
                  <span>Upload All ({courses.length})</span>
                </button>

                {/* Primary Recommended Option: Upload Matched Courses */}
                <button
                  type="button"
                  onClick={() => onConfirm(matchedCourses, importMode === 'replace')}
                  disabled={isSaving || matchedCourses.length === 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title={`Upload only the ${matchedCourses.length} courses whose program names match registered programmes`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Importing Courses...'
                      : `Upload Matched Courses (${matchedCourses.length})`}
                  </span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onConfirm(courses, importMode === 'replace')}
                disabled={isSaving || courses.length === 0}
                className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Saving to Database...'
                    : importMode === 'replace'
                    ? `Clear & Replace All (${courses.length} Courses)`
                    : `Confirm & Save to Database (${courses.length} Courses)`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
