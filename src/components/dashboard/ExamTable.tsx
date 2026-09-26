import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { parseExamScheduleExcel } from '../../services/excelParser';
import { ExamSchedule, ExamTask, Program } from '../../types';
import { AdvancedExamFilter, ExamFilterState } from '../common/AdvancedExamFilter';
import { 
  Download, 
  ListPlus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  FileSpreadsheet,
  UploadCloud,
  Trash2
} from 'lucide-react';

interface ExamTableProps {
  schedules: ExamSchedule[];
  tasks: ExamTask[];
  programs: Program[];
  isCoordinatorView: boolean;
  onSelectScheduleForTasks: (schedule: ExamSchedule) => void;
  onGenerateTasks: (schedule: ExamSchedule) => void;
  onCommitSchedules?: (schedules: ExamSchedule[], autoGen: boolean) => void;
  onDeleteSchedule?: (id: string) => void;
  onDeleteSchedules?: (ids: string[]) => void;
}

function parseDateStrToTime(dateStr: string): number {
  if (!dateStr) return 0;
  if (dateStr.includes('/')) {
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`).getTime();
    }
  }
  return new Date(dateStr).getTime();
}

export const ExamTable: React.FC<ExamTableProps> = ({
  schedules,
  tasks,
  programs,
  isCoordinatorView,
  onSelectScheduleForTasks,
  onGenerateTasks,
  onCommitSchedules,
  onDeleteSchedule,
  onDeleteSchedules,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ExamFilterState>({
    search: '',
    school: 'ALL',
    program: 'ALL',
    examType: 'ALL',
    semester: 'ALL',
    session: 'ALL',
    startDate: '',
    endDate: '',
    minStudents: '',
    maxStudents: '',
    examYear: 'ALL',
  });

  // Distinct schools
  const schools = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.cm_school_name) set.add(s.cm_school_name);
    });
    return Array.from(set);
  }, [schedules]);

  // Distinct exam years
  const examYears = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach((s) => {
      if (s.exam_year) set.add(s.exam_year);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filtered schedules with multi-field search and comprehensive criteria
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // Multi-field Search: paper code, subject name, program name, course name, logic1, PKGNo
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchesSearch =
          item.sm_subject_name.toLowerCase().includes(q) ||
          item.paper_code.toLowerCase().includes(q) ||
          item.cm_course_name.toLowerCase().includes(q) ||
          (item.cm_school_name && item.cm_school_name.toLowerCase().includes(q)) ||
          item.logic1.toLowerCase().includes(q) ||
          (item.program_code && item.program_code.toLowerCase().includes(q)) ||
          String(item.pkg_no).includes(q);

        if (!matchesSearch) return false;
      }

      // School filter
      if (filters.school !== 'ALL' && item.cm_school_name !== filters.school) {
        return false;
      }

      // Program filter
      if (filters.program !== 'ALL' && item.program_code !== filters.program) {
        return false;
      }

      // Exam Type filter
      if (filters.examType !== 'ALL' && item.exam_type !== filters.examType) {
        return false;
      }

      // Session filter (AM/PM)
      if (filters.session !== 'ALL' && item.am_pm !== filters.session) {
        return false;
      }

      // Semester filter
      if (filters.semester !== 'ALL' && String(item.semester) !== filters.semester) {
        return false;
      }

      // Exam Year filter
      if (filters.examYear !== 'ALL' && item.exam_year !== filters.examYear) {
        return false;
      }

      // Student count range
      if (filters.minStudents !== '') {
        const min = Number(filters.minStudents);
        if (!isNaN(min) && item.student_count < min) return false;
      }
      if (filters.maxStudents !== '') {
        const max = Number(filters.maxStudents);
        if (!isNaN(max) && item.student_count > max) return false;
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        const itemTime = parseDateStrToTime(item.exam_date);
        if (filters.startDate) {
          const startTime = parseDateStrToTime(filters.startDate);
          if (itemTime < startTime) return false;
        }
        if (filters.endDate) {
          const endTime = parseDateStrToTime(filters.endDate) + 86400000; // inclusive of end day
          if (itemTime > endTime) return false;
        }
      }

      return true;
    });
  }, [schedules, filters]);

  // Export current filtered rows to Excel (.xlsx)
  const exportToExcel = () => {
    const exportData = filteredSchedules.map((s) => ({
      PKGNo: s.pkg_no,
      Logic1: s.logic1,
      CM_School_Name: s.cm_school_name,
      CM_Course_Name: s.cm_course_name,
      Semester: s.semester,
      Elective: s.elective || '',
      PaperCode: s.paper_code,
      SM_Subject_Name: s.sm_subject_name,
      'Student Count': s.student_count,
      Regular: s.regular_count,
      Backlog: s.backlog_count,
      'Exam Day': s.exam_day,
      'Exam Date': s.exam_date,
      Date_Odd_Even: s.date_odd_even,
      AM_PM: s.am_pm,
      'Exam Time': s.exam_time,
      'Exam Type': s.exam_type,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered_Exam_Schedules');
    XLSX.writeFile(wb, `Exam_Schedule_Filtered_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getTaskStatusSummary = (scheduleId: string) => {
    const schedTasks = tasks.filter((t) => t.schedule_id === scheduleId);
    if (schedTasks.length === 0) return { total: 0, completed: 0, escalated: 0 };
    const completed = schedTasks.filter((t) => t.status === 'COMPLETED').length;
    const escalated = schedTasks.filter((t) => t.status === 'ESCALATED_TO_ALTERNATE').length;
    return { total: schedTasks.length, completed, escalated };
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredSchedules.length && filteredSchedules.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSchedules.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0 || !onDeleteSchedules) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} schedule(s)?`)) {
      onDeleteSchedules(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-3">
      {/* Advanced Search & Filtering Component */}
      <AdvancedExamFilter
        filters={filters}
        onChange={setFilters}
        schools={schools}
        programs={programs}
        totalCount={schedules.length}
        filteredCount={filteredSchedules.length}
        examYears={examYears}
      />

      {/* Main Table Card */}
      <div className="glass rounded-2xl shadow-xs overflow-hidden">
        {/* Header & Action Bar */}
        <div className="p-5 border-b border-white/50 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isCoordinatorView ? 'My Assigned Examination Timetable' : 'Comprehensive Examination Master Schedule'}
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {filteredSchedules.length} {filteredSchedules.length === 1 ? 'Paper' : 'Papers'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matching official packaging layout (PKGNo, Course, PaperCode, Candidates, AM/PM, Time & Type).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCoordinatorView && onDeleteSchedules && selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 border border-rose-700 rounded-lg hover:bg-rose-700 shadow-xs transition-colors"
                title="Delete Selected Schedules"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}

            {!isCoordinatorView && onCommitSchedules && (
              <>
                <button
                  onClick={() => document.getElementById('exam-upload-input')?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 border border-indigo-700 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors"
                  title="Import Master Schedule from Excel (.xlsx)"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-white" />
                  <span>Import XLSX</span>
                </button>
                <input
                  type="file"
                  id="exam-upload-input"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={async (e) => {
                    try {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const arrayBuffer = await file.arrayBuffer();
                      const result = parseExamScheduleExcel(arrayBuffer);
                      
                      if (result.data.length > 0) {
                        alert(`Parsed ${result.data.length} schedules. Uploading to database...`);
                        await onCommitSchedules(result.data, true);
                        alert(`Successfully uploaded ${result.data.length} schedules.`);
                      } else {
                        alert(`Failed to import. Errors: ${result.errors.join(', ')}`);
                      }
                    } catch (err: any) {
                      alert(`Upload failed: ${err.message || 'Unknown error occurred during upload.'}`);
                      console.error('Upload Error:', err);
                    } finally {
                      e.target.value = ''; // reset
                    }
                  }}
                />
              </>
            )}
            
            <button
              onClick={exportToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
              title="Export filtered records to Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Filtered XLSX</span>
            </button>
          </div>
        </div>

        {/* Timetable Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 backdrop-blur-sm text-slate-500 border-b border-white/60 font-bold text-[11px] uppercase tracking-wider">
                {!isCoordinatorView && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      checked={selectedIds.size === filteredSchedules.length && filteredSchedules.length > 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 w-14 font-mono">PKG</th>
                <th className="py-2.5 px-3 min-w-[200px]">Course & School</th>
                <th className="py-2.5 px-3 w-16 text-center">Sem</th>
                <th className="py-2.5 px-3 min-w-[220px]">Paper Code & Subject Name</th>
                <th className="py-2.5 px-3 text-right font-mono">Candidates</th>
                <th className="py-2.5 px-3 min-w-[130px]">Exam Date & Day</th>
                <th className="py-2.5 px-3 min-w-[150px]">Session & Time</th>
                <th className="py-2.5 px-3 w-20">Year</th>
                <th className="py-2.5 px-3 w-24">Type</th>
                <th className="py-2.5 px-3 min-w-[120px]">Workflow Status</th>
                <th className="py-2.5 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={isCoordinatorView ? 10 : 11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">No exam schedules matched your filter criteria</p>
                      <p className="text-xs text-slate-400">
                        Try clearing or broadening your search keywords, student count ranges, or date windows.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((schedule) => {
                  const taskSummary = getTaskStatusSummary(schedule.id);
                  const isOdd = schedule.date_odd_even.toLowerCase().includes('odd');

                  return (
                    <tr
                      key={schedule.id}
                      className={`hover:bg-white/60 transition-colors group ${selectedIds.has(schedule.id) ? 'bg-indigo-50/30' : ''}`}
                    >
                      {/* Selection */}
                      {!isCoordinatorView && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            checked={selectedIds.has(schedule.id)}
                            onChange={() => handleToggleSelect(schedule.id)}
                          />
                        </td>
                      )}

                      {/* PKG No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                        #{schedule.pkg_no}
                      </td>

                      {/* Course & School */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {schedule.cm_course_name}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {schedule.cm_school_name}
                        </div>
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-700">
                        Sem {schedule.semester}
                      </td>

                      {/* Paper Code & Subject Name */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {schedule.paper_code}
                          </span>
                          {schedule.elective && (
                            <span className="text-[10px] text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">
                              {schedule.elective}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 mt-1">
                          {schedule.sm_subject_name}
                        </div>
                      </td>

                      {/* Student count (Tabular nums) */}
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-900 text-sm">
                          {schedule.student_count}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {schedule.regular_count > 0 && <span className="text-emerald-700">{schedule.regular_count} Reg</span>}
                          {schedule.regular_count > 0 && schedule.backlog_count > 0 && <span> · </span>}
                          {schedule.backlog_count > 0 && <span className="text-amber-700">{schedule.backlog_count} Backlog</span>}
                        </div>
                      </td>

                      {/* Exam Date & Day */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{schedule.exam_date}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>Day {schedule.exam_day}</span>
                          <span>·</span>
                          <span className={isOdd ? 'text-blue-600 font-medium' : 'text-emerald-600 font-medium'}>
                            {schedule.date_odd_even}
                          </span>
                        </div>
                      </td>

                      {/* Session & Exam Time */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            schedule.am_pm === 'AM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {schedule.am_pm}
                          </span>
                          <span className="font-mono text-slate-700 text-[11px]">
                            {schedule.exam_time}
                          </span>
                        </div>
                      </td>

                      {/* Exam Year */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        {schedule.exam_year || '-'}
                      </td>

                      {/* Exam Type */}
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border inline-block ${
                          schedule.exam_type === 'Regular'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : schedule.exam_type === 'Backlog'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {schedule.exam_type}
                        </span>
                      </td>

                      {/* Workflow status */}
                      <td className="py-3 px-3">
                        {taskSummary.total === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">
                            No tasks logged
                          </span>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              {taskSummary.completed === taskSummary.total ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : taskSummary.escalated > 0 ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                              )}
                              <span className="font-mono font-medium text-slate-700 text-[11px]">
                                {taskSummary.completed}/{taskSummary.total} done
                              </span>
                            </div>
                            {taskSummary.escalated > 0 && (
                              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                                {taskSummary.escalated} Escalated!
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectScheduleForTasks(schedule)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded text-xs font-medium transition-colors flex items-center gap-1"
                            title="View and manage to-do tasks for this exam"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Tasks</span>
                          </button>
                          {taskSummary.total === 0 && (
                            <button
                              onClick={() => onGenerateTasks(schedule)}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                              title="Auto-generate standard task suite"
                            >
                              <ListPlus className="w-3 h-3" />
                            </button>
                          )}
                          {!isCoordinatorView && onDeleteSchedule && (
                            <button
                              onClick={() => {
                                if(confirm('Are you sure you want to delete this schedule?')) {
                                  onDeleteSchedule(schedule.id);
                                }
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete schedule"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
