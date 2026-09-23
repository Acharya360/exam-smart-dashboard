import React from 'react';
import { ExamSchedule, ExamTask } from '../../types';
import { 
  CalendarDays, 
  Users, 
  CheckCircle2, 
  SunMedium, 
  Moon, 
  AlertCircle 
} from 'lucide-react';

interface MetricsGridProps {
  schedules: ExamSchedule[];
  tasks: ExamTask[];
  isCoordinatorView: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  schedules,
  tasks,
  isCoordinatorView,
}) => {
  const totalExams = schedules.length;
  const totalStudents = schedules.reduce((acc, s) => acc + (s.student_count || 0), 0);
  const totalRegular = schedules.reduce((acc, s) => acc + (s.regular_count || 0), 0);
  const totalBacklog = schedules.reduce((acc, s) => acc + (s.backlog_count || 0), 0);

  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const amCount = schedules.filter((s) => s.am_pm === 'AM').length;
  const pmCount = schedules.filter((s) => s.am_pm === 'PM').length;

  const escalatedCount = tasks.filter((t) => t.status === 'ESCALATED_TO_ALTERNATE').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Metric 1: Total Exams */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isCoordinatorView ? 'My Program Exams' : 'Total Exam Sessions'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalExams}
          </span>
          <span className="text-xs text-slate-500">
            {totalExams === 1 ? 'Paper scheduled' : 'Papers scheduled'}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Across regular and backlog sessions
        </div>
      </div>

      {/* Metric 2: Total Students & Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Candidates
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalStudents}
          </span>
          <span className="text-xs text-slate-500">Students</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
          <span className="text-emerald-700 font-medium">{totalRegular} Reg</span>
          <span className="text-slate-300">/</span>
          <span className="text-amber-700 font-medium">{totalBacklog} Backlog</span>
        </div>
      </div>

      {/* Metric 3: Task Workflow Completion */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Task Readiness
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {completionPct}%
          </span>
          <span className="text-xs text-slate-500">Completed</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
          {completedTasks} of {totalTasks} milestones verified
        </div>
      </div>

      {/* Metric 4: Session Slot Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Session Slots
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <SunMedium className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {amCount} <span className="text-xs text-slate-400 font-sans font-normal">AM</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {pmCount} <span className="text-xs text-slate-400 font-sans font-normal">PM</span>
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>Morning & Afternoon halls</span>
        </div>
      </div>

      {/* Metric 5: Escalations & Alternate Triggers */}
      <div className={`border rounded-xl p-4 shadow-xs ${
        escalatedCount > 0 ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Alternate Alerts
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            escalatedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
            escalatedCount > 0 ? 'text-amber-900' : 'text-slate-900'
          }`}>
            {escalatedCount}
          </span>
          <span className="text-xs text-slate-500">Escalated</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {escalatedCount > 0 ? 'Transferred to alternate coordinator' : 'Normal duty operation'}
        </div>
      </div>
    </div>
  );
};
