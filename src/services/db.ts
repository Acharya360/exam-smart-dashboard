import { ExamSchedule, ExamTask, Program, UserProfile } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-coe-1',
    email: 'coe@sspu.ac.in',
    password: 'Admin@123',
    full_name: 'Dr. Rajesh Sharma',
    role: 'COE',
    title: 'Controller of Examinations',
    department: 'Central Examination Office',
    phone: '+91 98765 43210',
    created_at: '2026-01-10T09:00:00Z',
    last_password_change: '2026-01-10T09:00:00Z',
  },
  {
    id: 'user-dycoe-1',
    email: 'DyCoe@sspu.ac.in',
    password: 'Admin@123',
    full_name: 'Dr. Anita Verma',
    role: 'DYCOE',
    title: 'Deputy Controller of Examinations',
    department: 'Central Examination Office',
    phone: '+91 98765 43211',
    created_at: '2026-01-12T10:00:00Z',
    last_password_change: '2026-01-12T10:00:00Z',
  },
  {
    id: 'user-acoe-1',
    email: 'Acoe@sspu.ac.in',
    password: 'Admin@123',
    full_name: 'Prof. Vikram Patel',
    role: 'ACOE',
    title: 'Assistant Controller of Examinations',
    department: 'Central Examination Office',
    phone: '+91 98765 43212',
    created_at: '2026-01-15T11:30:00Z',
    last_password_change: '2026-01-15T11:30:00Z',
  },
  {
    id: 'user-coord-1',
    email: 'sarah.jenkins@university.edu',
    password: 'Admin@123',
    full_name: 'Prof. Sarah Jenkins',
    role: 'COORDINATOR',
    title: 'Associate Professor & Exam Coordinator',
    department: 'School of Construction Engineering and Infrastructure Management',
    phone: '+91 98765 43220',
    created_at: '2026-02-01T08:00:00Z',
    last_password_change: '2026-02-01T08:00:00Z',
  },
  {
    id: 'user-coord-2',
    email: 'amit.roy@university.edu',
    password: 'Admin@123',
    full_name: 'Prof. Amit Roy',
    role: 'COORDINATOR',
    title: 'Assistant Professor & Exam Coordinator',
    department: 'School of Mechatronics Engineering',
    phone: '+91 98765 43221',
    created_at: '2026-02-01T08:30:00Z',
    last_password_change: '2026-02-01T08:30:00Z',
  },
  {
    id: 'user-coord-3',
    email: 'neha.gupta@university.edu',
    password: 'Admin@123',
    full_name: 'Dr. Neha Gupta',
    role: 'COORDINATOR',
    title: 'Senior Faculty & Alternate Coordinator',
    department: 'School of Computer Science & Artificial Intelligence',
    phone: '+91 98765 43222',
    created_at: '2026-02-05T09:15:00Z',
    last_password_change: '2026-02-05T09:15:00Z',
  },
  {
    id: 'user-coord-4',
    email: 'arun.kumar@university.edu',
    password: 'Admin@123',
    full_name: 'Dr. Arun Kumar',
    role: 'COORDINATOR',
    title: 'Associate Professor & Exam Coordinator',
    department: 'School of Electrical & Electronics Engineering',
    phone: '+91 98765 43223',
    created_at: '2026-02-07T10:00:00Z',
    last_password_change: '2026-02-07T10:00:00Z',
  },
];

export const INITIAL_PROGRAMS: Program[] = [
  {
    id: 'prog-1',
    sr_no: 1,
    program_code: 'BTECH-CEM',
    program_name: 'B.Tech. Construction Engineering & Management',
    school_name: 'School of Construction Engineering and Infrastructure Management',
    primary_coordinator_id: 'user-coord-1', // Prof. Sarah Jenkins
    alternate_coordinator_id: 'user-coord-3', // Dr. Neha Gupta
  },
  {
    id: 'prog-2',
    sr_no: 2,
    program_code: 'BTECH-MECH',
    program_name: 'B.Tech. Mechatronics Engineering',
    school_name: 'School of Mechatronics Engineering',
    primary_coordinator_id: 'user-coord-2', // Prof. Amit Roy
    alternate_coordinator_id: 'user-coord-1', // Prof. Sarah Jenkins
  },
  {
    id: 'prog-3',
    sr_no: 3,
    program_code: 'BTECH-CSAI',
    program_name: 'B.Tech. Computer Science & AI',
    school_name: 'School of Computer Science & Artificial Intelligence',
    primary_coordinator_id: 'user-coord-3', // Dr. Neha Gupta
    alternate_coordinator_id: 'user-coord-2', // Prof. Amit Roy
  },
  {
    id: 'prog-4',
    sr_no: 4,
    program_code: 'BTECH-EEE',
    program_name: 'B.Tech. Electrical & Electronics',
    school_name: 'School of Electrical & Electronics Engineering',
    primary_coordinator_id: 'user-coord-4', // Dr. Arun Kumar
    alternate_coordinator_id: 'user-coord-1', // Prof. Sarah Jenkins
  },
];

