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

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  escalatedTasksCount: number;
  onOpenPasswordModal: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'password' | 'duties') => void;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onNavigate, 
  escalatedTasksCount,
  onOpenPasswordModal,
  onOpenProfileModal,
  onMenuToggle
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roleColors: Record<UserRole, string> = {
    COE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DYCOE: 'bg-blue-50 text-blue-700 border-blue-200',
    ACOE: 'bg-sky-50 text-sky-700 border-sky-200',
    COORDINATOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const getBreadcrumbTitle = (view: string) => {
    switch (view) {
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
    <header className="h-16 glass border-b border-white/50 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs shadow-slate-200/50">
      {/* Zone 1 & 2: Institutional Brand & Contextual Breadcrumb */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onMenuToggle}
            className="p-1 -ml-1 mr-1 text-slate-500 hover:text-slate-900 md:hidden rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">SSPU ExamTrack</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-700">
                CoE Cell
              </span>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center text-xs text-slate-400 gap-1.5 pl-4 border-l border-slate-200">
          <span>Examination Department</span>
          <span>/</span>
          <span className="font-medium text-slate-700">{getBreadcrumbTitle(currentView)}</span>
        </div>
      </div>

      {/* Zone 3: Actions, Notifications & Personal User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Super Admin Staff Password Governance Shortcut */}
        {isSuperAdmin && (
          <button
            onClick={onOpenPasswordModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs"
            title="Reset or change passwords for other examination coordinators and staff"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Staff Passwords</span>
          </button>
        )}

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
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                  <span>All tasks within regular SLA parameters</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Schema & RLS Shortcut */}
        <button
          onClick={() => onNavigate('schema')}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors"
          title="Inspect PostgreSQL Schema & Supabase RLS Policies"
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>PostgreSQL & RLS</span>
        </button>

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
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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
