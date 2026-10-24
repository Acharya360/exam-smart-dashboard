import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { CourseMaster, Program } from '../../types';
import { parseCourseMasterExcel, downloadCourseMasterTemplate, exportCourseMasterToExcel } from '../../services/excelParser';
import { CourseMasterPreviewModal } from './CourseMasterPreviewModal';
import {
  validateParsedEntities,
  generateImportErrorReport,
  type MasterRecord,
  type ValidationResult,
} from '../../utils/validation';

type CourseDraft = Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>;
import {
  BookOpen,
  UploadCloud,
  Download,
  Search,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Award,
  Info,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GraduationCap,
  CalendarDays,
  BarChart3,
  Users,
  Grid3X3,
  List,
} from 'lucide-react';

type CourseSortKey =
  | 'sr_no'
  | 'academic_period'
  | 'term'
  | 'program_code'
  | 'program'
  | 'regulation_group'
  | 'subject_type'
  | 'paper_code'
  | 'semester'
  | 'student_count'
  | 'total_credits'
  | 'grading_category'
  | 'total_marks'
  | 'total_marks_min';

const COURSE_SORT_LABELS: Record<CourseSortKey, string> = {
  sr_no: 'ID',
  academic_period: 'Period',
  term: 'Term',
  program_code: 'Prog Code',
  program: 'Program & Course Name',
  regulation_group: 'Regulation Group',
  subject_type: 'Subject Type',
  paper_code: 'Course Code',
  semester: 'Sem',
  student_count: 'Students',
  total_credits: 'Cr.',
  grading_category: 'Category & Pass %',
  total_marks: 'Total Max',
  total_marks_min: 'Total Min',
};

export interface CourseMasterUIProps {
  initialSearch?: string;
  onNavigateToFaculty?: (subjectCode: string) => void;
  onNavigateToMarks?: (paperCode: string) => void;
  onNavigateToTimetable?: (paperCode: string) => void;
  onNavigateToReports?: (paperCode: string) => void;
}

