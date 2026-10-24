# SSPU Examination System — Deployment Guide

> **Version:** 1.0 | **Date:** 2026-10-24

---

## 1. Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | ≥ 18.x | Runtime |
| npm | ≥ 9.x | Package manager |
| SQL Server | Express 2019+ | Local database (optional) |
| Supabase Account | — | Cloud database (optional) |

---

## 2. Local Development Setup

### Step 1: Clone/Copy the integrated project
```bash
# The integrated project lives at:
D:\SSPU_Examination\
```

### Step 2: Install dependencies
```bash
cd "D:\SSPU_Examination"
npm install
```

### Step 3: Configure environment
```bash
# Copy .env.example to .env and fill in values
copy .env.example .env
```

**Required environment variables:**
```env
# API Server Port
API_PORT=5000

# Database Mode: 'local' (SQL Server) or 'supabase'
VITE_DB_MODE=local

# Supabase (if using cloud mode)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gemini AI API (optional)
GEMINI_API_KEY=your-gemini-key
```

### Step 4: Initialize database

**For SQL Server (Local Mode):**
```bash
# Run the migration script
npm run migrate
```

**For Supabase (Cloud Mode):**
```bash
# Execute schema.sql in your Supabase SQL Editor
# Then execute supabase_migration_and_seed.sql
```

### Step 5: Start the application
```bash
# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the Vite dev server
npm run dev
```

Or use the convenience script:
```bash
.\run.bat
```

### Step 6: Access the application
| Service | URL |
|---------|-----|
| Dashboard (React) | http://localhost:3000 |
| API Server | http://localhost:5000 |
| Gazette Engine | http://localhost:3000/gazette/ |

---

## 3. Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| COE (Super Admin) | coe@sspu.edu.in | Admin@123 |
| DYCOE | dycoe@sspu.edu.in | Admin@123 |
| ACOE | acoe@sspu.edu.in | Admin@123 |
| Coordinator | coord@sspu.edu.in | Admin@123 |

> [!CAUTION]
> Change default passwords immediately after first login in production.

---

## 4. Production Build

```bash
# Build the React dashboard + copy gazette static files
npm run build

# Output: dist/ directory with both Dashboard and Gazette
```

### Deployment targets:
- **Vercel:** Automatic via `vercel.json`
- **IIS:** Point to `dist/` folder, configure rewrite rules
- **Docker:** Create Dockerfile with Node + Express + static files

---

## 5. Project Structure (Post-Integration)

```
D:\SSPU_Examination\
├── .al/                    # Documentation
│   ├── architecture.md
│   ├── plan.md
│   ├── security.md
│   ├── flow.md
│   ├── UI.md
│   ├── database.md
│   ├── api.md
│   ├── deployment.md
│   └── migration.md
├── public/
│   └── gazette/            # Gazette Engine (static files)
│       ├── index.html
│       ├── Master_File.xlsx (READ-ONLY)
│       ├── SSPU_Master_Data_Compact.js
│       ├── xlsx.full.min.js
│       ├── css/
│       ├── js/
│       └── pages/
├── server/                 # Express API modules
│   ├── examination.js
│   ├── timetable.js
│   └── passwordSecurity.js
├── src/                    # React Dashboard
│   ├── App.tsx
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── utils/
├── scripts/                # Migration scripts
├── tests/                  # Test suite
├── server.js               # Express entry point
├── schema.sql              # Database schema
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── vercel.json             # Vercel deployment
├── run.bat                 # Windows start script
├── .env                    # Environment variables
└── README.md               # Project README
```

---

## 6. Health Checks

| Check | Endpoint / Action |
|-------|-------------------|
| API Server | `GET http://localhost:5000/api/health` |
| Database | Login to Dashboard → check metrics load |
| Gazette Engine | Navigate to `http://localhost:3000/gazette/` |
| Cross-nav | Click Gazette links from Dashboard sidebar |
