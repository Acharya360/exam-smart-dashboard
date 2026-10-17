# Acharya360 Exam Smart Dashboard (ExamTrack)
# Examination Rules, Test Dataset, Backup & Verification Report

**Date**: 2026-10-16  
**Target Environment**: Microsoft SQL Server (`acharya360\SQLEXPRESS`), Database: `SSPU_Exam`  
**API Backend**: Node.js Express 4 on port 5000 (`server.js`)  
**Frontend Client**: React 19 + TypeScript + Vite on port 3000  

---

## 1. Examination Rules & Grading Policies

### 1.1 Assessment Heads & Structure
Every subject course configuration supports up to three assessment heads:
- **Theory** (`theory`)
- **Practical** (`practical`)
- **Skills** (`skills`)

Each active head defines four assessment components:
1. **Continuous Assessment 1 (CA1)**
2. **Continuous Assessment 2 (CA2)**
3. **Continuous Assessment 3 (CA3)**
4. **End Semester Examination (ESE)**: Independent heads `EST` (Theory), `ESP` (Practical), `ESS` (Skills).

### 1.2 Term Grant (TG) vs. Term Not Granted (TNG) Eligibility
- **Combined Internal Pass Threshold**: `40%` default (configurable per subject scheme).
- **Formula**:
  $$\text{Internal Required} = \begin{cases} \lceil \text{Internal Max} \times \frac{\text{Internal Pass \%}}{100} \rceil & \text{if integer marks} \\ \text{Internal Max} \times \frac{\text{Internal Pass \%}}{100} & \text{otherwise} \end{cases}$$
- **Status Assignment**:
  - `TG` (Term Granted): All CA marks entered, no absent, and $\text{Internal Total} \ge \text{Internal Required}$.
  - `TNG` (Term Not Granted): $\text{Internal Total} < \text{Internal Required}$. **Critical Policy Enforcement**: Students with TNG are blocked from ESE entry.
  - `PENDING`: Required CA marks are incomplete or contain absence.

### 1.3 Grading Scales & Cutoffs

#### Non-Architecture Programmes
- Default overall passing cutoff: **40%** (45% configurable).
- Grade bands:
  - $\ge 91\%$: Grade **O** (Grade Point: 10)
  - $\ge 81\%$: Grade **A+** (Grade Point: 9)
  - $\ge 71\%$: Grade **A** (Grade Point: 8)
  - $\ge 61\%$: Grade **B+** (Grade Point: 7)
  - $\ge 51\%$: Grade **B** (Grade Point: 6)
  - $\ge 41\%$: Grade **C** (Grade Point: 5)
  - $\ge 40\%$: Grade **P** (Grade Point: 4)
  - $< 40\%$: Grade **F** (Grade Point: 0)

#### Architecture Programmes
- Default overall passing cutoff: **45%**; ESE individual head passing cutoff: **45%**.
- Grade bands:
  - $\ge 90\%$: Grade **O** (Grade Point: 10)
  - $\ge 80\%$: Grade **A** (Grade Point: 9)
  - $\ge 70\%$: Grade **B** (Grade Point: 8)
  - $\ge 60\%$: Grade **C** (Grade Point: 7)
  - $\ge 50\%$: Grade **D** (Grade Point: 6)
  - $\ge 45\%$: Grade **E** (Grade Point: 5) *(Provisional test configuration)*
  - $< 45\%$: Grade **F** (Grade Point: 0)

### 1.4 Semester Grade Point Average (SGPA)
- **Formula**:
  $$\text{SGPA} = \frac{\sum (\text{Course Credits} \times \text{Grade Point})}{\sum \text{Registered Course Credits}}$$
- **Denominator Integrity**: Courses with `FAIL` or `ABSENT` contribute `0` credit points to the numerator, but their full credits remain in the denominator.
- **Publication Withholding**: If any registered course in the semester has status `PENDING`, `TNG`, or `WITHHELD`, the student's SGPA is returned as `null` (withheld from publication).

---

## 2. Test Dataset & Exact Baseline Counts

The local database `SSPU_Exam` runs with a synthetic test dataset labeled with a persistent `TEST DATABASE` banner:

