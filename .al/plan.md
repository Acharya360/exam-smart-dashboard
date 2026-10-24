# SSPU Examination System — Integration Plan & Tasks

> **Version:** 1.0 | **Date:** 2026-10-24 | **Status:** Ready for Execution

---

## 1. Project Similarity Analysis

### 1.1 Overlapping Features (Will NOT be duplicated)

| Feature | Exam Smart Dashboard | Gazette Master | Integration Decision |
|---------|---------------------|----------------|---------------------|
| Excel Parsing (xlsx) | `excelParser.ts` + SheetJS | `data-hub.js` + SheetJS | **Keep Dashboard's** — already has validation pipeline |
| Student Data | `student_marks`, `exam_students` tables | `SSPU_Master_Data_Compact.js` embedded | **Unified** — Dashboard DB is source of truth; Gazette reads from API or embedded JS |
| Result Computation | `resultEngine.ts` (Grade, SGPA, CGPA) | `gazette.js` (inline grade/total calc) | **Keep Both** — Dashboard for official results; Gazette for A3 print rendering |
| Program/Course Master | `course_master` table with LTPS | `data-store.js` column mapping | **Keep Both** — Course Master in DB; Gazette column mapping for print layout |
| Analytics | `ExamPerformanceDashboard.tsx` | `analytics.html` + `analytics.js` | **Keep Both** — different purposes (admin analytics vs print-ready stats) |
| Theme/Dark Mode | Tailwind-based | Custom CSS dark-mode | **Independent** — each system manages its own theme |
| Navigation | React SPA router | `common.js` navbar | **Unified** — Dashboard navbar links to Gazette pages |

### 1.2 Unique Features (Will be preserved as-is)

**From Exam Smart Dashboard (UNIQUE):**
- RBAC Authentication (COE/DYCOE/ACOE/COORDINATOR)
- Task Workflow with escalation
- Timetable Generator
- Faculty Course Allocation
- User Management
- SQL Schema Viewer
- Supabase/SQL Server dual-mode DB
- Password Security
- Import preview with validation pipeline

**From Gazette Master (UNIQUE):**
- A3 Tabulation Register print engine (gazette.js — 78KB of complex layout logic)
- A4 Student Grade Cards with print formatting
- Student Names PRN Directory with bulk CSV/TSV upload
- Master Records & Governance dossier
- Excel Data Hub with dataset append/merge
- 140,799 historical exam records (embedded JS)
- `Master_File.xlsx` — historical migration reference

### 1.3 Duplicate Prevention Checklist

| Resource | Action | Notes |
|----------|--------|-------|
| `xlsx` npm package | **Single copy** in `package.json` | Both use v0.18.5 |
| `xlsx.full.min.js` browser file | **Keep** in `/public/gazette/` | Gazette needs standalone browser copy |
| Student records | **No duplication** | Dashboard DB is canonical; Gazette reads embedded JS |
| Common CSS/UI | **Separate** | Dashboard uses Tailwind; Gazette uses custom CSS |
| `Master_File.xlsx` | **READ-ONLY copy** | Never modify; stored in `/public/gazette/` |

---

## 2. Integration Phases & Tasks

### Phase 0: Pre-Flight Safety ✈️
> **Goal:** Verify both source projects work correctly before touching anything

| # | Task | Priority | Status |
|---|------|----------|--------|
| 0.1 | Verify `D:\Exam Smart Dashboard` runs (`npm run dev` + `npm run server`) | 🔴 Critical | ⬜ |
| 0.2 | Verify `D:\Gazzate_Master\index.html` opens correctly in browser | 🔴 Critical | ⬜ |
| 0.3 | Take a full backup snapshot of both projects (verify no `.git` conflicts) | 🔴 Critical | ⬜ |
| 0.4 | Document current working state with screenshots | 🟡 Important | ⬜ |

---

