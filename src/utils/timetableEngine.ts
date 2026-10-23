import {
  StudentRecord,
  SlotMaster,
  ElectiveGroup,
  ScheduleRow,
  ScheduleConfig,
  ManualOverride,
  TimetableClashInfo,
  ProgramStream,
} from '../types';

export const DEFAULT_PROGRAM_STREAMS: ProgramStream[] = [
  {
    id: 'stream-1',
    name: 'Stream 1 (Alternating: Day 1, 3, 5...)',
    programsOrSchools: [],
    dayOffset: 0,
    dayStep: 2,
    preferredSlot: 'Slot 1',
    appliesTo: 'Both',
  },
  {
    id: 'stream-2',
    name: 'Stream 2 (Alternating: Day 2, 4, 6...)',
    programsOrSchools: [],
    dayOffset: 1,
    dayStep: 2,
    preferredSlot: 'Slot 2',
    appliesTo: 'Both',
  },
];

/**
 * Dynamically builds stream groups from university programs loaded from the database.
 * No hardcoded program or school strings.
 */
export function buildDynamicStreamsFromPrograms(
  programs: { school_name: string; program_name?: string }[]
): ProgramStream[] {
  if (!programs || programs.length === 0) {
    return DEFAULT_PROGRAM_STREAMS;
  }

  // Extract unique schools from database programs
  const allSchools = Array.from(new Set(programs.map((p) => p.school_name))).filter(Boolean);

  const stream1Schools: string[] = [];
  const stream2Schools: string[] = [];

  for (const school of allSchools) {
    const sLower = school.toLowerCase();
    if (sLower.includes('engineering') || sLower.includes('architecture') || sLower.includes('technology')) {
      stream2Schools.push(school);
    } else {
      stream1Schools.push(school);
    }
  }

  if (stream1Schools.length === 0 || stream2Schools.length === 0) {
    const half = Math.ceil(allSchools.length / 2);
    stream1Schools.length = 0;
    stream2Schools.length = 0;
    stream1Schools.push(...allSchools.slice(0, half));
    stream2Schools.push(...allSchools.slice(half));
  }

  const s1Name = stream1Schools.map((s) => s.replace(/School of /gi, '').trim()).join(' & ') || 'Faculty Stream 1';
  const s2Name = stream2Schools.map((s) => s.replace(/School of /gi, '').trim()).join(' & ') || 'Faculty Stream 2';

  return [
    {
      id: 'stream-group-1',
      name: `Stream 1: ${s1Name}`,
      programsOrSchools: stream1Schools,
      dayOffset: 0,
      dayStep: 2,
      preferredSlot: 'Slot 1',
      appliesTo: 'Both',
    },
    {
      id: 'stream-group-2',
      name: `Stream 2: ${s2Name}`,
      programsOrSchools: stream2Schools,
      dayOffset: 1,
      dayStep: 2,
      preferredSlot: 'Slot 2',
      appliesTo: 'Both',
    },
  ];
}

/**
 * Resolves which ProgramStream a given course belongs to based on school, program name, and course type.
 * Uses match specificity scoring so that specific school/faculty names always take precedence over short substrings.
 */
export function matchCourseToStream(
  centre: string,
  program: string,
  courseType: string | undefined,
  streams: ProgramStream[]
): ProgramStream {
  if (!streams || streams.length === 0) {
    return DEFAULT_PROGRAM_STREAMS[0];
  }
  const normCentre = (centre || '').toLowerCase().trim();
  const normProg = (program || '').toLowerCase().trim();
  const cType = (courseType || 'REGULAR').toUpperCase();
  const isBacklog = cType.includes('BACKLOG');

  let bestStream: ProgramStream | null = null;
  let highestScore = -1;

  for (const s of streams) {
    if (s.appliesTo === 'Regular' && isBacklog) continue;
    if (s.appliesTo === 'Backlog' && !isBacklog) continue;

    for (const kw of s.programsOrSchools) {
      const k = kw.trim().toLowerCase();
      if (!k) continue;

      let score = 0;
      if (normCentre === k) {
        score = 1000 + k.length;
      } else if (normProg === k) {
        score = 900 + k.length;
      } else if (normCentre.includes(k)) {
        score = 100 + k.length;
      } else if (normProg.includes(k)) {
        score = 50 + k.length;
      }

      if (score > highestScore) {
        highestScore = score;
        bestStream = s;
      }
    }
  }

  if (bestStream && highestScore > 0) {
    return bestStream;
  }

  // Fallback: match by course type
  const fallback = streams.find((s) => {
    if (s.appliesTo === 'Regular' && isBacklog) return false;
    if (s.appliesTo === 'Backlog' && !isBacklog) return false;
    return true;
  });

  return fallback || streams[0];
}

