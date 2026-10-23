# Database Credentials & Information

**Project Name:** Exam Smart Dashboard (ExamTrack)

## Supabase Connection Details
- **Supabase Project ID:** `noqsfzdotsgjkjcwpkpu`
- **Supabase URL (REST API):** `https://noqsfzdotsgjkjcwpkpu.supabase.co`
- **Database User:** `postgres`
- **Database Name:** `postgres` (Default for Supabase)
- **Database Password:** `ExamTrack@2026`

---

## Connection Strings

Depending on how you connect to the database (direct connection vs connection pooler), you can use one of the following strings. 
*(Note: The `@` symbol in the password has been URL-encoded to `%40` below).*

### 1. Direct Connection (Standard IPv4 / IPv6)
```text
postgresql://postgres:ExamTrack%402026@db.noqsfzdotsgjkjcwpkpu.supabase.co:5432/postgres
```

### 2. Connection Pooler (Transaction Mode)
*(Use this if your network or Supabase region restricts direct connections).*
```text
postgresql://postgres.noqsfzdotsgjkjcwpkpu:ExamTrack%402026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```
*Note: Replace `REGION` with the region your Supabase project is hosted in (e.g., `ap-south-1`, `us-east-1`). You can verify this in your Supabase Dashboard under Settings -> Database -> Connection String.*

---

## Local Microsoft SQL Server Configuration
- **Server Instance:** `acharya360\SQLEXPRESS`
- **Database Name:** `SSPU_Exam`
- **Authentication:** Windows Integrated Authentication (`Integrated Security=True`)
- **T-SQL Migration Script:** `create_sspu_exam.sql`
- **T-SQL Seed Script:** `seed_sspu_exam.sql`
- **Data Export & Import Utilities:** `export_marks_to_csv.js` & `import_marks_bulk.ps1`
- **Local API Backend Server:** `server.js` (running on `http://localhost:5000`)
- **Connection String:**
  ```text
  Data Source=acharya360\SQLEXPRESS;Initial Catalog=SSPU_Exam;Integrated Security=True;Persist Security Info=False;Pooling=False;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Application Name="SQL Server Management Studio";Command Timeout=0
  ```
- **Quick Status Verification Command:**
  ```bash
  run.bat db
  ```
- **Full Re-migration Command:**
  ```bash
  run.bat migrate
  ```
