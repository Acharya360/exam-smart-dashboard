# SSPU Examination Portal

> **Unified examination management platform** integrating the Acharya360 Exam Smart Dashboard with the SSPU Result Gazette & Tabulation Register Engine.

---

## System Modules

### 📊 Admin Dashboard (React 19 + Vite)
- **RBAC Authentication** — COE / DYCOE / ACOE / COORDINATOR roles
- **Exam Scheduling** — Master timetable with Excel upload
- **Task Workflow** — 4-phase task management with escalation
- **Student Marks** — Component-wise marks import (CAT, EST, CAP, ESP, IA)
- **Result Engine** — Automated grade, SGPA, CGPA computation
- **Course Master** — LTPS & marks configuration
- **Timetable Generator** — Auto-generate exam timetables
- **Faculty Allocation** — Faculty-course mapping
- **Performance Reports** — Institutional analytics

### 📋 Gazette Engine (Vanilla JS)
- **A3 Tabulation Register** — Official result gazette with print layout
- **A4 Grade Cards** — Individual student grade statements
- **Performance Analytics** — School/programme pass rates
- **Student Names Directory** — PRN-to-Name mapping
- **Excel Data Hub** — Dataset upload, append & merge
- **Master Records & Governance** — Statutory record taxonomy

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Dashboard) | React 19, TypeScript 7, Tailwind CSS v4, Lucide React, Motion |
| Frontend (Gazette) | Vanilla HTML5/CSS3/JS, SheetJS |
| Backend | Node.js, Express |
| Database (Local) | SQL Server Express |
| Database (Cloud) | Supabase (PostgreSQL + RLS) |
| Build | Vite 8 |
| AI | Google Gemini SDK |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the API server (port 5000)
npm run server

# Start the dev server (port 3000)
npm run dev
```

| URL | Service |
|-----|---------|
| http://localhost:3000 | Admin Dashboard |
| http://localhost:3000/gazette/ | Gazette Engine |
| http://localhost:5000 | API Server |

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| COE | coe@sspu.edu.in | Admin@123 |
| DYCOE | dycoe@sspu.edu.in | Admin@123 |
| ACOE | acoe@sspu.edu.in | Admin@123 |
| Coordinator | coord@sspu.edu.in | Admin@123 |

---

## Project Structure

```
SSPU_Examination/
├── .al/                    # Architecture & documentation
│   ├── architecture.md     # System architecture
│   ├── plan.md             # Integration plan & tasks
│   ├── security.md         # Security & RBAC
│   ├── flow.md             # Application flows
│   ├── UI.md               # UI/UX design system
│   ├── database.md         # Database schema
│   ├── api.md              # API reference
│   ├── deployment.md       # Deployment guide
│   └── migration.md        # Data migration guide
├── public/gazette/         # Gazette Engine (static)
│   ├── index.html          # Gazette dashboard
│   ├── Master_File.xlsx    # Historical records (READ-ONLY)
│   ├── css/                # Gazette stylesheets
│   ├── js/                 # Gazette modules
│   └── pages/              # Gazette sub-pages
├── server/                 # Express API modules
├── src/                    # React Dashboard source
│   ├── components/         # UI components
│   ├── context/            # Auth context
│   ├── services/           # Database & business logic
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utilities & routing
├── server.js               # Express entry point
├── schema.sql              # Database schema
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies
```

---

## Documentation

All documentation is in the `.al/` directory:

- [Architecture](/.al/architecture.md) — System component map & integration strategy
- [Integration Plan](/.al/plan.md) — Phased tasks & similarity analysis
- [Security](/.al/security.md) — RBAC, RLS, authentication
- [Application Flows](/.al/flow.md) — User journeys & data flows
- [UI/UX](/.al/UI.md) — Design system & page layouts
- [Database](/.al/database.md) — Schema, tables, ERD
- [API Reference](/.al/api.md) — Endpoint documentation
- [Deployment](/.al/deployment.md) — Setup & deployment guide
- [Migration](/.al/migration.md) — Data handling & dedup rules

---

## Important Notes

> ⚠️ **Master_File.xlsx** (37 MB) is a historical archive. It is **READ-ONLY** and must NOT be imported into the database to prevent duplicate records.

> The Dashboard DB (SQL Server / Supabase) is the canonical source for new data. The Gazette Engine uses its embedded dataset for historical records.
