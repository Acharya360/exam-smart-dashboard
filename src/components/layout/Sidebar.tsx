import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  UploadCloud, 
  Users, 
  Database, 
  Lock, 
  RotateCcw,
  Shield,
  Layers,
  KeyRound,
  LogOut,
  UserCheck,
  CalendarDays
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onResetDB: () => void;
  pendingTasksCount: number;
  onOpenPasswordModal: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'password' | 'duties') => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onResetDB,
  pendingTasksCount,
  onOpenPasswordModal,
  onOpenProfileModal,
  isOpen,
  onClose
}) => {
  const { isSuperAdmin, currentUser, getUserPrograms, logout } = useAuth();
  const userProgs = getUserPrograms();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand & Organization */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                SSPU University
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded border border-indigo-500/30">
                CoE Cell
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Confidential Examination Tracker
            </p>
          </div>
        </div>
      </div>

      {/* Logged-In User Profile Quick Banner */}
      <div 
        onClick={() => onOpenProfileModal('profile')}
        className="mx-3 my-3 p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all cursor-pointer group"
        title="Click to view and edit your profile settings"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
            {currentUser.full_name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                {currentUser.full_name}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {currentUser.email}
            </p>
          </div>
          <Shield className={`w-3.5 h-3.5 shrink-0 ${isSuperAdmin ? 'text-indigo-400' : 'text-emerald-400'}`} />
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-400">
          <span>{currentUser.role} · {isSuperAdmin ? 'Super Admin' : 'Coordinator'}</span>
          <span className="text-indigo-400 font-medium group-hover:underline">Settings &rarr;</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 font-mono">
          Core Operations
        </div>

        {/* Dashboard */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>{isSuperAdmin ? 'All Programs Dashboard' : 'My Programs Timetable'}</span>
          </div>
        </button>

        {/* Tasks / To-Do Board */}
        <button
          onClick={() => onNavigate('tasks')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'tasks'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4" />
            <span>Task & Workflow Board</span>
          </div>
          {pendingTasksCount > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">
              {pendingTasksCount}
            </span>
          )}
        </button>

        {/* Scheduled Exams Viewer */}
        <button
          onClick={() => onNavigate('scheduledExams')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'scheduledExams'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-4 h-4" />
            <span>Scheduled Exams List</span>
          </div>
        </button>

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1 font-mono">
          Administration & Data
        </div>

        {/* Program Master & Mapping */}
        <button
          onClick={() => onNavigate('programs')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'programs'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4" />
            <span>Program & Member Mapping</span>
          </div>
          {!isSuperAdmin && (
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">Read</span>
          )}
        </button>

        {/* User Management (Super Admin only) */}
        {isSuperAdmin && (
          <button
            onClick={() => onNavigate('users')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'users'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4" />
              <span>User Management</span>
            </div>
            <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-1 rounded font-mono">CoE</span>
          </button>
        )}

        {/* Course Master Configuration */}
        <button
          onClick={() => onNavigate('courseMaster')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'courseMaster'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4" />
            <span>Course Master Config</span>
          </div>
          {!isSuperAdmin && (
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">Read</span>
          )}
        </button>

        {/* Student Marks Import */}
        <button
          onClick={() => onNavigate('studentMarks')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'studentMarks'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4" />
            <span>Student Marks Import</span>
          </div>
          {!isSuperAdmin && (
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">Read</span>
          )}
        </button>

        {/* Excel Upload (Super Admin only per RBAC matrix) */}
        {isSuperAdmin ? (
          <button
            onClick={() => onNavigate('upload')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentView === 'upload'
                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Exam Schedules</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-mono">XLSX</span>
          </button>
        ) : (
          <div
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-500 cursor-not-allowed opacity-60"
            title="Excel Schedule and Mapping uploads restricted to CoE / DyCoE / ACoE"
          >
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-4 h-4" />
              <span>Upload Exam Schedules</span>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </div>
        )}

        {/* Staff Password Governance (CoE / DyCoE / ACoE only) */}
        {isSuperAdmin && (
          <button
            onClick={onOpenPasswordModal}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Staff Password Governance</span>
            </div>
            <span className="text-[10px] text-indigo-300 bg-indigo-500/20 px-1 rounded font-mono">CoE</span>
          </button>
        )}

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-4 pb-1 font-mono">
          System & Developer
        </div>

        {/* SQL & Supabase RLS Schema Viewer */}
        <button
          onClick={() => onNavigate('schema')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            currentView === 'schema'
              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4" />
            <span>PostgreSQL & Supabase RLS</span>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded font-mono">SQL</span>
        </button>
      </nav>

      {/* Bottom info, reset tool & Sign out */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div className="px-2 py-1.5 bg-slate-950/60 rounded border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Exam Season: Summer 2026</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Odd/Even date indexing active
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onResetDB}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-slate-400 hover:text-rose-300 hover:bg-slate-800 rounded transition-colors"
            title="Reset database to default state matching university specifications"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Records</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors"
            title="Sign out of system"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
