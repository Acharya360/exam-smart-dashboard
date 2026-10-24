# SSPU Examination System — Architecture Document

> **Version:** 1.0 | **Date:** 2026-10-24 | **Status:** Integration Blueprint

## 1. System Overview

The **SSPU Examination System** is a unified platform integrating two independent SSPU examination tools into a single full-stack application:

| Component | Source Project | Purpose |
|-----------|---------------|---------|
| **Exam Smart Dashboard** | `D:\Exam Smart Dashboard` | React 19 + Vite + Tailwind + Express + SQL Server / Supabase — RBAC admin dashboard for exam scheduling, task workflows, student marks, results computation, SGPA/CGPA, and timetable generation |
| **Gazette Master** | `D:\Gazzate_Master` | Vanilla HTML/CSS/JS — Client-side A3 Tabulation Register gazette engine, grade cards, analytics, student names directory, and master records governance using a 51 MB embedded dataset (`SSPU_Master_Data_Compact.js`) + `Master_File.xlsx` |

### Integrated Application Name
**SSPU Examination Portal** — `D:\SSPU_Examination`

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    SSPU EXAMINATION PORTAL                       │
├────────────────────────┬─────────────────────────────────────────┤
│   ADMIN DASHBOARD      │        GAZETTE ENGINE                  │
│   (React 19 + Vite)    │        (Vanilla JS SPA)                │
│                        │                                         │
│  ┌──────────────────┐  │  ┌───────────────────────────────────┐ │
│  │ Auth & RBAC      │  │  │ A3 Tabulation Register            │ │
│  │ Exam Scheduling  │  │  │ A4 Student Grade Cards            │ │
│  │ Task Workflow     │  │  │ Performance Analytics             │ │
│  │ Student Marks     │  │  │ Student Names Directory           │ │
│  │ Result Engine     │  │  │ Master Records & Governance       │ │
│  │ SGPA/CGPA Compute│  │  │ Excel Data Hub                    │ │
│  │ Timetable Gen    │  │  │ Embedded 140K+ Exam Records       │ │
│  │ Course Master    │  │  │                                   │ │
│  │ Faculty Alloc    │  │  │                                   │ │
│  │ Performance Rpts │  │  │                                   │ │
│  └──────┬───────────┘  │  └────────────┬──────────────────────┘ │
│         │              │               │                         │
├─────────┴──────────────┴───────────────┴─────────────────────────┤
│                    SHARED DATA LAYER                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  SQL Server (SSPU_Exam) ←→ Express API (:5000)            │  │
│  │  Supabase (PostgreSQL) — Cloud Mode                        │  │
│  │  IndexedDB + localStorage — Gazette Client Cache           │  │
│  │  Master_File.xlsx — Historical Migration Data (READ-ONLY)  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend (Admin Dashboard)
| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Bundler | Vite 8 |
| Language | TypeScript 7 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Animations | Motion (Framer Motion) |
| State | React hooks + Context API |
| Routing | Custom SPA router (`utils/routes.ts`) |
| Excel Parsing | SheetJS (xlsx 0.18.5) |

### 3.2 Frontend (Gazette Engine)
| Layer | Technology |
|-------|-----------|
| Framework | Vanilla HTML5 / CSS3 / JavaScript (ES6+) |
| Architecture | IIFE Module Pattern |
| Data Layer | In-memory array + IndexedDB + localStorage |
| Excel Library | SheetJS (xlsx.full.min.js) |
| Print Engine | CSS `@media print` + A3/A4 layouts |
| Theme | Custom CSS with Dark/Light mode |

### 3.3 Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + Express |
| Database (Local) | SQL Server (acharya360\SQLEXPRESS → SSPU_Exam) |
| Database (Cloud) | Supabase (PostgreSQL + RLS) |
| Auth | Session-based (bcrypt + cookies) |
| AI Integration | Google Gemini API (`@google/genai`) |

---

## 4. Database Architecture

### 4.1 SQL Server / Supabase Tables

