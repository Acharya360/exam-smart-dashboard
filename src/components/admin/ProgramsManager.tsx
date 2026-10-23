import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { Program, UserProfile } from '../../types';
import { validateParsedEntities, generateImportErrorReport } from '../../utils/validation';
import {
  Search, 
  Plus, 
  PlusCircle,
  Download, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  ShieldCheck, 
  UserCheck, 
  Building2,
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';

const SSPU_STANDARD_PROGRAM_ROWS = [
  {
    'Sr. No.': 1,
    'Program Code': 'BTECH-CEM',
    'Program Name': 'B.Tech. Construction Engineering & Management',
    'School Name': 'School of Construction Engineering and Infrastructure Management',
    'Primary Coordinator Email/Name': 'Mr. Prathmesh Londhe (prathmesh.londhe@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Rajkumar Wankhade (Rajkumar.wankhade@sspu.ac.in)'
  },
  {
    'Sr. No.': 2,
    'Program Code': 'BTECH-MECH',
    'Program Name': 'B.Tech. Mechatronics Engineering',
    'School Name': 'School of Mechatronics Engineering',
    'Primary Coordinator Email/Name': 'Mr. Amit Vartikar (Amit.Vartikar@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Prathmesh Londhe (prathmesh.londhe@sspu.ac.in)'
  },
  {
    'Sr. No.': 3,
    'Program Code': 'BTECH-CSAI',
    'Program Name': 'B.Tech. Computer Science & AI',
    'School Name': 'School of Computer Science & Artificial Intelligence',
    'Primary Coordinator Email/Name': 'Mr. Rajkumar Wankhade (Rajkumar.wankhade@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Amit Vartikar (Amit.Vartikar@sspu.ac.in)'
  },
  {
    'Sr. No.': 4,
    'Program Code': 'BTECH-EEE',
    'Program Name': 'B.Tech. Electrical & Electronics',
    'School Name': 'School of Electrical & Electronics Engineering',
    'Primary Coordinator Email/Name': 'Ms. Shreyasi Joshi (shreyasi.joshi@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Prathmesh Londhe (prathmesh.londhe@sspu.ac.in)'
  },
  {
    'Sr. No.': 5,
    'Program Code': 'BARCH',
    'Program Name': 'B.Arch. Architecture & Urban Design',
    'School Name': 'School of Architecture, Urban Development & Planning',
    'Primary Coordinator Email/Name': 'Mr. Amit Vartikar (Amit.Vartikar@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Ms. Shreyasi Joshi (shreyasi.joshi@sspu.ac.in)'
  },
  {
    'Sr. No.': 6,
    'Program Code': 'BBA-LSCM',
    'Program Name': 'BBA Logistics & Supply Chain Management',
    'School Name': 'School of Management & Commerce',
    'Primary Coordinator Email/Name': 'Mr. Prathmesh Londhe (prathmesh.londhe@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Rajkumar Wankhade (Rajkumar.wankhade@sspu.ac.in)'
  },
  {
    'Sr. No.': 7,
    'Program Code': 'BBA-RET',
    'Program Name': 'BBA Retail & E-Commerce Management',
    'School Name': 'School of Management & Commerce',
    'Primary Coordinator Email/Name': 'Mr. Rajkumar Wankhade (Rajkumar.wankhade@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Ms. Shreyasi Joshi (shreyasi.joshi@sspu.ac.in)'
  },
  {
    'Sr. No.': 8,
    'Program Code': 'BSC-DS',
    'Program Name': 'B.Sc. Data Science & Artificial Intelligence',
    'School Name': 'School of Computer Science & Artificial Intelligence',
    'Primary Coordinator Email/Name': 'Ms. Shreyasi Joshi (shreyasi.joshi@sspu.ac.in)',
    'Alternate Coordinator Email/Name': 'Mr. Amit Vartikar (Amit.Vartikar@sspu.ac.in)'
  }
];

type ProgramSortKey = 'sr_no' | 'program_code' | 'program_name' | 'primary' | 'alternate';

const PROGRAM_SORT_LABELS: Record<ProgramSortKey, string> = {
  sr_no: 'Sr',
  program_code: 'Program Code',
  program_name: 'Program Title & School',
  primary: 'Primary Coordinator',
  alternate: 'Alternate Coordinator',
};

interface ProgramsManagerProps {
  programs: Program[];
  users: UserProfile[];
  onUpdateProgram: (program: Program) => void | Promise<void>;
  onDeleteProgram: (programId: string) => void | Promise<void>;
  onDeletePrograms?: (programIds: string[]) => void | Promise<void>;
  onAddProgram: (program: Program) => void | Promise<void>;
  onAddPrograms?: (programs: Program[], newUsers?: UserProfile[], clearExisting?: boolean) => Promise<void>;
}

interface ParsedProgramItem {
  sr_no: number;
  program_code: string;
  program_name: string;
  school_name: string;
  primary_coordinator_id: string | null;
  alternate_coordinator_id: string | null;
  primary_name_display: string;
  alternate_name_display: string;
  isUpdate: boolean;
  existingId?: string;
  existingName?: string;
  warnings: string[];
  newUserPrimary?: UserProfile;
  newUserAlt?: UserProfile;
}

export const ProgramsManager: React.FC<ProgramsManagerProps> = ({
  programs,
  users,
  onUpdateProgram,
  onDeleteProgram,
  onDeletePrograms,
  onAddProgram,
  onAddPrograms,
}) => {
  const { isSuperAdmin, currentUser, getUserPrograms } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState<{ key: ProgramSortKey; dir: 'asc' | 'desc' }>({ key: 'sr_no', dir: 'asc' });
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingProgId, setEditingProgId] = useState<string | null>(null);
  const [editPrimaryId, setEditPrimaryId] = useState<string | null>(null);
  const [editAltId, setEditAltId] = useState<string | null>(null);

  // Bulk Upload State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedProgramItem[]>([]);
  const [bulkFilter, setBulkFilter] = useState<'ALL' | 'NEW' | 'UPDATE' | 'WARNING'>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkDelete = async () => {
    if (selectedPrograms.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedPrograms.size} academic programs?`)) {
      setIsDeleting(true);
      const ids = Array.from(selectedPrograms);
      if (onDeletePrograms) {
        await onDeletePrograms(ids);
      } else {
        await Promise.all(ids.map(id => onDeleteProgram(id)));
      }
      setSelectedPrograms(new Set());
      setIsDeleting(false);
    }
  };

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

  const toggleSort = (key: ProgramSortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  const SortHeader = ({ k, className = '' }: { k: ProgramSortKey; className?: string }) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th className={`py-3 px-3 ${className}`}>
        <button
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 transition-colors ${
            active ? 'text-indigo-700' : ''
          }`}
          title={`Sort by ${PROGRAM_SORT_LABELS[k]}`}
        >
          <span>{PROGRAM_SORT_LABELS[k]}</span>
          <Icon className="w-3 h-3" />
        </button>
      </th>
    );
  };

  const sortedPrograms = useMemo(() => {
    const coordName = (id: string | null) => (users.find((u) => u.id === id)?.full_name || '').toLowerCase();
    const valueOf = (p: Program): string | number => {
      switch (sort.key) {
        case 'sr_no':
          return p.sr_no ?? 0;
        case 'program_code':
          return (p.program_code || '').toLowerCase();
        case 'program_name':
          return (p.program_name || '').toLowerCase();
        case 'primary':
          return coordName(p.primary_coordinator_id);
        case 'alternate':
          return coordName(p.alternate_coordinator_id);
        default:
          return '';
      }
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filteredPrograms].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return (a.sr_no ?? 0) - (b.sr_no ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPrograms, sort, users]);

  const startInlineEdit = (p: Program) => {
    setEditingProgId(p.id);
    setEditPrimaryId(p.primary_coordinator_id);
    setEditAltId(p.alternate_coordinator_id);
  };

  const saveInlineEdit = async (p: Program) => {
    if (editPrimaryId && editPrimaryId === editAltId) { 
      window.alert('Choose different primary and alternate coordinators.'); 
      return; 
    }
    if (!window.confirm(`Change active coordinators for ${p.program_name}? Existing examination records will be retained.`)) return;
    await onUpdateProgram({
      ...p,
      primary_coordinator_id: editPrimaryId || null,
      alternate_coordinator_id: editAltId || null,
    });
    setEditingProgId(null);
  };

  const cancelInlineEdit = () => {
    setEditingProgId(null);
  };

  // Single Add Program Form with Upsert Checking
  const handleAddProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newProgCode.trim().toUpperCase();
    const existing = displayedPrograms.find(p => p.program_code.toLowerCase() === cleanCode.toLowerCase());

    if (existing) {
      if (window.confirm(`Program code "${existing.program_code}" already exists (${existing.program_name}).\n\nDo you want to update its information with these new details?`)) {
        if (newPrimaryId && newPrimaryId === newAltId) {
          window.alert('Primary and alternate coordinators must be different faculty members.');
          return;
        }
        await onUpdateProgram({
          ...existing,
          sr_no: newSrNo || existing.sr_no,
          program_name: newProgName.trim(),
          school_name: newSchoolName.trim(),
          primary_coordinator_id: newPrimaryId || null,
          alternate_coordinator_id: newAltId || null,
        });
        setAddModalOpen(false);
        setNewProgCode('');
        setNewProgName('');
      }
      return;
    }

    if (newPrimaryId && newPrimaryId === newAltId) { 
      window.alert('Primary and alternate coordinators must be different faculty members.'); 
      return; 
    }

    const newProg: Program = {
      id: `prog-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sr_no: newSrNo,
      program_code: cleanCode,
      program_name: newProgName.trim(),
      school_name: newSchoolName.trim(),
      primary_coordinator_id: newPrimaryId || null,
      alternate_coordinator_id: newAltId || null,
    };

    await onAddProgram(newProg);
    setAddModalOpen(false);
    setNewProgCode('');
    setNewProgName('');
  };

  // Export current registry to Excel
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

  // Helper to resolve coordinator by email or name
  const resolveCoordinator = (rawStr: string | undefined): { userId: string | null; displayName: string; newUser?: UserProfile } => {
    if (!rawStr || typeof rawStr !== 'string' || !rawStr.trim() || rawStr.trim().toLowerCase() === 'unassigned') {
      return { userId: null, displayName: 'Unassigned' };
    }
    const trimmed = rawStr.trim();
    
    // 1. Try extracting email
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    const email = emailMatch ? emailMatch[1].toLowerCase() : null;

    if (email) {
      const userByEmail = users.find(u => u.email.toLowerCase() === email);
      if (userByEmail) {
        return { userId: userByEmail.id, displayName: `${userByEmail.full_name} (${userByEmail.email})` };
      }
    }

    // 2. Search existing users by clean name
    const cleanName = trimmed.replace(/\(.*?\)/g, '').replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim().toLowerCase();
    if (cleanName.length > 2) {
      const userByName = users.find(u => {
        const uClean = u.full_name.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.)\s+/i, '').trim().toLowerCase();
        return uClean === cleanName || uClean.includes(cleanName) || cleanName.includes(uClean);
      });
      if (userByName) {
        return { userId: userByName.id, displayName: `${userByName.full_name} (${userByName.email})` };
      }
    }

    // 3. If email supplied and not found in users, stage a new user profile
    if (email) {
      const extractedName = trimmed.replace(/\(.*?\)/g, '').trim() || email.split('@')[0];
      const newId = `user-coord-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newUser: UserProfile = {
        id: newId,
        email,
        full_name: extractedName,
        role: 'COORDINATOR',
        title: 'Exam Coordinator',
        department: '',
        created_at: new Date().toISOString()
      };
      return { userId: newId, displayName: `${extractedName} (${email}) [New User]`, newUser };
    }

    return { userId: null, displayName: `${trimmed} (Unassigned)` };
  };

  // Convert raw row array to ParsedProgramItem with Upsert verification
  const parseRowsToItems = (rawRows: Record<string, unknown>[]): ParsedProgramItem[] => {
    const items: ParsedProgramItem[] = [];

    rawRows.forEach((r, idx) => {
      const progCode = String(
        r['Program Code'] ?? r['Program_Code'] ?? r['Code'] ?? r['PaperCode'] ?? r['Course Code'] ?? r['ProgramCode'] ?? ''
      ).trim().toUpperCase();

      const progName = String(
        r['Program Name'] ?? r['Program_Name'] ?? r['Course Name'] ?? r['CM_Course_Name'] ?? r['Title'] ?? ''
      ).trim();

      const schoolName = String(
        r['School Name'] ?? r['School_Name'] ?? r['School'] ?? r['Faculty'] ?? r['Department'] ?? 'School of Engineering & Technology'
      ).trim();

      const rawSr = r['Sr. No.'] ?? r['Sr No'] ?? r['Sr'] ?? r['Serial'];
      const srNo = Number(rawSr) || (idx + 1);

      const primaryRaw = String(r['Primary Coordinator Email/Name'] ?? r['Primary Coordinator'] ?? r['Primary_Coordinator'] ?? r['Primary'] ?? '');
      const altRaw = String(r['Alternate Coordinator Email/Name'] ?? r['Alternate Coordinator'] ?? r['Alternate_Coordinator'] ?? r['Alternate'] ?? '');

      if (!progCode && !progName) return; // skip empty rows

      const warnings: string[] = [];
      if (!progCode) warnings.push('Missing Program Code');
      if (!progName) warnings.push('Missing Program Title');

      // Check if existing or not
      const existing = programs.find(p => p.program_code.trim().toLowerCase() === progCode.toLowerCase());
      const isUpdate = !!existing;

      const resolvedPrimary = resolveCoordinator(primaryRaw);
      const resolvedAlt = resolveCoordinator(altRaw);

      if (resolvedPrimary.userId && resolvedAlt.userId && resolvedPrimary.userId === resolvedAlt.userId) {
        warnings.push('Primary and Alternate coordinators are the same faculty member');
      }

      items.push({
        sr_no: srNo,
        program_code: progCode,
        program_name: progName,
        school_name: schoolName,
        primary_coordinator_id: resolvedPrimary.userId,
        alternate_coordinator_id: resolvedAlt.userId,
        primary_name_display: resolvedPrimary.displayName,
        alternate_name_display: resolvedAlt.displayName,
        isUpdate,
        existingId: existing?.id,
        existingName: existing?.program_name,
        warnings,
        newUserPrimary: resolvedPrimary.newUser,
        newUserAlt: resolvedAlt.newUser
      });
    });

    return items;
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(SSPU_STANDARD_PROGRAM_ROWS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program_Mapping_Registry');
    XLSX.writeFile(wb, 'SSPU_Academic_Programs_Template.xlsx');
  };

  // Preload SSPU Standard Programs Preset
  const loadPreloadedSSPUPrograms = () => {
    const items = parseRowsToItems(SSPU_STANDARD_PROGRAM_ROWS);
    setParsedItems(items);
    setBulkFileName('SSPU_Standard_Program_Registry_Preset.xlsx');
    setBulkFilter('ALL');
  };

  // Handle file selection and parsing
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames.includes('Program_Mapping_Registry') 
        ? 'Program_Mapping_Registry' 
        : wb.SheetNames[0];

      const ws = wb.Sheets[sheetName];
      if (!ws) {
        window.alert(`No worksheets found in ${file.name}`);
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (rows.length === 0) {
        window.alert('The selected sheet has no data rows. Please use the template or preload preset.');
        return;
      }

      const items = parseRowsToItems(rows);
      setParsedItems(items);
      setBulkFilter('ALL');
    } catch (err) {
      console.error('File parsing failed:', err);
      window.alert('Failed to parse file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Commit parsed items to database
  const handleBulkCommit = async () => {
    if (parsedItems.length === 0) return;
    const validItems = parsedItems.filter(item => item.program_code && item.program_name);
    if (validItems.length === 0) {
      window.alert('No valid programs found to import.');
      return;
    }

    if (importMode === 'replace') {
      const confirmed = window.confirm(
        `Are you sure you want to clear old records?\n\nThis will remove all existing academic programs from the database and import fresh the ${validItems.length} programs parsed from this upload.\n\nClick OK to proceed.`
      );
      if (!confirmed) return;
    }

    setIsUploading(true);
    try {
      const programsToSync: (Program & { primary_coordinator_email?: string; alternate_coordinator_email?: string })[] = validItems.map((item, idx) => ({
        id: item.existingId || `prog-${item.program_code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        sr_no: item.sr_no || (idx + 1),
        program_code: item.program_code,
        program_name: item.program_name,
        school_name: item.school_name,
        primary_coordinator_id: item.primary_coordinator_id || null,
        alternate_coordinator_id: item.alternate_coordinator_id || null,
        primary_coordinator_email: item.newUserPrimary?.email || users.find(u => u.id === item.primary_coordinator_id)?.email,
        alternate_coordinator_email: item.newUserAlt?.email || users.find(u => u.id === item.alternate_coordinator_id)?.email,
      }));

      const newUsersToCreate: UserProfile[] = [];
      for (const item of validItems) {
        if (item.newUserPrimary && !newUsersToCreate.some(u => u.email === item.newUserPrimary?.email)) {
          newUsersToCreate.push(item.newUserPrimary);
        }
        if (item.newUserAlt && !newUsersToCreate.some(u => u.email === item.newUserAlt?.email)) {
          newUsersToCreate.push(item.newUserAlt);
        }
      }

      if (onAddPrograms) {
        await onAddPrograms(programsToSync, newUsersToCreate, importMode === 'replace');
      } else {
        if (importMode === 'replace' && onDeletePrograms) {
          await onDeletePrograms(programs.map(p => p.id));
        }
        for (const p of programsToSync) {
          const existing = programs.find(ep => ep.program_code.toLowerCase() === p.program_code.toLowerCase());
          if (existing && importMode !== 'replace') {
            await onUpdateProgram({ ...existing, ...p });
          } else {
            await onAddProgram(p);
          }
        }
      }

      const updateCount = validItems.filter(i => i.isUpdate).length;
      const newCount = validItems.filter(i => !i.isUpdate).length;

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}

      if (importMode === 'replace') {
        setUploadSuccessMessage(`Successfully cleared old records and imported ${validItems.length} fresh programs.`);
      } else {
        setUploadSuccessMessage(`Successfully synchronized ${validItems.length} programs (${updateCount} updated, ${newCount} added).`);
      }

      setTimeout(() => {
        setBulkModalOpen(false);
        setParsedItems([]);
        setBulkFileName(null);
        setUploadSuccessMessage(null);
        setImportMode('merge');
      }, 1400);
    } catch (err) {
      console.error('Failed to commit programs:', err);
      window.alert(err instanceof Error ? err.message : 'Failed to synchronize programs.');
    } finally {
      setIsUploading(false);
    }
  };

  // Counters for preview modal
  const updateCount = parsedItems.filter(i => i.isUpdate).length;
  const newCount = parsedItems.filter(i => !i.isUpdate).length;
  const warningCount = parsedItems.filter(i => i.warnings.length > 0).length;

  // Shared-framework pass on the parsed items: within-upload duplicate program
  // codes (import protection) + the structured multi-sheet error report.
  const programValidation = useMemo(() => {
    if (parsedItems.length === 0) return null;
    return validateParsedEntities<ParsedProgramItem>({
      moduleName: 'Program & Coordinator Registry',
      fileName: bulkFileName || 'program_import.xlsx',
      items: parsedItems,
      labels: { program_code: 'Program Code' },
      duplicateKeyFields: ['program_code'],
      parserErrors: parsedItems.flatMap(i => i.warnings.map(w => `Row ${i.sr_no + 1}: ${w}`)),
      fieldsOf: (i) => ({ program_code: i.program_code }),
    });
  }, [parsedItems, bulkFileName]);
  const duplicateCodeCount = programValidation?.summary.duplicateRows ?? 0;

  const filteredParsedItems = parsedItems.filter(item => {
    if (bulkFilter === 'NEW') return !item.isUpdate;
    if (bulkFilter === 'UPDATE') return item.isUpdate;
    if (bulkFilter === 'WARNING') return item.warnings.length > 0;
    return true;
  });

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

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && selectedPrograms.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedPrograms.size})</span>
            </button>
          )}

          <button
            onClick={exportProgramsToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Registry</span>
          </button>

          {isSuperAdmin && (
            <>
              {/* Bulk Upload Button */}
              <button
                onClick={() => {
                  setBulkModalOpen(true);
                  if (parsedItems.length === 0) {
                    loadPreloadedSSPUPrograms();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Bulk Upload Programs</span>
              </button>

              {/* Add Program Button */}
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
            </>
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
        <p className="text-[11px] text-slate-500 px-4 pt-3">
          Sorted by <span className="font-semibold text-slate-700">{PROGRAM_SORT_LABELS[sort.key]}</span> · {sort.dir === 'asc' ? 'ascending' : 'descending'} — click any column header to reorder.
        </p>
        <div className="overflow-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider shadow-2xs">
              <tr>
                {isSuperAdmin && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={filteredPrograms.length > 0 && selectedPrograms.size === filteredPrograms.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPrograms(new Set(filteredPrograms.map(p => p.id)));
                        } else {
                          setSelectedPrograms(new Set());
                        }
                      }}
                    />
                  </th>
                )}
                <SortHeader k="sr_no" className="w-16 text-center font-mono" />
                <SortHeader k="program_code" className="w-32 font-mono" />
                <SortHeader k="program_name" className="min-w-[220px]" />
                <SortHeader k="primary" className="min-w-[200px]" />
                <SortHeader k="alternate" className="min-w-[200px]" />
                <th className="py-3 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedPrograms.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} className="py-8 text-center text-slate-400">
                    No academic programs found matching criteria.
                  </td>
                </tr>
              ) : (
                sortedPrograms.map((p) => {
                  const isEditing = editingProgId === p.id;
                  const primaryUser = users.find((u) => u.id === p.primary_coordinator_id);
                  const altUser = users.find((u) => u.id === p.alternate_coordinator_id);

                  const isMyPrimary = p.primary_coordinator_id === currentUser.id;
                  const isMyAlt = p.alternate_coordinator_id === currentUser.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-center border-r border-slate-100">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedPrograms.has(p.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedPrograms);
                              if (e.target.checked) newSet.add(p.id);
                              else newSet.delete(p.id);
                              setSelectedPrograms(newSet);
                            }}
                          />
                        </td>
                      )}
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

      {/* Bulk Upload Programs Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bulk Upload Academic Programs & Coordinators
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload an Excel or CSV file. Existing program codes are automatically detected and updated; new codes are registered.
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {uploadSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{uploadSuccessMessage}</span>
                </div>
              )}

              {/* Action Bar: Download Template & Preset */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-indigo-950 font-medium">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span>Need the standard column headers or full university registry?</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadPreloadedSSPUPrograms}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Preload SSPU Master Preset</span>
                  </button>
                </div>
              </div>

              {/* File Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-slate-50/80 rounded-xl p-5 text-center cursor-pointer transition-colors group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 rounded-full transition-colors">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {bulkFileName ? `Loaded: ${bulkFileName}` : 'Choose an Excel (.xlsx, .xls) or CSV file'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Drag and drop here, or click to browse from your device
                    </p>
                  </div>
                </div>
              </div>

              {/* Import Synchronization Strategy: Add & Update (Keep Old) vs Clear Old Records & Replace */}
              {parsedItems.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Import Strategy & Synchronization Mode</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose whether to preserve existing programs or clear old records before importing.
                      </p>
                    </div>
                    <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                          importMode === 'merge'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add & Update (Keep Old)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                          importMode === 'replace'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Old & Replace All</span>
                      </button>
                    </div>
                  </div>

                  {importMode === 'replace' ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-900 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Clear Old Records Mode Active:</span> All current programs in the database will be cleared, and only the {parsedItems.length} programs loaded here will be registered. Coordinator profiles and login credentials will be preserved.
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-900 text-[11px]">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        <span className="font-bold">Add & Update Mode Active:</span> Existing programs will be retained. Matching program codes will be updated and new codes will be appended.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Upsert Preview Section */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>Parsed Records ({parsedItems.length})</span>
                      </h4>
                      {/* Summary Badges */}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {newCount} New (To Register)
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {updateCount} Existing (To Update)
                      </span>
                      {warningCount > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {warningCount} Warnings
                        </span>
                      )}
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                      <button
                        onClick={() => setBulkFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${bulkFilter === 'ALL' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        All ({parsedItems.length})
                      </button>
                      <button
                        onClick={() => setBulkFilter('NEW')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${bulkFilter === 'NEW' ? 'bg-white shadow-2xs text-emerald-800 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        New ({newCount})
                      </button>
                      <button
                        onClick={() => setBulkFilter('UPDATE')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${bulkFilter === 'UPDATE' ? 'bg-white shadow-2xs text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Updates ({updateCount})
                      </button>
                      {warningCount > 0 && (
                        <button
                          onClick={() => setBulkFilter('WARNING')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${bulkFilter === 'WARNING' ? 'bg-white shadow-2xs text-rose-800 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Warnings ({warningCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Preview Table with Sticky Header */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-auto max-h-[340px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider shadow-2xs">
                          <tr>
                            <th className="py-2.5 px-3 w-28 text-center">Action / Status</th>
                            <th className="py-2.5 px-3 w-12 text-center font-mono">Sr</th>
                            <th className="py-2.5 px-3 w-28 font-mono">Code</th>
                            <th className="py-2.5 px-3 min-w-[200px]">Program Title & School</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Primary Coordinator</th>
                            <th className="py-2.5 px-3 min-w-[180px]">Alternate Coordinator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredParsedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 text-center">
                                {item.isUpdate ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>UPDATE</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>NEW</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                {item.sr_no}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {item.program_code}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 leading-snug">
                                  {item.program_name}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {item.school_name}
                                </div>
                                {item.warnings.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>{item.warnings.join(', ')}</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">{item.primary_name_display}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">{item.alternate_name_display}</span>
                                </div>
                              </td>
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
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {duplicateCodeCount > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {duplicateCodeCount} duplicate code(s)
                  </span>
                )}
                {programValidation && (
                  <button
                    type="button"
                    onClick={() => generateImportErrorReport(programValidation)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Validation Report</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={parsedItems.length === 0 || isUploading}
                  onClick={handleBulkCommit}
                  className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors ${
                    importMode === 'replace'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{importMode === 'replace' ? 'Clearing & Importing...' : 'Synchronizing Registry...'}</span>
                    </>
                  ) : (
                    <>
                      {importMode === 'replace' ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      <span>
                        {importMode === 'replace'
                          ? `Clear Old & Import (${parsedItems.length} Programs)`
                          : `Commit & Synchronize (${parsedItems.length} Programs)`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Program Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Add Academic Program to Registry
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Map new degree program with assigned and alternate faculty coordinators. If the program code exists, it will be updated.
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
                  Register / Update Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
