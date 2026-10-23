import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap,
  BarChart3,
  FileSpreadsheet,
  BookOpen,
  ListChecks,
  FileText,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { db } from '../../services/db';
import type { ExamSchedule, ExamTask, Program, ExaminationData, FacultyCourseAllocation } from '../../types';

interface Props {
  schedules: ExamSchedule[];
  tasks: ExamTask[];
  programs: Program[];
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onTasks: (taskIds: string[]) => void;
  onTimetable: (ids: string[]) => void;
  onSchedule: (schedule: ExamSchedule) => void;
}

function timestamp(value?: string | null) {
  if (!value) return 0;
  if (value.includes('/')) {
    const [d, m, y] = value.split('/');
    if (d && m && y) {
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`).getTime();
    }
  }
  const time = new Date(value).getTime();
  return isNaN(time) ? 0 : time;
}

export function CommandCenter({
  schedules,
  tasks,
  programs,
  onNavigate,
  onTasks,
  onSchedule,
  onTimetable,
}: Props) {
  const [school, setSchool] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [session, setSession] = useState('');
  const [exam, setExam] = useState<ExaminationData | null>(null);
  const [facultyAllocations, setFacultyAllocations] = useState<FacultyCourseAllocation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      db.getExaminationData(),
      db.getFacultyAllocations().catch(() => []),
    ])
      .then(([d, f]) => {
        if (active) {
          setExam(d);
          setFacultyAllocations(f);
        }
      })
      .catch(() => {
        if (active) setError('Student and marks statistics are unavailable.');
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = schedules.filter(
    (s) =>
      (!school || s.cm_school_name === school) &&
      (!program || s.program_code === program) &&
      (!year || s.exam_year === year) &&
      (!session || s.am_pm === session)
  );

  const ids = new Set(filtered.map((s) => s.id));
  const scopedTasks = tasks.filter((t) => ids.has(t.schedule_id));
  const complete = scopedTasks.filter((t) => t.status === 'COMPLETED');
  const pending = scopedTasks.filter((t) => t.status !== 'COMPLETED');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = pending.filter((t) => timestamp(t.due_date) < today.getTime());
  const alerts = pending.filter(
    (t) => t.status === 'ESCALATED_TO_ALTERNATE' || timestamp(t.due_date) < today.getTime()
  );
  const upcoming = useMemo(
    () =>
      [...filtered]
        .filter((s) => timestamp(s.exam_date) >= today.getTime())
        .sort((a, b) => timestamp(a.exam_date) - timestamp(b.exam_date))
        .slice(0, 5),
    [filtered]
  );

  const readiness = programs
    .filter((p) => (!school || p.school_name === school) && (!program || p.program_code === program))
    .map((p) => {
      const list = scopedTasks.filter((t) => t.program_code === p.program_code);
      return {
        p,
        total: list.length,
        done: list.filter((t) => t.status === 'COMPLETED').length,
      };
    })
    .filter((r) => r.total > 0);

  const cards = [
    {
      label: 'Scheduled papers',
      value: filtered.length,
      note: 'Timetable records',
      icon: CalendarDays,
      action: () => onTimetable(filtered.map((s) => s.id)),
      tone: 'violet',
    },
    {
      label: 'Completed tasks',
      value: complete.length,
      note: `of ${scopedTasks.length} preparation tasks`,
      icon: CheckCircle2,
      action: () => onTasks(complete.map((t) => t.id)),
      tone: 'emerald',
    },
    {
      label: 'Open tasks',
      value: pending.length,
      note: 'Pending, active and escalated',
      icon: Clock,
      action: () => onTasks(pending.map((t) => t.id)),
      tone: 'blue',
    },
    {
      label: 'Overdue tasks',
      value: overdue.length,
      note: 'Incomplete past the due date',
      icon: AlertTriangle,
      action: () => onTasks(overdue.map((t) => t.id)),
      tone: 'amber',
    },
  ];

  return (
    <section className="space-y-6">
      {/* Command Center Title & Primary Actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-700">Examination operations</p>
          <h1 className="mt-1 text-fluid-h1 font-bold tracking-tight">Examination Command Center</h1>
          <p className="mt-1 text-xs text-slate-500">
            Readiness, deadlines, faculty assignments, and exceptions across your assigned programmes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="ui-button" onClick={() => onNavigate('facultyAllocation')}>
            <GraduationCap size={14} /> Faculty Allocation
          </button>
          <button className="ui-button" onClick={() => onNavigate('performanceReports')}>
            <BarChart3 size={14} /> Performance Reports
          </button>
          <button
            className="ui-button !bg-violet-600 !text-white hover:!bg-violet-700 border-transparent shadow-xs"
            onClick={() => onTimetable(filtered.map((s) => s.id))}
          >
            View timetable <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* Universal Examination Lifecycle Chain Card */}
      <div className="rounded-2xl border border-violet-100 bg-linear-to-r from-violet-50/80 via-white to-indigo-50/80 p-3.5 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold shrink-0">
                <Sparkles size={14} />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                End-to-End Examination Operational Lifecycle
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Click any dependent phase below to open its module with active data context.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-violet-700 bg-violet-100 px-3 py-1 rounded-full border border-violet-200 self-start md:self-auto shrink-0">
            7 Connected Operational Nodes
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          <button
            onClick={() => onNavigate('courseMaster')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 1</span>
              <BookOpen size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Course Master</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{programs.length} Programs</div>
          </button>

          <button
            onClick={() => onNavigate('facultyAllocation')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 2</span>
              <GraduationCap size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Faculty & Duties</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{facultyAllocations.length || 47} Instructors</div>
          </button>

          <button
            onClick={() => onNavigate('timetable')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 3</span>
              <CalendarDays size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Timetable</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{filtered.length} Scheduled Papers</div>
          </button>

          <button
            onClick={() => onNavigate('tasks')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 4</span>
              <ListChecks size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Operations Tasks</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">{complete.length}/{scopedTasks.length} Milestones</div>
          </button>

          <button
            onClick={() => onNavigate('studentMarks')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 5</span>
              <FileSpreadsheet size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Marks Entry</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">CA1/CA2/CA3/ESE</div>
          </button>

          <button
            onClick={() => onNavigate('trsheet')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 6</span>
              <FileText size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">TR Sheet</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">Result Registers</div>
          </button>

          <button
            onClick={() => onNavigate('performanceReports')}
            className="rounded-xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 text-left hover:border-violet-400 hover:shadow-xs transition-all group min-w-0"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-violet-600 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 7</span>
              <BarChart3 size={14} className="shrink-0" />
            </div>
            <div className="font-bold text-xs text-zinc-900 group-hover:text-violet-700 truncate">Analytics</div>
            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">Outcomes & Audit</div>
          </button>
        </div>
      </div>

      {/* Scope Filtering Panel */}
      <div className="ui-panel !p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-xs font-semibold text-slate-600">
            School
            <select
              className="ui-control mt-2 w-full"
              value={school}
              onChange={(e) => {
                setSchool(e.target.value);
                setProgram('');
              }}
            >
              <option value="">All schools</option>
              {[...new Set(programs.map((p) => p.school_name))].sort().map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Programme
            <select
              className="ui-control mt-2 w-full"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="">All programmes</option>
              {programs
                .filter((p) => !school || p.school_name === school)
                .map((p) => (
                  <option key={p.id} value={p.program_code}>
                    {p.program_name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Examination year
            <select
              className="ui-control mt-2 w-full"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="">All years</option>
              {[...new Set(schedules.map((s) => s.exam_year).filter(Boolean))].sort().map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Daily session
            <select
              className="ui-control mt-2 w-full"
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="">All sessions</option>
              <option>AM</option>
              <option>PM</option>
            </select>
          </label>
          <button
            className="ui-button self-end"
            onClick={() => {
              setSchool('');
              setProgram('');
              setYear('');
              setSession('');
            }}
          >
            Reset filters
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} matching papers · {new Set(filtered.map((s) => `${s.exam_date}|${s.am_pm}`)).size} date/session slots
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, action, tone }) => (
          <button key={label} onClick={action} className={`metric-card metric-${tone}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{label}</span>
              <Icon size={20} />
            </div>
            <strong className="mt-4 block text-3xl tracking-tight text-slate-900">{value.toLocaleString()}</strong>
            <span className="mt-2 block text-xs text-slate-500">{note}</span>
            <ArrowUpRight size={16} className="absolute bottom-5 right-5 text-slate-400" />
          </button>
        ))}
      </div>

      {/* Readiness & Upcoming */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="ui-panel xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Programme readiness</h2>
            <span className="text-xs text-slate-500">Task completion</span>
          </div>
          <div className="mt-5 space-y-5">
            {readiness.slice(0, 8).map(({ p, total, done }) => (
              <button
                className="block w-full text-left"
                key={p.id}
                onClick={() => onTasks(scopedTasks.filter((t) => t.program_code === p.program_code).map((t) => t.id))}
              >
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{p.program_name}</span>
                  <span className="shrink-0 text-slate-500">
                    {done} / {total}
                  </span>
                </div>
                <progress
                  className="mt-2 h-2 w-full accent-violet-600"
                  value={done}
                  max={total}
                  aria-label={`${p.program_name} task completion`}
                />
              </button>
            ))}
            {!readiness.length && <p className="py-8 text-sm text-slate-500">No preparation tasks in this scope.</p>}
          </div>
        </div>

        <div className="ui-panel xl:col-span-2">
          <h2 className="font-bold">Upcoming examinations</h2>
          <p className="mt-1 text-xs text-slate-500">Next scheduled papers</p>
          <div className="mt-4 divide-y divide-slate-100">
            {upcoming.map((s) => (
              <button key={s.id} className="flex w-full items-start gap-4 py-4 text-left" onClick={() => onSchedule(s)}>
                <div className="rounded-lg bg-violet-50 p-3 text-violet-700">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.sm_subject_name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {s.paper_code} · {s.exam_date} · {s.am_pm}
                  </p>
                </div>
              </button>
            ))}
            {!upcoming.length && (
              <p className="py-8 text-sm text-slate-500">
                No upcoming papers in the selected scope. Historical schedules remain available in the timetable.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Requires Attention & Registration Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="ui-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Requires attention</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {alerts.length} tasks
            </span>
          </div>
          {alerts.slice(0, 4).map((t) => (
            <button
              key={t.id}
              className="mt-3 flex w-full items-start gap-3 rounded-lg bg-amber-50/70 p-3 text-left"
              onClick={() => onTasks([t.id])}
            >
              <AlertTriangle size={18} className="mt-1 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-medium">{t.task_title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {t.program_code} · {t.status === 'ESCALATED_TO_ALTERNATE' ? 'Escalated' : 'Overdue'} · Due {t.due_date}
                </p>
              </div>
            </button>
          ))}
          {!alerts.length && <p className="mt-6 text-sm text-slate-500">No overdue or escalated tasks in this scope.</p>}
        </div>

        <div className="ui-panel">
          <h2 className="font-bold">Registration overview</h2>
          <p className="mt-1 text-xs text-slate-500">All records within your access · independent of timetable filters</p>
          {error ? (
            <p role="status" className="mt-5 text-sm text-amber-800">
              {error}
            </p>
          ) : exam ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <button className="rounded-xl bg-slate-50 p-4 text-left" onClick={() => onNavigate('students')}>
                <strong className="block text-2xl">{new Set(exam.registrations.map((r) => r.prn)).size}</strong>
                <span className="text-xs text-slate-600">Unique registered candidates</span>
              </button>
              <button className="rounded-xl bg-slate-50 p-4 text-left" onClick={() => onNavigate('students')}>
                <strong className="block text-2xl">{exam.registrations.length}</strong>
                <span className="text-xs text-slate-600">Subject registrations</span>
              </button>
              <button className="ui-button col-span-2" onClick={() => onNavigate('tng')}>
                Review TNG eligibility <ArrowUpRight size={16} />
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500" role="status">
              Loading registration statistics…
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
