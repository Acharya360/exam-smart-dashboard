import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { db } from './services/db';
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
import { getViewFromLocation, syncUrlWithView, getUrlSearchParams } from './utils/routes';
import { useScreenScale } from './hooks/useScreenScale';

// Lazy-loaded heavy views for code splitting
const StudentMarksImport = lazy(() => import('./components/admin/StudentMarksImport').then(m => ({ default: m.StudentMarksImport })));
const ExaminationWorkspace = lazy(() => import('./components/admin/ExaminationWorkspace').then(m => ({ default: m.ExaminationWorkspace })));
const TNGStudentsView = lazy(() => import('./components/admin/TNGStudentsView').then(m => ({ default: m.TNGStudentsView })));
const TRSheetView = lazy(() => import('./components/admin/TRSheetView').then(m => ({ default: m.TRSheetView })));
const TimetableGenerator = lazy(() => import('./components/timetable/TimetableGenerator').then(m => ({ default: m.TimetableGenerator })));
const FacultyCourseAllocation = lazy(() => import('./components/faculty/FacultyCourseAllocation').then(m => ({ default: m.FacultyCourseAllocation })));
const ExamPerformanceDashboard = lazy(() => import('./components/reports/ExamPerformanceDashboard').then(m => ({ default: m.ExamPerformanceDashboard })));
const ExcelUploader = lazy(() => import('./components/upload/ExcelUploader').then(m => ({ default: m.ExcelUploader })));
const ClassroomMaster = lazy(() => import('./components/admin/ClassroomMaster').then(m => ({ default: m.ClassroomMaster })));
const SeatingMaster = lazy(() => import('./components/admin/SeatingMaster').then(m => ({ default: m.SeatingMaster })));

// The Sidebar hides Super-Admin-only links, but the active view is driven by the
// URL hash, so a coordinator could otherwise navigate directly (e.g. #users).
// App.tsx enforces the same gate the Sidebar applies.
// Generates a strong random temporary password for bulk-imported users who were not
// given one. Avoids the old shared 'Admin@123' default (a known-credential backdoor);
// an admin sets the real password afterwards via the Staff Passwords modal.
function generateTempPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function AccessDenied() {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <h2 className="text-lg font-semibold text-rose-800">Access denied</h2>
      <p className="mt-1 text-sm text-rose-700">
        You do not have permission to view this area. It is restricted to Super Admins (CoE, DyCoE, ACoE).
      </p>
    </div>
  );
}

