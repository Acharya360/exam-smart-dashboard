import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { ExamSchedule, ExamTask, Program, TaskStatus, UserProfile } from '../../types';
import { AdvancedTaskFilter, TaskFilterState } from '../common/AdvancedTaskFilter';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Calendar, 
  User, 
  MessageSquare, 
  LayoutGrid,
  List,
  ShieldAlert,
  Filter
} from 'lucide-react';

interface TasksViewProps {
  tasks: ExamTask[];
  schedules: ExamSchedule[];
  programs: Program[];
  users: UserProfile[];
  onUpdateStatus: (taskId: string, status: TaskStatus, notes?: string) => void;
  onEscalateTask: (taskId: string, reason: string) => void;
  onAddTask: (task: ExamTask) => void;
  focusedScheduleId?: string | null;
  onClearScheduleFocus?: () => void;
}

function parseDueDate(dateStr: string): number {
  if (!dateStr) return 0;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00`).getTime();
    }
  }
  return new Date(dateStr).getTime();
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  schedules,
  programs,
  users,
  onUpdateStatus,
  onEscalateTask,
  onAddTask,
  focusedScheduleId,
  onClearScheduleFocus,
}) => {
  const { currentUser, isSuperAdmin, getUserPrograms } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Advanced filter state
  const [filters, setFilters] = useState<TaskFilterState>({
    search: '',
    status: 'ALL',
    assigneeId: 'ALL',
    program: 'ALL',
    dueDatePreset: 'ALL',
    startDate: '',
    endDate: '',
  });

  // Escalation modal state
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [taskToEscalate, setTaskToEscalate] = useState<ExamTask | null>(null);
  const [escalationReason, setEscationReason] = useState(
    'Primary coordinator inactive. Escalating to alternate coordinator for urgent operational compliance.'
  );

  // Note editing modal state
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedTaskForNotes, setSelectedTaskForNotes] = useState<ExamTask | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // New task modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newScheduleId, setNewScheduleId] = useState(schedules[0]?.id || '');
  const [newDueDate, setNewDueDate] = useState('2026-05-14');
  const [newNotes, setNewNotes] = useState('');

  const userProgs = getUserPrograms();
  const userProgCodes = new Set(userProgs.all.map((p) => p.program_code));

  // Current reference timestamp (Exam period: May 2026)
  const nowTime = new Date('2026-05-13T09:00:00').getTime();

  // Filter tasks based on role and advanced criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // RBAC check: Super Admins can see all; Coordinators only see tasks for their mapped programs or assigned/alternate to them
      if (!isSuperAdmin) {
        const isAssigned = task.assigned_to === currentUser.id;
        const isAlternate = task.alternate_user_id === currentUser.id;
        const isProgMapped = userProgCodes.has(task.program_code);
        if (!isAssigned && !isAlternate && !isProgMapped) return false;
      }

      if (focusedScheduleId && task.schedule_id !== focusedScheduleId) return false;

      // Multi-field search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const assignedUser = users.find((u) => u.id === task.assigned_to);
        const altUser = users.find((u) => u.id === task.alternate_user_id);
        const sched = schedules.find((s) => s.id === task.schedule_id);

        const match =
          task.task_title.toLowerCase().includes(q) ||
          task.program_code.toLowerCase().includes(q) ||
          (task.notes && task.notes.toLowerCase().includes(q)) ||
          (assignedUser && assignedUser.full_name.toLowerCase().includes(q)) ||
          (altUser && altUser.full_name.toLowerCase().includes(q)) ||
          (sched && (sched.paper_code.toLowerCase().includes(q) || sched.sm_subject_name.toLowerCase().includes(q)));

        if (!match) return false;
      }

      // Status filter
      if (filters.status !== 'ALL' && task.status !== filters.status) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeId === 'ME_PRIMARY' && task.assigned_to !== currentUser.id) {
        return false;
      }
      if (filters.assigneeId === 'ME_ALTERNATE' && task.alternate_user_id !== currentUser.id) {
        return false;
      }
      if (
        filters.assigneeId !== 'ALL' &&
        filters.assigneeId !== 'ME_PRIMARY' &&
        filters.assigneeId !== 'ME_ALTERNATE' &&
        task.assigned_to !== filters.assigneeId &&
        task.alternate_user_id !== filters.assigneeId
      ) {
        return false;
      }

      // Program filter
      if (filters.program !== 'ALL' && task.program_code !== filters.program) {
        return false;
      }

      // Due date filters
      const taskTime = parseDueDate(task.due_date);
      if (filters.dueDatePreset === 'OVERDUE') {
        if (taskTime >= nowTime || task.status === 'COMPLETED') return false;
      } else if (filters.dueDatePreset === 'NEXT_48H') {
        const within48 = taskTime >= nowTime && taskTime <= nowTime + 48 * 3600 * 1000;
        if (!within48) return false;
      } else if (filters.dueDatePreset === 'THIS_WEEK') {
        const weekStart = new Date('2026-05-10T00:00:00').getTime();
        const weekEnd = new Date('2026-05-17T23:59:59').getTime();
        if (taskTime < weekStart || taskTime > weekEnd) return false;
      } else if (filters.dueDatePreset === 'CUSTOM') {
        if (filters.startDate) {
          const start = new Date(filters.startDate).getTime();
          if (taskTime < start) return false;
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate).getTime() + 86400000;
          if (taskTime > end) return false;
        }
      }

      return true;
    });
  }, [tasks, filters, isSuperAdmin, currentUser.id, userProgCodes, focusedScheduleId, users, schedules]);

  const columns: { id: TaskStatus; label: string; color: string; border: string; bg: string }[] = [
    {
      id: 'PENDING',
      label: 'Pending',
      color: 'text-slate-700',
      border: 'border-slate-300',
      bg: 'bg-slate-50',
    },
    {
      id: 'IN_PROGRESS',
      label: 'In Progress',
      color: 'text-blue-700',
      border: 'border-blue-300',
      bg: 'bg-blue-50/40',
    },
    {
      id: 'COMPLETED',
      label: 'Completed',
      color: 'text-emerald-700',
      border: 'border-emerald-300',
      bg: 'bg-emerald-50/40',
    },
    {
      id: 'ESCALATED_TO_ALTERNATE',
      label: 'Escalated to Alternate',
      color: 'text-amber-800',
      border: 'border-amber-300',
      bg: 'bg-amber-50/50',
    },
  ];

  const handleStatusClick = (task: ExamTask, newStatus: TaskStatus) => {
    if (newStatus === 'COMPLETED') {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch {}
    }
    onUpdateStatus(task.id, newStatus);
  };

  const handleOpenEscalate = (task: ExamTask) => {
    setTaskToEscalate(task);
    setEscalateModalOpen(true);
  };

  const handleConfirmEscalate = () => {
    if (taskToEscalate) {
      onEscalateTask(taskToEscalate.id, escalationReason);
      setEscalateModalOpen(false);
      setTaskToEscalate(null);
    }
  };

  const handleOpenNotes = (task: ExamTask) => {
    setSelectedTaskForNotes(task);
    setNoteContent(task.notes || '');
    setNotesModalOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedTaskForNotes) {
      onUpdateStatus(selectedTaskForNotes.id, selectedTaskForNotes.status, noteContent);
      setNotesModalOpen(false);
      setSelectedTaskForNotes(null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const sched = schedules.find((s) => s.id === newScheduleId) || schedules[0];
    const prog = programs.find((p) => p.program_code === sched?.program_code) || programs[0];

    const newTask: ExamTask = {
      id: `task-manual-${Date.now()}`,
      schedule_id: sched ? sched.id : 'sched-custom',
      program_code: prog ? prog.program_code : 'GEN',
      task_title: newTitle || 'Examination Compliance Task',
      status: 'PENDING',
      assigned_to: prog ? prog.primary_coordinator_id : currentUser.id,
      alternate_user_id: prog ? prog.alternate_coordinator_id : currentUser.id,
      notes: newNotes,
      due_date: newDueDate,
      updated_at: new Date().toISOString(),
    };

    onAddTask(newTask);
    setCreateModalOpen(false);
    setNewTitle('');
    setNewNotes('');
  };

  // Check if current user is an alternate coordinator on an escalated task
  const myAlternateEscalations = tasks.filter(
    (t) => t.status === 'ESCALATED_TO_ALTERNATE' && t.alternate_user_id === currentUser.id
  );

  return (
    <div className="space-y-4">
      {/* Alert banner if alternate coordinator has active escalations */}
      {myAlternateEscalations.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              URGENT ESCALATION ALERT: {myAlternateEscalations.length} Action Items Re-assigned to You
            </h3>
            <p className="text-xs text-amber-800 mt-1">
              You are designated as the Alternate Coordinator. The primary coordinator was flagged as inactive or unavailable. Please review and complete these tasks before the scheduled exam date.
            </p>
          </div>
        </div>
      )}

      {/* Focus banner if opened from an exam row */}
      {focusedScheduleId && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-900">
              Filtered to Examination Schedule ID: {focusedScheduleId}
            </span>
          </div>
          {onClearScheduleFocus && (
            <button
              onClick={onClearScheduleFocus}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
            >
              Clear filter (Show all tasks)
            </button>
          )}
        </div>
      )}

      {/* Advanced Task Filter Component */}
      <AdvancedTaskFilter
        filters={filters}
        onChange={setFilters}
        programs={programs}
        users={users}
        currentUserId={currentUser.id}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* View Switcher & Create Task Button Bar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-900">
            {isSuperAdmin ? 'All Institution Tasks' : 'My Program Tasks'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {filteredTasks.length} Milestones
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                className={`border rounded-xl p-3 shadow-xs min-h-[480px] flex flex-col ${col.bg} ${col.border}`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600 bg-white/80 px-1.5 py-0.2 rounded border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task cards list */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[700px] pr-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const assignedUser = users.find((u) => u.id === task.assigned_to);
                      const altUser = users.find((u) => u.id === task.alternate_user_id);
                      const isEscalated = task.status === 'ESCALATED_TO_ALTERNATE';

                      return (
                        <div
                          key={task.id}
                          className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs hover:border-indigo-300 transition-all text-xs"
                        >
                          {/* Program & Paper header */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              {task.program_code}
                            </span>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {task.due_date}
                            </span>
                          </div>

                          {/* Task title */}
                          <h4 className="font-semibold text-slate-900 text-xs leading-snug">
                            {task.task_title}
                          </h4>

                          {/* Notes snippet */}
                          {task.notes && (
                            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                              "{task.notes}"
                            </p>
                          )}

                          {/* Escalation alert box */}
                          {isEscalated && (
                            <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                              <div className="flex items-center gap-1 font-semibold">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Escalated to: {altUser?.full_name || 'Alternate'}</span>
                              </div>
                              {task.escalation_reason && (
                                <p className="mt-0.5 text-[10px] text-amber-700">
                                  {task.escalation_reason}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Coordinator assignments */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <div className="flex items-center gap-1 truncate" title={`Assigned to: ${assignedUser?.full_name}`}>
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{assignedUser?.full_name?.split(' ')[0] || 'Unassigned'}</span>
                            </div>

                            <button
                              onClick={() => handleOpenNotes(task)}
                              className="text-slate-400 hover:text-slate-700 flex items-center gap-0.5 text-[11px]"
                              title="Edit task notes"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Notes</span>
                            </button>
                          </div>

                          {/* Action controls */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            {/* Status transitions */}
                            <div className="flex items-center gap-1">
                              {task.status !== 'COMPLETED' ? (
                                <button
                                  onClick={() => handleStatusClick(task, 'COMPLETED')}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                                  title="Mark Completed"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Complete</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusClick(task, 'IN_PROGRESS')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-medium"
                                >
                                  Re-open
                                </button>
                              )}

                              {task.status === 'PENDING' && (
                                <button
                                  onClick={() => handleStatusClick(task, 'IN_PROGRESS')}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-medium transition-colors"
                                >
                                  Start
                                </button>
                              )}
                            </div>

                            {/* Escalate to Alternate Trigger */}
                            {task.status !== 'COMPLETED' && task.status !== 'ESCALATED_TO_ALTERNATE' && (
                              <button
                                onClick={() => handleOpenEscalate(task)}
                                className="px-2 py-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded text-[10px] font-medium transition-colors flex items-center gap-0.5"
                                title="Escalate to Alternate Coordinator"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Escalate</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task Milestone</th>
                  <th className="py-3 px-3">Program</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Primary Assigned</th>
                  <th className="py-3 px-3">Alternate Member</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No tasks found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const assignedUser = users.find((u) => u.id === task.assigned_to);
                    const altUser = users.find((u) => u.id === task.alternate_user_id);

                    return (
                      <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{task.task_title}</div>
                          {task.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {task.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">
                          {task.program_code}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : task.status === 'ESCALATED_TO_ALTERNATE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {task.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {assignedUser?.full_name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {altUser?.full_name || 'None'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {task.due_date}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status !== 'COMPLETED' ? (
                              <button
                                onClick={() => handleStatusClick(task, 'COMPLETED')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium transition-colors"
                              >
                                Mark Done
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusClick(task, 'IN_PROGRESS')}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium"
                              >
                                Re-open
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenNotes(task)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                              title="Edit notes"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* Escalation Modal */}
      {escalateModalOpen && taskToEscalate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-700 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Trigger Alternate Member Follow-Up
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              This operational milestone will be marked as <strong className="text-amber-900">ESCALATED TO ALTERNATE</strong>. The alternate coordinator will receive an urgent banner alert upon login.
            </p>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-3">
              <span className="font-semibold text-slate-800">Task:</span> {taskToEscalate.task_title}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Escalation Justification / Notes:
              </label>
              <textarea
                rows={3}
                value={escalationReason}
                onChange={(e) => setEscationReason(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="State why primary coordinator was unable to fulfill task..."
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscalate}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {notesModalOpen && selectedTaskForNotes && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Operational Notes & Progress Log
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              {selectedTaskForNotes.task_title}
            </p>

            <textarea
              rows={4}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-4"
              placeholder="Record secretarial notes, room numbers, printing timestamps..."
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setNotesModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Log Custom Examination Task
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Create an operational task mapped to an examination schedule.
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Task Milestone Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Invigilator briefing, Special stationery verification"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Related Examination Schedule
                </label>
                <select
                  value={newScheduleId}
                  onChange={(e) => setNewScheduleId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      PKG #{s.pkg_no}: {s.paper_code} - {s.sm_subject_name} ({s.exam_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Compliance Date
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Notes
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Room requirements, staff details..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
