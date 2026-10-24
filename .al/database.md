# SSPU Examination System — Database Schema Document

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. Database Overview

| Property | Value |
|----------|-------|
| **Local DB** | SQL Server (acharya360\SQLEXPRESS → SSPU_Exam) |
| **Cloud DB** | Supabase (PostgreSQL with RLS) |
| **ORM** | Raw SQL via parameterized queries |
| **Migration** | `scripts/migrate.mjs` with verified backups |

---

## 2. Entity-Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  profiles    │       │    programs       │       │ exam_schedules   │
│─────────────│       │──────────────────│       │──────────────────│
│ id (PK/FK)  │──┐    │ id (PK)          │──┐    │ id (PK)          │
│ email       │  │    │ program_code (UQ)│  │    │ program_code(FK) │──→ programs
│ full_name   │  ├───▶│ primary_coord_id │  │    │ paper_code       │
│ role        │  │    │ alternate_coord_id│  │    │ semester         │
│ department  │  │    │ school_name      │  │    │ exam_date        │
│ phone       │  │    │ program_name     │  │    │ am_pm            │
│ title       │  │    └──────────────────┘  │    │ student_count    │
│ created_at  │  │                          │    │ exam_type        │
└─────────────┘  │                          │    └──────┬───────────┘
                 │                          │           │
                 │    ┌──────────────────┐  │    ┌──────┴───────────┐
                 │    │   exam_tasks     │  │    │                  │
                 │    │──────────────────│  │    │                  │
                 │    │ id (PK)          │  │    │                  │
                 ├───▶│ assigned_to (FK) │  │    │                  │
                 ├───▶│ alternate_user_id│  │    │                  │
                 │    │ schedule_id (FK) │──┘    │                  │
                 │    │ program_code     │       │                  │
                 │    │ status           │       │                  │
                 │    │ task_title       │       │                  │
                 │    │ due_date         │       │                  │
                 │    └──────────────────┘       │                  │
                 │                               │                  │
┌────────────────┴───────────────────────────────┴──────────────────┐
│                                                                    │
│  ┌──────────────────┐    ┌──────────────────┐                     │
│  │  course_master    │    │  student_marks    │                     │
│  │──────────────────│    │──────────────────│                     │
│  │ id (PK)          │    │ id (PK)          │                     │
│  │ cm_course_name   │    │ prn              │                     │
│  │ semester         │    │ student_name     │                     │
│  │ paper_code       │    │ cm_course_name   │                     │
│  │ sm_subject_name  │    │ semester         │                     │
│  │ l, t, p, s       │    │ paper_code       │                     │
│  │ total_credits    │    │ assessment_type  │                     │
│  │ cat/cap/cas/est  │    │ theory           │                     │
│  │   _max/_min      │    │ practical        │                     │
│  │ grading_category │    │ skills           │                     │
│  └──────────────────┘    │ uploaded_by (FK) │──→ profiles         │
│                          └──────────────────┘                     │
│                                                                    │
│  ┌──────────────────┐    ┌──────────────────┐                     │
│  │ student_results   │    │  student_sgpa    │                     │
│  │──────────────────│    │──────────────────│                     │
│  │ id (PK)          │    │ id (PK)          │                     │
│  │ prn              │    │ prn              │                     │
│  │ cm_course_name   │    │ cm_course_name   │                     │
│  │ semester         │    │ semester         │                     │
│  │ paper_code       │    │ academic_year    │                     │
│  │ total_marks_*    │    │ total_credits    │                     │
│  │ grade            │    │ sgpa             │                     │
│  │ grade_point      │    │ result_status    │                     │
│  │ credits          │    └──────────────────┘                     │
│  │ result_status    │                                              │
│  └──────────────────┘    ┌──────────────────┐                     │
│                          │  student_cgpa    │                     │
│                          │──────────────────│                     │
│                          │ id (PK)          │                     │
│                          │ prn              │                     │
│                          │ cm_course_name   │                     │
│                          │ cgpa             │                     │
│                          │ semesters_done   │                     │
│                          └──────────────────┘                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Table Definitions

