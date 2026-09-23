import { ExamSchedule, ExamTask, Program, UserProfile } from '../types';
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
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
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
    
    localStorage.setItem('examtrack_current_user_v2', JSON.stringify(data));
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