export const INITIAL_SCHEDULES: ExamSchedule[] = [
  {
    id: 'sched-1',
    pkg_no: 1,
    logic1: 'B.Tech. Construction Engineering & Management_2_APSC102_Applied Physics',
    cm_school_name: 'School of Construction Engineering and Infrastructure Management',
    cm_course_name: 'B.Tech. Construction Engineering & Management',
    program_code: 'BTECH-CEM',
    semester: 2,
    elective: '',
    paper_code: 'APSC102',
    sm_subject_name: 'Applied Physics',
    student_count: 2,
    regular_count: 0,
    backlog_count: 2,
    exam_day: 1,
    exam_date: '14/05/2026',
    date_odd_even: '14-05-2026_Odd',
    am_pm: 'AM',
    exam_time: '10:30 am to 12:30 pm',
    exam_type: 'Backlog',
  },
  {
    id: 'sched-2',
    pkg_no: 2,
    logic1: 'B.Tech. Construction Engineering & Management_2_APSC2102_Applied Physics',
    cm_school_name: 'School of Construction Engineering and Infrastructure Management',
    cm_course_name: 'B.Tech. Construction Engineering & Management',
    program_code: 'BTECH-CEM',
    semester: 2,
    elective: '',
    paper_code: 'APSC2102',
    sm_subject_name: 'Applied Physics',
    student_count: 25,
    regular_count: 25,
    backlog_count: 0,
    exam_day: 1,
    exam_date: '14/05/2026',
    date_odd_even: '14-05-2026_Odd',
    am_pm: 'AM',
    exam_time: '10:30 am to 12:30 pm',
    exam_type: 'Regular',
  },
  {
    id: 'sched-3',
    pkg_no: 3,
    logic1: 'B.Tech. Mechatronics Engineering_2_APSC2103_Applied Chemistry',
    cm_school_name: 'School of Mechatronics Engineering',
    cm_course_name: 'B.Tech. Mechatronics Engineering',
    program_code: 'BTECH-MECH',
    semester: 2,
    elective: '',
    paper_code: 'APSC2103',
    sm_subject_name: 'Applied Chemistry',
    student_count: 6,
    regular_count: 0,
    backlog_count: 6,
    exam_day: 1,
    exam_date: '14/05/2026',
    date_odd_even: '14-05-2026_Odd',
    am_pm: 'AM',
    exam_time: '10:30 am to 12:30 pm',
    exam_type: 'Backlog',
  },
  {
    id: 'sched-4',
    pkg_no: 4,
    logic1: 'B.Tech. Computer Science & AI_4_CS401_Operating Systems',
    cm_school_name: 'School of Computer Science & Artificial Intelligence',
    cm_course_name: 'B.Tech. Computer Science & AI',
    program_code: 'BTECH-CSAI',
    semester: 4,
    elective: '',
    paper_code: 'CS401',
    sm_subject_name: 'Operating Systems & Concurrency',
    student_count: 68,
    regular_count: 60,
    backlog_count: 8,
    exam_day: 2,
    exam_date: '16/05/2026',
    date_odd_even: '16-05-2026_Even',
    am_pm: 'PM',
    exam_time: '02:00 pm to 05:00 pm',
    exam_type: 'Both',
  },
  {
    id: 'sched-5',
    pkg_no: 5,
    logic1: 'B.Tech. Electrical & Electronics_6_EE602_Power Systems II',
    cm_school_name: 'School of Electrical & Electronics Engineering',
    cm_course_name: 'B.Tech. Electrical & Electronics',
    program_code: 'BTECH-EEE',
    semester: 6,
    elective: 'Elective-B',
    paper_code: 'EE602',
    sm_subject_name: 'Power Systems & Smart Grids',
    student_count: 42,
    regular_count: 40,
    backlog_count: 2,
    exam_day: 3,
    exam_date: '18/05/2026',
    date_odd_even: '18-05-2026_Even',
    am_pm: 'AM',
    exam_time: '10:30 am to 01:30 pm',
    exam_type: 'Both',
  },
];

