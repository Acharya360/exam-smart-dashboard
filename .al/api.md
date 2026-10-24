# SSPU Examination System — API Reference

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. Server Configuration

| Property | Value |
|----------|-------|
| **Base URL** | `http://localhost:5000` |
| **Framework** | Express.js |
| **Auth** | Cookie-based sessions (`exam_session`) |
| **Content-Type** | `application/json` (50MB limit) |
| **CORS** | Whitelisted origins only |

---

## 2. Authentication Endpoints

### POST /api/login
Login and create a session.

**Body:**
```json
{
  "email": "coe@sspu.edu.in",
  "password": "Admin@123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "coe@sspu.edu.in",
    "full_name": "Dr. A. Sharma",
    "role": "COE",
    "department": "Examination Department"
  }
}
```
Sets cookie: `exam_session=<64-byte-hex-token>`

### POST /api/logout
Destroy the current session.

### GET /api/me
Get current authenticated user profile.

---

## 3. User Management Endpoints

### GET /api/users
List all user profiles. **Requires:** Super Admin.

### POST /api/users
Create a new user. **Requires:** Super Admin.

### PUT /api/users/:id
Update user profile. **Requires:** Super Admin.

### DELETE /api/users/:id
Delete a user. **Requires:** Super Admin.

---

## 4. Program Endpoints

### GET /api/programs
List programs (filtered by role — coordinators see only their mapped programs).

### POST /api/programs/upload
Bulk upload programs from Excel. **Requires:** Super Admin.

### PUT /api/programs/:id
Update program mapping.

### DELETE /api/programs/:id
Delete a program.

---

## 5. Exam Schedule Endpoints

### GET /api/schedules
List exam schedules (filtered by role).

### POST /api/schedules/upload
Bulk upload exam schedules from Excel. **Requires:** Super Admin.

### PUT /api/schedules/:id
Update a schedule entry.

### DELETE /api/schedules/:id
Delete a schedule entry.

---

## 6. Task Endpoints

### GET /api/tasks
List tasks (filtered by role and assignment).

### POST /api/tasks
Create a new task.

### PATCH /api/tasks/:id
Update task status, notes, or escalate.

### DELETE /api/tasks/:id
Delete a task. **Requires:** Super Admin.

---

## 7. Examination Workspace Endpoints

### GET /api/examination
Load full examination workspace: programs, courses, registrations with computed results.

### POST /api/examination/sync
Synchronize student_marks → exam_registrations → computed results.
**Requires:** Super Admin.

### POST /api/examination/marks
Upload/update student marks.

### PUT /api/examination/scheme/:courseId
Update assessment scheme for a course.

### POST /api/examination/compute
Trigger result computation for selected registrations.

### POST /api/examination/publish
Publish/finalize computed results.

---

## 8. Course Master Endpoints

### GET /api/courses
List course master entries.

### POST /api/courses/upload
Bulk upload course master from Excel. **Requires:** Super Admin.

### PUT /api/courses/:id
Update course LTPS/marks configuration.

---

## 9. Student Marks Endpoints

### GET /api/student-marks
List student marks (filtered by role).

### POST /api/student-marks/upload
Bulk upload student marks from Excel. **Requires:** Super Admin.

### DELETE /api/student-marks/:id
Delete a marks entry.

---

## 10. Timetable Endpoints

### GET /api/timetable
Get generated timetable data.

### POST /api/timetable/generate
Generate a new timetable based on exam schedules.

---

## 11. Utility Endpoints

### GET /api/health
Health check.

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-10-24T18:00:00Z"
}
```

### GET /api/schema
Get database table definitions and column info.

---

## 12. Gazette Data API (New — Integration)

> [!NOTE]
> These endpoints will be created during integration to bridge Dashboard DB data to the Gazette Engine.

### GET /api/gazette/records
Serve gazette-compatible data from the database.

**Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| period | string | Academic period (e.g., "2024-2025") |
| dept | string | Department code |
| course | string | Programme name |
| sem | integer | Semester number |
| examType | string | "REGULAR", "BACKLOG", "ALL" |

**Response:** Array of gazette-format rows with all 56 columns.

### GET /api/gazette/stats
Get summary statistics for the Gazette dashboard KPIs.