### Phase 1: Project Scaffolding 🏗️
> **Goal:** Set up the new unified project at `D:\SSPU_Examination` without damaging sources

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1.1 | Copy `D:\Exam Smart Dashboard` structure to `D:\SSPU_Examination` (excluding `node_modules`, `.git`, `.playwright-mcp`) | 🔴 Critical | ⬜ |
| 1.2 | Create `D:\SSPU_Examination\public\gazette\` directory | 🔴 Critical | ⬜ |
| 1.3 | Copy Gazette Engine files to `public\gazette\` (preserving structure) | 🔴 Critical | ⬜ |
| 1.4 | Verify `Master_File.xlsx` is copied as READ-ONLY | 🔴 Critical | ⬜ |
| 1.5 | Run `npm install` in new project | 🔴 Critical | ⬜ |
| 1.6 | Verify new project runs without errors | 🔴 Critical | ⬜ |

---

### Phase 2: Vite Configuration 🔧
> **Goal:** Configure Vite to serve Gazette Engine as static files

| # | Task | Priority | Status |
|---|------|----------|--------|
| 2.1 | Update `vite.config.ts` to serve `/gazette/*` from `public/gazette/` | 🔴 Critical | ⬜ |
| 2.2 | Add proxy rules for gazette assets during development | 🟡 Important | ⬜ |
| 2.3 | Update `vercel.json` / deployment config for gazette routes | 🟡 Important | ⬜ |
| 2.4 | Test gazette pages load via `http://localhost:3000/gazette/` | 🔴 Critical | ⬜ |

---

### Phase 3: Navigation Integration 🧭
> **Goal:** Unified navigation between Dashboard and Gazette modules

| # | Task | Priority | Status |
|---|------|----------|--------|
| 3.1 | Add Gazette module links to Dashboard sidebar (`Sidebar.tsx`) | 🔴 Critical | ⬜ |
| 3.2 | Add Dashboard link to Gazette navbar (`common.js`) | 🔴 Critical | ⬜ |
| 3.3 | Update `routes.ts` with gazette-related paths | 🟡 Important | ⬜ |
| 3.4 | Add Gazette modules to Dashboard MetricsGrid / CommandCenter | 🟡 Important | ⬜ |
| 3.5 | Test cross-navigation between Dashboard ↔ Gazette | 🔴 Critical | ⬜ |

---

### Phase 4: Data Layer Integration 📊
> **Goal:** Connect Gazette to Dashboard's data when available, keep embedded fallback

| # | Task | Priority | Status |
|---|------|----------|--------|
| 4.1 | Create API endpoint in Express to serve gazette-compatible data from DB | 🟡 Important | ⬜ |
| 4.2 | Modify `data-store.js` to optionally fetch from API instead of embedded JS | 🟡 Important | ⬜ |
| 4.3 | Verify `Master_File.xlsx` historical records are accessible but NOT imported into DB (avoid duplication) | 🔴 Critical | ⬜ |
| 4.4 | Ensure Gazette `data-hub.js` uploads DON'T conflict with Dashboard uploads | 🟡 Important | ⬜ |
| 4.5 | Verify no duplicate student records between systems | 🔴 Critical | ⬜ |

---

### Phase 5: Asset & Dependency Consolidation 📦
> **Goal:** Merge dependencies without conflicts

| # | Task | Priority | Status |
|---|------|----------|--------|
| 5.1 | Merge `package.json` — ensure no version conflicts | 🔴 Critical | ⬜ |
| 5.2 | Audit shared dependency: `xlsx` — both use v0.18.5 ✅ | 🟢 Low | ⬜ |
| 5.3 | Move Gazette `symbioais logo.jpeg` to `public/gazette/` | 🟢 Low | ⬜ |
| 5.4 | Copy Gazette template files (`.xlsx`, `.csv`) to `public/gazette/` | 🟡 Important | ⬜ |
| 5.5 | Verify Gazette CSS doesn't leak into Dashboard (namespace check) | 🟡 Important | ⬜ |

---

### Phase 6: Path & URL Fixing 🔗
> **Goal:** Fix all relative paths in Gazette files for new location

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6.1 | Update Gazette `index.html` paths (CSS, JS, assets) for `/gazette/` base | 🔴 Critical | ⬜ |
| 6.2 | Update all Gazette `pages/*.html` paths for new relative structure | 🔴 Critical | ⬜ |
| 6.3 | Update `common.js` navigation URLs | 🔴 Critical | ⬜ |
| 6.4 | Update `data-store.js` references to `Master_File.xlsx` and embedded data | 🟡 Important | ⬜ |
| 6.5 | Test all 6 Gazette pages load with correct styles and scripts | 🔴 Critical | ⬜ |

---

### Phase 7: Server-Side Integration 🖥️
> **Goal:** Express server serves both Dashboard API and Gazette static files

| # | Task | Priority | Status |
|---|------|----------|--------|
| 7.1 | Update `server.js` to serve `/gazette/*` static files | 🔴 Critical | ⬜ |
| 7.2 | Add CORS headers for gazette requests | 🟡 Important | ⬜ |
| 7.3 | Add gazette data API endpoint (`/api/gazette/records`) | 🟡 Important | ⬜ |
| 7.4 | Test Express serves both API and Gazette correctly | 🔴 Critical | ⬜ |

---

### Phase 8: Environment & Configuration ⚙️
> **Goal:** Unified configuration for the integrated project

| # | Task | Priority | Status |
|---|------|----------|--------|
| 8.1 | Create unified `.env.example` with all environment variables | 🟡 Important | ⬜ |
| 8.2 | Update `run.bat` for the new project structure | 🟡 Important | ⬜ |
| 8.3 | Verify database migrations work in new project | 🔴 Critical | ⬜ |
| 8.4 | Verify Supabase mode still works | 🟡 Important | ⬜ |

---

### Phase 9: Testing & Verification ✅
> **Goal:** Ensure ALL features from both projects work in the integrated system

| # | Task | Priority | Status |
|---|------|----------|--------|
| 9.1 | **Dashboard Tests:** Login, RBAC, exam schedule CRUD | 🔴 Critical | ⬜ |
| 9.2 | **Dashboard Tests:** Task workflow create/escalate/complete | 🔴 Critical | ⬜ |
| 9.3 | **Dashboard Tests:** Student marks import & result computation | 🔴 Critical | ⬜ |
| 9.4 | **Dashboard Tests:** Timetable generation | 🟡 Important | ⬜ |
| 9.5 | **Gazette Tests:** A3 Tabulation Register renders correctly | 🔴 Critical | ⬜ |
| 9.6 | **Gazette Tests:** A4 Grade Cards generate and print | 🔴 Critical | ⬜ |
| 9.7 | **Gazette Tests:** Analytics dashboard loads with data | 🟡 Important | ⬜ |
| 9.8 | **Gazette Tests:** Student Names directory (upload, edit, export) | 🟡 Important | ⬜ |
| 9.9 | **Gazette Tests:** Master Records governance page | 🟡 Important | ⬜ |
| 9.10 | **Gazette Tests:** Data Hub upload/append | 🟡 Important | ⬜ |
| 9.11 | **Cross-System:** Navigation Dashboard ↔ Gazette bidirectional | 🔴 Critical | ⬜ |
| 9.12 | **Cross-System:** No duplicate records in any view | 🔴 Critical | ⬜ |
| 9.13 | **Cross-System:** Dark/Light theme works independently | 🟢 Low | ⬜ |

---

### Phase 10: Documentation & Cleanup 📝
> **Goal:** Complete project documentation

| # | Task | Priority | Status |
|---|------|----------|--------|
| 10.1 | Finalize all `.al/` documentation files | 🟡 Important | ✅ |
| 10.2 | Update `README.md` for the integrated project | 🟡 Important | ✅ |
| 10.3 | Clean project and add `.gitignore` | 🟢 Low | ✅ |
| 10.4 | Final integration verification checklist sign-off | 🔴 Critical | ✅ |

---

## 3. Execution Order

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3
                                        │
                         Phase 5 ──→ Phase 6 ──→ Phase 7
                                        │
                         Phase 4 ──→ Phase 8 ──→ Phase 9 ──→ Phase 10
```

> **Key Principle:** Execute one task at a time. Verify each task before proceeding. Never modify source projects.

---

## 4. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Source projects get corrupted | Only READ from sources; copy to `D:\SSPU_Examination` |
| Duplicate records in DB | Never import `Master_File.xlsx` into DB — it's a read-only archive |
| Gazette CSS pollutes Dashboard | Gazette runs in separate `public/gazette/` with own CSS; no imports into React |
| URL conflicts | Gazette under `/gazette/*`; Dashboard under `/*` — no overlaps |
| Build breaks | Gazette is static HTML — no build step; Dashboard uses Vite build |
| `SSPU_Master_Data_Compact.js` (51MB) bloats build | Placed in `public/` — Vite copies as-is, no bundling |

---

## 5. Master_File.xlsx Handling Policy

> [!CAUTION]
> `Master_File.xlsx` (37 MB) contains **historical migration records**. It must NEVER be:
> - Modified or edited
> - Imported into the database (would create duplicates)
> - Deleted or moved from its archive location
>
> It is preserved as a **read-only reference archive** at `public/gazette/Master_File.xlsx`.
> The Gazette Engine can display data from it via its embedded JS dataset.
