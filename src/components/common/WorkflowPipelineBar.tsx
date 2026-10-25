import React from 'react';
import {
  BookOpen,
  GraduationCap,
  CalendarDays,
  ListChecks,
  FileSpreadsheet,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

export interface PipelineStage {
  id: string;
  stepNumber: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  views: string[];
  primaryView: string;
  description: string;
  dependsOn?: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'master',
    stepNumber: 1,
    label: 'Curriculum & Course Master',
    shortLabel: '1. Course Master',
    icon: BookOpen,
    views: ['programs', 'courseMaster', 'classroomMaster'],
    primaryView: 'courseMaster',
    description: 'Programme structures, credits, venues, marking schemes & course definitions',
  },
  {
    id: 'faculty',
    stepNumber: 2,
    label: 'Faculty & Exam Duties',
    shortLabel: '2. Faculty & Duties',
    icon: GraduationCap,
    views: ['facultyAllocation'],
    primaryView: 'facultyAllocation',
    description: 'Course instructors, Paper Setters, Chief Evaluators & Invigilators',
    dependsOn: 'Course Master subjects',
  },
  {
    id: 'timetable',
    stepNumber: 3,
    label: 'Exam Timetable & Scheduling',
    shortLabel: '3. Timetable & Seating',
    icon: CalendarDays,
    views: ['timetable', 'timetableGenerator', 'seatingMaster'],
    primaryView: 'timetable',
    description: 'Exam dates, morning/afternoon sessions, seating interleaving & exam hall centers',
    dependsOn: 'Course Master & Faculty allocations',
  },
  {
    id: 'tasks',
    stepNumber: 4,
    label: '4-Phase Operations Tasks',
    shortLabel: '4. Operations Tasks',
    icon: ListChecks,
    views: ['tasks'],
    primaryView: 'tasks',
    description: 'Vault Packaging, Seating Plans, Invigilation Verification, Booklet Collection',
    dependsOn: 'Exam Schedules & Deadlines',
  },
  {
    id: 'marks',
    stepNumber: 5,
    label: 'Student Marks & Evaluation',
    shortLabel: '5. Marks Entry',
    icon: FileSpreadsheet,
    views: ['studentMarks', 'assessment', 'students', 'marksMatrix'],
    primaryView: 'studentMarks',
    description: 'Component-wise evaluation (CA1/CA2/CA3/ESE) against assigned faculty',
    dependsOn: '4-Phase Task Suite completion',
  },
  {
    id: 'trsheet',
    stepNumber: 6,
    label: 'Tabulation Register (TR)',
    shortLabel: '6. Tabulation TR',
    icon: FileText,
    views: ['trsheet', 'tng', 'results', 'sgpa'],
    primaryView: 'trsheet',
    description: 'Institutional TR Sheet generation, SGPA credits, and TNG disqualification review',
    dependsOn: 'Student Marks & Course Master rules',
  },
  {
    id: 'analytics',
    stepNumber: 7,
    label: 'Performance Analytics',
    shortLabel: '7. Performance',
    icon: BarChart3,
    views: ['performanceReports'],
    primaryView: 'performanceReports',
    description: 'Institutional pass outcomes, subject risk pareto & faculty workload audit',
    dependsOn: 'Finalized TR Sheets & Marks',
  },
];

export interface WorkflowPipelineNavProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  activeContext?: {
    paperCode?: string;
    staffCode?: string;
    programName?: string;
    semester?: string;
  };
  onClearContext?: () => void;
  className?: string;
}

export const WorkflowPipelineNav: React.FC<WorkflowPipelineNavProps> = ({
  currentView,
  onNavigate,
  activeContext,
  onClearContext,
  className = '',
}) => {
  // Determine current active stage
  const currentStageIndex = PIPELINE_STAGES.findIndex((stage) =>
    stage.views.includes(currentView)
  );

  const activeStage = currentStageIndex >= 0 ? PIPELINE_STAGES[currentStageIndex] : null;

  // Previous & Next navigation
  const prevStage = currentStageIndex > 0 ? PIPELINE_STAGES[currentStageIndex - 1] : null;
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < PIPELINE_STAGES.length - 1
      ? PIPELINE_STAGES[currentStageIndex + 1]
      : null;

  const handleStageClick = (stage: PipelineStage) => {
    // Preserve any active context when jumping between dependent stages
    const params: Record<string, string> = {};
    if (activeContext?.paperCode) {
      if (stage.id === 'marks') params.paper = activeContext.paperCode;
      if (stage.id === 'faculty') params.subject = activeContext.paperCode;
      if (stage.id === 'master') params.search = activeContext.paperCode;
      if (stage.id === 'timetable') params.subject = activeContext.paperCode;
      if (stage.id === 'analytics') params.subject = activeContext.paperCode;
    }
    if (activeContext?.staffCode) {
      if (stage.id === 'faculty') params.staff = activeContext.staffCode;
      if (stage.id === 'analytics') params.staff = activeContext.staffCode;
    }
    if (activeContext?.programName) {
      if (stage.id === 'trsheet') params.program = activeContext.programName;
      if (stage.id === 'analytics') params.program = activeContext.programName;
      if (stage.id === 'faculty') params.program = activeContext.programName;
    }
    if (activeContext?.semester) {
      params.sem = activeContext.semester;
    }

    onNavigate(stage.primaryView, params);
  };

  const hasContext = Boolean(
    activeContext?.paperCode ||
      activeContext?.staffCode ||
      activeContext?.programName
  );

  // If no previous or next stage exists (e.g. on Dashboard, Users, or Schema), don't render anything
  if (!prevStage && !nextStage) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${className}`}>
      {/* Context indicator if jumping between dependent records */}
      {hasContext && (
        <div className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-xs text-indigo-900 shrink-0">
          <span className="font-semibold text-[10px] text-indigo-700">Context:</span>
          {activeContext?.paperCode && (
            <span className="font-mono font-bold bg-white text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200 text-[10px]">
              {activeContext.paperCode}
            </span>
          )}
          {activeContext?.staffCode && (
            <span className="font-mono text-slate-700 text-[10px]">
              {activeContext.staffCode}
            </span>
          )}
          {activeContext?.programName && (
            <span className="text-slate-600 text-[10px] truncate max-w-[110px]">
              {activeContext.programName}
            </span>
          )}
          {onClearContext && (
            <button
              onClick={onClearContext}
              title="Clear context focus"
              className="ml-0.5 rounded p-0.5 hover:bg-indigo-200 text-indigo-700"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}

      {/* Back button */}
      {prevStage && (
        <button
          onClick={() => handleStageClick(prevStage)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2 sm:px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:text-slate-900 transition-colors shrink-0"
          title={`Go back to ${prevStage.label}`}
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="hidden xl:inline">Back: {prevStage.shortLabel}</span>
          <span className="xl:hidden hidden sm:inline">Back: {prevStage.stepNumber}</span>
          <span className="sm:hidden">Back</span>
        </button>
      )}

      {/* Next button */}
      {nextStage && (
        <button
          onClick={() => handleStageClick(nextStage)}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 sm:px-3 py-1 text-xs font-bold text-white shadow-xs hover:shadow-sm transition-all shrink-0"
          title={`Proceed to next step: ${nextStage.label}`}
        >
          <span className="hidden sm:inline">Next: {nextStage.shortLabel}</span>
          <span className="sm:hidden">Next: {nextStage.stepNumber}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>
      )}
    </div>
  );
};

export const WorkflowPipelineBar = WorkflowPipelineNav;
