import { randomUUID } from 'node:crypto';

export function registerTimetable(app, executeSql, requireSession) {
  const admin = (req, res, next) =>
    req.user.role === 'COORDINATOR'
      ? res.status(403).json({ error: 'Super Admin access required for timetable operations.' })
      : next();

  // Helper to ensure default session exists
  async function ensureDefaultSession() {
    const existing = (await executeSql('SELECT TOP 1 * FROM dbo.timetable_sessions WHERE is_active = 1')).data;
    if (existing && existing.length > 0) return existing[0];

    const allSessions = (await executeSql('SELECT TOP 1 * FROM dbo.timetable_sessions ORDER BY created_at DESC')).data;
    if (allSessions && allSessions.length > 0) return allSessions[0];

    // Seed default session
    const sessionId = 'session-default-2026';
    await executeSql(
      `INSERT INTO dbo.timetable_sessions (id, name, basis, odd_start_date_1, odd_start_date_2, even_start_date_1, even_start_date_2, holidays_json, has_break_day, use_calendar_dates, is_active)
       VALUES (@id, @name, @basis, @odd1, @odd2, @even1, @even2, @holidays, @breakDay, @useCal, 1)`,
      {
        id: sessionId,
        name: 'University Term End Examination 2026',
        basis: 'Both',
        odd1: '2026-11-16',
        odd2: '2026-11-17',
        even1: '2026-11-16',
        even2: '2026-11-17',
        holidays: JSON.stringify(['2026-11-20', '2026-11-25']),
        breakDay: 0,
        useCal: 1,
      },
      'execute'
    );

    // Seed default slots
    const defaultSlots = [
      { sem: '1', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Odd' },
      { sem: '2', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Even' },
      { sem: '3', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Odd' },
      { sem: '4', slot: 'Slot 2', time: '02:00 pm to 05:00 pm', oe: 'Even' },
      { sem: '5', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Odd' },
      { sem: '6', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Even' },
      { sem: '7', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Odd' },
      { sem: '8', slot: 'Slot 2', time: '02:00 pm to 05:00 pm', oe: 'Even' },
      { sem: '9', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Odd' },
      { sem: '10', slot: 'Slot 1', time: '08:00 am to 09:30 am', oe: 'Even' },
    ];

    for (const s of defaultSlots) {
      await executeSql(
        `INSERT INTO dbo.timetable_slots (id, session_id, semester, slot_name, slot_time, odd_even)
         VALUES (@id, @sessionId, @sem, @slot, @time, @oe)`,
        {
          id: randomUUID(),
          sessionId,
          sem: s.sem,
          slot: s.slot,
          time: s.time,
          oe: s.oe,
        },
        'execute'
      );
    }

    return (await executeSql('SELECT * FROM dbo.timetable_sessions WHERE id = @id', { id: sessionId })).data[0];
  }

  // Route 1: Get complete timetable state
  app.get('/api/timetable/state', requireSession, async (req, res) => {
    try {
      const activeSession = await ensureDefaultSession();
      const sessionId = req.query.session_id || activeSession.id;

      const [sessionsRes, slotsRes, electivesRes, recordsCountRes, scheduleRes, overridesRes, programsRes] =
        await Promise.all([
          executeSql('SELECT * FROM dbo.timetable_sessions ORDER BY created_at DESC'),
          executeSql('SELECT * FROM dbo.timetable_slots WHERE session_id = @sessionId ORDER BY CAST(semester AS INT) ASC', { sessionId }),
          executeSql('SELECT * FROM dbo.timetable_electives WHERE session_id = @sessionId ORDER BY created_at ASC', { sessionId }),
          executeSql('SELECT COUNT(*) AS total FROM dbo.timetable_student_records WHERE session_id = @sessionId', { sessionId }),
          executeSql('SELECT * FROM dbo.timetable_generated_schedules WHERE session_id = @sessionId ORDER BY exam_date ASC, slot_name ASC, course_code ASC', { sessionId }),
          executeSql('SELECT * FROM dbo.timetable_manual_overrides WHERE session_id = @sessionId', { sessionId }),
          executeSql('SELECT * FROM dbo.programs ORDER BY sr_no ASC'),
        ]);

      // Format programs from database
      const programs = (programsRes.data || []).map((p) => ({
        id: p.id,
        sr_no: p.sr_no,
        program_code: p.program_code,
        program_name: p.program_name,
        school_name: p.school_name,
        primary_coordinator_id: p.primary_coordinator_id,
        alternate_coordinator_id: p.alternate_coordinator_id,
      }));

      // If active session streams_json is empty, dynamically derive streams from database programs
      if (!activeSession.streams_json && programs.length > 0) {
        const uniqueSchools = Array.from(new Set(programs.map((p) => p.school_name))).filter(Boolean);
        const stream1Schools = [];
        const stream2Schools = [];
        for (const s of uniqueSchools) {
          const sLower = s.toLowerCase();
          if (sLower.includes('engineering') || sLower.includes('architecture') || sLower.includes('technology')) {
            stream2Schools.push(s);
          } else {
            stream1Schools.push(s);
          }
        }
        if (stream1Schools.length === 0 || stream2Schools.length === 0) {
          const half = Math.ceil(uniqueSchools.length / 2);
          stream1Schools.length = 0;
          stream2Schools.length = 0;
          stream1Schools.push(...uniqueSchools.slice(0, half));
          stream2Schools.push(...uniqueSchools.slice(half));
        }
        const dynamicStreams = [
          {
            id: 'stream-sci-mgmt',
            name: `Stream 1: ${stream1Schools.map((s) => s.replace(/School of /gi, '').trim()).join(' & ') || 'Faculty Stream 1'}`,
            programsOrSchools: stream1Schools,
            dayOffset: 0,
            dayStep: 2,
            preferredSlot: 'Slot 1',
            appliesTo: 'Both',
          },
          {
            id: 'stream-engg-arch',
            name: `Stream 2: ${stream2Schools.map((s) => s.replace(/School of /gi, '').trim()).join(' & ') || 'Faculty Stream 2'}`,
            programsOrSchools: stream2Schools,
            dayOffset: 1,
            dayStep: 2,
            preferredSlot: 'Slot 2',
            appliesTo: 'Both',
          },
        ];
        activeSession.streams_json = JSON.stringify(dynamicStreams);
        // Persist to database
        await executeSql(
          'UPDATE dbo.timetable_sessions SET streams_json = @streams WHERE id = @id',
          { streams: activeSession.streams_json, id: activeSession.id },
          'execute'
        );
      }

      // Format electives course_codes from JSON
      const electives = (electivesRes.data || []).map((e) => ({
        id: e.id,
        name: e.group_name,
        courseCodes: JSON.parse(e.course_codes || '[]'),
        isFuzzy: Boolean(e.is_fuzzy),
      }));

      // Format manual overrides map
      const overridesMap = {};
      for (const ov of overridesRes.data || []) {
        overridesMap[ov.course_key] = {
          date: ov.exam_date,
          day: ov.exam_day,
          slotName: ov.slot_name,
          slotTime: ov.slot_time,
        };
      }

      // Convert schedule rows to frontend camelCase
      const schedule = (scheduleRes.data || []).map((s) => ({
        schoolName: s.school_name,
        programName: s.program_name,
        specialization: s.specialization || '',
        semester: s.semester,
        oddEven: s.odd_even,
        slotName: s.slot_name,
        slotTime: s.slot_time,
        courseCode: s.course_code,
        courseName: s.course_name,
        date: s.exam_date,
        day: s.exam_day,
        appliedStudents: s.applied_students,
        notAppliedStudents: s.not_applied_students,
        totalStudents: s.total_students,
        isManualOverride: Boolean(s.is_manual_override),
      }));

      // Fetch student records directly from dbo.timetable_student_records in SQL Server
      const recordsRes = await executeSql(
        'SELECT TOP 5000 * FROM dbo.timetable_student_records WHERE session_id = @sessionId ORDER BY id ASC',
        { sessionId }
      );

      const records = (recordsRes.data || []).map((r) => ({
        id: r.id,
        centre: r.centre,
        program: r.program,
        specialization: r.specialization,
        semester: r.semester,
        prn: r.prn,
        studentName: r.student_name,
        officialEmail: r.official_email,
        courseCode: r.course_code,
        courseTitle: r.course_title,
        courseType: r.course_type,
        internalExternal: r.internal_external,
        applicationStatus: r.application_status,
        isApplied: Boolean(r.is_applied),
      }));

      res.json({
        sessions: sessionsRes.data || [],
        activeSession,
        slots: slotsRes.data || [],
        electives,
        recordsCount: recordsCountRes.data?.[0]?.total || 0,
        records,
        schedule,
        manualOverrides: overridesMap,
        programs,
      });
    } catch (err) {
      console.error('[Timetable API Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Route 2: Save / Update Session
  app.post('/api/timetable/sessions', requireSession, admin, async (req, res) => {
    try {
      const {
        id,
        name,
        basis,
        odd_start_date_1,
        odd_start_date_2,
        even_start_date_1,
        even_start_date_2,
        holidays,
        has_break_day,
        use_calendar_dates,
        scheduling_strategy,
        streams_json,
      } = req.body;
      const sessionId = id || randomUUID();
      const holidaysJson = JSON.stringify(holidays || []);
      const strategy = scheduling_strategy || 'PROGRAM_STREAMS';
      const streamsStr = typeof streams_json === 'string' ? streams_json : JSON.stringify(streams_json || []);

      const exists = (await executeSql('SELECT id FROM dbo.timetable_sessions WHERE id = @id', { id: sessionId })).data?.[0];

      if (exists) {
        await executeSql(
          `UPDATE dbo.timetable_sessions
           SET name = @name, basis = @basis, odd_start_date_1 = @odd1, odd_start_date_2 = @odd2,
               even_start_date_1 = @even1, even_start_date_2 = @even2, holidays_json = @holidays,
               has_break_day = @breakDay, use_calendar_dates = @useCal,
               scheduling_strategy = @strategy, streams_json = @streamsStr,
               updated_at = SYSUTCDATETIME()
           WHERE id = @id`,
          {
            id: sessionId,
            name,
            basis: basis || 'Both',
            odd1: odd_start_date_1 || null,
            odd2: odd_start_date_2 || null,
            even1: even_start_date_1 || null,
            even2: even_start_date_2 || null,
            holidays: holidaysJson,
            breakDay: has_break_day ? 1 : 0,
            useCal: use_calendar_dates !== false ? 1 : 0,
            strategy,
            streamsStr,
          },
          'execute'
        );
      } else {
        await executeSql(
          `INSERT INTO dbo.timetable_sessions (id, name, basis, odd_start_date_1, odd_start_date_2, even_start_date_1, even_start_date_2, holidays_json, has_break_day, use_calendar_dates, is_active, scheduling_strategy, streams_json)
           VALUES (@id, @name, @basis, @odd1, @odd2, @even1, @even2, @holidays, @breakDay, @useCal, 1, @strategy, @streamsStr)`,
          {
            id: sessionId,
            name,
            basis: basis || 'Both',
            odd1: odd_start_date_1 || null,
            odd2: odd_start_date_2 || null,
            even1: even_start_date_1 || null,
            even2: even_start_date_2 || null,
            holidays: holidaysJson,
            breakDay: has_break_day ? 1 : 0,
            useCal: use_calendar_dates !== false ? 1 : 0,
            strategy,
            streamsStr,
          },
          'execute'
        );
      }

      res.json({ success: true, sessionId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route 3: Save Slots
  app.post('/api/timetable/slots', requireSession, admin, async (req, res) => {
    try {
      const { sessionId, slots } = req.body;
      if (!sessionId || !Array.isArray(slots)) {
        return res.status(400).json({ error: 'sessionId and slots array are required' });
      }

      await executeSql('DELETE FROM dbo.timetable_slots WHERE session_id = @sessionId', { sessionId }, 'execute');

      for (const s of slots) {
        await executeSql(
          `INSERT INTO dbo.timetable_slots (id, session_id, semester, slot_name, slot_time, odd_even)
           VALUES (@id, @sessionId, @sem, @slot, @time, @oe)`,
          {
            id: s.id || randomUUID(),
            sessionId,
            sem: String(s.semester),
            slot: s.slotName,
            time: s.slotTime,
            oe: s.oddEven || 'Odd',
          },
          'execute'
        );
      }

      res.json({ success: true, count: slots.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route 4: Save Electives
  app.post('/api/timetable/electives', requireSession, admin, async (req, res) => {
    try {
      const { sessionId, electives } = req.body;
      if (!sessionId || !Array.isArray(electives)) {
        return res.status(400).json({ error: 'sessionId and electives array are required' });
      }

      await executeSql('DELETE FROM dbo.timetable_electives WHERE session_id = @sessionId', { sessionId }, 'execute');

      for (const eg of electives) {
        await executeSql(
          `INSERT INTO dbo.timetable_electives (id, session_id, group_name, course_codes, is_fuzzy)
           VALUES (@id, @sessionId, @name, @codes, @isFuzzy)`,
          {
            id: eg.id || randomUUID(),
            sessionId,
            name: eg.name,
            codes: JSON.stringify(eg.courseCodes || []),
            isFuzzy: eg.isFuzzy ? 1 : 0,
          },
          'execute'
        );
      }

      res.json({ success: true, count: electives.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route 5: Bulk Import Student Records (from Excel)
  app.post('/api/timetable/records/bulk', requireSession, admin, async (req, res) => {
    try {
      const { sessionId, records, append } = req.body;
      if (!sessionId || !Array.isArray(records)) {
        return res.status(400).json({ error: 'sessionId and records array required' });
      }

      if (!append) {
        await executeSql('DELETE FROM dbo.timetable_student_records WHERE session_id = @sessionId', { sessionId }, 'execute');
      }

      // Batch insert in chunks of 50 to optimize performance
      const chunkSize = 50;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        for (const r of chunk) {
          await executeSql(
            `INSERT INTO dbo.timetable_student_records 
              (id, session_id, centre, program, specialization, semester, prn, student_name, official_email, course_code, course_title, course_type, internal_external, application_status, is_applied)
             VALUES 
              (@id, @sessionId, @centre, @program, @spec, @sem, @prn, @name, @email, @code, @title, @ctype, @ie, @status, @applied)`,
            {
              id: r.id || randomUUID(),
              sessionId,
              centre: r.centre || 'Main Campus',
              program: r.program || 'General',
              spec: r.specialization || null,
              sem: String(r.semester || '1'),
              prn: r.prn || '',
              name: r.studentName || 'Student',
              email: r.officialEmail || null,
              code: r.courseCode,
              title: r.courseTitle,
              ctype: r.courseType || 'REGULAR',
              ie: r.internalExternal || 'EXTERNAL',
              status: r.applicationStatus || 'APPLIED',
              applied: r.isApplied !== false ? 1 : 0,
            },
            'execute'
          );
        }
      }

      res.json({ success: true, imported: records.length });
    } catch (err) {
      console.error('[Bulk Records Import Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Route 6: Clear student records
  app.post('/api/timetable/records/clear', requireSession, admin, async (req, res) => {
    try {
      const { sessionId } = req.body;
      await executeSql('DELETE FROM dbo.timetable_student_records WHERE session_id = @sessionId', { sessionId }, 'execute');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Route 7: Persist Generated Schedule & Overrides
  app.post('/api/timetable/save-schedule', requireSession, admin, async (req, res) => {
    try {
      const { sessionId, schedule, overrides } = req.body;
      if (!sessionId || !Array.isArray(schedule)) {
        return res.status(400).json({ error: 'sessionId and schedule array required' });
      }

      await executeSql('DELETE FROM dbo.timetable_generated_schedules WHERE session_id = @sessionId', { sessionId }, 'execute');
      await executeSql('DELETE FROM dbo.timetable_manual_overrides WHERE session_id = @sessionId', { sessionId }, 'execute');

      // Save generated schedule rows
      for (const s of schedule) {
        await executeSql(
          `INSERT INTO dbo.timetable_generated_schedules 
            (id, session_id, school_name, program_name, specialization, semester, odd_even, slot_name, slot_time, course_code, course_name, exam_date, exam_day, applied_students, not_applied_students, total_students, is_manual_override)
           VALUES 
            (@id, @sessionId, @school, @prog, @spec, @sem, @oe, @slot, @time, @code, @name, @date, @day, @app, @notApp, @tot, @isOv)`,
          {
            id: randomUUID(),
            sessionId,
            school: s.schoolName,
            prog: s.programName,
            spec: s.specialization || null,
            sem: String(s.semester),
            oe: s.oddEven || 'Odd',
            slot: s.slotName,
            time: s.slotTime,
            code: s.courseCode,
            name: s.courseName,
            date: s.date,
            day: s.day,
            app: s.appliedStudents || 0,
            notApp: s.notAppliedStudents || 0,
            tot: s.totalStudents || 0,
            isOv: s.isManualOverride ? 1 : 0,
          },
          'execute'
        );
      }

      // Save manual overrides
      if (overrides && typeof overrides === 'object') {
        for (const [key, ov] of Object.entries(overrides)) {
          await executeSql(
            `INSERT INTO dbo.timetable_manual_overrides (id, session_id, course_key, exam_date, exam_day, slot_name, slot_time)
             VALUES (@id, @sessionId, @key, @date, @day, @slot, @time)`,
            {
              id: randomUUID(),
              sessionId,
              key,
              date: ov.date,
              day: ov.day,
              slot: ov.slotName,
              time: ov.slotTime,
            },
            'execute'
          );
        }
      }

      res.json({ success: true, savedCount: schedule.length });
    } catch (err) {
      console.error('[Save Schedule Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Route 8: Publish Generated Timetable directly into dbo.exam_schedules & seed 4-phase tasks
  app.post('/api/timetable/publish-to-schedules', requireSession, admin, async (req, res) => {
    try {
      const { scheduleRows } = req.body;
      if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) {
        return res.status(400).json({ error: 'scheduleRows array is required' });
      }

      // Fetch all programs to resolve program_code
      const programs = (await executeSql('SELECT * FROM dbo.programs')).data || [];
      const currentSchedules = (await executeSql('SELECT * FROM dbo.exam_schedules')).data || [];
      const currentTasks = (await executeSql('SELECT * FROM dbo.exam_tasks')).data || [];

      let publishedCount = 0;
      let tasksCreated = 0;

      for (let i = 0; i < scheduleRows.length; i++) {
        const row = scheduleRows[i];

        // Find program matching programName or school
        const prog = programs.find(
          (p) =>
            p.program_name.toLowerCase() === row.programName.toLowerCase() ||
            p.program_code.toLowerCase() === row.programName.toLowerCase() ||
            p.school_name.toLowerCase() === row.schoolName.toLowerCase()
        ) || programs[0];

        const programCode = prog ? prog.program_code : 'GEN';
        const semDigits = row.semester.replace(/\D/g, '') || '1';
        const isPM = (row.slotTime || '').toLowerCase().includes('pm');
        const period = isPM ? 'PM' : 'AM';
        const examType = row.notAppliedStudents > 0 && row.appliedStudents > 0 ? 'Both' : (row.notAppliedStudents > 0 ? 'Backlog' : 'Regular');

        // Check if an exam schedule already exists for this program, semester, paper code
        let scheduleId = null;
        const match = currentSchedules.find(
          (s) => s.program_code === programCode && s.paper_code === row.courseCode
        );

        if (match) {
          scheduleId = match.id;
          await executeSql(
            `UPDATE dbo.exam_schedules
             SET exam_date = @date, exam_time = @time, am_pm = @amPm, student_count = @tot,
                 regular_count = @reg, backlog_count = @back, exam_type = @type, exam_day = @dayNum
             WHERE id = @id`,
            {
              id: scheduleId,
              date: row.date,
              time: row.slotTime,
              amPm: period,
              tot: row.totalStudents,
              reg: row.appliedStudents,
              back: row.notAppliedStudents,
              type: examType,
              dayNum: i + 1,
            },
            'execute'
          );
        } else {
          scheduleId = `sched-gen-${randomUUID().slice(0, 8)}`;
          await executeSql(
            `INSERT INTO dbo.exam_schedules 
              (id, pkg_no, logic1, cm_school_name, cm_course_name, program_code, semester, elective, paper_code, sm_subject_name, student_count, regular_count, backlog_count, exam_day, exam_date, date_odd_even, am_pm, exam_time, exam_type, exam_year)
             VALUES 
              (@id, @pkg, @logic, @school, @progName, @progCode, @sem, @elec, @paper, @subj, @tot, @reg, @back, @dayNum, @date, @dateOE, @amPm, @time, @type, @year)`,
            {
              id: scheduleId,
              pkg: currentSchedules.length + i + 1,
              logic: `${row.programName}_${semDigits}_${row.courseCode}_${row.courseName}`,
              school: row.schoolName,
              progName: row.programName,
              progCode: programCode,
              sem: parseInt(semDigits, 10),
              elec: row.specialization || '',
              paper: row.courseCode,
              subj: row.courseName,
              tot: row.totalStudents,
              reg: row.appliedStudents,
              back: row.notAppliedStudents,
              dayNum: i + 1,
              date: row.date,
              dateOE: `${row.date}_${row.oddEven}`,
              amPm: period,
              time: row.slotTime,
              type: examType,
              year: '2026',
            },
            'execute'
          );
        }

        publishedCount++;

        // Auto-generate 4 Milestone Tasks if program has coordinators
        if (prog?.primary_coordinator_id && prog?.alternate_coordinator_id) {
          const milestones = [
            'Question Paper Printing & Secure Vault Packaging',
            'Hall Seating Plan, Attendance Sheets & Roll Labels',
            'Invigilation Duty Assignment & Verification',
            'Answer Booklet Collection & Counterfoil Verification',
          ];

          for (const title of milestones) {
            const hasTask = currentTasks.some(
              (t) => t.schedule_id === scheduleId && t.task_title.startsWith(title)
            );
            if (!hasTask) {
              const taskId = `task-gen-${randomUUID().slice(0, 8)}`;
              await executeSql(
                `INSERT INTO dbo.exam_tasks 
                  (id, schedule_id, program_code, task_title, status, assigned_to, alternate_user_id, notes, due_date, updated_at)
                 VALUES 
                  (@id, @schedId, @progCode, @title, 'PENDING', @assignee, @alternate, '', @dueDate, SYSUTCDATETIME())`,
                {
                  id: taskId,
                  schedId: scheduleId,
                  progCode: programCode,
                  title: `${title} (${row.courseCode})`,
                  assignee: prog.primary_coordinator_id,
                  alternate: prog.alternate_coordinator_id,
                  dueDate: row.date,
                },
                'execute'
              );
              tasksCreated++;
            }
          }
        }
      }

      // Record audit entry
      await executeSql(
        `INSERT INTO dbo.exam_processing_audit (action, actor, detail)
         VALUES ('TIMETABLE_PUBLISHED', @actor, @detail)`,
        {
          actor: req.user.email || req.user.id,
          detail: JSON.stringify({ publishedCount, tasksCreated, timestamp: new Date().toISOString() }),
        },
        'execute'
      );

      res.json({
        success: true,
        publishedCount,
        tasksCreated,
        message: `Successfully synchronized ${publishedCount} timetable courses to Exam Schedules and generated ${tasksCreated} operational tasks!`,
      });
    } catch (err) {
      console.error('[Publish to Schedules Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