### 3.1 profiles
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK→auth.users | User identifier |
| email | TEXT | UNIQUE, NOT NULL | Login email |
| full_name | TEXT | NOT NULL | Display name |
| role | user_role_enum | NOT NULL, DEFAULT 'COORDINATOR' | COE/DYCOE/ACOE/COORDINATOR |
| department | TEXT | | Department name |
| phone | TEXT | | Contact number |
| title | TEXT | | Job title |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### 3.2 programs
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| sr_no | INTEGER | | Serial number |
| program_code | TEXT | UNIQUE, NOT NULL | e.g., "BBA", "MBA" |
| program_name | TEXT | NOT NULL | Full program name |
| school_name | TEXT | NOT NULL | School/department |
| primary_coordinator_id | UUID | FK→profiles | Primary coordinator |
| alternate_coordinator_id | UUID | FK→profiles | Backup coordinator |

### 3.3 exam_schedules
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| pkg_no | INTEGER | NOT NULL | Package number |
| logic1 | TEXT | | Logic field |
| cm_school_name | TEXT | NOT NULL | School name |
| cm_course_name | TEXT | NOT NULL | Course/programme name |
| program_code | TEXT | FK→programs | Programme code |
| semester | INTEGER | NOT NULL | Semester number |
| elective | TEXT | | Elective group |
| paper_code | TEXT | NOT NULL | Subject paper code |
| sm_subject_name | TEXT | NOT NULL | Subject name |
| student_count | INTEGER | DEFAULT 0 | Total students |
| regular_count | INTEGER | DEFAULT 0 | Regular exam students |
| backlog_count | INTEGER | DEFAULT 0 | Backlog students |
| exam_day | INTEGER | DEFAULT 1 | Exam day number |
| exam_date | DATE | NOT NULL | Examination date |
| am_pm | exam_session_enum | DEFAULT 'AM' | Morning/Afternoon |
| exam_time | TEXT | NOT NULL | Time slot |
| exam_type | exam_type_enum | DEFAULT 'Regular' | Regular/Backlog/Both |
| exam_year | TEXT | | Exam year string |

### 3.4 exam_tasks
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| schedule_id | UUID | FK→exam_schedules, NOT NULL | Related schedule |
| program_code | TEXT | NOT NULL | Programme code |
| task_title | TEXT | NOT NULL | Task description |
| status | task_status_enum | DEFAULT 'PENDING' | PENDING/IN_PROGRESS/COMPLETED/ESCALATED |
| assigned_to | UUID | FK→profiles | Primary assignee |
| alternate_user_id | UUID | FK→profiles | Escalation target |
| notes | TEXT | | Additional notes |
| due_date | DATE | | Deadline |
| escalated_at | TIMESTAMPTZ | | Escalation timestamp |
| escalation_reason | TEXT | | Reason for escalation |

### 3.5 student_marks
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| prn | TEXT | NOT NULL | Student PRN |
| student_name | TEXT | NOT NULL | Student name |
| cm_course_name | TEXT | NOT NULL | Programme name |
| semester | TEXT | NOT NULL | Semester |
| paper_code | TEXT | NOT NULL | Subject code |
| sm_subject_name | TEXT | NOT NULL | Subject name |
| academic_year | TEXT | NOT NULL | e.g., "2024-2025" |
| exam_year | TEXT | NOT NULL | e.g., "NOVEMBER 2024" |
| assessment_type | TEXT | NOT NULL | CAT/EST/CAP/ESP/IA/EXTERNAL |
| theory | DECIMAL(5,2) | DEFAULT 0 | Theory marks |
| practical | DECIMAL(5,2) | DEFAULT 0 | Practical marks |
| skills | DECIMAL(5,2) | DEFAULT 0 | Skills marks |
| uploaded_by | UUID | FK→profiles | Upload user |

