import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../services/db';
import { Classroom, SeatingPlan, SeatingPlanWithAllocations, SeatingAllocation } from '../../types';
import * as XLSX from 'xlsx';
import {
  Armchair,
  Calendar,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Tag,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Eye,
  Plus,
  ArrowRight,
  Filter,
  Search,
  SlidersHorizontal,
  X,
  CheckSquare,
  Square,
  BookOpen,
  UserCheck,
  UserX,
  ShieldAlert
} from 'lucide-react';

interface SeatingMasterProps {
  onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export const SeatingMaster: React.FC<SeatingMasterProps> = ({ onNavigate }) => {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'plans' | 'generator' | 'viewer'>('plans');

  // Data State
  const [plans, setPlans] = useState<SeatingPlan[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [examSessions, setExamSessions] = useState<{ exam_date: string; am_pm: string; exam_time: string; papers_count: number; estimated_students: number }[]>([]);
  const [activePlan, setActivePlan] = useState<SeatingPlanWithAllocations | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Generator State
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-16');
  const [selectedSlot, setSelectedSlot] = useState<string>('Morning');
  const [sessionTime, setSessionTime] = useState<string>('10:00 AM - 01:00 PM');
  const [planTitle, setPlanTitle] = useState<string>('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [interleaveMode, setInterleaveMode] = useState<string>('PAPERS');
  const [cohortSource, setCohortSource] = useState<'auto' | 'demo' | 'custom'>('demo');
  const [customStudentsText, setCustomStudentsText] = useState<string>('');

  // Viewer State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [printDeliverable, setPrintDeliverable] = useState<'none' | 'notice' | 'attendance' | 'slips'>('none');
  const [selectedSeat, setSelectedSeat] = useState<SeatingAllocation | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plansData, roomsData, sessionsData] = await Promise.all([
        db.getSeatingPlans(),
        db.getClassrooms(),
        db.getSeatingExamSessions()
      ]);
      setPlans(plansData);
      setClassrooms(roomsData.filter(r => r.is_active));
      setExamSessions(sessionsData);

      // Pre-select all rooms by default for generator
      if (roomsData.length > 0) {
        setSelectedRoomIds(roomsData.filter(r => r.is_active).map(r => r.id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load seating plans data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // View full plan details
  const handleOpenPlan = async (planId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const fullPlan = await db.getSeatingPlan(planId);
      setActivePlan(fullPlan);
      if (fullPlan.rooms.length > 0) {
        setSelectedRoomId(fullPlan.rooms[0].classroom.id);
      }
      setActiveTab('viewer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load seating plan details.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (planId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete seating plan "${title}"?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      await db.deleteSeatingPlan(planId);
      setSuccessMessage(`Seating plan "${title}" removed.`);
      if (activePlan?.id === planId) {
        setActivePlan(null);
        setActiveTab('plans');
      }
      await loadInitialData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete seating plan.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Sync Milestone 2
  const handleSyncMilestone2 = async (planId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await db.syncSeatingPlanTasks(planId);
      setSuccessMessage(`Milestone 2 Synchronized: ${res.message}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync Milestone 2.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Run Plan Generation
  const handleGeneratePlan = async () => {
    try {
      setActionLoading(true);
      setError(null);

      let customStudents: any[] = [];
      if (cohortSource === 'custom' && customStudentsText.trim()) {
        const lines = customStudentsText.trim().split('\n');
        customStudents = lines.map((line, idx) => {
          const parts = line.split(/[,\t]/).map(p => p.trim());
          return {
            prn: parts[0] || `2026SSPU${String(idx + 1).padStart(4, '0')}`,
            student_name: parts[1] || `Candidate ${idx + 1}`,
            paper_code: parts[2] || 'CS501',
            subject_name: parts[3] || 'Algorithms',
            program_code: parts[4] || 'SOET-CS',
            program_name: parts[5] || 'Computer Science'
          };
        });
      }

      const payload = {
        examDate: selectedDate,
        slotName: selectedSlot,
        sessionTime,
        title: planTitle.trim() || `Seating Arrangement - ${selectedDate} (${selectedSlot})`,
        selectedRoomIds,
        interleaveMode,
        customStudents: cohortSource === 'custom' ? customStudents : []
      };

      const res = await db.generateSeatingPlan(payload);
      setSuccessMessage(res.message);

      // Reload plans and open the new plan
      await loadInitialData();
      await handleOpenPlan(res.planId);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating seating plan.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle seat attendance
  const handleUpdateSeatAttendance = async (allocId: string, status: 'PRESENT' | 'ABSENT' | 'DEBARRED') => {
    try {
      await db.updateSeatAttendance(allocId, status);
      if (activePlan) {
        const updatedAllocations = activePlan.allocations.map(a =>
          a.id === allocId ? { ...a, attendance_status: status } : a
        );
        const updatedRooms = activePlan.rooms.map(rm => ({
          ...rm,
          allocations: rm.allocations.map(a =>
            a.id === allocId ? { ...a, attendance_status: status } : a
          )
        }));
        setActivePlan({ ...activePlan, allocations: updatedAllocations, rooms: updatedRooms });
        if (selectedSeat?.id === allocId) {
          setSelectedSeat({ ...selectedSeat, attendance_status: status });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update attendance.';
      setError(msg);
    }
  };

  // Export Consolidated Multi-Sheet Excel
  const handleExportConsolidatedExcel = () => {
    if (!activePlan) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Summary
    const summaryRows = activePlan.rooms.map((rm, idx) => ({
      'Sr. No.': idx + 1,
      'Hall / Room Number': rm.classroom.room_number,
      'Building Name': rm.classroom.building_name,
      'Floor': rm.classroom.floor || 'Ground Floor',
      'Room Type': rm.classroom.room_type,
      'Total Exam Desks': rm.classroom.exam_capacity,
      'Students Seated': rm.studentCount,
      'Papers Conducted': rm.papers.map(p => `${p.paper_code} (${p.count})`).join(', ')
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary_All_Halls');

    // Sheets per room: Desk Allocations
    activePlan.rooms.forEach((rm) => {
      const allocRows = rm.allocations.map(a => ({
        'Seat No': a.seat_number,
        'Desk Row': a.row_index + 1,
        'Desk Col': a.col_index + 1,
        'PRN': a.prn,
        'Student Name': a.student_name,
        'Paper Code': a.paper_code,
        'Subject Name': a.subject_name,
        'Program': a.program_name || a.program_code,
        'Booklet No': a.booklet_number || '',
        'Attendance': a.attendance_status
      }));
      const ws = XLSX.utils.json_to_sheet(allocRows);
      const safeSheetName = rm.classroom.room_number.replace(/[:\\/?*[\]]/g, '').slice(0, 30);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });

    XLSX.writeFile(wb, `SSPU_Seating_Plan_${activePlan.exam_date}_${activePlan.slot_name}.xlsx`);
  };

  // Color generator for paper codes to visually show anti-cheating interleaving
  const getPaperColorBadge = (paperCode: string) => {
    const colors = [
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200'
    ];
    let hash = 0;
    for (let i = 0; i < paperCode.length; i++) {
      hash = paperCode.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  // Active selected room in viewer
  const currentRoomData = useMemo(() => {
    if (!activePlan || !selectedRoomId) return null;
    return activePlan.rooms.find(r => r.classroom.id === selectedRoomId) || activePlan.rooms[0] || null;
  }, [activePlan, selectedRoomId]);

  // Total capacity of selected rooms in generator
  const selectedRoomsCapacity = useMemo(() => {
    return classrooms
      .filter(r => selectedRoomIds.includes(r.id))
      .reduce((acc, r) => acc + (r.exam_capacity || 30), 0);
  }, [classrooms, selectedRoomIds]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700">
              <Armchair className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Seating Master & Hall Seating Plans</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Automated room packing, anti-cheating seat interleaving, desk slips, attendance registers, and Milestone 2 synchronization.
              </p>
            </div>
          </div>
        </div>


          {onNavigate && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('classroomMaster')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                title="Manage Classrooms"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Classroom Master</span>
              </button>
              <button
                onClick={() => onNavigate('timetable')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                title="View Timetable"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Timetable</span>
              </button>
            </div>
          )}

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'plans' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Seating Plans ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'generator' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Plan</span>
          </button>

          {activePlan && (
            <button
              onClick={() => setActiveTab('viewer')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'viewer' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Active Plan Chart</span>
            </button>
          )}
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

      {/* =========================================================================
          TAB 1: PLANS HISTORY & LIST
      ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-slate-900">{plans.length}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Generated Plans</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-emerald-600">
                {plans.reduce((acc, p) => acc + (p.total_students || 0), 0)}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Examinees Allocated</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-2xl font-black text-indigo-600">{classrooms.length}</div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Campus Halls</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">Milestone 2 Workflow</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Hall Seating & Attendance</div>
              </div>
              <button
                onClick={() => setActiveTab('generator')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
              >
                + New
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Loading seating plans...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <Armchair className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Seating Plans Generated Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate your first exam seating plan with automated checkerboard anti-cheating interleaving.
              </p>
              <button
                onClick={() => setActiveTab('generator')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Seating Generator</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Exam Session & Date</th>
                      <th className="py-3 px-4">Plan Title</th>
                      <th className="py-3 px-4 text-center">Total Students</th>
                      <th className="py-3 px-4 text-center">Halls Mobilized</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plans.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{p.exam_date}</div>
                          <div className="text-[11px] text-slate-500">{p.slot_name} • {p.session_time || '10:00 AM - 01:00 PM'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{p.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{p.id}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {p.total_students} Candidates
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-slate-700">{p.total_rooms || p.actual_rooms_count} Halls</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{p.status}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPlan(p.id)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View & Print</span>
                            </button>

                            <button
                              onClick={() => handleSyncMilestone2(p.id)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs transition-colors"
                              title="Mark Milestone 2 in Workflow as Completed"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Sync M2</span>
                            </button>

                            <button
                              onClick={() => handleDeletePlan(p.id, p.title)}
                              disabled={actionLoading}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Plan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: SEATING PLAN GENERATOR WIZARD
      ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Automated Seating Plan & Anti-Cheating Interleaving Engine</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an examination date and session. The engine optimizes room utilization and enforces checkerboard interleaving between alternating paper codes so adjacent seats do not have identical question papers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Session Details */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>1. Session & Timing</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Examination Date *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Slot *</label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Morning">Morning Session</option>
                  <option value="Afternoon">Afternoon Session</option>
                  <option value="Evening">Evening Session</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Session Timing String</label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM - 01:00 PM"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>


              {examSessions.length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Scheduled Timetable Sessions (1-Click Select):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {examSessions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedDate(s.exam_date);
                          setSelectedSlot(s.am_pm || 'Morning');
                          if (s.exam_time) setSessionTime(s.exam_time);
                          setPlanTitle(`Seating Arrangement - ${s.exam_date} (${s.am_pm})`);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                          selectedDate === s.exam_date && selectedSlot === s.am_pm
                            ? 'bg-indigo-600 text-white border-indigo-700'
                            : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{s.exam_date}</span>
                        <span className="opacity-70">({s.am_pm})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Plan Title</label>
                <input
                  type="text"
                  placeholder="e.g. End Semester Exam - Day 1"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Step 2: Student Cohort Source */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>2. Examinee Cohort Source</span>
              </h3>

              <div className="space-y-2">
                <label
                  onClick={() => setCohortSource('demo')}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    cohortSource === 'demo' ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="cohort"
                    checked={cohortSource === 'demo'}
                    onChange={() => setCohortSource('demo')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Realistic Multi-Paper Demo Cohort</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Synthesizes 95 students across 3 alternating papers (CS501, ME501, BBA301) for instant anti-cheating verification.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setCohortSource('auto')}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    cohortSource === 'auto' ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="cohort"
                    checked={cohortSource === 'auto'}
                    onChange={() => setCohortSource('auto')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Auto-Detect from Timetable Schedules</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Loads papers scheduled in `dbo.exam_schedules` and registered students for this date.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setCohortSource('custom')}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    cohortSource === 'custom' ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="cohort"
                    checked={cohortSource === 'custom'}
                    onChange={() => setCohortSource('custom')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Custom Roll Numbers (Paste Text)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Paste tab/comma-separated PRN, Name, PaperCode list.
                    </div>
                  </div>
                </label>
              </div>

              {cohortSource === 'custom' && (
                <div>
                  <textarea
                    rows={4}
                    placeholder="PRN, Student Name, Paper Code, Subject Name (one per line)"
                    value={customStudentsText}
                    onChange={(e) => setCustomStudentsText(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Step 3: Anti-Cheating & Venue Selection */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>3. Anti-Cheating & Venue Pool</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Interleaving Mode</label>
                <select
                  value={interleaveMode}
                  onChange={(e) => setInterleaveMode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="PAPERS">Checkerboard (Alternating Question Papers)</option>
                  <option value="PROGRAMS">Programme-Wise Interleaving</option>
                  <option value="SEQUENTIAL">Sequential (Single Paper Halls)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Checkerboard interleaving ensures no examinee shares a paper code with immediate left, right, front, or back neighbours.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Venues to Mobilize ({selectedRoomIds.length} / {classrooms.length})</span>
                  <span className="text-indigo-600 font-mono">{selectedRoomsCapacity} Seats Avail</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                  {classrooms.map((rm) => {
                    const isSelected = selectedRoomIds.includes(rm.id);
                    return (
                      <div
                        key={rm.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRoomIds(selectedRoomIds.filter(id => id !== rm.id));
                          } else {
                            setSelectedRoomIds([...selectedRoomIds, rm.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                          <span>{rm.room_number}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">{rm.exam_capacity} seats</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Launch Bar */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('plans')}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>

            <button
              onClick={handleGeneratePlan}
              disabled={actionLoading || selectedRoomIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-indigo-200"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Packing Halls & Interleaving Seats...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Interleaved Seating Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ACTIVE PLAN VIEWER, DESK GRID & 4 PRINT DELIVERABLES
      ========================================================================= */}
      {activeTab === 'viewer' && activePlan && (
        <div className="space-y-6">
          {/* Plan Header & Action Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activePlan.status}
                </span>
                <span className="text-xs font-semibold text-slate-500">{activePlan.exam_date} • {activePlan.slot_name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">{activePlan.title}</h2>
              <p className="text-xs text-slate-500">
                {activePlan.total_students} Candidates Seated across {activePlan.rooms.length} Examination Halls
              </p>
            </div>

            {/* 4 University-Standard Export Deliverables Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPrintDeliverable('notice')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                title="Print Noticeboard Gate Chart"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>1. Noticeboard Chart</span>
              </button>

              <button
                onClick={() => setPrintDeliverable('attendance')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200"
                title="Print Attendance & Signature Register"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. Attendance Sheet</span>
              </button>

              <button
                onClick={() => setPrintDeliverable('slips')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
                title="Print Sticky Desk Slips / Roll Labels"
              >
                <Tag className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Desk Slips</span>
              </button>

              <button
                onClick={handleExportConsolidatedExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
                title="Export Consolidated Multi-Sheet Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>4. Excel Workbook</span>
              </button>

              <button
                onClick={() => handleSyncMilestone2(activePlan.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                title="Mark Milestone 2 Tasks Completed in Database"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Complete Milestone 2</span>
              </button>
            </div>
          </div>

          {/* Hall / Room Switcher Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Examination Halls:</span>
            {activePlan.rooms.map((rm) => (
              <button
                key={rm.classroom.id}
                onClick={() => setSelectedRoomId(rm.classroom.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                  selectedRoomId === rm.classroom.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{rm.classroom.room_number}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  selectedRoomId === rm.classroom.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {rm.studentCount}
                </span>
              </button>
            ))}
          </div>

          {/* Hall Detail Card & Interactive Floor Chart */}
          {currentRoomData && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              {/* Hall Information Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      {currentRoomData.classroom.room_type}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{currentRoomData.classroom.floor || 'Ground Floor'}</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    {currentRoomData.classroom.room_number} — {currentRoomData.classroom.building_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {currentRoomData.papers.map((p) => (
                      <span
                        key={p.paper_code}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${getPaperColorBadge(p.paper_code)}`}
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>{p.paper_code}: {p.count} examinees</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-center shrink-0">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-400 font-medium">Candidates Seated</div>
                    <div className="text-xl font-black text-slate-900">{currentRoomData.studentCount} / {currentRoomData.classroom.exam_capacity}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-400 font-medium">Invigilators Req.</div>
                    <div className="text-xl font-black text-indigo-600">
                      {Math.max(1, Math.ceil(currentRoomData.studentCount / 25))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Podium / Front Stage */}
              <div className="p-2.5 bg-slate-800 text-white text-center rounded-xl font-bold tracking-wider text-xs uppercase shadow-inner">
                ✦ University Invigilator Desk & Stage / Blackboard (Front of Hall) ✦
              </div>

              {/* Interactive Physical Desk Layout Grid */}
              <div className="overflow-x-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div
                  className="grid gap-3 min-w-[650px] mx-auto justify-center"
                  style={{
                    gridTemplateColumns: `repeat(${currentRoomData.classroom.columns_count || 6}, minmax(110px, 1fr))`
                  }}
                >
                  {Array.from({ length: currentRoomData.classroom.rows_count || 5 }).map((_, rIdx) => {
                    const rowChar = String.fromCharCode(65 + rIdx);
                    return Array.from({ length: currentRoomData.classroom.columns_count || 6 }).map((_, cIdx) => {
                      const seatCode = `${rowChar}${cIdx + 1}`;
                      const alloc = currentRoomData.allocations.find(
                        a => a.seat_number === seatCode || (a.row_index === rIdx && a.col_index === cIdx)
                      );

                      if (!alloc) {
                        return (
                          <div
                            key={seatCode}
                            className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-100/60 text-center flex flex-col items-center justify-center min-h-[90px]"
                          >
                            <span className="font-mono text-xs font-bold text-slate-400">{seatCode}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-1">Empty / Spare</span>
                          </div>
                        );
                      }

                      const badgeStyle = getPaperColorBadge(alloc.paper_code);

                      return (
                        <div
                          key={alloc.id}
                          onClick={() => setSelectedSeat(alloc)}
                          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer min-h-[95px] hover:shadow-md hover:scale-102 ${
                            selectedSeat?.id === alloc.id
                              ? 'ring-2 ring-indigo-600 shadow-md bg-white border-indigo-400'
                              : alloc.attendance_status === 'ABSENT'
                              ? 'bg-rose-50/70 border-rose-300'
                              : 'bg-white border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {alloc.seat_number}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                              {alloc.paper_code}
                            </span>
                          </div>

                          <div className="my-1.5">
                            <div className="font-bold text-slate-900 text-xs truncate" title={alloc.student_name}>
                              {alloc.student_name}
                            </div>
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">{alloc.prn}</div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9px]">
                            <span className="text-slate-400 truncate max-w-[65px]">{alloc.booklet_number}</span>
                            <span className={`font-bold ${
                              alloc.attendance_status === 'PRESENT' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {alloc.attendance_status}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>

              {/* Seat Details & Attendance Quick Control Drawer */}
              {selectedSeat && (
                <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl font-mono font-bold text-sm">
                      {selectedSeat.seat_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{selectedSeat.student_name}</span>
                        <span className="font-mono text-xs text-slate-500">({selectedSeat.prn})</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="font-semibold">{selectedSeat.paper_code}</span>: {selectedSeat.subject_name}
                        {selectedSeat.program_name && ` • ${selectedSeat.program_name}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">Attendance:</span>
                    <button
                      onClick={() => handleUpdateSeatAttendance(selectedSeat.id, 'PRESENT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        selectedSeat.attendance_status === 'PRESENT'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Present</span>
                    </button>

                    <button
                      onClick={() => handleUpdateSeatAttendance(selectedSeat.id, 'ABSENT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        selectedSeat.attendance_status === 'ABSENT'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-rose-50'
                      }`}
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Absent</span>
                    </button>

                    <button
                      onClick={() => handleUpdateSeatAttendance(selectedSeat.id, 'DEBARRED')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                        selectedSeat.attendance_status === 'DEBARRED'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Debarred</span>
                    </button>

                    <button
                      onClick={() => setSelectedSeat(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* High-Resolution University Print Format Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; font-size: 10pt !important; color: black !important; }
          aside, header, nav, button, .print\\:hidden { display: none !important; }
          .fixed { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          .max-h-\\[92vh\\], .overflow-y-auto { max-height: none !important; overflow: visible !important; }
          .shadow-2xl, .shadow-xs, .shadow-sm { box-shadow: none !important; }
          .rounded-3xl, .rounded-2xl, .rounded-xl { border-radius: 0 !important; }
          .border { border-color: #444 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #444 !important; padding: 4px 6px !important; }
          @page { margin: 12mm; size: auto; }
        }
      ` }} />

      {/* =========================================================================
          PRINT PREVIEW MODAL (Delivering the 4 Official Examination Formats)
      ========================================================================= */}
      {printDeliverable !== 'none' && activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl p-6 my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {printDeliverable === 'notice' && '1. University Noticeboard Seating Arrangement Chart'}
                    {printDeliverable === 'attendance' && '2. Hall Examination Attendance & Signature Register'}
                    {printDeliverable === 'slips' && '3. Examination Desk Slips / Sticky Roll Number Labels'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official format configured for SSPU Examination Directorate printing standards.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setPrintDeliverable('none')}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 my-4 text-slate-900">
              {/* Document 1: Noticeboard Chart */}
              {printDeliverable === 'notice' && (
                <div className="space-y-6 bg-white p-8 rounded-xl shadow-xs border border-slate-200">
                  <div className="text-center border-b-2 border-slate-900 pb-4">
                    <h2 className="text-xl font-black uppercase tracking-wider">SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY</h2>
                    <h3 className="text-sm font-bold tracking-widest text-slate-700 uppercase mt-1">DIRECTORATE OF EXAMINATIONS</h3>
                    <h4 className="text-base font-black text-indigo-900 uppercase mt-2 bg-slate-100 py-1.5 px-4 rounded-lg inline-block">
                      EXAMINATION HALL SEATING ARRANGEMENT NOTICE
                    </h4>
                    <div className="flex justify-between items-center text-xs font-bold mt-4 pt-2 border-t border-slate-200">
                      <span>Date of Examination: {activePlan.exam_date}</span>
                      <span>Session: {activePlan.slot_name} ({activePlan.session_time || '10:00 AM - 01:00 PM'})</span>
                      <span>Published: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {activePlan.rooms.map((rm) => (
                      <div key={rm.classroom.id} className="border border-slate-300 rounded-xl p-4">
                        <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-lg mb-3">
                          <span className="font-black text-sm text-slate-900">
                            HALL: {rm.classroom.room_number} ({rm.classroom.building_name} - {rm.classroom.floor})
                          </span>
                          <span className="font-bold text-xs text-indigo-700">
                            Total Candidates: {rm.studentCount}
                          </span>
                        </div>

                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-300 font-bold bg-slate-50">
                              <th className="py-2 px-3">Seat Range / Desks</th>
                              <th className="py-2 px-3">Paper Code</th>
                              <th className="py-2 px-3">Subject Title</th>
                              <th className="py-2 px-3">PRN List / Range</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {rm.papers.map((p) => {
                              const allocs = rm.allocations.filter(a => a.paper_code === p.paper_code);
                              const seatCodes = allocs.map(a => a.seat_number).join(', ');
                              const prnFirst = allocs[0]?.prn;
                              const prnLast = allocs[allocs.length - 1]?.prn;
                              return (
                                <tr key={p.paper_code}>
                                  <td className="py-2 px-3 font-mono font-bold text-indigo-700">{allocs[0]?.seat_number} - {allocs[allocs.length - 1]?.seat_number}</td>
                                  <td className="py-2 px-3 font-bold">{p.paper_code}</td>
                                  <td className="py-2 px-3">{p.subject_name}</td>
                                  <td className="py-2 px-3 font-mono text-[11px]">{prnFirst} to {prnLast} ({p.count} students)</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 flex justify-between items-end text-xs font-bold border-t border-slate-300">
                    <div>
                      <div>Notice Board Instructions:</div>
                      <div className="font-normal text-slate-500 mt-0.5">Students must take their assigned seats 15 minutes before exam commencement.</div>
                    </div>
                    <div className="text-right">
                      <div className="h-10"></div>
                      <div className="border-t border-slate-800 pt-1">Controller of Examinations (COE)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document 2: Attendance Sheet */}
              {printDeliverable === 'attendance' && (
                <div className="space-y-6 bg-white p-8 rounded-xl shadow-xs border border-slate-200">
                  <div className="text-center border-b-2 border-slate-900 pb-3">
                    <h2 className="text-lg font-black uppercase">SYMBIOSIS SKILLS AND PROFESSIONAL UNIVERSITY</h2>
                    <h3 className="text-xs font-bold uppercase text-slate-700 mt-0.5">HALL ATTENDANCE & ANSWER BOOKLET REGISTER</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs font-bold mt-3 p-2 bg-slate-50 rounded-lg text-left">
                      <div>Hall: <span className="font-normal">{currentRoomData?.classroom.room_number}</span></div>
                      <div>Date: <span className="font-normal">{activePlan.exam_date}</span></div>
                      <div>Session: <span className="font-normal">{activePlan.slot_name}</span></div>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-slate-300 text-center">
                        <th className="py-2 px-2 border-r border-slate-300 w-10">Sr</th>
                        <th className="py-2 px-2 border-r border-slate-300 w-16">Seat</th>
                        <th className="py-2 px-2 border-r border-slate-300 w-28">PRN</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-left">Candidate Name</th>
                        <th className="py-2 px-2 border-r border-slate-300 w-24">Paper Code</th>
                        <th className="py-2 px-2 border-r border-slate-300 w-28">Booklet Sr No</th>
                        <th className="py-2 px-3 border-r border-slate-300 w-28">Student Sign</th>
                        <th className="py-2 px-2 w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentRoomData?.allocations || []).map((a, idx) => (
                        <tr key={a.id} className="border-b border-slate-200 text-center">
                          <td className="py-2 px-2 border-r border-slate-200">{idx + 1}</td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono font-bold">{a.seat_number}</td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono text-[11px]">{a.prn}</td>
                          <td className="py-2 px-3 border-r border-slate-200 text-left font-semibold">{a.student_name}</td>
                          <td className="py-2 px-2 border-r border-slate-200 font-bold text-[11px]">{a.paper_code}</td>
                          <td className="py-2 px-2 border-r border-slate-200 font-mono text-[11px]">{a.booklet_number}</td>
                          <td className="py-2 px-3 border-r border-slate-200"></td>
                          <td className="py-2 px-2 font-bold text-[10px] text-emerald-700">{a.attendance_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-bold border-t border-slate-300">
                    <div>
                      <div>Invigilator Signature: _______________________</div>
                      <div className="font-normal text-slate-500 mt-1">Invigilator Name: __________________________</div>
                    </div>
                    <div className="text-right">
                      <div>Centre Superintendent Sign: _______________________</div>
                      <div className="font-normal text-slate-500 mt-1">Seal of Examination Centre</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document 3: Desk Slips / Sticky Roll Labels */}
              {printDeliverable === 'slips' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-500 text-center font-medium pb-2 border-b">
                    Standard 2-Column Adhesive Desk Labels (Ready for cutting or Avery label printing)
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(currentRoomData?.allocations || []).map((a) => (
                      <div
                        key={a.id}
                        className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-400 text-left space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between border-b pb-1 text-slate-800">
                          <span className="font-black text-xs">SSPU EXAMINATIONS 2026</span>
                          <span className="font-black font-mono text-sm px-2 py-0.5 bg-slate-900 text-white rounded">
                            {a.seat_number}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm truncate">{a.student_name}</div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono font-bold text-slate-600">PRN: {a.prn}</span>
                          <span className="font-bold text-indigo-700">{a.paper_code}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{a.subject_name}</div>
                        <div className="text-[10px] text-slate-400 pt-1 border-t flex justify-between">
                          <span>Hall: {a.room_number}</span>
                          <span>{a.exam_date} ({a.slot_name})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setPrintDeliverable('none')}
                className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Close Print Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
