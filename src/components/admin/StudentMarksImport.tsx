import { RegistrationReview } from './RegistrationReview';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { StudentMark, ExaminationData, RegistrationResult, FacultyCourseAllocation } from '../../types';
import { downloadStudentMarksTemplate } from '../../services/excelParser';
import { EditStudentMarkModal } from './EditStudentMarkModal';
import { ImportPreviewDashboard } from '../common/ImportPreviewDashboard';
import {
  runValidationPipeline,
  readSheetRows,
  buildStudentMarksConfig,
  type ValidationResult,
  type ValidatedRow,
  type MasterRecord,
} from '../../utils/validation';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  Search,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit3,
  GraduationCap,
  BookOpen,
  FileText,
  BarChart3,
  CalendarDays,
} from 'lucide-react';

interface StudentMarksImportProps {
  initialPaperCode?: string;
  initialFacultyCode?: string;
  initialProgram?: string;
  onNavigateToFaculty?: (paperCode?: string) => void;
  onNavigateToCourseMaster?: (paperCode?: string) => void;
  onNavigateToTRSheet?: (program?: string, sem?: string) => void;
  onNavigateToReports?: (program?: string, paperCode?: string) => void;
}

export const StudentMarksImport: React.FC<StudentMarksImportProps> = ({
  initialPaperCode,
  initialFacultyCode,
  initialProgram,
  onNavigateToFaculty,
  onNavigateToCourseMaster,
  onNavigateToTRSheet,
  onNavigateToReports,
}) => {
  const { isSuperAdmin, currentUser } = useAuth();
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [marksPageInfo, setMarksPageInfo] = useState<{total:number;page:number;pageSize:number}|null>(null);
  const [facultyAllocations, setFacultyAllocations] = useState<FacultyCourseAllocation[]>([]);
  const [facultyFilter, setFacultyFilter] = useState(initialFacultyCode || 'ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Client-side filters applied to the server-fetched page
  const [searchQuery, setSearchQuery] = useState('');
  const [assessmentFilter, setAssessmentFilter] = useState('ALL');
  const [paperFilter, setPaperFilter] = useState(initialPaperCode || 'ALL');
  const [programFilter, setProgramFilter] = useState(initialProgram || 'ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [examYearFilter, setExamYearFilter] = useState('ALL');

  useEffect(() => {
    if (initialPaperCode) setPaperFilter(initialPaperCode);
    if (initialFacultyCode) setFacultyFilter(initialFacultyCode);
    if (initialProgram) setProgramFilter(initialProgram);
  }, [initialPaperCode, initialFacultyCode, initialProgram]);
  const [reviewMode, setReviewMode] = useState<'matrix'|'records'>('records');
  const [loadError, setLoadError] = useState<string|null>(null);
  const [page, setPage] = useState(0);
  const [examData, setExamData] = useState<ExaminationData | null>(null);
  const [editingMark, setEditingMark] = useState<StudentMark | null>(null);

  // Bulk Selection
  const [selectedMarks, setSelectedMarks] = useState<Set<string>>(new Set());

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Centralized validation preview state
  const [previewResult, setPreviewResult] = useState<ValidationResult<StudentMark> | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchMarks = async (page?: number, size?: number) => {
    const pageNum = page ?? currentPage;
    const sizeNum = size ?? pageSize;
    const [response, examination, allocs] = await Promise.all([
      db.getStudentMarks({ page: pageNum, pageSize: sizeNum }),
      db.getExaminationData().catch(() => null),
      db.getFacultyAllocations().catch(() => []),
    ]);
    setMarks(response.data);
    setMarksPageInfo({ total: response.total, page: response.page, pageSize: response.pageSize });
    setCurrentPage(response.page);
    setPage(0);
    if (examination) setExamData(examination);
    if (allocs) setFacultyAllocations(allocs);
  };

  useEffect(() => {
    fetchMarks(1).catch(()=>setLoadError('Unable to load marks. Refresh this screen to retry.'));
  }, []);

  useEffect(() => {
    if (initialPaperCode) {
      setPaperFilter(initialPaperCode);
    }
  }, [initialPaperCode]);

  // Quick lookup for student registration status
  const regMap = useMemo(() => {
    const map = new Map<string, RegistrationResult>();
    if (examData?.registrations) {
      for (const r of examData.registrations) {
        const k = `${r.prn}|${r.cm_course_name}|${r.semester}|${r.paper_code}|${r.academic_year}|${r.exam_year}`;
        map.set(k, r);
      }
    }
    return map;
  }, [examData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadSuccess(null);
    setUploadErrors([]);
    setIsUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const rawRows = readSheetRows(buffer, 'Student_Marks');
      if (!rawRows.length) {
        setUploadErrors(['The uploaded sheet contains no data rows.']);
        return;
      }

      // Fetch master data for cross-validation (never auto-created by import).
      const [programs, courseMaster] = await Promise.all([
        db.getPrograms().catch(() => []),
        db.getCourseMaster().catch(() => []),
      ]);

      const programmeMap = new Map<string, MasterRecord>();
      for (const p of programs) programmeMap.set(p.program_name, { id: p.id, code: p.program_code, name: p.program_name });
      for (const c of courseMaster) if (!programmeMap.has(c.cm_course_name)) programmeMap.set(c.cm_course_name, { id: c.cm_course_name, code: c.cm_course_name, name: c.cm_course_name });
      const programmes: MasterRecord[] = Array.from(programmeMap.values());
      const subjects: MasterRecord[] = courseMaster.map(c => ({
        id: c.id, code: c.paper_code, name: c.sm_subject_name,
        extra: { cm_course_name: c.cm_course_name, semester: String(c.semester) },
      }));
      const students: MasterRecord[] = (examData?.registrations || []).map(r => ({
        id: r.prn, code: r.prn, name: r.student_name,
      }));

      const config = buildStudentMarksConfig({ programmes, subjects, students });
      const result = runValidationPipeline<StudentMark>(rawRows, { fileName: file.name, config });

      setPreviewResult(result);
      setIsPreviewOpen(true);
    } catch (err) {
      setUploadErrors([err instanceof Error ? err.message : 'Failed to read the Excel file.']);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async (rows: ValidatedRow<StudentMark>[]) => {
    if (!rows.length) return;
    setIsUploading(true);
    const payload = rows.map(r => r.data).filter(Boolean) as StudentMark[];
    const upsertResult = await db.upsertStudentMarks(payload, currentUser.id);
    setIsUploading(false);
    setIsPreviewOpen(false);
    setPreviewResult(null);
    if (upsertResult.error) {
      setUploadErrors([`Import failed: ${upsertResult.error}`]);
    } else {
      setUploadSuccess(`Successfully processed ${upsertResult.total} student mark record(s).`);
      fetchMarks(1);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student mark record?')) {
      await db.deleteStudentMark(id);
      fetchMarks(currentPage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMarks.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedMarks.size} records?`)) {
      setIsUploading(true);
      const ids = Array.from(selectedMarks);
      await db.deleteStudentMarks(ids);
      setSelectedMarks(new Set());
      await fetchMarks();
      setIsUploading(false);
      setUploadSuccess(`Successfully deleted ${ids.length} mark record(s).`);
    }
  };

  const handleExport = () => {
    if (filteredMarks.length === 0) {
      alert("No records to export");
      return;
    }
    const exportData = filteredMarks.map(m => ({
      'PRN': m.prn,
      'Name of the Student': m.student_name,
      'CM_Course_Name': m.cm_course_name,
      'Semester': m.semester,
      'PaperCode': m.paper_code,
      'SM_Subject_Name': m.sm_subject_name,
      'Academic_Year': m.academic_year,
      'Exam Year': m.exam_year,
      'Assessment_Type': m.assessment_type,
      'Theory': m.theory,
      'Practical': m.practical,
      'Skills': m.skills,
      'Total': [m.theory, m.practical, m.skills].reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks');
    XLSX.writeFile(wb, 'Student_Marks_Export.xlsx');
  };

  // Derived filter options
  const uniqueAssessments = Array.from(new Set(marks.map(m => m.assessment_type))).sort();
  const uniquePapers = Array.from(new Set(marks.map(m => m.paper_code))).sort();
  const uniquePrograms = Array.from(new Set(marks.map(m => m.cm_course_name))).sort();
  const uniqueSemesters = Array.from(new Set(marks.map(m => m.semester))).sort((a, b) => {
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
  const uniqueExamYears = Array.from(new Set(marks.map(m => m.exam_year).filter(Boolean))).sort();

  // Faculty mapping against Paper Codes
  const facultyByPaper = useMemo(() => {
    const map = new Map<string, FacultyCourseAllocation>();
    for (const fa of facultyAllocations) {
      if (fa.subject_code && !map.has(fa.subject_code)) {
        map.set(fa.subject_code, fa);
      }
    }
    return map;
  }, [facultyAllocations]);

  const uniqueInstructors = useMemo(() => {
    const map = new Map<string, string>();
    for (const fa of facultyAllocations) {
      if (fa.staff_code && fa.staff_name) {
        map.set(fa.staff_code, `${fa.staff_name} (${fa.staff_code})`);
      }
    }
    return Array.from(map.entries()).map(([code, label]) => ({ code, label }));
  }, [facultyAllocations]);

  const filteredMarks = marks.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      m.prn.toLowerCase().includes(q) ||
      m.student_name.toLowerCase().includes(q) ||
      m.sm_subject_name.toLowerCase().includes(q);

    const matchesAssessment = assessmentFilter === 'ALL' || m.assessment_type === assessmentFilter;
    const matchesPaper = paperFilter === 'ALL' || m.paper_code === paperFilter;
    const matchesProgram = programFilter === 'ALL' || m.cm_course_name === programFilter;
    const matchesSemester = semesterFilter === 'ALL' || m.semester === semesterFilter;
    const matchesExamYear = examYearFilter === 'ALL' || m.exam_year === examYearFilter;
    const assignedFac = facultyByPaper.get(m.paper_code);
    const matchesFaculty = facultyFilter === 'ALL' || assignedFac?.staff_code === facultyFilter;

    return matchesSearch && matchesAssessment && matchesPaper && matchesProgram && matchesSemester && matchesExamYear && matchesFaculty;
  });

  // Reset page when filter criteria change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, assessmentFilter, paperFilter, programFilter, semesterFilter, examYearFilter, facultyFilter, pageSize]);

  const totalServerPages = marksPageInfo ? Math.max(1, Math.ceil(marksPageInfo.total / marksPageInfo.pageSize)) : 1;
  const paginatedMarks = filteredMarks;

  return (
    <div className="space-y-6">
      {loadError&&<p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-800">{loadError}<button className="ui-button ml-3" onClick={()=>{setLoadError('');void fetchMarks().catch(()=>setLoadError('Unable to load marks. Please retry.'));}}>Retry</button></p>}
      <div className="flex gap-2" aria-label="Marks presentation"><button className="ui-button" aria-pressed={reviewMode==='matrix'} onClick={()=>setReviewMode('matrix')}>Component review</button><button className="ui-button" aria-pressed={reviewMode==='records'} onClick={()=>setReviewMode('records')}>Import & edit records</button></div>
      {reviewMode==='matrix'?<><div><h1 className="text-2xl font-bold">Student marks review</h1><p className="mt-2 text-sm text-slate-500">One row per student and subject, with all twelve assessment components.</p></div>{examData?<RegistrationReview data={examData} mode="marks"/>:<p role="status">Loading component review…</p>}</>:<>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Student Marks Import
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload subject-wise and component-wise marks (CA1, CA2, CA3, ESE). Existing records update automatically.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedMarks.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-200 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedMarks.size})
              </button>
            )}
            <button
              onClick={() => {
                if (onNavigateToFaculty) {
                  onNavigateToFaculty(paperFilter !== 'ALL' ? paperFilter : undefined);
                } else {
                  window.history.pushState({}, '', '/faculty-allocation');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors shadow-xs border border-violet-200"
            >
              <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
              Faculty Allocation
            </button>
            {onNavigateToTRSheet && (
              <button
                onClick={() => onNavigateToTRSheet(programFilter !== 'ALL' ? programFilter : undefined, semesterFilter !== 'ALL' ? semesterFilter : undefined)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors shadow-xs border border-indigo-200"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                TR Sheet
              </button>
            )}
            {onNavigateToReports && (
              <button
                onClick={() => onNavigateToReports(programFilter !== 'ALL' ? programFilter : undefined, paperFilter !== 'ALL' ? paperFilter : undefined)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-100 transition-colors shadow-xs border border-purple-200"
              >
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                Performance
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors shadow-xs border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={downloadStudentMarksTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors shadow-xs border border-slate-300"
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
              {isUploading ? 'Uploading...' : 'Import Marks'}
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Upload Issues Found
            </div>
            <button
              onClick={() => {
                const element = document.createElement("a");
                const file = new Blob([uploadErrors.join('\n')], {type: 'text/plain'});
                element.href = URL.createObjectURL(file);
                element.download = "upload_errors.txt";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
              }}
              className="flex items-center gap-1.5 px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Errors
            </button>
          </div>
          <ul className="list-disc pl-5 text-rose-700 space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-3 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PRN, Student Name, or Subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-40"
          >
            <option value="ALL">All Programs</option>
            {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
          >
            <option value="ALL">All Semesters</option>
            {uniqueSemesters.map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
          </select>
          <select
            value={examYearFilter}
            onChange={(e) => setExamYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-36"
          >
            <option value="ALL">All Exam Years</option>
            {uniqueExamYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
          >
            <option value="ALL">All Types</option>
            {uniqueAssessments.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={paperFilter}
            onChange={(e) => setPaperFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
          >
            <option value="ALL">All Papers</option>
            {uniquePapers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44"
          >
            <option value="ALL">All Teaching Faculty</option>
            {uniqueInstructors.map(f => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
          </select>

          {(programFilter !== 'ALL' || semesterFilter !== 'ALL' || examYearFilter !== 'ALL' || assessmentFilter !== 'ALL' || paperFilter !== 'ALL' || facultyFilter !== 'ALL' || searchQuery !== '') && (
            <button
              onClick={() => {
                setProgramFilter('ALL');
                setSemesterFilter('ALL');
                setExamYearFilter('ALL');
                setAssessmentFilter('ALL');
                setPaperFilter('ALL');
                setFacultyFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-auto flex items-center gap-1.5"
            >
              Reset Filters
            </button>
          )}
        </div>

        {paperFilter !== 'ALL' && facultyByPaper.has(paperFilter) && (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-2.5 text-xs text-violet-900">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-violet-700 shrink-0" />
              <span className="font-medium">
                <strong>Assigned Course Faculty:</strong> {facultyByPaper.get(paperFilter)?.staff_name} ({facultyByPaper.get(paperFilter)?.staff_code})
                {facultyByPaper.get(paperFilter)?.additional_staff ? ` · Co-Teaching: ${facultyByPaper.get(paperFilter)?.additional_staff}` : ''}
                {' · Section ' + facultyByPaper.get(paperFilter)?.section}
                {' · ' + (facultyByPaper.get(paperFilter)?.department || facultyByPaper.get(paperFilter)?.program_name)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {facultyByPaper.get(paperFilter)?.exam_role && (
                <span className="inline-flex items-center gap-1 font-semibold text-violet-800 bg-violet-100/90 px-2.5 py-0.5 rounded-lg border border-violet-300/60 whitespace-nowrap">
                  {facultyByPaper.get(paperFilter)?.exam_role}
                </span>
              )}
              {facultyByPaper.get(paperFilter)?.exam_center && (
                <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                  📍 {facultyByPaper.get(paperFilter)?.exam_center}
                </span>
              )}
              {onNavigateToFaculty && (
                <button
                  onClick={() => onNavigateToFaculty(paperFilter)}
                  className="rounded-lg bg-white border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  View Duties
                </button>
              )}
              {onNavigateToCourseMaster && (
                <button
                  onClick={() => onNavigateToCourseMaster(paperFilter)}
                  className="rounded-lg bg-white border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  Scheme
                </button>
              )}
              {onNavigateToReports && (
                <button
                  onClick={() => onNavigateToReports(undefined, paperFilter)}
                  className="rounded-lg bg-white border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  Analytics
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs relative">
            <thead className="sticky top-0 z-10 shadow-sm ring-1 ring-slate-200">
              <tr className="bg-slate-100">
                {isSuperAdmin && (
                  <th className="text-center px-4 py-3 w-10 bg-slate-100">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={filteredMarks.length > 0 && selectedMarks.size === filteredMarks.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMarks(new Set(filteredMarks.map(m => m.id)));
                        } else {
                          setSelectedMarks(new Set());
                        }
                      }}
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-bold text-slate-700 w-32 bg-slate-100">PRN / Name</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700 min-w-[200px] bg-slate-100">Program & Subject</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 bg-slate-100">Type</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200 bg-slate-100">Theory</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 bg-slate-100">Pract</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 bg-slate-100">Skills</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 bg-slate-200">Total</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200 bg-slate-100">Status</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200 bg-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMarks.map((m) => {
                const total = [m.theory, m.practical, m.skills].reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
                const regKey = `${m.prn}|${m.cm_course_name}|${m.semester}|${m.paper_code}|${m.academic_year}|${m.exam_year}`;
                const reg = regMap.get(regKey);
                const isCA = m.assessment_type.startsWith('CA');
                const displayStatus = isCA ? (reg?.internalStatus || 'PENDING') : (reg?.status || 'PENDING');

                const getStatusColor = (st: string) => {
                  switch (st) {
                    case 'PASS':
                    case 'TG':
                      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    case 'FAIL':
                    case 'TNG':
                      return 'bg-rose-50 text-rose-700 border-rose-200';
                    case 'ABSENT':
                      return 'bg-slate-100 text-slate-700 border-slate-300';
                    case 'WITHHELD':
                      return 'bg-purple-50 text-purple-700 border-purple-200';
                    default:
                      return 'bg-amber-50 text-amber-700 border-amber-200';
                  }
                };

                return (
                  <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors group">
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedMarks.has(m.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedMarks);
                            if (e.target.checked) newSet.add(m.id);
                            else newSet.delete(m.id);
                            setSelectedMarks(newSet);
                          }}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-bold text-indigo-700 font-mono">{m.prn}</div>
                      <div className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate max-w-[120px]">{m.student_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600">
                          {m.paper_code}
                        </span>
                        {m.sm_subject_name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[250px]" title={m.cm_course_name}>
                        {m.cm_course_name} (Sem {m.semester}) · {m.exam_year}
                      </div>
                      {facultyByPaper.has(m.paper_code) && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-violet-700">
                          <GraduationCap className="w-3 h-3 text-violet-600 shrink-0" />
                          <span className="font-medium truncate max-w-[220px]" title={facultyByPaper.get(m.paper_code)?.staff_name}>
                            {facultyByPaper.get(m.paper_code)?.staff_name} ({facultyByPaper.get(m.paper_code)?.staff_code})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        m.assessment_type === 'ESE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {m.assessment_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono border-l border-slate-100">
                      {m.theory ?? 'Pending'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {m.practical ?? 'Pending'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {m.skills ?? 'Pending'}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800 bg-slate-50">
                      {total}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-100">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(displayStatus)}`}
                        title={reg ? `Internal: ${reg.internalStatus} (${reg.internalTotal}/${reg.internalMaximum}, req ${reg.internalRequired}) · Result: ${reg.status} · Grade: ${reg.grade}${reg.reasons.length ? ' · ' + reg.reasons.join(', ') : ''}` : 'Status pending evaluation'}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-100">
                      {isSuperAdmin ? (
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingMark(m)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit marks individually"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMarks.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 10 : 9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No marks records found.</p>
                      {isSuperAdmin && <p className="text-[10px] mt-1">Upload an Excel file to get started. Duplicate uploads will automatically update existing records.</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredMarks.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, marksPageInfo?.total || filteredMarks.length)}</span> of{' '}
                <span className="font-semibold text-slate-900">{marksPageInfo?.total || filteredMarks.length}</span>{' '}
                records
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                    fetchMarks(1, newSize);
                  }}
                  className="px-2 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>
                Page <span className="font-semibold text-slate-900">{currentPage}</span> of{' '}
                <span className="font-semibold text-slate-900">{totalServerPages}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const prev = Math.max(1, currentPage - 1);
                    setCurrentPage(prev);
                    fetchMarks(prev);
                  }}
                  disabled={currentPage <= 1}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const next = Math.min(totalServerPages, currentPage + 1);
                    setCurrentPage(next);
                    fetchMarks(next);
                  }}
                  disabled={currentPage >= totalServerPages}
                  className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Centralized Validation Preview Dashboard */}
      {previewResult && (
        <ImportPreviewDashboard
          isOpen={isPreviewOpen}
          onClose={() => { setIsPreviewOpen(false); setPreviewResult(null); }}
          onConfirm={handleConfirmImport}
          result={previewResult}
          isSaving={isUploading}
          columns={[
            { key: 'prn', label: 'PRN' },
            { key: 'student_name', label: 'Student' },
            { key: 'cm_course_name', label: 'Programme', width: '180px' },
            { key: 'semester', label: 'Sem' },
            { key: 'paper_code', label: 'Paper' },
            { key: 'assessment_type', label: 'Type' },
            { key: 'theory', label: 'Theory' },
            { key: 'practical', label: 'Practical' },
            { key: 'skills', label: 'Skills' },
          ]}
        />
      )}

      {/* Edit Student Mark Modal */}
      {editingMark && (
        <EditStudentMarkModal
          mark={editingMark}
          allStudentMarks={marks}
          examData={examData}
          onClose={() => setEditingMark(null)}
          onSaved={(updatedMark, newStatus) => {
            setEditingMark(null);
            setUploadSuccess(`Marks for ${updatedMark.student_name} (${updatedMark.prn}) updated successfully. Evaluated status: ${newStatus}.`);
            fetchMarks();
          }}
        />
      )}
      </>}
    </div>
  );
};
