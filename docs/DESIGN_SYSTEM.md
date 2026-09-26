# Design System (DESIGN_SYSTEM.md)

## 1. Visual Personality & Direction
The **Acharya360 Exam Smart Dashboard** is an enterprise-grade academic command center. Its visual design is:
- **Clean & Academic**: Neutral slate backgrounds with purposeful brand accents.
- **Dense & High-Contrast**: Information-dense tables, metric cards, and filter panels optimized for high-volume examination administrative workflows.
- **Modern & Responsive**: Smooth micro-interactions, crisp Lucide iconography, accessible focus states, and flexible layouts.

---

## 2. Color Palette & Semantic Tokens

### 2.1. Backgrounds & Surfaces
- **App Canvas**: `bg-slate-50` (`#f8fafc`)
- **Card & Table Containers**: `bg-white` (`#ffffff`)
- **Header & Sidebar**: `bg-white border-r border-slate-200`
- **Modal Overlay Backdrop**: `bg-slate-900/40 backdrop-blur-xs`

### 2.2. Neutrals (Slate Hierarchy)
| Token | Tailwind Class | Hex Value | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Text** | `text-slate-900` | `#0f172a` | Page titles, primary numbers, strong labels |
| **Secondary Text** | `text-slate-700` | `#334155` | Table cell data, active navigation labels, body text |
| **Muted / Subtitle** | `text-slate-500` | `#64748b` | Sub-labels, timestamps, placeholder text, breadcrumbs |
| **Borders & Dividers** | `border-slate-200` | `#e2e8f0` | Card borders, table row dividers, modal headers |
| **Subtle Highlights** | `bg-slate-100` | `#f1f5f9` | Secondary button backgrounds, hover backgrounds |

### 2.3. Primary Accent (Indigo)
- **Primary Brand / Action**: `indigo-600` (`#4f46e5`) & `indigo-700` (`#4338ca`)
- **Hover State**: `hover:bg-indigo-700`
- **Subtle Badges & Tabs**: `bg-indigo-50 text-indigo-700 border-indigo-200`

### 2.4. Semantic Status Colors
| State | Tailwind Tokens | Usage |
| :--- | :--- | :--- |
| **Completed / Success** | `bg-emerald-50 text-emerald-700 border-emerald-200` | Completed tasks, successful validations |
| **In Progress / Warning** | `bg-amber-50 text-amber-700 border-amber-200` | Pending/in-progress tasks, caution alerts |
| **Escalated / Overdue / Error** | `bg-rose-50 text-rose-700 border-rose-200` | Escalated tasks, overdue milestones, deletion actions |
| **Info / Session (AM/PM)** | `bg-blue-50 text-blue-700 border-blue-200` | AM session, informational tags |

---

## 3. Typography

- **Font Family**: Modern sans-serif stack (`font-sans`, Inter / system font).
- **Code & IDs**: Monospace font (`font-mono`) for `pkg_no`, `paper_code`, `program_code`, and emails.

### Type Hierarchy
- **Page Titles**: `text-xl font-bold tracking-tight text-slate-900`
- **Section Headers**: `text-sm font-bold text-slate-800`
- **Metric Big Numbers**: `text-2xl font-extrabold text-slate-900`
- **Standard Body**: `text-xs text-slate-600 leading-normal`
- **Micro Badges**: `text-[10px] font-bold uppercase tracking-wider`

---

## 4. Spacing, Elevation & Radius

### Spacing Scale
- Page Padding: `p-4 md:p-8`
- Grid Gaps: `gap-4` (metrics) to `gap-6` (major sections)
- Form Field Spacing: `space-y-4`

### Border Radius
- Cards & Containers: `rounded-2xl` (large panels) or `rounded-xl` (tables, filters)
- Form Controls & Buttons: `rounded-lg`
- Badges & Pills: `rounded-md` or `rounded-full`

### Elevation & Shadows
- Cards: `shadow-xs border border-slate-200/80`
- Action Buttons: `shadow-2xs`
- Floating Modals: `shadow-xl border border-slate-200`

---

## 5. Standard Component Guidelines

### 5.1. Buttons
- **Primary**:
  ```tsx
  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
    <Icon className="w-4 h-4" />
    <span>Save Changes</span>
  </button>
  ```
- **Secondary / Ghost**:
  ```tsx
  <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors">
    <Icon className="w-3.5 h-3.5 text-slate-500" />
    <span>Cancel</span>
  </button>
  ```
- **Destructive**:
  ```tsx
  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors">
    <Trash2 className="w-3.5 h-3.5" />
    <span>Delete</span>
  </button>
  ```

### 5.2. Form Inputs
- Standard Input with Label:
  ```tsx
  <div className="space-y-1">
    <label className="text-xs font-semibold text-slate-700">Course / Program Code</label>
    <input
      type="text"
      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      placeholder="e.g. BTECH-CSE"
    />
  </div>
  ```

### 5.3. Metric Cards
```tsx
<div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
  <div>
    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Tasks</p>
    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">42</h3>
    <p className="text-[11px] text-amber-600 font-medium mt-0.5">8 due within 48h</p>
  </div>
  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
    <Clock className="w-6 h-6" />
  </div>
</div>
```

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Behavior |
| :--- | :--- | :--- |
| **Mobile (`< 768px`)** | Small screens | Sidebar hides into a slide-over mobile drawer; single-column metric grid; horizontal scroll on tables. |
| **Tablet (`768px - 1024px`)** | Medium screens | 2-column metrics; filter bars collapse into collapsible accordions. |
| **Desktop (`>= 1024px`)** | Large displays | Fixed 64px/256px sidebar; 4-column metrics; full multi-field filter bar. |

---

## 7. Accessibility (A11y)
- **High Contrast**: Minimum 4.5:1 contrast ratio across text elements against backgrounds.
- **Focus Rings**: Clear `focus-visible:ring-2 focus-visible:ring-indigo-500` rings for keyboard navigation.
- **Icon Support**: Meaningful icons accompanied by accessible labels or tooltips.
- **Interactive Semantic Elements**: Native `<button>`, `<select>`, `<input>`, and `<table>` elements with semantic roles.