export const CourseMasterUI: React.FC<CourseMasterUIProps> = ({
  initialSearch,
  onNavigateToFaculty,
  onNavigateToMarks,
  onNavigateToTimetable,
  onNavigateToReports,
}) => {
  const { isSuperAdmin } = useAuth();
  const [courses, setCourses] = useState<CourseMaster[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Non-Architecture' | 'Architecture'>('ALL');
  const [viewMode, setViewMode] = useState<'standard' | 'excel_grid'>('standard');
  const [sort, setSort] = useState<{ key: CourseSortKey; dir: 'asc' | 'desc' }>({ key: 'sr_no', dir: 'asc' });

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);
  
  // Upload and preview state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewCourses, setPreviewCourses] = useState<CourseDraft[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [previewResult, setPreviewResult] = useState<ValidationResult<CourseDraft> | null>(null);
  const [registeredPrograms, setRegisteredPrograms] = useState<Program[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scheme detail inspection modal
  const [inspectedCourse, setInspectedCourse] = useState<CourseMaster | null>(null);

  const fetchCourses = async () => {
    const data = await db.getCourseMaster();
    setCourses(data);
  };

  const fetchPrograms = async () => {
    const progs = await db.getPrograms().catch((err) => {
      console.error('Course Master: failed to load programs', err);
      return [];
    });
    setRegisteredPrograms(progs);
    return progs;
  };

  useEffect(() => {
    fetchCourses();
    fetchPrograms();
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

      // Master cross-validation: warn when a course programme is not yet in the
      // Program master. Never blocks the import (Course Master legitimately
      // introduces programmes); nearest-match is offered for confirmation.
      const programs = await db.getPrograms().catch((err) => {
        console.error('Course Master: failed to load programs for cross-validation', err);
        return [];
      });
      const programmes: MasterRecord[] = programs.map(p => ({
        id: p.id, code: p.program_code, name: p.program_name,
      }));

      const validation = validateParsedEntities<CourseDraft>({
        moduleName: 'Course Master',
        fileName: file.name,
        items: result.data,
        labels: { cm_course_name: 'Programme', semester: 'Semester', paper_code: 'Subject Code', sm_subject_name: 'Subject Name' },
        duplicateKeyFields: ['cm_course_name', 'semester', 'paper_code'],
        masterChecks: programmes.length
          ? [{ field: 'cm_course_name', fieldLabel: 'Programme', masterType: 'programme', severity: 'warning', allowSuggest: true, master: programmes }]
          : [],
        parserErrors: result.errors,
        fieldsOf: (c) => ({
          cm_course_name: c.cm_course_name,
          semester: String(c.semester),
          paper_code: c.paper_code,
          sm_subject_name: c.sm_subject_name,
          grading_category: c.grading_category || 'Non-Architecture',
        }),
      });

      setPreviewCourses(validation.data);
      setPreviewResult(validation);
      setPreviewErrors(validation.errors);
      setIsPreviewOpen(true);
    } catch (err) {
      setUploadErrors([err instanceof Error ? err.message : 'Failed to parse file.']);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadReport = () => {
    if (previewResult) generateImportErrorReport(previewResult);
  };

  const handleConfirmImport = async (coursesToImport?: CourseDraft[], clearExisting: boolean = false) => {
    const toImport = coursesToImport && coursesToImport.length > 0 ? coursesToImport : previewCourses;
    if (toImport.length === 0) return;
    setIsUploading(true);

    const upsertResult = await db.upsertCourseMaster(toImport, clearExisting);
    setIsUploading(false);

    if (upsertResult.error) {
      setUploadErrors([`Database Error: ${upsertResult.error}`]);
    } else {
      setIsPreviewOpen(false);
      setPreviewResult(null);
      const skippedCount = previewCourses.length - toImport.length;
      const modeText = clearExisting ? ' (Cleared previous database records)' : '';
      if (skippedCount > 0) {
        setUploadSuccess(
          `Successfully imported ${toImport.length} matched course(s)${modeText}! ${skippedCount} mismatched course(s) were excluded.`
        );
      } else {
        setUploadSuccess(
          `Successfully imported and configured all ${toImport.length} course(s) and assessment schemes${modeText}!`
        );
      }
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
      (c.cm_course_name || '').toLowerCase().includes(q) ||
      (c.paper_code || '').toLowerCase().includes(q) ||
      (c.sm_subject_name || '').toLowerCase().includes(q) ||
      (c.academic_period || '').toLowerCase().includes(q) ||
      (c.term || '').toLowerCase().includes(q) ||
      (c.program_code || '').toLowerCase().includes(q) ||
      (c.regulation_group || '').toLowerCase().includes(q) ||
      (c.subject_type || '').toLowerCase().includes(q)
    );
  });

  const toggleSort = (key: CourseSortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  const SortHeader = ({ k, className = '', align = 'text-center' }: { k: CourseSortKey; className?: string; align?: string }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th className={`px-3 py-2.5 ${align} ${className}`}>
        <button
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 font-bold hover:text-indigo-700 transition-colors ${
            active ? 'text-indigo-700' : 'text-slate-700'
          }`}
          title={`Sort by ${COURSE_SORT_LABELS[k]}`}
        >
          <span>{COURSE_SORT_LABELS[k]}</span>
          <Icon className="w-3 h-3" />
        </button>
      </th>
    );
  };

  const sortedCourses = useMemo(() => {
    const valueOf = (c: CourseMaster): string | number => {
      switch (sort.key) {
        case 'sr_no':
          return c.sr_no ?? 0;
        case 'academic_period':
          return (c.academic_period || '').toLowerCase();
        case 'term':
          return (c.term || '').toLowerCase();
        case 'program_code':
          return (c.program_code || '').toLowerCase();
        case 'program':
          return (c.cm_course_name || '').toLowerCase();
        case 'regulation_group':
          return (c.regulation_group || '').toLowerCase();
        case 'subject_type':
          return (c.subject_type || '').toLowerCase();
        case 'paper_code':
          return (c.paper_code || '').toLowerCase();
        case 'semester':
          return c.semester ?? 0;
        case 'student_count':
          return c.student_count ?? 0;
        case 'total_credits':
          return c.total_credits ?? 0;
        case 'grading_category':
          return (c.grading_category || 'Non-Architecture').toLowerCase();
        case 'total_marks':
          return c.total_marks ?? 0;
        case 'total_marks_min':
          return c.total_marks_min ?? 0;
        default:
          return '';
      }
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredCourses].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      const sa = (a.sm_subject_name || '').toLowerCase();
      const sb = (b.sm_subject_name || '').toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return (a.sr_no ?? 0) - (b.sr_no ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses, sort]);

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
              title="Download official LTPS Course Master template (31 columns)"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={() => exportCourseMasterToExcel(courses)}
              disabled={courses.length === 0}
              className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-xs border border-slate-300 disabled:opacity-50"
              title="Export all active course master records in the 31-column template format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export ({courses.length})
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {courses.reduce((sum, c) => sum + (c.student_count || 0), 0).toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Students</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
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
                placeholder="Search subject, paper code, program, regulation..."
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

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs ml-1">
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Standard operational view with curriculum attributes and active assessment heads"
              >
                <List className="w-3.5 h-3.5" />
                Standard View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('excel_grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'excel_grid'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title="Excel 1:1 layout with all 30 columns including individual CAT1-3, CAP1-3, CAS1-3, EST, ESP, ESS marks"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Excel 1:1 Grid (30 Cols)
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
            <span>
              Sorted by <span className="font-semibold text-slate-700">{COURSE_SORT_LABELS[sort.key]}</span> · {sort.dir === 'asc' ? 'ascending' : 'descending'}
            </span>
            <span>Showing {filteredCourses.length} of {courses.length} courses</span>
          </div>
        </div>

        <div className="overflow-auto max-h-[620px] rounded-b-xl border-t border-slate-200">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="bg-slate-100 border-b border-slate-200">
                {isSuperAdmin && (
                  <th className="text-center px-3 py-3 w-10">
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
                {viewMode === 'standard' ? (
                  <>
                    <SortHeader k="sr_no" align="text-left" className="w-10" />
                    <SortHeader k="academic_period" className="whitespace-nowrap" />
                    <SortHeader k="program" align="text-left" className="min-w-[180px]" />
                    <SortHeader k="paper_code" />
                    <SortHeader k="subject_type" className="whitespace-nowrap" />
                    <SortHeader k="semester" className="whitespace-nowrap w-12" />
                    <SortHeader k="student_count" className="whitespace-nowrap w-16" />
                    <SortHeader k="regulation_group" className="whitespace-nowrap min-w-[130px]" />
                    <th className="text-center px-2 py-3 font-bold text-slate-700" title="Lecture-Tutorial-Practical-Skills">L-T-P-S</th>
                    <SortHeader k="total_credits" />
                    <SortHeader k="grading_category" className="border-l border-slate-200" />
                    <th className="text-center px-3 py-3 font-bold text-slate-700">Scheme Heads</th>
                    <SortHeader k="total_marks" className="border-l border-slate-200" />
                    <SortHeader k="total_marks_min" />
                    <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Actions</th>
                  </>
                ) : (
                  <>
                    <SortHeader k="sr_no" align="text-left" className="w-10 whitespace-nowrap" />
                    <SortHeader k="academic_period" className="whitespace-nowrap" />
                    <SortHeader k="term" className="whitespace-nowrap" />
                    <SortHeader k="program_code" className="whitespace-nowrap" />
                    <SortHeader k="program" align="text-left" className="min-w-[200px]" />
                    <SortHeader k="regulation_group" className="whitespace-nowrap min-w-[150px]" />
                    <SortHeader k="subject_type" className="whitespace-nowrap" />
                    <SortHeader k="semester" className="whitespace-nowrap" />
                    <SortHeader k="paper_code" className="whitespace-nowrap" />
                    <th className="px-3 py-3 text-left font-bold text-slate-700 min-w-[180px]">Course Name</th>
                    <SortHeader k="student_count" className="whitespace-nowrap" />
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">L_Cr</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">T_Cr</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">P_Cr</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">S_Cr</th>
                    <SortHeader k="total_credits" className="whitespace-nowrap" />
                    <SortHeader k="grading_category" className="border-l border-slate-200 whitespace-nowrap" />
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAT1 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAT2 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAT3 Max</th>
                    <th className="text-center px-2.5 py-3 font-bold text-blue-900 bg-blue-50/80 whitespace-nowrap border-r border-blue-100">CAT Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAP1 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAP2 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAP3 Max</th>
                    <th className="text-center px-2.5 py-3 font-bold text-emerald-900 bg-emerald-50/80 whitespace-nowrap border-r border-emerald-100">CAP Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAS1 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAS2 Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">CAS3 Max</th>
                    <th className="text-center px-2.5 py-3 font-bold text-amber-900 bg-amber-50/80 whitespace-nowrap border-r border-amber-100">CAS Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">EST Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">ESP Max</th>
                    <th className="text-center px-2 py-3 font-bold text-slate-700 whitespace-nowrap">ESS Max</th>
                    <SortHeader k="total_marks" className="border-l border-slate-200 whitespace-nowrap" />
                    <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCourses.map((c, idx) => {
                const isArch = c.grading_category === 'Architecture';
                const thActive = ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0) + (c.est_max_marks || 0) + (c.cat_max_marks || 0)) > 0;
                const prActive = ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0) + (c.esp_max_marks || 0) + (c.cap_max_marks || 0)) > 0;
                const skActive = ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0) + (c.ess_max_marks || 0)) > 0;

                return (
                  <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {isSuperAdmin && (
                      <td className="px-3 py-3 text-center border-r border-slate-100">
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
                    {viewMode === 'standard' ? (
                      <>
                        <td className="px-3 py-3 text-slate-500">{c.sr_no || idx + 1}</td>
                        <td className="px-2 py-3 text-center text-slate-600 whitespace-nowrap">
                          <div className="font-medium text-[11px]">{c.academic_period || '—'}</div>
                          {c.term && <div className="text-[10px] text-slate-400 font-semibold">{c.term}</div>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900">{c.cm_course_name}</span>
                            {c.program_code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {c.program_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                              {c.paper_code}
                            </span>
                            <span className="font-medium text-slate-800">{c.sm_subject_name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          {c.subject_type ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {c.subject_type}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-slate-700">{c.semester}</td>
                        <td className="px-2 py-3 text-center font-mono text-slate-700 font-semibold">
                          {c.student_count !== null && c.student_count !== undefined ? c.student_count : '—'}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {c.regulation_group ? (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-50 text-slate-700 border border-slate-200" title={c.regulation_group}>
                              {c.regulation_group}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center text-slate-500 font-mono tracking-widest whitespace-nowrap">
                          {c.l}-{c.t}-{c.p}-{c.s}
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-indigo-700 bg-indigo-50/50">
                          {c.total_credits}
                        </td>
                        <td className="px-3 py-3 text-center border-l border-slate-100 whitespace-nowrap">
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
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-3 text-slate-500 text-center font-mono">{c.sr_no || idx + 1}</td>
                        <td className="px-2 py-3 text-slate-700 whitespace-nowrap text-center">{c.academic_period || '—'}</td>
                        <td className="px-2 py-3 text-slate-700 whitespace-nowrap text-center">{c.term || '—'}</td>
                        <td className="px-2 py-3 font-mono text-slate-700 text-center">{c.program_code || '—'}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900 min-w-[180px]">{c.cm_course_name}</td>
                        <td className="px-2 py-3 font-mono text-[10px] text-slate-600 whitespace-nowrap" title={c.regulation_group || ''}>
                          {c.regulation_group || '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-700 text-center whitespace-nowrap">{c.subject_type || '—'}</td>
                        <td className="px-2 py-3 font-bold text-slate-700 text-center">{c.semester}</td>
                        <td className="px-2 py-3 font-mono font-bold text-slate-800 text-center">{c.paper_code}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 min-w-[160px]">{c.sm_subject_name}</td>
                        <td className="px-2 py-3 font-mono text-center font-semibold text-slate-800">
                          {c.student_count !== null && c.student_count !== undefined ? c.student_count : '—'}
                        </td>
                        <td className="px-2 py-3 font-mono text-center text-slate-600">{c.l}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-600">{c.t}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-600">{c.p}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-600">{c.s}</td>
                        <td className="px-2 py-3 font-mono text-center font-bold text-indigo-700 bg-indigo-50/40">{c.total_credits}</td>
                        <td className="px-2 py-3 text-center border-l border-slate-100 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isArch ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {c.grading_category || 'Non-Architecture'}
                          </span>
                        </td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cat1_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cat2_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cat3_max || 0}</td>
                        <td className="px-2.5 py-3 font-mono text-center font-bold text-blue-900 bg-blue-50/60 border-r border-blue-100">
                          {c.cat_max_marks ?? ((c.cat1_max || 0) + (c.cat2_max || 0) + (c.cat3_max || 0))}
                        </td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cap1_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cap2_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cap3_max || 0}</td>
                        <td className="px-2.5 py-3 font-mono text-center font-bold text-emerald-900 bg-emerald-50/60 border-r border-emerald-100">
                          {c.cap_max_marks ?? ((c.cap1_max || 0) + (c.cap2_max || 0) + (c.cap3_max || 0))}
                        </td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cas1_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cas2_max || 0}</td>
                        <td className="px-2 py-3 font-mono text-center text-slate-700">{c.cas3_max || 0}</td>
                        <td className="px-2.5 py-3 font-mono text-center font-bold text-amber-900 bg-amber-50/60 border-r border-amber-100">
                          {c.cas_max_marks ?? ((c.cas1_max || 0) + (c.cas2_max || 0) + (c.cas3_max || 0))}
                        </td>
                        <td className="px-2 py-3 font-mono text-center font-semibold text-blue-700">{c.est_max_marks || 0}</td>
                        <td className="px-2 py-3 font-mono text-center font-semibold text-emerald-700">{c.esp_max_marks || 0}</td>
                        <td className="px-2 py-3 font-mono text-center font-semibold text-amber-700">{c.ess_max_marks || 0}</td>
                        <td className="px-2 py-3 font-mono text-center font-bold text-slate-900 border-l border-slate-100 bg-slate-50">{c.total_marks}</td>
                      </>
                    )}
                    <td className="px-2 py-3 text-center border-l border-slate-100 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {onNavigateToFaculty && (
                          <button
                            onClick={() => onNavigateToFaculty(c.paper_code)}
                            title="View Faculty & Exam Duty Allocation"
                            className="p-1 text-slate-400 hover:text-violet-700 hover:bg-violet-50 rounded transition-colors"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onNavigateToMarks && (
                          <button
                            onClick={() => onNavigateToMarks(c.paper_code)}
                            title="Open Marks Entry for this course"
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onNavigateToTimetable && (
                          <button
                            onClick={() => onNavigateToTimetable(c.paper_code)}
                            title="View Exam Timetable"
                            className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onNavigateToReports && (
                          <button
                            onClick={() => onNavigateToReports(c.paper_code)}
                            title="View Subject Risk & Performance Analytics"
                            className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedCourses.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? (viewMode === 'excel_grid' ? 35 : 16) : (viewMode === 'excel_grid' ? 34 : 15)} className="px-4 py-12 text-center">
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
        onClose={() => { setIsPreviewOpen(false); setPreviewResult(null); }}
        onConfirm={handleConfirmImport}
        courses={previewCourses}
        existingCourses={courses}
        errors={previewErrors}
        validation={previewResult}
        onDownloadReport={handleDownloadReport}
        isSaving={isUploading}
        registeredPrograms={registeredPrograms}
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
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Academic Period & Term</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {inspectedCourse.academic_period || '—'} {inspectedCourse.term ? `· ${inspectedCourse.term}` : ''}
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Program Code & Type</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {inspectedCourse.program_code || '—'} · {inspectedCourse.subject_type || 'General'}
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Regulation & Students</div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate" title={inspectedCourse.regulation_group || ''}>
                    {inspectedCourse.regulation_group || 'Standard'} · {inspectedCourse.student_count ?? '—'} Students
                  </div>
                </div>
              </div>

              {/* Assessment Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-[320px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2">Assessment Head</th>
                      <th className="px-3 py-2 text-center">CA1</th>
                      <th className="px-3 py-2 text-center">CA2</th>
                      <th className="px-3 py-2 text-center">CA3</th>
                      <th className="px-3 py-2 text-center bg-slate-200/50 font-bold text-slate-800">CA Total (Max)</th>
                      <th className="px-3 py-2 text-center">ESE Max (EST/ESP/ESS)</th>
                      <th className="px-3 py-2 text-center">ESE Min (40%/45%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Theory (CAT & EST)</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cat3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-blue-900 bg-blue-50/50">{inspectedCourse.cat_max_marks ?? ((inspectedCourse.cat1_max || 0) + (inspectedCourse.cat2_max || 0) + (inspectedCourse.cat3_max || 0))}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{inspectedCourse.est_max_marks || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-rose-600 font-bold">{inspectedCourse.est_min_marks || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Practical (CAP & ESP)</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cap3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-emerald-900 bg-emerald-50/50">{inspectedCourse.cap_max_marks ?? ((inspectedCourse.cap1_max || 0) + (inspectedCourse.cap2_max || 0) + (inspectedCourse.cap3_max || 0))}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-indigo-700">{inspectedCourse.esp_max_marks || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono text-rose-600 font-bold">{inspectedCourse.esp_min_marks || '—'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-slate-900">Skills (CAS & ESS)</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas1_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas2_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono">{inspectedCourse.cas3_max || '—'}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-amber-900 bg-amber-50/50">{inspectedCourse.cas_max_marks ?? ((inspectedCourse.cas1_max || 0) + (inspectedCourse.cas2_max || 0) + (inspectedCourse.cas3_max || 0))}</td>
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
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {onNavigateToFaculty && (
                  <button
                    onClick={() => {
                      const code = inspectedCourse.paper_code;
                      setInspectedCourse(null);
                      onNavigateToFaculty(code);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    Faculty Allocation
                  </button>
                )}
                {onNavigateToMarks && (
                  <button
                    onClick={() => {
                      const code = inspectedCourse.paper_code;
                      setInspectedCourse(null);
                      onNavigateToMarks(code);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Student Marks
                  </button>
                )}
                {onNavigateToTimetable && (
                  <button
                    onClick={() => {
                      const code = inspectedCourse.paper_code;
                      setInspectedCourse(null);
                      onNavigateToTimetable(code);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Exam Timetable
                  </button>
                )}
                {onNavigateToReports && (
                  <button
                    onClick={() => {
                      const code = inspectedCourse.paper_code;
                      setInspectedCourse(null);
                      onNavigateToReports(code);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Analytics
                  </button>
                )}
              </div>
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
