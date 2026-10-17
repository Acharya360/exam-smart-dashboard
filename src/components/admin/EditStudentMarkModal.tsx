import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Save, Loader2, Sparkles } from 'lucide-react';
import { db } from '../../services/db';
import { calculateResult, HEADS } from '../../services/resultEngine';
import type { StudentMark, ExaminationData, AssessmentRecord, AssessmentHead } from '../../types';

interface EditStudentMarkModalProps {
  mark: StudentMark;
  allStudentMarks: StudentMark[];
  examData: ExaminationData | null;
  onClose: () => void;
  onSaved: (updatedMark: StudentMark, status: string) => void;
}

export const EditStudentMarkModal: React.FC<EditStudentMarkModalProps> = ({
  mark,
  allStudentMarks,
  examData,
  onClose,
  onSaved,
}) => {
  // Course assessment scheme
  const course = useMemo(() => {
    return examData?.courses.find(
      (c) =>
        c.cm_course_name === mark.cm_course_name &&
        String(c.semester) === String(mark.semester) &&
        c.paper_code === mark.paper_code
    );
  }, [examData, mark]);

  const scheme = course?.scheme ?? null;

  // Initial field states
  const [theoryVal, setTheoryVal] = useState<string>(
    mark.theory === 'AB' ? '' : mark.theory !== null && mark.theory !== undefined ? String(mark.theory) : ''
  );
  const [isTheoryAbsent, setIsTheoryAbsent] = useState<boolean>(mark.theory === 'AB');

  const [practicalVal, setPracticalVal] = useState<string>(
    mark.practical === 'AB' ? '' : mark.practical !== null && mark.practical !== undefined ? String(mark.practical) : ''
  );
  const [isPracticalAbsent, setIsPracticalAbsent] = useState<boolean>(mark.practical === 'AB');

  const [skillsVal, setSkillsVal] = useState<string>(
    mark.skills === 'AB' ? '' : mark.skills !== null && mark.skills !== undefined ? String(mark.skills) : ''
  );
  const [isSkillsAbsent, setIsSkillsAbsent] = useState<boolean>(mark.skills === 'AB');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Maximums per active head
  const isESE = mark.assessment_type === 'ESE';
  const caIndex = !isESE && mark.assessment_type.startsWith('CA') ? Number(mark.assessment_type[2]) - 1 : 0;

  const getMaxForHead = (h: AssessmentHead): number => {
    if (!scheme?.heads?.[h]?.active) return 100;
    return isESE ? scheme.heads[h].ese : scheme.heads[h].ca[caIndex];
  };

  const isHeadActive = (h: AssessmentHead): boolean => {
    if (!scheme) return true;
    return !!scheme.heads?.[h]?.active;
  };

  // Live dynamic recalculation of student outcome
  const projectedOutcome = useMemo(() => {
    const parseField = (val: string, absent: boolean) => {
      if (absent) return 'AB' as const;
      if (val === '') return null;
      const num = Number(val);
      return Number.isFinite(num) ? num : null;
    };

    const simulatedRows: AssessmentRecord[] = allStudentMarks
      .filter(
        (r) =>
          r.prn === mark.prn &&
          r.cm_course_name === mark.cm_course_name &&
          String(r.semester) === String(mark.semester) &&
          r.paper_code === mark.paper_code
      )
      .map((r) => {
        if (r.id === mark.id) {
          return {
            assessment_type: r.assessment_type,
            theory: parseField(theoryVal, isTheoryAbsent),
            practical: parseField(practicalVal, isPracticalAbsent),
            skills: parseField(skillsVal, isSkillsAbsent),
          };
        }
        return {
          assessment_type: r.assessment_type,
          theory: r.theory,
          practical: r.practical,
          skills: r.skills,
        };
      });

    return calculateResult(simulatedRows, scheme);
  }, [allStudentMarks, mark, scheme, theoryVal, isTheoryAbsent, practicalVal, isPracticalAbsent, skillsVal, isSkillsAbsent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaving(true);

    try {
      const payload = {
        theory: isTheoryAbsent ? ('AB' as const) : theoryVal === '' ? null : Number(theoryVal),
        practical: isPracticalAbsent ? ('AB' as const) : practicalVal === '' ? null : Number(practicalVal),
        skills: isSkillsAbsent ? ('AB' as const) : skillsVal === '' ? null : Number(skillsVal),
      };

      const res = await db.updateStudentMark(mark.id, payload);
      if (res.success && res.mark) {
        onSaved(res.mark, projectedOutcome.status);
      } else {
        setErrorMsg('Failed to update student marks. Please verify criteria.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update student marks.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PASS':
      case 'TG':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FAIL':
      case 'TNG':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ABSENT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'WITHHELD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Edit Student Marks</h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                {mark.assessment_type}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify marks for individual student evaluation. Status recalculates automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Course Summary Card */}
        <div className="px-6 py-3.5 bg-indigo-50/40 border-b border-indigo-100 text-xs grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Student</div>
            <div className="font-bold text-slate-900">{mark.student_name}</div>
            <div className="font-mono text-indigo-700 font-semibold">{mark.prn}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Course & Subject</div>
            <div className="font-semibold text-slate-900 truncate" title={mark.sm_subject_name}>
              {mark.paper_code} · {mark.sm_subject_name}
            </div>
            <div className="text-slate-500 truncate" title={mark.cm_course_name}>
              {mark.cm_course_name} (Sem {mark.semester})
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Component Input Grid */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Component Marks ({mark.assessment_type})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Theory Head */}
              {isHeadActive('theory') && (
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Theory</label>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Max: {getMaxForHead('theory')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={getMaxForHead('theory')}
                    step={scheme?.integerMarks ? '1' : '0.01'}
                    disabled={isTheoryAbsent || isSaving}
                    value={theoryVal}
                    placeholder="Marks"
                    onChange={(e) => setTheoryVal(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isTheoryAbsent}
                      onChange={(e) => {
                        setIsTheoryAbsent(e.target.checked);
                        if (e.target.checked) setTheoryVal('');
                      }}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Absent (AB)</span>
                  </label>
                </div>
              )}

              {/* Practical Head */}
              {isHeadActive('practical') && (
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Practical</label>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Max: {getMaxForHead('practical')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={getMaxForHead('practical')}
                    step={scheme?.integerMarks ? '1' : '0.01'}
                    disabled={isPracticalAbsent || isSaving}
                    value={practicalVal}
                    placeholder="Marks"
                    onChange={(e) => setPracticalVal(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isPracticalAbsent}
                      onChange={(e) => {
                        setIsPracticalAbsent(e.target.checked);
                        if (e.target.checked) setPracticalVal('');
                      }}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Absent (AB)</span>
                  </label>
                </div>
              )}

              {/* Skills Head */}
              {isHeadActive('skills') && (
                <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Skills</label>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      Max: {getMaxForHead('skills')}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={getMaxForHead('skills')}
                    step={scheme?.integerMarks ? '1' : '0.01'}
                    disabled={isSkillsAbsent || isSaving}
                    value={skillsVal}
                    placeholder="Marks"
                    onChange={(e) => setSkillsVal(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isSkillsAbsent}
                      onChange={(e) => {
                        setIsSkillsAbsent(e.target.checked);
                        if (e.target.checked) setSkillsVal('');
                      }}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>Absent (AB)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Live Status Recalculation Preview */}
          <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50/50 to-slate-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Live Status Recalculation
              </div>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs border ${getStatusBadgeClass(
                  projectedOutcome.status
                )}`}
              >
                {projectedOutcome.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Internal (CA)</div>
                <div className="font-bold text-slate-800">
                  <span
                    className={`font-semibold ${
                      projectedOutcome.internalStatus === 'TG'
                        ? 'text-emerald-700'
                        : projectedOutcome.internalStatus === 'TNG'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {projectedOutcome.internalStatus}
                  </span>{' '}
                  ({projectedOutcome.internalTotal}/{projectedOutcome.internalMaximum})
                </div>
                <div className="text-[10px] text-slate-400">Min req: {projectedOutcome.internalRequired}</div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Marks</div>
                <div className="font-bold text-slate-800">
                  {projectedOutcome.total} / {projectedOutcome.maximum}
                </div>
                <div className="text-[10px] text-slate-400">{projectedOutcome.percentage.toFixed(1)}%</div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Grade</div>
                <div className="font-bold text-indigo-700 font-mono text-sm">{projectedOutcome.grade}</div>
                <div className="text-[10px] text-slate-400">Point: {projectedOutcome.gradePoint}</div>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Credit Points</div>
                <div className="font-bold text-slate-800">{projectedOutcome.creditPoints}</div>
                <div className="text-[10px] text-slate-400">Credits: {projectedOutcome.earnedCredits}</div>
              </div>
            </div>

            {projectedOutcome.internalStatus === 'TNG' && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>
                  <strong>Term Not Granted (TNG):</strong> Combined internal marks ({projectedOutcome.internalTotal}) do not meet the minimum requirement ({projectedOutcome.internalRequired}). ESE examination entry is blocked.
                </span>
              </div>
            )}

            {projectedOutcome.reasons.length > 0 && projectedOutcome.internalStatus !== 'TNG' && (
              <div className="text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded border border-amber-200 space-y-0.5">
                {projectedOutcome.reasons.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving & Recalculating...' : 'Save & Update Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
