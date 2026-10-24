# SSPU Examination System — Application Flow Document

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. User Authentication Flow

```
User → Login Screen
        │
        ├── [Local Mode] POST /api/login
        │     ├── Verify bcrypt password
        │     ├── Generate 64-byte session token
        │     ├── Set cookie: exam_session=<token>
        │     └── Return user profile (role, name, dept)
        │
        └── [Supabase Mode] supabase.auth.signInWithPassword()
              ├── JWT token issued
              ├── RLS policies activate
              └── Return user session

        │
        ▼
Dashboard loads based on role:
  ├── COE/DYCOE/ACOE → Full admin view (all programs, users, uploads)
  └── COORDINATOR → Filtered view (assigned programs only)
```

---

## 2. Exam Schedule Management Flow

```
Super Admin
    │
    ├──→ Upload Excel (ExcelUploader.tsx)
    │       │
    │       ├── Parse with SheetJS
    │       ├── Validate via validation pipeline
    │       │     ├── normalizer.ts    → Standardize field formats
    │       │     ├── validators.ts    → Required fields check
    │       │     ├── parsedValidator   → Type & range validation
    │       │     ├── duplicateDetector → Detect duplicate entries
    │       │     └── errorReporter    → Compile validation report
    │       │
    │       ├── Preview in ImportPreviewDashboard.tsx
    │       └── Confirm → INSERT INTO exam_schedules
    │
    ├──→ Manual Entry (ExamTable.tsx)
    │       └── Form → INSERT INTO exam_schedules
    │
    └──→ View/Filter/Export (AdvancedExamFilter.tsx)
            ├── Multi-field search
            ├── School / Program / Semester filters
            └── Export to Excel
```

---

## 3. Task Workflow Flow

```
Exam Schedule Created
        │
        ▼
Auto-generate Tasks
        │
        ├── Assign to primary_coordinator
        ├── Set due_date
        └── Status = PENDING

        │
        ▼
Coordinator View (TasksView.tsx)
        │
        ├── Update status → IN_PROGRESS
        ├── Add notes
        ├── Mark COMPLETED
        │
        └── If overdue/unresolved:
              │
              ▼
         Escalate to Alternate
              │
              ├── Status → ESCALATED_TO_ALTERNATE
              ├── Set escalation_reason
              └── Notify alternate_coordinator
```

---

## 4. Student Marks & Result Computation Flow

```
Upload Student Marks Excel
        │
        ├── Parse Excel → student_marks rows
        │     (prn, paper_code, assessment_type, theory, practical, skills)
        │
        ├── Sync Registration Records
        │     └── exam_registrations ←→ student_marks cross-reference
        │
        ▼
Result Engine (resultEngine.ts)
        │
        ├── For each registration:
        │     ├── Gather marks by assessment_type (CAT, EST, CAP, ESP, IA)
        │     ├── Apply course_master scheme (max/min marks)
        │     ├── Calculate component totals
        │     ├── Check minimum passing criteria
        │     └── Determine: PASS / FAIL / ABSENT / WITHHELD
        │
        ├── Compute Grade & Grade Point
        │     ├── O (10), A+ (9), A (8), B+ (7), B (6), C (5), P (4), F (0)
        │     └── Architecture grading vs Non-Architecture grading
        │
        ├── Compute SGPA (per semester)
        │     └── Σ(credits × grade_point) / Σ(credits)
        │
        └── Compute CGPA (cumulative)
              └── Weighted across all semesters

        │
        ▼
Store in:
  ├── student_results (per subject)
  ├── student_sgpa (per semester)
  └── student_cgpa (cumulative)
```

---

## 5. Gazette Engine Flow (A3 Tabulation Register)

