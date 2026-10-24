import { supabase } from './supabaseClient';
import type {
  CourseMaster,
  CreateUserPayload,
  ExaminationData,
  ExamSchedule,
  ExamTask,
  Program,
  StudentMark,
  UserProfile,
  StudentRecord,
  SlotMaster,
  ElectiveGroup,
  ScheduleRow,
  ManualOverride,
  TimetableSession,
  FacultyCourseAllocation,
  PerformanceAnalyticsSummary,
} from '../types';

export class SupabaseDBService {
  private user: UserProfile = {
    id: '',
    email: '',
    full_name: '',
    role: 'COORDINATOR',
    title: '',
    created_at: '',
  };

  constructor() {
    this.restoreUserFromStorage();
  }

  private restoreUserFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('examtrack_current_user_v2');
      if (stored) {
        this.user = JSON.parse(stored);
      }
    } catch {
      // ignore JSON parse error
    }
  }

  getCurrentUser(): UserProfile {
    return this.user;
  }

  setCurrentUser(user: UserProfile) {
    this.user = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('examtrack_current_user_v2', JSON.stringify(user));
    }
  }

  async isLocalSql(): Promise<boolean> {
    return false;
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.user) {
        // No valid Supabase session: drop any stale/tampered local copy.
        this.user = { id: '', email: '', full_name: '', role: 'COORDINATOR', title: '', created_at: '' };
        if (typeof window !== 'undefined') localStorage.removeItem('examtrack_current_user_v2');
        return false;
      }

      // Re-derive role/metadata from profiles (source of truth) rather than
      // trusting the tamperable localStorage snapshot.
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        this.setCurrentUser({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          title: profile.title || 'Exam Coordinator',
          department: profile.department || '',
          phone: profile.phone || '',
          created_at: profile.created_at || new Date().toISOString(),
          last_password_change: profile.last_password_change,
        });
      }

      return true;
    } catch {
      return false;
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Supabase Auth is the sole credential verifier: it checks the password
      // against the server-side bcrypt hash in auth.users. The client never
      // reads or compares a stored password value.
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !authData?.user) {
        return { success: false, error: authError?.message || 'Invalid email or password.' };
      }

      // Role/metadata live in profiles, keyed to the authenticated user's id.
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileErr) {
        await supabase.auth.signOut();
        return { success: false, error: profileErr.message };
      }

      if (!profile) {
        await supabase.auth.signOut();
        return { success: false, error: 'User profile record missing in Supabase.' };
      }

      const userObj: UserProfile = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        title: profile.title || 'Exam Coordinator',
        department: profile.department || '',
        phone: profile.phone || '',
        created_at: profile.created_at || new Date().toISOString(),
        last_password_change: profile.last_password_change,
      };

      this.setCurrentUser(userObj);
      return { success: true, user: userObj };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Authentication request failed.' };
    }
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {}
    this.user = { id: '', email: '', full_name: '', role: 'COORDINATOR', title: '', created_at: '' };
    if (typeof window !== 'undefined') {
      localStorage.removeItem('examtrack_current_user_v2');
    }
  }

  // ============================================================================
  // User Management
  // ============================================================================

  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) {
      console.error('[SupabaseDB] getUsers error:', error);
      return [];
    }
    return (data || []) as UserProfile[];
  }

  async createUser(payload: CreateUserPayload): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const email = payload.email.trim().toLowerCase();
      if (!payload.password) {
        return { success: false, error: 'A password is required to create a Supabase Auth user.' };
      }

      // signUp replaces the client session with the new user's; preserve and
      // restore the acting admin's session so they stay logged in.
      const { data: prev } = await supabase.auth.getSession();
      const prevSession = prev?.session;

      // Provision the auth user; Supabase stores a bcrypt hash server-side.
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: payload.password });

      if (prevSession) {
        await supabase.auth.setSession({ access_token: prevSession.access_token, refresh_token: prevSession.refresh_token });
      }

      if (authError) throw authError;

      const newId = authData.user?.id;
      if (!newId) {
        return { success: false, error: 'Sign-up returned no user id. If email confirmation is enabled, the account must be confirmed before it can sign in.' };
      }

      const profileData = {
        id: newId,
        email,
        full_name: payload.full_name,
        role: payload.role,
        department: payload.department || '',
        phone: payload.phone || '',
        title: payload.title || 'Exam Coordinator',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('profiles').insert(profileData).select().single();
      if (error) throw error;
      return { success: true, user: data as UserProfile };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (id === this.user.id) {
        this.setCurrentUser(data as UserProfile);
      }
      return { success: true, user: data as UserProfile };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async deleteUsers(ids: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('profiles').delete().in('id', ids);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async updateUserPassword(id: string, newPassword: string, _actor: string, _currentPassword?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (id !== this.user.id) {
        return { success: false, error: 'Resetting another user\'s password requires a server-side service-role operation and cannot be done from the client.' };
      }

      // Updates the authenticated user's bcrypt hash in auth.users.
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      const { error } = await supabase
        .from('profiles')
        .update({ last_password_change: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // ============================================================================
  // Academic Programs
  // ============================================================================

  async getPrograms(): Promise<Program[]> {
    const { data, error } = await supabase.from('programs').select('*').order('sr_no');
    if (error) {
      console.error('[SupabaseDB] getPrograms error:', error);
      return [];
    }
    return (data || []) as Program[];
  }

  async addOrUpdateProgram(program: Program): Promise<void> {
    const { error } = await supabase.from('programs').upsert(program, { onConflict: 'program_code' });
    if (error) throw error;
  }

  async addOrUpdatePrograms(programs: Program[], clearExisting: boolean = false): Promise<Program[]> {
    if (clearExisting) {
      const { error: deleteErr } = await supabase.from('programs').delete().neq('id', 'keep_all');
      if (deleteErr) throw deleteErr;
    }
    const { data, error } = await supabase
      .from('programs')
      .upsert(programs, { onConflict: 'program_code' })
      .select();

    if (error) throw error;
    return (data || []) as Program[];
  }

  async deleteProgram(id: string): Promise<void> {
    const { error } = await supabase.from('programs').delete().eq('id', id);
    if (error) throw error;
  }

  async deletePrograms(ids: string[]): Promise<void> {
    const { error } = await supabase.from('programs').delete().in('id', ids);
    if (error) throw error;
  }

  // ============================================================================
  // Exam Schedules
  // ============================================================================

  async getSchedules(): Promise<ExamSchedule[]> {
    const { data, error } = await supabase.from('exam_schedules').select('*').order('exam_date');
    if (error) {
      console.error('[SupabaseDB] getSchedules error:', error);
      return [];
    }
    return (data || []) as ExamSchedule[];
  }

  async addSchedules(schedules: ExamSchedule[]): Promise<ExamSchedule[]> {
    // De-dupe on the natural key so re-publishing updates existing rows rather
    // than inserting fresh-UUID duplicates (mirrors the local SQL server).
    const { data: existing } = await supabase
      .from('exam_schedules')
      .select('id, program_code, paper_code, exam_date');
    const keyOf = (s: { program_code?: string; paper_code?: string; exam_date?: string }) =>
      `${s.program_code || ''}|${s.paper_code || ''}|${s.exam_date || ''}`;
    const idByKey = new Map<string, string>();
    for (const row of (existing || []) as { id: string; program_code?: string; paper_code?: string; exam_date?: string }[]) {
      idByKey.set(keyOf(row), row.id);
    }

    const payload = schedules.map((s) => {
      const matchId = idByKey.get(keyOf(s));
      return matchId ? { ...s, id: matchId } : s;
    });

    const { data, error } = await supabase.from('exam_schedules').upsert(payload).select();
    if (error) throw error;
    return (data || []) as ExamSchedule[];
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase.from('exam_schedules').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteSchedules(ids: string[]): Promise<void> {
    const { error } = await supabase.from('exam_schedules').delete().in('id', ids);
    if (error) throw error;
  }

  // ============================================================================
  // Exam Tasks
  // ============================================================================

  async getTasks(): Promise<ExamTask[]> {
    const { data, error } = await supabase.from('exam_tasks').select('*').order('due_date');
    if (error) {
      console.error('[SupabaseDB] getTasks error:', error);
      return [];
    }
    return (data || []) as ExamTask[];
  }

  async updateTaskStatus(id: string, status: ExamTask['status'], notes?: string): Promise<void> {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;
    const { error } = await supabase.from('exam_tasks').update(updates).eq('id', id);
    if (error) throw error;
  }

  async escalateTask(id: string, reason: string): Promise<void> {
    // The escalation contract requires reassigning the task to the alternate
    // coordinator; read that id first so the update can set assigned_to.
    const { data: task, error: fetchErr } = await supabase
      .from('exam_tasks')
      .select('alternate_user_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    const updates: Record<string, unknown> = {
      status: 'ESCALATED_TO_ALTERNATE',
      escalation_reason: reason,
      escalated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (task?.alternate_user_id) updates.assigned_to = task.alternate_user_id;

    const { error } = await supabase
      .from('exam_tasks')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  async addTask(task: ExamTask): Promise<void> {
    const { error } = await supabase.from('exam_tasks').insert(task);
    if (error) throw error;
  }

  async generateDefaultTasksForSchedule(schedule: ExamSchedule): Promise<ExamTask[]> {
    const programs = await this.getPrograms();
    const program = programs.find((p) => p.program_code === schedule.program_code);
    if (!program?.primary_coordinator_id || !program.alternate_coordinator_id) {
      throw new Error('Assign primary and alternate coordinators before generating tasks.');
    }

    const existing = await this.getTasks();
    const tasks: ExamTask[] = [];
    const milestoneTitles = [
      'Question Paper Printing & Secure Vault Packaging',
      'Hall Seating Plan, Attendance Sheets & Roll Labels',
      'Invigilation Duty Assignment & Verification',
      'Answer Booklet Collection & Counterfoil Verification',
    ];

    for (const title of milestoneTitles) {
      if (existing.some((t) => t.schedule_id === schedule.id && t.task_title.startsWith(title))) continue;
      const task: ExamTask = {
        id: crypto.randomUUID(),
        schedule_id: schedule.id,
        program_code: schedule.program_code,
        task_title: title,
        status: 'PENDING',
        assigned_to: program.primary_coordinator_id,
        alternate_user_id: program.alternate_coordinator_id,
        notes: '',
        due_date: schedule.exam_date,
        updated_at: new Date().toISOString(),
      };
      await this.addTask(task);
      tasks.push(task);
    }
    return tasks;
  }

  // ============================================================================
  // Course Master
  // ============================================================================

  async getCourseMaster(): Promise<CourseMaster[]> {
    const { data, error } = await supabase.from('course_master').select('*').order('paper_code');
    if (error) {
      console.error('[SupabaseDB] getCourseMaster error:', error);
      return [];
    }
    return (data || []) as CourseMaster[];
  }

  async upsertCourseMaster(courses: Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>[], clearExisting?: boolean): Promise<{ inserted: number; updated: number; error?: string }> {
    try {
      if (clearExisting) {
        // Clear existing courses in cloud mode; surface any error (e.g. RLS)
        // instead of upserting against un-cleared rows.
        const { error: deleteErr } = await supabase.from('course_master').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (deleteErr) throw deleteErr;
      }
      const { data, error } = await supabase
        .from('course_master')
        .upsert(courses, { onConflict: 'cm_course_name,semester,paper_code' })
        .select();
      if (error) throw error;
      return { inserted: data?.length || 0, updated: 0 };
    } catch (e: any) {
      return { inserted: 0, updated: 0, error: e.message };
    }
  }

  async deleteCourseMasterRecord(id: string): Promise<void> {
    const { error } = await supabase.from('course_master').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteCourseMasterRecords(ids: string[]): Promise<{ deleted: number; error?: string }> {
    try {
      const { data, error } = await supabase.from('course_master').delete().in('id', ids).select();
      if (error) throw error;
      return { deleted: data?.length || ids.length };
    } catch (e: any) {
      return { deleted: 0, error: e.message };
    }
  }

  // ============================================================================
  // Student Marks
  // ============================================================================

  async getStudentMarks(filters?: {
    paper_code?: string;
    cm_course_name?: string;
    assessment_type?: string;
    academic_year?: string;
    prn?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: StudentMark[]; total: number; page: number; pageSize: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('student_marks').select('*', { count: 'exact' });
    if (filters?.paper_code) query = query.eq('paper_code', filters.paper_code);
    if (filters?.cm_course_name) query = query.eq('cm_course_name', filters.cm_course_name);
    if (filters?.assessment_type) query = query.eq('assessment_type', filters.assessment_type);
    if (filters?.academic_year) query = query.eq('academic_year', filters.academic_year);
    if (filters?.prn) query = query.eq('prn', filters.prn);

    const { data, count, error } = await query.range(from, to).order('prn');
    if (error) {
      console.error('[SupabaseDB] getStudentMarks error:', error);
      return { data: [], total: 0, page, pageSize };
    }
    return { data: (data || []) as StudentMark[], total: count || 0, page, pageSize };
  }

  async upsertStudentMarks(marks: Omit<StudentMark, 'id' | 'uploaded_at' | 'updated_at'>[], _uploaderId?: string): Promise<{ total: number; error?: string }> {
    try {
      // Conflict target matches uq_student_marks_unique so re-uploading the
      // same (prn, course, semester, paper, years, assessment) updates in place
      // instead of inserting duplicate rows.
      const { data, error } = await supabase
        .from('student_marks')
        .upsert(marks, { onConflict: 'prn,cm_course_name,semester,paper_code,academic_year,exam_year,assessment_type' })
        .select();
      if (error) throw error;
      return { total: data?.length || 0 };
    } catch (e: any) {
      return { total: 0, error: e.message };
    }
  }

  async updateStudentMark(id: string, updates: Partial<StudentMark>): Promise<{ success: boolean; mark: StudentMark }> {
    const { data, error } = await supabase.from('student_marks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, mark: data as StudentMark };
  }

  async deleteStudentMark(id: string): Promise<void> {
    const { error } = await supabase.from('student_marks').delete().eq('id', id);
    if (error) throw error;
  }

  async deleteStudentMarks(ids: string[]): Promise<{ deleted: number; error?: string }> {
    try {
      const { data, error } = await supabase.from('student_marks').delete().in('id', ids).select();
      if (error) throw error;
      return { deleted: data?.length || ids.length };
    } catch (e: any) {
      return { deleted: 0, error: e.message };
    }
  }

  async getExaminationData(): Promise<ExaminationData> {
    const programs = await this.getPrograms();
    return {
      programs,
      courses: [],
      registrations: [],
      audit: [],
    };
  }

  async resetToDefaults(): Promise<void> {
    throw new Error('Database reset is protected. Please use the Supabase dashboard to perform database operations.');
  }

  // ============================================================================
  // Timetable Generator Engine (Supabase Implementation)
  // ============================================================================

  async getTimetableState(sessionId?: string) {
    try {
      let sessionQuery = supabase.from('timetable_sessions').select('*').order('created_at', { ascending: false });
      if (sessionId) {
        sessionQuery = sessionQuery.eq('id', sessionId);
      }
      const { data: sessions } = await sessionQuery;
      const activeSession = (sessions && sessions[0]) || {
        id: 'session-default',
        name: 'Default Examination Session',
        basis: 'Both',
        has_break_day: false,
        use_calendar_dates: true,
        is_active: true,
      };

      const [slotsRes, electivesRes, recordsRes, programsRes] = await Promise.all([
        supabase.from('timetable_slots').select('*').eq('session_id', activeSession.id),
        supabase.from('timetable_electives').select('*').eq('session_id', activeSession.id),
        supabase.from('timetable_student_records').select('*').eq('session_id', activeSession.id),
        this.getPrograms(),
      ]);

      return {
        sessions: (sessions || []) as TimetableSession[],
        activeSession: activeSession as TimetableSession,
        slots: (slotsRes.data || []) as SlotMaster[],
        electives: (electivesRes.data || []) as ElectiveGroup[],
        recordsCount: recordsRes.data?.length || 0,
        records: (recordsRes.data || []) as StudentRecord[],
        schedule: [] as ScheduleRow[],
        manualOverrides: {} as Record<string, ManualOverride>,
        programs: programsRes,
      };
    } catch (e) {
      console.warn('[SupabaseDB] getTimetableState fallback:', e);
      const programs = await this.getPrograms();
      return {
        sessions: [],
        activeSession: { id: 'default', name: 'Default Session', basis: 'Both' } as any,
        slots: [],
        electives: [],
        recordsCount: 0,
        records: [],
        schedule: [],
        manualOverrides: {},
        programs,
      };
    }
  }

  async saveTimetableSession(session: Partial<TimetableSession>) {
    const id = session.id || 'session-' + Date.now();
    const { error } = await supabase.from('timetable_sessions').upsert({ ...session, id });
    if (error) throw error;
    return { success: true, sessionId: id };
  }

  async saveTimetableSlots(sessionId: string, slots: SlotMaster[]) {
    const records = slots.map((s) => ({ ...s, session_id: sessionId }));
    const { error } = await supabase.from('timetable_slots').upsert(records);
    if (error) throw error;
    return { success: true, count: slots.length };
  }

  async saveTimetableElectives(sessionId: string, electives: ElectiveGroup[]) {
    const records = electives.map((e) => ({ ...e, session_id: sessionId }));
    const { error } = await supabase.from('timetable_electives').upsert(records);
    if (error) throw error;
    return { success: true, count: electives.length };
  }

  async uploadTimetableRecords(sessionId: string, records: StudentRecord[], append = false) {
    if (!append) {
      const { error: deleteErr } = await supabase.from('timetable_student_records').delete().eq('session_id', sessionId);
      if (deleteErr) throw deleteErr;
    }
    const withSession = records.map((r) => ({ ...r, session_id: sessionId }));
    const { error } = await supabase.from('timetable_student_records').insert(withSession);
    if (error) throw error;
    return { success: true, imported: records.length };
  }

  async clearTimetableRecords(sessionId: string) {
    const { error } = await supabase.from('timetable_student_records').delete().eq('session_id', sessionId);
    if (error) throw error;
    return { success: true };
  }

  async saveGeneratedTimetable(sessionId: string, schedule: ScheduleRow[], overrides: Record<string, ManualOverride>) {
    // Supabase mode has no timetable_generated_schedules / timetable_manual_overrides
    // tables (the cloud migration drops them and never recreates them), so the
    // generated timetable cannot be persisted here. Warn instead of silently
    // reporting success, which previously implied the schedule was saved.
    console.warn(
      `[SupabaseDB] saveGeneratedTimetable is a no-op in Supabase mode: timetable persistence is not implemented for session ${sessionId} (${schedule.length} rows, ${Object.keys(overrides || {}).length} overrides were NOT saved).`
    );
    return { success: false, savedCount: 0 };
  }

  async publishTimetableToSchedules(scheduleRows: ScheduleRow[]) {
    const programs = await this.getPrograms();
    const mapped: ExamSchedule[] = scheduleRows.map((r, i) => {
      const prog = programs.find((p) => p.program_name === r.programName);
      return {
        id: crypto.randomUUID(),
        pkg_no: i + 1,
        logic1: `${r.programName}_${r.semester}_${r.courseCode}_${r.courseName}`,
        cm_school_name: r.schoolName || '',
        cm_course_name: r.courseName || '',
        program_code: prog?.program_code || r.programName || '',
        semester: parseInt(String(r.semester).replace(/\D/g, '') || '1', 10),
        elective: '',
        paper_code: r.courseCode || '',
        sm_subject_name: r.courseName || '',
        student_count: r.totalStudents || 0,
        regular_count: r.appliedStudents || 0,
        backlog_count: r.notAppliedStudents || 0,
        exam_day: parseInt(String(r.day).replace(/\D/g, '') || '1', 10) || 1,
        exam_date: r.date || new Date().toISOString().split('T')[0],
        date_odd_even: `${r.date}_${r.oddEven}`,
        am_pm: (r.slotTime?.toUpperCase().includes('PM') ? 'PM' : 'AM') as any,
        exam_time: r.slotTime || '10:30 am to 01:30 pm',
        exam_type: 'Regular',
      };
    });

    const saved = await this.addSchedules(mapped);
    let tasksCreated = 0;
    for (const sched of saved) {
      try {
        const created = await this.generateDefaultTasksForSchedule(sched);
        tasksCreated += created.length;
      } catch {}
    }

    return {
      success: true,
      publishedCount: saved.length,
      tasksCreated,
      message: `Successfully published ${saved.length} exam schedules and generated ${tasksCreated} operational tasks.`,
    };
  }

  // ============================================================================
  // Faculty Allocations
  // ============================================================================

  async getFacultyAllocations(filters?: { subject_code?: string; semester?: string; staff_code?: string; program_name?: string; exam_role?: string }) {
    let query = supabase.from('faculty_course_allocations').select('*');
    if (filters?.subject_code) query = query.eq('subject_code', filters.subject_code);
    if (filters?.staff_code) query = query.eq('staff_code', filters.staff_code);
    const { data, error } = await query.order('staff_name');
    if (error) {
      console.error('[SupabaseDB] getFacultyAllocations error:', error);
      return [];
    }
    return (data || []) as FacultyCourseAllocation[];
  }

  async createFacultyAllocation(allocation: Partial<FacultyCourseAllocation>) {
    const { data, error } = await supabase.from('faculty_course_allocations').insert(allocation).select().single();
    if (error) throw error;
    return data as FacultyCourseAllocation;
  }

  async updateFacultyAllocation(id: string, updates: Partial<FacultyCourseAllocation>) {
    const { data, error } = await supabase.from('faculty_course_allocations').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as FacultyCourseAllocation;
  }

  async deleteFacultyAllocation(id: string) {
    const { error } = await supabase.from('faculty_course_allocations').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }

  async bulkUploadFacultyAllocations(allocations: Partial<FacultyCourseAllocation>[]) {
    const { data, error } = await supabase.from('faculty_course_allocations').upsert(allocations).select();
    if (error) throw error;
    return { success: true, count: data?.length || allocations.length };
  }

  // ============================================================================
  // Exam Performance Reports & Analytics
  // ============================================================================

  async getPerformanceAnalyticsSummary(): Promise<{ success: boolean; data: PerformanceAnalyticsSummary }> {
    const [programs, courses, schedules, faculty, marksRes] = await Promise.all([
      this.getPrograms(),
      this.getCourseMaster(),
      this.getSchedules(),
      this.getFacultyAllocations(),
      this.getStudentMarks({ pageSize: 1 }),
    ]);

    return {
      success: true,
      data: {
        programs,
        courses,
        schedules,
        faculty,
        marksCount: marksRes.total,
      },
    };
  }
}