### 3.6 student_results
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Auto-generated |
| prn | TEXT | NOT NULL | Student PRN |
| total_marks_obtained | DECIMAL(6,2) | DEFAULT 0 | Total obtained |
| total_marks_max | DECIMAL(6,2) | DEFAULT 0 | Maximum possible |
| percentage | DECIMAL(5,2) | DEFAULT 0 | Percentage |
| grade | TEXT | | O/A+/A/B+/B/C/P/F |
| grade_point | DECIMAL(3,2) | DEFAULT 0 | Grade point (0-10) |
| credits | INTEGER | DEFAULT 0 | Credits for subject |
| result_status | TEXT | DEFAULT 'PENDING' | PASS/FAIL/ABSENT/WITHHELD |

**Unique constraint:** `(prn, cm_course_name, semester, paper_code, academic_year, exam_year)`

### 3.7 student_sgpa / student_cgpa
Similar structure for semester and cumulative GPA computation.

---

## 4. Gazette Client-Side Data Schema

### 4.1 SSPU_Master_Data_Compact.js — Column Map (56 Columns)

| # | Canonical Key | Description | Example |
|---|--------------|-------------|---------|
| 1 | AcademicPeriod | Academic year | "2024-2025" |
| 2 | Term | Term I / Term II | "Term I" |
| 3 | DepartmentCode | School/Dept code | "SOE" |
| 4 | CM_Course_Name | Programme name | "B.Tech CSE" |
| 5 | Semester | Semester number | 3 |
| 6 | Roll_No / PRN | Student identifier | "PRN2024001" |
| 7-N | Subject columns | Per-subject: CA_Th, CA_Pr, IA, ESE_Th, ESE_Pr, Total, Credits, Grade | Varies |
| ... | ExamYear | Exam period | "NOVEMBER 2024" |
| ... | ExamType | Regular/Backlog | "REGULAR" |
| ... | GrandTotal | Sum of all subject totals | 450 |
| ... | SGPA | Semester GPA | 8.5 |
| ... | CreditsEarned | Total credits earned | 24 |

### 4.2 IndexedDB Schema

```
Database: SSPU_GAZETTE_DB (version 2)
└── Object Store: custom_dataset
    ├── Key: auto-increment
    └── Value: { rows: [...], headers: [...], datasetInfo: {...} }
```

### 4.3 localStorage Keys

| Key | Purpose | Size |
|-----|---------|------|
| `SSPU_STUDENT_NAMES` | JSON map of PRN → student name | ~50KB |
| `SSPU_THEME` | "light" or "dark" | 5 bytes |
| `SSPU_CUSTOM_DATASET_BACKUP` | Fallback if IndexedDB fails | Up to 5MB |
| `SSPU_LAST_DATA_UPDATE` | Cross-tab update notification | timestamp |
| `SSPU_SIDEBAR_OPEN` | Sidebar state persistence | 1 byte |

---

## 5. Enum Types

```sql
CREATE TYPE user_role_enum AS ENUM ('COE', 'DYCOE', 'ACOE', 'COORDINATOR');
CREATE TYPE exam_session_enum AS ENUM ('AM', 'PM');
CREATE TYPE exam_type_enum AS ENUM ('Regular', 'Backlog', 'Both');
CREATE TYPE task_status_enum AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED_TO_ALTERNATE');
```

---

## 6. Grading Scale

| Grade | Grade Point | Percentage Range |
|-------|------------|-----------------|
| O (Outstanding) | 10 | ≥ 80% |
| A+ | 9 | 70–79% |
| A | 8 | 60–69% |
| B+ | 7 | 55–59% |
| B | 6 | 50–54% |
| C | 5 | 45–49% |
| P (Pass) | 4 | 40–44% |
| F (Fail) | 0 | < 40% |

**Architecture programs** use a different grading scale (handled by `grading_category` field).
