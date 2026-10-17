import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { CourseMaster } from '../../types';
import { parseCourseMasterExcel, downloadCourseMasterTemplate } from '../../services/excelParser';
import { CourseMasterPreviewModal } from './CourseMasterPreviewModal';
import {
  BookOpen,
  UploadCloud,
  Download,
  Search,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Award,
  Info,
  X,
} from 'lucide-react';

export const CourseMasterUI: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [courses, setCourses] = useState<CourseMaster[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Non-Architecture' | 'Architecture'>('ALL');
  
  // Upload and preview state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCourses, setPreviewCourses] = useState<Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scheme detail inspection modal
  const [inspectedCourse, setInspectedCourse] = useState<CourseMaster | null>(null);

  const fetchCourses = async () => {
    const data = await db.getCourseMaster();
    setCourses(data);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadSuccess(null);
    setUploadErrors([]);
    setIsUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseCourseMasterExcel(buffer);

      if (!result.success && result.data.length === 0) {
        setUploadErrors(result.errors.length ? result.errors : ['No valid course data found in the uploaded file.']);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setPreviewCourses(result.data);
      setPreviewErrors(result.errors);
      setIsPreviewOpen(true);
    } catch (err) {
      setUploadErrors([err instanceof Error ? err.message : 'Failed to parse file.']);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (previewCourses.length === 0) return;
    setIsUploading(true);

    const upsertResult = await db.upsertCourseMaster(previewCourses);
    setIsUploading(false);

    if (upsertResult.error) {
      setUploadErrors([`Database Error: ${upsertResult.error}`]);
    } else {
      setIsPreviewOpen(false);
      setUploadSuccess(`Successfully imported and configured ${previewCourses.length} course(s) and assessment schemes!`);
      await fetchCourses();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this course configuration?')) {
      await db.deleteCourseMasterRecord(id);
      fetchCourses();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCourses.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedCourses.size} course records?`)) {
      setIsUploading(true);
      const ids = Array.from(selectedCourses);
      await db.deleteCourseMasterRecords(ids);
      setSelectedCourses(new Set());
      await fetchCourses();
      setIsUploading(false);
      setUploadSuccess(`Successfully deleted ${ids.length} course record(s).`);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (categoryFilter !== 'ALL' && (c.grading_category || 'Non-Architecture') !== categoryFilter) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.cm_course_name.toLowerCase().includes(q) ||
      c.paper_code.toLowerCase().includes(q) ||
      c.sm_subject_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Course Master Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage program syllabus, L-T-P-S credits, grading categories, and complete internal & ESE marking schemes
          </p>
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedCourses.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-200 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedCourses.size})
              </button>
            )}
            <button
              onClick={downloadCourseMasterTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors shadow-xs border border-slate-300"
              title="Download enhanced LTPS Course Master template with native Excel dropdown data validation"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Processing...' : 'Import Courses'}
            </button>
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Upload Feedback */}
      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{uploadSuccess}</span>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto">
          <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Upload Issues Found
          </div>
          <ul className="list-disc pl-5 text-rose-700 space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{courses.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Courses</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {new Set(courses.map(c => c.cm_course_name)).size}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique Programs</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {new Set(courses.map(c => c.paper_code)).size}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique Subjects</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {courses.filter(c => c.grading_category === 'Architecture').length} / {courses.filter(c => c.grading_category !== 'Architecture').length}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Arch / Non-Arch</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or paper code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | 'Non-Architecture' | 'Architecture')}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium"
            >
              <option value="ALL">All Grading Categories</option>
              <option value="Non-Architecture">Non-Architecture (40% Passing)</option>
              <option value="Architecture">Architecture (45% Passing)</option>
            </select>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        </div>

        <div className="overflow-auto max-h-[620px] rounded-b-xl border-t border-slate-200">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="bg-slate-100 border-b border-slate-200">
                {isSuperAdmin && (
                  <th className="text-center px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={filteredCourses.length > 0 && selectedCourses.size === filteredCourses.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCourses(new Set(filteredCourses.map(c => c.id)));
                        } else {
                          setSelectedCourses(new Set());
                        }
                      }}
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-bold text-slate-700 w-12">#</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700 min-w-[200px]">Program & Subject</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700">Paper Code</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700 whitespace-nowrap">Sem</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700" title="Lecture-Tutorial-Practical-Skills">L-T-P-S</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700">Cr.</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200">Category</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700">Scheme Heads</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Total Max</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700">Total Min</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c, idx) => {
                const isArch = c.grading_category === 'Architecture';
                const thActive = ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0) + (c.est_max_marks || 0) + (c.cat_max_marks || 0)) > 0;
                const prActive = ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0) + (c.esp_max_marks || 0) + (c.cap_max_marks || 0)) > 0;
                const skActive = ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0) + (c.ess_max_marks || 0)) > 0;

                return (
                  <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedCourses.has(c.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedCourses);
                            if (e.target.checked) newSet.add(c.id);
                            else newSet.delete(c.id);
                            setSelectedCourses(newSet);
                          }}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-500">{c.sr_no || idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.sm_subject_name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[250px]" title={c.cm_course_name}>
                        {c.cm_course_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                        {c.paper_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{c.semester}</td>
                    <td className="px-2 py-3 text-center text-slate-500 font-mono tracking-widest">
                      {c.l}-{c.t}-{c.p}-{c.s}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-indigo-700 bg-indigo-50/50">
                      {c.total_credits}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-100">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isArch
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {c.grading_category || 'Non-Architecture'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setInspectedCourse(c)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                        title="Click to view complete marking scheme and component details"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${thActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold">T</span>
                        <span className={`w-1.5 h-1.5 rounded-full ml-1 ${prActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold">P</span>
                        <span className={`w-1.5 h-1.5 rounded-full ml-1 ${skActive ? 'bg-amber-500' : 'bg-slate-300'}`} />
                        <span className="font-semibold">S</span>
                        <Info className="w-3 h-3 ml-1 text-slate-400" />
                      </button>
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-slate-800 border-l border-slate-100">
                      {c.total_marks}
                    </td>
                    <td className="px-2 py-3 text-center font-bold text-rose-700 bg-rose-50/30">
                      {c.total_marks_min}
                    </td>
                    <td className="px-2 py-3 text-center border-l border-slate-100">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 12 : 11} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No courses found.</p>
                      {isSuperAdmin && <p className="text-[10px] mt-1">Upload an Excel file to get started.</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Preview Modal */}
      <CourseMasterPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirmImport}
        courses={previewCourses}
        existingCourses={courses}
        errors={previewErrors}
        isSaving={isUploading}
      />

      {/* Scheme Detail Inspection Modal */}
      {inspectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  {inspectedCourse.sm_subject_name} ({inspectedCourse.paper_code})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {inspectedCourse.cm_course_name} · Semester {inspectedCourse.semester}
                </p>
              </div>
              <button
                onClick={() => setInspectedCourse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Grading Category</div>
                  <div className="text-xs font-bold text-indigo-700 mt-1">
                    {inspectedCourse.grading_category || 'Non-Architecture'}
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">LTPS & Credits</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {inspectedCourse.l}-{inspectedCourse.t}-{inspectedCourse.p}-{inspectedCourse.s} ({inspectedCourse.total_credits} Cr)
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Max / Min</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {inspectedCourse.total_marks} / <span className="text-rose-600">{inspectedCourse.total_marks_min}</span>
                  </div>
                </div>
              </div>

              {/* Assessment Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-[320px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2">Head</th>
                      <th className="px-3 py-2 text-center">CA1</th>
                      <th className="px-3 py-2 text-center">CA2</th>
                      <th className="px-3 py-2 text-center">CA3</th>
                      <th className="px-3 py-2 text-center">ESE Max</th>
                      <th className="px-3 py-2 text-center">ESE Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Theory</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{inspectedCourse.est_max_marks || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-rose-600 font-bold">{inspectedCourse.est_min_marks || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Practical</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{inspectedCourse.esp_max_marks || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-rose-600 font-bold">{inspectedCourse.esp_min_marks || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Skills</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{inspectedCourse.ess_max_marks || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-rose-600 font-bold">{inspectedCourse.ess_min_marks || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-900 text-[11px] flex items-center justify-between">
                <span>Internal Assessment (IA) Total: <strong>{inspectedCourse.ia_max_marks}</strong> (Passing: <strong>{inspectedCourse.ia_min_marks}</strong>)</span>
                <span className="font-semibold text-indigo-700">Passing: {inspectedCourse.grading_category === 'Architecture' ? '45%' : '40%'}</span>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectedCourse(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
