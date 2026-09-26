import { CourseMaster, CreateUserPayload, ExamSchedule, ExamTask, Program, StudentMark, UserProfile } from '../types';
import { supabase } from './supabaseClient';

class SupabaseDBService {
  // Authentication & Session
  async isLoggedIn(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Invalid credentials' };
      }

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Profile not found in database.' };
      }

      // Save to local storage for quick synchronous checks if needed (optional)
      localStorage.setItem('examtrack_current_user_v2', JSON.stringify(profile));
      return { success: true, user: profile as UserProfile };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem('examtrack_current_user_v2');
  }

  // Password Management (Authorized for COE, DYCOE, ACOE)
  async updateUserPassword(
    targetUserId: string,
    newPassword: string,
    adminName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    
    // In Supabase, changing another user's password securely requires the Admin API via a secure backend function.
    // As a workaround for client-side without edge functions, we'll return an error explaining this limitation.
    // In a full implementation, you'd call a Supabase Edge Function here.
    return { success: false, error: 'Password reset requires an Edge Function in Supabase to use the Admin API.' };
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    // If email is provided, try updating it in auth.users using the admin API
    if (updates.email) {
      const hasServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY && 
                            import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY !== import.meta.env.VITE_SUPABASE_ANON_KEY;
                            
      if (hasServiceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const serviceClient = createClient(
          import.meta.env.VITE_SUPABASE_URL || '',
          import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''
        );
        const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, { 
          email: updates.email,
          user_metadata: {
            full_name: updates.full_name,
            role: updates.role
          },
          email_confirm: true
        });
        
        if (authError) {
          console.error("Auth email update error:", authError);
          // If we fail here, we should probably still try to update the profiles table, 
          // or return an error depending on strictness. We'll proceed to update profiles.
        }
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        email: updates.email,
        full_name: updates.full_name,
        role: updates.role,
        department: updates.department,
        phone: updates.phone,
        title: updates.title
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    
    // Only update local storage if the updated user is the current logged in user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      localStorage.setItem('examtrack_current_user_v2', JSON.stringify(data));
    }
    
    return { success: true, user: data as UserProfile };
  }

  // Users
  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as UserProfile[];
  }

  // User Management: Create new user (uses service-role via RPC or direct insert)
  async createUser(payload: CreateUserPayload): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      // Step 1: Create auth user via Supabase's signUp (the user will be created but won't auto-sign-in the admin)
      // For internal university ERP, we use a workaround: insert directly into profiles after creating auth user
      // Note: This requires the service role or an edge function for production. 
      // For now, we use supabase.auth.signUp which creates a user but doesn't sign out the current admin session.
      
      // We use a separate client instance to avoid signing out the current admin
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      );

      // Try admin.createUser first to bypass rate limits (requires service_role key)
      let authData: any = null;
      let authError: any = null;
      
      const hasServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY && 
                            import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY !== import.meta.env.VITE_SUPABASE_ANON_KEY;
                            
      if (hasServiceKey) {
        const { data, error } = await serviceClient.auth.admin.createUser({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          email_confirm: true,
          user_metadata: {
            full_name: payload.full_name,
            role: payload.role,
          }
        });
        authData = data;
        authError = error;
      }

      // Fallback to normal signUp if admin API failed or no service key
      if (!hasServiceKey || authError) {
        const { data, error } = await serviceClient.auth.signUp({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          options: {
            data: {
              full_name: payload.full_name,
              role: payload.role,
            }
          }
        });
        authData = data;
        authError = error;
      }

      if (authError || !authData?.user) {
        // If it's a rate limit error, provide a clearer message
        const errorMsg = authError?.message || 'Failed to create auth user.';
        if (errorMsg.toLowerCase().includes('rate limit')) {
          return { success: false, error: 'Email rate limit exceeded. Please add VITE_SUPABASE_SERVICE_ROLE_KEY in .env to bypass limits using Admin API, or try again later.' };
        }
        return { success: false, error: errorMsg };
      }

      // Step 2: Insert profile record
      const profileData = {
        id: authData.user.id,
        email: payload.email.trim().toLowerCase(),
        full_name: payload.full_name,
        role: payload.role,
        department: payload.department,
        phone: payload.phone,
        title: payload.title,
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      return { success: true, user: profile as UserProfile };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error creating user.' };
    }
  }

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First try to delete from auth.users if we have service key
      const { createClient } = await import('@supabase/supabase-js');
      const serviceClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      );

      const { error: authError } = await serviceClient.auth.admin.deleteUser(userId);
      
      if (authError) {
        // If admin deletion fails (e.g. no service key), fallback to deleting profile
        // This will leave an orphaned auth user, but remove them from the app
        const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
        if (profileError) return { success: false, error: profileError.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error deleting user.' };
    }
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    const { data, error } = await supabase.from('programs').select('*').order('sr_no');
    if (error) {
      console.error('Error fetching programs:', error);
      return [];
    }
    return data as Program[];
  }

  async addOrUpdateProgram(program: Program): Promise<void> {
    const { error } = await supabase
      .from('programs')
      .upsert({ ...program, updated_at: new Date().toISOString() });
    if (error) console.error('Error saving program:', error);
  }

  async deleteProgram(id: string): Promise<void> {
    const { error } = await supabase.from('programs').delete().eq('id', id);
    if (error) console.error('Error deleting program:', error);
  }

  // Exam Schedules
  async getSchedules(): Promise<ExamSchedule[]> {
    const { data, error } = await supabase.from('exam_schedules').select('*').order('exam_date');
    if (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }
    return data as ExamSchedule[];
  }

  async addSchedules(newSchedules: ExamSchedule[]): Promise<ExamSchedule[]> {
    // Remove the client-generated ID so Supabase gen_random_uuid() can handle it, 
    // unless we strictly want to keep the client IDs. Let's just upsert using pkg_no or paper_code as conflict targets if possible, 
    // or just insert. For now, insert all.
    const recordsToInsert = newSchedules.map(s => {
      const copy = { ...s };
      if (copy.id && copy.id.startsWith('sched-')) delete (copy as any).id; // Remove fake ids
      return copy;
    });

    const { data, error } = await supabase
      .from('exam_schedules')
      .insert(recordsToInsert)
      .select();
      
    if (error) {
      console.error('Error adding schedules:', error);
      return [];
    }
    return data as ExamSchedule[];
  }

  // Tasks
  async getTasks(): Promise<ExamTask[]> {
    const { data, error } = await supabase.from('exam_tasks').select('*').order('due_date');
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    return data as ExamTask[];
  }

  async updateTaskStatus(taskId: string, status: ExamTask['status'], notes?: string): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('exam_tasks')
      .update(updateData)
      .eq('id', taskId);
      
    if (error) console.error('Error updating task:', error);
  }

  async escalateTask(taskId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('exam_tasks')
      .update({
        status: 'ESCALATED_TO_ALTERNATE',
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) console.error('Error escalating task:', error);
  }

  async addTask(task: ExamTask): Promise<void> {
    const copy = { ...task };
    if (copy.id && copy.id.startsWith('task-')) delete (copy as any).id;

    const { error } = await supabase.from('exam_tasks').insert([copy]);
    if (error) console.error('Error adding task:', error);
  }

  // Generate automated task suite for a new schedule
  async generateDefaultTasksForSchedule(schedule: ExamSchedule): Promise<ExamTask[]> {
    const programs = await this.getPrograms();
    const program = programs.find((p) => p.program_code === schedule.program_code) || programs[0];
    const primaryId = program ? program.primary_coordinator_id : null;
    const altId = program ? program.alternate_coordinator_id : null;

    const defaultTitles = [
      'Question Paper Printing & Secure Vault Packaging',
      'Hall Seating Plan, Attendance Sheets & Roll Labels',
      'Invigilation Duty Assignment & Verification',
      'Answer Booklet Collection & Counterfoil Verification',
    ];

    const tasksToInsert = defaultTitles.map((title) => ({
      schedule_id: schedule.id,
      program_code: schedule.program_code,
      task_title: `${title} (${schedule.paper_code})`,
      status: 'PENDING',
      assigned_to: primaryId,
      alternate_user_id: altId,
      notes: `Automated task created for ${schedule.sm_subject_name} (${schedule.exam_type}). Exam Date: ${schedule.exam_date}, Session: ${schedule.am_pm}.`,
      due_date: schedule.exam_date,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('exam_tasks')
      .insert(tasksToInsert)
      .select();

    if (error) {
      console.error('Error generating tasks:', error);
      return [];
    }
    return data as ExamTask[];
  }

  // ============================================================================
  // Course Master CRUD
  // ============================================================================

  async getCourseMaster(): Promise<CourseMaster[]> {
    const { data, error } = await supabase
      .from('course_master')
      .select('*')
      .order('sr_no');
    if (error) {
      console.error('Error fetching course master:', error);
      return [];
    }
    return data as CourseMaster[];
  }

  async upsertCourseMaster(courses: Omit<CourseMaster, 'id' | 'created_at' | 'updated_at'>[]): Promise<{ inserted: number; updated: number; error?: string }> {
    try {
      const records = courses.map(c => ({
        ...c,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('course_master')
        .upsert(records, { onConflict: 'cm_course_name,semester,paper_code' })
        .select();

      if (error) {
        return { inserted: 0, updated: 0, error: error.message };
      }

      return { inserted: data?.length || 0, updated: 0 };
    } catch (err: any) {
      return { inserted: 0, updated: 0, error: err.message };
    }
  }

  async deleteCourseMasterRecord(id: string): Promise<void> {
    const { error } = await supabase.from('course_master').delete().eq('id', id);
    if (error) console.error('Error deleting course master record:', error);
  }

  // ============================================================================
  // Student Marks CRUD
  // ============================================================================

  async getStudentMarks(filters?: {
    paper_code?: string;
    cm_course_name?: string;
    assessment_type?: string;
    academic_year?: string;
    prn?: string;
  }): Promise<StudentMark[]> {
    let query = supabase
      .from('student_marks')
      .select('*')
      .order('prn')
      .order('assessment_type');

    if (filters?.paper_code) query = query.eq('paper_code', filters.paper_code);
    if (filters?.cm_course_name) query = query.eq('cm_course_name', filters.cm_course_name);
    if (filters?.assessment_type) query = query.eq('assessment_type', filters.assessment_type);
    if (filters?.academic_year) query = query.eq('academic_year', filters.academic_year);
    if (filters?.prn) query = query.eq('prn', filters.prn);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching student marks:', error);
      return [];
    }
    return data as StudentMark[];
  }

  async upsertStudentMarks(
    marks: Omit<StudentMark, 'id' | 'uploaded_at' | 'updated_at'>[],
    uploaderId?: string
  ): Promise<{ total: number; error?: string }> {
    try {
      // De-duplicate records based on the unique constraint to avoid PostgreSQL 
      // "ON CONFLICT DO UPDATE command cannot affect row a second time" error.
      // We keep the last occurrence in the array (simulating an update).
      const uniqueRecordsMap = new Map<string, any>();
      
      marks.forEach(m => {
        const key = `${m.prn}|${m.cm_course_name}|${m.semester}|${m.paper_code}|${m.sm_subject_name}|${m.academic_year}|${m.exam_year}|${m.assessment_type}`;
        uniqueRecordsMap.set(key, {
          ...m,
          uploaded_by: uploaderId || m.uploaded_by || null,
          updated_at: new Date().toISOString(),
        });
      });

      const records = Array.from(uniqueRecordsMap.values());

      const { data, error } = await supabase
        .from('student_marks')
        .upsert(records, {
          onConflict: 'prn,cm_course_name,semester,paper_code,sm_subject_name,academic_year,exam_year,assessment_type'
        })
        .select();

      if (error) {
        return { total: 0, error: error.message };
      }

      return { total: data?.length || 0 };
    } catch (err: any) {
      return { total: 0, error: err.message };
    }
  }

  async deleteStudentMark(id: string): Promise<void> {
    const { error } = await supabase.from('student_marks').delete().eq('id', id);
    if (error) console.error('Error deleting student mark:', error);
  }

  // Current session user
  getCurrentUser(): UserProfile {
    try {
      const data = localStorage.getItem('examtrack_current_user_v2');
      if (data) return JSON.parse(data);
    } catch {}
    
    return {
      id: '',
      email: '',
      full_name: '',
      role: 'COORDINATOR',
      title: '',
      created_at: new Date().toISOString()
    };
  }

  setCurrentUser(user: UserProfile) {
    localStorage.setItem('examtrack_current_user_v2', JSON.stringify(user));
  }

  // Reset database (Not securely supported from client side on prod DB without admin rights)
  async resetToDefaults(): Promise<void> {
    alert('Factory reset is not allowed in production Supabase environment without an Admin API call.');
  }
}

export const db = new SupabaseDBService();