import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  LogOut,
  X,
  LayoutDashboard,
  CalendarDays,
  ListChecks,
  Building2,
  BookOpen,
  Users,
  SlidersHorizontal,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  ChartColumn,
  FileText,
  UserCog,
  KeyRound,
  Database,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

interface NavItemDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  superAdminOnly?: boolean;
}

interface NavGroupDef {
  name: string;
  items: NavItemDef[];
}

const groups: NavGroupDef[] = [
  {
    name: 'Command Center',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'motionVideo', label: 'Project Motion Video', icon: Sparkles },
    ],
  },
  {
    name: 'Examination Workflow',
    items: [
      { id: 'timetable', label: 'Examination Timetable', icon: CalendarDays },
      { id: 'tasks', label: 'Tasks & Workflow', icon: ListChecks },
    ],
  },
  {
    name: 'Academic Registry',
    items: [
      { id: 'programs', label: 'Programme & Member Mapping', icon: Building2 },
      { id: 'courseMaster', label: 'Course Master', icon: BookOpen },
    ],
  },
  {
    name: 'Students & Registrations',
    items: [{ id: 'students', label: 'Students & Registrations', icon: Users }],
  },
  {
    name: 'Assessment & Marks',
    items: [
      { id: 'assessment', label: 'Assessment & Grading', icon: SlidersHorizontal },
      { id: 'studentMarks', label: 'Student Marks Import', icon: FileSpreadsheet },
    ],
  },
  {
    name: 'Results & Eligibility',
    items: [
      { id: 'results', label: 'Eligibility & Results', icon: ShieldCheck },
      { id: 'tng', label: 'TNG Candidates', icon: ShieldAlert },
      { id: 'sgpa', label: 'Semester SGPA', icon: ChartColumn },
    ],
  },
  {
    name: 'Reports & Registers',
    items: [{ id: 'trsheet', label: 'Tabulation Register', icon: FileText }],
  },
  {
    name: 'Governance & Settings',
    items: [
      { id: 'users', label: 'User Management', icon: UserCog, superAdminOnly: true },
      { id: 'passwords', label: 'Staff Passwords', icon: KeyRound, superAdminOnly: true },
      { id: 'schema', label: 'Database Reference', icon: Database },
    ],
  },
];

export function Sidebar({
  currentView,
  onNavigate,
  pendingTasksCount,
  onOpenPasswordModal,
  onOpenProfileModal,
  isOpen,
  onClose,
}: SidebarProps) {
  const { isSuperAdmin, currentUser, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const ref = useRef<HTMLElement>(null);

  // Keyboard accessibility — trap focus while mobile sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLButtonElement>('button') || [],
        ).filter((n) => n.getClientRects().length);
        const first = nodes[0];
        const last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  // Avatar initials
  const userInitials = useMemo(() => {
    const clean = (currentUser.full_name || '')
      .replace(/^(dr\.|prof\.|mr\.|ms\.|mrs\.)\s+/i, '')
      .trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() || 'U';
  }, [currentUser.full_name]);

  // Filter
  const filteredGroups = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (!isSuperAdmin && item.superAdminOnly) return false;
          if (!q) return true;
          return item.label.toLowerCase().includes(q) || g.name.toLowerCase().includes(q);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [filterQuery, isSuperAdmin]);

  const toggleGroup = (name: string) => {
    if (collapsed) setCollapsed(false);
    setClosed((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));
  };

  const handleItemClick = (id: string) => {
    if (id === 'passwords') onOpenPasswordModal();
    else onNavigate(id);
    if (isOpen && window.innerWidth < 768) onClose?.();
  };

  /* ── Role colour token ── */
  const roleBg: Record<string, string> = {
    COE: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/25',
    DYCOE: 'bg-sky-500/20 text-sky-300 border-sky-400/25',
    ACOE: 'bg-teal-500/20 text-teal-300 border-teal-400/25',
    COORDINATOR: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/25',
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        ref={ref}
        aria-label="Application navigation"
        className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${isOpen ? 'is-open' : ''}`}
      >
        {/* ─── Brand header ─── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="nav-copy min-w-0 flex-1">
            <strong className="block text-sm font-bold text-white tracking-tight truncate">
              SSPU ExamTrack
            </strong>
            <span className="text-[11px] text-slate-400 leading-none">
              Examination Operations
            </span>
          </div>

          {/* Desktop collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile close */}
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-auto md:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Quick search ─── */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1 nav-search">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search modules…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-[7px] bg-slate-800/60 border border-slate-700/50 focus:border-indigo-500/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
              {filterQuery && (
                <button
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Navigation list ─── */}
        <nav className="flex-1 overflow-y-auto px-2.5 pt-2 pb-3">
          {filteredGroups.map((group, gIdx) => {
            const isGroupActive = group.items.some((i) => i.id === currentView);
            const isExpanded =
              filterQuery.trim().length > 0 || !closed.includes(group.name) || isGroupActive;

            return (
              <section key={group.name} className="mt-4 first:mt-1">
                {/* Group header */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleGroup(group.name)}
                  className="group flex w-full items-center gap-2 px-2 py-1 text-left"
                >
                  <span className="text-[10px] font-mono font-semibold text-slate-500 w-4 text-right shrink-0">
                    {String(gIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="nav-copy flex-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500 group-hover:text-slate-400 transition-colors truncate">
                    {group.name}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`nav-copy text-slate-600 group-hover:text-slate-400 transition-transform duration-200 shrink-0 ${
                      isExpanded ? '' : '-rotate-90'
                    }`}
                  />
                </button>

                {/* Group items */}
                {(isExpanded || collapsed) && (
                  <div className="mt-0.5 space-y-[2px]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          aria-label={item.label}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => handleItemClick(item.id)}
                          className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                          <Icon
                            size={16}
                            className={`shrink-0 ${
                              isActive
                                ? 'text-indigo-300'
                                : 'text-slate-500 group-hover:text-slate-300'
                            }`}
                          />
                          <span className="nav-copy flex-1 truncate">{item.label}</span>

                          {/* Task badge */}
                          {item.id === 'tasks' && pendingTasksCount > 0 && (
                            <span className="nav-copy min-w-[20px] text-center px-1.5 py-[1px] rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                              {pendingTasksCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </nav>

        {/* ─── User footer ─── */}
        <div className="border-t border-slate-700/40 p-3">
          <button
            type="button"
            onClick={() => onOpenProfileModal('profile')}
            className="flex items-center gap-2.5 w-full p-2 rounded-lg hover:bg-slate-800/60 transition-colors group text-left"
            title="Account settings"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                {userInitials}
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -bottom-0.5 -right-0.5 ring-[1.5px] ring-slate-900" />
            </div>

            {/* Name + role */}
            <div className="nav-copy min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-slate-100 truncate group-hover:text-white transition-colors">
                {currentUser.full_name || 'User'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-[1px] rounded border leading-none ${
                    roleBg[currentUser.role] || roleBg.COORDINATOR
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Action icons */}
            <div className="nav-copy flex items-center shrink-0 gap-0.5">
              <span
                className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                title="Settings"
              >
                <Settings size={14} />
              </span>
            </div>
          </button>

          {/* Sign-out row */}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2.5 w-full px-2 py-1.5 mt-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/8 transition-colors text-xs"
            title="Sign out"
          >
            <LogOut size={14} className="shrink-0" />
            <span className="nav-copy">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