export const INITIAL_TASKS: ExamTask[] = [
  {
    id: 'task-1',
    schedule_id: 'sched-1',
    program_code: 'BTECH-CEM',
    task_title: 'Question Paper Printing & Confidential Sealing',
    status: 'COMPLETED',
    assigned_to: 'user-coord-1',
    alternate_user_id: 'user-coord-3',
    notes: 'Printed 2 backlog sets and sealed in confidential envelope #CEM-01.',
    due_date: '2026-05-12',
    updated_at: '2026-05-10T14:30:00Z',
  },
  {
    id: 'task-2',
    schedule_id: 'sched-1',
    program_code: 'BTECH-CEM',
    task_title: 'Hall Seating Plan & Roll Number Stickers',
    status: 'IN_PROGRESS',
    assigned_to: 'user-coord-1',
    alternate_user_id: 'user-coord-3',
    notes: 'Allocated to Block C, Room 204.',
    due_date: '2026-05-13',
    updated_at: '2026-05-11T11:00:00Z',
  },
  {
    id: 'task-3',
    schedule_id: 'sched-2',
    program_code: 'BTECH-CEM',
    task_title: 'Attendance Sheet & Answer Booklet Preparation',
    status: 'PENDING',
    assigned_to: 'user-coord-1',
    alternate_user_id: 'user-coord-3',
    notes: '25 Regular students registered. Booklet pack prepared.',
    due_date: '2026-05-13',
    updated_at: '2026-05-09T10:00:00Z',
  },
  {
    id: 'task-4',
    schedule_id: 'sched-3',
    program_code: 'BTECH-MECH',
    task_title: 'Invigilator & Flying Squad Duty Roster',
    status: 'ESCALATED_TO_ALTERNATE',
    assigned_to: 'user-coord-2',
    alternate_user_id: 'user-coord-1',
    notes: 'Primary coordinator on medical leave. Escalated to Alternate Member Prof. Sarah Jenkins.',
    due_date: '2026-05-12',
    updated_at: '2026-05-11T16:00:00Z',
    escalated_at: '2026-05-11T16:00:00Z',
    escalation_reason: 'Primary coordinator inactive for 48 hours prior to exam day.',
  },
  {
    id: 'task-5',
    schedule_id: 'sched-4',
    program_code: 'BTECH-CSAI',
    task_title: 'QP Confidential Dispatch Verification',
    status: 'PENDING',
    assigned_to: 'user-coord-3',
    alternate_user_id: 'user-coord-2',
    notes: 'Awaiting dispatch confirmation from Central CoE vault.',
    due_date: '2026-05-15',
    updated_at: '2026-05-10T12:00:00Z',
  },
  {
    id: 'task-6',
    schedule_id: 'sched-5',
    program_code: 'BTECH-EEE',
    task_title: 'Special Seating & Drawing Board Verification',
    status: 'COMPLETED',
    assigned_to: 'user-coord-4',
    alternate_user_id: 'user-coord-1',
    notes: 'Confirmed seating arrangement in Hall B.',
    due_date: '2026-05-17',
    updated_at: '2026-05-10T09:00:00Z',
  },
];

const STORAGE_KEYS = {
  USERS: 'examtrack_users_v2',
  PROGRAMS: 'examtrack_programs_v1',
  SCHEDULES: 'examtrack_schedules_v1',
  TASKS: 'examtrack_tasks_v1',
  CURRENT_USER: 'examtrack_current_user_v2',
  IS_LOGGED_IN: 'examtrack_is_logged_in_v1',
};

