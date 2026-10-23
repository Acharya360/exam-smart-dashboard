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

export async function localRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Database backend unreachable. In cloud deployments (Vercel), please configure Supabase credentials.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || !text) {
      throw new Error(
        'Cloud database not connected. On Vercel, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings -> Environment Variables.'
      );
    }
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      'API server returned an empty or non-JSON response. On Vercel, please configure Supabase credentials in your project environment variables.'
    );
  }

  if (!response.ok) throw new Error(data.error || 'Database request failed. Please retry.');
  return data as T;
}
const message = (e: unknown) => e instanceof Error ? e.message : 'Database request failed.';
export class LocalDBService {
  private user: UserProfile = { id: '', email: '', full_name: '', role: 'COORDINATOR', title: '', created_at: '' };
  getCurrentUser() { return this.user; }
  setCurrentUser(user: UserProfile) { this.user = user; }
  async isLocalSql() { try { return (await localRequest<{status:string}>('/health')).status === 'ok'; } catch { return false; } }
  async isLoggedIn() { try { this.user = (await localRequest<{user:UserProfile}>('/auth/me')).user; return true; } catch { return false; } }
  async login(email: string, password: string) {
    try { const {user} = await localRequest<{user:UserProfile}>('/auth/login','POST',{email,password}); this.user=user; return {success:true,user}; }
    catch(e) { return {success:false,error:message(e)}; }
  }
  async logout() { await localRequest('/auth/logout','POST'); this.user={id:'',email:'',full_name:'',role:'COORDINATOR',title:'',created_at:''}; localStorage.removeItem('examtrack_current_user_v2'); }
  getUsers() { return localRequest<UserProfile[]>('/profiles'); }
  async createUser(payload: CreateUserPayload) { try { return {success:true,user:await localRequest<UserProfile>('/profiles','POST',payload)}; } catch(e) { return {success:false,error:message(e)}; } }
  async updateUserProfile(id:string, updates:Partial<UserProfile>) { try { const user=await localRequest<UserProfile>(`/profiles/${encodeURIComponent(id)}`,'PATCH',updates); if(id===this.user.id)this.user=user; return {success:true,user}; } catch(e) {return {success:false,error:message(e)};} }
  async deleteUser(id:string) { try {await localRequest(`/profiles/${encodeURIComponent(id)}`,'DELETE');return {success:true};}catch(e){return {success:false,error:message(e)};} }
  async deleteUsers(ids:string[]) { try {await localRequest('/profiles/bulk-delete','POST',{ids});return {success:true};}catch(e){return {success:false,error:message(e)};} }
  async updateUserPassword(id:string,newPassword:string,_actor:string,currentPassword?:string) { try {await localRequest('/auth/change-password','POST',{email:(await this.getUsers()).find(u=>u.id===id)?.email,newPassword,currentPassword});return {success:true};}catch(e){return {success:false,error:message(e)};} }
  getPrograms() { return localRequest<Program[]>('/programs'); }
  async addOrUpdateProgram(program:Program) { await localRequest('/programs/bulk','POST',{programs:[program]}); }
  async addOrUpdatePrograms(programs:Program[], clearExisting: boolean = false) { return await localRequest<Program[]>('/programs/bulk','POST',{programs, clearExisting}); }
  async deleteProgram(id:string) { await localRequest(`/programs/${encodeURIComponent(id)}`,'DELETE'); }
  async deletePrograms(ids:string[]) { try {await localRequest('/programs/bulk-delete','POST',{ids});}catch{for(const id of ids) await this.deleteProgram(id);} }
  getSchedules() { return localRequest<ExamSchedule[]>('/schedules'); }
  addSchedules(schedules:ExamSchedule[]) { return localRequest<ExamSchedule[]>('/schedules/bulk','POST',{schedules}); }
  async deleteSchedule(id:string) { await localRequest(`/schedules/${encodeURIComponent(id)}`,'DELETE'); }
  async deleteSchedules(ids:string[]) { try {await localRequest('/schedules/bulk-delete','POST',{ids});}catch{for(const id of ids) await this.deleteSchedule(id);} }
  getTasks() { return localRequest<ExamTask[]>('/tasks'); }
  async updateTaskStatus(id:string,status:ExamTask['status'],notes?:string) { await localRequest(`/tasks/${encodeURIComponent(id)}`,'PATCH',{status,notes}); }
  async escalateTask(id:string,reason:string) { await localRequest(`/tasks/${encodeURIComponent(id)}`,'PATCH',{status:'ESCALATED_TO_ALTERNATE',escalation_reason:reason}); }
  async addTask(task:ExamTask) { await localRequest('/tasks','POST',task); }
  async generateDefaultTasksForSchedule(schedule:ExamSchedule) {
    const program=(await this.getPrograms()).find(p=>p.program_code===schedule.program_code);
    if(!program?.primary_coordinator_id || !program.alternate_coordinator_id) throw new Error('Assign primary and alternate coordinators before generating tasks.');
    const existing=await this.getTasks();
    const tasks:ExamTask[]=[];
    for(const title of ['Question Paper Printing & Secure Vault Packaging','Hall Seating Plan, Attendance Sheets & Roll Labels','Invigilation Duty Assignment & Verification','Answer Booklet Collection & Counterfoil Verification']) {
      if(existing.some(t=>t.schedule_id===schedule.id && t.task_title.startsWith(title))) continue;
      const task:ExamTask={id:crypto.randomUUID(),schedule_id:schedule.id,program_code:schedule.program_code,task_title:title,status:'PENDING',assigned_to:program.primary_coordinator_id,alternate_user_id:program.alternate_coordinator_id,notes:'',due_date:schedule.exam_date,updated_at:new Date().toISOString()};
      await this.addTask(task); tasks.push(task);
    }
    return tasks;
  }
  getCourseMaster() { return localRequest<CourseMaster[]>('/course-master'); }
  async upsertCourseMaster(courses:Omit<CourseMaster,'id'|'created_at'|'updated_at'>[]) { try { const old=await this.getCourseMaster(); await localRequest('/course-master/bulk','POST',{courses}); const updated=courses.filter(c=>old.some(o=>o.paper_code===c.paper_code&&o.cm_course_name===c.cm_course_name)).length;return {inserted:courses.length-updated,updated}; } catch(e){return {inserted:0,updated:0,error:message(e)};} }
  async deleteCourseMasterRecord(id:string) { await localRequest(`/course-master/${encodeURIComponent(id)}`,'DELETE'); }
  async deleteCourseMasterRecords(ids:string[]) { try {await localRequest('/course-master/bulk-delete','POST',{ids});}catch{for(const id of ids) await this.deleteCourseMasterRecord(id);} }
  async getStudentMarks(filters?:{paper_code?:string;cm_course_name?:string;assessment_type?:string;academic_year?:string;prn?:string;page?:number;pageSize?:number}) {
    const params = new URLSearchParams({ ...(filters||{}), page: String(filters?.page??1), pageSize: String(filters?.pageSize??50) });
    const response = await localRequest<{data:StudentMark[];total:number;page:number;pageSize:number}>(`/student-marks?${params}`);
    return response;
  }
  async upsertStudentMarks(marks:Omit<StudentMark,'id'|'uploaded_at'|'updated_at'>[],uploaderId?:string) {try{const data=await localRequest<{count:number}>('/student-marks/bulk','POST',{marks,uploader_id:uploaderId});return {total:data.count};}catch(e){return {total:0,error:message(e)};} }
  async updateStudentMark(id:string,updates:Partial<StudentMark>) { return localRequest<{success:boolean;mark:StudentMark}>(`/student-marks/${encodeURIComponent(id)}`,'PATCH',updates); }
  async deleteStudentMark(id:string) {await localRequest(`/student-marks/${encodeURIComponent(id)}`,'DELETE');}
  async deleteStudentMarks(ids:string[]) { try {await localRequest('/student-marks/bulk-delete','POST',{ids});}catch{for(const id of ids) await this.deleteStudentMark(id);} }
  getExaminationData() { return localRequest<ExaminationData>('/examination'); }
  async resetToDefaults() { throw new Error('Database reset is unavailable. Existing university data is preserved.'); }

