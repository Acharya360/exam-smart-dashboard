import React, { useMemo, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, UploadCloud, Search, Download, ShieldAlert, Copy, FileWarning } from 'lucide-react';
import type { ValidationResult, ValidationStatus, ValidatedRow } from '../../utils/validation';
import { generateImportErrorReport } from '../../utils/validation';

type FilterKey = 'ALL' | 'VALID' | 'INVALID' | 'DUPLICATE' | 'WARNING';

interface ImportPreviewDashboardProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rows: ValidatedRow<T>[]) => Promise<void> | void;
  result: ValidationResult<T>;
  columns: Array<{ key: string; label: string; width?: string }>;
  isSaving?: boolean;
}

const STATUS_STYLE: Record<ValidationStatus, string> = {
  valid: 'bg-emerald-100 text-emerald-800',
  invalid: 'bg-rose-100 text-rose-800',
  duplicate: 'bg-orange-100 text-orange-800',
  warning: 'bg-amber-100 text-amber-800',
};

function ImportPreviewDashboardInner<T>({
  isOpen, onClose, onConfirm, result, columns, isSaving = false,
}: ImportPreviewDashboardProps<T>) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');

  const counts = result.summary;
  const canImport = counts.importableRows > 0 && !result.hasCritical;

  const filtered = useMemo(() => {
    return result.rows.filter((r) => {
      if (filter !== 'ALL' && r.status !== filter.toLowerCase()) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return Object.values(r.raw).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [result.rows, filter, search]);

  if (!isOpen) return null;

  const importable = result.rows.filter((r) => r.status === 'valid' || r.status === 'warning');

  const kpis: Array<{ label: string; value: number; tone: string; icon: React.ReactNode }> = [
    { label: 'Total Rows', value: counts.totalRows, tone: 'bg-slate-100 text-slate-700', icon: <UploadCloud className="w-4 h-4" /> },
    { label: 'Valid', value: counts.validRows, tone: 'bg-emerald-50 text-emerald-600', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Invalid', value: counts.invalidRows, tone: 'bg-rose-50 text-rose-600', icon: <AlertTriangle className="w-4 h-4" /> },
    { label: 'Duplicates', value: counts.duplicateRows, tone: 'bg-orange-50 text-orange-600', icon: <Copy className="w-4 h-4" /> },
    { label: 'Warnings', value: counts.warningRows, tone: 'bg-amber-50 text-amber-600', icon: <FileWarning className="w-4 h-4" /> },
    { label: 'Importable', value: counts.importableRows, tone: 'bg-indigo-50 text-indigo-600', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const tabs: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: counts.totalRows },
    { key: 'VALID', label: 'Valid', count: counts.validRows },
    { key: 'INVALID', label: 'Invalid', count: counts.invalidRows },
    { key: 'DUPLICATE', label: 'Duplicates', count: counts.duplicateRows },
    { key: 'WARNING', label: 'Warnings', count: counts.warningRows },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {result.moduleName} Import Preview
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700">{counts.totalRows} rows</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Normalized, master-validated and de-duplicated before any database write. Review, correct, then import.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => generateImportErrorReport(result)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
            >
              <Download className="w-4 h-4" /> Error Report (.xlsx)
            </button>
            <button onClick={onClose} disabled={isSaving} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {result.hasCritical && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Import is blocked: critical validation errors must be corrected first. Download the error report to fix and re-upload.
          </div>
        )}

        {/* KPI cards */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 grid grid-cols-3 sm:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-2xs">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${k.tone}`}>{k.icon}</div>
              <div>
                <div className="text-sm font-bold text-slate-900">{k.value}</div>
                <div className="text-[10px] text-slate-500 font-medium">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + search */}
        <div className="px-6 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  filter === t.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label} <span className="opacity-70">({t.count})</span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search any value..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">Row</th>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2.5" style={c.width ? { minWidth: c.width } : undefined}>{c.label}</th>
                ))}
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 min-w-[240px]">Issues / Suggestions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.index} className="hover:bg-indigo-50/20 align-top">
                  <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{r.excelRow}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-slate-700">{r.raw[c.key] || <span className="text-slate-300">—</span>}</td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    {r.issues.length === 0 ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {r.issues.map((i, idx) => (
                          <li key={idx} className={i.severity === 'warning' ? 'text-amber-700' : 'text-rose-700'}>
                            <span className="font-semibold">{i.fieldLabel}:</span> {i.message}
                            {i.suggestedCorrection && <span className="text-slate-500"> → {i.suggestedCorrection}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={columns.length + 3} className="px-3 py-8 text-center text-slate-400">No rows match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{importable.length}</span> row(s) eligible for import · {counts.invalidRows + counts.duplicateRows} blocked.
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-100">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(importable)}
              disabled={isSaving || !canImport}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {isSaving ? 'Importing...' : `Confirm & Import (${importable.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ImportPreviewDashboard = ImportPreviewDashboardInner as <T>(
  props: ImportPreviewDashboardProps<T>
) => React.ReactElement | null;
