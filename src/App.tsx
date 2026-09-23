/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './services/db';
import { ExamSchedule, ExamTask, Program, TaskStatus, UserProfile } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MetricsGrid } from './components/dashboard/MetricsGrid';
import { ExamTable } from './components/dashboard/ExamTable';
import { TasksView } from './components/tasks/TasksView';
import { ExcelUploader } from './components/upload/ExcelUploader';
import { ProgramsManager } from './components/admin/ProgramsManager';
import { SqlSchemaViewer } from './components/schema/SqlSchemaViewer';
import { LoginScreen } from './components/auth/LoginScreen';
import { PasswordManagementModal } from './components/admin/PasswordManagementModal';
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
import { 
  Building2, 
  CalendarDays, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle,
  Layers,
  ArrowRight,
  Shield,
  KeyRound,
  User,
  Settings
} from 'lucide-react';

function MainApp() {
  const { currentUser, isSuperAdmin, isCoordinator, getUserPrograms, isLoggedIn } = useAuth();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password' | 'duties'>('profile');

  // Jump from exam table to its tasks
  const [focusedScheduleId, setFocusedScheduleId] = useState<string | null>(null);

  // Sync state from local database
  const refreshData = () => {
    setSchedules(db.getSchedules());
    setTasks(db.getTasks());
    setPrograms(db.getPrograms());
    setUsers(db.getUsers());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // If not logged in, gate access with the dedicated Login Screen
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  // Filtered schedules for the active user based on RBAC:
  // Super Admins: all schedules
  // Coordinators: only schedules matching their assigned/alternate program codes
  const userProgs = getUserPrograms();
  const userProgCodes = new Set(userProgs.all.map((p) => p.program_code));

  const accessibleSchedules = isSuperAdmin
    ? schedules
    : schedules.filter((s) => userProgCodes.has(s.program_code));

  const accessibleTasks = isSuperAdmin
    ? tasks
    : tasks.filter(
        (t) =>
          t.assigned_to === currentUser.id ||
          t.alternate_user_id === currentUser.id ||
          userProgCodes.has(t.program_code)
      );

  const pendingTasksCount = accessibleTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
  ).length;

  const escalatedTasksCount = tasks.filter(
    (t) =>
      t.status === 'ESCALATED_TO_ALTERNATE' &&
      (isSuperAdmin || t.alternate_user_id === currentUser.id)
  ).length;

  // Handlers
  const handleOpenProfileModal = (tab: 'profile' | 'password' | 'duties' = 'profile') => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
  };

  const handleUpdateTaskStatus = (taskId: string, status: TaskStatus, notes?: string) => {
    const updated = db.updateTaskStatus(taskId, status, notes);
    setTasks([...updated]);
  };

  const handleEscalateTask = (taskId: string, reason: string) => {
    const updated = db.escalateTask(taskId, reason);
    setTasks([...updated]);
  };

  const handleAddTask = (task: ExamTask) => {
    const updated = db.addTask(task);
    setTasks([...updated]);
  };

  const handleGenerateDefaultTasks = (schedule: ExamSchedule) => {
    const newTasks = db.generateDefaultTasksForSchedule(schedule);
    const existing = db.getTasks();
    const merged = [...newTasks, ...existing];
    db.saveTasks(merged);
    setTasks(merged);
  };

  const handleCommitSchedules = (newSchedules: ExamSchedule[], autoGen: boolean) => {
    const updated = db.addSchedules(newSchedules);
    setSchedules([...updated]);

    if (autoGen) {
      let currentTasks = db.getTasks();
      newSchedules.forEach((sched) => {
        const generated = db.generateDefaultTasksForSchedule(sched);
        currentTasks = [...generated, ...currentTasks];
      });
      db.saveTasks(currentTasks);
      setTasks(currentTasks);
    }
  };

  const handleCommitPrograms = (newPrograms: Program[], newUsers: UserProfile[]) => {
    if (newUsers.length > 0) {
      const existingUsers = db.getUsers();
      const mergedUsers = [...existingUsers, ...newUsers];
      db.saveUsers(mergedUsers);
      setUsers(mergedUsers);
    }

    const existingProgs = db.getPrograms();
    const map = new Map<string, Program>();
    existingProgs.forEach((p) => map.set(p.program_code, p));
    newPrograms.forEach((p) => map.set(p.program_code, p));
    const merged = Array.from(map.values());
    db.savePrograms(merged);
    setPrograms(merged);
  };

  const handleUpdateProgram = (prog: Program) => {
    db.addOrUpdateProgram(prog);
    setPrograms(db.getPrograms());
  };

  const handleDeleteProgram = (progId: string) => {
    db.deleteProgram(progId);
    setPrograms(db.getPrograms());
  };

  const handleAddProgram = (prog: Program) => {
    db.addOrUpdateProgram(prog);
    setPrograms(db.getPrograms());
  };

  const handleResetDB = () => {
    if (confirm('Reset examination database to sample state matching university specifications?')) {
      db.resetToDefaults();
      refreshData();
    }
  };

  const handleSelectScheduleForTasks = (schedule: ExamSchedule) => {
    setFocusedScheduleId(schedule.id);
    setCurrentView('tasks');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view !== 'tasks') setFocusedScheduleId(null);
          setCurrentView(view);
        }}
        onResetDB={handleResetDB}
        pendingTasksCount={pendingTasksCount}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenProfileModal={handleOpenProfileModal}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          escalatedTasksCount={escalatedTasksCount}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          onOpenProfileModal={handleOpenProfileModal}
        />

        {/* Dynamic Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Personalized User Welcome Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {currentUser.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{currentUser.full_name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {currentUser.role}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600 font-medium">{currentUser.title}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                  <span className="font-mono text-slate-600">{currentUser.email}</span>
                  <span>·</span>
                  <span>{currentUser.department || 'Examination Department'}</span>
                  <span>·</span>
                  <span className="text-slate-600 font-medium">
                    {isSuperAdmin
                      ? 'Full University Oversight'
                      : `${userProgs.all.length} Assigned Program(s)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenProfileModal('profile')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                title="View and edit your personal profile and account settings"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>My Profile & Settings</span>
              </button>

              {isSuperAdmin && (
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                  title="Staff Password Governance (Super Admin duty)"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Staff Passwords</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW: DASHBOARD */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive Metrics Grid */}
              <MetricsGrid
                schedules={accessibleSchedules}
                tasks={accessibleTasks}
                isCoordinatorView={!isSuperAdmin}
              />

              {/* Master Exam Timetable Table with Advanced Multi-field Search & Filters */}
              <ExamTable
                schedules={accessibleSchedules}
                tasks={tasks}
                programs={programs}
                isCoordinatorView={!isSuperAdmin}
                onSelectScheduleForTasks={handleSelectScheduleForTasks}
                onGenerateTasks={handleGenerateDefaultTasks}
              />
            </div>
          )}

          {/* VIEW: TASKS / WORKFLOW */}
          {currentView === 'tasks' && (
            <TasksView
              tasks={tasks}
              schedules={schedules}
              programs={programs}
              users={users}
              onUpdateStatus={handleUpdateTaskStatus}
              onEscalateTask={handleEscalateTask}
              onAddTask={handleAddTask}
              focusedScheduleId={focusedScheduleId}
              onClearScheduleFocus={() => setFocusedScheduleId(null)}
            />
          )}

          {/* VIEW: UPLOAD EXCEL (Restricted to Super Admins) */}
          {currentView === 'upload' && (
            isSuperAdmin ? (
              <ExcelUploader
                onCommitSchedules={handleCommitSchedules}
                onCommitPrograms={handleCommitPrograms}
                onNavigate={(view) => setCurrentView(view)}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
                <Shield className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Excel Schedule and Program Mapping upload is exclusively permitted for Super Administrators (<code className="font-mono text-indigo-700 font-semibold">COE</code>, <code className="font-mono text-indigo-700 font-semibold">DYCOE</code>, <code className="font-mono text-indigo-700 font-semibold">ACOE</code>) per university RBAC policy.
                </p>
              </div>
            )
          )}

          {/* VIEW: PROGRAMS MASTER & MAPPING */}
          {currentView === 'programs' && (
            <ProgramsManager
              programs={programs}
              users={users}
              onUpdateProgram={handleUpdateProgram}
              onDeleteProgram={handleDeleteProgram}
              onAddProgram={handleAddProgram}
            />
          )}

          {/* VIEW: SQL & SUPABASE RLS SCHEMA */}
          {currentView === 'schema' && <SqlSchemaViewer />}
        </main>
      </div>

      {/* Personal Profile & Account Settings Modal (Strictly for the Logged-In User) */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        defaultTab={profileModalTab}
      />

      {/* Staff Password Governance Modal (Super Admins) */}
      <PasswordManagementModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