export const DEFAULT_SLOT_MASTER: SlotMaster[] = [
  { semester: '1', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Odd' },
  { semester: '2', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Even' },
  { semester: '3', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Odd' },
  { semester: '4', slotName: 'Slot 2', slotTime: '02:00 pm to 05:00 pm', oddEven: 'Even' },
  { semester: '5', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Odd' },
  { semester: '6', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Even' },
  { semester: '7', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Odd' },
  { semester: '8', slotName: 'Slot 2', slotTime: '02:00 pm to 05:00 pm', oddEven: 'Even' },
  { semester: '9', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Odd' },
  { semester: '10', slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: 'Even' },
];

export const DEFAULT_ELECTIVES: ElectiveGroup[] = [
  { id: 'eg-1', name: 'Law Specialization Elective Group A', courseCodes: ['LLM50130', 'LLM50210', 'LLM50440'] },
  { id: 'eg-2', name: 'Law Specialization Elective Group B', courseCodes: ['LLM50450', 'LLM50160', 'LLM50240'] },
  { id: 'eg-3', name: 'CS/AI Department Elective 1', courseCodes: ['CS4011', 'CS4012', 'CS4013'] },
  { id: 'eg-4', name: 'Open University Elective Pool', courseCodes: ['OE101', 'OE102', 'OE103'] },
];

export function parseSemester(semRaw: string | number): number | null {
  if (!semRaw) return null;
  const str = String(semRaw).trim();
  const romanMap: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  };
  const cleanedRoman = str.toUpperCase().replace(/SEMESTER/gi, '').replace(/SEM/gi, '').replace(/-/g, '').trim();
  if (romanMap[cleanedRoman]) return romanMap[cleanedRoman];
  const digits = str.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : null;
}

export function getSlotInfo(semVal: string | number, slots: SlotMaster[]) {
  const semStr = String(semVal).trim();
  const found = slots.find((s) => s.semester === semStr);
  if (found) {
    return {
      slotName: found.slotName,
      slotTime: found.slotTime,
      oddEven: found.oddEven,
    };
  }
  const sNum = parseInt(semStr, 10) || 1;
  const oe: 'Odd' | 'Even' = sNum % 2 === 0 ? 'Even' : 'Odd';
  if ([2, 6, 10].includes(sNum)) {
    return { slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: oe };
  } else if ([4, 8].includes(sNum)) {
    return { slotName: 'Slot 2', slotTime: '02:00 pm to 05:00 pm', oddEven: oe };
  } else {
    return { slotName: 'Slot 1', slotTime: '08:00 am to 09:30 am', oddEven: oe };
  }
}

export function formatDateString(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
}

export function getDayName(d: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

/**
 * Normalizes text for fuzzy matching comparison.
 */
export function cleanTextFuzzy(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Token Sort Ratio similarity between two strings (0-100).
 */
export function tokenSortRatio(s1: string, s2: string): number {
  const t1 = cleanTextFuzzy(s1).split(' ').filter(Boolean).sort().join(' ');
  const t2 = cleanTextFuzzy(s2).split(' ').filter(Boolean).sort().join(' ');
  if (!t1 || !t2) return 0;
  if (t1 === t2) return 100;

  // Levenshtein distance on sorted tokens
  const m = t1.length;
  const n = t2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (t1[i - 1] === t2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.round(((maxLen - dist) / maxLen) * 100);
}

/**
 * Core examination schedule generator algorithm ported & enhanced from Time_Table.py.
 */
export function generateSchedule(
  records: StudentRecord[],
  config: ScheduleConfig,
  slots: SlotMaster[],
  electives: ElectiveGroup[],
  manualOverrides: Record<string, ManualOverride> = {}
): ScheduleRow[] {
  if (!records || records.length === 0) return [];

  // 1. Enrich records with semester number and slot info
  const enriched = records
    .map((r) => {
      const semNum = parseSemester(r.semester);
      if (semNum === null) return null;
      const slot = getSlotInfo(semNum, slots);
      return {
        ...r,
        semNum,
        slotName: slot.slotName,
        slotTime: slot.slotTime,
        oddEven: slot.oddEven,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Filter examination basis if not "Both"
  const filtered =
    config.examinationBasis === 'Both'
      ? enriched
      : enriched.filter((r) => r.oddEven === config.examinationBasis);

  // Parse start dates
  const parseDateSafe = (val: string) => {
    if (!val) return null;
    const parts = val.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const oddDt1 = parseDateSafe(config.oddStartDate1);
  const oddDt2 = parseDateSafe(config.oddStartDate2);
  const evenDt1 = parseDateSafe(config.evenStartDate1);
  const evenDt2 = parseDateSafe(config.evenStartDate2);

  const holidaysSet = new Set(config.holidays.map((h) => h.trim()));

  const isStreamMode = config.schedulingStrategy !== 'SEMESTER_BASED';
  const activeStreams: ProgramStream[] =
    config.programStreams && config.programStreams.length > 0
      ? config.programStreams
      : DEFAULT_PROGRAM_STREAMS;

  const getSemGroupAndBaseDate = (semNum: number, oeVal: 'Odd' | 'Even') => {
    if ([1, 5, 9].includes(semNum)) return { key: 'Odd_1', baseDate: oddDt1 };
    if ([3, 7].includes(semNum)) return { key: 'Odd_2', baseDate: oddDt2 };
    if ([2, 6, 10].includes(semNum)) return { key: 'Even_1', baseDate: evenDt1 };
    if ([4, 8].includes(semNum)) return { key: 'Even_2', baseDate: evenDt2 };
    return oeVal === 'Odd'
      ? { key: 'Odd_1', baseDate: oddDt1 }
      : { key: 'Even_1', baseDate: evenDt1 };
  };

  const getStreamInfo = (centre: string, program: string, courseType: string | undefined, oeVal: 'Odd' | 'Even') => {
    const stream = matchCourseToStream(centre, program, courseType, activeStreams);
    const baseDate =
      oeVal === 'Odd'
        ? stream.startDateOdd
          ? parseDateSafe(stream.startDateOdd)
          : oddDt1
        : stream.startDateEven
        ? parseDateSafe(stream.startDateEven)
        : evenDt1;
    return { stream, baseDate };
  };

  const globalCourseCache = new Map<string, { date: string; day: string }>();
  const bookedStudentsBySlotDay = new Map<string, Set<string>>();
  const centreGroupOffsets = new Map<string, number>();

  // Process manual overrides first
  for (const [key, ov] of Object.entries(manualOverrides)) {
    const parts = key.split(':::');
    if (parts.length >= 4) {
      const [centre, , , code] = parts;
      globalCourseCache.set(`${centre}:::${ov.slotName}:::${code}`, {
        date: ov.date,
        day: ov.day,
      });
    }
  }

  // 2. Process Elective Groups (bundled to same date and slot)
  for (const eg of electives) {
    const elecRecords = filtered.filter((r) => eg.courseCodes.includes(r.courseCode));
    if (elecRecords.length === 0) continue;

    const centres = Array.from(new Set(elecRecords.map((r) => r.centre)));
    for (const centre of centres) {
      const cRows = elecRecords.filter((r) => r.centre === centre);
      if (!cRows.length) continue;
      const slot = cRows[0].slotName;
      const semVal = cRows[0].semNum;
      const oeVal = cRows[0].oddEven;

      let baseDate: Date | null = null;
      let groupStateKey = '';
      let initialOffset = 0;
      let step = 1;

      if (isStreamMode) {
        const { stream, baseDate: sBaseDate } = getStreamInfo(centre, cRows[0].program, cRows[0].courseType, oeVal);
        baseDate = sBaseDate;
        groupStateKey = `stream:::${stream.id}:::${centre}:::${cRows[0].program}:::${semVal}:::${oeVal}`;
        initialOffset = stream.dayOffset;
        step = stream.dayStep;
      } else {
        const semGroup = getSemGroupAndBaseDate(semVal, oeVal);
        baseDate = semGroup.baseDate;
        groupStateKey = `${centre}:::${semGroup.key}`;
        initialOffset = 0;
        step = config.hasBreakDay ? 2 : 1;
      }

      const bundleStudents = new Set(cRows.map((r) => r.prn).filter(Boolean));
      let currentOffset = centreGroupOffsets.get(groupStateKey) ?? initialOffset;
      let assignedDate: string | null = null;
      let assignedDay = '-';

      let safety = 0;
      while (!assignedDate && safety < 120) {
        safety++;
        let dateVal = `Day ${currentOffset + 1}`;
        let dayName = '-';

        if (config.useCalendarDates && baseDate) {
          const testDate = new Date(baseDate);
          testDate.setDate(testDate.getDate() + currentOffset);

          // Skip Sundays and holidays
          while (
            testDate.getDay() === 0 ||
            holidaysSet.has(testDate.toISOString().split('T')[0])
          ) {
            currentOffset++;
            testDate.setTime(baseDate.getTime());
            testDate.setDate(baseDate.getDate() + currentOffset);
          }

          dateVal = formatDateString(testDate);
          dayName = getDayName(testDate);
        }

        const allocKey = `${centre}:::${slot}:::${dateVal}`;
        const booked = bookedStudentsBySlotDay.get(allocKey) || new Set<string>();

        let clash = false;
        for (const prn of bundleStudents) {
          if (booked.has(prn)) {
            clash = true;
            break;
          }
        }

        if (!clash) {
          assignedDate = dateVal;
          assignedDay = dayName;
          for (const prn of bundleStudents) booked.add(prn);
          bookedStudentsBySlotDay.set(allocKey, booked);
          currentOffset += step;
          centreGroupOffsets.set(groupStateKey, currentOffset);
        } else {
          currentOffset += step;
        }
      }

      for (const cCode of eg.courseCodes) {
        globalCourseCache.set(`${centre}:::${slot}:::${cCode}`, {
          date: assignedDate || 'Day 1',
          day: assignedDay,
        });
      }
    }
  }

  // 3. Process regular & backlog courses by Centre and Program
  const groupedCourses = new Map<string, typeof filtered>();
  for (const r of filtered) {
    const key = `${r.centre}:::${r.program}`;
    if (!groupedCourses.has(key)) groupedCourses.set(key, []);
    groupedCourses.get(key)!.push(r);
  }

  for (const [cpKey, cpRecords] of groupedCourses.entries()) {
    const [centre] = cpKey.split(':::');

    const courseMap = new Map<
      string,
      {
        code: string;
        name: string;
        slot: string;
        semNum: number;
        oe: 'Odd' | 'Even';
        courseType?: string;
        program: string;
        students: Set<string>;
        applied: number;
        notApplied: number;
      }
    >();

    for (const r of cpRecords) {
      const cKey = `${r.slotName}:::${r.courseCode}`;
      if (!courseMap.has(cKey)) {
        courseMap.set(cKey, {
          code: r.courseCode,
          name: r.courseTitle,
          slot: r.slotName,
          semNum: r.semNum,
          oe: r.oddEven,
          courseType: r.courseType,
          program: r.program,
          students: new Set(),
          applied: 0,
          notApplied: 0,
        });
      }
      const entry = courseMap.get(cKey)!;
      if (r.prn) entry.students.add(r.prn);
      if (r.isApplied !== false) entry.applied++;
      else entry.notApplied++;
    }

    // Sort: regular courses first, then backlog courses; within each, by student count descending
    const sortedCourses = Array.from(courseMap.values()).sort((a, b) => {
      const aIsBacklog = (a.courseType || '').toUpperCase().includes('BACKLOG');
      const bIsBacklog = (b.courseType || '').toUpperCase().includes('BACKLOG');
      if (aIsBacklog !== bIsBacklog) {
        return aIsBacklog ? 1 : -1;
      }
      return b.applied - a.applied;
    });

    for (const c of sortedCourses) {
      const cacheKey = `${centre}:::${c.slot}:::${c.code}`;
      if (globalCourseCache.has(cacheKey)) continue;

      let baseDate: Date | null = null;
      let groupStateKey = '';
      let initialOffset = 0;
      let step = 1;

      if (isStreamMode) {
        const { stream, baseDate: sBaseDate } = getStreamInfo(centre, c.program, c.courseType, c.oe);
        baseDate = sBaseDate;
        groupStateKey = `stream:::${stream.id}:::${centre}:::${c.program}:::${c.semNum}:::${c.oe}`;
        initialOffset = stream.dayOffset;
        step = stream.dayStep;
      } else {
        const semGroup = getSemGroupAndBaseDate(c.semNum, c.oe);
        baseDate = semGroup.baseDate;
        groupStateKey = `${centre}:::${semGroup.key}`;
        initialOffset = 0;
        step = config.hasBreakDay ? 2 : 1;
      }

      let currentOffset = centreGroupOffsets.get(groupStateKey) ?? initialOffset;
      let assignedDate: string | null = null;
      let assignedDay = '-';

      let safety = 0;
      while (!assignedDate && safety < 120) {
        safety++;
        let dateVal = `Day ${currentOffset + 1}`;
        let dayName = '-';

        if (config.useCalendarDates && baseDate) {
          const testDate = new Date(baseDate);
          testDate.setDate(testDate.getDate() + currentOffset);

          while (
            testDate.getDay() === 0 ||
            holidaysSet.has(testDate.toISOString().split('T')[0])
          ) {
            currentOffset++;
            testDate.setTime(baseDate.getTime());
            testDate.setDate(baseDate.getDate() + currentOffset);
          }

          dateVal = formatDateString(testDate);
          dayName = getDayName(testDate);
        }

        const allocKey = `${centre}:::${c.slot}:::${dateVal}`;
        const booked = bookedStudentsBySlotDay.get(allocKey) || new Set<string>();

        let clash = false;
        for (const prn of c.students) {
          if (booked.has(prn)) {
            clash = true;
            break;
          }
        }

        if (!clash) {
          assignedDate = dateVal;
          assignedDay = dayName;
          for (const prn of c.students) booked.add(prn);
          bookedStudentsBySlotDay.set(allocKey, booked);
          currentOffset += step;
          centreGroupOffsets.set(groupStateKey, currentOffset);
        } else {
          currentOffset += step;
        }
      }

      globalCourseCache.set(cacheKey, { date: assignedDate || 'Day 1', day: assignedDay });
    }
  }

  // 4. Construct Final Schedule Rows
  const rowsMap = new Map<string, ScheduleRow>();

  for (const r of filtered) {
    const semStr = String(r.semester);
    const key = `${r.centre}:::${r.program}:::${semStr}:::${r.courseCode}`;
    const override = manualOverrides[key];

    let assignedDate = 'Unassigned';
    let assignedDay = '-';
    let slotName = r.slotName;
    let slotTime = r.slotTime;

    if (override) {
      assignedDate = override.date;
      assignedDay = override.day;
      slotName = override.slotName || slotName;
      slotTime = override.slotTime || slotTime;
    } else {
      const cached = globalCourseCache.get(`${r.centre}:::${slotName}:::${r.courseCode}`);
      if (cached) {
        assignedDate = cached.date;
        assignedDay = cached.day;
      }
    }

    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        schoolName: r.centre,
        programName: r.program,
        specialization: r.specialization || '',
        semester: semStr,
        oddEven: r.oddEven,
        slotName,
        slotTime,
        courseCode: r.courseCode,
        courseName: r.courseTitle,
        date: assignedDate,
        day: assignedDay,
        appliedStudents: 0,
        notAppliedStudents: 0,
        totalStudents: 0,
        isManualOverride: Boolean(override),
      });
    }

    const row = rowsMap.get(key)!;
    if (r.isApplied !== false) {
      row.appliedStudents++;
    } else {
      row.notAppliedStudents++;
    }
    row.totalStudents++;
  }

  return Array.from(rowsMap.values()).sort((a, b) => {
    // Sort by school, program, semester, courseCode
    if (a.schoolName !== b.schoolName) return a.schoolName.localeCompare(b.schoolName);
    if (a.programName !== b.programName) return a.programName.localeCompare(b.programName);
    const semA = parseSemester(a.semester) || 0;
    const semB = parseSemester(b.semester) || 0;
    if (semA !== semB) return semA - semB;
    return a.courseCode.localeCompare(b.courseCode);
  });
}

/**
 * Validates timetable against student registrations and returns detailed clash reports.
 */
export function auditScheduleClashes(
  scheduleRows: ScheduleRow[],
  records: StudentRecord[]
): TimetableClashInfo[] {
  const courseSlotDateMap = new Map<string, { date: string; slotName: string; title: string }>();

  for (const s of scheduleRows) {
    courseSlotDateMap.set(`${s.schoolName}:::${s.courseCode}`, {
      date: s.date,
      slotName: s.slotName,
      title: s.courseName,
    });
  }

  // Student -> Date+Slot -> Courses
  const studentSlotMap = new Map<string, Map<string, { codes: string[]; titles: string[]; name: string }>>();

  for (const r of records) {
    if (!r.prn) continue;
    const alloc = courseSlotDateMap.get(`${r.centre}:::${r.courseCode}`);
    if (!alloc || alloc.date === 'Unassigned') continue;

    const timeKey = `${alloc.date}:::${alloc.slotName}`;
    if (!studentSlotMap.has(r.prn)) {
      studentSlotMap.set(r.prn, new Map());
    }
    const studentSlots = studentSlotMap.get(r.prn)!;
    if (!studentSlots.has(timeKey)) {
      studentSlots.set(timeKey, { codes: [], titles: [], name: r.studentName });
    }
    const slotEntry = studentSlots.get(timeKey)!;
    if (!slotEntry.codes.includes(r.courseCode)) {
      slotEntry.codes.push(r.courseCode);
      slotEntry.titles.push(r.courseTitle);
    }
  }

  const clashes: TimetableClashInfo[] = [];

  for (const [prn, slotsMap] of studentSlotMap.entries()) {
    for (const [timeKey, entry] of slotsMap.entries()) {
      if (entry.codes.length > 1) {
        const [date, slotName] = timeKey.split(':::');
        clashes.push({
          prn,
          studentName: entry.name,
          date,
          slotName,
          courseCodes: entry.codes,
          courseTitles: entry.titles,
        });
      }
    }
  }

  return clashes;
}

/**
 * Automatically groups elective courses by title similarity with verified disjoint PRN sets.
 */
export function detectFuzzyElectives(
  records: StudentRecord[],
  threshold = 85
): ElectiveGroup[] {
  const codeToTitle = new Map<string, string>();
  const codeToStudents = new Map<string, Set<string>>();

  for (const r of records) {
    const code = (r.courseCode || '').trim();
    const title = (r.courseTitle || '').trim();
    if (!code) continue;
    if (!codeToTitle.has(code)) codeToTitle.set(code, title);
    if (r.prn) {
      if (!codeToStudents.has(code)) codeToStudents.set(code, new Set());
      codeToStudents.get(code)!.add(r.prn);
    }
  }

  const codes = Array.from(codeToTitle.keys());
  const visited = new Set<string>();
  const groups: ElectiveGroup[] = [];
  let groupId = 1;

  for (let i = 0; i < codes.length; i++) {
    const c1 = codes[i];
    if (visited.has(c1)) continue;
    const t1 = codeToTitle.get(c1) || '';
    if (!t1) continue;

    const currentGroup = [c1];

    for (let j = i + 1; j < codes.length; j++) {
      const c2 = codes[j];
      if (visited.has(c2)) continue;
      const t2 = codeToTitle.get(c2) || '';
      if (!t2) continue;

      const score = tokenSortRatio(t1, t2);
      if (score >= threshold) {
        const s1 = codeToStudents.get(c1) || new Set();
        const s2 = codeToStudents.get(c2) || new Set();

        // Ensure disjoint student sets
        let overlap = false;
        for (const prn of s2) {
          if (s1.has(prn)) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          currentGroup.push(c2);
          visited.add(c2);
        }
      }
    }

    if (currentGroup.length > 1) {
      visited.add(c1);
      groups.push({
        id: `auto-eg-${groupId++}`,
        name: `Auto Group: ${t1.slice(0, 30)}...`,
        courseCodes: currentGroup,
        isFuzzy: true,
      });
    }
  }

  return groups;
}