function MainApp() {
  const { currentUser, isSuperAdmin, isLoggedIn } = useAuth();
  const screenScale = useScreenScale();

  const [currentView, setCurrentView] = useState<string>(() => getViewFromLocation());
  const [activeContext, setActiveContext] = useState<{
    paperCode?: string;
    staffCode?: string;
    programName?: string;
    semester?: string;
  }>(() => {
    const params = getUrlSearchParams();
    return {
      paperCode: params.paper || params.subject || undefined,
      staffCode: params.staff || undefined,
      programName: params.program || undefined,
      semester: params.sem || undefined,
    };
  });

  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [tasks, setTasks] = useState<ExamTask[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dataError, setDataError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedScheduleIds, setFocusedScheduleIds] = useState<string[] | null>(null);
  const [focusedTaskIds, setFocusedTaskIds] = useState<string[] | null>(null);
  
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
    try {
      setDataError('');
      setIsLoading(true);
      const [fetchedSchedules, fetchedTasks, fetchedPrograms, fetchedUsers] = await Promise.all([
        db.getSchedules(),
        db.getTasks(),
        db.getPrograms(),
        db.getUsers()
      ]);
      setSchedules(fetchedSchedules);
      setTasks(fetchedTasks);
      setPrograms(fetchedPrograms);
      setUsers(fetchedUsers);
    } catch (e) {
      console.error('App refreshData error:', e);
      setDataError(e instanceof Error ? e.message : 'Unable to load university records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [isLoggedIn]);

  // Synchronize browser URL bar and handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const view = getViewFromLocation();
      const params = getUrlSearchParams();
      setActiveContext({
        paperCode: params.paper || params.subject || undefined,
        staffCode: params.staff || undefined,
        programName: params.program || undefined,
        semester: params.sem || undefined,
      });
      setCurrentView(view);

      if (view === 'passwords') {
        setIsPasswordModalOpen(true);
      } else if (view === 'profile') {
        handleOpenProfileModal('profile');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Centralized navigation handler that updates both React state, context, and browser URL bar
  const handleNavigate = (view: string, params?: Record<string, string>, replace = false) => {
    if (view !== 'tasks') setFocusedScheduleId(null);
    setFocusedTaskIds(null);
    setFocusedScheduleIds(null);

    if (params && Object.keys(params).length > 0) {
      setActiveContext((prev) => ({
        paperCode: params.paper || params.subject || prev.paperCode,
        staffCode: params.staff || prev.staffCode,
        programName: params.program || prev.programName,
        semester: params.sem || prev.semester,
      }));
    }

    setCurrentView(view);
    syncUrlWithView(view, replace, params);
  };

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

  const handleAddPrograms = async (progs: Program[], newUsers?: UserProfile[], clearExisting: boolean = false) => {
    const idMap = new Map<string, string>();

    if (newUsers && newUsers.length > 0) {
      for (const u of newUsers) {
        try {
          const res = await db.createUser({
            id: u.id,
            email: u.email,
            password: u.password || generateTempPassword(),
            full_name: u.full_name,
            role: u.role || 'COORDINATOR',
            title: u.title || 'Exam Coordinator',
            department: u.department || '',
            phone: u.phone || ''
          });
          if (res.user?.id) {
            idMap.set(u.id, res.user.id);
            idMap.set(u.email.toLowerCase(), res.user.id);
          }
        } catch {}
      }
    }

    const latestUsers = await db.getUsers().catch(() => []);
    latestUsers.forEach(u => {
      idMap.set(u.email.toLowerCase(), u.id);
    });

    const mappedProgs = progs.map(p => {
      let prim = p.primary_coordinator_id;
      let alt = p.alternate_coordinator_id;
      if (prim && idMap.has(prim)) prim = idMap.get(prim)!;
      if (alt && idMap.has(alt)) alt = idMap.get(alt)!;
      return {
        ...p,
        primary_coordinator_id: prim,
        alternate_coordinator_id: alt,
      };
    });

    await db.addOrUpdatePrograms(mappedProgs, clearExisting);
    await refreshData();
  };

  const handleResetDB = async () => {
    await db.resetToDefaults();
  };

  const handleSelectScheduleForTasks = (schedule: ExamSchedule) => {
    setFocusedScheduleId(schedule.id);
    handleNavigate('tasks');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          handleNavigate(view);
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full max-w-full">
        {/* Top Header */}
        <Header
          currentView={currentView}
          onNavigate={(view, params) => handleNavigate(view, params)}
          escalatedTasksCount={escalatedTasksCount}
          onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
          onOpenProfileModal={handleOpenProfileModal}
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          activeContext={activeContext}
          onClearContext={() => setActiveContext({})}
        />

        {/* Dynamic Content Body with Adaptive Screen Scaling */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 w-full max-w-full">
          <div className="w-full max-w-[2400px] mx-auto space-y-4 sm:space-y-6 min-w-0">
            {dataError&&<div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{dataError}<button className="ml-3 underline" onClick={()=>void refreshData()}>Retry</button></div>}

          {isLoading && <p role="status" className="text-sm text-violet-700">Refreshing examination records…</p>}
          
          {currentView === 'dashboard' && (
            <CommandCenter
              schedules={accessibleSchedules}
              tasks={accessibleTasks}
              programs={userProgs.all}
              onNavigate={handleNavigate}
              onTimetable={(ids) => {
                setFocusedScheduleIds(ids);
                handleNavigate('timetable');
              }}
              onSchedule={handleSelectScheduleForTasks}
              onTasks={(ids) => {
                setFocusedTaskIds(ids);
                setFocusedScheduleId(null);
                handleNavigate('tasks');
              }}
            />
          )}

          {/* VIEW: EXCEL DATA INGESTION (MASTER TIMETABLE & PROGRAM MAPPING) */}
          {currentView === 'upload' && (
            isSuperAdmin ? (
              <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600 font-medium">Loading Excel data ingestion hub…</div>}>
                <ExcelUploader
                  onCommitSchedules={handleCommitSchedules}
                  onCommitPrograms={handleAddPrograms}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            ) : (
              <AccessDenied />
            )
          )}

          {currentView === 'tasks' && focusedTaskIds !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
              <span>Command center selection · {focusedTaskIds.length} tasks</span>
              <button className="ui-button" onClick={() => setFocusedTaskIds(null)}>
                Show all tasks
              </button>
            </div>
          )}

          {currentView === 'timetable' && focusedScheduleIds !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm">
              <span>Command center selection · {focusedScheduleIds.length} papers</span>
              <button className="ui-button" onClick={() => setFocusedScheduleIds(null)}>
                Show all papers
              </button>
            </div>
          )}
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
                onNavigateToFaculty={(code) => handleNavigate('facultyAllocation', { subject: code })}
                onNavigateToMarks={(code) => handleNavigate('studentMarks', { paper: code })}
                onNavigateToReports={(code) => handleNavigate('performanceReports', { subject: code })}
                onNavigateToSeating={(date, paper) => handleNavigate('seatingMaster', { date, paper: paper || '' })}
              />
            </div>
          )}

          {/* VIEW: TIMETABLE GENERATOR (EMS ENGINE) */}
          {currentView === 'timetableGenerator' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600 font-medium">Loading timetable engine…</div>}>
              <TimetableGenerator onNavigate={handleNavigate} />
            </Suspense>
          )}

          {/* VIEW: SEATING MASTER & HALL PLANS */}
          {currentView === 'seatingMaster' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-indigo-600 font-medium">Loading seating master…</div>}>
              <SeatingMaster onNavigate={handleNavigate} />
            </Suspense>
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
              onNavigate={handleNavigate}
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
          {currentView === 'users' && (isSuperAdmin ? <UserManagement /> : <AccessDenied />)}

          {/* VIEW: COURSE MASTER */}
          {currentView === 'courseMaster' && (
            <CourseMasterUI
              initialSearch={activeContext.paperCode}
              onNavigateToFaculty={(code) => handleNavigate('facultyAllocation', { subject: code })}
              onNavigateToMarks={(code) => handleNavigate('studentMarks', { paper: code })}
              onNavigateToTimetable={(code) => handleNavigate('timetable', { subject: code })}
              onNavigateToReports={(code) => handleNavigate('performanceReports', { subject: code })}
            />
          )}

          {/* VIEW: CLASSROOM MASTER */}
          {currentView === 'classroomMaster' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-indigo-600 font-medium">Loading classroom master…</div>}>
              <ClassroomMaster onNavigate={handleNavigate} />
            </Suspense>
          )}

          {/* VIEW: FACULTY COURSE ALLOCATION */}
          {currentView === 'facultyAllocation' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600 font-medium">Loading faculty course allocation…</div>}>
              <FacultyCourseAllocation
                initialSubjectCode={activeContext.paperCode}
                initialStaffCode={activeContext.staffCode}
                initialProgram={activeContext.programName}
                onNavigateToMarks={(paper, staff) => handleNavigate('studentMarks', { paper, staff: staff || '' })}
                onNavigateToCourseMaster={(subject) => handleNavigate('courseMaster', { search: subject })}
                onNavigateToTimetable={(subject) => handleNavigate('timetable', { subject })}
                onNavigateToReports={(staff, subject) => handleNavigate('performanceReports', { staff: staff || '', subject: subject || '' })}
              />
            </Suspense>
          )}

          {/* VIEW: STUDENT MARKS IMPORT */}
          {currentView === 'studentMarks' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600">Loading marks import…</div>}>
              <StudentMarksImport
                initialPaperCode={activeContext.paperCode}
                initialFacultyCode={activeContext.staffCode}
                initialProgram={activeContext.programName}
                onNavigateToFaculty={(code) => handleNavigate('facultyAllocation', { subject: code || activeContext.paperCode || '' })}
                onNavigateToCourseMaster={(code) => handleNavigate('courseMaster', { search: code || activeContext.paperCode || '' })}
                onNavigateToTRSheet={(prog, sem) => handleNavigate('trsheet', { program: prog || activeContext.programName || '', sem: sem || activeContext.semester || '' })}
                onNavigateToReports={(prog, code) => handleNavigate('performanceReports', { program: prog || activeContext.programName || '', subject: code || activeContext.paperCode || '' })}
              />
            </Suspense>
          )}
          {(currentView === 'students' || currentView === 'assessment' || currentView === 'results' || currentView === 'sgpa' || currentView === 'marksMatrix') && (
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
              <TRSheetView
                initialProgram={activeContext.programName}
                initialSemester={activeContext.semester}
                onNavigateToMarks={() => handleNavigate('studentMarks', { program: activeContext.programName || '' })}
                onNavigateToReports={(prog) => handleNavigate('performanceReports', { program: prog || activeContext.programName || '' })}
                onNavigateToTNG={() => handleNavigate('tng')}
              />
            </Suspense>
          )}

          {/* VIEW: EXAM PERFORMANCE REPORTS & ANALYTICS */}
          {currentView === 'performanceReports' && (
            <Suspense fallback={<div className="flex items-center justify-center h-64 text-violet-600 font-medium">Loading performance reports…</div>}>
              <ExamPerformanceDashboard
                initialProgram={activeContext.programName}
                initialSemester={activeContext.semester}
                initialSubject={activeContext.paperCode}
                initialStaff={activeContext.staffCode}
                onNavigateToMarks={(paper) => handleNavigate('studentMarks', { paper })}
                onNavigateToFaculty={(subj) => handleNavigate('facultyAllocation', { subject: subj })}
                onNavigateToTRSheet={(prog, sem) => handleNavigate('trsheet', { program: prog, sem: sem || '' })}
                onNavigateToSchedule={(prog) => handleNavigate('timetable', { program: prog })}
                onNavigateToCourseMaster={(code) => handleNavigate('courseMaster', { search: code })}
              />
            </Suspense>
          )}

          {/* VIEW: SQL & SUPABASE RLS SCHEMA */}
          {currentView === 'schema' && <SqlSchemaViewer />}
        </div>
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
