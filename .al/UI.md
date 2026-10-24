# SSPU Examination System — UI/UX Document

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. Design System Overview

The integrated system uses **two design languages** that coexist without conflict:

| Component | Dashboard (React) | Gazette Engine |
|-----------|-------------------|----------------|
| **Framework** | Tailwind CSS v4 | Custom CSS |
| **Typography** | System font stack | System font stack |
| **Color Scheme** | Tailwind utilities | CSS custom properties |
| **Dark Mode** | Tailwind `dark:` prefix | `.dark-mode` class |
| **Icons** | Lucide React | Emoji icons (📊🪪📂👥📈🏛️) |
| **Animations** | Motion (Framer Motion) | CSS transitions + keyframes |
| **Layout** | Flexbox/Grid via Tailwind | Custom CSS Grid/Flexbox |
| **Print** | Not primary focus | A3/A4 print-optimized |

---

## 2. Page Inventory

### 2.1 Admin Dashboard Pages

| View | Path | Component | Description |
|------|------|-----------|-------------|
| Dashboard | `/` | `CommandCenter` + `ExamTable` + `MetricsGrid` | Executive overview with KPIs |
| Exam Timetable | `/timetable` | `ExamTable` | Master exam schedule grid |
| Timetable Generator | `/timetable-generator` | `TimetableGenerator` | Auto-generate timetables |
| Tasks | `/tasks` | `TasksView` | Workflow management |
| Programs | `/programs` | `ProgramsManager` | Program-coordinator mapping |
| Course Master | `/course-master` | `CourseMasterUI` | LTPS & marks config |
| Students | `/students` | `StudentMarksImport` | Student marks upload |
| Assessment | `/assessment` | `ExaminationWorkspace` | Marks entry & result compute |
| Student Marks | `/student-marks` | `StudentMarksImport` | Bulk marks import |
| Results | `/results` | `ExaminationWorkspace` | Result computation |
| TNG | `/tng` | `TNGStudentsView` | TNG student listing |
| TR Sheet | `/tr-sheet` | `TRSheetView` | Tabulation Register sheet |
| SGPA | `/sgpa` | `ExaminationWorkspace` | SGPA computation |
| Users | `/users` | `UserManagement` | User CRUD |
| Schema | `/schema` | `SqlSchemaViewer` | Database schema inspector |
| Faculty | `/faculty-allocation` | `FacultyCourseAllocation` | Faculty-course mapping |
| Reports | `/performance-reports` | `ExamPerformanceDashboard` | Performance analytics |

### 2.2 Gazette Engine Pages

| Page | Path | File | Description |
|------|------|------|-------------|
| Gazette Dashboard | `/gazette/` | `index.html` | Quick launcher & system overview |
| Result Gazette | `/gazette/pages/gazette.html` | `gazette.html` | A3 Tabulation Register (print) |
| Grade Cards | `/gazette/pages/grade-cards.html` | `grade-cards.html` | A4 Student Grade Cards (print) |
| Analytics | `/gazette/pages/analytics.html` | `analytics.html` | Performance analytics dashboard |
| Data Hub | `/gazette/pages/data-hub.html` | `data-hub.html` | Excel upload & dataset management |
| Student Names | `/gazette/pages/student-names.html` | `student-names.html` | PRN-to-Name directory |
| Master Records | `/gazette/pages/master-records.html` | `master-records.html` | Records governance & audit |

---

## 3. Dashboard Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header (app-navbar)                                      │
│ ┌──────┬────────────────────────────────────┬──────────┐ │
│ │ ☰    │ SSPU • Exam Track                  │ 🌓 Theme │ │
│ │ Menu │                                    │ Profile  │ │
│ └──────┴────────────────────────────────────┴──────────┘ │
├────────┬────────────────────────────────────────────────┤ │
│Sidebar │ Main Content Area                              │ │
│        │                                                │ │
│ 📊 Dash│ ┌──────────────────────────────────────────┐   │ │
│ 📅 Time│ │ Command Center / Metrics Grid            │   │ │
│ ✅ Task│ │                                          │   │ │
│ 🏫 Prog│ └──────────────────────────────────────────┘   │ │
│ 📚 Cour│                                                │ │
│ 👥 Stud│ ┌──────────────────────────────────────────┐   │ │
│ 📝 Asse│ │ Data Table / Form / Workspace            │   │ │
│ 🗂️ Mark│ │                                          │   │ │
│ ─────  │ │                                          │   │ │
│ GAZETTE│ └──────────────────────────────────────────┘   │ │
│ 📊 Regi│                                                │ │
│ 🪪 Card│                                                │ │
│ 📈 Anal│                                                │ │
│ 📂 Data│                                                │ │
│ 👥 Name│                                                │ │
│ 🏛️ Mast│                                                │ │
├────────┴────────────────────────────────────────────────┤ │
│ Footer                                                   │ │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Gazette Layout Structure

