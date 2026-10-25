import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Building2,
  Users,
  Armchair,
  Video,
  Download,
  AlertCircle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../services/db';
import type { Classroom } from '../../types';

interface ClassroomUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function downloadClassroomTemplate() {
  const templateData = [
    {
      ID: 1,
      Room_Number: 'A306',
      Building_Name: 'Admin Building',
      Floor: 'Ground Floor',
      Room_Type: 'Exam Center',
      Total_Capacity: 13,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'NO',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: 'Main Admin Block - Ground Floor'
    },
    {
      ID: 2,
      Room_Number: 'A307-A',
      Building_Name: 'Admin Building',
      Floor: 'Ground Floor',
      Room_Type: 'Exam Center',
      Total_Capacity: 35,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'NO',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: ''
    },
    {
      ID: 3,
      Room_Number: 'A307-B',
      Building_Name: 'Admin Building',
      Floor: 'Ground Floor',
      Room_Type: 'Exam Center',
      Total_Capacity: 35,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'NO',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: ''
    },
    {
      ID: 4,
      Room_Number: 'E101',
      Building_Name: 'Engineering Building',
      Floor: 'Ground Floor',
      Room_Type: 'Exam Center',
      Total_Capacity: 40,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'YES',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: '360 HD CCTV installed'
    },
    {
      ID: 5,
      Room_Number: 'M201',
      Building_Name: 'Management Building',
      Floor: 'Ground Floor',
      Room_Type: 'Exam Center',
      Total_Capacity: 30,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'NO',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: ''
    },
    {
      ID: 6,
      Room_Number: 'Studio A-101',
      Building_Name: 'Admin Building',
      Floor: 'Ground Floor',
      Room_Type: 'Design Studio',
      Total_Capacity: 25,
      Invigilator_Count: 1,
      Has_CCTV: 'YES',
      Has_AC: 'YES',
      Is_Accessible: 'YES',
      Is_Active: 'YES',
      Notes: 'Architecture drafting tables equipped'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData, {
    header: [
      'ID',
      'Room_Number',
      'Building_Name',
      'Floor',
      'Room_Type',
      'Total_Capacity',
      'Invigilator_Count',
      'Has_CCTV',
      'Has_AC',
      'Is_Accessible',
      'Is_Active',
      'Notes'
    ]
  });

  ws['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Classroom_Master_Template');
  XLSX.writeFile(wb, 'SSPU_Classroom_Master_Template.xlsx');
}

export function parseClassroomRow(r: Record<string, unknown>): Partial<Classroom> {
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]/g, '');
  const get = (...names: string[]) => {
    for (const n of names) {
      const key = Object.keys(r).find(k => norm(k) === n);
      if (key !== undefined) {
        const v = r[key];
        if (v !== null && v !== undefined && String(v).trim() !== '') return String(v).trim();
      }
    }
    return '';
  };

  const parseBool = (val: string, def = true) => {
    if (!val) return def;
    const s = val.toUpperCase();
    if (s.includes('Y') || s === 'TRUE' || s === '1') return true;
    if (s.includes('N') || s === 'FALSE' || s === '0') return false;
    return def;
  };

  const roomNumber = get('roomnumber', 'room', 'hallnumber', 'hall');
  const buildingName = get('buildingname', 'building', 'school') || 'Main Campus';
  const floor = get('floor', 'floorlevel') || 'Ground Floor';
  const roomType = get('roomtype', 'type') || 'Exam Center';

  const totalCapRaw = get('totalcapacity', 'capacity', 'total');
  const examCapRaw = get('examcapacity', 'examcap', 'seats');
  const totalCap = Number(totalCapRaw) || Number(examCapRaw) || 30;
  const examCap = Number(examCapRaw) || totalCap;

  const invigilatorRaw = get('invigilatorcount', 'invigilators', 'invigilator', 'staff');
  const invigilatorCount = Math.max(1, Number(invigilatorRaw) || 1);

  const rowsRaw = get('rows', 'rowscount');
  const colsRaw = get('columns', 'columnscount', 'cols');
  let rowsCount = Number(rowsRaw) || 0;
  let colsCount = Number(colsRaw) || 0;
  if (!rowsCount || !colsCount) {
    colsCount = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(examCap))));
    rowsCount = Math.ceil(examCap / colsCount);
  }

  const hasCctv = parseBool(get('hascctv', 'cctvmonitored', 'cctv'), true);
  const hasAc = parseBool(get('hasac', 'airconditioned', 'ac'), false);
  const isAccessible = parseBool(get('isaccessible', 'speciallyabledaccessible', 'accessible', 'wheelchair'), true);
  const isActive = parseBool(get('isactive', 'activeforexams', 'active'), true);
  const notes = get('notes', 'remarks', 'remark') || undefined;

  return {
    room_number: roomNumber,
    building_name: buildingName,
    floor,
    room_type: roomType,
    total_capacity: totalCap,
    exam_capacity: examCap,
    invigilator_count: invigilatorCount,
    rows_count: rowsCount,
    columns_count: colsCount,
    has_cctv: hasCctv,
    has_ac: hasAc,
    is_accessible: isAccessible,
    is_active: isActive,
    notes
  };
}

