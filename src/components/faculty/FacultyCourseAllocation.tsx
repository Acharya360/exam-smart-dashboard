import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { FacultyCourseAllocation as FacultyAllocType, CourseMaster, Program } from '../../types';
import * as XLSX from 'xlsx';
import { downloadFacultyAllocationTemplate } from '../../services/excelParser';
import {
  GraduationCap,
  Users,
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  UserCheck,
  X,
  Clock,
  Shield,
  FileText,
  Award,
  CalendarDays,
  BarChart3,
  MapPin,
  LayoutGrid,
  List,
} from 'lucide-react';

interface FacultyCourseAllocationProps {
  initialSubjectCode?: string;
  initialStaffCode?: string;
  initialProgram?: string;
  onNavigateToMarks?: (paperCode: string, staffCode?: string) => void;
  onNavigateToCourseMaster?: (subjectCode: string) => void;
  onNavigateToTimetable?: (subjectCode: string) => void;
  onNavigateToReports?: (staffCode?: string, subjectCode?: string) => void;
}

type ViewMode = 'table' | 'cards' | 'roster';
type ExamRoleCategory = 'ALL' | 'SETTER' | 'INVIGILATOR' | 'EVALUATOR' | 'PRACTICAL' | 'JURY';

export const FacultyCourseAllocation: React.FC<FacultyCourseAllocationProps> = ({
  initialSubjectCode,
  initialStaffCode,
  initialProgram,
  onNavigateToMarks,
  onNavigateToCourseMaster,
  onNavigateToTimetable,
  onNavigateToReports,
}) => {
  const { isSuperAdmin } = useAuth();
  const [allocations, setAllocations] = useState<FacultyAllocType[]>([]);
  const [courseMasterList, setCourseMasterList] = useState<CourseMaster[]>([]);
  const [programsList, setProgramsList] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<ExamRoleCategory>('ALL');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(initialSubjectCode || initialStaffCode || '');
  const [programFilter, setProgramFilter] = useState(initialProgram || 'ALL');
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');

  useEffect(() => {
    if (initialSubjectCode) setSearchQuery(initialSubjectCode);
    else if (initialStaffCode) setSearchQuery(initialStaffCode);
    if (initialProgram) setProgramFilter(initialProgram);
  }, [initialSubjectCode, initialStaffCode, initialProgram]);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<FacultyAllocType> | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<Partial<FacultyAllocType>[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allocs, courses, progs] = await Promise.all([
        db.getFacultyAllocations(),
        db.getCourseMaster(),
        db.getPrograms(),
      ]);
      setAllocations(allocs);
      setCourseMasterList(courses);
      setProgramsList(progs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load faculty allocations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Options
  const uniquePrograms = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.program_name) set.add(a.program_name);
    });
    return Array.from(set).sort();
  }, [allocations]);

  const uniqueSemesters = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.semester) set.add(a.semester);
    });
    return Array.from(set).sort();
  }, [allocations]);

  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.section) set.add(a.section);
    });
    return Array.from(set).sort();
  }, [allocations]);

  // Categorize Exam Roles
  const getExamCategory = (role?: string): ExamRoleCategory => {
    if (!role) return 'EVALUATOR';
    const r = role.toLowerCase();
    if (r.includes('setter')) return 'SETTER';
    if (r.includes('jury') || r.includes('drawing') || r.includes('thesis')) return 'JURY';
    if (r.includes('practical') || r.includes('lab') || r.includes('cad')) return 'PRACTICAL';
    if (r.includes('invigilator') || r.includes('supervisor')) return 'INVIGILATOR';
    if (r.includes('evaluator')) return 'EVALUATOR';
    return 'ALL';
  };

  // Filtered Allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      if (programFilter !== 'ALL' && item.program_name !== programFilter) return false;
      if (semesterFilter !== 'ALL' && item.semester !== semesterFilter) return false;
      if (sectionFilter !== 'ALL' && item.section !== sectionFilter) return false;

      // Role Category Filter
      if (roleCategoryFilter !== 'ALL') {
        const cat = getExamCategory(item.exam_role);
        if (cat !== roleCategoryFilter) {
          // If searching for invigilator, also match composite roles like "Invigilator & CAD Practical Examiner"
          const r = (item.exam_role || '').toLowerCase();
          if (roleCategoryFilter === 'INVIGILATOR' && !r.includes('invigilator') && !r.includes('supervisor')) {
            return false;
          }
          if (roleCategoryFilter === 'SETTER' && !r.includes('setter')) {
            return false;
          }
          if (roleCategoryFilter === 'PRACTICAL' && !r.includes('practical') && !r.includes('lab') && !r.includes('cad')) {
            return false;
          }
          if (roleCategoryFilter === 'JURY' && !r.includes('jury') && !r.includes('convener') && !r.includes('thesis')) {
            return false;
          }
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStaff = item.staff_name.toLowerCase().includes(q) || item.staff_code.toLowerCase().includes(q);
        const matchesSubject = item.subject_code.toLowerCase().includes(q) || item.subject_name.toLowerCase().includes(q);
        const matchesDept = (item.department || '').toLowerCase().includes(q);
        const matchesAdd = (item.additional_staff || '').toLowerCase().includes(q);
        const matchesRole = (item.exam_role || '').toLowerCase().includes(q);
        const matchesCenter = (item.exam_center || '').toLowerCase().includes(q);
        if (!matchesStaff && !matchesSubject && !matchesDept && !matchesAdd && !matchesRole && !matchesCenter) {
          return false;
        }
      }
      return true;
    });
  }, [allocations, programFilter, semesterFilter, sectionFilter, roleCategoryFilter, searchQuery]);

  // Pagination Slice
  const totalPages = Math.ceil(filteredAllocations.length / pageSize) || 1;
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAllocations.slice(start, start + pageSize);
  }, [filteredAllocations, currentPage, pageSize]);

  // Statistics
  const stats = useMemo(() => {
    const uniqueFaculty = new Set<string>();
    const uniqueCourses = new Set<string>();
    let totalSessions = 0;
    let paperSetters = 0;
    let invigilators = 0;
    let practicalExams = 0;
    let juryLeads = 0;

    allocations.forEach((a) => {
      if (a.staff_code) uniqueFaculty.add(a.staff_code);
      if (a.subject_code) uniqueCourses.add(a.subject_code);
      totalSessions += Number(a.invigilation_sessions || 0);

      const r = (a.exam_role || '').toLowerCase();
      if (r.includes('setter')) paperSetters++;
      if (r.includes('invigilator') || r.includes('supervisor')) invigilators++;
      if (r.includes('practical') || r.includes('lab') || r.includes('cad')) practicalExams++;
      if (r.includes('jury') || r.includes('convener') || r.includes('thesis')) juryLeads++;
    });

    return {
      total: allocations.length,
      uniqueFaculty: uniqueFaculty.size,
      uniqueCourses: uniqueCourses.size,
      uniquePrograms: uniquePrograms.length,
      totalSessions,
      paperSetters,
      invigilators,
      practicalExams,
      juryLeads,
    };
  }, [allocations, uniquePrograms]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingItem({
      subject_code: courseMasterList[0]?.paper_code || '',
      subject_name: courseMasterList[0]?.sm_subject_name || '',
      staff_code: '',
      staff_name: '',
      additional_staff: '',
      section: 'A',
      semester: courseMasterList[0]?.semester || '1',
      program_name: courseMasterList[0]?.cm_course_name || 'B.Tech. Construction Engineering & Management',
      workload_hours: 4,
      academic_year: '2025-2026',
      exam_role: 'Paper Setter & Chief Evaluator',
      invigilation_sessions: 2,
      exam_center: 'Main Campus Examination Block',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (item: FacultyAllocType) => {
    setEditingItem({
      ...item,
      exam_role: item.exam_role || 'Course Instructor & Evaluator',
      invigilation_sessions: item.invigilation_sessions ?? 2,
      exam_center: item.exam_center || 'Main Campus Examination Block',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.subject_code || !editingItem?.staff_code || !editingItem?.staff_name) {
      alert('Please fill out Subject Code, Staff Code, and Staff Name.');
      return;
    }

    try {
      if (editingItem.id) {
        await db.updateFacultyAllocation(editingItem.id, editingItem);
        setSuccessMessage('Faculty allocation & exam duties updated successfully.');
      } else {
        await db.createFacultyAllocation(editingItem);
        setSuccessMessage('Faculty allocation & exam duties assigned successfully.');
      }
      setIsEditModalOpen(false);
      setEditingItem(null);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save allocation.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this faculty course allocation?')) return;
    try {
      await db.deleteFacultyAllocation(id);
      setSuccessMessage('Allocation removed successfully.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete allocation.');
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    const exportData = filteredAllocations.map((a, idx) => ({
      'Sr. No': idx + 1,
      'Subject Code': a.subject_code,
      'Subject Name': a.subject_name,
      'Staff Code': a.staff_code,
      'Faculty / Staff Name': a.staff_name,
      'Exam Duty & Role': a.exam_role || 'Course Instructor & Evaluator',
      'Invigilation Sessions': a.invigilation_sessions || 2,
      'Assigned Exam Center / Hall': a.exam_center || 'Main Campus Examination Block',
      'Additional Staff / Co-Instructors': a.additional_staff || '',
      'Section': a.section,
      'Semester': a.semester,
      'Program': a.program_name,
      'Department': a.department || '',
      'Workload (Hrs/Wk)': a.workload_hours || 4,
      'Total Credits': a.total_credits ?? '',
      'Total Marks Max': a.total_marks ?? '',
      'Grading Category': a.grading_category || 'Non-Architecture',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Faculty_Exam_Allocations');
    XLSX.writeFile(wb, `Faculty_Exam_Allocations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Excel Import Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const mapped: Partial<FacultyAllocType>[] = data
          .map((row) => ({
            subject_code: String(row['Subject_Code'] || row['Subject Code'] || row['paper_code'] || '').trim(),
            subject_name: String(row['Subject_Name'] || row['Subject Name'] || row['sm_subject_name'] || '').trim(),
            staff_code: String(row['Staff_Code'] || row['Staff Code'] || row['Faculty ID'] || '').trim(),
            staff_name: String(row['Staff_name'] || row['Staff Name'] || row['Faculty Name'] || '').trim(),
            additional_staff: String(row['Additional_Staff'] || row['Additional Staff'] || '').trim() || null,
            section: String(row['Section'] || 'A').trim(),
            semester: String(row['Sem'] || row['Semester'] || '1').trim(),
            program_name: String(row['ACADEMIC_COURSE_ID'] || row['Program'] || row['cm_course_name'] || 'General').trim(),
            department: String(row['Department'] || '').trim() || null,
            workload_hours: Number(row['Workload'] || row['Workload (Hrs/Wk)'] || 4),
            exam_role: String(row['Exam_Role'] || row['Exam Role'] || row['exam_role'] || 'Course Instructor & Evaluator').trim(),
            invigilation_sessions: Number(row['Invigilation_Sessions'] || row['Invigilation Sessions'] || 2),
            exam_center: String(row['Exam_Center'] || row['Exam Center'] || row['exam_center'] || 'Main Campus Examination Block').trim(),
          }))
          .filter((r) => r.subject_code && r.staff_code && r.staff_name);

        setImportRows(mapped);
      } catch (err) {
        alert('Failed to parse file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitImport = async () => {
    if (!importRows.length) return;
    setIsImporting(true);
    try {
      await db.bulkUploadFacultyAllocations(importRows);
      setSuccessMessage(`Successfully imported ${importRows.length} faculty course allocations.`);
      setIsImportModalOpen(false);
      setImportRows([]);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  // Helper for Role Badge Colors
  const renderRoleBadge = (role?: string) => {
    const r = (role || 'Course Instructor & Evaluator').toLowerCase();
    if (r.includes('setter')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
          <FileText className="h-3 w-3 text-amber-600" />
          {role}
        </span>
      );
    }
    if (r.includes('jury') || r.includes('convener') || r.includes('thesis')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-pink-50 px-2 py-0.5 text-xs font-semibold text-pink-800 border border-pink-200">
          <Award className="h-3 w-3 text-pink-600" />
          {role}
        </span>
      );
    }
    if (r.includes('practical') || r.includes('cad') || r.includes('lab')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
          <Layers className="h-3 w-3 text-cyan-600" />
          {role}
        </span>
      );
    }
    if (r.includes('invigilator') || r.includes('supervisor')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <Shield className="h-3 w-3 text-emerald-600" />
          {role}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800 border border-violet-200">
        <GraduationCap className="h-3 w-3 text-violet-600" />
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-violet-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  Faculty Allocation & Exam Duties
                </h1>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                  Course Master & Exam Roster
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Map teaching staff, Paper Setters, Chief Evaluators, Invigilators, and Practical/Jury leads against university course subjects.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Faculty Cards
            </button>
            <button
              onClick={() => setViewMode('roster')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === 'roster' ? 'bg-white text-violet-700 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-violet-600" />
              Exam Roster
            </button>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 focus:outline-hidden"
          >
            <UploadCloud className="h-3.5 w-3.5 text-violet-600" />
            Import Excel
          </button>

          <button
            onClick={downloadFacultyAllocationTemplate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 focus:outline-hidden"
            title="Download pre-formatted Excel template for faculty allocation & exam duties"
          >
            <Download className="h-3.5 w-3.5 text-zinc-600" />
            Template
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 focus:outline-hidden"
          >
            <Download className="h-3.5 w-3.5 text-zinc-600" />
            Export
          </button>

          {isSuperAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-200 hover:bg-violet-700 focus:outline-hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign Faculty
            </button>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards: University Faculty & Examination Duties */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-linear-to-b from-white to-violet-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Allocations</span>
            <Users className="h-3.5 w-3.5 text-violet-600" />
          </div>
          <div className="text-xl font-bold text-zinc-900">{stats.total}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">Total Course Mappings</p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-linear-to-b from-white to-violet-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Active Faculty</span>
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-zinc-900">{stats.uniqueFaculty}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">Instructors & Leads</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-linear-to-b from-white to-amber-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Paper Setters</span>
            <FileText className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900">{stats.paperSetters}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">Chief Paper Setters</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-linear-to-b from-white to-emerald-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Invigilators</span>
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-900">{stats.invigilators}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">{stats.totalSessions} Sessions Total</p>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-linear-to-b from-white to-cyan-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Lab Examiners</span>
            <Layers className="h-3.5 w-3.5 text-cyan-600" />
          </div>
          <div className="text-xl font-bold text-cyan-900">{stats.practicalExams}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">CAD & Practical Leads</p>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-linear-to-b from-white to-pink-50/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Jury Leads</span>
            <Award className="h-3.5 w-3.5 text-pink-600" />
          </div>
          <div className="text-xl font-bold text-pink-900">{stats.juryLeads}</div>
          <p className="mt-0.5 text-[10px] text-zinc-400">Arch & Thesis Jurors</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search faculty name, staff code (e.g. T7386), subject (e.g. CS402), exam role, or examination hall..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-10 pr-4 py-2 text-sm text-zinc-800 placeholder-zinc-400 transition-colors focus:border-violet-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs text-zinc-600">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <span>Program:</span>
              <select
                value={programFilter}
                onChange={(e) => {
                  setProgramFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-medium text-zinc-800 focus:outline-hidden max-w-[140px] truncate"
              >
                <option value="ALL">All Programs</option>
                {uniquePrograms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs text-zinc-600">
              <span>Sem:</span>
              <select
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-medium text-zinc-800 focus:outline-hidden"
              >
                <option value="ALL">All Semesters</option>
                {uniqueSemesters.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-xs text-zinc-600">
              <span>Exam Role:</span>
              <select
                value={roleCategoryFilter}
                onChange={(e) => {
                  setRoleCategoryFilter(e.target.value as ExamRoleCategory);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-medium text-zinc-800 focus:outline-hidden"
              >
                <option value="ALL">All Exam Roles</option>
                <option value="SETTER">Paper Setters</option>
                <option value="INVIGILATOR">Room Invigilators</option>
                <option value="PRACTICAL">Practical & Lab Leads</option>
                <option value="JURY">Jury & Thesis Leads</option>
                <option value="EVALUATOR">Chief Evaluators</option>
              </select>
            </div>

            {(searchQuery || programFilter !== 'ALL' || semesterFilter !== 'ALL' || sectionFilter !== 'ALL' || roleCategoryFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setProgramFilter('ALL');
                  setSemesterFilter('ALL');
                  setSectionFilter('ALL');
                  setRoleCategoryFilter('ALL');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section Quick Pills & Duty Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 mr-1">Exam Role Quick Filter:</span>
            {[
              { id: 'ALL', label: 'All Allocations' },
              { id: 'SETTER', label: 'Paper Setters' },
              { id: 'INVIGILATOR', label: 'Invigilators' },
              { id: 'PRACTICAL', label: 'Practical & Lab' },
              { id: 'JURY', label: 'Jury & Drawing' },
            ].map((rf) => (
              <button
                key={rf.id}
                onClick={() => {
                  setRoleCategoryFilter(rf.id as ExamRoleCategory);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  roleCategoryFilter === rf.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>
              Showing <strong className="text-zinc-800">{filteredAllocations.length}</strong> of{' '}
              <strong className="text-zinc-800">{allocations.length}</strong> total allocations
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-3.5 pl-6 pr-3">Subject / Paper</th>
                  <th className="px-3 py-3.5">Academic Program</th>
                  <th className="px-3 py-3.5">Assigned Faculty</th>
                  <th className="px-3 py-3.5">Exam Duty & Center</th>
                  <th className="px-3 py-3.5 text-center">Invigilation</th>
                  <th className="px-3 py-3.5">Co-Instructors</th>
                  <th className="px-3 py-3.5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 text-zinc-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <div className="inline-flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                        Loading faculty course allocations…
                      </div>
                    </td>
                  </tr>
                ) : paginatedAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      No faculty course allocations match your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedAllocations.map((item) => (
                    <tr key={item.id} className="hover:bg-violet-50/30 transition-colors">
                      {/* Subject */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200/60">
                              {item.subject_code}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
                              Sem {item.semester} · Sec {item.section}
                            </span>
                          </div>
                          <span className="mt-1 font-semibold text-zinc-900">{item.subject_name}</span>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="px-3 py-4">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="font-medium text-zinc-800 text-xs">{item.program_name}</span>
                          {item.department && (
                            <span className="text-[11px] text-zinc-400 truncate">{item.department}</span>
                          )}
                        </div>
                      </td>

                      {/* Primary Faculty */}
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 ring-2 ring-white">
                            {item.staff_name
                              .split(' ')
                              .map((n) => n[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-zinc-900">{item.staff_name}</span>
                            <span className="font-mono text-[11px] text-zinc-500">{item.staff_code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Exam Duty & Center */}
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-1">
                          <div>{renderRoleBadge(item.exam_role)}</div>
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[190px]">{item.exam_center || 'Main Campus Examination Block'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Invigilation */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 px-2.5 py-0.5 text-xs font-bold border border-emerald-200">
                          <Shield className="h-3 w-3 text-emerald-600" />
                          {item.invigilation_sessions || 2} Sessions
                        </span>
                      </td>

                      {/* Co-Instructors */}
                      <td className="px-3 py-4 text-xs text-zinc-500 max-w-[180px]">
                        {item.additional_staff ? (
                          <span className="line-clamp-2" title={item.additional_staff}>
                            {item.additional_staff}
                          </span>
                        ) : (
                          <span className="text-zinc-300 italic">None assigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {onNavigateToMarks && (
                            <button
                              onClick={() => onNavigateToMarks(item.subject_code, item.staff_code)}
                              title="Open Student Marks for this course"
                              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 hover:text-violet-900 transition-colors"
                            >
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                              Marks
                            </button>
                          )}

                          {onNavigateToCourseMaster && (
                            <button
                              onClick={() => onNavigateToCourseMaster(item.subject_code)}
                              title="View Course Master Scheme & Credits"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                            >
                              <BookOpen className="h-4 w-4" />
                            </button>
                          )}

                          {onNavigateToTimetable && (
                            <button
                              onClick={() => onNavigateToTimetable(item.subject_code)}
                              title="View Exam Schedule & Session"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              <CalendarDays className="h-4 w-4" />
                            </button>
                          )}

                          {onNavigateToReports && (
                            <button
                              onClick={() => onNavigateToReports(item.staff_code, item.subject_code)}
                              title="View Performance Analytics for this faculty"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </button>
                          )}

                          {isSuperAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit Allocation & Duties"
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                title="Delete Allocation"
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-6 py-3 text-xs text-zinc-500">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FACULTY CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedAllocations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700 ring-2 ring-violet-200">
                      {item.staff_name
                        .split(' ')
                        .map((n) => n[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 text-sm">{item.staff_name}</h4>
                      <p className="font-mono text-xs text-zinc-500">{item.staff_code}</p>
                    </div>
                  </div>
                  <div>{renderRoleBadge(item.exam_role)}</div>
                </div>

                <div className="rounded-xl bg-zinc-50 p-3 space-y-1.5 border border-zinc-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-violet-700 bg-white px-2 py-0.5 rounded border border-violet-200">
                      {item.subject_code}
                    </span>
                    <span className="font-medium text-zinc-600">
                      Sem {item.semester} · Sec {item.section}
                    </span>
                  </div>
                  <p className="font-semibold text-xs text-zinc-800 line-clamp-1">{item.subject_name}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{item.program_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 pt-1">
                  <div className="flex items-center gap-1.5 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                    <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-zinc-400">Invigilation</div>
                      <div className="font-bold text-emerald-800">{item.invigilation_sessions || 2} Sessions</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-zinc-400">Workload</div>
                      <div className="font-bold text-zinc-800">{item.workload_hours || 4} hrs/wk</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="truncate">{item.exam_center || 'Main Campus Examination Block'}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-zinc-100 pt-3 mt-4 gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {onNavigateToMarks && (
                    <button
                      onClick={() => onNavigateToMarks(item.subject_code, item.staff_code)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg border border-violet-200 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Marks
                    </button>
                  )}
                  {onNavigateToCourseMaster && (
                    <button
                      onClick={() => onNavigateToCourseMaster(item.subject_code)}
                      title="Course Scheme"
                      className="p-1 text-zinc-500 hover:bg-zinc-100 rounded-lg text-xs"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onNavigateToTimetable && (
                    <button
                      onClick={() => onNavigateToTimetable(item.subject_code)}
                      title="Exam Timetable"
                      className="p-1 text-zinc-500 hover:bg-zinc-100 rounded-lg text-xs"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onNavigateToReports && (
                    <button
                      onClick={() => onNavigateToReports(item.staff_code, item.subject_code)}
                      title="Performance Analytics"
                      className="p-1 text-zinc-500 hover:bg-zinc-100 rounded-lg text-xs"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: DEDICATED EXAM DUTY ROSTER */}
      {viewMode === 'roster' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-violet-200 bg-linear-to-r from-violet-900 to-indigo-900 p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-violet-400/20 px-3 py-1 text-xs font-bold text-violet-200 border border-violet-400/30">
                    Official Examination Roaster 2025-2026
                  </span>
                  <span className="text-xs text-violet-300">Office of COE, SSPU</span>
                </div>
                <h2 className="mt-2 text-2xl font-black">Examination Duty & Invigilation Assignments</h2>
                <p className="mt-1 text-xs text-violet-200 max-w-2xl">
                  Official distribution of Paper Setting, Vault Packaging, Hall Invigilation, Practical/CAD Assessments, and Architecture/Design Thesis Juries across all university faculties.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10">
                  <div className="text-2xl font-bold">{stats.totalSessions}</div>
                  <div className="text-[10px] text-violet-200 uppercase tracking-wider">Scheduled Sessions</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-center border border-white/10">
                  <div className="text-2xl font-bold">{stats.uniqueFaculty}</div>
                  <div className="text-[10px] text-violet-200 uppercase tracking-wider">Deputed Faculty</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grouped by Duties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Paper Setters & Chief Evaluators */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Paper Setters & Chief Evaluators</h3>
                    <p className="text-[11px] text-zinc-500">Question paper creation & vault submission</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                  {allocations.filter((a) => (a.exam_role || '').toLowerCase().includes('setter')).length} Leads
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {allocations
                  .filter((a) => (a.exam_role || '').toLowerCase().includes('setter'))
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 border border-amber-100 hover:bg-amber-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200/80 text-xs font-bold text-amber-900">
                          {a.staff_name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-zinc-900">{a.staff_name}</div>
                          <div className="text-[11px] text-zinc-500">
                            <span className="font-mono text-amber-800 font-bold">{a.subject_code}</span> · {a.subject_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {a.program_name.split(' ')[0]} Sem {a.semester}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 2. Room Invigilators & Supervisors */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Room Invigilators & Supervisors</h3>
                    <p className="text-[11px] text-zinc-500">Hall supervision & booklet collection</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                  {allocations.filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('invigilator') || r.includes('supervisor');
                  }).length} Supervisors
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {allocations
                  .filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('invigilator') || r.includes('supervisor');
                  })
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 hover:bg-emerald-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200/80 text-xs font-bold text-emerald-900">
                          {a.staff_name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-zinc-900">{a.staff_name}</div>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            {a.exam_center || 'Main Campus Examination Block'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {a.invigilation_sessions || 2} Sessions
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 3. Practical, CAD & Lab Examiners */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Practical & Lab Exam Evaluators</h3>
                    <p className="text-[11px] text-zinc-500">Hands-on computing, CAD & workshop exams</p>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-bold text-cyan-800 border border-cyan-200">
                  {allocations.filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('practical') || r.includes('cad') || r.includes('lab');
                  }).length} Examiners
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {allocations
                  .filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('practical') || r.includes('cad') || r.includes('lab');
                  })
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-cyan-50/40 border border-cyan-100 hover:bg-cyan-50/80 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-zinc-900">{a.staff_name}</div>
                        <div className="text-[11px] text-zinc-500">
                          <span className="font-mono text-cyan-800 font-bold">{a.subject_code}</span> · {a.subject_name}
                        </div>
                        <div className="text-[10px] text-cyan-700 font-medium mt-0.5">{a.exam_center}</div>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
                        Lab Lead
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 4. Studio Drawing & Thesis Jury Leads */}
            <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-pink-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-700">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">Studio Drawing & Thesis Jury Leads</h3>
                    <p className="text-[11px] text-zinc-500">Architecture portfolios, design defense & vivas</p>
                  </div>
                </div>
                <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-bold text-pink-800 border border-pink-200">
                  {allocations.filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('jury') || r.includes('drawing') || r.includes('thesis') || r.includes('convener');
                  }).length} Jurors
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {allocations
                  .filter((a) => {
                    const r = (a.exam_role || '').toLowerCase();
                    return r.includes('jury') || r.includes('drawing') || r.includes('thesis') || r.includes('convener');
                  })
                  .map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-pink-50/40 border border-pink-100 hover:bg-pink-50/80 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-xs text-zinc-900">{a.staff_name}</div>
                        <div className="text-[11px] text-zinc-500">
                          <span className="font-mono text-pink-800 font-bold">{a.subject_code}</span> · {a.subject_name}
                        </div>
                        <div className="text-[10px] text-pink-700 font-medium mt-0.5">{a.exam_center}</div>
                      </div>
                      <span className="text-[10px] font-bold text-pink-800 bg-pink-100 px-2 py-0.5 rounded">
                        {a.exam_role?.split('&')[0]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {editingItem.id ? 'Edit Faculty Allocation & Exam Duty' : 'Assign Faculty & Examination Duties'}
                </h3>
                <p className="text-xs text-zinc-500">Map instructor to Course Master, examination role, and supervision center.</p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Select Course Master Subject
                </label>
                <select
                  value={editingItem.subject_code || ''}
                  onChange={(e) => {
                    const code = e.target.value;
                    const matched = courseMasterList.find((c) => c.paper_code === code);
                    setEditingItem((prev) => ({
                      ...prev,
                      subject_code: code,
                      subject_name: matched?.sm_subject_name || prev?.subject_name || '',
                      semester: matched?.semester || prev?.semester || '1',
                      program_name: matched?.cm_course_name || prev?.program_name || '',
                    }));
                  }}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm text-zinc-800 focus:border-violet-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Course --</option>
                  {courseMasterList.map((c) => (
                    <option key={c.paper_code} value={c.paper_code}>
                      {c.paper_code} - {c.sm_subject_name} ({c.cm_course_name}, Sem {c.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.subject_code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, subject_code: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Subject Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.subject_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, subject_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Faculty Staff Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. T7386"
                    required
                    value={editingItem.staff_code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, staff_code: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Faculty Full Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. Sarah Jenkins"
                    required
                    value={editingItem.staff_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, staff_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
              </div>

              {/* Exam Role & Invigilation Sessions */}
              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3.5 space-y-3">
                <div className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-violet-600" />
                  Examination Duties & Responsibilities
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Assigned Exam Role / Responsibility
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paper Setter & Chief Evaluator"
                    value={editingItem.exam_role || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, exam_role: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {[
                      'Paper Setter & Chief Evaluator',
                      'Invigilator & Room Supervisor',
                      'Invigilator & CAD Practical Examiner',
                      'Practical & Lab Exam Evaluator',
                      'Studio Drawing Jury Convener',
                      'External Jury Lead & Thesis Evaluator',
                    ].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setEditingItem({ ...editingItem, exam_role: preset })}
                        className="text-[10px] bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-md hover:bg-violet-100"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Invigilation Sessions
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={editingItem.invigilation_sessions ?? 2}
                      onChange={(e) => setEditingItem({ ...editingItem, invigilation_sessions: Number(e.target.value) })}
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Assigned Exam Center / Hall
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Examination Hall A"
                      value={editingItem.exam_center || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, exam_center: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={editingItem.section || 'A'}
                    onChange={(e) => setEditingItem({ ...editingItem, section: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={editingItem.semester || '1'}
                    onChange={(e) => setEditingItem({ ...editingItem, semester: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Hrs/Week
                  </label>
                  <input
                    type="number"
                    value={editingItem.workload_hours || 4}
                    onChange={(e) => setEditingItem({ ...editingItem, workload_hours: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Academic Program
                </label>
                <input
                  type="text"
                  value={editingItem.program_name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, program_name: e.target.value })}
                  placeholder="e.g. B.Tech. Construction Engineering & Management"
                  className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Co-Instructors / Additional Staff
                </label>
                <input
                  type="text"
                  placeholder="e.g. T7102 - Prof. Amit Roy, T7118 - Gauri Shiurkar"
                  value={editingItem.additional_staff || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, additional_staff: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2 text-sm text-zinc-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 shadow-md shadow-violet-200"
                >
                  Save Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Import Faculty Allocations</h3>
                <p className="text-xs text-zinc-500">
                  Upload an Excel workbook matching the SSPU <code className="text-violet-600 font-mono">FacultyDetails</code> schema.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadFacultyAllocationTemplate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors shadow-2xs cursor-pointer"
                  title="Download standard Faculty Allocation Excel template"
                >
                  <Download className="h-3.5 w-3.5 text-violet-600" />
                  <span>Download Template</span>
                </button>
                <button
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportRows([]);
                  }}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-violet-600 mb-2" />
                <p className="text-sm font-semibold text-zinc-800">Choose a file (.xlsx, .csv)</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Columns: Subject_Code, Subject_Name, Staff_Code, Staff_name, Section, Sem, Program, Exam_Role, Invigilation_Sessions, Exam_Center
                </p>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="mt-4 block w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
                />
                <div className="mt-3 pt-3 border-t border-violet-100 flex items-center justify-center gap-2 text-xs">
                  <span className="text-zinc-500">Need the standard spreadsheet format?</span>
                  <button
                    type="button"
                    onClick={downloadFacultyAllocationTemplate}
                    className="font-bold text-violet-600 hover:text-violet-800 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    Download Sample Excel Template (.xlsx)
                  </button>
                </div>
              </div>

              {importRows.length > 0 && (
                <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
                    <span>Parsed {importRows.length} valid rows</span>
                    <span className="text-emerald-600 font-medium">Ready to import</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto text-xs divide-y divide-zinc-100 border border-zinc-100 rounded-lg">
                    {importRows.slice(0, 5).map((r, i) => (
                      <div key={i} className="p-2 flex justify-between items-center bg-white">
                        <div>
                          <span className="font-mono text-violet-700 font-bold">{r.subject_code}</span> - {r.subject_name}
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-zinc-700">{r.staff_name} ({r.staff_code})</span>
                          <span className="text-[10px] text-zinc-400 block">{r.exam_role || 'Course Instructor'}</span>
                        </div>
                      </div>
                    ))}
                    {importRows.length > 5 && (
                      <div className="p-2 text-center text-zinc-400 italic">
                        …and {importRows.length - 5} more records
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={downloadFacultyAllocationTemplate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  Download Template
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportRows([]);
                    }}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importRows.length === 0 || isImporting}
                    onClick={handleCommitImport}
                    className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 shadow-md shadow-violet-200 disabled:opacity-50"
                  >
                    {isImporting ? 'Importing…' : `Commit ${importRows.length} Records`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
