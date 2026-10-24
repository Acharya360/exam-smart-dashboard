# SSPU Examination System — Security Document

> **Version:** 1.0 | **Date:** 2026-10-24 | **Status:** Integration Security Blueprint

---

## 1. Authentication Architecture

### 1.1 Dashboard Authentication (Primary)

| Layer | Implementation |
|-------|---------------|
| **Method** | Session-based authentication with bcrypt password hashing |
| **Session Store** | In-memory `Map<token, session>` in Express server |
| **Token** | 64-byte cryptographically random hex string (`randomBytes(32).toString('hex')`) |
| **Cookie** | `exam_session` cookie (HttpOnly in production) |
| **Session Lifetime** | 24 hours |
| **Password Hashing** | bcrypt with auto-generated salt |

### 1.2 Supabase Authentication (Cloud Mode)

| Layer | Implementation |
|-------|---------------|
| **Provider** | Supabase Auth (email/password) |
| **Token** | JWT via Supabase SDK |
| **RLS** | PostgreSQL Row-Level Security policies on all tables |

### 1.3 Gazette Engine Authentication

The Gazette Engine operates as a **client-side-only application** with no server-side auth.
In the integrated system, access to Gazette pages should be gated by the Dashboard's authentication layer.

> [!IMPORTANT]
> **Integration Requirement:** Configure Express to serve `/gazette/*` routes only to authenticated sessions, or accept that Gazette is a public-facing read-only tool.

---

## 2. Role-Based Access Control (RBAC)

### 2.1 User Roles

| Role | Code | Access Level | Description |
|------|------|-------------|-------------|
| Controller of Examinations | `COE` | Super Admin | Full system access |
| Deputy Controller | `DYCOE` | Super Admin | Full system access |
| Assistant Controller | `ACOE` | Super Admin | Full system access |
| Exam Coordinator | `COORDINATOR` | Limited | Only assigned programs |

### 2.2 Permission Matrix

| Resource | COE/DYCOE/ACOE | COORDINATOR |
|----------|----------------|-------------|
| View all programs | ✅ | ❌ (own programs only) |
| Manage programs | ✅ | ❌ |
| View all exam schedules | ✅ | ❌ (own programs only) |
| Upload exam schedules | ✅ | ❌ |
| View all tasks | ✅ | ❌ (assigned tasks only) |
| Create/manage tasks | ✅ | ✅ (update status/notes only) |
| Upload student marks | ✅ | ❌ |
| View student marks | ✅ | ❌ (own programs only) |
| Manage users | ✅ | ❌ |
| Access Gazette Engine | ✅ | ✅ |

### 2.3 RLS Policy Summary (Supabase Mode)

```sql
-- Super Admin check function
CREATE FUNCTION is_super_admin() RETURNS BOOLEAN
  -- Returns true if user role IN ('COE', 'DYCOE', 'ACOE')

-- Coordinator program check function
CREATE FUNCTION is_coordinator_for_program(p_code)
  -- Returns true if user is primary or alternate coordinator
```

All tables enforce RLS with dual policies:
1. **Select:** Super admins see all; Coordinators see only their mapped program data
2. **Modify:** Only super admins can INSERT/UPDATE/DELETE

---

## 3. Data Security

### 3.1 Sensitive Data Inventory

| Data Type | Location | Protection |
|-----------|----------|-----------|
| User passwords | `profiles` table | bcrypt hashed (never plain text) |
| Session tokens | Express memory Map | 64-byte random, auto-expire |
| Student PRNs | DB + Gazette embedded JS | No PII beyond enrollment ID |
| Student names | `localStorage` (Gazette) | Client-side only, user-managed |
| API keys | `.env` file | Environment variables, gitignored |
| Supabase keys | `.env` file | VITE_SUPABASE_ANON_KEY is public-safe |

### 3.2 Input Validation

| Layer | Validation |
|-------|-----------|
| Excel Upload | Multi-stage validation pipeline (`src/utils/validation/`) |
| API Requests | Express JSON body parser with 50MB limit |
| SQL Queries | Parameterized queries (`@param` placeholders) |
| Gazette Data | Client-side column mapping with fuzzy matching |

### 3.3 Data Protection Rules

> [!CAUTION]
> **Master_File.xlsx Protection:**
> - READ-ONLY — never modify the source file
> - Never import into database to avoid duplicate records
> - Historical migration data preserved as archive

---

## 4. Network Security

### 4.1 CORS Policy

```javascript
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  `http://localhost:${PORT}`
]);
```

- Only whitelisted origins allowed
- Unauthorized origins receive 403 Forbidden
- OPTIONS preflight requests handled

### 4.2 Rate Limiting

The server includes a configurable rate limiter (`createRateLimiter`) for authentication endpoints to prevent brute-force attacks.

### 4.3 Port Configuration

| Service | Default Port | Configurable |
|---------|-------------|-------------|
| Vite Dev Server | 3000 | `--port` flag |
| Express API | 5000 | `API_PORT` env var |

---

## 5. Security Checklist for Integration

| # | Check | Status |
|---|-------|--------|
| 1 | `.env` file is in `.gitignore` | ⬜ |
| 2 | No hardcoded credentials in source code | ⬜ |
| 3 | API endpoints behind `requireSession` middleware | ⬜ |
| 4 | SQL queries use parameterized inputs | ⬜ |
| 5 | Gazette pages respect auth boundary | ⬜ |
| 6 | CORS whitelist updated for production domain | ⬜ |
| 7 | `Master_File.xlsx` set to read-only | ⬜ |
| 8 | bcrypt password hashing verified | ⬜ |
| 9 | Session expiry enforced (24 hours) | ⬜ |
| 10 | No student PII exposed in client-side JS | ⬜ |