### 4.1 Dashboard Page
```
┌─────────────────────────────────────────────────────────┐
│ Navigation Bar (common.js renderNavbar)                   │
│ ┌──────┬──────────────────────────────┬────────────────┐ │
│ │ ☰    │ SSPU • Result Gazette System │ Records │ 🌓  │ │
│ └──────┴──────────────────────────────┴────────────────┘ │
├─────────────────────────────────────────────────────────┤ │
│ Hero Banner                                              │ │
│ "Master Examination & Result Gazette System"             │ │
│ [Launch Gazette] [Data Hub] [Master Records]            │ │
├─────────────────────────────────────────────────────────┤ │
│ KPI Metrics Strip                                        │ │
│ ┌──────────┬───────────┬───────────┬──────────────────┐ │ │
│ │ 140,799  │ 26        │ 78.6%     │ 4,259            │ │ │
│ │ Records  │ Programmes│ Pass Rate │ Candidate PRNs   │ │ │
│ └──────────┴───────────┴───────────┴──────────────────┘ │ │
├─────────────────────────────────────────────────────────┤ │
│ Quick Cohort Launcher                                    │ │
│ [Period] [Department] [Programme] [Semester] [Type]      │ │
│ [Generate Gazette] [Generate Cards] [View Analytics]     │ │
├─────────────────────────────────────────────────────────┤ │
│ Module Cards Grid (6 modules)                            │ │
│ ┌─────────┬─────────┬─────────┐                         │ │
│ │ Gazette │ Grade   │ Data    │                         │ │
│ │ (A3)    │ Cards   │ Hub     │                         │ │
│ ├─────────┼─────────┼─────────┤                         │ │
│ │ Student │Analytics│ Master  │                         │ │
│ │ Names   │         │ Records │                         │ │
│ └─────────┴─────────┴─────────┘                         │ │
└─────────────────────────────────────────────────────────┘
```

### 4.2 A3 Tabulation Register (Print Layout)
```
┌──────────────────────────────────────────────────────────────────────────┐
│                    A3 LANDSCAPE (420mm × 297mm)                          │
│                                                                          │
│ SSPU Logo │ Symbiosis Skills & Professional University, Pune             │
│           │ Result Gazette — Tabulation Register                         │
│           │ Programme: BBA | Semester: 3 | Exam: November 2024           │
│                                                                          │
│ ┌────┬──────┬──────┬──────────────────┬──────────────────┬────┬────┬───┐ │
│ │ Sr │ Roll │ Name │ Subject 1        │ Subject 2        │Tot │SGPA│Grd│ │
│ │    │  No  │      ├───┬───┬───┬──────┼───┬───┬───┬──────┤    │    │   │ │
│ │    │      │      │CA │IA │ESE│Total │CA │IA │ESE│Total │    │    │   │ │
│ ├────┼──────┼──────┼───┼───┼───┼──────┼───┼───┼───┼──────┼────┼────┼───┤ │
│ │ 1  │PRN001│ Name │ 25│ 18│ 45│   88 │ 22│ 16│ 40│   78 │166 │8.3 │ A │ │
│ │ 2  │PRN002│ Name │ 20│ 15│ 38│   73 │ 18│ 14│ 35│   67 │140 │7.0 │B+ │ │
│ │ ...│ ...  │ ...  │...│...│...│  ... │...│...│...│  ... │... │... │...│ │
│ │ 25 │PRN025│ Name │ 28│ 20│ 48│   96 │ 25│ 19│ 42│   86 │182 │9.1 │A+ │ │
│ └────┴──────┴──────┴───┴───┴───┴──────┴───┴───┴───┴──────┴────┴────┴───┘ │
│                                                                          │
│ Tabulator: ________  COE: ________  Vice Chancellor: ________            │
│                                       Page 1 of 3                        │
└──────────────────────────────────────────────────────────────────────────┘

Row height: Locked 26px uniform
Total marks column: 28px clipped
```

---

## 5. Component Design Patterns

### 5.1 Dashboard Components

| Pattern | Usage |
|---------|-------|
| `DataTable` | Reusable sortable/filterable table |
| `DetailDrawer` | Slide-out panel for record details |
| `AdvancedExamFilter` | Multi-field filter bar |
| `AdvancedTaskFilter` | Task-specific filter |
| `ImportPreviewDashboard` | Pre-import data preview |
| `WorkflowPipelineBar` | Visual task pipeline status |
| `MetricsGrid` | KPI card grid |
| `CommandCenter` | Quick action palette |

### 5.2 Gazette Components

| Component | File | Purpose |
|-----------|------|---------|
| `commonUI` | `common.js` | Theme, navbar, sidebar, toast, navigation |
| `dataStore` | `data-store.js` | Data engine, caching, indexing |
| `gazetteEngine` | `gazette.js` | A3 tabulation register renderer |
| `gradeCards` | `grade-cards.js` | A4 grade card generator |
| `analyticsModule` | `analytics.js` | Performance analytics |
| `dataHub` | `data-hub.js` | Excel upload & merge |
| `masterRecords` | `master-records.js` | Records governance |
| `studentNames` | `student-names.js` | PRN directory |

---

## 6. Responsive Design

### Dashboard
- Mobile-first with Tailwind breakpoints
- Sidebar collapses to hamburger menu on mobile
- Tables become scrollable on small screens
- MetricsGrid stacks vertically

### Gazette Engine
- Desktop-primary (print-focused)
- Sidebar navigation drawer for mobile
- Floating back button + scroll-to-top
- A3/A4 print layouts are fixed-size

---

## 7. Theme System

### Dashboard (Tailwind)
```
Light: bg-white text-gray-900
Dark:  bg-gray-900 text-white (via dark: prefix)
```

### Gazette (Custom CSS)
```
Light: --bg: #ffffff; --text: #1a1a2e;
Dark:  body.dark-mode → --bg: #0f0f23; --text: #e2e8f0;
Toggle: localStorage.SSPU_THEME
```

> Both theme systems are **independent** — changing theme in Dashboard does NOT affect Gazette and vice versa.
