import React, { useState } from 'react';
import { Program } from '../../types';
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  X, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export interface ExamFilterState {
  search: string;
  school: string;
  program: string;
  examType: string;
  semester: string;
  session: string;
  startDate: string;
  endDate: string;
  minStudents: string;
  maxStudents: string;
}

interface AdvancedExamFilterProps {
  filters: ExamFilterState;
  onChange: (filters: ExamFilterState) => void;
  schools: string[];
  programs: Program[];
  totalCount: number;
  filteredCount: number;
}

export const AdvancedExamFilter: React.FC<AdvancedExamFilterProps> = ({
  filters,
  onChange,
  schools,
  programs,
  totalCount,
  filteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (partial: Partial<ExamFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const handleReset = () => {
    onChange({
      search: '',
      school: 'ALL',
      program: 'ALL',
      examType: 'ALL',
      semester: 'ALL',
      session: 'ALL',
      startDate: '',
      endDate: '',
      minStudents: '',
      maxStudents: '',
    });
  };

  // Count active non-default filters
  const activeFilterCount = [
    filters.search !== '',
    filters.school !== 'ALL',
    filters.program !== 'ALL',
    filters.examType !== 'ALL',
    filters.semester !== 'ALL',
    filters.session !== 'ALL',
    filters.startDate !== '',
    filters.endDate !== '',
    filters.minStudents !== '',
    filters.maxStudents !== '',
  ].filter(Boolean).length;

  // Preset Date range helpers (Exam dates in sample: 14/05/2026 to 20/05/2026)
  const applyDatePreset = (start: string, end: string) => {
    update({ startDate: start, endDate: end });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-4 transition-all">
      {/* Primary Bar: Multi-field Search & Quick Controls */}
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Robust Search across multiple fields */}
          <div className="relative flex-1 min-w-[240px] max-w-lg">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search across Paper Code, Subject Name, Program, PKG #..."
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

          {/* Quick Exam Type dropdown */}
          <select
            value={filters.examType}
            onChange={(e) => update({ examType: e.target.value })}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Exam Types</option>
            <option value="Regular">Regular Only</option>
            <option value="Backlog">Backlog Only</option>
            <option value="Both">Both (Reg & Backlog)</option>
          </select>

          {/* Quick Session dropdown */}
          <select
            value={filters.session}
            onChange={(e) => update({ session: e.target.value })}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Sessions</option>
            <option value="AM">Morning (AM)</option>
            <option value="PM">Afternoon (PM)</option>
          </select>
        </div>

        {/* Right side: Filter toggle & active stats */}
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
            <span className="font-bold text-slate-800">{filteredCount}</span> of {totalCount} papers
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {isExpanded && (
        <div className="p-4 bg-slate-50/40 border-t border-slate-200 space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* School Filter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Institutional School
              </label>
              <select
                value={filters.school}
                onChange={(e) => update({ school: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Schools ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Program Filter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Academic Program Code
              </label>
              <select
                value={filters.program}
                onChange={(e) => update({ program: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Programs</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.program_code}>
                    {p.program_code} - {p.program_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Semester
              </label>
              <select
                value={filters.semester}
                onChange={(e) => update({ semester: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Count Range Filter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Student Count Range
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min (e.g. 1)"
                  value={filters.minStudents}
                  onChange={(e) => update({ minStudents: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="number"
                  placeholder="Max (e.g. 50)"
                  value={filters.maxStudents}
                  onChange={(e) => update({ maxStudents: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Date Range Section */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Exam Date Window:</span>
              </span>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono"
                />
              </div>

              {(filters.startDate || filters.endDate) && (
                <button
                  onClick={() => update({ startDate: '', endDate: '' })}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                >
                  Clear dates
                </button>
              )}
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Exam Period Presets:</span>
              <button
                onClick={() => applyDatePreset('2026-05-14', '2026-05-16')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] transition-colors"
              >
                May 14 - 16
              </button>
              <button
                onClick={() => applyDatePreset('2026-05-17', '2026-05-20')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] transition-colors"
              >
                May 17 - 20
              </button>
              <button
                onClick={() => applyDatePreset('2026-05-14', '2026-05-31')}
                className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] transition-colors"
              >
                Full May 2026 Window
              </button>
            </div>
          </div>

          {/* Quick Student Size Presets */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cohort Size Presets:</span>
            </span>
            <button
              onClick={() => update({ minStudents: '1', maxStudents: '10' })}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px]"
            >
              Small Cohort (&lt; 10)
            </button>
            <button
              onClick={() => update({ minStudents: '11', maxStudents: '30' })}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px]"
            >
              Medium Cohort (11 - 30)
            </button>
            <button
              onClick={() => update({ minStudents: '31', maxStudents: '200' })}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px]"
            >
              Large Hall Cohort (&gt; 30)
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Badges */}
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

          {filters.school !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              School: {filters.school}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ school: 'ALL' })} />
            </span>
          )}

          {filters.program !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Program: {filters.program}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ program: 'ALL' })} />
            </span>
          )}

          {filters.examType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Type: {filters.examType}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ examType: 'ALL' })} />
            </span>
          )}

          {filters.session !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs">
              Session: {filters.session}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ session: 'ALL' })} />
            </span>
          )}

          {(filters.startDate || filters.endDate) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs font-mono">
              Dates: {filters.startDate || '*'} to {filters.endDate || '*'}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ startDate: '', endDate: '' })} />
            </span>
          )}

          {(filters.minStudents || filters.maxStudents) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-indigo-700 border border-indigo-200 text-[11px] font-medium shadow-2xs font-mono">
              Students: {filters.minStudents || '0'} - {filters.maxStudents || '∞'}
              <X className="w-3 h-3 cursor-pointer hover:text-indigo-900" onClick={() => update({ minStudents: '', maxStudents: '' })} />
            </span>
          )}
        </div>
      )}
    </div>
  );
};