  // Timetable Generator Engine
  async getTimetableState(sessionId?: string) {
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
    return localRequest<{
      sessions: TimetableSession[];
      activeSession: TimetableSession;
      slots: SlotMaster[];
      electives: ElectiveGroup[];
      recordsCount: number;
      records: StudentRecord[];
      schedule: ScheduleRow[];
      manualOverrides: Record<string, ManualOverride>;
      programs: Program[];
    }>(`/timetable/state${query}`);
  }

  async saveTimetableSession(session: Partial<TimetableSession>) {
    return localRequest<{ success: boolean; sessionId: string }>('/timetable/sessions', 'POST', session);
  }

  async saveTimetableSlots(sessionId: string, slots: SlotMaster[]) {
    return localRequest<{ success: boolean; count: number }>('/timetable/slots', 'POST', { sessionId, slots });
  }

  async saveTimetableElectives(sessionId: string, electives: ElectiveGroup[]) {
    return localRequest<{ success: boolean; count: number }>('/timetable/electives', 'POST', { sessionId, electives });
  }

  async uploadTimetableRecords(sessionId: string, records: StudentRecord[], append = false) {
    return localRequest<{ success: boolean; imported: number }>('/timetable/records/bulk', 'POST', { sessionId, records, append });
  }

  async clearTimetableRecords(sessionId: string) {
    return localRequest<{ success: boolean }>('/timetable/records/clear', 'POST', { sessionId });
  }

