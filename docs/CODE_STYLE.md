# Code Style & Conventions (CODE_STYLE.md)

## 1. Purpose
This document establishes the code conventions and development standards for **Acharya360 Exam Smart Dashboard (ExamTrack)** to ensure codebase maintainability, type safety, and consistency across human and AI contributions.

---

## 2. Stack Specifications
- **Language**: TypeScript 7.x (ESNext target, strict mode)
- **Framework**: React 19.x (Functional components, hooks, React Context)
- **Bundler**: Vite 8.x
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` & `@import "tailwindcss";`)
- **Icons**: Lucide React (`lucide-react`)

---

## 3. General Principles
- **Readability Over Cleverness**: Code should be self-explanatory with clean variable names and focused functions.
- **Strict Typing**: Leverage TypeScript interfaces in `src/types/index.ts`. Avoid `any`.
- **Component Modularity**: Divide complex screens into atomic subcomponents (e.g. `ExamTable.tsx`, `AdvancedExamFilter.tsx`, `MetricsGrid.tsx`).
- **Do Not Break Working Functionality**: Never remove existing props, handlers, or state connections unnecessarily.

---

## 4. Naming Conventions

### 4.1. Files & Directories
- **React Components**: PascalCase (`ExamTable.tsx`, `LoginScreen.tsx`, `Sidebar.tsx`).
- **Services & Utilities**: camelCase (`db.ts`, `excelParser.ts`, `supabaseClient.ts`).
- **Contexts**: PascalCase with Context suffix (`AuthContext.tsx`).
- **Type Definitions**: `index.ts` in `src/types/`.

### 4.2. Code Identifiers
- **Components & Interfaces**: PascalCase (`UserProfile`, `ExamSchedule`, `TasksView`).
- **Functions & Variables**: camelCase (`refreshData`, `handleCommitSchedules`, `activeTab`).
- **Boolean State / Variables**: Prefix with `is`, `has`, `should`, or `can` (`isSuperAdmin`, `isLoading`, `hasAccess`).
- **Constants**: UPPER_SNAKE_CASE (`SUPABASE_SQL_MIGRATION`).

---

## 5. TypeScript Guidelines

### 5.1. Interface Definitions
Define shared domain structures in `src/types/index.ts`:
```typescript
export interface ExamSchedule {
  id: string;
  pkg_no: number;
  cm_school_name: string;
  cm_course_name: string;
  program_code: string;
  semester: number;
  paper_code: string;
  sm_subject_name: string;
  student_count: number;
  exam_date: string;
  am_pm: 'AM' | 'PM';
  exam_time: string;
  exam_type: 'Regular' | 'Backlog' | 'Both';
}
```

### 5.2. Component Props
Every component accepting props must define an explicit interface:
```typescript
interface ExamTableProps {
  schedules: ExamSchedule[];
  tasks: ExamTask[];
  programs: Program[];
  isCoordinatorView: boolean;
  onSelectScheduleForTasks: (schedule: ExamSchedule) => void;
  onGenerateTasks: (schedule: ExamSchedule) => void;
}

export function ExamTable({
  schedules,
  tasks,
  programs,
  isCoordinatorView,
  onSelectScheduleForTasks,
  onGenerateTasks
}: ExamTableProps) {
  // implementation
}
```

---

## 6. React 19 Component Standards

1. **Functional Components**: Use standard function declarations with typed props.
2. **Hook Usage**:
   - Keep side effects inside `useEffect`.
   - Memoize expensive search/filtering pipelines using `useMemo`.
3. **State Management**:
   - Global auth/session resides in `src/context/AuthContext.tsx`.
   - Master data sync resides in `src/App.tsx` via `refreshData()`.
   - Local component UI state (filters, sorting, modal open/close) resides locally.
4. **Empty & Loading States**: Always render user-friendly fallbacks with Lucide icons when arrays are empty or loading.

---

## 7. Tailwind CSS v4 Styling Conventions

- **Engine**: This project utilizes Tailwind CSS v4. No `tailwind.config.js` is required or supported.
- **Utility Ordering**:
  ```tsx
  // 1. Layout & Display (flex, grid, block, relative, w-full, h-screen)
  // 2. Spacing & Padding (p-4, mx-auto, gap-3, space-y-2)
  // 3. Borders & Radius (border border-slate-200 rounded-xl)
  // 4. Backgrounds & Colors (bg-white text-slate-900)
  // 5. Typography (text-xs font-semibold)
  // 6. Interactive States (hover:bg-slate-50 focus:ring-2 transition-colors)
  <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors">
  ```
- **Avoid Arbitrary Magic Numbers**: Prefer standard Tailwind spacing tokens (`p-4`, `gap-3`, `h-10`) over ad-hoc pixel values.

---

## 8. Verification & Pre-Finishing Checklist
Before declaring any task or code change complete:
1. Run `npm run lint` (`tsc --noEmit`) to verify zero type errors.
2. Run `npm run build` to verify the Vite production build succeeds.
3. Test UI changes across desktop and mobile viewport sizes.
4. Ensure no `console.log` statements or leftover debugging artifacts remain.
