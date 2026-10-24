# SSPU Examination System — Migration & Data Handling Guide

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. Master_File.xlsx — Historical Migration Data

### 1.1 File Details

| Property | Value |
|----------|-------|
| **Location** | `D:\Gazzate_Master\Master_File.xlsx` |
| **Size** | ~37 MB |
| **Records** | ~140,799 examination rows |
| **Columns** | 56 canonical columns |
| **Purpose** | Historical exam records archive (migration source) |
| **Status** | **READ-ONLY — Never modify** |

### 1.2 Column Inventory (56 Columns)

| Category | Columns |
|----------|---------|
| **Identity** | AcademicPeriod, Term, DepartmentCode, CM_Course_Name, Semester, Roll_No/PRN |
| **Exam Info** | ExamYear, ExamType (Regular/Backlog), PaperCode |
| **Per Subject** | SubjectName, CreditTheory, CreditPractical |
| **CA Marks** | CA_Theory_Marks, CA_Practical_Marks |
| **IA Marks** | IA_Marks |
| **ESE Marks** | ESE_Theory_Marks, ESE_Practical_Marks |
| **Totals** | SubjectTotal, GrandTotal |
| **Results** | SGPA, CGPA, CreditsEarned, Grade, ResultStatus |

### 1.3 Data Handling Rules

> [!CAUTION]
> **CRITICAL — Do NOT import Master_File.xlsx into the SQL Server / Supabase database.**
> The embedded JS dataset (`SSPU_Master_Data_Compact.js`) is generated FROM this file.
> Importing it would create duplicate records across both systems.

| Action | Allowed? | Reason |
|--------|----------|--------|
| Read from browser (Gazette) | ✅ Yes | Via embedded JS or Data Hub upload |
| Copy to integrated project | ✅ Yes | As read-only archive |
| Import into SQL Server DB | ❌ NO | Would create 140K duplicate records |
| Import into Supabase | ❌ NO | Same reason |
| Edit/modify the file | ❌ NO | Historical archive must be preserved |
| Delete the original | ❌ NO | Source project must not be damaged |

---

## 2. Data Migration Strategy

### 2.1 What Gets Migrated

| Data Source | Migration Target | Method |
|-------------|-----------------|--------|
| Exam Smart Dashboard → SSPU_Examination | Full copy of source code | File copy (Phase 1) |
| Gazette Master → SSPU_Examination | Static files under `public/gazette/` | File copy (Phase 1) |
| `Master_File.xlsx` | `public/gazette/Master_File.xlsx` | Read-only copy |
| `SSPU_Master_Data_Compact.js` | `public/gazette/SSPU_Master_Data_Compact.js` | File copy |
| SQL Server schema | Unchanged — reuse existing DB | No migration needed |
| Supabase schema | Unchanged — reuse existing DB | No migration needed |

### 2.2 What Does NOT Get Migrated

| Item | Reason |
|------|--------|
| `node_modules/` | Regenerated via `npm install` |
| `.git/` history | New project starts fresh |
| `.playwright-mcp/` logs | Development artifacts |
| `Master_File - Copy.xlsx` | Backup duplicate (35 MB) |
| `marks_export.csv` | Export artifact (2.5 MB) |
| `.agents/` plugin files | Development tooling |

---

## 3. Duplicate Record Prevention

### 3.1 Shared Entity Mapping

Both projects reference SSPU examination data but store it differently:

```
Dashboard (SQL Server)              Gazette (Embedded JS)
──────────────────────              ─────────────────────
programs.program_name    ═══════    CM_Course_Name
course_master.paper_code ═══════    PaperCode
student_marks.prn        ═══════    Roll_No / PRN
programs.school_name     ═══════    DepartmentCode
exam_schedules.semester  ═══════    Semester
student_marks.exam_year  ═══════    ExamYear
```

### 3.2 Deduplication Rules

1. **Dashboard DB is the canonical source** for new data entry
2. **Gazette embedded JS** is the canonical source for historical records
3. **Never cross-import** between the two systems
4. **New exam data** enters via Dashboard → Excel Upload → DB → API
5. **Historical data** stays in Gazette's embedded JS (pre-compiled from Master_File.xlsx)
6. **Future bridge:** API endpoint `/api/gazette/records` can serve DB data to Gazette (Phase 4)

### 3.3 Student Record Dedup Check

When the Gazette API bridge is built (Phase 4), the system must:
- Match on PRN (primary key for students)
- Match on `(PRN + CM_Course_Name + Semester + PaperCode + ExamYear)` for marks
- Never INSERT if a matching record exists
- Use UPSERT pattern for any data sync

---

## 4. Backup & Recovery

### 4.1 Pre-Integration Backups

Before starting integration, these backups must exist:

| Source | Backup Method | Location |
|--------|--------------|----------|
| `D:\Exam Smart Dashboard` | Full folder copy | Untouched (never modified) |
| `D:\Gazzate_Master` | Full folder copy | Untouched (never modified) |
| `Master_File.xlsx` | Read-only copy | `D:\SSPU_Examination\public\gazette\` |

### 4.2 Recovery Plan

If integration fails at any phase:
1. Delete `D:\SSPU_Examination` contents
2. Re-copy from source projects
3. Restart from the failed phase

Both source projects at `D:\Exam Smart Dashboard` and `D:\Gazzate_Master` are **never modified** during integration.

---

## 5. Template Files

These template files from Gazette Master are preserved for user downloads:

| File | Purpose | Size |
|------|---------|------|
| `SSPU_Gazette_Blank_Template.xlsx` | Empty 56-column template for new data | 11 KB |
| `SSPU_Gazette_Data_Template.xlsx` | Sample data template with examples | 19 KB |
| `SSPU_Student_Names_Template.xlsx` | PRN-to-Name mapping template | 16 KB |
| `SSPU_Student_Names_Template.csv` | CSV version of names template | 227 bytes |