export const ClassroomUploadModal: React.FC<ClassroomUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedVenues, setParsedVenues] = useState<Partial<Classroom>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics
  const stats = useMemo(() => {
    if (!parsedVenues.length) return null;
    const bldgs = new Set<string>();
    let totalCap = 0;
    let totalInvigilators = 0;
    let cctvCount = 0;
    let accessibleCount = 0;
    const invalidRows: { row: number; reason: string }[] = [];

    parsedVenues.forEach((v, idx) => {
      if (!v.room_number || !v.building_name) {
        invalidRows.push({ row: idx + 1, reason: 'Room number or building name missing' });
      }
      if (v.building_name) bldgs.add(v.building_name);
      totalCap += v.exam_capacity || 0;
      totalInvigilators += v.invigilator_count || 1;
      if (v.has_cctv) cctvCount++;
      if (v.is_accessible) accessibleCount++;
    });

    return {
      total: parsedVenues.length,
      buildings: Array.from(bldgs),
      totalCapacity: totalCap,
      totalInvigilators,
      cctvCount,
      accessibleCount,
      invalidRows,
      validCount: parsedVenues.length - invalidRows.length
    };
  }, [parsedVenues]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    setError(null);

    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames.includes('Classroom_Master_Template')
        ? 'Classroom_Master_Template'
        : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error('No worksheets found in workbook.');

      const rawJson = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      if (!rawJson.length) throw new Error(`Worksheet "${sheetName}" contains no data rows.`);

      const parsed = rawJson.map(parseClassroomRow).filter(r => r.room_number);
      setParsedVenues(parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse Excel file.');
      setParsedVenues([]);
    } finally {
      setParsing(false);
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!parsedVenues.length) return;
    setUploading(true);
    setError(null);

    try {
      const validVenues = parsedVenues.filter(v => v.room_number && v.building_name);
      const res = await db.bulkUploadClassrooms(validVenues, mode === 'replace');
      if (res.success) {
        const msg = mode === 'replace'
          ? `Successfully replaced venue registry with ${res.inserted} classrooms from template.`
          : `Successfully processed ${res.total} classroom venues (${res.inserted} added, ${res.updated} updated).`;
        onSuccess(msg);
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error uploading venues to database.');
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setParsedVenues([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Classroom & Venue Master</h2>
              <p className="text-xs text-slate-500">
                Supports SSPU 12-column venue template (Room, Building, Floor, Type, Capacity, Invigilators, CCTV, AC, Accessibility)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-50"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Download Template Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-indigo-600 shrink-0" />
              <span>
                Need the official format? Download the standardized 12-column SSPU Classroom Master template.
              </span>
            </div>
            <button
              onClick={downloadClassroomTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
            >
              <Download size={14} /> Download template (.xlsx)
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Import Error</p>
                <p className="mt-0.5 text-xs text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Dropzone */}
          {!parsedVenues.length && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition hover:border-indigo-500 hover:bg-indigo-50/30 cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md text-indigo-600 group-hover:scale-105 transition">
                <FileSpreadsheet size={28} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">
                {parsing ? 'Parsing Excel spreadsheet...' : 'Choose or drop Classroom Master Excel file'}
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                Reads the <span className="font-semibold text-slate-700">'Classroom_Master_Template'</span> sheet or first worksheet.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <UploadCloud size={16} /> Select Excel File
              </button>
            </div>
          )}

          {/* Parsed File Overview & Validation */}
          {parsedVenues.length > 0 && stats && (
            <div className="space-y-5">
              
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-indigo-600" size={24} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file?.name}</p>
                    <p className="text-xs text-slate-500">
                      {file ? `${(file.size / 1024).toFixed(1)} KB · ` : ''}
                      {parsedVenues.length.toLocaleString()} total venue records parsed
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={resetAll}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Change File
                  </button>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Building2 size={14} /> Total Venues
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Armchair size={14} /> Exam Seating Capacity
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-emerald-700">{stats.totalCapacity.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Users size={14} /> Invigilators Needed
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-indigo-700">{stats.totalInvigilators.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    <Video size={14} /> CCTV Monitored
                  </div>
                  <p className="mt-1.5 text-xl font-bold text-purple-700">{stats.cctvCount} / {stats.total}</p>
                </div>
              </div>

              {/* Building List Tag Pill Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Buildings Detected ({stats.buildings.length}):</span>
                {stats.buildings.map(b => (
                  <span key={b} className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700 border border-indigo-100">
                    {b}
                  </span>
                ))}
              </div>

              {/* Validation Status */}
              {stats.invalidRows.length === 0 ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>All {stats.total} classroom venues</strong> have valid room numbers, buildings, and seating capacities.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {stats.invalidRows.length} rows have missing room numbers or building names.
                    </p>
                    <p className="mt-0.5 text-amber-800">
                      The remaining {stats.validCount} valid venues will be imported.
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Mode Selector */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Import Mode</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    mode === 'append' ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="classroomImportMode"
                      value="append"
                      checked={mode === 'append'}
                      onChange={() => setMode('append')}
                      disabled={uploading}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">🔄 Update Existing & Add New (Safe)</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Updates matching venues by Building + Room Number, adds new venues, and leaves untouched venues intact.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                    mode === 'replace' ? 'border-rose-600 bg-rose-50/40 ring-1 ring-rose-600' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="classroomImportMode"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      disabled={uploading}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-rose-900">⚠️ Clear Current Records & Replace</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Purges current classroom master records and replaces them completely with this uploaded template file.
                      </p>
                    </div>
                  </label>
                </div>

                {mode === 'replace' && (
                  <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">
                    <strong>Warning:</strong> Venues currently allocated to active examination seating plans cannot be purged.
                  </p>
                )}
              </div>

              {/* Data Preview (First 10 rows) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Preview (First 10 venues)</span>
                  <span>Total {parsedVenues.length.toLocaleString()} venues</span>
                </div>
                <div className="max-h-52 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Room Number</th>
                        <th className="px-3 py-2">Building</th>
                        <th className="px-3 py-2">Floor</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-center">Capacity</th>
                        <th className="px-3 py-2 text-center">Invigilators</th>
                        <th className="px-3 py-2 text-center">CCTV</th>
                        <th className="px-3 py-2 text-center">AC</th>
                        <th className="px-3 py-2 text-center">Accessible</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedVenues.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{r.room_number}</td>
                          <td className="px-3 py-1.5">{r.building_name}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.floor}</td>
                          <td className="px-3 py-1.5">
                            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {r.room_type}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold text-slate-800">{r.exam_capacity}</td>
                          <td className="px-3 py-1.5 text-center font-semibold text-indigo-700">{r.invigilator_count || 1}</td>
                          <td className="px-3 py-1.5 text-center">{r.has_cctv ? '✅' : '—'}</td>
                          <td className="px-3 py-1.5 text-center">{r.has_ac ? '❄️' : '—'}</td>
                          <td className="px-3 py-1.5 text-center">{r.is_accessible ? '♿' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>

          {parsedVenues.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading || stats?.validCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Saving Venues…
                </>
              ) : (
                <>
                  <UploadCloud size={14} />
                  Start Import ({stats?.validCount.toLocaleString()} venues)
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