| Table | Purpose | Source |
|-------|---------|--------|
| `profiles` | User accounts (COE, DYCOE, ACOE, COORDINATOR) | Dashboard |
| `programs` | Academic programs with coordinator mapping | Dashboard |
| `exam_schedules` | Master exam timetable entries | Dashboard |
| `exam_tasks` | Task workflow tracking & escalation | Dashboard |
| `student_marks` | Component-wise marks (CAT, EST, CAP, ESP, IA) | Dashboard |
| `student_results` | Computed final results per subject per student | Dashboard |
| `student_sgpa` | SGPA per student per semester | Dashboard |
| `student_cgpa` | CGPA per student cumulative | Dashboard |
| `course_master` | LTPS & marks configuration per subject | Dashboard |
| `exam_course_settings` | Course-to-program mapping + scheme | Dashboard |
| `exam_registrations` | Student exam registration records | Dashboard |
| `exam_students` | Student master (PRN, name) | Dashboard |
| `exam_processing_audit` | Processing audit trail | Dashboard |

### 4.2 Client-Side Data (Gazette Engine)

| Store | Purpose |
|-------|---------|
| `SSPU_Master_Data_Compact.js` | Embedded 140,799 exam records (51 MB JS) |
| `Master_File.xlsx` | Historical migration reference (37 MB) — **READ-ONLY** |
| `IndexedDB: SSPU_GAZETTE_DB` | Custom uploaded datasets (cross-tab persistence) |
| `localStorage: SSPU_STUDENT_NAMES` | Student PRN-to-Name mapping |
| `localStorage: SSPU_THEME` | Dark/Light theme preference |

---

## 5. Module Architecture

### 5.1 Admin Dashboard Modules

```
src/
├── App.tsx                          # Root SPA with view routing
├── context/AuthContext.tsx           # Auth provider & RBAC
├── components/
│   ├── auth/LoginScreen.tsx          # Login UI
│   ├── layout/Header.tsx             # Top navigation bar
│   ├── layout/Sidebar.tsx            # Navigation sidebar
│   ├── dashboard/
│   │   ├── CommandCenter.tsx         # Executive command palette
│   │   ├── ExamTable.tsx             # Master exam schedule grid
│   │   └── MetricsGrid.tsx           # KPI metrics cards
│   ├── admin/
│   │   ├── CourseMaster.tsx          # LTPS & marks config
│   │   ├── ExaminationWorkspace.tsx  # Marks entry & result compute
│   │   ├── StudentMarksImport.tsx    # Excel marks bulk upload
│   │   ├── ProgramsManager.tsx       # Program-coordinator mapping
│   │   ├── UserManagement.tsx        # User CRUD
│   │   ├── PasswordManagementModal.tsx
│   │   ├── TNGStudentsView.tsx       # TNG student listing
│   │   └── TRSheetView.tsx           # Tabulation Register sheet
│   ├── tasks/TasksView.tsx           # Task workflow management
│   ├── timetable/TimetableGenerator.tsx
│   ├── faculty/FacultyCourseAllocation.tsx
│   ├── reports/ExamPerformanceDashboard.tsx
│   ├── upload/ExcelUploader.tsx      # Generic Excel uploader
│   ├── schema/SqlSchemaViewer.tsx    # DB schema inspector
│   └── common/                       # Shared components
├── services/
│   ├── db.ts                         # Database mode switcher
│   ├── localDb.ts                    # In-memory local DB
│   ├── supabaseDb.ts                 # Supabase provider
│   ├── supabaseClient.ts            # Supabase connection
│   ├── resultEngine.ts              # Grade/SGPA/CGPA computation
│   ├── excelParser.ts               # Excel parsing & validation
│   └── sqlGenerator.ts              # Dynamic SQL generation
├── utils/
│   ├── routes.ts                     # SPA URL routing
│   ├── timetableEngine.ts           # Timetable algorithm
│   ├── timetableExcel.ts            # Timetable Excel export
│   └── validation/                   # Data validation pipeline
└── types/index.ts                    # TypeScript interfaces
```

