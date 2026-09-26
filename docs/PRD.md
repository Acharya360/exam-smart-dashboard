# Product Requirements Document (PRD)

## 1. Product Overview
- **Product Name**: Acharya360 Exam Smart Dashboard (ExamTrack)
- **Module**: University ERP — Examination Department Operations & Workflow Tracking
- **Vision**: Provide a secure, unified, real-time command center for university examination departments to coordinate timetable scheduling, automate exam readiness task suites, manage staff assignments, and handle multi-tier escalations.

---

## 2. Problem Statement
Managing university examinations involves thousands of students across dozens of schools, programs, and course subjects. Traditional methods—relying on disconnected spreadsheets, paper checklists, and ad-hoc communication—frequently result in:
- Delayed question paper printing and secure vault storage.
- Disorganized hall seating plans and missing attendance sheets.
- Unfilled invigilation duties without timely escalation.
- Lack of centralized visibility for the Controller of Examinations (COE) into which programs are at risk of missing deadlines.

---

## 3. Goals & Outcomes
- **Centralized Timetable Operations**: Provide instant multi-field querying across university schools, programs, semesters, exam dates, and student volumes.
- **Automated Task Governance**: Eliminate manual checklist generation by automatically creating the standard 4-phase examination task suite for every committed schedule.
- **Fail-Safe Escalation**: Enable primary coordinators to escalate blocked or overdue tasks directly to designated alternate coordinators with documented justification.
- **Enterprise RBAC**: Enforce strict separation of duties between University Super Admins (COE, DYCOE, ACOE) and Departmental Exam Coordinators.
- **Frictionless Data Ingestion**: Allow Super Admins to upload existing university timetable spreadsheets and program mappings with resilient column matching and validation.

---

## 4. Target Users & Personas

| Role | Title in System | Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | `COE` (Controller of Examinations) | Full university-wide oversight, timetable signoff, final escalation arbiter. |
| **Super Admin** | `DYCOE` (Deputy Controller of Examinations) | Operational oversight, staff password administration, Excel data ingestion. |
| **Super Admin** | `ACOE` (Assistant Controller of Examinations) | Daily monitoring of timetable execution, coordinator mappings, schema audits. |
| **Coordinator** | `COORDINATOR` (Program / Exam Coordinator) | Responsible for assigned academic programs. Updates preparation tasks or escalates to alternate coordinators. |

---

## 5. Core Features

### 5.1. Master Exam Timetable
- **Search & Multi-Filter**: Query by keyword, school name, program code, course name, paper code, subject name, semester, session (`AM`/`PM`), exam type (`Regular`/`Backlog`/`Both`), date range, and student count thresholds.
- **Program Association**: Each schedule links directly to a registered academic program in the Programs Master.
- **Task Suite Jump**: One-click jump from any scheduled exam directly into its associated workflow tasks.

### 5.2. Automated 4-Phase Exam Task Lifecycle
Whenever an exam schedule is added or processed with auto-generation, the system automatically spawns four critical pre-exam milestones:
1. `Question Paper Printing & Secure Vault Packaging`
2. `Hall Seating Plan, Attendance Sheets & Roll Labels`
3. `Invigilation Duty Assignment & Verification`
4. `Answer Booklet Collection & Counterfoil Verification`

### 5.3. Task Management & Escalation Engine
- **Task States**: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `ESCALATED_TO_ALTERNATE`.
- **Workflow Action**: Coordinators can mark progress, append operational notes, or trigger an escalation.
- **Escalation Protocol**: Requires explicit rationale, stamps `escalated_at` timestamp, changes status to `ESCALATED_TO_ALTERNATE`, and transfers responsibility to the program's designated Alternate Coordinator.
- **Due Date Filters**: Quick filters for `ALL`, `OVERDUE`, `TODAY`, `NEXT_48H`, and `THIS_WEEK`.

