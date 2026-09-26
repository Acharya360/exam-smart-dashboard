# Security Guidelines (SECURITY.md)

## 1. Purpose
This document defines the security rules, access boundaries, authentication mechanisms, and data protection practices for **Acharya360 Exam Smart Dashboard (ExamTrack)**. All developers and AI coding agents must strictly comply with these directives.

---

## 2. Role-Based Access Control (RBAC) Matrix

The system enforces a 4-tier role hierarchy divided into **Super Administrators** and **Departmental Coordinators**:

| Feature / Resource | `COE` | `DYCOE` | `ACOE` | `COORDINATOR` |
| :--- | :---: | :---: | :---: | :---: |
| **View University-Wide Schedules** | ✅ | ✅ | ✅ | ❌ *(Assigned programs only)* |
| **View University-Wide Tasks** | ✅ | ✅ | ✅ | ❌ *(Assigned programs only)* |
| **Upload Excel Timetables & Mappings** | ✅ | ✅ | ✅ | ❌ *(Access Denied screen)* |
| **Manage Programs Master (CRUD)** | ✅ | ✅ | ✅ | ❌ *(Read-only)* |
| **Staff Password Governance** | ✅ | ✅ | ✅ | ❌ *(Self password only)* |
| **Update Assigned Task Status** | ✅ | ✅ | ✅ | ✅ |
| **Escalate Task to Alternate** | ✅ | ✅ | ✅ | ✅ |
| **View SQL & RLS Schema** | ✅ | ✅ | ✅ | ✅ *(Inspection mode)* |

---

## 3. Database Row-Level Security (RLS)

All PostgreSQL tables in Supabase have Row-Level Security enabled. Security policies rely on `auth.uid()` and subqueries against `public.profiles`:

### 3.1. `public.profiles`
- **Read**: Authenticated users can view profiles to populate coordinator names and staff selectors.
- **Write**: Users can update ONLY their own profile row:
  ```sql
  CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
  ```

### 3.2. `public.programs`
- **Read**: All authenticated users can view program mappings.
- **Write**: Insert, update, and delete are restricted to Super Admins:
  ```sql
  CREATE POLICY "Super Admins can manage programs"
  ON public.programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('COE', 'DYCOE', 'ACOE')
    )
  );
  ```

### 3.3. `public.exam_schedules`
- **Read**: Super Admins can view all schedules. Coordinators can only select schedules where their user ID is registered as the program's primary or alternate coordinator.
- **Write**: Insert, update, and delete are restricted strictly to Super Admins.

### 3.4. `public.exam_tasks`
- **Read**: Super Admins view all university tasks. Coordinators view tasks assigned to them (`assigned_to = auth.uid()` or `alternate_user_id = auth.uid()`) or linked to their assigned programs.
- **Update**: Coordinators can update task progress, notes, and trigger escalations for their assigned tasks.

---

## 4. Secrets & Environment Variables

- **`.env`**: Must **NEVER** be committed to version control.
- **`.env.example`**: Serves as the canonical public template showing required keys without values:
  ```bash
  # Supabase public configuration (safe for browser client)
  VITE_SUPABASE_URL="https://your-project-id.supabase.co"
  VITE_SUPABASE_ANON_KEY="your-anon-key"

  # Server-only keys (never expose to Vite client bundle)
  GEMINI_API_KEY="MY_GEMINI_API_KEY"
  APP_URL="MY_APP_URL"
  ```
- **Client Bundle Safety**: Only variables prefixed with `VITE_` are bundled by Vite. Never prefix private API keys (e.g. Supabase Service Role Key) with `VITE_`.

---

## 5. Staff Password Governance & Administrative Actions

- **Client-Side Limitation**: In Supabase, resetting another user's credentials securely requires the Supabase Admin Auth API (`auth.admin.updateUserById`), which cannot be run using the client anon key.
- **Enforced Protocol**: Administrative password resets must be executed through a Supabase Edge Function with service-role privileges or via university directory SSO.
- **Self-Service**: Users may update their own profiles and submit credentials through standard authenticated flows.

---

## 6. Input Validation & Excel Sanitization

- **Spreadsheet Ingestion**:
  - The SheetJS parser in `src/services/excelParser.ts` normalizes all headers (`normalizeKey`) to prevent object injection.
  - Rows missing required identifiers (`Program Code`, `Program Name`, `PKGNo`, `PaperCode`) are rejected with explicit row-level error reporting.
  - Malformed dates or numeric fields are sanitized before database insertion.

---

## 7. AI Agent Security Constraints

The AI coding agent must strictly adhere to the following rules:
1. **Never Disable RBAC**: Do not remove `isSuperAdmin` checks from `ExcelUploader`, `ProgramsManager`, or `PasswordManagementModal`.
2. **Never Weaken RLS Policies**: Do not replace granular RLS policies with permissive `USING (true)` rules in `schema.sql`.
3. **Never Hardcode Credentials**: Never write mock passwords or live tokens into source files.
4. **Never Expose Internal Traces**: Keep database error messages sanitized in production UI toasts.
