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
import { UserManagement } from './components/admin/UserManagement';
import { CourseMasterUI } from './components/admin/CourseMaster';
import { StudentMarksImport } from './components/admin/StudentMarksImport';
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
  const { currentUser, isSuperAdmin, isCoordinator, isLoggedIn } = useAuth();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password' | 'duties'>('profile');
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Jump from exam table to its tasks
  const [focusedScheduleId, setFocusedScheduleId] = useState<string | null>(null);

  // Sync state from database
  const refreshData = async () => {
    if (!isLoggedIn) return;
    const fetchedSchedules = await db.getSchedules();
    const fetchedTasks = await db.getTasks();
    const fetchedPrograms = await db.getPrograms();
    const fetchedUsers = await db.getUsers();
    
    setSchedules(fetchedSchedules);
    setTasks(fetchedTasks);
    setPrograms(fetchedPrograms);
    setUsers(fetchedUsers);
  };

  useEffect(() => {
    refreshData();
  }, [isLoggedIn]);

  // If not logged in, gate access with the dedicated Login Screen
  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  // Filtered schedules for the active user based on RBAC:
  const userProgs = {
    primary: programs.filter((p) => p.primary_coordinator_id === currentUser.id),
    alternate: programs.filter((p) => p.alternate_coordinator_id === currentUser.id),
    all: isSuperAdmin ? programs : programs.filter((p) => p.primary_coordinator_id === currentUser.id || p.alternate_coordinator_id === currentUser.id)
  };
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

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus, notes?: string) => {
    await db.updateTaskStatus(taskId, status, notes);
    await refreshData();
  };

  const handleEscalateTask = async (taskId: string, reason: string) => {
    await db.escalateTask(taskId, reason);
    await refreshData();
  };

  const handleAddTask = async (task: ExamTask) => {
    await db.addTask(task);
    await refreshData();
  };

  const handleGenerateDefaultTasks = async (schedule: ExamSchedule) => {
    await db.generateDefaultTasksForSchedule(schedule);
    await refreshData();
  };

  const handleCommitSchedules = async (newSchedules: ExamSchedule[], autoGen: boolean) => {
    await db.addSchedules(newSchedules);

    if (autoGen) {
      for (const sched of newSchedules) {
        await db.generateDefaultTasksForSchedule(sched);
      }
    }
    await refreshData();
  };

  const handleDeleteSchedule = async (id: string) => {
    await db.deleteSchedule(id);
    await refreshData();
  };

  const handleDeleteSchedules = async (ids: string[]) => {
    await db.deleteSchedules(ids);
    await refreshData();
  };

  const handleCommitPrograms = async (newPrograms: Program[], newUsers: UserProfile[]) => {
    // Handling mass uploads is currently unsupported in SupabaseDBService as we didn't write batch users sync
    // In production, this should trigger an edge function to create Supabase Auth users.
    // We'll sync programs at least.
    for (const p of newPrograms) {
      await db.addOrUpdateProgram(p);
    }
    await refreshData();
  };

  const handleUpdateProgram = async (prog: Program) => {
    await db.addOrUpdateProgram(prog);
    await refreshData();
  };

  const handleDeleteProgram = async (progId: string) => {
    await db.deleteProgram(progId);
    await refreshData();
  };

  const handleAddProgram = async (prog: Program) => {
    await db.addOrUpdateProgram(prog);
    await refreshData();
  };

  const handleResetDB = async () => {
    await db.resetToDefaults();
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
          setIsSidebarOpen(false); // Close sidebar on mobile after navigation
        }}
        onResetDB={handleResetDB}
        pendingTasksCount={pendingTasksCount}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenProfileModal={handleOpenProfileModal}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
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
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Dynamic Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">


          {/* VIEW: DASHBOARD */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              <MetricsGrid
                schedules={accessibleSchedules}
                tasks={accessibleTasks}
                isCoordinatorView={!isSuperAdmin}
              />
              <ExamTable
                schedules={accessibleSchedules}
                tasks={tasks}
                programs={programs}
                isCoordinatorView={!isSuperAdmin}
                onSelectScheduleForTasks={handleSelectScheduleForTasks}
                onGenerateTasks={handleGenerateDefaultTasks}
                onCommitSchedules={handleCommitSchedules}
                onDeleteSchedule={handleDeleteSchedule}
                onDeleteSchedules={handleDeleteSchedules}
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

          {/* VIEW: USER MANAGEMENT */}
          {currentView === 'users' && <UserManagement />}

          {/* VIEW: COURSE MASTER */}
          {currentView === 'courseMaster' && <CourseMasterUI />}

          {/* VIEW: STUDENT MARKS IMPORT */}
          {currentView === 'studentMarks' && <StudentMarksImport />}

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
