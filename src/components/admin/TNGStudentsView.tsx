import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  ShieldAlert, 
  CheckCircle,
  Eye,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../services/db';
import type { ExaminationData, RegistrationResult } from '../../types';

interface TNGStudentsViewProps {
  onNavigateToCourse?: (courseId: string) => void;
}

interface StudentTNGGroup {
  prn: string;
  student_name: string;
  school_name: string;
  cm_course_name: string;
  program_id: string | null;
  semester: string;
  academic_year: string;
  exam_year: string;
  failedCourses: RegistrationResult[];
}

export const TNGStudentsView: React.FC<TNGStudentsViewProps> = () => {
  const [data, setData] = useState<ExaminationData>({ programs: [], courses: [], registrations: [], audit: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Expanded student PRNs in grouped view
  const [expandedPRNs, setExpandedPRNs] = useState<Set<string>>(new Set());

  // Modal for individual student drill-down
  const [activeDrillDown, setActiveDrillDown] = useState<RegistrationResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await db.getExaminationData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load examination records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Filter only registrations with internalStatus === 'TNG'
  const allTNGRegistrations = useMemo(() => {
    return data.registrations.filter(r => r.internalStatus === 'TNG');
  }, [data.registrations]);

  // Extract unique filter options
  const schools = useMemo(() => {
    const set = new Set<string>();
    data.programs.forEach(p => { if (p.school_name) set.add(p.school_name); });
    allTNGRegistrations.forEach(r => { if (r.school_name) set.add(r.school_name); });
    return Array.from(set).sort();
  }, [data.programs, allTNGRegistrations]);

  const programs = useMemo(() => {
    return data.programs;
  }, [data.programs]);

  const semesters = useMemo(() => {
    return Array.from(new Set(allTNGRegistrations.map(r => r.semester))).filter(Boolean).sort();
  }, [allTNGRegistrations]);

  const academicYears = useMemo(() => {
    return Array.from(new Set(allTNGRegistrations.map(r => r.academic_year))).filter(Boolean).sort();
  }, [allTNGRegistrations]);

  const sessions = useMemo(() => {
    return Array.from(new Set(allTNGRegistrations.map(r => r.exam_year))).filter(Boolean).sort();
  }, [allTNGRegistrations]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    allTNGRegistrations.forEach(r => {
      if (r.paper_code) {
        map.set(r.paper_code, r.sm_subject_name || r.paper_code);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allTNGRegistrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return allTNGRegistrations.filter(r => {
      if (schoolFilter && r.school_name !== schoolFilter) return false;
      if (programFilter && r.program_id !== programFilter && r.cm_course_name !== programFilter) return false;
      if (semesterFilter && r.semester !== semesterFilter) return false;
      if (academicYearFilter && r.academic_year !== academicYearFilter) return false;
      if (sessionFilter && r.exam_year !== sessionFilter) return false;
      if (subjectFilter && r.paper_code !== subjectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches = 
          r.prn.toLowerCase().includes(q) ||
          r.student_name.toLowerCase().includes(q) ||
          r.paper_code.toLowerCase().includes(q) ||
          (r.sm_subject_name && r.sm_subject_name.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [allTNGRegistrations, schoolFilter, programFilter, semesterFilter, academicYearFilter, sessionFilter, subjectFilter, search]);

  // Group filtered registrations by student (PRN)
  const groupedStudents = useMemo<StudentTNGGroup[]>(() => {
    const map = new Map<string, StudentTNGGroup>();
    filteredRegistrations.forEach(reg => {
      const key = `${reg.prn}__${reg.semester}__${reg.exam_year}`;
      if (!map.has(key)) {
        map.set(key, {
          prn: reg.prn,
          student_name: reg.student_name,
          school_name: reg.school_name || '',
          cm_course_name: reg.cm_course_name,
          program_id: reg.program_id,
          semester: reg.semester,
          academic_year: reg.academic_year,
          exam_year: reg.exam_year,
          failedCourses: []
        });
      }
      map.get(key)!.failedCourses.push(reg);
    });
    return Array.from(map.values());
  }, [filteredRegistrations]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalStudents = new Set(filteredRegistrations.map(r => r.prn)).size;
    const totalCourses = filteredRegistrations.length;
    const archCount = filteredRegistrations.filter(r => r.grading_category === 'Architecture').length;
    const nonArchCount = filteredRegistrations.filter(r => r.grading_category !== 'Architecture').length;
    return { totalStudents, totalCourses, archCount, nonArchCount };
  }, [filteredRegistrations]);

  const togglePRN = (prn: string) => {
    setExpandedPRNs(prev => {
      const next = new Set(prev);
      if (next.has(prn)) next.delete(prn);
      else next.add(prn);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPRNs(new Set(groupedStudents.map(g => g.prn)));
  };

  const collapseAll = () => {
    setExpandedPRNs(new Set());
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!filteredRegistrations.length) return;

    const rows = filteredRegistrations.map(r => {
      const required = r.internalRequired;
      const obtained = r.internalTotal;
      const shortfall = Math.max(0, required - obtained);
      const caPct = r.internalMaximum > 0 ? ((obtained / r.internalMaximum) * 100).toFixed(2) : '0.00';
      const category = r.grading_category || 'Non-Architecture';
      const minPct = category === 'Architecture' ? '45%' : '40%';

      return {
        'PRN / Enrollment Number': r.prn,
        'Student Name': r.student_name,
        'Institute / School': r.school_name || 'SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY',
        'Program': r.cm_course_name,
        'Academic Year': r.academic_year,
        'Semester': r.semester,
        'Examination Session': r.exam_year,
        'Course Code': r.paper_code,
        'Course Name': r.sm_subject_name || r.paper_code,
        'Grading Category': category,
        'CA Maximum Marks': r.internalMaximum,
        'CA Obtained Marks': obtained,
        'Required Passing Marks': `${required} (${minPct})`,
        'Shortfall Marks': shortfall,
        'CA Percentage': `${caPct}%`,
        'TNG Reason': `Combined CA marks ${obtained}/${r.internalMaximum} is below minimum passing requirement of ${required} (${minPct}). Shortfall of ${shortfall} mark(s). ESE appearance blocked.`,
        'Status': 'TNG'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 18 }, // PRN
      { wch: 25 }, // Name
      { wch: 30 }, // School
      { wch: 35 }, // Program
      { wch: 14 }, // Academic Year
      { wch: 10 }, // Semester
      { wch: 18 }, // Exam Year
      { wch: 14 }, // Course Code
      { wch: 30 }, // Course Name
      { wch: 18 }, // Category
      { wch: 14 }, // CA Max
      { wch: 14 }, // CA Obtained
      { wch: 18 }, // Required Passing
      { wch: 14 }, // Shortfall
      { wch: 14 }, // CA %
      { wch: 50 }, // Reason
      { wch: 10 }  // Status
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'TNG Students Report');
    const filename = `SSPU_TNG_Students_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              Examination Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">Rule: CA &ge; 40% (Non-Arch) / 45% (Arch)</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
            Term Not Granted (TNG) Registry
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automated internal assessment shortfall identification. Students listed below are ineligible to appear for End-Semester Examinations (ESE).
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
            disabled={!filteredRegistrations.length || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export TNG Report (.xlsx)</span>
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">TNG Candidates</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-rose-600">{metrics.totalStudents}</span>
            <span className="text-xs text-slate-400 font-medium">Students</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ineligible across &ge;1 subject</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Course Ineligibilities</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalCourses}</span>
            <span className="text-xs text-slate-400 font-medium">Registrations</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total paper blocks</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Architecture TNG</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-600">{metrics.archCount}</span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Cutoff 45%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Council guidelines applied</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Non-Architecture TNG</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-indigo-600">{metrics.nonArchCount}</span>
            <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">Cutoff 40%</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">University standard scheme</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">TNG Filtering & Search</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">View mode:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'grouped' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Grouped by Student ({groupedStudents.length})
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'flat' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Subject Entries ({filteredRegistrations.length})
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {/* Keyword search */}
          <div className="lg:col-span-2">
            <input
              type="text"
              placeholder="Search PRN, Student Name, Paper Code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* School filter */}
          <div>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Institutes / Schools</option>
              {schools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Program filter */}
          <div>
            <select
              value={programFilter}
              onChange={e => setProgramFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Programmes</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.program_name}</option>)}
            </select>
          </div>

          {/* Semester filter */}
          <div>
            <select
              value={semesterFilter}
              onChange={e => setSemesterFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {/* Session filter */}
          <div>
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Exam Sessions</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Subject filter */}
          <div>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
            </select>
          </div>
        </div>

        {viewMode === 'grouped' && (
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
            <span>Showing {groupedStudents.length} distinct students with TNG status</span>
            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="text-indigo-600 hover:underline">Expand All</button>
              <span>·</span>
              <button onClick={collapseAll} className="text-indigo-600 hover:underline">Collapse All</button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {groupedStudents.map((student, idx) => {
            const isExpanded = expandedPRNs.has(student.prn);
            return (
              <div key={`${student.prn}__${student.cm_course_name}__${student.semester}__${student.exam_year}__${idx}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors">
                {/* Student Summary Row */}
                <div 
                  onClick={() => togglePRN(student.prn)}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer bg-white hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{student.student_name}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {student.prn}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>{student.cm_course_name}</span>
                        <span>·</span>
                        <span>Sem {student.semester}</span>
                        <span>·</span>
                        <span>{student.academic_year} ({student.exam_year})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {student.failedCourses.length} {student.failedCourses.length === 1 ? 'Subject Failed' : 'Subjects Failed'}
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">
                      {isExpanded ? 'Hide Details' : 'View Subjects'} &rarr;
                    </span>
                  </div>
                </div>

                {/* Expanded Subjects Table */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                    <div className="overflow-auto max-h-[360px] rounded-lg border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider shadow-2xs">
                          <tr>
                            <th className="px-3 py-2.5">Course Code & Name</th>
                            <th className="px-3 py-2.5">Category</th>
                            <th className="px-3 py-2.5 text-center">CA Max</th>
                            <th className="px-3 py-2.5 text-center">CA Obtained</th>
                            <th className="px-3 py-2.5 text-center">Required Passing</th>
                            <th className="px-3 py-2.5 text-center">Shortfall</th>
                            <th className="px-3 py-2.5 text-center">CA %</th>
                            <th className="px-3 py-2.5">TNG Rationale</th>
                            <th className="px-3 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {student.failedCourses.map(course => {
                            const category = course.grading_category || 'Non-Architecture';
                            const minPct = category === 'Architecture' ? '45%' : '40%';
                            const shortfall = Math.max(0, course.internalRequired - course.internalTotal);
                            const caPct = course.internalMaximum > 0 ? ((course.internalTotal / course.internalMaximum) * 100).toFixed(1) : '0.0';

                            return (
                              <tr key={course.id} className="hover:bg-rose-50/30">
                                <td className="px-3 py-2.5">
                                  <div className="font-semibold text-slate-900">{course.paper_code}</div>
                                  <div className="text-[11px] text-slate-500">{course.sm_subject_name || course.paper_code}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    category === 'Architecture' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {category}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono font-medium">{course.internalMaximum}</td>
                                <td className="px-3 py-2.5 text-center font-mono font-bold text-rose-600">{course.internalTotal}</td>
                                <td className="px-3 py-2.5 text-center font-mono">{course.internalRequired} <span className="text-slate-400 text-[10px]">({minPct})</span></td>
                                <td className="px-3 py-2.5 text-center font-mono font-semibold text-rose-600">-{shortfall}</td>
                                <td className="px-3 py-2.5 text-center font-mono font-semibold text-rose-700">{caPct}%</td>
                                <td className="px-3 py-2.5 text-[11px] text-slate-600 max-w-xs">
                                  <span className="text-rose-700 font-medium">Shortfall of {shortfall} mark(s)</span> from minimum {minPct} ({course.internalRequired} marks).
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setActiveDrillDown(course); }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Marks Drill-down</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!groupedStudents.length && !loading && (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No TNG Students Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                All students in the selected query meet the continuous internal assessment passing thresholds.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Flat Subject Entries Table */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-auto max-h-[620px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="px-4 py-3">Student & PRN</th>
                  <th className="px-4 py-3">Programme & Sem</th>
                  <th className="px-4 py-3">Course Code & Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">CA Max</th>
                  <th className="px-4 py-3 text-center">CA Marks</th>
                  <th className="px-4 py-3 text-center">Required</th>
                  <th className="px-4 py-3 text-center">Shortfall</th>
                  <th className="px-4 py-3 text-center">CA %</th>
                  <th className="px-4 py-3">TNG Rationale</th>
                  <th className="px-4 py-3 text-right">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrations.map(r => {
                  const category = r.grading_category || 'Non-Architecture';
                  const minPct = category === 'Architecture' ? '45%' : '40%';
                  const shortfall = Math.max(0, r.internalRequired - r.internalTotal);
                  const caPct = r.internalMaximum > 0 ? ((r.internalTotal / r.internalMaximum) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.student_name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{r.prn}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{r.cm_course_name}</div>
                        <div className="text-slate-500 text-[11px]">Semester {r.semester} · {r.exam_year}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.paper_code}</div>
                        <div className="text-slate-500 text-[11px]">{r.sm_subject_name || r.paper_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          category === 'Architecture' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{r.internalMaximum}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">{r.internalTotal}</td>
                      <td className="px-4 py-3 text-center font-mono">{r.internalRequired} <span className="text-slate-400 text-[10px]">({minPct})</span></td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">-{shortfall}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-rose-700">{caPct}%</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-xs">
                        Shortfall of {shortfall} mark(s). Ineligible for ESE.
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveDrillDown(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Drill-down</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filteredRegistrations.length && !loading && (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">No TNG records match the selected filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Component Marks Drill-Down Modal */}
      {activeDrillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    TNG Assessment Breakdown
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-700">{activeDrillDown.paper_code}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{activeDrillDown.student_name}</h2>
                <p className="text-xs text-slate-500 font-mono">
                  PRN: {activeDrillDown.prn} · Semester {activeDrillDown.semester} · {activeDrillDown.cm_course_name}
                </p>
              </div>
              <button
                onClick={() => setActiveDrillDown(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assessment Component Matrix */}
            <div className="space-y-4">
              <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-rose-800">Term Not Granted (TNG) Status</span>
                  <p className="text-rose-700 text-[11px] mt-0.5">
                    Internal CA Total is {activeDrillDown.internalTotal} / {activeDrillDown.internalMaximum} (required {activeDrillDown.internalRequired}). Shortfall of {Math.max(0, activeDrillDown.internalRequired - activeDrillDown.internalTotal)} marks.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-rose-700">
                    {activeDrillDown.internalMaximum ? ((activeDrillDown.internalTotal / activeDrillDown.internalMaximum) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {activeDrillDown.components ? (
                <div className="border border-slate-200 rounded-xl overflow-auto max-h-[320px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-semibold text-slate-600 uppercase shadow-2xs">
                      <tr>
                        <th className="px-3 py-2">Head</th>
                        <th className="px-3 py-2 text-center">CA1</th>
                        <th className="px-3 py-2 text-center">CA2</th>
                        <th className="px-3 py-2 text-center">CA3</th>
                        <th className="px-3 py-2 text-center">Head Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Theory */}
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Theory</td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cat1.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cat1.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cat2.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cat2.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cat3.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cat3.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-semibold">
                          {(typeof activeDrillDown.components.cat1.obtained === 'number' ? activeDrillDown.components.cat1.obtained : 0) +
                           (typeof activeDrillDown.components.cat2.obtained === 'number' ? activeDrillDown.components.cat2.obtained : 0) +
                           (typeof activeDrillDown.components.cat3.obtained === 'number' ? activeDrillDown.components.cat3.obtained : 0)}
                        </td>
                      </tr>
                      {/* Practical */}
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Practical</td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cap1.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cap1.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cap2.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cap2.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cap3.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cap3.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-semibold">
                          {(typeof activeDrillDown.components.cap1.obtained === 'number' ? activeDrillDown.components.cap1.obtained : 0) +
                           (typeof activeDrillDown.components.cap2.obtained === 'number' ? activeDrillDown.components.cap2.obtained : 0) +
                           (typeof activeDrillDown.components.cap3.obtained === 'number' ? activeDrillDown.components.cap3.obtained : 0)}
                        </td>
                      </tr>
                      {/* Skills */}
                      <tr>
                        <td className="px-3 py-2 font-medium text-slate-800">Skills</td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cas1.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cas1.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cas2.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cas2.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {activeDrillDown.components.cas3.display} <span className="text-slate-400 text-[10px]">/{activeDrillDown.components.cas3.max}</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-semibold">
                          {(typeof activeDrillDown.components.cas1.obtained === 'number' ? activeDrillDown.components.cas1.obtained : 0) +
                           (typeof activeDrillDown.components.cas2.obtained === 'number' ? activeDrillDown.components.cas2.obtained : 0) +
                           (typeof activeDrillDown.components.cas3.obtained === 'number' ? activeDrillDown.components.cas3.obtained : 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Component details not loaded.</p>
              )}

              {/* End Semester Examination Policy Note */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Examination Policy Notice:</span> In accordance with University Examination Regulations, students with Term Not Granted status in internal Continuous Assessment cannot be seated for EST, ESP, or ESS components of this course.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveDrillDown(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Drill-down
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
