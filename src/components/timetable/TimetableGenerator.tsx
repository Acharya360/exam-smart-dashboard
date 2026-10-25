import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  FileSpreadsheet,
  Settings,
  Layers,
  Sparkles,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  Printer,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Send,
  SlidersHorizontal,
  ChevronRight,
  Building2,
  Clock,
  CalendarDays,
  FileText,
  UserCheck,
  X,
  FileUp,
  GraduationCap,
  PlusCircle,
  RotateCcw,
  Check,
  Split,
} from 'lucide-react';
import {
  StudentRecord,
  SlotMaster,
  ElectiveGroup,
  ScheduleRow,
  ScheduleConfig,
  ManualOverride,
  TimetableSession,
  TimetableClashInfo,
  ProgramStream,
  Program,
  CourseMaster,
} from '../../types';
import {
  DEFAULT_SLOT_MASTER,
  DEFAULT_ELECTIVES,
  DEFAULT_PROGRAM_STREAMS,
  buildDynamicStreamsFromPrograms,
  generateSchedule,
  auditScheduleClashes,
  detectFuzzyElectives,
  formatDateString,
  getDayName,
  toIsoDate,
  isEstEligible,
} from '../../utils/timetableEngine';
import {
  downloadStudentMasterTemplate,
  downloadElectivesTemplate,
  parseStudentExcel,
  exportTimetableWorkbook,
} from '../../utils/timetableExcel';
import { db } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface TimetableGeneratorProps {
  onNavigate?: (view: string, params?: Record<string, string>) => void;
}

