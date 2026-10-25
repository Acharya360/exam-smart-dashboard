import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { 
  GraduationCap, 
  ChevronDown, 
  ShieldCheck, 
  User, 
  Bell, 
  Database,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  LogOut,
  Settings,
  Briefcase,
  Lock,
  Mail,
  Building2,
  Menu
} from 'lucide-react';
import { WorkflowPipelineNav } from '../common/WorkflowPipelineBar';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  escalatedTasksCount: number;
  onOpenPasswordModal: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'password' | 'duties') => void;
  onMenuToggle?: () => void;
  activeContext?: {
    paperCode?: string;
    staffCode?: string;
    programName?: string;
    semester?: string;
  };
  onClearContext?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  escalatedTasksCount,
  onOpenPasswordModal,
  onOpenProfileModal,
  onMenuToggle,
  activeContext,
  onClearContext
}) => {
  const { currentUser, getUserRoleLabel, isSuperAdmin, logout, getUserPrograms } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userProgs = getUserPrograms();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDropdownOpen(false); setNotificationsOpen(false); } };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, []);

  const roleColors: Record<UserRole, string> = {
    COE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DYCOE: 'bg-blue-50 text-blue-700 border-blue-200',
    ACOE: 'bg-sky-50 text-sky-700 border-sky-200',
    COORDINATOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const getBreadcrumbTitle = (view: string) => {
    switch (view) {
      case 'timetable': return 'Examination planning / Timetable';
      case 'users': return 'Governance / User management';
      case 'tng': return 'Results / TNG candidates';
      case 'trsheet': return 'Reports / Tabulation register';
      case 'students': return 'Student Registry / Programme & Subject Links';
      case 'assessment': return 'Assessment Schemes / CA, EST, ESP & ESS';
      case 'marksMatrix': return 'Examination Marks / Component Marks Matrix';
      case 'results': return 'Examination Processing / Eligibility & Results';
      case 'sgpa': return 'Semester Results / Credit-Weighted SGPA';
      case 'courseMaster': return 'Academic Registry / LTPS & Course Credits';
      case 'facultyAllocation': return 'Academic Registry / Faculty Course Allocation & Teaching Staff';
      case 'studentMarks': return 'Examination Marks / Import & Review';
      case 'performanceReports': return 'Reports & Analytics / Institutional Examination Performance';
      case 'dashboard':
        return isSuperAdmin ? 'Central Examination Command / Master Dashboard' : 'Assigned Programs / Examination Timetable';
      case 'tasks':
        return 'Workflow Tracking & Operational To-Do Board';
      case 'programs':
        return 'Academic Registry / Program & Coordinator Mapping';
      case 'upload':
        return 'Data Ingestion / Excel Sheet Parser';
      case 'schema':
        return 'System Architecture / PostgreSQL & Supabase RLS Engine';
      default:
        return 'Examination Management System';
    }
  };

  return (
    <header className="h-14 glass border-b border-white/50 px-3 sm:px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs shadow-slate-200/40 w-full max-w-full">
      {/* Zone 1 & 2: Institutional Brand & Contextual Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button 
            onClick={onMenuToggle}
            className="p-1.5 -ml-1 mr-0.5 text-slate-500 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 truncate">SSPU ExamTrack</span>
              <span className="hidden sm:inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border border-indigo-200 bg-indigo-50 text-indigo-700 shrink-0">
                CoE Cell
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center text-[11px] text-slate-400 gap-1.5 pl-3 border-l border-slate-200 truncate">
          <span>Examination Department</span>
          <span>/</span>
          <span className="font-medium text-slate-700 truncate">{getBreadcrumbTitle(currentView)}</span>
        </div>
      </div>

      {/* Zone 3: Actions, Notifications & Personal User Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Next & Back Workflow Navigation (Zero extra vertical space) */}
        <WorkflowPipelineNav
          currentView={currentView}
          onNavigate={onNavigate}
          activeContext={activeContext}
          onClearContext={onClearContext}
        />

        {/* Escalation Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
            title="Operational Alerts"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {escalatedTasksCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-20px))] max-w-[calc(100vw-16px)] bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Operational Alerts</span>
                <span className="text-xs text-slate-400 font-mono">{escalatedTasksCount} active</span>
              </div>
              {escalatedTasksCount > 0 ? (
                <div 
                  onClick={() => {
                    onNavigate('tasks');
                    setNotificationsOpen(false);
                  }}
                  className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-900">
                        {escalatedTasksCount} task(s) escalated to Alternate Member!
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Urgent follow-up required. Click to view on the Task Board.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>No escalated tasks in your scope</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PERSONAL USER PROFILE & SETTINGS DROPDOWN (Strictly for the Logged-In User) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-white transition-all text-left group shadow-2xs"
            aria-expanded={dropdownOpen}
            title="View my profile and account settings"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 group-hover:bg-indigo-700 flex items-center justify-center font-bold text-xs text-white transition-colors shadow-2xs">
              {currentUser.full_name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 leading-tight line-clamp-1">
                  {currentUser.full_name}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleColors[currentUser.role]}`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[150px] leading-tight font-mono">
                {currentUser.email}
              </p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-20px))] max-w-[calc(100vw-16px)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Identity Card */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {currentUser.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.full_name}
                      </h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${roleColors[currentUser.role]}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                      {currentUser.email}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate font-medium">
                      {currentUser.title}
                    </p>
                  </div>
                </div>
                
                {currentUser.department && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.department}</span>
                  </div>
                )}
              </div>

              {/* Personal Settings Actions */}
              <div className="p-2 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  My Account
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenProfileModal('profile');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 flex items-center gap-2.5 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="font-semibold">Profile Information</div>
                    <div className="text-[10px] text-slate-400">View and update name, phone, department</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenProfileModal('password');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 flex items-center gap-2.5 transition-colors"
                >
                  <KeyRound className="w-4 h-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="font-semibold">Change My Password</div>
                    <div className="text-[10px] text-slate-400">Update your login security credentials</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenProfileModal('duties');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 flex items-center gap-2.5 transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <div className="flex-1">
                    <div className="font-semibold">My Assigned Jurisdiction</div>
                    <div className="text-[10px] text-slate-400">
                      {isSuperAdmin ? 'Full university oversight' : `${userProgs.all.length} mapped program(s)`}
                    </div>
                  </div>
                </button>
              </div>

              {/* Administrative Governance (CoE / DyCoE / ACoE only) */}
              {isSuperAdmin && (
                <div className="p-2 border-t border-slate-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                    Administrator Controls
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenPasswordModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div>Staff Password Governance</div>
                      <div className="text-[10px] text-indigo-600/70 font-normal">Change passwords for coordinators & staff</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Sign Out */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/60 rounded-b-xl flex items-center justify-between">
                <span className="text-[11px] text-slate-500 pl-2">
                  Session: <span className="font-semibold text-slate-700">Active</span>
                </span>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out of exam portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