### 5.4. Excel Ingestion Engine (SheetJS)
- **Master Timetable Ingestion**: Parses `.xlsx` / `.xls` files matching university examination formats (`PKGNo`, `Logic1`, `CM_School_Name`, `CM_Course_Name`, `PaperCode`, `SM_Subject_Name`, `Student Count`, `Regular`, `Backlog`, `Exam Date`, `AM_PM`, `Exam Time`, `Exam Type`).
- **Program Mapping Ingestion**: Parses program codes, program names, school names, and maps primary/alternate coordinator emails.
- **Resilient Header Normalization**: Case-insensitive and whitespace-tolerant key matching to handle diverse spreadsheet templates.
- **Access Gate**: Restricted exclusively to Super Admins (`COE`, `DYCOE`, `ACOE`).

### 5.5. Programs Master & Coordinator Directory
- View and manage university academic programs.
- Assign primary coordinator and alternate coordinator to each program.
- Full CRUD operations with instant cascade checks.

### 5.6. Role-Aware Executive Metrics Grid
Real-time KPI metric tiles that adapt dynamically:
- **Total Exams**: University total for Super Admins; assigned program total for Coordinators.
- **Total Students Scheduled**: Aggregated volume of examinees.
- **Active Preparation Tasks**: Sum of `PENDING` and `IN_PROGRESS` tasks.
- **Completed Tasks**: Progress bar and completion percentages.
- **Critical Alerts**: Counter for escalated and overdue tasks requiring urgent intervention.

### 5.7. Governance & Profile Management
- Super Admin Staff Password Governance modal (for administrative credential updates).
- Personal Profile Settings modal (name, title, department, contact information).
- SQL and Supabase Row-Level Security (RLS) schema inspection panel.

---

## 6. Key User Journeys

### Journey 1: Super Admin Timetable Release & Task Initialization
1. Super Admin logs in via authentication screen.
2. Navigates to **Upload Excel**.
3. Selects the university exam timetable workbook.
4. System validates headers, parses rows, and displays a preview summary (valid rows vs error rows).
5. Super Admin checks "Auto-generate 4-phase task suites" and confirms commit.
6. The timetable and hundreds of automated tasks are committed to the database.

### Journey 2: Department Coordinator Daily Exam Execution
1. Coordinator logs in and is greeted with their personalized dashboard banner showing assigned programs.
2. Metrics grid indicates 2 tasks due `TODAY` and 1 `OVERDUE`.
3. Coordinator navigates to **Tasks & Workflow**, selects `TODAY` filter.
4. For "Hall Seating Plan, Attendance Sheets & Roll Labels", marks status as `COMPLETED` with notes.
5. For "Question Paper Printing & Secure Vault Packaging", coordinator discovers the printer is down; clicks **Escalate**, enters reason ("High-speed risograph mechanical error; requires COE secondary vault dispatch"), and confirms.
6. Task is routed to the Alternate Coordinator and flagged in the COE escalation alert badge.

---

## 7. Non-Functional & Platform Requirements
- **Security**: Strict Row-Level Security (RLS) policies in PostgreSQL; role verification on every data read and mutation.
- **Performance**: Instantaneous filtering and client-side pagination on datasets up to 10,000+ schedule rows.
- **Responsiveness**: Full desktop command center layout; mobile-friendly responsive sidebar drawer and touch-friendly controls.
- **Data Integrity**: Foreign key constraints between schedules, tasks, programs, and coordinator profiles.

---

## 8. Success Metrics
- **0% Unassigned Exams**: Every scheduled exam paper has tracked preparation tasks and assigned coordinators.
- **Zero Escalation Blindspots**: Real-time visibility into all unresolved escalated tasks across university departments.
- **Rapid Timetable Ingestion**: Ingesting a semester timetable containing 1,000+ paper schedules in under 15 seconds.

---

## 9. Out of Scope (Current Release)
- Student-facing portal for hall ticket downloading (handled by Acharya360 Student Portal).
- Online fee payment gateway integration.
- Examination marks entry and grade point evaluation (handled by Acharya360 Grading Module).
