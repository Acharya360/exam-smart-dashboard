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
      <div className="glass rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all duration-500"></div>
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isCoordinatorView ? 'My Program Exams' : 'Total Exam Sessions'}
          </span>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalExams}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {totalExams === 1 ? 'Paper' : 'Papers'}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-medium relative z-10">
          Across regular and backlog sessions
        </div>
      </div>

      {/* Metric 2: Total Students & Breakdown */}
      <div className="glass rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all duration-500"></div>
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Candidates
          </span>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {totalStudents}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Students</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-mono tabular-nums bg-white/50 py-1 px-2 rounded-md inline-flex relative z-10">
          <span className="text-emerald-700 font-bold">{totalRegular} Reg</span>
          <span className="text-slate-300">/</span>
          <span className="text-amber-700 font-bold">{totalBacklog} Back</span>
        </div>
      </div>

      {/* Metric 3: Task Workflow Completion */}
      <div className="glass rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all duration-500"></div>
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Task Readiness
          </span>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {completionPct}%
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Completed</span>
        </div>
        <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums relative z-10">
          {completedTasks} of {totalTasks} milestones
        </div>
        
        {/* Mini Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden relative z-10">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${completionPct}%` }}></div>
        </div>
      </div>

      {/* Metric 4: Session Slot Distribution */}
      <div className="glass rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-all duration-500"></div>
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Session Slots
          </span>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
            <SunMedium className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {amCount} <span className="text-xs text-slate-400 font-sans font-normal">AM</span>
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
            {pmCount} <span className="text-xs text-slate-400 font-sans font-normal">PM</span>
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500 relative z-10">
          <span>Morning & Afternoon halls</span>
        </div>
      </div>

      {/* Metric 5: Escalations & Alternate Triggers */}
      <div className={`rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group ${
        escalatedCount > 0 ? 'bg-gradient-to-b from-rose-50/50 to-rose-100/30 border border-rose-200/50' : 'glass'
      }`}>
        {escalatedCount > 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-rose-500/30 transition-all duration-500 animate-pulse"></div>}
        <div className="flex items-center justify-between relative z-10">
          <span className={`text-xs font-bold uppercase tracking-wider ${escalatedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            Alerts
          </span>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
            escalatedCount > 0 ? 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2 relative z-10">
          <span className={`text-3xl font-extrabold tracking-tight font-mono tabular-nums ${
            escalatedCount > 0 ? 'text-rose-700' : 'text-slate-900'
          }`}>
            {escalatedCount}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Escalated</span>
        </div>
        <div className="mt-1 text-xs font-medium text-slate-500 relative z-10">
          {escalatedCount > 0 ? 'Action required by alternate' : 'Normal duty operations'}
        </div>
      </div>
    </div>
  );
};