class LocalDBService {
  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    } else {
      // Ensure all users have the institutional emails and default Admin@123 password
      try {
        const storedUsers: UserProfile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        let updated = false;
        const emailMap: Record<string, string> = {
          'coe@university.edu': 'coe@sspu.ac.in',
          'dycoe@university.edu': 'DyCoe@sspu.ac.in',
          'acoe@university.edu': 'Acoe@sspu.ac.in',
        };

        const migratedUsers = storedUsers.map((u) => {
          let modified = false;
          let newEmail = u.email;
          if (emailMap[u.email.toLowerCase()]) {
            newEmail = emailMap[u.email.toLowerCase()];
            modified = true;
          }
          let newPass = u.password;
          if (!newPass || newPass === 'Password@123') {
            newPass = 'Admin@123';
            modified = true;
          }
          if (modified) {
            updated = true;
            return { ...u, email: newEmail, password: newPass };
          }
          return u;
        });

        if (updated) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(migratedUsers));
        }
      } catch {}
    }

    if (!localStorage.getItem(STORAGE_KEYS.PROGRAMS)) {
      localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(INITIAL_PROGRAMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(INITIAL_SCHEDULES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
    if (localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === null) {
      // Default to logged-in so initial app review is immediate, but user can log out
      localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    }
  }

  // Authentication & Session
  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
  }

  login(email: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, error: 'User with this email not registered in institutional directory.' };
    }

    const expectedPassword = user.password || 'Admin@123';
    if (password !== expectedPassword) {
      return { success: false, error: 'Invalid password. Please check your credentials or contact CoE.' };
    }

    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
    this.setCurrentUser(user);
    return { success: true, user };
  }

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'false');
  }

  // Password Management (Authorized for COE, DYCOE, ACOE)
  updateUserPassword(
    targetUserId: string,
    newPassword: string,
    adminName: string
  ): { success: boolean; error?: string } {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.id === targetUserId);

    if (userIndex === -1) {
      return { success: false, error: 'Target user not found.' };
    }

    users[userIndex] = {
      ...users[userIndex],
      password: newPassword,
      last_password_change: new Date().toISOString(),
      password_changed_by: adminName,
    };

    this.saveUsers(users);

    // If the changed user is currently logged in, update session profile
    const current = this.getCurrentUser();
    if (current.id === targetUserId) {
      this.setCurrentUser(users[userIndex]);
    }

    return { success: true };
  }

  // Update Profile Details (Name, Phone, Department, Title)
  updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): { success: boolean; user?: UserProfile; error?: string } {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      return { success: false, error: 'User not found' };
    }

    const updatedUser: UserProfile = {
      ...users[index],
      ...updates,
      id: users[index].id, // protect immutable primary key
      email: users[index].email, // protect login email identity
      role: users[index].role, // protect role
    };

    users[index] = updatedUser;
    this.saveUsers(users);

    const current = this.getCurrentUser();
    if (current.id === userId) {
      this.setCurrentUser(updatedUser);
    }

    return { success: true, user: updatedUser };
  }

  // Users
  getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  getUserById(id: string): UserProfile | undefined {
    return this.getUsers().find((u) => u.id === id);
  }

  saveUsers(users: UserProfile[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // Programs
  getPrograms(): Program[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRAMS);
      return data ? JSON.parse(data) : INITIAL_PROGRAMS;
    } catch {
      return INITIAL_PROGRAMS;
    }
  }

  savePrograms(programs: Program[]) {
    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(programs));
  }

  addOrUpdateProgram(program: Program) {
    const programs = this.getPrograms();
    const index = programs.findIndex((p) => p.id === program.id || p.program_code === program.program_code);
    if (index >= 0) {
      programs[index] = program;
    } else {
      programs.push(program);
    }
    this.savePrograms(programs);
  }

  deleteProgram(id: string) {
    const programs = this.getPrograms().filter((p) => p.id !== id);
    this.savePrograms(programs);
  }

  // Exam Schedules
  getSchedules(): ExamSchedule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return data ? JSON.parse(data) : INITIAL_SCHEDULES;
    } catch {
      return INITIAL_SCHEDULES;
    }
  }

  saveSchedules(schedules: ExamSchedule[]) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }

  addSchedules(newSchedules: ExamSchedule[]) {
    const existing = this.getSchedules();
    // Merge by pkg_no or id
    const map = new Map<string, ExamSchedule>();
    existing.forEach((s) => map.set(s.id, s));
    newSchedules.forEach((s) => map.set(s.id, s));
    const merged = Array.from(map.values());
    this.saveSchedules(merged);
    return merged;
  }

  // Tasks
  getTasks(): ExamTask[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  }

  saveTasks(tasks: ExamTask[]) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  updateTaskStatus(taskId: string, status: ExamTask['status'], notes?: string) {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      tasks[index] = {
        ...tasks[index],
        status,
        notes: notes !== undefined ? notes : tasks[index].notes,
        updated_at: new Date().toISOString(),
      };
      this.saveTasks(tasks);
    }
    return tasks;
  }

  escalateTask(taskId: string, reason: string) {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index >= 0) {
      tasks[index] = {
        ...tasks[index],
        status: 'ESCALATED_TO_ALTERNATE',
        escalated_at: new Date().toISOString(),
        escalation_reason: reason,
        updated_at: new Date().toISOString(),
      };
      this.saveTasks(tasks);
    }
    return tasks;
  }

  addTask(task: ExamTask) {
    const tasks = this.getTasks();
    tasks.unshift(task);
    this.saveTasks(tasks);
    return tasks;
  }

  // Generate automated task suite for a new schedule
  generateDefaultTasksForSchedule(schedule: ExamSchedule): ExamTask[] {
    const programs = this.getPrograms();
    const program = programs.find((p) => p.program_code === schedule.program_code) || programs[0];
    const primaryId = program ? program.primary_coordinator_id : 'user-coord-1';
    const altId = program ? program.alternate_coordinator_id : 'user-coord-3';

    const defaultTitles = [
      'Question Paper Printing & Secure Vault Packaging',
      'Hall Seating Plan, Attendance Sheets & Roll Labels',
      'Invigilation Duty Assignment & Verification',
      'Answer Booklet Collection & Counterfoil Verification',
    ];

    return defaultTitles.map((title, idx) => ({
      id: `task-gen-${schedule.id}-${idx + 1}-${Date.now()}`,
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
  }

  // Current session user
  getCurrentUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  }

  setCurrentUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // Reset database back to default factory state
  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(INITIAL_PROGRAMS));
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(INITIAL_SCHEDULES));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(INITIAL_TASKS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
  }
}

export const db = new LocalDBService();