export function TimetableGenerator({ onNavigate }: TimetableGeneratorProps = {}) {
  const { isSuperAdmin, currentUser } = useAuth();

  // Navigation steps
  const [activeStep, setActiveStep] = useState<
    'records' | 'dates' | 'slots' | 'matrix' | 'export'
  >('records');

  // Core Data State
  const [session, setSession] = useState<TimetableSession | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [slots, setSlots] = useState<SlotMaster[]>(DEFAULT_SLOT_MASTER);
  const [electives, setElectives] = useState<ElectiveGroup[]>(DEFAULT_ELECTIVES);
  const [manualOverrides, setManualOverrides] = useState<Record<string, ManualOverride>>({});
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

  // Config State (Date & Calendar)
  const [config, setConfig] = useState<ScheduleConfig>({
    useCalendarDates: true,
    hasBreakDay: false,
    oddStartDate1: '2026-11-16',
    oddStartDate2: '2026-11-17',
    evenStartDate1: '2026-11-16',
    evenStartDate2: '2026-11-17',
    holidays: ['2026-11-20', '2026-11-25'],
    examinationBasis: 'Both',
    schedulingStrategy: 'PROGRAM_STREAMS',
    programStreams: DEFAULT_PROGRAM_STREAMS,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Stream Keyword input map (stream.id -> text)
  const [newStreamKeywordInput, setNewStreamKeywordInput] = useState<Record<string, string>>({});

  // Filters for Step 1 (Records)
  const [selectedSchool, setSelectedSchool] = useState<string>('All');
  const [selectedIE, setSelectedIE] = useState<'ALL' | 'EXTERNAL' | 'INTERNAL' | 'BOTH'>('ALL');
  const [recordSearch, setRecordSearch] = useState('');

  // Filters for Step 4 (Matrix)
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFilterSchool, setMatrixFilterSchool] = useState('All');
  const [matrixFilterSlot, setMatrixFilterSlot] = useState('All');
  const [matrixFilterDate, setMatrixFilterDate] = useState('All');

  // New holiday input
  const [newHolidayInput, setNewHolidayInput] = useState('');

  // Manual Override Modal
  const [overrideModalRow, setOverrideModalRow] = useState<ScheduleRow | null>(null);
  const [overrideDateInput, setOverrideDateInput] = useState('');
  const [overrideSlotName, setOverrideSlotName] = useState('Slot 1');
  const [overrideSlotTime, setOverrideSlotTime] = useState('08:00 am to 09:30 am');

  // Course Master Picker (build session input from existing system data)
  const [courseMaster, setCourseMaster] = useState<CourseMaster[]>([]);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [pickerProgramCode, setPickerProgramCode] = useState('');
  const [pickerSemester, setPickerSemester] = useState('');
  const [pickerEstOnly, setPickerEstOnly] = useState(true);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  // Printable Notice Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'4 Signatures' | 'COE Only' | 'No Signatures'>('4 Signatures');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // True row count held by the session on the server; the state endpoint returns at
  // most 5000 records, and a truncated page must never drive a replace-write.
  const serverRecordsTotal = useRef(0);

  // 1. Initial State Loading from Database
  const loadState = async () => {
    try {
      setIsLoading(true);
      setStatusMessage(null);
      const data = await db.getTimetableState();

      // setConfig is asynchronous, so the first generation must use the config
      // parsed from this response rather than the component's mount-time state.
      let loadedConfig: ScheduleConfig | null = null;

      if (data.programs && data.programs.length > 0) {
        setPrograms(data.programs);
      }

      try {
        const cm = await db.getCourseMaster();
        setCourseMaster(cm || []);
      } catch (cmErr) {
        console.error('Failed to load course master for picker:', cmErr);
      }

      if (data.activeSession) {
        setSession(data.activeSession);
        let parsedStreams: ProgramStream[] = [];
        if (data.activeSession.streams_json) {
          try {
            parsedStreams = JSON.parse(data.activeSession.streams_json);
          } catch (e) {
            parsedStreams = [];
          }
        }
        if (parsedStreams.length === 0 && data.programs && data.programs.length > 0) {
          parsedStreams = buildDynamicStreamsFromPrograms(data.programs);
        } else if (parsedStreams.length === 0) {
          parsedStreams = DEFAULT_PROGRAM_STREAMS;
        }

        loadedConfig = {
          useCalendarDates: data.activeSession.use_calendar_dates,
          hasBreakDay: data.activeSession.has_break_day,
          oddStartDate1: toIsoDate(data.activeSession.odd_start_date_1) || '2026-11-16',
          oddStartDate2: toIsoDate(data.activeSession.odd_start_date_2) || '2026-11-17',
          evenStartDate1: toIsoDate(data.activeSession.even_start_date_1) || '2026-11-16',
          evenStartDate2: toIsoDate(data.activeSession.even_start_date_2) || '2026-11-17',
          holidays: data.activeSession.holidays_json
            ? JSON.parse(data.activeSession.holidays_json)
            : ['2026-11-20', '2026-11-25'],
          examinationBasis: data.activeSession.basis || 'Both',
          schedulingStrategy: data.activeSession.scheduling_strategy || 'PROGRAM_STREAMS',
          programStreams: parsedStreams,
        };
        setConfig(loadedConfig);
      }

      if (data.slots && data.slots.length > 0) {
        setSlots(data.slots);
      }
      if (data.electives && data.electives.length > 0) {
        setElectives(data.electives);
      }

      // Load records directly from database
      const recs = data.records || [];
      setRecords(recs);
      serverRecordsTotal.current = data.recordsCount || recs.length;

      if (data.manualOverrides) {
        setManualOverrides(data.manualOverrides);
      }
      if (data.schedule && data.schedule.length > 0) {
        setSchedule(data.schedule);
      } else if (recs.length > 0) {
        const gen = generateSchedule(
          recs,
          loadedConfig ?? config,
          data.slots?.length ? data.slots : DEFAULT_SLOT_MASTER,
          data.electives?.length ? data.electives : DEFAULT_ELECTIVES,
          data.manualOverrides || {}
        );
        setSchedule(gen);
      }
      if (recs.length < serverRecordsTotal.current) {
        setStatusMessage({
          type: 'info',
          text: `Only ${recs.length} of ${serverRecordsTotal.current} stored student records were loaded for this session, so record-replacing imports and Course Master merges are blocked to protect the unloaded rows.`,
        });
      }
    } catch (err) {
      console.error('Failed to load timetable state:', err);
      setStatusMessage({
        type: 'error',
        text: 'Unable to connect to timetable database service. Operating in client workspace mode.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  // Compute Clashes
  const clashes: TimetableClashInfo[] = useMemo(() => {
    if (!schedule.length || !records.length) return [];
    return auditScheduleClashes(schedule, records);
  }, [schedule, records]);

  // Unique list of schools from database programs and loaded student records
  const availableSchools = useMemo(() => {
    const fromPrograms = programs.map((p) => p.school_name);
    const fromRecords = records.map((r) => r.centre);
    return Array.from(new Set([...fromPrograms, ...fromRecords])).filter(Boolean);
  }, [programs, records]);

  // Unique list of dates in schedule
  const scheduledDates = useMemo(() => {
    return Array.from(new Set(schedule.map((s) => s.date))).filter(
      (d) => d && d !== 'Unassigned'
    );
  }, [schedule]);

  // Filtered Student Records for Tab 1
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedSchool !== 'All' && r.centre !== selectedSchool) return false;
      if (selectedIE !== 'ALL' && r.internalExternal !== selectedIE) return false;
      if (recordSearch) {
        const q = recordSearch.toLowerCase();
        const matchCode = r.courseCode.toLowerCase().includes(q);
        const matchTitle = r.courseTitle.toLowerCase().includes(q);
        const matchStudent = r.studentName.toLowerCase().includes(q);
        const matchPrn = r.prn.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchStudent && !matchPrn) return false;
      }
      return true;
    });
  }, [records, selectedSchool, selectedIE, recordSearch]);

  // Filtered Schedule Rows for Tab 4
  const filteredSchedule = useMemo(() => {
    return schedule.filter((s) => {
      if (matrixFilterSchool !== 'All' && s.schoolName !== matrixFilterSchool) return false;
      if (matrixFilterSlot !== 'All' && s.slotName !== matrixFilterSlot) return false;
      if (matrixFilterDate !== 'All' && s.date !== matrixFilterDate) return false;
      if (matrixSearch) {
        const q = matrixSearch.toLowerCase();
        const matchCode = s.courseCode.toLowerCase().includes(q);
        const matchName = s.courseName.toLowerCase().includes(q);
        const matchProg = s.programName.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchProg) return false;
      }
      return true;
    });
  }, [schedule, matrixFilterSchool, matrixFilterSlot, matrixFilterDate, matrixSearch]);

  // Trigger Schedule Generation
  const handleRunGenerator = async () => {
    if (!records.length) {
      setStatusMessage({ type: 'info', text: 'Please upload student master records first.' });
      setActiveStep('records');
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const generated = generateSchedule(records, config, slots, electives, manualOverrides);
      setSchedule(generated);

      const conflicts = auditScheduleClashes(generated, records);
      if (conflicts.length === 0) {
        setStatusMessage({
          type: 'success',
          text: `Optimized timetable generated successfully for ${generated.length} papers. Zero student collisions detected!`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: `Timetable generated with ${conflicts.length} student clash(es). Review and resolve via Manual Override.`,
        });
      }

      // Automatically persist schedule to local SQL Server
      if (session?.id) {
        await db.saveGeneratedTimetable(session.id, generated, manualOverrides);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error generating timetable.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Both session writes are full replaces, so they must be refused while the page
  // holds only part of the stored records — the rest would be deleted server-side.
  const isReplaceBlocked = () => {
    if (records.length >= serverRecordsTotal.current) return false;
    setStatusMessage({
      type: 'error',
      text: `This session stores ${serverRecordsTotal.current} records but only ${records.length} could be loaded. Replacing session records is blocked to protect the unloaded rows — clear the session or work in a new one.`,
    });
    return true;
  };

  // Handle Excel Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      if (isReplaceBlocked()) return;
      const buffer = await file.arrayBuffer();
      const parsed = parseStudentExcel(buffer);

      if (!parsed.length) {
        throw new Error('No valid student course records found in the Excel file.');
      }

      // Validate uploaded course codes against the system Course Master
      let validationNote = '';
      if (courseMaster.length > 0) {
        const knownCodes = new Set(courseMaster.map((c) => (c.paper_code || '').toUpperCase()));
        const unknownCodes = Array.from(
          new Set(parsed.map((r) => (r.courseCode || '').toUpperCase()).filter((code) => code && !knownCodes.has(code)))
        );
        if (unknownCodes.length > 0) {
          validationNote = ` Warning: ${unknownCodes.length} course code(s) not found in Course Master (${unknownCodes.slice(0, 5).join(', ')}${unknownCodes.length > 5 ? '…' : ''}).`;
        }
      }

      setRecords(parsed);
      setStatusMessage({
        type: validationNote ? 'info' : 'success',
        text: `Loaded ${parsed.length} student registration entries across ${Array.from(new Set(parsed.map((r) => r.courseCode))).length} distinct courses!${validationNote}`,
      });

      // Persist to SQL database if session exists
      if (session?.id) {
        await db.uploadTimetableRecords(session.id, parsed, false);
      }

      // Auto-generate preliminary schedule
      const gen = generateSchedule(parsed, config, slots, electives, manualOverrides);
      setSchedule(gen);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to parse Excel file.' });
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Course Master Picker: derive selectable courses & semesters
  const pickerBaseCourses = useMemo(() => {
    let list = courseMaster;
    if (pickerProgramCode) {
      list = list.filter((c) => (c.program_code || '').toUpperCase() === pickerProgramCode.toUpperCase());
    }
    if (pickerEstOnly) {
      list = list.filter((c) => isEstEligible(c.regulation_group));
    }
    return list;
  }, [courseMaster, pickerProgramCode, pickerEstOnly]);

  const pickerSemesters = useMemo(
    () => Array.from(new Set(pickerBaseCourses.map((c) => String(c.semester)))).sort(),
    [pickerBaseCourses]
  );

  const pickerCourses = useMemo(
    () => (pickerSemester ? pickerBaseCourses.filter((c) => String(c.semester) === pickerSemester) : pickerBaseCourses),
    [pickerBaseCourses, pickerSemester]
  );

  const handleAddFromCoursePicker = async () => {
    const selected = pickerCourses.filter((c) => pickerSelected.has(c.id));
    if (!selected.length) {
      setStatusMessage({ type: 'info', text: 'Select at least one course from the Course Master list.' });
      return;
    }

    setIsLoading(true);
    try {
      if (isReplaceBlocked()) return;
      const program = programs.find((p) => p.program_code.toUpperCase() === pickerProgramCode.toUpperCase());
      const newRecs: StudentRecord[] = selected.map((c) => ({
        centre: program?.school_name || c.cm_course_name || 'Main Campus',
        program: program?.program_name || c.program_name || pickerProgramCode,
        semester: String(c.semester),
        prn: `COHORT-${c.paper_code}`,
        studentName: `Cohort (${c.student_count || 0} students)`,
        courseCode: c.paper_code,
        courseTitle: c.sm_subject_name,
        isApplied: true,
        studentCount: c.student_count || 0,
      }));

      // Keep real student records; replace previously added cohort rows for the same courses
      const merged = [
        ...records.filter(
          (r) =>
            !(
              (r.prn || '').startsWith('COHORT-') &&
              newRecs.some((n) => n.courseCode === r.courseCode && n.program === r.program)
            )
        ),
        ...newRecs,
      ];

      setRecords(merged);
      if (session?.id) {
        await db.uploadTimetableRecords(session.id, merged, false);
      }

      const gen = generateSchedule(merged, config, slots, electives, manualOverrides);
      setSchedule(gen);
      setPickerSelected(new Set());

      const totalStudents = newRecs.reduce((sum, r) => sum + (r.studentCount || 0), 0);
      setStatusMessage({
        type: 'success',
        text: `Added ${selected.length} course(s) from Course Master covering ${totalStudents} student(s). Preliminary schedule generated.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add courses from Course Master.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run AI Fuzzy Elective Auto-Detection
  const handleAutoDetectElectives = async () => {
    if (!records.length) {
      setStatusMessage({ type: 'info', text: 'Upload student records first to detect electives.' });
      return;
    }
    const detected = detectFuzzyElectives(records, 85);
    if (!detected.length) {
      setStatusMessage({
        type: 'info',
        text: 'No potential elective bundles with disjoint student cohorts were detected.',
      });
      return;
    }

    setElectives((prev) => [...prev, ...detected]);
    setStatusMessage({
      type: 'success',
      text: `Auto-clustered ${detected.length} elective course groups with guaranteed disjoint student sets!`,
    });

    if (session?.id) {
      await db.saveTimetableElectives(session.id, [...electives, ...detected]);
    }
  };

  // Add / Remove Holiday
  const handleAddHoliday = () => {
    if (!newHolidayInput) return;
    if (config.holidays.includes(newHolidayInput)) return;
    const updated = [...config.holidays, newHolidayInput].sort();
    setConfig((prev) => ({ ...prev, holidays: updated }));
    setNewHolidayInput('');
  };

  const handleRemoveHoliday = (hDate: string) => {
    setConfig((prev) => ({ ...prev, holidays: prev.holidays.filter((h) => h !== hDate) }));
  };

  // Open Manual Override Modal
  const handleOpenOverride = (row: ScheduleRow) => {
    setOverrideModalRow(row);
    setOverrideDateInput(toIsoDate(row.date === 'Unassigned' ? config.oddStartDate1 : row.date));
    setOverrideSlotName(row.slotName);
    setOverrideSlotTime(row.slotTime);
  };

  // Apply Manual Override
  const handleSaveOverride = async () => {
    if (!overrideModalRow) return;
    if (!overrideDateInput) {
      setStatusMessage({ type: 'error', text: 'Please pick a valid exam date before applying the override.' });
      return;
    }
    const key = `${overrideModalRow.schoolName}:::${overrideModalRow.programName}:::${overrideModalRow.semester}:::${overrideModalRow.courseCode}`;

    let dayName = '-';
    try {
      const d = new Date(overrideDateInput);
      if (!isNaN(d.getTime())) dayName = getDayName(d);
    } catch {}

    const updatedOverrides = {
      ...manualOverrides,
      [key]: {
        date: overrideDateInput,
        day: dayName,
        slotName: overrideSlotName,
        slotTime: overrideSlotTime,
      },
    };

    setManualOverrides(updatedOverrides);
    setOverrideModalRow(null);

    // Re-generate schedule with new override
    const gen = generateSchedule(records, config, slots, electives, updatedOverrides);
    setSchedule(gen);

    if (session?.id) {
      await db.saveGeneratedTimetable(session.id, gen, updatedOverrides);
    }

    // Cascade the new date/time to the published exam schedule & pending tasks (if already published)
    let syncNote = '';
    try {
      const updatedRow = gen.find(
        (r) =>
          r.schoolName === overrideModalRow.schoolName &&
          r.programName === overrideModalRow.programName &&
          r.semester === overrideModalRow.semester &&
          r.courseCode === overrideModalRow.courseCode
      );
      if (updatedRow && updatedRow.date !== 'Unassigned') {
        const sync = await db.syncPublishedScheduleDate(updatedRow);
        if (sync.synced) {
          syncNote = ` Published exam records updated${sync.tasksUpdated ? ` (${sync.tasksUpdated} pending task due dates shifted)` : ''}.`;
        }
      }
    } catch (syncErr) {
      console.error('[Timetable] Failed to sync override to published schedules:', syncErr);
      syncNote = ' Warning: published exam records could not be updated automatically.';
    }

    setStatusMessage({
      type: 'success',
      text: `Manual slot & date override applied for ${overrideModalRow.courseCode}.${syncNote}`,
    });
  };

  // Publish Directly to Exam Schedules & Tasks
  const handlePublishToSchedules = async () => {
    if (!schedule.length) {
      setStatusMessage({ type: 'info', text: 'No schedule available to publish.' });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to publish ${schedule.length} timetable courses directly into official Exam Schedules and auto-generate 4-phase milestone workflows?`
      )
    ) {
      return;
    }

    setIsPublishing(true);
    setStatusMessage(null);
    try {
      const res = await db.publishTimetableToSchedules(schedule);
      setStatusMessage({
        type: 'success',
        text: res.message || 'Timetable published to official examination records successfully!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to publish timetable to exam schedules.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Stream Management Handlers
  const handleApplyStreamPreset = () => {
    const dynamic = buildDynamicStreamsFromPrograms(programs);
    setConfig((prev) => ({
      ...prev,
      schedulingStrategy: 'PROGRAM_STREAMS',
      programStreams: dynamic,
    }));
    setStatusMessage({
      type: 'success',
      text: 'Applied university preset dynamically generated from database programs.',
    });
  };

  const handleAddStream = () => {
    const currentStreams = config.programStreams || DEFAULT_PROGRAM_STREAMS;
    const nextOffset = currentStreams.length % 4;
    const newStream: ProgramStream = {
      id: `stream-${Date.now()}`,
      name: `Stream ${currentStreams.length + 1}: Custom Faculty Group`,
      programsOrSchools: [],
      dayOffset: nextOffset,
      dayStep: 2,
      appliesTo: 'Both',
    };
    setConfig((prev) => ({
      ...prev,
      programStreams: [...(prev.programStreams || DEFAULT_PROGRAM_STREAMS), newStream],
    }));
  };

  const handleRemoveStream = (streamId: string) => {
    const current = config.programStreams || DEFAULT_PROGRAM_STREAMS;
    if (current.length <= 1) {
      setStatusMessage({ type: 'info', text: 'At least one stream group must remain configured.' });
      return;
    }
    setConfig((prev) => ({
      ...prev,
      programStreams: current.filter((s) => s.id !== streamId),
    }));
  };

  const handleUpdateStream = (streamId: string, updates: Partial<ProgramStream>) => {
    setConfig((prev) => ({
      ...prev,
      programStreams: (prev.programStreams || DEFAULT_PROGRAM_STREAMS).map((s) =>
        s.id === streamId ? { ...s, ...updates } : s
      ),
    }));
  };

  const handleAddKeywordToStream = (streamId: string, kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    setConfig((prev) => ({
      ...prev,
      programStreams: (prev.programStreams || DEFAULT_PROGRAM_STREAMS).map((s) => {
        if (s.id !== streamId) return s;
        if (s.programsOrSchools.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return s;
        return { ...s, programsOrSchools: [...s.programsOrSchools, trimmed] };
      }),
    }));
    setNewStreamKeywordInput((prev) => ({ ...prev, [streamId]: '' }));
  };

  const handleRemoveKeywordFromStream = (streamId: string, kw: string) => {
    setConfig((prev) => ({
      ...prev,
      programStreams: (prev.programStreams || DEFAULT_PROGRAM_STREAMS).map((s) =>
        s.id === streamId
          ? { ...s, programsOrSchools: s.programsOrSchools.filter((p) => p !== kw) }
          : s
      ),
    }));
  };

  // Save Settings / Config to Server
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      if (session?.id) {
        await db.saveTimetableSession({
          id: session.id,
          name: session.name,
          basis: config.examinationBasis,
          odd_start_date_1: config.oddStartDate1,
          odd_start_date_2: config.oddStartDate2,
          even_start_date_1: config.evenStartDate1,
          even_start_date_2: config.evenStartDate2,
          holidays_json: JSON.stringify(config.holidays),
          has_break_day: config.hasBreakDay,
          use_calendar_dates: config.useCalendarDates,
          scheduling_strategy: config.schedulingStrategy || 'PROGRAM_STREAMS',
          streams_json: JSON.stringify(config.programStreams || DEFAULT_PROGRAM_STREAMS),
        });

        await db.saveTimetableSlots(session.id, slots);
        await db.saveTimetableElectives(session.id, electives);
      }
      setStatusMessage({ type: 'success', text: 'Timetable configuration saved successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Status Cards */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-72 h-72 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-800/60 px-3 py-1 text-xs font-semibold text-violet-200 border border-violet-700/60 mb-3 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>EMS Intelligent Timetable Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Master Examination Timetable & Schedule Generator
            </h1>
            <p className="mt-1 text-sm md:text-base text-violet-200/90 max-w-3xl">
              Automated multi-slot examination scheduler with intelligent cohort clash detection,
              staggered start dates, break-day spacing, and direct ERP workflow synchronization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunGenerator}
              disabled={isLoading || !records.length}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-semibold px-5 py-2.5 shadow-lg shadow-violet-900/40 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Optimizing...' : 'Run Engine'}</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={handlePublishToSchedules}
                disabled={isPublishing || !schedule.length}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              >
                <Send size={18} />
                <span>{isPublishing ? 'Publishing...' : 'Publish to ERP'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-violet-800/50">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-violet-200">Total Student Entries</span>
            <div className="text-xl font-bold mt-0.5">{records.length.toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-violet-200">Scheduled Courses</span>
            <div className="text-xl font-bold mt-0.5">{schedule.length.toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-violet-200">Examination Days</span>
            <div className="text-xl font-bold mt-0.5">{scheduledDates.length} Days</div>
          </div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/5">
            <span className="text-xs text-violet-200">Cohort Clashes</span>
            <div
              className={`text-xl font-bold mt-0.5 flex items-center gap-1.5 ${
                clashes.length === 0 ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {clashes.length === 0 ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>0 Conflicts</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={18} />
                  <span>{clashes.length} Detected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          role="alert"
          className={`rounded-xl p-4 text-sm flex items-start gap-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertTriangle size={20} className="shrink-0 text-rose-600 mt-0.5" />}
          {statusMessage.type === 'info' && <AlertTriangle size={20} className="shrink-0 text-amber-600 mt-0.5" />}
          <div className="flex-1 font-medium">{statusMessage.text}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Step Navigation Bar */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveStep('records')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap cursor-pointer ${
            activeStep === 'records'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>1. Student Master Upload</span>
          {records.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-violet-700/80 text-violet-100">
              {records.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveStep('dates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap cursor-pointer ${
            activeStep === 'dates'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar size={16} />
          <span>2. Date & Calendar Rules</span>
        </button>

        <button
          onClick={() => setActiveStep('slots')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap cursor-pointer ${
            activeStep === 'slots'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers size={16} />
          <span>3. Slot Master & Electives</span>
        </button>

        <button
          onClick={() => setActiveStep('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap cursor-pointer ${
            activeStep === 'matrix'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span>4. Timetable Matrix</span>
          {schedule.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-violet-700/80 text-violet-100">
              {schedule.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveStep('export')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition whitespace-nowrap cursor-pointer ${
            activeStep === 'export'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Download size={16} />
          <span>5. Multi-Sheet Export</span>
        </button>
      </div>

      {/* =========================================================================
          STEP 1: STUDENT MASTER DATA & EXCEL IMPORT
          ========================================================================= */}
      {activeStep === 'records' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upload Box */}
            <div className="md:col-span-2 rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                    <FileUp size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Upload University Student Master</h3>
                    <p className="text-xs text-slate-500">
                      Standard university registration file (.xlsx) with student PRNs and course codes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await loadState();
                      setStatusMessage({
                        type: 'success',
                        text: 'Synchronized student master records and university programs directly from SQL Server database.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <RefreshCw size={14} className="text-emerald-600" />
                    <span>Sync from Database</span>
                  </button>

                  <button
                    onClick={downloadStudentMasterTemplate}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download Blank Template</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-xl p-8 text-center bg-slate-50/60 hover:bg-violet-50/20 transition cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shadow-sm">
                  <Upload size={24} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Click to browse or drop Master Student Excel file here
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Supports .xlsx, .xls files up to 50MB. Auto-parses student cohorts & subjects.
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
              </div>

              {records.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
                  <span>Currently Loaded: <strong>{records.length}</strong> student registrations</span>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all student master records from current session?')) {
                        setRecords([]);
                        if (session?.id) db.clearTimetableRecords(session.id);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Clear Records
                  </button>
                </div>
              )}
            </div>

            {/* Quick Summary & Instructions */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Import Guidelines</h4>
                <ul className="text-xs text-slate-600 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>File must contain <strong>STUDENT_ID (PRN)</strong> and <strong>UNIVERSITY_CODE (Course Code)</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>CENTRE_NAME</strong> maps to School/Campus.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span><strong>ORG_SEMESTER_NAME</strong> accepts Roman numerals (I - X) or digits (1 - 10).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span>Multiple student entries with the same course code automatically aggregate regular vs backlog headcounts.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-200 mt-4">
                <button
                  onClick={() => setActiveStep('dates')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 text-sm shadow-sm transition cursor-pointer"
                >
                  <span>Proceed to Date Rules</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Course Master Picker */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            <button
              onClick={() => setShowCoursePicker((v) => !v)}
              className="w-full flex items-center justify-between p-5 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Layers size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900">Build from Course Master</h3>
                  <p className="text-xs text-slate-500">
                    Select existing program &amp; courses from the system registry — no Excel required. Student counts are taken from Course Master.
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className={`text-slate-400 transition-transform ${showCoursePicker ? 'rotate-90' : ''}`} />
            </button>

            {showCoursePicker && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-56">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Program</label>
                    <select
                      value={pickerProgramCode}
                      onChange={(e) => {
                        setPickerProgramCode(e.target.value);
                        setPickerSemester('');
                        setPickerSelected(new Set());
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All Programs</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.program_code}>
                          {p.program_name} ({p.program_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-32">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
                    <select
                      value={pickerSemester}
                      onChange={(e) => {
                        setPickerSemester(e.target.value);
                        setPickerSelected(new Set());
                      }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                    >
                      <option value="">All Semesters</option>
                      {pickerSemesters.map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pickerEstOnly}
                      onChange={(e) => {
                        setPickerEstOnly(e.target.checked);
                        setPickerSelected(new Set());
                      }}
                      className="rounded border-slate-300 text-violet-600"
                    />
                    End Semester Theory (EST) courses only
                  </label>

                  <div className="ml-auto flex items-center gap-3 pb-1">
                    <span className="text-xs text-slate-500">
                      {pickerSelected.size} selected · {pickerCourses.length} shown
                    </span>
                    {isSuperAdmin && (
                      <button
                        onClick={handleAddFromCoursePicker}
                        disabled={pickerSelected.size === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-semibold shadow-sm transition cursor-pointer"
                      >
                        <PlusCircle size={14} />
                        Add to Session
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600">
                        <th className="p-2.5 w-8">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-violet-600 cursor-pointer"
                            checked={pickerCourses.length > 0 && pickerSelected.size === pickerCourses.length}
                            onChange={(e) =>
                              setPickerSelected(e.target.checked ? new Set(pickerCourses.map((c) => c.id)) : new Set())
                            }
                          />
                        </th>
                        <th className="p-2.5 font-semibold">Paper Code</th>
                        <th className="p-2.5 font-semibold">Subject Name</th>
                        <th className="p-2.5 font-semibold">Program</th>
                        <th className="p-2.5 font-semibold">Sem</th>
                        <th className="p-2.5 font-semibold">Regulation Group</th>
                        <th className="p-2.5 font-semibold text-right">Students</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickerCourses.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400">
                            {courseMaster.length === 0
                              ? 'Course Master is empty. Import courses first from the Course Master screen.'
                              : 'No courses match the selected filters.'}
                          </td>
                        </tr>
                      )}
                      {pickerCourses.map((c) => {
                        const est = isEstEligible(c.regulation_group);
                        return (
                          <tr key={c.id} className="border-t border-slate-100 hover:bg-violet-50/40">
                            <td className="p-2.5">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-violet-600 cursor-pointer"
                                checked={pickerSelected.has(c.id)}
                                onChange={(e) => {
                                  const next = new Set(pickerSelected);
                                  if (e.target.checked) next.add(c.id);
                                  else next.delete(c.id);
                                  setPickerSelected(next);
                                }}
                              />
                            </td>
                            <td className="p-2.5 font-mono font-semibold text-slate-800">{c.paper_code}</td>
                            <td className="p-2.5 text-slate-700">{c.sm_subject_name}</td>
                            <td className="p-2.5 text-slate-500">{c.program_code || c.program_name || '—'}</td>
                            <td className="p-2.5 text-slate-600">{c.semester}</td>
                            <td className="p-2.5">
                              <span className={est ? 'text-emerald-700' : 'text-amber-700'}>
                                {c.regulation_group || '(not set)'}
                              </span>
                              {est && (
                                <span className="ml-1.5 inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                  EST
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-slate-700">{Number(c.student_count) || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-400">
                  Only courses whose Regulation Group contains the <strong>EST</strong> token on the end-semester side (right of “|”) generate End Semester Theory timetable entries. Courses with no Regulation Group recorded are treated as eligible so missing data never silently drops papers.
                </p>
              </div>
            )}
          </div>

          {/* Records Table Preview */}
          {records.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">
                  Student Master Records ({filteredRecords.length.toLocaleString()})
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  {/* School Filter */}
                  <select
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                    className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 bg-white text-slate-700"
                  >
                    <option value="All">All Schools / Centres</option>
                    {availableSchools.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {/* Internal / External Filter */}
                  <select
                    value={selectedIE}
                    onChange={(e) => setSelectedIE(e.target.value as any)}
                    className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 bg-white text-slate-700"
                  >
                    <option value="ALL">All Heads (Int / Ext)</option>
                    <option value="EXTERNAL">External Only</option>
                    <option value="INTERNAL">Internal Only</option>
                    <option value="BOTH">Both</option>
                  </select>

                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search PRN, code..."
                      value={recordSearch}
                      onChange={(e) => setRecordSearch(e.target.value)}
                      className="rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs w-44"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">School / Centre</th>
                      <th className="p-3">Programme</th>
                      <th className="p-3">Sem</th>
                      <th className="p-3">Student PRN</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Course Code</th>
                      <th className="p-3">Course Title</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredRecords.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-400">{i + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{r.centre}</td>
                        <td className="p-3">{r.program}</td>
                        <td className="p-3 font-semibold text-slate-900">{r.semester}</td>
                        <td className="p-3 font-mono font-medium text-violet-700">{r.prn}</td>
                        <td className="p-3 font-medium">{r.studentName}</td>
                        <td className="p-3 font-mono font-semibold text-slate-800">{r.courseCode}</td>
                        <td className="p-3">{r.courseTitle}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {r.internalExternal || 'EXT'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.isApplied !== false
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {r.applicationStatus || 'APPLIED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length > 50 && (
                <div className="text-center text-xs text-slate-500 py-1">
                  Showing first 50 rows of {filteredRecords.length.toLocaleString()} records.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 2: DATE RULES & CALENDAR SETTINGS
          ========================================================================= */}
      {activeStep === 'dates' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Examination Dates & Scheduling Parameters</h3>
                <p className="text-xs text-slate-500">
                  Configure faculty stream alternating day cadences, staggered semester dates, and university blackout dates.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Database size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>

            {/* 1. Scheduling Strategy Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Examination Scheduling Strategy
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Program & Faculty Streams (Alternating Days) */}
                <div
                  onClick={() => setConfig({ ...config, schedulingStrategy: 'PROGRAM_STREAMS' })}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 relative ${
                    config.schedulingStrategy !== 'SEMESTER_BASED'
                      ? 'border-violet-600 bg-violet-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      config.schedulingStrategy !== 'SEMESTER_BASED'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Split size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        Faculty & Program Streams (Alternating Days)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Schedules exams by faculty streams (e.g. Science & Management on <strong>Day 1, 3, 5...</strong> and
                      Engineering & Architecture on <strong>Day 2, 4, 6...</strong>). Supports both regular and backlog papers
                      across odd & even semesters without room capacity clashes.
                    </p>
                  </div>
                </div>

                {/* Option 2: Traditional Semester Staggered */}
                <div
                  onClick={() => setConfig({ ...config, schedulingStrategy: 'SEMESTER_BASED' })}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 relative ${
                    config.schedulingStrategy === 'SEMESTER_BASED'
                      ? 'border-violet-600 bg-violet-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      config.schedulingStrategy === 'SEMESTER_BASED'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CalendarDays size={20} />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-sm text-slate-900">
                      Semester-Based Cohort Staggering
                    </span>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Traditional semester staggering by odd semester groups (Sem 1, 5, 9 vs Sem 3, 7) and even semester groups
                      (Sem 2, 6, 10 vs Sem 4, 8).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2A. PROGRAM STREAMS CONFIGURATION PANEL */}
            {config.schedulingStrategy !== 'SEMESTER_BASED' ? (
              <div className="space-y-5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-violet-50 via-indigo-50 to-slate-50 p-4 rounded-xl border border-violet-100">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="text-violet-700" size={20} />
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        Configured Faculty Examination Streams
                      </h4>
                      <p className="text-xs text-slate-500">
                        Customize day offsets, interval pacing, and school assignments for each stream.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyStreamPreset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <RotateCcw size={14} className="text-violet-600" />
                      <span>Apply Preset (Sci & Mgmt vs Engg & Arch)</span>
                    </button>
                    <button
                      onClick={handleAddStream}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add Stream Group</span>
                    </button>
                  </div>
                </div>

                {/* List of Stream Cards */}
                <div className="space-y-4">
                  {(config.programStreams || DEFAULT_PROGRAM_STREAMS).map((stream, sIdx) => {
                    const cadencePreview = [0, 1, 2, 3]
                      .map((idx) => `Day ${stream.dayOffset + 1 + idx * stream.dayStep}`)
                      .join(', ') + '...';

                    return (
                      <div
                        key={stream.id || sIdx}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-violet-300 transition space-y-4"
                      >
                        {/* Stream Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <input
                              type="text"
                              value={stream.name}
                              onChange={(e) => handleUpdateStream(stream.id, { name: e.target.value })}
                              className="font-semibold text-slate-900 text-sm border-b border-dashed border-slate-300 hover:border-violet-500 focus:border-violet-600 px-1 py-0.5 outline-none bg-transparent"
                              placeholder="Stream Name"
                            />
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Cadence: {cadencePreview}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRemoveStream(stream.id)}
                              disabled={(config.programStreams || DEFAULT_PROGRAM_STREAMS).length <= 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 rounded transition cursor-pointer"
                              title="Delete Stream Group"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Stream Scheduling Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Starting Day Offset
                            </label>
                            <select
                              value={stream.dayOffset}
                              onChange={(e) =>
                                handleUpdateStream(stream.id, { dayOffset: parseInt(e.target.value, 10) })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50 font-medium"
                            >
                              <option value={0}>Starts Day 1 (1st Day)</option>
                              <option value={1}>Starts Day 2 (2nd Day)</option>
                              <option value={2}>Starts Day 3 (3rd Day)</option>
                              <option value={3}>Starts Day 4 (4th Day)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Interval Cadence
                            </label>
                            <select
                              value={stream.dayStep}
                              onChange={(e) =>
                                handleUpdateStream(stream.id, { dayStep: parseInt(e.target.value, 10) })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50 font-medium"
                            >
                              <option value={2}>Alternate Days (+2 days: 1, 3, 5...)</option>
                              <option value={1}>Consecutive Days (Daily: 1, 2, 3...)</option>
                              <option value={3}>Every 3rd Day (+3 days: 1, 4, 7...)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Applicable Exam Scope
                            </label>
                            <select
                              value={stream.appliesTo}
                              onChange={(e) =>
                                handleUpdateStream(stream.id, { appliesTo: e.target.value as any })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-slate-50 font-medium"
                            >
                              <option value="Both">Both Regular & Backlog</option>
                              <option value="Regular">Regular Exams Only</option>
                              <option value="Backlog">Backlog Exams Only</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Odd Sem Start Date
                            </label>
                            <input
                              type="date"
                              value={stream.startDateOdd || config.oddStartDate1}
                              onChange={(e) =>
                                handleUpdateStream(stream.id, { startDateOdd: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Even Sem Start Date
                            </label>
                            <input
                              type="date"
                              value={stream.startDateEven || config.evenStartDate1}
                              onChange={(e) =>
                                handleUpdateStream(stream.id, { startDateEven: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                            />
                          </div>
                        </div>

                        {/* Included Schools and Programs Chips */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Matched Schools, Faculties & Programs ({stream.programsOrSchools.length})
                          </label>

                          <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg bg-slate-50 border border-slate-200">
                            {stream.programsOrSchools.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">
                                No schools or programs mapped. Click below to add.
                              </span>
                            ) : (
                              stream.programsOrSchools.map((kw) => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
                                >
                                  <span>{kw}</span>
                                  <button
                                    onClick={() => handleRemoveKeywordFromStream(stream.id, kw)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Quick Add Available Schools from Student Records */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">Quick Add from Loaded Master:</span>
                            {availableSchools
                              .filter((school) => !stream.programsOrSchools.includes(school))
                              .slice(0, 4)
                              .map((school) => (
                                <button
                                  key={school}
                                  onClick={() => handleAddKeywordToStream(stream.id, school)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded border border-violet-200 transition cursor-pointer"
                                >
                                  <Plus size={11} />
                                  <span className="truncate max-w-[200px]">{school}</span>
                                </button>
                              ))}

                            <div className="flex items-center gap-1 ml-auto">
                              <input
                                type="text"
                                value={newStreamKeywordInput[stream.id] || ''}
                                onChange={(e) =>
                                  setNewStreamKeywordInput({ ...newStreamKeywordInput, [stream.id]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddKeywordToStream(stream.id, newStreamKeywordInput[stream.id] || '');
                                  }
                                }}
                                placeholder="Add custom program/school..."
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs bg-white w-48"
                              />
                              <button
                                onClick={() =>
                                  handleAddKeywordToStream(stream.id, newStreamKeywordInput[stream.id] || '')
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition cursor-pointer"
                              >
                                <Plus size={12} />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 2B. TRADITIONAL SEMESTER-BASED CONFIGURATION PANEL */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Odd Semesters Staggered Start */}
                <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-4">
                  <div className="flex items-center gap-2 text-violet-700 font-semibold text-sm">
                    <CalendarDays size={18} />
                    <span>Odd Semesters (1, 3, 5, 7, 9)</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Odd Semesters Group 1 Start Date (Sem 1, 5, 9)
                      </label>
                      <input
                        type="date"
                        value={config.oddStartDate1}
                        onChange={(e) => setConfig({ ...config, oddStartDate1: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Odd Semesters Group 2 Start Date (Sem 3, 7)
                      </label>
                      <input
                        type="date"
                        value={config.oddStartDate2}
                        onChange={(e) => setConfig({ ...config, oddStartDate2: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Even Semesters Staggered Start */}
                <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                    <CalendarDays size={18} />
                    <span>Even Semesters (2, 4, 6, 8, 10)</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Even Semesters Group 1 Start Date (Sem 2, 6, 10)
                      </label>
                      <input
                        type="date"
                        value={config.evenStartDate1}
                        onChange={(e) => setConfig({ ...config, evenStartDate1: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Even Semesters Group 2 Start Date (Sem 4, 8)
                      </label>
                      <input
                        type="date"
                        value={config.evenStartDate2}
                        onChange={(e) => setConfig({ ...config, evenStartDate2: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* General Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Break Day Interval</div>
                  <div className="text-xs text-slate-500">Insert 1 day gap (+2 days) between papers</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.hasBreakDay}
                  onChange={(e) => setConfig({ ...config, hasBreakDay: e.target.checked })}
                  className="w-5 h-5 text-violet-600 rounded cursor-pointer"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-white flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Calendar Dates Mode</div>
                  <div className="text-xs text-slate-500">Assign real calendar dates (skips Sundays)</div>
                </div>
                <input
                  type="checkbox"
                  checked={config.useCalendarDates}
                  onChange={(e) => setConfig({ ...config, useCalendarDates: e.target.checked })}
                  className="w-5 h-5 text-violet-600 rounded cursor-pointer"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Examination Basis
                </label>
                <select
                  value={config.examinationBasis}
                  onChange={(e) => setConfig({ ...config, examinationBasis: e.target.value as any })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50"
                >
                  <option value="Both">Both (Odd & Even Semesters)</option>
                  <option value="Odd">Odd Semesters Only</option>
                  <option value="Even">Even Semesters Only</option>
                </select>
              </div>
            </div>

            {/* Holidays Manager */}
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">University Holidays & Blackout Dates</h4>
                  <p className="text-xs text-slate-500">
                    The scheduling engine skips all dates listed here (Sundays are automatically skipped).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newHolidayInput}
                    onChange={(e) => setNewHolidayInput(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white"
                  />
                  <button
                    onClick={handleAddHoliday}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Holiday</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {config.holidays.map((hDate) => (
                  <span
                    key={hDate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs text-rose-800 font-medium"
                  >
                    <span>{hDate}</span>
                    <button
                      onClick={() => handleRemoveHoliday(hDate)}
                      className="text-rose-400 hover:text-rose-700 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {config.holidays.length === 0 && (
                  <span className="text-xs text-slate-400 italic">No custom blackout dates configured.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 3: SLOT MASTER & ELECTIVES CONFIGURATION
          ========================================================================= */}
      {activeStep === 'slots' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slot Master Table */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900">Semester Slot Allocations</h3>
                  <p className="text-xs text-slate-500">Daily timing block assigned to each semester.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Semester</th>
                      <th className="p-3">Odd/Even</th>
                      <th className="p-3">Slot Name</th>
                      <th className="p-3">Exam Timing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {slots.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">Semester {s.semester}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              s.oddEven === 'Odd'
                                ? 'bg-violet-50 text-violet-700'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {s.oddEven}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-800">{s.slotName}</td>
                        <td className="p-3 font-mono">{s.slotTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Elective Groups & AI Auto-Detect */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-semibold text-slate-900">Elective Bundles (Same Slot)</h3>
                  <p className="text-xs text-slate-500">
                    Courses scheduled concurrently on the exact same date & slot.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadElectivesTemplate}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Template</span>
                  </button>

                  <button
                    onClick={handleAutoDetectElectives}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Auto-Detect Electives</span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {electives.map((eg, i) => (
                  <div
                    key={eg.id || i}
                    className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/70 hover:bg-white transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-xs text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span>{eg.name}</span>
                        {eg.isFuzzy && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                            AI Clustered
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setElectives(electives.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {eg.courseCodes.map((code) => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-mono font-medium text-slate-700"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 4: TIMETABLE MATRIX & CONFLICT AUDIT
          ========================================================================= */}
      {activeStep === 'matrix' && (
        <div className="space-y-6">
          {/* Clash Alert Box (if clashes exist) */}
          {clashes.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-sm">
                <AlertTriangle size={18} className="text-amber-600" />
                <span>
                  {clashes.length} Student Cohort Conflict(s) Detected!
                </span>
              </div>
              <p className="text-xs text-amber-800">
                The students below have been scheduled for multiple examinations in the same slot on the same day.
                Use the <strong>"Edit Slot/Date"</strong> button to adjust the schedule.
              </p>

              <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white max-h-48">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-amber-100/60 text-amber-900 border-b border-amber-200">
                    <tr>
                      <th className="p-2.5">PRN</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5">Clash Date</th>
                      <th className="p-2.5">Slot</th>
                      <th className="p-2.5">Conflicting Papers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 text-slate-700">
                    {clashes.map((c, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-mono font-medium text-amber-900">{c.prn}</td>
                        <td className="p-2.5">{c.studentName || '-'}</td>
                        <td className="p-2.5 font-semibold">{c.date}</td>
                        <td className="p-2.5">{c.slotName}</td>
                        <td className="p-2.5 font-mono font-semibold text-rose-700">
                          {c.courseCodes.join('  VS  ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Schedule Matrix Table */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Master Examination Schedule Matrix ({filteredSchedule.length.toLocaleString()} Papers)
                </h3>
                <p className="text-xs text-slate-500">
                  Review course date allocations, slot timings, registered headcounts, and override settings.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={matrixFilterSchool}
                  onChange={(e) => setMatrixFilterSchool(e.target.value)}
                  className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="All">All Schools</option>
                  {availableSchools.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={matrixFilterSlot}
                  onChange={(e) => setMatrixFilterSlot(e.target.value)}
                  className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="All">All Slots</option>
                  <option value="Slot 1">Slot 1</option>
                  <option value="Slot 2">Slot 2</option>
                </select>

                <select
                  value={matrixFilterDate}
                  onChange={(e) => setMatrixFilterDate(e.target.value)}
                  className="rounded-lg border border-slate-200 text-xs px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="All">All Dates</option>
                  {scheduledDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search course..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    className="rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs w-44"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">School / Programme</th>
                    <th className="p-3">Sem</th>
                    <th className="p-3">Course Code</th>
                    <th className="p-3">Course Title</th>
                    <th className="p-3">Exam Date</th>
                    <th className="p-3">Day</th>
                    <th className="p-3">Slot & Time</th>
                    <th className="p-3 text-right">Students</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {filteredSchedule.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50 ${
                        row.isManualOverride ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-medium text-slate-800">
                        <div>{row.schoolName}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{row.programName}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{row.semester}</td>
                      <td className="p-3 font-mono font-semibold text-violet-700">{row.courseCode}</td>
                      <td className="p-3 font-medium text-slate-800">{row.courseName}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                          {row.date}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{row.day}</td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{row.slotName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{row.slotTime}</div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-900">
                        {row.totalStudents}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenOverride(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 text-xs font-semibold transition cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Override</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSchedule.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 italic">
                        No schedule entries match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 5: PUBLISH & MULTI-SHEET EXPORT
          ========================================================================= */}
      {activeStep === 'export' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Excel Multi-Sheet Export Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3 shadow-sm">
                  <FileSpreadsheet size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">Official Multi-Sheet Excel Workbook</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Downloads a complete workbook (.xlsx) containing Master Timetable, Program-wise breakdown,
                  Date Summaries, Slot Configurations, and Student Clash Verification reports.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 1: Master_Timetable (All Courses & Headcounts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 2: Date_Wise_Summary (Daily Student Volume)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 3: Slot_Master & Elective_Groups</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Sheet 4: Clash_Audit_Report (Verified Zero Conflicts)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => exportTimetableWorkbook(schedule, slots, electives, clashes)}
                disabled={!schedule.length}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition cursor-pointer"
              >
                <Download size={16} />
                <span>Download Multi-Sheet Excel (.xlsx)</span>
              </button>
            </div>

            {/* University Print / PDF Notice Card */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold mb-3 shadow-sm">
                  <Printer size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg">Official Notice & Signature Sheet</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Generates an institutional university notification with official signatory blocks for the
                  Controller of Examinations (COE), Deputy COE, Assistant COE, and School Exam Coordinators.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-violet-600" />
                    <span>Ready for institutional noticeboard distribution & student circulars.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-violet-600" />
                    <span>Standardized university header & reference metadata.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-violet-600" />
                    <span>Choose between 4-Signatory or COE Only mode.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                disabled={!schedule.length}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 text-sm shadow-md transition cursor-pointer"
              >
                <Printer size={16} />
                <span>Preview Printable Timetable Notice</span>
              </button>
            </div>
          </div>

          {/* Next Stage Operational Flow Banner */}
          {onNavigate && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Next Operational Stage</span>
                <h4 className="text-base font-bold text-slate-900 mt-0.5">Automated Hall Seating & Desk Slips (Milestone 2)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Once published to official schedules, proceed to the Seating Master to pack halls and interleave seats against cheating.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => onNavigate('timetable')}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm"
                >
                  View Master Timetable
                </button>
                <button
                  onClick={() => onNavigate('seatingMaster')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <span>Open Seating Master</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          MODAL: MANUAL OVERRIDE EDITOR
          ========================================================================= */}
      {overrideModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Edit2 size={18} className="text-violet-600" />
                <span>Manual Slot & Date Override</span>
              </div>
              <button
                onClick={() => setOverrideModalRow(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-semibold text-slate-900">{overrideModalRow.courseName}</div>
                <div className="font-mono text-violet-700 font-medium">{overrideModalRow.courseCode}</div>
                <div className="text-slate-500">{overrideModalRow.programName} ({overrideModalRow.semester})</div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">New Exam Date</label>
                <input
                  type="date"
                  value={overrideDateInput}
                  onChange={(e) => setOverrideDateInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Slot Name</label>
                <select
                  value={overrideSlotName}
                  onChange={(e) => setOverrideSlotName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="Slot 1">Slot 1 (Morning)</option>
                  <option value="Slot 2">Slot 2 (Afternoon)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Exam Time String</label>
                <input
                  type="text"
                  value={overrideSlotTime}
                  onChange={(e) => setOverrideSlotTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setOverrideModalRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition cursor-pointer"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRINTABLE UNIVERSITY NOTICE & SIGNATURE VIEW
          ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl space-y-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">Print Preview</span>
                <select
                  value={signatureMode}
                  onChange={(e) => setSignatureMode(e.target.value as any)}
                  className="rounded-lg border border-slate-200 text-xs px-2.5 py-1 bg-slate-50 font-medium"
                >
                  <option value="4 Signatures">4 Signatures (Full Hierarchy)</option>
                  <option value="COE Only">COE Signature Only</option>
                  <option value="No Signatures">No Signatures</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* University Notice Document Body */}
            <div className="p-6 border border-slate-300 rounded-xl space-y-6 text-slate-900 bg-white">
              {/* University Header */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900">
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  Somaiya Skills & Professional University
                </h2>
                <div className="text-xs uppercase font-semibold text-slate-600 tracking-wider">
                  Office of the Controller of Examinations
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Examination Notification Ref: SSPU/EXAM/TT/2026-27/01 · Date: {new Date().toLocaleDateString()}
                </div>
                <div className="inline-block mt-2 px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded">
                  Official Master Examination Timetable
                </div>
              </div>

              {/* Table of Papers */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Date & Day</th>
                      <th className="p-2 border-r border-slate-300">Slot & Timing</th>
                      <th className="p-2 border-r border-slate-300">School / Programme</th>
                      <th className="p-2 border-r border-slate-300">Sem</th>
                      <th className="p-2 border-r border-slate-300">Course Code</th>
                      <th className="p-2">Course Title</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {schedule.slice(0, 35).map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 border-r border-slate-300 font-semibold whitespace-nowrap">
                          {row.date} ({row.day})
                        </td>
                        <td className="p-2 border-r border-slate-300 whitespace-nowrap">
                          <span className="font-semibold">{row.slotName}</span> ({row.slotTime})
                        </td>
                        <td className="p-2 border-r border-slate-300">{row.programName}</td>
                        <td className="p-2 border-r border-slate-300 font-bold text-center">{row.semester}</td>
                        <td className="p-2 border-r border-slate-300 font-mono font-semibold">{row.courseCode}</td>
                        <td className="p-2">{row.courseName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {schedule.length > 35 && (
                <div className="text-center text-xs text-slate-500 italic">
                  Showing first 35 courses in print preview ({schedule.length} total scheduled).
                </div>
              )}

              {/* Official Signatures Block */}
              {signatureMode === '4 Signatures' && (
                <div className="grid grid-cols-4 gap-4 pt-12 text-center text-xs">
                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <div className="font-bold text-slate-800">Prepared By</div>
                    <div className="text-[11px] text-slate-500">Division IV Timetable Officer</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <div className="font-bold text-slate-800">Verified By</div>
                    <div className="text-[11px] text-slate-500">Assistant Controller (ACOE)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <div className="font-bold text-slate-800">Recommended By</div>
                    <div className="text-[11px] text-slate-500">Deputy Controller (DYCOE)</div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-10 border-b border-dashed border-slate-400" />
                    <div className="font-bold text-slate-800">Approved By</div>
                    <div className="text-[11px] text-slate-500">Controller of Examinations (COE)</div>
                  </div>
                </div>
              )}

              {signatureMode === 'COE Only' && (
                <div className="flex justify-end pt-12">
                  <div className="w-64 text-center text-xs space-y-1">
                    <div className="h-12 border-b border-dashed border-slate-400" />
                    <div className="font-bold text-slate-800">Dr. Sunita Nikam</div>
                    <div className="text-[11px] text-slate-500">Controller of Examinations (COE)</div>
                    <div className="text-[10px] text-slate-400">Somaiya Skills & Professional University</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