```
Dashboard Quick Launcher / Direct URL
        │
        ├── Select: Academic Period, Department, Programme, Semester, Exam Type
        │
        ▼
gazette.html loads
        │
        ├── data-store.js initializes
        │     ├── Try IndexedDB (custom uploaded data)
        │     ├── Fallback to SSPU_Master_Data_Compact.js (embedded 140K records)
        │     └── Build canonical column map (fuzzy matching 56 columns)
        │
        ├── Filter cohort by selected parameters
        │     └── O(1) indexed lookup via cohortRows cache
        │
        ├── gazette.js renders A3 Tabulation Register
        │     ├── Build subject columns from filtered data
        │     ├── Create student rows with marks breakdown:
        │     │     ├── Per subject: CA Theory, CA Practical, IA, ESE Theory, ESE Practical
        │     │     ├── Total per subject
        │     │     └── Grand Total, Credits Earned, SGPA, Grade
        │     │
        │     ├── Paginate (25-30 students per A3 page)
        │     ├── Add header: University name, Programme, Semester, Exam Period
        │     ├── Add footer: Signature lines (Tabulator, COE, Vice Chancellor)
        │     └── Locked 26px row heights for print uniformity
        │
        └── Print (Ctrl+P or button)
              ├── CSS @media print activates
              ├── A3 Landscape layout
              └── Hide navigation, show only register
```

---

## 6. Grade Card Generation Flow (A4)

```
grade-cards.html loads
        │
        ├── Select student (PRN) or view all in cohort
        │
        ├── For each student:
        │     ├── Gather all subject results for the semester
        │     ├── Display:
        │     │     ├── Student name (from PRN directory)
        │     │     ├── Per subject: CA, IA, ESE, Total, Grade, Grade Point, Credits
        │     │     ├── Semester totals
        │     │     ├── SGPA
        │     │     └── CGPA (if available)
        │     │
        │     └── Format for A4 portrait print
        │
        └── Print individual or batch
```

---

## 7. Data Upload & Migration Flow

```
                    ┌──────────────────────┐
                    │   Master_File.xlsx   │
                    │   (37 MB, READ-ONLY) │
                    │   Historical Archive │
                    └──────────┬───────────┘
                               │
                    (Pre-embedded at build time)
                               │
                               ▼
              ┌────────────────────────────────────┐
              │ SSPU_Master_Data_Compact.js (51MB)  │
              │ 140,799 rows × 56 columns           │
              │ Gazette Engine reads this directly   │
              └────────────────────────────────────┘

New Data Upload (Gazette Data Hub):
        │
        ├── User uploads new Excel
        ├── Parsed with SheetJS
        ├── Merged/appended to existing dataset
        ├── Saved to IndexedDB (SSPU_GAZETTE_DB)
        └── Dispatches 'sspu-data-updated' event

New Data Upload (Dashboard):
        │
        ├── User uploads via ExcelUploader.tsx
        ├── Validation pipeline runs
        ├── Preview shown in ImportPreviewDashboard
        ├── Confirmed → INSERT INTO database tables
        └── No cross-contamination with Gazette dataset
```

---

## 8. Cross-System Navigation Flow

```
┌─────────────────────────────────────────────────────────┐
│                 UNIFIED NAVIGATION                       │
│                                                          │
│  Dashboard (React SPA)           Gazette Engine (Static) │
│  ┌─────────────────┐            ┌─────────────────────┐ │
│  │ / (Dashboard)    │───────────▶│ /gazette/           │ │
│  │ /timetable       │            │ /gazette/pages/     │ │
│  │ /tasks           │            │   gazette.html      │ │
│  │ /programs        │            │   grade-cards.html  │ │
│  │ /course-master   │            │   analytics.html    │ │
│  │ /students        │◀───────────│   data-hub.html     │ │
│  │ /assessment      │            │   student-names.html│ │
│  │ /results         │            │   master-records.html│ │
│  │ /users           │            │                     │ │
│  │ /schema          │            │                     │ │
│  └─────────────────┘            └─────────────────────┘ │
│                                                          │
│  Cross-links via:                                        │
│  • Dashboard Sidebar → Gazette section                   │
│  • Gazette Navbar → Dashboard home link                  │
│  • Deep links with query params                          │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Database Mode Switching Flow

```
Application Start
        │
        ├── Check URL param: ?db=local or ?db=supabase
        │
        ├── Check localStorage: examtrack_db_mode
        │
        ├── Check env: VITE_DB_MODE
        │
        ├── Check host:
        │     ├── Cloud host + Supabase configured → Supabase
        │     └── Localhost → Check Supabase configured?
        │           ├── Yes → Supabase
        │           └── No → Local (SQL Server via Express)
        │
        └── Result: LocalDBService or SupabaseDBService instantiated
```
