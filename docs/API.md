# Internal Services & API Reference (API.md)

## 1. Purpose
This document specifies the internal service interfaces, Excel parser signatures, and external API communication protocols used by **Acharya360 Exam Smart Dashboard (ExamTrack)**.

---

## 2. Service Layer Overview

```
src/services/
├── db.ts              # Central data access service (SupabaseDBService)
├── excelParser.ts     # SheetJS workbook parser & fuzzy header matcher
├── sqlGenerator.ts    # SQL schema constants for migration viewer
└── supabaseClient.ts  # Client factory for Supabase PostgREST & Auth
```

---

## 3. Data Service Contract (`src/services/db.ts`)

Exported instance: `db` (`SupabaseDBService`).

### 3.1. Authentication & Profile Methods

#### `isLoggedIn(): Promise<boolean>`
Checks whether an active Supabase user session exists.

#### `login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }>`
Authenticates staff credentials using `supabase.auth.signInWithPassword`. On success, fetches the linked record from `public.profiles`.

#### `logout(): Promise<void>`
Terminates the active session and clears cached user metadata.

#### `getUsers(): Promise<UserProfile[]>`
Retrieves all university staff profiles from `public.profiles`.

#### `updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<{ success: boolean; user?: UserProfile; error?: string }>`
Updates personal details (full name, department, title, phone) for the specified user.

---

### 3.2. Programs Master Methods

#### `getPrograms(): Promise<Program[]>`
Returns all registered university programs ordered by `sr_no`.

#### `addOrUpdateProgram(program: Program): Promise<void>`
Performs an `upsert` on `public.programs` with timestamp stamping.

#### `deleteProgram(id: string): Promise<void>`
Deletes a program row by ID (cascades to related exam schedules).

---

### 3.3. Exam Schedules Methods

#### `getSchedules(): Promise<ExamSchedule[]>`
Fetches all timetable records from `public.exam_schedules` sorted by `exam_date`.

#### `addSchedules(newSchedules: ExamSchedule[]): Promise<ExamSchedule[]>`
Batch inserts newly parsed schedule rows into `public.exam_schedules`. Strips temporary client keys (`sched-*`) to let PostgreSQL generate standard UUIDs.

---

### 3.4. Tasks & Workflow Engine Methods

#### `getTasks(): Promise<ExamTask[]>`
Fetches all milestone task records sorted by `due_date`.

#### `updateTaskStatus(taskId: string, status: TaskStatus, notes?: string): Promise<void>`
Updates task status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `ESCALATED_TO_ALTERNATE`) and appends operational notes.

#### `escalateTask(taskId: string, reason: string): Promise<void>`
Transitions task status to `ESCALATED_TO_ALTERNATE`, records `escalated_at = NOW()`, logs `escalation_reason`, and reassigns operational responsibility to the program's designated Alternate Coordinator.

#### `generateDefaultTasksForSchedule(schedule: ExamSchedule): Promise<ExamTask[]>`
Auto-generates the standard 4-milestone pre-exam task suite for a given schedule row:
1. `Question Paper Printing & Secure Vault Packaging`
2. `Hall Seating Plan, Attendance Sheets & Roll Labels`
3. `Invigilation Duty Assignment & Verification`
4. `Answer Booklet Collection & Counterfoil Verification`

---

## 4. Excel Ingestion API (`src/services/excelParser.ts`)

Powered by SheetJS (`xlsx`). All column headers are sanitized via `normalizeKey(str: string): string` (lowercase and alphanumeric only).

### 4.1. `parseProgramMasterExcel`
```typescript
export function parseProgramMasterExcel(
  fileData: ArrayBuffer,
  existingUsers: UserProfile[]
): ParseResult<{
  program: Program;
  primaryUser?: UserProfile;
  alternateUser?: UserProfile;
}>;
```
- **Accepted Headers**: `Sr. No.`, `Program Code`, `Program Name`, `School Name`, `Primary Coordinator Email/Name`, `Alternate Coordinator Email/Name`.
- **Validation**: Enforces non-empty `Program Code` and `Program Name`. Auto-matches coordinator emails against `existingUsers`.

### 4.2. `parseExamScheduleExcel`
```typescript
export function parseExamScheduleExcel(
  fileData: ArrayBuffer,
  existingPrograms: Program[]
): ParseResult<ExamSchedule>;
```
- **Accepted Headers**: `PKGNo`, `Logic1`, `CM_School_Name`, `CM_Course_Name`, `Program Code` / `Course Code`, `Semester`, `Elective`, `PaperCode`, `SM_Subject_Name`, `Student Count`, `Regular`, `Backlog`, `Exam Day`, `Exam Date`, `Date_Odd_Even`, `AM_PM`, `Exam Time`, `Exam Type`.
- **Validation**: Requires `PaperCode`, `Subject Name`, `Exam Date`, and valid `AM_PM` session.

---

## 5. External API Integrations

### 5.1. Supabase PostgREST & Auth Client
- Initialized in `src/services/supabaseClient.ts`:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
  ```

### 5.2. Google GenAI API (`@google/genai`)
- Package: `@google/genai` (v2.4.0)
- Configured with `GEMINI_API_KEY` for AI-assisted executive timetable summaries and exam readiness audits.