### 5.2 Gazette Engine Modules

```
gazette/
├── index.html                        # Dashboard (entry point)
├── SSPU_Master_Data_Compact.js       # Embedded 140K records
├── Master_File.xlsx                  # Historical data (READ-ONLY)
├── xlsx.full.min.js                  # SheetJS library
├── css/
│   ├── common.css                    # Shared styles + dark mode
│   ├── dashboard.css                 # Dashboard page styles
│   ├── gazette.css                   # A3 tabulation register
│   ├── grade-cards.css               # A4 grade card styles
│   ├── analytics.css                 # Analytics dashboard
│   ├── data-hub.css                  # Data upload hub
│   ├── master-records.css            # Master records governance
│   └── student-names.css             # Student names directory
├── js/
│   ├── common.js                     # Theme, nav, toast, utils
│   ├── data-store.js                 # Central data engine (40KB)
│   ├── gazette.js                    # A3 matrix engine (78KB)
│   ├── grade-cards.js                # A4 grade card generator
│   ├── analytics.js                  # Analytics computation
│   ├── data-hub.js                   # Excel upload & merge
│   ├── master-records.js             # Records governance
│   └── student-names.js              # PRN directory
└── pages/
    ├── gazette.html                  # A3 Tabulation Register
    ├── grade-cards.html              # A4 Grade Cards
    ├── analytics.html                # Performance Analytics
    ├── data-hub.html                 # Excel Data Hub
    ├── master-records.html           # Master Records
    └── student-names.html            # Student Names
```

---

## 6. Integration Architecture

### 6.1 Integration Strategy: **Side-by-Side Modular Embedding**

The Gazette Engine will be embedded as a **static sub-application** within the React dashboard, accessible via dedicated routes. This preserves both codebases while providing a unified navigation experience.

```
D:\SSPU_Examination\
├── .al/                              # Documentation
├── public/
│   └── gazette/                      # Gazette Engine (static)
│       ├── index.html
│       ├── SSPU_Master_Data_Compact.js
│       ├── xlsx.full.min.js
│       ├── css/
│       ├── js/
│       └── pages/
├── server/                           # Express API modules
├── src/                              # React Dashboard
├── server.js                         # Express backend
├── schema.sql                        # Database schema
├── package.json                      # Dependencies (merged)
└── vite.config.ts                    # Vite configuration
```

### 6.2 Data Flow Between Systems

```
Master_File.xlsx (Historical)
        │
        ▼ (One-time migration)
   SQL Server / Supabase
        │
        ├──→ Express API (:5000)──→ React Dashboard
        │
        └──→ SSPU_Master_Data_Compact.js──→ Gazette Engine
```

### 6.3 Shared Entities

| Entity | Dashboard Field | Gazette Field | Dedup Strategy |
|--------|----------------|---------------|----------------|
| Programs | `programs.program_name` | `CM_Course_Name` | Match on program code |
| Subjects | `course_master.paper_code` | `PaperCode` | Match on paper_code |
| Students | `student_marks.prn` | `Roll_No` / PRN | Match on PRN |
| Departments | `programs.school_name` | `DepartmentCode` | Fuzzy match on name |
| Semesters | `exam_schedules.semester` | `Semester` | Normalize integer |
| Marks | `student_marks.*` | Subject columns in gazette rows | Assessment component mapping |

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                  PRODUCTION                          │
│                                                      │
│  ┌─────────────┐     ┌───────────────┐              │
│  │ Vite Build  │────▶│ Static Dist   │              │
│  │ (React +    │     │ (Vercel/IIS)  │              │
│  │  Gazette)   │     └───────────────┘              │
│  └─────────────┘                                     │
│                                                      │
│  ┌─────────────┐     ┌───────────────┐              │
│  │ Express API │────▶│ SQL Server /  │              │
│  │ (:5000)     │     │ Supabase      │              │
│  └─────────────┘     └───────────────┘              │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ Master_File.xlsx (Read-only archive)        │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```