| Entity | Count | Notes |
|---|:---:|---|
| **Profiles** | `8` | 1 COE, 1 DYCOE, 1 ACOE, 5 Coordinators. No passwords exposed in APIs. |
| **Academic Programs** | `5` | Construction, Mechatronics, Computer Science & AI, Electrical, Architecture. |
| **Exam Schedules** | `15` | 3 timetable papers per program. |
| **Exam Workflow Tasks** | `60` | 4 standardized milestone tasks per schedule. |
| **Course Master** | `15` | Full LTPS criteria and approved assessment schemes configured. |
| **Exam Students** | `50` | 10 students per program. |
| **Student Registrations** | `150` | 3 course registrations per student. |
| **Student Marks** | `600` | 150 registrations $\times$ 4 assessment components (CA1, CA2, CA3, ESE). |

### Course Outcome Distribution (150 Total Registrations)
- **PASS**: `72` (48%)
- **FAIL**: `18` (12%)
- **TNG**: `30` (20%)
- **ABSENT**: `15` (10%)
- **PENDING**: `15` (10%)
- **WITHHELD**: `0` (0%)

### SGPA Distribution (50 Total Students)
- **Computed / Valid SGPA**: `35` students (all courses completed with TG eligibility)
- **Withheld SGPA**: `15` students (withheld strictly due to registered TNG or pending marks)

---

## 3. Database Backup & Recovery Locations

### 3.1 SQL Server Full Backup
- **Backup File Path**:  
  `C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\SSPU_Exam_before_demo_2026-10-15T18-17-00-489Z.bak`
- **Backup Type**: Full database backup (`COPY_ONLY`, `CHECKSUM`)
- **Restoration Command**:
  ```powershell
  sqlcmd -S "acharya360\SQLEXPRESS" -E -Q "RESTORE DATABASE [SSPU_Exam] FROM DISK = N'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\SSPU_Exam_before_demo_2026-10-15T18-17-00-489Z.bak' WITH REPLACE;"
  ```

### 3.2 Template Workbook Backup
- **Original Workbook Path**:  
  `.local-backups/Sample Templete.before-examination-update.xlsx`
- **Active Validated Template**:  
  `docs/Sample Templete.xlsx`

---

## 4. Verification Suite Results

| Test Suite | File | Checks / Tests | Result |
|---|---|:---:|:---:|
| **Result Engine Calculation Suite** | `tests/resultEngine.test.ts` | 43 / 43 | **PASS (100%)** |
| **Workbook Calculation & Formula Audit** | `tests/workbook.test.ts` | 3 / 3 | **PASS (100%)** |
| **Live Calculations Verification** | `scratch/verify_calculations.js` | 150 / 150 | **PASS (100%)** |
| **Security & RBAC Regression Checks** | `scratch/regression_checks.js` | 19 / 19 | **PASS (100%)** |
| **E2E Browser & Mobile Smoke Test** | `tests/localApp.smoke.mjs` | Full Suite | **PASS (100%)** |

### Key Regression Assertions Verified
1. **Atomic Import**: Bulk student marks ingestion merges valid records atomically and returns exact count.
2. **Rejection of Invalid Data**: Invalid assessment types, marks exceeding head maxima, and ESE entry for TNG students are rejected with HTTP 400.
3. **Password Protection**: `GET /api/profiles` strips all password fields from responses across all roles.
4. **Coordinator Scoping**: Coordinators can only read exam schedules belonging to their mapped programs; bulk programs/marks mutations return HTTP 403 Forbidden.
5. **Task Update Guard**: Coordinators can only update tasks within their assigned programs; cross-program task updates return HTTP 403 Forbidden.
6. **Authentication Enforcement**: Unauthenticated API calls return HTTP 401.
7. **Password Change Security**: Coordinators cannot alter another user's password; self-service password change mandates current password verification.
8. **Mobile Viewport & Zero Errors**: Drawer navigation collapses cleanly on mobile (<768px), horizontal overflow is prevented, and 0 runtime console errors are emitted.

---

## 5. Operational Limitations & Non-Negotiable Boundaries

1. **Test Mode Isolation**: The database is in synthetic test mode (`data_mode = 'DEMO'`). Academic marks and student names are synthetic models designed to stress-test calculation boundaries.
2. **Staff Accounts Preserved**: Real institutional staff accounts and coordinator assignments were preserved and are not overwritten during synthetic data refreshes.
3. **Database Reset Guard**: The frontend `resetToDefaults()` is disabled with an explicit error to prevent accidental destruction of production data.
4. **Architecture Grade E**: Passing at 45%–49.99% for Architecture grade E is provisionally configured for synthetic testing and subject to official academic board circular sign-off.
