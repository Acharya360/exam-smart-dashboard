# PentAGI Target Profile: Acharya360 Exam Smart Dashboard

This document provides the penetration testing scope, attack surface map, and configuration guide for running **PentAGI** against the **Acharya360 Exam Smart Dashboard (ExamTrack)** application.

---

## 1. Environment & Target URLs

When running inside PentAGI's Docker sandbox containers, use `host.docker.internal` to resolve the host machine:

| Component | Host Port | Container URL | Purpose |
| :--- | :--- | :--- | :--- |
| **Vite Frontend SPA** | `3000` | `http://host.docker.internal:3000` | React 19 UI, coordinator portals, super admin dashboard |
| **Express Backend API** | `5000` | `http://host.docker.internal:5000` | Express REST routes, auth handlers, database operations (`server.js`) |
| **Supabase Client** | Cloud / Local | Supabase project URL (`VITE_SUPABASE_URL`) | PostgreSQL REST/GraphQL APIs with Row-Level Security (RLS) |

---

## 2. Core Attack Surfaces & Test Vectors

### A. 4-Tier Role-Based Access Control (RBAC) & Privilege Escalation
The application defines 4 strict roles:
- **Super Admins**: `COE` (Controller of Examinations), `DYCOE`, `ACOE`.
- **Coordinator**: `COORDINATOR`.

**Pentest Test Goals:**
1. **Vertical Escalation**: Verify whether a user authenticated as `COORDINATOR` can trigger Super Admin actions:
   - Creating or deleting exam schedules.
   - Accessing or modifying staff passwords (`StaffPasswordModal.tsx`).
   - Triggering bulk Excel file imports without COE authorization.
2. **Horizontal Escalation (Department Scoping)**:
   - Verify whether a `COORDINATOR` assigned to Department A (e.g., Computer Science) can read or alter exam schedules, question paper printing tasks, or booklet counts for Department B (e.g., Mechanical Engineering).
   - Test `primary_coordinator_id` and `alternate_coordinator_id` boundary enforcement.

### B. Supabase Row-Level Security (RLS)
The database operates under strict RLS policies defined in `schema.sql`:
1. Test public/anon key access (`VITE_SUPABASE_ANON_KEY`) against tables:
   - `exam_schedules`
   - `workflow_tasks`
   - `users`
   - `audit_logs`
2. Validate that anon queries cannot read password hashes, unassigned exams, or bypass department filters.

### C. Express API Endpoints (`server.js`)
Test the Node.js backend routes for:
1. **SQL Injection**: Test inputs on search, filtering, and marks management endpoints.
2. **Authentication Bypass & JWT Tampering**: Test forged tokens, expired signatures, or `None` algorithm headers.
3. **CORS & Origin Validation**: Verify CORS configuration when calling the Express server from unauthorized origins.
4. **File Upload Handlers**: Test Excel file upload parsers for formula injection (CSV injection), XML External Entity (XXE), and denial of service via oversized files.

---

## 3. Creating a PentAGI Flow for ExamTrack

1. Open PentAGI at **`https://localhost:8443`** (Default: `admin@pentagi.com` / `admin`).
2. Click **New Flow**.
3. Set the **Target**:
   ```
   http://host.docker.internal:3000
   http://host.docker.internal:5000
   ```
4. Sample Goal Prompt for PentAGI Agent:
   ```
   Perform a comprehensive, non-destructive web application security assessment of the Acharya360 Exam Smart Dashboard running at http://host.docker.internal:3000 and http://host.docker.internal:5000.
   Focus on:
   1. Unauthenticated information disclosure in frontend JavaScript bundles and API responses.
   2. Horizontal and vertical privilege escalation between Coordinator and Super Admin roles.
   3. Injection vulnerabilities (SQLi, XSS) and input sanitization on Express endpoints.
   4. Secure header evaluation and CORS policy enforcement.
   Provide a detailed CVSS-scored vulnerability report with remediation guidance.
   ```
