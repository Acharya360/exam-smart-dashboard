import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, 
  Download, 
  RefreshCw, 
  FileText, 
  Search, 
  GraduationCap, 
  CheckCircle, 
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../services/db';
import { calculateSGPA } from '../../services/resultEngine';
import type { ExaminationData, RegistrationResult, Program } from '../../types';

interface StudentTRRecord {
  prn: string;
  student_name: string;
  school_name: string;
  cm_course_name: string;
  program_id: string | null;
  semester: string;
  academic_year: string;
  exam_year: string;
  grading_category: 'Architecture' | 'Non-Architecture';
  courses: RegistrationResult[];
  totalCredits: number;
  earnedCredits: number;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  sgpa: number | null;
  finalRemark: 'PASS' | 'FAIL' | 'TNG' | 'PENDING' | 'WITHHELD';
}

export const TRSheetView: React.FC = () => {
  const [data, setData] = useState<ExaminationData>({ programs: [], courses: [], registrations: [], audit: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering selections
  const [schoolFilter, setSchoolFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedPRN, setSelectedPRN] = useState<string>(''); // empty means All Students (consolidated)

  // Single student preview modal state
  const [previewStudent, setPreviewStudent] = useState<StudentTRRecord | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await db.getExaminationData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load examination data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filter options
  const schools = useMemo(() => {
    const set = new Set<string>();
    data.programs.forEach(p => { if (p.school_name) set.add(p.school_name); });
    data.registrations.forEach(r => { if (r.school_name) set.add(r.school_name); });
    return Array.from(set).sort();
  }, [data.programs, data.registrations]);

  const programs = useMemo(() => {
    if (!schoolFilter) return data.programs;
    return data.programs.filter(p => p.school_name === schoolFilter);
  }, [data.programs, schoolFilter]);

  const academicYears = useMemo(() => {
    return Array.from(new Set(data.registrations.map(r => r.academic_year))).filter(Boolean).sort();
  }, [data.registrations]);

  const sessions = useMemo(() => {
    return Array.from(new Set(data.registrations.map(r => r.exam_year))).filter(Boolean).sort();
  }, [data.registrations]);

  const semesters = useMemo(() => {
    return Array.from(new Set(data.registrations.map(r => r.semester))).filter(Boolean).sort();
  }, [data.registrations]);

  // Set default filters if unset
  useEffect(() => {
    if (!programFilter && programs.length) {
      setProgramFilter(programs[0].id);
    }
    if (!semesterFilter && semesters.length) {
      setSemesterFilter(semesters[0]);
    }
    if (!academicYearFilter && academicYears.length) {
      setAcademicYearFilter(academicYears[0]);
    }
    if (!sessionFilter && sessions.length) {
      setSessionFilter(sessions[0]);
    }
  }, [programs, semesters, academicYears, sessions, programFilter, semesterFilter, academicYearFilter, sessionFilter]);

  // Build student-wise grouped records
  const allStudentTRRecords = useMemo<StudentTRRecord[]>(() => {
    const groups = new Map<string, RegistrationResult[]>();

    for (const r of data.registrations) {
      // Filter by program, semester, academic year, session
      if (programFilter && r.program_id !== programFilter && r.cm_course_name !== programFilter) continue;
      if (semesterFilter && r.semester !== semesterFilter) continue;
      if (academicYearFilter && r.academic_year !== academicYearFilter) continue;
      if (sessionFilter && r.exam_year !== sessionFilter) continue;
      if (schoolFilter && r.school_name !== schoolFilter) continue;

      const key = `${r.prn}__${r.cm_course_name}__${r.semester}__${r.academic_year}__${r.exam_year}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const records: StudentTRRecord[] = [];

    for (const rows of groups.values()) {
      if (!rows.length) continue;
      const first = rows[0];
      const prog = data.programs.find(p => p.id === first.program_id || p.program_name === first.cm_course_name);

      const totalCredits = rows.reduce((s, r) => s + r.credits, 0);
      const earnedCredits = rows.reduce((s, r) => s + r.earnedCredits, 0);
      const totalObtained = rows.reduce((s, r) => s + r.total, 0);
      const totalMax = rows.reduce((s, r) => s + r.maximum, 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const sgpa = calculateSGPA(rows);

      // Determine final remark for the student
      let finalRemark: StudentTRRecord['finalRemark'] = 'PASS';
      if (rows.some(r => r.status === 'WITHHELD')) finalRemark = 'WITHHELD';
      else if (rows.some(r => r.status === 'PENDING')) finalRemark = 'PENDING';
      else if (rows.some(r => r.status === 'TNG')) finalRemark = 'TNG';
      else if (rows.some(r => r.status === 'FAIL' || r.status === 'ABSENT')) finalRemark = 'FAIL';

      const category = (first.grading_category || prog?.program_name.toLowerCase().includes('arch') ? 'Architecture' : 'Non-Architecture') as 'Architecture' | 'Non-Architecture';

      records.push({
        prn: first.prn,
        student_name: first.student_name,
        school_name: first.school_name || prog?.school_name || 'School of Higher Skills Education',
        cm_course_name: first.cm_course_name,
        program_id: first.program_id,
        semester: first.semester,
        academic_year: first.academic_year,
        exam_year: first.exam_year,
        grading_category: category,
        courses: rows,
        totalCredits,
        earnedCredits,
        totalObtained,
        totalMax,
        percentage,
        sgpa,
        finalRemark
      });
    }

    return records.sort((a, b) => a.prn.localeCompare(b.prn));
  }, [data.registrations, data.programs, programFilter, semesterFilter, academicYearFilter, sessionFilter, schoolFilter]);

  // Filter students based on PRN selection and text search
  const displayedStudents = useMemo(() => {
    return allStudentTRRecords.filter(s => {
      if (selectedPRN && s.prn !== selectedPRN) return false;
      if (studentSearch) {
        const q = studentSearch.toLowerCase();
        if (!s.prn.toLowerCase().includes(q) && !s.student_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allStudentTRRecords, selectedPRN, studentSearch]);

  const activeProgram = useMemo(() => {
    return data.programs.find(p => p.id === programFilter || p.program_name === programFilter);
  }, [data.programs, programFilter]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Single student immediate print
  const handlePrintSingleStudent = (prn: string) => {
    setSelectedPRN(prn);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  // Export complete Tabulation Register to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!displayedStudents.length) return;

    const rows: Record<string, unknown>[] = [];

    displayedStudents.forEach(student => {
      student.courses.forEach(c => {
        const comp = c.components;
        rows.push({
          'PRN': student.prn,
          'Student Name': student.student_name,
          'Institute / School': student.school_name,
          'Program': student.cm_course_name,
          'Semester': student.semester,
          'Academic Year': student.academic_year,
          'Exam Session': student.exam_year,
          'Course Code': c.paper_code,
          'Course Name': c.sm_subject_name || c.paper_code,
          'Grading Category': student.grading_category,
          'Credits': c.credits,
          'CAT1': comp ? comp.cat1.display : '—',
          'CAT2': comp ? comp.cat2.display : '—',
          'CAT3': comp ? comp.cat3.display : '—',
          'CAP1': comp ? comp.cap1.display : '—',
          'CAP2': comp ? comp.cap2.display : '—',
          'CAP3': comp ? comp.cap3.display : '—',
          'CAS1': comp ? comp.cas1.display : '—',
          'CAS2': comp ? comp.cas2.display : '—',
          'CAS3': comp ? comp.cas3.display : '—',
          'CA Total': c.internalTotal,
          'CA Max': c.internalMaximum,
          'CA Status': c.internalStatus,
          'EST': comp ? comp.est.display : '—',
          'ESP': comp ? comp.esp.display : '—',
          'ESS': comp ? comp.ess.display : '—',
          'EXT Total': comp ? comp.extTotal : 0,
          'EXT Max': comp ? comp.extMax : 0,
          'Grand Total': c.total,
          'Grand Max': c.maximum,
          'Percentage': c.maximum ? c.percentage.toFixed(2) + '%' : '—',
          'Grade': c.grade,
          'Grade Point': c.gradePoint,
          'Credit Points': c.creditPoints,
          'Course Status': c.status,
          'Remark': comp ? comp.remark : c.status,
          'Semester SGPA': student.sgpa !== null ? student.sgpa.toFixed(2) : 'WITHHELD',
          'Semester Result': student.finalRemark
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Tabulation Register');
    const filename = `SSPU_Tabulation_Register_${activeProgram?.program_code || 'Semester'}_Sem_${semesterFilter || 'All'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <section className="space-y-6">
      {/* Print CSS Injection */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm 6mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #0f172a !important;
            width: 100% !important;
            height: 100% !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-tr-area, #printable-tr-area * {
            visibility: visible !important;
          }
          #printable-tr-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .no-print {
            display: none !important;
          }
          .tr-sheet-page {
            page-break-before: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            max-width: 285mm !important;
            height: 198mm !important;
            max-height: 198mm !important;
            box-sizing: border-box !important;
            padding: 3mm 4.5mm !important;
            margin: 0 auto !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            background: #ffffff !important;
          }
          .tr-sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .tr-sheet-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
        }
      `}</style>

      {/* Screen Header (Hidden on Print) */}
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <FileText className="w-3.5 h-3.5" />
              Official Examination Register
            </span>
            <span className="text-xs text-slate-400 font-mono">Format: TR-SSPU-REV2026</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              A4 Landscape · 1 Student / Page
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            Tabulation Register (TR Sheet) Generation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate and export official, university-branded student-wise result tabulation statements and consolidated semester-wise registers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={!displayedStudents.length || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Register (.xlsx)</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!displayedStudents.length || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>
              {displayedStudents.length === 1 
                ? 'Print / Save as PDF (1 Student · Fit to A4)' 
                : `Print / Save as PDF (${displayedStudents.length} Students · 1 Page Each)`}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="no-print p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Selection Panel (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tabulation Register Configuration</span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {displayedStudents.length} of {allStudentTRRecords.length} student sheets selected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Institute / School */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Institute / School</label>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Institutes / Schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Program (Required for standard semester view) */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Degree Programme</label>
            <select
              value={programFilter}
              onChange={e => setProgramFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select Programme...</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.program_name}</option>)}
            </select>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Semester</label>
            <select
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Academic Year</label>
            <select
              value={academicYearFilter}
              onChange={e => setAcademicYearFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Academic Years</option>
              {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Exam Session */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exam Session</label>
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Exam Sessions</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Student-level filter row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Display Scope:</span>
            <select
              value={selectedPRN}
              onChange={e => setSelectedPRN(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Consolidated Semester Register (All {allStudentTRRecords.length} Students)</option>
              {allStudentTRRecords.map(s => (
                <option key={s.prn} value={s.prn}>
                  Individual: {s.prn} - {s.student_name}
                </option>
              ))}
            </select>

            {selectedPRN && (
              <button
                onClick={() => setSelectedPRN('')}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                Reset to All Students
              </button>
            )}
          </div>

          <div className="w-72">
            <input
              type="text"
              placeholder="Search by student name or PRN..."
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Printable / Rendered TR Sheets Area */}
      <div id="printable-tr-area" ref={printAreaRef} className="space-y-8">
        {displayedStudents.map((student, studentIndex) => (
          <div 
            key={`${student.prn}__${student.cm_course_name}__${student.semester}__${student.academic_year}__${student.exam_year}__${studentIndex}`} 
            className="tr-sheet-page bg-white border border-slate-300 rounded-2xl p-6 print:p-2.5 print:rounded-md shadow-sm text-slate-900 font-sans"
          >
            {/* Action Bar for Single Student on Screen (Hidden on Print) */}
            <div className="no-print flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Student #{studentIndex + 1} of {displayedStudents.length}</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">{student.prn}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  A4 Single Page Fit
                </span>
              </div>
              <button
                onClick={() => handlePrintSingleStudent(student.prn)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                title="Print only this student sheet fitted to 1 single A4 page"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print This Student (1 A4 Page)</span>
              </button>
            </div>

            {/* Official University Header */}
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-4 print:pb-1 print:mb-1 print:border-b">
              <div className="flex items-center justify-center gap-2 print:gap-1.5">
                <GraduationCap className="w-6 h-6 print:w-4 print:h-4 text-indigo-900 inline-block" />
                <h1 className="text-xl print:text-xs font-extrabold tracking-wide text-slate-900 uppercase font-serif">
                  SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY
                </h1>
              </div>
              <p className="text-[11px] print:text-[7.5px] text-slate-600 font-medium tracking-normal mt-0.5 print:mt-0 leading-tight">
                (Recognized by UGC & Govt. of Maharashtra · Village Kiwale, Adjoining Pune-Mumbai Expressway, Pune - 412101)
              </p>
              <div className="mt-1.5 print:mt-0.5 inline-block bg-slate-900 text-white text-xs print:text-[8px] font-bold uppercase tracking-widest px-4 py-0.5 print:px-2 print:py-0 rounded">
                TABULATION REGISTER (TR SHEET) · {student.exam_year.toUpperCase()}
              </div>
            </div>

            {/* Student & Examination Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 print:gap-x-3 print:gap-y-0.5 bg-slate-50/80 border border-slate-200 rounded-xl print:rounded p-3 print:p-1.5 mb-4 print:mb-1 text-xs print:text-[9px]">
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Student Name</span>
                <p className="font-bold text-slate-900 text-sm print:text-[9.5px] mt-0.5 print:mt-0 leading-tight truncate">{student.student_name}</p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">PRN / Enrollment No.</span>
                <p className="font-mono font-bold text-slate-900 text-sm print:text-[9.5px] mt-0.5 print:mt-0 leading-tight">{student.prn}</p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Programme</span>
                <p className="font-semibold text-slate-900 mt-0.5 print:mt-0 leading-tight truncate print:text-[9px]">{student.cm_course_name}</p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Institute / School</span>
                <p className="font-semibold text-slate-900 mt-0.5 print:mt-0 leading-tight truncate print:text-[9px]">{student.school_name}</p>
              </div>

              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Semester & Session</span>
                <p className="font-medium text-slate-800 mt-0.5 print:mt-0 leading-tight print:text-[9px]">Semester {student.semester} · {student.academic_year}</p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Grading Category</span>
                <p className="font-medium text-slate-800 mt-0.5 print:mt-0 leading-tight">
                  <span className={`px-2 py-0.5 print:px-1.5 print:py-0 rounded text-[10px] print:text-[8px] font-bold ${
                    student.grading_category === 'Architecture' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {student.grading_category}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Registered Credits</span>
                <p className="font-mono font-semibold text-slate-800 mt-0.5 print:mt-0 leading-tight print:text-[9px]">{student.totalCredits} Credits</p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500 tracking-wider">Semester SGPA</span>
                <p className="font-mono font-extrabold text-sm print:text-[10px] text-indigo-900 mt-0.5 print:mt-0 leading-tight">
                  {student.sgpa !== null ? student.sgpa.toFixed(2) : 'WITHHELD'}
                </p>
              </div>
            </div>

            {/* Assessment Component Matrix Table */}
            <div className="overflow-auto max-h-[450px] print:max-h-none print:overflow-visible border border-slate-300 rounded-lg print:rounded mb-4 print:mb-1">
              <table className="w-full text-left text-[11px] print:text-[8.5px] border-collapse tr-sheet-table">
                <thead className="sticky top-0 z-10 print:static bg-slate-100 shadow-2xs print:shadow-none">
                  {/* Multi-tiered header matching university standards */}
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold text-center text-[10px] print:text-[7.5px]">
                    <th rowSpan={2} className="px-2.5 py-1.5 print:px-1 print:py-0.5 text-left border-r border-slate-300">Course Code & Subject Title</th>
                    <th colSpan={3} className="px-2 py-1 print:px-1 print:py-0.5 border-r border-slate-300 bg-blue-50/60">Theory Internal (CAT)</th>
                    <th colSpan={3} className="px-2 py-1 print:px-1 print:py-0.5 border-r border-slate-300 bg-emerald-50/60">Practical Internal (CAP)</th>
                    <th colSpan={3} className="px-2 py-1 print:px-1 print:py-0.5 border-r border-slate-300 bg-amber-50/60">Skills Internal (CAS)</th>
                    <th rowSpan={2} className="px-2 py-1.5 print:px-1 print:py-0.5 border-r border-slate-300 bg-slate-200/80 font-bold">CA Total</th>
                    <th colSpan={3} className="px-2 py-1 print:px-1 print:py-0.5 border-r border-slate-300 bg-purple-50/60">End-Semester Exam (ESE)</th>
                    <th rowSpan={2} className="px-2 py-1.5 print:px-1 print:py-0.5 border-r border-slate-300 bg-slate-200/80 font-bold">EXT Total</th>
                    <th rowSpan={2} className="px-2 py-1.5 print:px-1 print:py-0.5 border-r border-slate-300 font-bold">Grand Total</th>
                    <th rowSpan={2} className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 border-r border-slate-300 font-bold">Grade</th>
                    <th rowSpan={2} className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 border-r border-slate-300 font-bold">Credits</th>
                    <th rowSpan={2} className="px-2 py-1.5 print:px-1 print:py-0.5 font-bold">Remark</th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-300 text-center text-[10px] print:text-[7px]">
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAT1</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAT2</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-300">CAT3</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAP1</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAP2</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-300">CAP3</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAS1</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">CAS2</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-300">CAS3</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">EST</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-200">ESP</th>
                    <th className="px-1.5 py-1 print:px-0.5 print:py-0.2 border-r border-slate-300">ESS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {student.courses.map(course => {
                    const comp = course.components;
                    const isTNG = course.internalStatus === 'TNG';
                    const isFail = course.status === 'FAIL';
                    const isPass = course.status === 'PASS';

                    return (
                      <tr key={course.id} className="hover:bg-slate-50/50">
                        {/* Course Code & Name */}
                        <td className="px-2.5 py-1.5 print:px-1 print:py-0.5 border-r border-slate-300 text-left font-sans">
                          <div className="font-bold text-slate-900 leading-tight">{course.paper_code}</div>
                          <div className="text-[10px] print:text-[7.5px] text-slate-600 truncate max-w-xs leading-tight">{course.sm_subject_name || course.paper_code}</div>
                        </td>

                        {/* CAT1, CAT2, CAT3 */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cat1.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cat2.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300">{comp ? comp.cat3.display : '—'}</td>

                        {/* CAP1, CAP2, CAP3 */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cap1.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cap2.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300">{comp ? comp.cap3.display : '—'}</td>

                        {/* CAS1, CAS2, CAS3 */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cas1.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.cas2.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300">{comp ? comp.cas3.display : '—'}</td>

                        {/* CA Total */}
                        <td className={`px-2 py-1.5 print:px-1 print:py-0.5 text-center border-r border-slate-300 font-bold ${
                          isTNG ? 'text-rose-600 bg-rose-50/40' : 'text-slate-900 bg-slate-100/60'
                        }`}>
                          {course.internalTotal}
                          <span className="text-slate-400 text-[9px] print:text-[6.5px] font-normal block leading-none">/{course.internalMaximum}</span>
                        </td>

                        {/* EST, ESP, ESS */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.est.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-200">{comp ? comp.esp.display : '—'}</td>
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300">{comp ? comp.ess.display : '—'}</td>

                        {/* EXT Total */}
                        <td className="px-2 py-1.5 print:px-1 print:py-0.5 text-center border-r border-slate-300 font-bold text-slate-800 bg-slate-100/60">
                          {comp ? comp.extTotal : '—'}
                          <span className="text-slate-400 text-[9px] print:text-[6.5px] font-normal block leading-none">/{comp ? comp.extMax : '—'}</span>
                        </td>

                        {/* Grand Total */}
                        <td className="px-2 py-1.5 print:px-1 print:py-0.5 text-center border-r border-slate-300 font-bold text-slate-900">
                          {course.total}
                          <span className="text-slate-400 text-[9px] print:text-[6.5px] font-normal block leading-none">/{course.maximum}</span>
                        </td>

                        {/* Grade */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300 font-bold text-slate-900">
                          {course.grade}
                        </td>

                        {/* Credits */}
                        <td className="px-1.5 py-1.5 print:px-0.5 print:py-0.5 text-center border-r border-slate-300">
                          {course.credits}
                        </td>

                        {/* Remark */}
                        <td className="px-2 py-1.5 print:px-1 print:py-0.5 text-center font-sans font-bold">
                          <span className={`px-2 py-0.5 print:px-1 print:py-0 rounded text-[10px] print:text-[7.5px] ${
                            isPass ? 'bg-emerald-100 text-emerald-800' :
                            isTNG ? 'bg-rose-100 text-rose-800' :
                            isFail ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {comp ? comp.remark : course.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Performance Summary Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:gap-1 p-3 print:p-1 bg-slate-100/90 rounded-xl print:rounded border border-slate-300 mb-6 print:mb-1 text-xs print:text-[9px]">
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500">Total Credits Earned</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5 print:mt-0 leading-tight">
                  {student.earnedCredits} / {student.totalCredits}
                </p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500">Grand Total Obtained</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5 print:mt-0 leading-tight">
                  {student.totalObtained} / {student.totalMax}
                </p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500">Aggregate Percentage</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5 print:mt-0 leading-tight">
                  {student.totalMax > 0 ? student.percentage.toFixed(2) + '%' : '—'}
                </p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500">Semester SGPA</span>
                <p className="font-mono font-extrabold text-indigo-900 text-sm print:text-[10px] mt-0.5 print:mt-0 leading-tight">
                  {student.sgpa !== null ? student.sgpa.toFixed(2) : 'WITHHELD'}
                </p>
              </div>
              <div>
                <span className="text-[10px] print:text-[7px] uppercase font-bold text-slate-500">Semester Result</span>
                <p className="font-bold text-xs print:text-[9px] mt-0.5 print:mt-0 leading-tight">
                  <span className={`px-2.5 py-0.5 print:px-1.5 print:py-0 rounded ${
                    student.finalRemark === 'PASS' ? 'bg-emerald-600 text-white' :
                    student.finalRemark === 'TNG' ? 'bg-rose-600 text-white' :
                    student.finalRemark === 'FAIL' ? 'bg-rose-600 text-white' :
                    'bg-amber-600 text-white'
                  }`}>
                    {student.finalRemark}
                  </span>
                </p>
              </div>
            </div>

            {/* Remarks / Explanatory Notes */}
            <div className="text-[10px] print:text-[7px] text-slate-600 border-t border-slate-200 pt-2 print:pt-0.5 mb-8 print:mb-1 space-y-0.5 print:space-y-0 font-sans leading-tight">
              <p><strong>Remark Codes:</strong> P = Pass | F = Fail | TNG = Term Not Granted (ineligible for ESE) | Pending = Assessment incomplete | AB = Absent | NA = Not Applicable.</p>
              <p>Calculations adhere to university-approved academic grading regulations. Incomplete, TNG or Withheld assessments withhold semester SGPA.</p>
            </div>

            {/* Institutional Signatures Section */}
            <div className="pt-6 print:pt-1 border-t border-slate-300 grid grid-cols-3 text-center text-xs print:text-[8.5px] font-semibold text-slate-700">
              <div className="space-y-6 print:space-y-0.5">
                <div className="h-8 print:h-4 border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="leading-tight">Prepared By<br /><span className="text-[10px] print:text-[7px] font-normal text-slate-500">(Examination Data Team)</span></p>
              </div>
              <div className="space-y-6 print:space-y-0.5">
                <div className="h-8 print:h-4 border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="leading-tight">Verified By<br /><span className="text-[10px] print:text-[7px] font-normal text-slate-500">(Department / Program Coordinator)</span></p>
              </div>
              <div className="space-y-6 print:space-y-0.5">
                <div className="h-8 print:h-4 border-b border-dashed border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="leading-tight">Controller of Examinations<br /><span className="text-[10px] print:text-[7px] font-normal text-slate-500">(CoE Cell, SSPU)</span></p>
              </div>
            </div>

            {/* Footer page identifier */}
            <div className="mt-4 print:mt-0.5 pt-2 print:pt-0.5 border-t border-slate-100 print:border-slate-200 flex items-center justify-between text-[9px] print:text-[7px] text-slate-400 font-mono">
              <span>PRN: {student.prn} · {student.student_name}</span>
              <span>SSPU Exam Registry · Page {studentIndex + 1} of {displayedStudents.length}</span>
            </div>
          </div>
        ))}

        {!displayedStudents.length && !loading && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Tabulation Register Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a valid degree programme and semester from the filter bar above to preview and generate TR Sheets.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
