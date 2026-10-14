# Acharya360 Exam Smart Dashboard (ExamTrack)
## Project Architecture, Modules, & User Roles

This document provides a comprehensive breakdown of the users, access controls, system modules, and backend infrastructure for the **ExamTrack** ERP dashboard.

---

## 1. User Roles & Access Control (RBAC)

The system enforces a strict 4-tier Role-Based Access Control (RBAC) mechanism governed by Supabase Row-Level Security (RLS) policies.

### 🛡️ Super Admins (`COE`, `DYCOE`, `ACOE`)
Super Admins have unrestricted, global access to all modules and configurations across the university.
* **Capabilities:**
  * Import and bulk delete Master Exam Schedules via Excel.
  * Manage the Faculty Coordinator Directory (create programs, assign users).
  * Access the User Management console to invite staff and change roles.
  * Access system-wide AI Settings and automation configurations.
  * View and track tasks across *all* academic programs.

### 👥 Coordinators (`COORDINATOR`)
Faculty Coordinators have scoped access restricted strictly to their assigned academic programs.
* **Capabilities:**
  * View Exam Schedules only for programs where they are assigned as the Primary or Alternate Coordinator.
  * Manage and update the status of Exam Tasks specifically assigned to them.
  * Escalate tasks to their Alternate Coordinator if contingencies arise.
  * **Cannot:** Import Excel files, manage users, alter global settings, or view cross-departmental data.

---

## 2. Technology Stack

### Frontend (Client-Side)
* **Framework:** React 19 with Vite & TypeScript
* **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
* **Icons & Animation:** Lucide React, Motion (Framer Motion), Canvas Confetti
* **Data Processing:** SheetJS (`xlsx`) for parsing complex University Master Excel files locally.

### Backend & Database (Server-Side)
* **BaaS / Database:** Supabase PostgreSQL
* **Authentication:** Supabase Auth (Email & Password)
* **Security:** Row-Level Security (RLS) policies enforced directly at the Postgres database level (`schema.sql`).
* **Service Layer:** Centralized in `src/services/db.ts` to manage all Supabase API interactions securely.

### AI Integration
* **Provider:** Google GenAI SDK (`@google/genai`)
* **Usage:** Intelligent examination assistant features, automated scheduling insights, and intelligent task generation.

---

## 3. Core Modules (Frontend Features)

### 📊 1. Master Exam Schedule Module
* **Path:** `src/components/dashboard/ExamTable.tsx`
* **Features:** 
  * Displays the comprehensive master schedule (Paper codes, Subjects, Student counts, Session timings).
  * **Super Admin Only:** Bulk Excel Import (`excelParser.ts`), row-level deletions, and bulk deletions.
  * Filter criteria by search keyword, odd/even dates, and faculty.

### ✅ 2. Task & Workflow Tracking Module
* **Path:** `src/components/tasks/TasksView.tsx`
* **Features:**
  * Tracks operational readiness through a strict 4-Phase milestone system:
    1. *Question Paper Printing & Secure Vault Packaging*
    2. *Hall Seating Plan, Attendance Sheets & Roll Labels*
    3. *Invigilation Duty Assignment & Verification*
    4. *Answer Booklet Collection & Counterfoil Verification*
  * Status tracking (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `ESCALATED_TO_ALTERNATE`).

### 🏫 3. Academic Program & Faculty Directory
* **Path:** `src/components/admin/ProgramsManager.tsx`
* **Features:**
  * Directory mapping university programs (e.g., BTECH-CSE) to specific faculty members.
  * Assigns Primary and Alternate Coordinators to ensure fallback contingencies.
  * Handled via `addOrUpdateProgram` with explicit support for "Unassigned" (`null`) states.

### 🔐 4. User Management Module
* **Path:** `src/components/admin/UserManagement.tsx`
* **Features:**
  * Super Admin console for inviting new faculty and staff.
  * Password generation and role assignment (Promote/Demote).

---

## 4. Database Architecture (PostgreSQL)

The relational data model is defined in `schema.sql`.

* **`profiles`**: Stores authenticated user data, full names, roles, and departments.
* **`programs`**: Maps unique `program_code`s (e.g., BTECH-CSE) to a `primary_coordinator_id` and `alternate_coordinator_id` (Foreign Keys referencing `profiles`).
* **`exam_schedules`**: Stores individual paper schedules. Linked to `programs` via `program_code`.
* **`exam_tasks`**: Stores auto-generated operational tasks linked directly to an `exam_schedule`. Tracks status, assigned users, and escalation notes.

*(All tables leverage Postgres triggers to auto-update `updated_at` timestamps and strictly enforce Row-Level Security policies to prevent data leakage between coordinators).*
