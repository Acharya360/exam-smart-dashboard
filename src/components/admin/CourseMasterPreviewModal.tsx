import React, { useState } from 'react';
import { CourseMaster } from '../../types';
import type { ValidationResult } from '../../utils/validation';
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
} from 'lucide-react';

type CourseDraft = Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>;

interface CourseMasterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  courses: CourseDraft[];
  existingCourses: CourseMaster[];
  errors: string[];
  validation?: ValidationResult<CourseDraft> | null;
  onDownloadReport?: () => void;
  isSaving: boolean;
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
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const isExisting = (c: Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>) =>
    existingCourses.some(
      (e) => e.paper_code === c.paper_code && e.cm_course_name === c.cm_course_name
    );

  const newCount = courses.filter((c) => !isExisting(c)).length;
  const updateCount = courses.filter((c) => isExisting(c)).length;
  const archCount = courses.filter((c) => c.grading_category === 'Architecture').length;
  const nonArchCount = courses.filter((c) => c.grading_category === 'Non-Architecture').length;

  const filtered = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.cm_course_name.toLowerCase().includes(q) ||
      c.paper_code.toLowerCase().includes(q) ||
      c.sm_subject_name.toLowerCase().includes(q) ||
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
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify LTPS structures, grading categories, and assessment marking schemes before saving to the database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {validation && onDownloadReport && (
              <button
                onClick={onDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                title="Download the full validation report (summary, errors, duplicates, unmatched masters, suggestions)"
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

        {validation && (validation.summary.invalidRows > 0 || validation.summary.duplicateRows > 0 || validation.summary.warningRows > 0) && (
          <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-medium">
            <span className="text-slate-500 uppercase tracking-wide font-bold">Data Validation</span>
            <span className="text-emerald-700">{validation.summary.validRows} clean</span>
            {validation.summary.warningRows > 0 && <span className="text-amber-700">{validation.summary.warningRows} warnings</span>}
            {validation.summary.duplicateRows > 0 && <span className="text-rose-700">{validation.summary.duplicateRows} duplicates (excluded)</span>}
            {validation.summary.invalidRows > 0 && <span className="text-rose-700">{validation.summary.invalidRows} invalid (excluded)</span>}
            {validation.summary.unmatchedProgrammes > 0 && <span className="text-amber-700">{validation.summary.unmatchedProgrammes} programme(s) not in master</span>}
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

        {/* Filter bar */}
        <div className="px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search program, course name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Showing {filtered.length} of {courses.length} courses
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold shadow-2xs">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">#</th>
                <th className="px-3 py-2.5 min-w-[200px]">Program & Course Name</th>
                <th className="px-3 py-2.5 text-center">Course Code / Sem</th>
                <th className="px-2 py-2.5 text-center" title="L_Cr - T_Cr - P_Cr - S_Cr">L-T-P-S</th>
                <th className="px-2 py-2.5 text-center" title="Total Credits">Total Cr.</th>
                <th className="px-3 py-2.5 text-center">Grading Category</th>
                <th className="px-3 py-2.5 text-center">Heads (Theory/Practical/Skills)</th>
                <th className="px-3 py-2.5 text-center">Internal (IA Max / Min)</th>
                <th className="px-3 py-2.5 text-center" title="End Semester Exam: EST (Theory) / ESP (Practical) / ESS (Skills)">ESE (EST / ESP / ESS)</th>
                <th className="px-3 py-2.5 text-center">Total Marks (Max / Min)</th>
                <th className="px-3 py-2.5 text-center">Sync Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c, idx) => {
                const existing = isExisting(c);
                const isArch = c.grading_category === 'Architecture';

                const thActive = ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0) + (c.est_max_marks || 0)) > 0;
                const prActive = ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0) + (c.esp_max_marks || 0)) > 0;
                const skActive = ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0) + (c.ess_max_marks || 0)) > 0;

                return (
                  <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">
                      {c.sr_no || idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-900">{c.sm_subject_name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[220px]" title={c.cm_course_name}>
                        {c.cm_course_name}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                        {c.paper_code}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-500 font-medium">Sem {c.semester}</span>
                    </td>
                    <td className="px-2 py-2 text-center font-mono tracking-wider text-slate-600 text-[11px]">
                      {c.l}-{c.t}-{c.p}-{c.s}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50/40">
                      {c.total_credits}
                    </td>
                    <td className="px-3 py-2 text-center">
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
                    <td className="px-3 py-2 text-center">
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
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-slate-800">{c.ia_max_marks}</span>
                      <span className="text-[10px] text-slate-400 mx-1">/</span>
                      <span className="text-emerald-700 font-semibold">{c.ia_min_marks}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-slate-600" title={`EST: ${c.est_max_marks || 0} (Min: ${c.est_min_marks || 0}), ESP: ${c.esp_max_marks || 0} (Min: ${c.esp_min_marks || 0}), ESS: ${c.ess_max_marks || 0} (Min: ${c.ess_min_marks || 0})`}>
                      {c.est_max_marks || 0} / {c.esp_max_marks || 0} / {c.ess_max_marks || 0}
                    </td>
                    <td className="px-3 py-2 text-center">
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
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{courses.length}</span> course(s) ready for atomic database synchronization and automated scheme generation.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSaving || courses.length === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {isSaving ? 'Saving & Configuring Schemes...' : `Confirm & Import (${courses.length} Courses)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
