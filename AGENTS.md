# AI Agent Operating Guidelines (AGENTS.md)

## 1. Project Context
Welcome to **Acharya360 Exam Smart Dashboard (ExamTrack)**, an enterprise University ERP examination operations and workflow tracking application.

- **Stack**: React 19, Vite, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React, SheetJS (`xlsx`), Motion, Canvas Confetti.
- **Backend / Database**: Supabase PostgreSQL with strict Row-Level Security (RLS) policies (`schema.sql`), managed via `src/services/db.ts` (`SupabaseDBService`) and `src/services/supabaseClient.ts`.
- **AI Integrations**: Google GenAI SDK (`@google/genai`) for intelligent examination assistant features.

---

## 2. Before You Start (Mandatory Reading Order)
Before writing code or proposing architectural changes, you MUST read the authoritative documentation in the `/docs` directory:

1. [docs/PRD.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/PRD.md) — Product requirements, domain models, user journeys, and role definitions.
2. [docs/ARCHITECTURE.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/ARCHITECTURE.md) — System component map, data flow, and directory responsibilities.
3. [docs/SECURITY.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/SECURITY.md) — 4-tier RBAC rules, Supabase RLS policies, and secret handling.
4. [docs/DATABASE.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/DATABASE.md) — PostgreSQL schema, enums, table schemas, and foreign keys.
5. [docs/DESIGN_SYSTEM.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/DESIGN_SYSTEM.md) — UI styling rules, Tailwind v4 tokens, and component patterns.
6. [docs/CODE_STYLE.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/CODE_STYLE.md) — TypeScript, React 19, and code conventions.
7. [docs/API.md](file:///d:/Keshav%20Jankar%20Projects/Exam%20Smart%20Dashboard/docs/API.md) — Data service methods, Excel parsing contracts, and external APIs.

---

## 3. General Development Rules
- **TypeScript Strictness**: Always use explicit types defined in `src/types/index.ts`. Avoid `any`. Run `npm run lint` (`tsc --noEmit`) to verify correctness.
- **Tailwind CSS v4 Standard**: This project runs on Tailwind CSS v4 with `@import "tailwindcss";` in `src/index.css`. **NEVER** introduce Tailwind v3 configuration files (`tailwind.config.js`) or deprecated v3 directives (`@tailwind base;`).
- **React 19 Standards**: Write clean functional components using modern React 19 hooks and patterns.
- **Reuse Existing Components**: Inspect `src/components/` before creating new UI elements. Keep components modular, accessible, and self-contained.
- **Non-Destructive Modifications**: Modify ONLY the files required for the task. Do not create `.bak` files, duplicate components, or break working functionality.

---

## 4. Security & Role Boundaries (Non-Negotiable)
- **4-Tier RBAC**:
  - Super Admins: `COE`, `DYCOE`, `ACOE`.
  - Coordinator: `COORDINATOR`.
- **UI Gating**: Super Admin exclusive features (Excel upload, Staff Password modal, full university program mappings) must remain gated behind `isSuperAdmin` checks.
- **Scoped Visibility**: Coordinators must ONLY see exam schedules, tasks, and metrics belonging to their assigned programs (`primary_coordinator_id` or `alternate_coordinator_id`).
- **Secrets Management**: Never commit credentials or expose private keys in client-side code. Use environment variables defined in `.env.example`.

---

## 5. Domain Rules & Automated Workflows
- **4-Phase Task Suite**: When automated tasks are generated for an exam schedule, preserve the exact 4 milestone titles:
  1. `Question Paper Printing & Secure Vault Packaging`
  2. `Hall Seating Plan, Attendance Sheets & Roll Labels`
  3. `Invigilation Duty Assignment & Verification`
  4. `Answer Booklet Collection & Counterfoil Verification`
- **Escalation Protocol**: Escalating a task must set `status = 'ESCALATED_TO_ALTERNATE'`, record `escalated_at`, and assign the task to `alternate_user_id` with a required rationale.

---

## 6. Development & Build Commands

```bash
# Install dependencies
npm install

# Start local development server (Vite on port 3000)
npm run dev

# Run TypeScript type check / linting
npm run lint

# Build production bundle to /dist
npm run build
```

---

## 7. AI Agent Boundaries
The AI agent must NEVER:
- Disable or bypass authentication or RBAC logic to make a feature appear to work.
- Execute destructive SQL commands (`DROP TABLE`, `TRUNCATE`) against production databases.
- Overwrite existing working database models or service interfaces without explicit user consent.
- Introduce arbitrary new dependencies when existing libraries (`lucide-react`, `xlsx`, `motion`, `@supabase/supabase-js`, `@google/genai`) already fulfill the requirement.
