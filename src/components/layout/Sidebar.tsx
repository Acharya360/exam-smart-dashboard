import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
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
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { VIEW_TO_PATH } from '../../utils/routes';

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
    ],
  },
  {
    name: 'Phase 1: Academic & Faculty Registry',
    items: [
      { id: 'programs', label: 'Programme & Member Mapping', icon: Building2 },
      { id: 'courseMaster', label: 'Course Master', icon: BookOpen },
      { id: 'facultyAllocation', label: 'Faculty Allocation & Duties', icon: GraduationCap },
    ],
  },
  {
    name: 'Phase 2: Timetable & Operations',
    items: [
      { id: 'timetable', label: 'Examination Timetable', icon: CalendarDays },
      { id: 'timetableGenerator', label: 'Timetable Generator (EMS)', icon: Sparkles },
      { id: 'tasks', label: 'Tasks & Workflow', icon: ListChecks },
    ],
  },
  {
    name: 'Phase 3: Students & Marks Entry',
    items: [
      { id: 'students', label: 'Students & Registrations', icon: Users },
      { id: 'assessment', label: 'Assessment & Grading', icon: SlidersHorizontal },
      { id: 'studentMarks', label: 'Student Marks Import', icon: FileSpreadsheet },
    ],
  },
  {
    name: 'Phase 4: Results & Tabulation',
    items: [
      { id: 'results', label: 'Eligibility & Results', icon: ShieldCheck },
      { id: 'tng', label: 'TNG Candidates', icon: ShieldAlert },
      { id: 'sgpa', label: 'Semester SGPA', icon: ChartColumn },
      { id: 'trsheet', label: 'Tabulation Register (TR)', icon: FileText },
    ],
  },
  {
    name: 'Phase 5: Institutional Analytics',
    items: [
      { id: 'performanceReports', label: 'Performance Analytics', icon: BarChart3 },
    ],
  },
  {
    name: 'Gazette & Print Engine',
    items: [
      { id: 'gazetteHome', label: 'Gazette Dashboard', icon: LayoutDashboard },
      { id: 'gazetteRegister', label: 'Result Gazette (A3)', icon: FileText },
      { id: 'gazetteCards', label: 'Grade Cards (A4)', icon: UserCheck },
      { id: 'gazetteAnalytics', label: 'Gazette Analytics', icon: BarChart3 },
      { id: 'gazetteDataHub', label: 'Excel Data Hub', icon: FileSpreadsheet },
      { id: 'gazetteNames', label: 'Student Names Directory', icon: Users },
      { id: 'gazetteMaster', label: 'Master Records', icon: Database },
    ],
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
  const [autoHide, setAutoHide] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sspu_sidebar_autohide');
      return stored !== null ? stored === 'true' : true; // Auto-hide enabled by default
    } catch {
      return true;
    }
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sspu_sidebar_autohide');
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });
  const [closed, setClosed] = useState<string[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const ref = useRef<HTMLElement>(null);

  // Auto-hide when user moves mouse to or clicks inside main content area to work with screen
  useEffect(() => {
    if (!autoHide) return;
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const handleWorkWithScreen = () => {
      setCollapsed(true);
    };

    mainContent.addEventListener('mouseenter', handleWorkWithScreen);
    mainContent.addEventListener('mousedown', handleWorkWithScreen);

    return () => {
      mainContent.removeEventListener('mouseenter', handleWorkWithScreen);
      mainContent.removeEventListener('mousedown', handleWorkWithScreen);
    };
  }, [autoHide]);

  const toggleAutoHide = () => {
    setAutoHide((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sspu_sidebar_autohide', String(next));
      } catch {}
      if (next) setCollapsed(true);
      return next;
    });
  };

  const handleSidebarMouseEnter = () => {
    if (autoHide && collapsed) {
      setCollapsed(false);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (autoHide && !collapsed) {
      setCollapsed(true);
    }
  };

  // Keyboard accessibility — trap focus while mobile sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>('button, a') || [],
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

  const gazetteRoutes: Record<string, string> = {
    gazetteHome: '/gazette/index.html',
    gazetteRegister: '/gazette/pages/gazette.html',
    gazetteCards: '/gazette/pages/grade-cards.html',
    gazetteAnalytics: '/gazette/pages/analytics.html',
    gazetteDataHub: '/gazette/pages/data-hub.html',
    gazetteNames: '/gazette/pages/student-names.html',
    gazetteMaster: '/gazette/pages/master-records.html',
  };

  const handleItemClick = (id: string) => {
    if (id === 'passwords') onOpenPasswordModal();
    else if (gazetteRoutes[id]) window.location.href = gazetteRoutes[id];
    else onNavigate(id);
    if (autoHide) setCollapsed(true);
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
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`app-sidebar ${collapsed ? 'is-collapsed' : ''} ${isOpen ? 'is-open' : ''}`}
      >
        {/* ─── Brand header ─── */}
        <div className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-slate-700/40">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <div className="nav-copy min-w-0 flex-1">
            <strong className="block text-xs font-bold text-white tracking-tight truncate">
              SSPU ExamTrack
            </strong>
            <span className="text-[10px] text-slate-400 leading-none">
              Examination Operations
            </span>
          </div>

          {/* Desktop auto-hide pin toggle */}
          <button
            onClick={toggleAutoHide}
            className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-auto"
            title={
              autoHide
                ? 'Auto-hide active (collapses while working on screen). Click to pin open.'
                : 'Sidebar pinned open. Click to enable auto-hide.'
            }
            aria-label={autoHide ? 'Disable auto-hide' : 'Enable auto-hide'}
          >
            {autoHide ? <PinOff size={14} className="text-violet-400" /> : <Pin size={14} className="text-slate-400" />}
          </button>

          {/* Desktop manual collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>

          {/* Mobile close */}
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors ml-auto md:hidden"
          >
            <X size={15} />
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
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2.5 pt-2 pb-3">
          {filteredGroups.map((group, gIdx) => {
            const number = String(gIdx + 1).padStart(2, '0');
            const soloItem = group.items.length === 1 ? group.items[0] : undefined;

            /* Single-module section → one clickable row, no dropdown to collapse */
            if (soloItem) {
              const SoloIcon = soloItem.icon;
              const isSoloActive = currentView === soloItem.id;
              return (
                <section key={group.name} className="mt-4 first:mt-1">
                  <a
                    href={VIEW_TO_PATH[soloItem.id] || '/'}
                    title={soloItem.label}
                    aria-label={soloItem.label}
                    aria-current={isSoloActive ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      handleItemClick(soloItem.id);
                    }}
                    className={`nav-item is-solo group ${isSoloActive ? 'active' : ''}`}
                  >
                    <span className="nav-num shrink-0 w-4 text-right text-[10px] font-mono font-semibold text-slate-500">
                      {number}
                    </span>
                    <SoloIcon
                      size={15}
                      className={`shrink-0 ${isSoloActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                    />
                    <span className="nav-copy flex-1 truncate">{soloItem.label}</span>
                  </a>
                </section>
              );
            }

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
                    {number}
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
                        <a
                          key={item.id}
                          href={VIEW_TO_PATH[item.id] || '#'}
                          title={item.label}
                          aria-label={item.label}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={(e) => {
                            if (item.id !== 'passwords') e.preventDefault();
                            handleItemClick(item.id);
                          }}
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
                        </a>
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
