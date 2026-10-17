import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './services/db';
import { localRequest } from './services/localDb';
import { ExamSchedule, ExamTask, Program, TaskStatus, UserProfile } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { ExamTable } from './components/dashboard/ExamTable';
import { TasksView } from './components/tasks/TasksView';
import { ProgramsManager } from './components/admin/ProgramsManager';
import { UserManagement } from './components/admin/UserManagement';
import { CourseMasterUI } from './components/admin/CourseMaster';
import { SqlSchemaViewer } from './components/schema/SqlSchemaViewer';
import { LoginScreen } from './components/auth/LoginScreen';
import { PasswordManagementModal } from './components/admin/PasswordManagementModal';
import { ProfileSettingsModal } from './components/profile/ProfileSettingsModal';
import { MotionVideoShowcase } from './components/motion-video/MotionVideoShowcase';
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

// Lazy-loaded heavy admin views for code splitting
const ExcelUploader = lazy(() => import('./components/upload/ExcelUploader').then(m => ({ default: m.ExcelUploader })));
const StudentMarksImport = lazy(() => import('./components/admin/StudentMarksImport').then(m => ({ default: m.StudentMarksImport })));
const ExaminationWorkspace = lazy(() => import('./components/admin/ExaminationWorkspace').then(m => ({ default: m.ExaminationWorkspace })));
const TNGStudentsView = lazy(() => import('./components/admin/TNGStudentsView').then(m => ({ default: m.TNGStudentsView })));
const TRSheetView = lazy(() => import('./components/admin/TRSheetView').then(m => ({ default: m.TRSheetView })));