  async saveGeneratedTimetable(sessionId: string, schedule: ScheduleRow[], overrides: Record<string, ManualOverride>) {
    return localRequest<{ success: boolean; savedCount: number }>('/timetable/save-schedule', 'POST', { sessionId, schedule, overrides });
  }

  async publishTimetableToSchedules(scheduleRows: ScheduleRow[]) {
    return localRequest<{ success: boolean; publishedCount: number; tasksCreated: number; message: string }>(
      '/timetable/publish-to-schedules',
      'POST',
      { scheduleRows }
    );
  }

  // ============================================================================
  // Faculty Course Allocations (Teaching Staff against Course Master)
  // ============================================================================

  async getFacultyAllocations(filters?: { subject_code?: string; semester?: string; staff_code?: string; program_name?: string; exam_role?: string }) {
    const params = new URLSearchParams();
    if (filters?.subject_code) params.set('subject_code', filters.subject_code);
    if (filters?.semester) params.set('semester', filters.semester);
    if (filters?.staff_code) params.set('staff_code', filters.staff_code);
    if (filters?.program_name) params.set('program_name', filters.program_name);
    if (filters?.exam_role) params.set('exam_role', filters.exam_role);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return localRequest<FacultyCourseAllocation[]>(`/faculty-allocations${qs}`);
  }

  async createFacultyAllocation(allocation: Partial<FacultyCourseAllocation>) {
    return localRequest<FacultyCourseAllocation>('/faculty-allocations', 'POST', allocation);
  }

  async updateFacultyAllocation(id: string, updates: Partial<FacultyCourseAllocation>) {
    return localRequest<FacultyCourseAllocation>(`/faculty-allocations/${encodeURIComponent(id)}`, 'PATCH', updates);
  }

  async deleteFacultyAllocation(id: string) {
    return localRequest<{ success: boolean }>(`/faculty-allocations/${encodeURIComponent(id)}`, 'DELETE');
  }

  async bulkUploadFacultyAllocations(allocations: Partial<FacultyCourseAllocation>[]) {
    return localRequest<{ success: boolean; count: number }>('/faculty-allocations/bulk-upload', 'POST', { allocations });
  }

  // ============================================================================
  // Exam Performance Reports & Analytics
  // ============================================================================

  async getPerformanceAnalyticsSummary() {
    return localRequest<{ success: boolean; data: PerformanceAnalyticsSummary }>('/performance-reports/summary');
  }
}

