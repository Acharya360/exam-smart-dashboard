import React, { useState } from 'react';
import { Program, UserProfile } from '../../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  X, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface TaskFilterState {
  search: string;
  status: string;
  assigneeId: string;
  program: string;
  dueDatePreset: string; // 'ALL' | 'OVERDUE' | 'NEXT_48H' | 'THIS_WEEK' | 'CUSTOM'
  startDate: string;
  endDate: string;
}

interface AdvancedTaskFilterProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  programs: Program[];
  users: UserProfile[];
  currentUserId: string;
  totalCount: number;
  filteredCount: number;
}

export const AdvancedTaskFilter: React.FC<AdvancedTaskFilterProps> = ({
  filters,
  onChange,
  programs,
  users,
  currentUserId,
  totalCount,
  filteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (partial: Partial<TaskFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const handleReset = () => {
    onChange({
      search: '',
      status: 'ALL',
      assigneeId: 'ALL',
      program: 'ALL',
      dueDatePreset: 'ALL',
      startDate: '',
      endDate: '',
    });
  };

  const activeFilterCount = [
    filters.search !== '',
    filters.status !== 'ALL',
    filters.assigneeId !== 'ALL',
    filters.program !== 'ALL',
    filters.dueDatePreset !== 'ALL',
    filters.startDate !== '',
    filters.endDate !== '',
  ].filter(Boolean).length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-4 transition-all">
      {/* Primary Bar */}
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Robust Search across task title, program, paper, notes */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search across task title, notes, program code, subject code..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
            />
            {filters.search && (
              <button
                onClick={() => update({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Status Dropdown */}
          <select
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Task Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ESCALATED_TO_ALTERNATE">Escalated to Alternate</option>
          </select>

          {/* Quick Assignee Dropdown */}
          <select
            value={filters.assigneeId}
            onChange={(e) => update({ assigneeId: e.target.value })}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Assignees</option>
            <option value="ME_PRIMARY">Assigned to Me (Primary)</option>
            <option value="ME_ALTERNATE">Escalated to Me (Alternate)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* Right side: Advanced toggle & Count */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
              isExpanded || activeFilterCount > 0
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-[10px] bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          <div className="text-xs text-slate-500 font-mono tabular-nums pl-1 border-l border-slate-200">
            <span className="font-bold text-slate-800">{filteredCount}</span> of {totalCount} tasks
          </div>
        </div>
      </div>

      {/* Expandable Advanced Section */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/40 border-t border-slate-200 space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Program Filter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Academic Program
              </label>
              <select
                value={filters.program}
                onChange={(e) => update({ program: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Academic Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.program_code}>
                    {p.program_code} - {p.program_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date Window Presets */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Due Date Timeline
              </label>
              <select
                value={filters.dueDatePreset}
                onChange={(e) => update({ dueDatePreset: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Due Dates</option>
                <option value="OVERDUE">Overdue Tasks</option>
                <option value="NEXT_48H">Due in Next 48 Hours</option>
                <option value="THIS_WEEK">Due This Week (May 10 - 17)</option>
                <option value="CUSTOM">Custom Date Window</option>
              </select>
            </div>

            {/* Custom Date Window */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Custom Due Date Range
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => update({ startDate: e.target.value, dueDatePreset: 'CUSTOM' })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => update({ endDate: e.target.value, dueDatePreset: 'CUSTOM' })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
            <span className="font-semibold text-slate-700 text-xs">Quick Focus:</span>
            <button
              onClick={() => update({ status: 'ESCALATED_TO_ALTERNATE' })}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                filters.status === 'ESCALATED_TO_ALTERNATE'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              ⚠ Alternate Escalations
            </button>
            <button
              onClick={() => update({ status: 'PENDING' })}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                filters.status === 'PENDING'
                  ? 'bg-slate-200 text-slate-900 border-slate-400 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              Pending Compliance
            </button>
            <button
              onClick={() => update({ dueDatePreset: 'OVERDUE' })}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                filters.dueDatePreset === 'OVERDUE'
                  ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              Overdue Milestones
            </button>
            <button
              onClick={() => update({ assigneeId: 'ME_PRIMARY' })}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                filters.assigneeId === 'ME_PRIMARY'
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              My Action Items
            </button>
          </div>
        </div>
      )}

      {/* Active Criteria Chips */}
      {activeFilterCount > 0 && (
        <div className="px-3.5 py-2 bg-indigo-50/50 border-t border-indigo-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-indigo-900 mr-1">
            Active Criteria:
          </span>

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Search: "{filters.search}"
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ search: '' })} />
            </span>
          )}

          {filters.status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Status: {filters.status.replace(/_/g, ' ')}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ status: 'ALL' })} />
            </span>
          )}

          {filters.assigneeId !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Assignee: {
                filters.assigneeId === 'ME_PRIMARY'
                  ? 'Me (Primary)'
                  : filters.assigneeId === 'ME_ALTERNATE'
                  ? 'Me (Alternate)'
                  : users.find((u) => u.id === filters.assigneeId)?.full_name || filters.assigneeId
              }
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ assigneeId: 'ALL' })} />
            </span>
          )}

          {filters.program !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Program: {filters.program}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ program: 'ALL' })} />
            </span>
          )}

          {filters.dueDatePreset !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Due: {filters.dueDatePreset}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ dueDatePreset: 'ALL' })} />
            </span>
          )}

          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs font-mono">
              Dates: {filters.startDate || '*'} to {filters.endDate || '*'}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ startDate: '', endDate: '' })} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