function MainApp() {
  const { currentUser, isSuperAdmin, isCoordinator, isLoggedIn } = useAuth();

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dataError,setDataError]=useState('');
  const [isDemo,setIsDemo]=useState(false);
  const [isLoading,setIsLoading]=useState(false);
  const [focusedScheduleIds,setFocusedScheduleIds]=useState<string[]|null>(null);
  const [focusedTaskIds,setFocusedTaskIds]=useState<string[]|null>(null);
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<'profile' | 'password' | 'duties'>('profile');
  const [isMotionVideoModalOpen, setIsMotionVideoModalOpen] = useState(false);
  
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Jump from exam table to its tasks
  const [focusedScheduleId, setFocusedScheduleId] = useState<string | null>(null);

  // Sync state from database
  const refreshData = async () => {
    console.log('App: refreshData called, isLoggedIn:', isLoggedIn);
    if (!isLoggedIn) return;
    try {
      setDataError(''); setIsLoading(true);
      const [healthRes, fetchedSchedules, fetchedTasks, fetchedPrograms, fetchedUsers] = await Promise.all([
        localRequest<{data_mode:string}>('/health').catch(() => ({ data_mode: 'DEMO' })),
        db.getSchedules(),
        db.getTasks(),
        db.getPrograms(),
        db.getUsers()
      ]);
      console.log('App refreshData completed:', { schedules: fetchedSchedules.length, tasks: fetchedTasks.length, programs: fetchedPrograms.length, users: fetchedUsers.length });
      setIsDemo(healthRes.data_mode === 'DEMO');
      setSchedules(fetchedSchedules);
      setTasks(fetchedTasks);
      setPrograms(fetchedPrograms);
      setUsers(fetchedUsers);
    } catch(e) { console.error('App refreshData error:', e); setDataError(e instanceof Error?e.message:'Unable to load university records.'); } finally { setIsLoading(false); }
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

  const handleDeletePrograms = async (progIds: string[]) => {
    await db.deletePrograms(progIds);
    await refreshData();
  };

  const handleAddProgram = async (prog: Program) => {
    await db.addOrUpdateProgram(prog);
    await refreshData();
  };

  const handleAddPrograms = async (progs: Program[], newUsers?: UserProfile[]) => {
    if (newUsers && newUsers.length > 0) {
      for (const u of newUsers) {
        try {
          await db.createUser({
            email: u.email,
            password: u.password || 'Admin@123',
            full_name: u.full_name,
            role: u.role || 'COORDINATOR',
            title: u.title || 'Exam Coordinator',
            department: u.department || '',
            phone: u.phone || ''
          });
        } catch {}
      }
    }
    await db.addOrUpdatePrograms(progs);
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
      <a className="skip-link" href="#main-content">Skip to content</a>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view !== 'tasks') setFocusedScheduleId(null);
          setFocusedTaskIds(null); setFocusedScheduleIds(null);
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
          onOpenMotionVideo={() => setIsMotionVideoModalOpen(true)}
        />

        {/* Dynamic Content Body */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {dataError&&<div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{dataError}<button className="ml-3 underline" onClick={()=>void refreshData()}>Retry</button></div>}


          {isLoading && <p role="status" className="text-sm text-violet-700">Refreshing examination records…</p>}
          {currentView === 'dashboard' && <CommandCenter schedules={accessibleSchedules} tasks={accessibleTasks} programs={userProgs.all} onNavigate={setCurrentView} onTimetable={ids=>{setFocusedScheduleIds(ids);setCurrentView('timetable');}} onSchedule={handleSelectScheduleForTasks} onTasks={ids=>{setFocusedTaskIds(ids);setFocusedScheduleId(null);setCurrentView('tasks');}}/>}
          {currentView==='tasks'&&focusedTaskIds!==null&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm"><span>Command center selection · {focusedTaskIds.length} tasks</span><button className="ui-button" onClick={()=>setFocusedTaskIds(null)}>Show all tasks</button></div>}
          {currentView==='timetable'&&focusedScheduleIds!==null&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm"><span>Command center selection · {focusedScheduleIds.length} papers</span><button className="ui-button" onClick={()=>setFocusedScheduleIds(null)}>Show all papers</button></div>}
          {/* VIEW: TIMETABLE */}
          {currentView === 'timetable' && (
            <div className="space-y-6">
              <ExamTable
                schedules={focusedScheduleIds===null?accessibleSchedules:accessibleSchedules.filter(s=>focusedScheduleIds.includes(s.id))}
                tasks={accessibleTasks}
                programs={userProgs.all}
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
              tasks={focusedTaskIds===null?accessibleTasks:accessibleTasks.filter(t=>focusedTaskIds.includes(t.id))}
              schedules={accessibleSchedules}
              programs={userProgs.all}
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
              onDeletePrograms={handleDeletePrograms}
              onAddProgram={handleAddProgram}
              onAddPrograms={handleAddPrograms}
            />
          )}

          {/* VIEW: USER MANAGEMENT */}
          {currentView === 'users' && <UserManagement />}

          {/* VIEW: COURSE MASTER */}
          {currentView === 'courseMaster' && <CourseMasterUI />}

          {/* VIEW: STUDENT MARKS IMPORT */}
          {currentView === 'studentMarks' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600">Loading marks import…</div>}>
              <StudentMarksImport />
            </Suspense>
          )}
          {(currentView === 'students' || currentView === 'assessment' || currentView === 'results' || currentView === 'sgpa') && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600">Loading examination workspace…</div>}>
              <ExaminationWorkspace view={currentView} />
            </Suspense>
          )}

          {/* VIEW: TNG STUDENTS (TERM NOT GRANTED) */}
          {currentView === 'tng' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600">Loading TNG students…</div>}>
              <TNGStudentsView />
            </Suspense>
          )}

          {/* VIEW: TABULATION REGISTER (TR SHEET) */}
          {currentView === 'trsheet' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600">Loading TR sheet…</div>}>
              <TRSheetView />
            </Suspense>
          )}

          {/* VIEW: SQL & SUPABASE RLS SCHEMA */}
          {currentView === 'schema' && <SqlSchemaViewer />}

          {/* VIEW: PROJECT MOTION VIDEO (DEDICATED FULL VIEW) */}
          {currentView === 'motionVideo' && (
            <div className="h-[calc(100vh-8.5rem)] w-full rounded-2xl overflow-hidden shadow-2xl">
              <MotionVideoShowcase
                onNavigateToDashboard={() => setCurrentView('dashboard')}
              />
            </div>
          )}
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

      {/* Cinematic Motion Video Showcase Overlay Modal */}
      {isMotionVideoModalOpen && (
        <MotionVideoShowcase
          isModal={true}
          onClose={() => setIsMotionVideoModalOpen(false)}
          onNavigateToDashboard={() => {
            setIsMotionVideoModalOpen(false);
            setCurrentView('dashboard');
          }}
        />
      )}
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
