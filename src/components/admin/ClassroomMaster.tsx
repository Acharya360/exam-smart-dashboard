import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/db';
import { Classroom } from '../../types';
import * as XLSX from 'xlsx';
import { ClassroomUploadModal, downloadClassroomTemplate } from './ClassroomUploadModal';
import {
  Building2,
  Video,
  CheckSquare,
  Square,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Download,
  UploadCloud,
  Search,
  Filter,
  Edit2,
  Trash2,
  Grid,
  List,
  Eye,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  SlidersHorizontal,
  Armchair,
  Wind,
  Accessibility
} from 'lucide-react';

interface ClassroomMasterProps {
  onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export const ClassroomMaster: React.FC<ClassroomMasterProps> = ({ onNavigate }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('ALL');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [cctvOnly, setCctvOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Classroom> | null>(null);
  const [previewRoom, setPreviewRoom] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Classrooms
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.getClassrooms();
      setClassrooms(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load classroom venues.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  // Filtered Options
  const buildings = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach(c => c.building_name && set.add(c.building_name));
    return Array.from(set).sort();
  }, [classrooms]);

  const floors = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach(c => c.floor && set.add(c.floor));
    return Array.from(set).sort();
  }, [classrooms]);

  const roomTypes = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach(c => c.room_type && set.add(c.room_type));
    return Array.from(set).sort();
  }, [classrooms]);

  // Filtered List
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(c => {
      const matchSearch =
        searchQuery === '' ||
        c.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.building_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.floor && c.floor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchBuilding = selectedBuilding === 'ALL' || c.building_name === selectedBuilding;
      const matchFloor = selectedFloor === 'ALL' || c.floor === selectedFloor;
      const matchType = selectedType === 'ALL' || c.room_type === selectedType;
      const matchCctv = !cctvOnly || c.has_cctv;

      return matchSearch && matchBuilding && matchFloor && matchType && matchCctv;
    });
  }, [classrooms, searchQuery, selectedBuilding, selectedFloor, selectedType, cctvOnly]);

  // KPI Calculations
  const totalVenues = classrooms.length;
  const totalExamCapacity = classrooms.reduce((acc, c) => acc + (c.is_active ? c.exam_capacity : 0), 0);
  const totalGeneralCapacity = classrooms.reduce((acc, c) => acc + c.total_capacity, 0);
  const totalInvigilators = classrooms.reduce((acc, c) => acc + (c.is_active ? (c.invigilator_count || 1) : 0), 0);
  const cctvCount = classrooms.filter(c => c.has_cctv).length;
  const accessibleCount = classrooms.filter(c => c.is_accessible).length;

  // Handle Save (Add / Edit)
  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editingRoom.room_number || !editingRoom.building_name || !editingRoom.exam_capacity) {
      setError('Please provide room number, building name, and exam capacity.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (editingRoom.id) {
        await db.updateClassroom(editingRoom.id, editingRoom);
        setSuccessMessage(`Venue "${editingRoom.room_number}" updated successfully.`);
      } else {
        await db.createClassroom(editingRoom);
        setSuccessMessage(`Venue "${editingRoom.room_number}" added successfully.`);
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      await fetchClassrooms();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save classroom.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  // Bulk selection calculations
  const isAllSelected = useMemo(() => {
    return filteredClassrooms.length > 0 && filteredClassrooms.every(c => selectedIds.includes(c.id));
  }, [filteredClassrooms, selectedIds]);

  const isSomeSelected = useMemo(() => {
    return filteredClassrooms.some(c => selectedIds.includes(c.id)) && !isAllSelected;
  }, [filteredClassrooms, selectedIds, isAllSelected]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClassrooms.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmText = `Are you sure you want to delete ${selectedIds.length} selected examination venue(s)? This action cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    try {
      setIsBulkDeleting(true);
      setError(null);
      const res = await db.deleteClassrooms(selectedIds);
      if (res.success) {
        setSuccessMessage(res.message || `Successfully removed ${res.count} venues.`);
        setSelectedIds([]);
        await fetchClassrooms();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete selected venues.';
      setError(msg);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle Delete
  const handleDeleteClassroom = async (id: string, roomNumber: string) => {
    if (!window.confirm(`Are you sure you want to remove exam venue "${roomNumber}"?`)) return;
    try {
      setIsDeleting(id);
      setError(null);
      const res = await db.deleteClassroom(id);
      if (res.success) {
        setSuccessMessage(`Classroom "${roomNumber}" removed.`);
        await fetchClassrooms();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete classroom.';
      setError(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  // Export All Venues to Excel
  const handleExportExcel = () => {
    const exportData = filteredClassrooms.map((c, idx) => ({
      'Sr. No.': idx + 1,
      'Room Number': c.room_number,
      'Building Name': c.building_name,
      'Floor': c.floor || 'Ground Floor',
      'Room Type': c.room_type,
      'Total Capacity': c.total_capacity,
      'Exam Capacity': c.exam_capacity,
      'Invigilator Count': c.invigilator_count || 1,
      'Desk Matrix (Rows x Cols)': `${c.rows_count} x ${c.columns_count}`,
      'CCTV Monitored': c.has_cctv ? 'YES' : 'NO',
      'Air Conditioned': c.has_ac ? 'YES' : 'NO',
      'Specially-Abled Accessible': c.is_accessible ? 'YES' : 'NO',
      'Active for Exams': c.is_active ? 'YES' : 'NO',
      'Notes': c.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Examination_Venues');
    XLSX.writeFile(wb, `SSPU_Classroom_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classroom Master & Examination Venues</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage physical campus halls, exam blocks, seating capacities, CCTV coverage, and desk layout matrices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('seatingMaster')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
              title="Proceed to Hall Seating Plan Engine"
            >
              <Armchair className="w-4 h-4 text-indigo-600" />
              <span>Proceed to Seating Master →</span>
            </button>
          )}
          <button
            onClick={downloadClassroomTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Download Excel Template"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Excel Template</span>
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
            title="Import Venues from Excel"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600" />
            <span>Import Venues</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <span>Export Data</span>
          </button>

          <button
            onClick={() => {
              setEditingRoom({
                room_number: '',
                building_name: 'Central Examination Complex',
                floor: 'Ground Floor',
                room_type: 'Classroom',
                total_capacity: 60,
                exam_capacity: 30,
                rows_count: 5,
                columns_count: 6,
                has_cctv: true,
                has_ac: false,
                is_accessible: true,
                is_active: true,
                notes: ''
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Classroom Venue</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalVenues}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Venues</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalExamCapacity.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam Seats</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalInvigilators.toLocaleString()}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invigilators Needed</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{cctvCount} / {totalVenues}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CCTV Monitored</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
            <Accessibility className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{accessibleCount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Wheelchair Ready</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Control Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by hall number, building, floor or remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title={viewMode === 'table' ? 'Switch to Cards View' : 'Switch to Table View'}
            >
              {viewMode === 'table' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>

            <button
              onClick={fetchClassrooms}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Refresh venues list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Filter by:</span>
          </div>

          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Buildings ({buildings.length})</option>
            {buildings.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Floors ({floors.length})</option>
            {floors.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Types ({roomTypes.length})</option>
            {roomTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 ml-auto text-slate-700 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={cctvOnly}
              onChange={(e) => setCctvOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-purple-600" />
              <span>CCTV Coverage Only</span>
            </span>
          </label>
        </div>
      </div>


      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-indigo-50 border-2 border-indigo-200 rounded-2xl shadow-xs text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{selectedIds.length}</span>
            </span>
            <span className="font-bold text-indigo-950">
              {selectedIds.length} of {classrooms.length} venue(s) selected
            </span>
            <span className="text-slate-400">|</span>
            <button
              onClick={handleSelectAll}
              className="text-indigo-700 hover:text-indigo-900 font-semibold underline cursor-pointer"
            >
              {isAllSelected ? 'Deselect all' : `Select all ${filteredClassrooms.length} filtered`}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-slate-600 hover:bg-white rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isBulkDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area: Table View or Cards View */}
      {loading && classrooms.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading university examination venues...</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No examination venues found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No classrooms matched your filter criteria. Clear filters or add a new examination hall.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBuilding('ALL');
              setSelectedFloor('ALL');
              setSelectedType('ALL');
              setCctvOnly(false);
            }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      title="Select All Filtered"
                    />
                  </th>
                  <th className="py-3 px-4">Hall / Room</th>
                  <th className="py-3 px-4">Building & Floor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Exam Capacity</th>
                  <th className="py-3 px-4 text-center">Invigilators</th>
                  <th className="py-3 px-4 text-center">Desk Layout</th>
                  <th className="py-3 px-4">Features</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClassrooms.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                  <tr key={c.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/60'}`}>
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(c.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.room_number}</span>
                      </div>
                      {c.notes && <div className="text-[11px] font-normal text-slate-500 mt-0.5 line-clamp-1">{c.notes}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">{c.building_name}</div>
                      <div className="text-[11px] text-slate-500">{c.floor || 'Ground Floor'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {c.room_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-black text-slate-900">{c.exam_capacity}</span>
                        <span className="text-[10px] text-slate-400">Total: {c.total_capacity}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Users className="w-3 h-3" />
                        <span>{c.invigilator_count || 1} Staff</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 font-mono font-bold text-[11px]">
                        {c.rows_count} × {c.columns_count}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {c.has_cctv && (
                          <span className="p-1 rounded bg-purple-50 text-purple-700 border border-purple-200" title="CCTV Monitored">
                            <Video className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {c.has_ac && (
                          <span className="p-1 rounded bg-sky-50 text-sky-700 border border-sky-200" title="Air Conditioned">
                            <Wind className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {c.is_accessible && (
                          <span className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Ground Floor / Specially-Abled Accessible">
                            <Accessibility className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewRoom(c)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Visual Bench Layout Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingRoom({ ...c });
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Classroom Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClassroom(c.id, c.room_number)}
                          disabled={isDeleting === c.id}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Classroom"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassrooms.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            return (
            <div key={c.id} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${isSelected ? 'bg-indigo-50/30 border-indigo-400 ring-2 ring-indigo-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(c.id)}
                      className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer shrink-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">{c.room_type}</span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{c.room_number}</h3>
                      <p className="text-xs text-slate-500">{c.building_name} • {c.floor || 'Ground Floor'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {c.has_cctv && (
                      <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg" title="CCTV Monitored">
                        <Video className="w-4 h-4" />
                      </span>
                    )}
                    {c.is_accessible && (
                      <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg" title="Accessible">
                        <Accessibility className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>

                {c.notes && (
                  <p className="text-xs text-slate-600 mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100 line-clamp-2">
                    {c.notes}
                  </p>
                )}

                <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Exam Seats</div>
                    <div className="text-base font-black text-slate-900">{c.exam_capacity}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Total Cap</div>
                    <div className="text-base font-black text-slate-900">{c.total_capacity}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Invigilators</div>
                    <div className="text-base font-black text-indigo-700">{c.invigilator_count || 1}</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-medium">Matrix</div>
                    <div className="text-xs font-black text-slate-900 font-mono mt-1">{c.rows_count}×{c.columns_count}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPreviewRoom(c)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Layout</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingRoom({ ...c });
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClassroom(c.id, c.room_number)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Visual Bench Layout Preview Modal */}
      {previewRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Floor Bench Layout — {previewRoom.room_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewRoom.building_name} ({previewRoom.floor}) • {previewRoom.exam_capacity} Exam Desks ({previewRoom.rows_count} Rows × {previewRoom.columns_count} Columns) • {previewRoom.invigilator_count || 1} Invigilator Staff
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewRoom(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Blackboard / Invigilator Podium Front Indicator */}
            <div className="my-4 p-2.5 bg-slate-800 text-white text-center rounded-xl font-bold tracking-wider text-xs uppercase shadow-inner">
              ✦ University Invigilator Desk & Stage / Blackboard (Front of Hall) ✦
            </div>

            {/* Desk Grid Representation */}
            <div className="flex-1 overflow-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div
                className="grid gap-2.5 mx-auto justify-center"
                style={{
                  gridTemplateColumns: `repeat(${previewRoom.columns_count}, minmax(48px, 1fr))`
                }}
              >
                {Array.from({ length: previewRoom.rows_count }).map((_, rIdx) => {
                  const rowLabel = String.fromCharCode(65 + rIdx);
                  return Array.from({ length: previewRoom.columns_count }).map((_, cIdx) => {
                    const seatNum = `${rowLabel}${cIdx + 1}`;
                    const seatIndex = rIdx * previewRoom.columns_count + cIdx;
                    const isExceedingExamCap = seatIndex >= previewRoom.exam_capacity;

                    return (
                      <div
                        key={seatNum}
                        className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                          isExceedingExamCap
                            ? 'bg-slate-200 border-dashed border-slate-300 text-slate-400'
                            : (rIdx + cIdx) % 2 === 0
                            ? 'bg-white border-indigo-200 text-indigo-900 shadow-xs hover:border-indigo-500 hover:scale-105'
                            : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-xs hover:border-emerald-500 hover:scale-105'
                        }`}
                      >
                        <span className="text-xs font-black font-mono">{seatNum}</span>
                        <span className="text-[9px] uppercase font-semibold mt-0.5 opacity-70">
                          {isExceedingExamCap ? 'Spare' : (rIdx + cIdx) % 2 === 0 ? 'Paper A' : 'Paper B'}
                        </span>
                      </div>
                    );
                  });
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-white border border-indigo-300"></div>
                  <span>Paper Series A (Checkerboard)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-300"></div>
                  <span>Paper Series B (Anti-Cheating Alternation)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-slate-200 border border-dashed border-slate-300"></div>
                  <span>Buffer / Spare Capacity</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setPreviewRoom(null)}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Classroom Modal */}
      {isModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingRoom.id ? 'Edit Examination Venue' : 'Add Examination Venue'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure classroom coordinates, capacity limits, and physical desk dimensions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingRoom(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room / Hall Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Hall A or LH-101"
                    value={editingRoom.room_number || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, room_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room Type</label>
                  <select
                    value={editingRoom.room_type || 'Classroom'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                  >
                    <option value="Classroom">Classroom</option>
                    <option value="Lecture Hall">Lecture Hall</option>
                    <option value="Exam Center">Central Exam Center</option>
                    <option value="Design Studio">Design Studio</option>
                    <option value="Computer Lab">Computer Lab (Online Exam)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Building / School *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Central Examination Complex"
                    value={editingRoom.building_name || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, building_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Floor Level</label>
                  <select
                    value={editingRoom.floor || 'Ground Floor'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="4th Floor">4th Floor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 30"
                    value={editingRoom.exam_capacity || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const rows = Math.max(1, Math.ceil(Math.sqrt(val || 30)));
                      const cols = Math.max(1, Math.ceil((val || 30) / rows));
                      setEditingRoom({
                        ...editingRoom,
                        exam_capacity: val,
                        total_capacity: editingRoom.total_capacity || val * 2,
                        rows_count: rows,
                        columns_count: cols
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Exam seat count</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRoom.total_capacity || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, total_capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-medium"
                  />
                  <span className="text-[10px] text-slate-400">Classroom capacity</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invigilators *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingRoom.invigilator_count || 1}
                    onChange={(e) => setEditingRoom({ ...editingRoom, invigilator_count: Math.max(1, Number(e.target.value)) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Invigilation staff</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desk Rows (Length)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRoom.rows_count || 5}
                    onChange={(e) => setEditingRoom({ ...editingRoom, rows_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desk Columns (Width)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingRoom.columns_count || 6}
                    onChange={(e) => setEditingRoom({ ...editingRoom, columns_count: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Amenity Toggles */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-700 block">Amenities & Security</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.has_cctv ?? true}
                      onChange={(e) => setEditingRoom({ ...editingRoom, has_cctv: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-medium">CCTV Monitored</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.has_ac ?? false}
                      onChange={(e) => setEditingRoom({ ...editingRoom, has_ac: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-medium">Air Conditioned</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.is_accessible ?? true}
                      onChange={(e) => setEditingRoom({ ...editingRoom, is_accessible: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-medium">Wheelchair Accessible</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRoom.is_active ?? true}
                      onChange={(e) => setEditingRoom({ ...editingRoom, is_active: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-medium">Active for Exams</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks & Security Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Near main security vault, high-resolution 360-degree dome cameras installed"
                  value={editingRoom.notes || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors shadow-sm"
                >
                  {loading ? 'Saving...' : editingRoom.id ? 'Save Changes' : 'Add Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Classroom Excel Upload Modal */}
      <ClassroomUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          void fetchClassrooms();
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
      />
    </div>
  );
};
