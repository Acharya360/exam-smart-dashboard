import React, { useState, useEffect } from 'react';
import { db } from '../../services/db';
import { CourseMaster, Program } from '../../types';
import {
  BookOpen,
  X,
  Save,
  Layers,
  GraduationCap,
  Calculator,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Sparkles,
} from 'lucide-react';

export interface CourseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseMaster | null | 'new';
  onSaved: (saved: CourseMaster) => void;
  registeredPrograms: Program[];
}

export const CourseEditModal: React.FC<CourseEditModalProps> = ({
  isOpen,
  onClose,
  course,
  onSaved,
  registeredPrograms,
}) => {
  const isNew = course === 'new' || !course;

  const [activeTab, setActiveTab] = useState<'identity' | 'credits' | 'scheme'>('identity');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CourseMaster>>({
    sr_no: 1,
    academic_period: '2025-26',
    term: 'Term I',
    program_code: '',
    cm_course_name: '',
    regulation_group: 'Standard',
    subject_type: 'Core',
    semester: '1',
    paper_code: '',
    sm_subject_name: '',
    student_count: null,
    l: 3,
    t: 1,
    p: 0,
    s: 0,
    total_credits: 4,
    grading_category: 'Non-Architecture',
    cat1_max: 0,
    cat1_min: 0,
    cat2_max: 0,
    cat2_min: 0,
    cat3_max: 0,
    cat3_min: 0,
    cat_max_marks: 0,
    cat_min_marks: 0,
    cap1_max: 0,
    cap1_min: 0,
    cap2_max: 0,
    cap2_min: 0,
    cap3_max: 0,
    cap3_min: 0,
    cap_max_marks: 0,
    cap_min_marks: 0,
    cas1_max: 0,
    cas1_min: 0,
    cas2_max: 0,
    cas2_min: 0,
    cas3_max: 0,
    cas3_min: 0,
    cas_max_marks: 0,
    cas_min_marks: 0,
    est_max_marks: 0,
    est_min_marks: 0,
    esp_max_marks: 0,
    esp_min_marks: 0,
    ess_max_marks: 0,
    ess_min_marks: 0,
    ia_max_marks: 0,
    ia_min_marks: 0,
    total_marks: 100,
    total_marks_min: 40,
  });

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setActiveTab('identity');

    if (course && course !== 'new') {
      setFormData({ ...course });
    } else {
      setFormData({
        sr_no: undefined,
        academic_period: '2025-26',
        term: 'Term I',
        program_code: registeredPrograms[0]?.program_code || '',
        cm_course_name: registeredPrograms[0]?.program_name || '',
        regulation_group: 'Standard',
        subject_type: 'Core',
        semester: '1',
        paper_code: '',
        sm_subject_name: '',
        student_count: null,
        l: 3,
        t: 1,
        p: 0,
        s: 0,
        total_credits: 4,
        grading_category: 'Non-Architecture',
        cat1_max: 20,
        cat1_min: 8,
        cat2_max: 20,
        cat2_min: 8,
        cat3_max: 0,
        cat3_min: 0,
        cat_max_marks: 40,
        cat_min_marks: 16,
        cap1_max: 0,
        cap1_min: 0,
        cap2_max: 0,
        cap2_min: 0,
        cap3_max: 0,
        cap3_min: 0,
        cap_max_marks: 0,
        cap_min_marks: 0,
        cas1_max: 0,
        cas1_min: 0,
        cas2_max: 0,
        cas2_min: 0,
        cas3_max: 0,
        cas3_min: 0,
        cas_max_marks: 0,
        cas_min_marks: 0,
        est_max_marks: 60,
        est_min_marks: 24,
        esp_max_marks: 0,
        esp_min_marks: 0,
        ess_max_marks: 0,
        ess_min_marks: 0,
        ia_max_marks: 40,
        ia_min_marks: 16,
        total_marks: 100,
        total_marks_min: 40,
      });
    }
  }, [course, isOpen, registeredPrograms]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CourseMaster, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProgramSelect = (programName: string) => {
    const matched = registeredPrograms.find((p) => p.program_name === programName);
    setFormData((prev) => ({
      ...prev,
      cm_course_name: programName,
      program_code: matched ? matched.program_code : prev.program_code,
    }));
  };

  // Auto-calculation helper for LTPS credits
  const handleAutoCalcCredits = () => {
    const l = Number(formData.l || 0);
    const t = Number(formData.t || 0);
    const p = Number(formData.p || 0);
    const s = Number(formData.s || 0);
    const credits = l + t + Math.round((p / 2) * 10) / 10 + s;
    handleChange('total_credits', credits);
  };

  // Auto-calculation helper for Passing Minimums based on Category (40% or 45%)
  const handleAutoCalcMins = () => {
    const passRate = formData.grading_category === 'Architecture' ? 0.45 : 0.4;
    const calc = (max?: number) => (max && max > 0 ? Math.round(max * passRate) : 0);

    const cat1_max = Number(formData.cat1_max || 0);
    const cat2_max = Number(formData.cat2_max || 0);
    const cat3_max = Number(formData.cat3_max || 0);
    const cat_max_marks = Number(formData.cat_max_marks ?? (cat1_max + cat2_max + cat3_max));

    const cap1_max = Number(formData.cap1_max || 0);
    const cap2_max = Number(formData.cap2_max || 0);
    const cap3_max = Number(formData.cap3_max || 0);
    const cap_max_marks = Number(formData.cap_max_marks ?? (cap1_max + cap2_max + cap3_max));

    const cas1_max = Number(formData.cas1_max || 0);
    const cas2_max = Number(formData.cas2_max || 0);
    const cas3_max = Number(formData.cas3_max || 0);
    const cas_max_marks = Number(formData.cas_max_marks ?? (cas1_max + cas2_max + cas3_max));

    const est_max_marks = Number(formData.est_max_marks || 0);
    const esp_max_marks = Number(formData.esp_max_marks || 0);
    const ess_max_marks = Number(formData.ess_max_marks || 0);

    const ia_max_marks = Number(formData.ia_max_marks ?? (cat_max_marks + cap_max_marks + cas_max_marks));
    const total_marks = Number(
      formData.total_marks ?? (ia_max_marks + est_max_marks + esp_max_marks + ess_max_marks)
    );

    setFormData((prev) => ({
      ...prev,
      cat1_min: calc(cat1_max),
      cat2_min: calc(cat2_max),
      cat3_min: calc(cat3_max),
      cat_max_marks,
      cat_min_marks: calc(cat_max_marks),

      cap1_min: calc(cap1_max),
      cap2_min: calc(cap2_max),
      cap3_min: calc(cap3_max),
      cap_max_marks,
      cap_min_marks: calc(cap_max_marks),

      cas1_min: calc(cas1_max),
      cas2_min: calc(cas2_max),
      cas3_min: calc(cas3_max),
      cas_max_marks,
      cas_min_marks: calc(cas_max_marks),

      est_min_marks: calc(est_max_marks),
      esp_min_marks: calc(esp_max_marks),
      ess_min_marks: calc(ess_max_marks),

      ia_max_marks,
      ia_min_marks: calc(ia_max_marks),

      total_marks,
      total_marks_min: calc(total_marks),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const paperCode = String(formData.paper_code || '').trim();
    const subjectName = String(formData.sm_subject_name || '').trim();
    const programName = String(formData.cm_course_name || '').trim();

    if (!paperCode) {
      setErrorMessage('Course / Paper Code is required.');
      setActiveTab('identity');
      return;
    }
    if (!subjectName) {
      setErrorMessage('Subject Name is required.');
      setActiveTab('identity');
      return;
    }
    if (!programName) {
      setErrorMessage('Programme Name is required.');
      setActiveTab('identity');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const created = await db.createCourseMasterRecord(formData);
        onSaved(created);
      } else {
        const id = (course as CourseMaster).id;
        const updated = await db.updateCourseMasterRecord(id, formData);
        onSaved(updated);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save course changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const isArch = formData.grading_category === 'Architecture';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {isNew ? 'Add New Course Master Record' : 'Edit Course Configuration'}
                {formData.paper_code && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {formData.paper_code}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.sm_subject_name || 'Specify subject details, credits, and evaluation scheme'}
                {formData.cm_course_name ? ` · ${formData.cm_course_name}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex gap-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'identity'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            1. Identity & Program
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credits')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'credits'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2. LTPS Credits & Grading
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scheme')}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'scheme'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            3. Evaluation & Marking Scheme
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: IDENTITY & PROGRAM */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subject Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Data Structures"
                    value={formData.sm_subject_name || ''}
                    onChange={(e) => handleChange('sm_subject_name', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Course / Paper Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSE301"
                    value={formData.paper_code || ''}
                    onChange={(e) => handleChange('paper_code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Programme / Course Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.cm_course_name || ''}
                      onChange={(e) => handleProgramSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    >
                      <option value="">Select University Programme...</option>
                      {registeredPrograms.map((p) => (
                        <option key={p.id} value={p.program_name}>
                          {p.program_name} ({p.program_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Program Code</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech CSE"
                    value={formData.program_code || ''}
                    onChange={(e) => handleChange('program_code', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Semester</label>
                  <select
                    value={formData.semester || '1'}
                    onChange={(e) => handleChange('semester', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Subject Type</label>
                  <select
                    value={formData.subject_type || 'Core'}
                    onChange={(e) => handleChange('subject_type', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Core">Core</option>
                    <option value="Elective">Elective</option>
                    <option value="Practical">Practical</option>
                    <option value="Skill">Skill</option>
                    <option value="Audit">Audit</option>
                    <option value="Value Added">Value Added</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Academic Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-26"
                    value={formData.academic_period || ''}
                    onChange={(e) => handleChange('academic_period', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Term</label>
                  <input
                    type="text"
                    placeholder="e.g. Term I"
                    value={formData.term || ''}
                    onChange={(e) => handleChange('term', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Regulation Group</label>
                  <input
                    type="text"
                    placeholder="e.g. Standard, R2024"
                    value={formData.regulation_group || ''}
                    onChange={(e) => handleChange('regulation_group', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Student Count (Enrolled)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 60"
                    value={formData.student_count ?? ''}
                    onChange={(e) => handleChange('student_count', e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Display Sequence (Sr. No)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={formData.sr_no || ''}
                    onChange={(e) => handleChange('sr_no', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LTPS CREDITS & GRADING CATEGORY */}
          {activeTab === 'credits' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Lecture · Tutorial · Practical · Studio Credits (L-T-P-S)
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoCalcCredits}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-[11px] border border-indigo-200 transition-colors"
                  >
                    <Calculator className="w-3 h-3" />
                    Auto Calc (L + T + P/2 + S)
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Lecture (L)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.l ?? 0}
                      onChange={(e) => handleChange('l', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Tutorial (T)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.t ?? 0}
                      onChange={(e) => handleChange('t', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Practical (P)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.p ?? 0}
                      onChange={(e) => handleChange('p', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Studio / Self (S)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.s ?? 0}
                      onChange={(e) => handleChange('s', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-indigo-700 mb-1">
                      Total Credits
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.total_credits ?? 0}
                      onChange={(e) => handleChange('total_credits', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-300 rounded-lg text-indigo-900 font-mono font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Grading Category Selector */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-900 mb-2">
                  Grading Category & University Pass Criteria
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      !isArch
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="grading_category"
                      checked={!isArch}
                      onChange={() => handleChange('grading_category', 'Non-Architecture')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Non-Architecture (40% Passing)</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Applies to Engineering, Management, Computer Science, and all standard degree programs.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      isArch
                        ? 'border-purple-600 bg-purple-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="grading_category"
                      checked={isArch}
                      onChange={() => handleChange('grading_category', 'Architecture')}
                      className="mt-0.5 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Architecture (45% Passing)</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Council of Architecture statutory passing criteria (45% in Internal, ESE, and Overall).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EVALUATION & MARKING SCHEME */}
          {activeTab === 'scheme' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-indigo-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-xs">
                    Passing Criteria: {isArch ? '45% (Architecture)' : '40% (Non-Architecture)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCalcMins}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-indigo-700 font-bold rounded-lg border border-indigo-300 hover:bg-indigo-50 transition-colors shadow-2xs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Auto-Calculate Passing Mins
                </button>
              </div>

              {/* Theory Assessment (CAT & EST) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 flex items-center justify-between">
                  <span>Theory Head: Continuous Assessment (CAT) & ESE Theory (EST)</span>
                  <span className="text-[11px] font-normal text-slate-500">Max / Min Marks</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAT 1</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cat1_max ?? 0}
                        onChange={(e) => handleChange('cat1_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cat1_min ?? 0}
                        onChange={(e) => handleChange('cat1_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAT 2</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cat2_max ?? 0}
                        onChange={(e) => handleChange('cat2_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cat2_min ?? 0}
                        onChange={(e) => handleChange('cat2_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAT 3</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cat3_max ?? 0}
                        onChange={(e) => handleChange('cat3_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cat3_min ?? 0}
                        onChange={(e) => handleChange('cat3_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">CAT Total</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cat_max_marks ?? 0}
                        onChange={(e) => handleChange('cat_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-blue-300 rounded font-mono text-center bg-blue-50/40 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cat_min_marks ?? 0}
                        onChange={(e) => handleChange('cat_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-blue-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-900 mb-1">EST (ESE Theory)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.est_max_marks ?? 0}
                        onChange={(e) => handleChange('est_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-indigo-300 rounded font-mono text-center bg-indigo-50/40 font-bold text-indigo-900"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.est_min_marks ?? 0}
                        onChange={(e) => handleChange('est_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-indigo-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Practical Assessment (CAP & ESP) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 flex items-center justify-between">
                  <span>Practical Head: Continuous Assessment (CAP) & ESE Practical (ESP)</span>
                  <span className="text-[11px] font-normal text-slate-500">Max / Min Marks</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAP 1</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cap1_max ?? 0}
                        onChange={(e) => handleChange('cap1_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cap1_min ?? 0}
                        onChange={(e) => handleChange('cap1_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAP 2</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cap2_max ?? 0}
                        onChange={(e) => handleChange('cap2_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cap2_min ?? 0}
                        onChange={(e) => handleChange('cap2_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAP 3</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cap3_max ?? 0}
                        onChange={(e) => handleChange('cap3_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cap3_min ?? 0}
                        onChange={(e) => handleChange('cap3_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-900 mb-1">CAP Total</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cap_max_marks ?? 0}
                        onChange={(e) => handleChange('cap_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded font-mono text-center bg-emerald-50/40 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cap_min_marks ?? 0}
                        onChange={(e) => handleChange('cap_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-900 mb-1">ESP (ESE Pract)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.esp_max_marks ?? 0}
                        onChange={(e) => handleChange('esp_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded font-mono text-center bg-emerald-50/40 font-bold text-emerald-900"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.esp_min_marks ?? 0}
                        onChange={(e) => handleChange('esp_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-emerald-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Assessment (CAS & ESS) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 flex items-center justify-between">
                  <span>Skills Head: Continuous Assessment (CAS) & ESE Skills (ESS)</span>
                  <span className="text-[11px] font-normal text-slate-500">Max / Min Marks</span>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAS 1</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cas1_max ?? 0}
                        onChange={(e) => handleChange('cas1_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cas1_min ?? 0}
                        onChange={(e) => handleChange('cas1_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAS 2</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cas2_max ?? 0}
                        onChange={(e) => handleChange('cas2_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cas2_min ?? 0}
                        onChange={(e) => handleChange('cas2_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">CAS 3</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cas3_max ?? 0}
                        onChange={(e) => handleChange('cas3_max', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cas3_min ?? 0}
                        onChange={(e) => handleChange('cas3_min', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-slate-300 rounded font-mono text-center text-rose-600 bg-rose-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">CAS Total</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.cas_max_marks ?? 0}
                        onChange={(e) => handleChange('cas_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-amber-300 rounded font-mono text-center bg-amber-50/40 font-bold"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.cas_min_marks ?? 0}
                        onChange={(e) => handleChange('cas_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-amber-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">ESS (ESE Skills)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Max"
                        value={formData.ess_max_marks ?? 0}
                        onChange={(e) => handleChange('ess_max_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-amber-300 rounded font-mono text-center bg-amber-50/40 font-bold text-amber-900"
                      />
                      <input
                        type="number"
                        placeholder="Min"
                        value={formData.ess_min_marks ?? 0}
                        onChange={(e) => handleChange('ess_min_marks', Number(e.target.value))}
                        className="w-1/2 px-2 py-1.5 border border-amber-300 rounded font-mono text-center text-rose-600 bg-rose-50/40 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Internal Assessment (IA) Total (CAT + CAP + CAS)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="IA Max"
                      value={formData.ia_max_marks ?? 0}
                      onChange={(e) => handleChange('ia_max_marks', Number(e.target.value))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-center bg-white"
                    />
                    <input
                      type="number"
                      placeholder="IA Min"
                      value={formData.ia_min_marks ?? 0}
                      onChange={(e) => handleChange('ia_min_marks', Number(e.target.value))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-center text-rose-600 bg-rose-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Grand Total Marks (IA + ESE)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Total Max"
                      value={formData.total_marks ?? 0}
                      onChange={(e) => handleChange('total_marks', Number(e.target.value))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-center bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="Total Min"
                      value={formData.total_marks_min ?? 0}
                      onChange={(e) => handleChange('total_marks_min', Number(e.target.value))}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-center text-rose-600 bg-rose-50/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'identity' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(activeTab === 'scheme' ? 'credits' : 'identity')
                  }
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Previous
                </button>
              )}

              {activeTab !== 'scheme' ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(activeTab === 'identity' ? 'credits' : 'scheme')
                  }
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : isNew ? 'Create Course' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
