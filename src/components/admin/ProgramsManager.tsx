import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { Program, UserProfile } from '../../types';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  ShieldCheck, 
  UserCheck, 
  Building2,
  Lock
} from 'lucide-react';

interface ProgramsManagerProps {
  programs: Program[];
  users: UserProfile[];
  onUpdateProgram: (program: Program) => void;
  onDeleteProgram: (programId: string) => void;
  onAddProgram: (program: Program) => void;
}

export const ProgramsManager: React.FC<ProgramsManagerProps> = ({
  programs,
  users,
  onUpdateProgram,
  onDeleteProgram,
  onAddProgram,
}) => {
  const { isSuperAdmin, currentUser, getUserPrograms } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');

  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [editPrimaryId, setEditPrimaryId] = useState<string | null>(null);
  const [editAltId, setEditAltId] = useState<string | null>(null);

  // Add program modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSrNo, setNewSrNo] = useState<number>(programs.length + 1);
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('School of Engineering & Technology');
  const [newPrimaryId, setNewPrimaryId] = useState<string | null>(users.find((u) => u.role === 'COORDINATOR')?.id || null);
  const [newAltId, setNewAltId] = useState<string | null>(users.find((u) => u.role === 'COORDINATOR')?.id || null);

  const userProgs = getUserPrograms();
  const displayedPrograms = isSuperAdmin ? programs : userProgs.all;

  // Filter distinct schools
  const schools = Array.from(new Set(displayedPrograms.map((p) => p.school_name)));

  const filteredPrograms = displayedPrograms.filter((p) => {
    const searchMatch =
      !searchTerm ||
      p.program_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.school_name.toLowerCase().includes(searchTerm.toLowerCase());

    const schoolMatch = selectedSchool === 'ALL' || p.school_name === selectedSchool;
    return searchMatch && schoolMatch;
  });

  const startInlineEdit = (p: Program) => {
    setEditingProgId(p.id);
    setEditPrimaryId(p.primary_coordinator_id);
    setEditAltId(p.alternate_coordinator_id);
  };

  const saveInlineEdit = (p: Program) => {
    onUpdateProgram({
      ...p,
      primary_coordinator_id: editPrimaryId || null,
      alternate_coordinator_id: editAltId || null,
    });
    setEditingProgId(null);
  };

  const cancelInlineEdit = () => {
    setEditingProgId(null);
  };

  const handleAddProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newProg: Program = {
      id: `prog-${newProgCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sr_no: newSrNo,
      program_code: newProgCode.toUpperCase().trim(),
      program_name: newProgName.trim(),
      school_name: newSchoolName.trim(),
      primary_coordinator_id: newPrimaryId || null,
      alternate_coordinator_id: newAltId || null,
    };

    onAddProgram(newProg);
    setAddModalOpen(false);
    setNewProgCode('');
    setNewProgName('');
  };

  const exportProgramsToExcel = () => {
    const exportData = filteredPrograms.map((p) => {
      const primaryUser = users.find((u) => u.id === p.primary_coordinator_id);
      const altUser = users.find((u) => u.id === p.alternate_coordinator_id);

      return {
        'Sr. No.': p.sr_no,
        'Program Code': p.program_code,
        'Program Name': p.program_name,
        'School Name': p.school_name,
        'Primary Coordinator Email/Name': primaryUser ? `${primaryUser.full_name} (${primaryUser.email})` : 'Unassigned',
        'Alternate Coordinator Email/Name': altUser ? `${altUser.full_name} (${altUser.email})` : 'Unassigned',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program_Mapping_Registry');
    XLSX.writeFile(wb, `Program_Master_Mapping_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header & stats */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {isSuperAdmin ? 'Academic Program & Faculty Coordinator Directory' : 'My Mapped Academic Programs'}
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {displayedPrograms.length} Programs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSuperAdmin
              ? 'Configure faculty coordinators for question paper confidentiality, exam readiness and alternate contingency escalations.'
              : 'Showing only academic programs where you are officially designated as Primary or Alternate Coordinator.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportProgramsToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Registry</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setNewSrNo(programs.length + 1);
                setAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Program</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search program code, title, school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {schools.length > 1 && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Schools ({schools.length})</option>
              {schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Programs Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-16 text-center font-mono">Sr</th>
                <th className="py-3 px-3 w-32 font-mono">Program Code</th>
                <th className="py-3 px-3 min-w-[220px]">Program Title & School</th>
                <th className="py-3 px-3 min-w-[200px]">Primary Coordinator</th>
                <th className="py-3 px-3 min-w-[200px]">Alternate Coordinator</th>
                <th className="py-3 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPrograms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No academic programs found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredPrograms.map((p) => {
                  const isEditing = editingProgId === p.id;
                  const primaryUser = users.find((u) => u.id === p.primary_coordinator_id);
                  const altUser = users.find((u) => u.id === p.alternate_coordinator_id);

                  const isMyPrimary = p.primary_coordinator_id === currentUser.id;
                  const isMyAlt = p.alternate_coordinator_id === currentUser.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {p.sr_no}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {p.program_code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 leading-snug">
                          {p.program_name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{p.school_name}</span>
                        </div>
                      </td>

                      {/* Primary Coordinator Column */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select
                            value={editPrimaryId || ''}
                            onChange={(e) => setEditPrimaryId(e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} ({u.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-900">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{primaryUser?.full_name || 'Unassigned'}</span>
                              {isMyPrimary && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                                  YOU (Primary)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 pl-5">
                              {primaryUser?.email || '-'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Alternate Coordinator Column */}
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select
                            value={editAltId || ''}
                            onChange={(e) => setEditAltId(e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} ({u.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              <span>{altUser?.full_name || 'Unassigned'}</span>
                              {isMyAlt && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                                  YOU (Alternate)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 pl-5">
                              {altUser?.email || '-'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        {isSuperAdmin ? (
                          isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveInlineEdit(p)}
                                className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded"
                                title="Save changes"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelInlineEdit}
                                className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startInlineEdit(p)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                                title="Edit coordinators"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete program ${p.program_code}?`)) {
                                    onDeleteProgram(p.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Delete program"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">
                            Assigned
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Program Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Add Academic Program to Registry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Map new degree program with assigned and alternate faculty coordinators.
            </p>

            <form onSubmit={handleAddProgramSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sr No.</label>
                  <input
                    type="number"
                    value={newSrNo}
                    onChange={(e) => setNewSrNo(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Program Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BTECH-AI"
                    value={newProgCode}
                    onChange={(e) => setNewProgCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Program Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.Tech. Artificial Intelligence & Robotics"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">School Name *</label>
                <input
                  type="text"
                  required
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Coordinator</label>
                <select
                  value={newPrimaryId || ''}
                  onChange={(e) => setNewPrimaryId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alternate Coordinator</label>
                <select
                  value={newAltId || ''}
                  onChange={(e) => setNewAltId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Register Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
