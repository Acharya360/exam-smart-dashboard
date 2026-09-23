# Exam Smart Dashboard - Acharya360 University ERP

Exam Smart Dashboard is a comprehensive University ERP module designed to streamline examination scheduling, task workflows, and program management. It features Role-Based Access Control (RBAC) to ensure secure and efficient operations across different administrative levels.

## Features

- **Role-Based Access Control (RBAC):** Distinct workflows and access levels for Super Admins (COE, DYCOE, ACOE) and Coordinators.
- **Master Exam Timetable:** Advanced multi-field search and filters for managing university-wide exam schedules.
- **Task Management & Workflow:** Track, escalate, and complete examination-related tasks seamlessly.
- **Excel Data Upload:** Bulk upload exam schedules and program mappings (restricted to Super Admins).
- **Programs Master & Mapping:** Manage programs, user assignments, and their respective mappings.
- **Personalized Executive Metrics Grid:** Real-time metrics based on the assigned programs and roles.

## Tech Stack

- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Language:** TypeScript

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the port indicated in your terminal (typically `http://localhost:3000`).

## Database

The current version utilizes a local mocked database (`src/services/db.ts`) for rapid development and testing.

## Building for Production

To create a production build:

```bash
npm run build
```

This will output the optimized build to the `dist` directory.
