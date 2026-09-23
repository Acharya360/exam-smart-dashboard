import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  downloadExamScheduleTemplate, 
  downloadProgramMappingTemplate, 
  parseExamScheduleExcel, 
  parseProgramMasterExcel 
} from '../../services/excelParser';
import { useAuth } from '../../context/AuthContext';
import { ExamSchedule, Program, UserProfile } from '../../types';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Users, 
  ArrowRight,
  Eye,
  Trash2,
  Sparkles
} from 'lucide-react';

interface ExcelUploaderProps {
  onCommitSchedules: (schedules: ExamSchedule[], autoGenerateTasks: boolean) => void;
  onCommitPrograms: (programs: Program[], newUsers: UserProfile[]) => void;
  onNavigate: (view: string) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onCommitSchedules,
  onCommitPrograms,
  onNavigate,
}) => {
  const { users } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedules' | 'programs'>('schedules');
  const [dragOver, setDragOver] = useState(false);
  const [autoGenTasks, setAutoGenTasks] = useState(true);

  // Schedules state
  const [parsedSchedules, setParsedSchedules] = useState<ExamSchedule[]>([]);
  const [scheduleErrors, setScheduleErrors] = useState<string[]>([]);
  const [scheduleFileName, setScheduleFileName] = useState<string>('');

  // Programs state
  const [parsedPrograms, setParsedPrograms] = useState<{ program: Program; primaryUser?: UserProfile; alternateUser?: UserProfile }[]>([]);
  const [programErrors, setProgramErrors] = useState<string[]>([]);
  const [programFileName, setProgramFileName] = useState<string>('');

  const [committedSuccess, setCommittedSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    setCommittedSuccess(null);
    const arrayBuffer = await file.arrayBuffer();

    if (activeTab === 'schedules') {
      setScheduleFileName(file.name);
      const result = parseExamScheduleExcel(arrayBuffer);
      setParsedSchedules(result.data);
      setScheduleErrors(result.errors);
    } else {
      setProgramFileName(file.name);
      const result = parseProgramMasterExcel(arrayBuffer, users);
      setParsedPrograms(result.data);
      setProgramErrors(result.errors);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCommitSchedules = () => {
    if (parsedSchedules.length === 0) return;
    onCommitSchedules(parsedSchedules, autoGenTasks);
    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch {}
    setCommittedSuccess(`Successfully imported ${parsedSchedules.length} examination papers!`);
    setParsedSchedules([]);
    setScheduleFileName('');
  };

  const handleCommitPrograms = () => {
    if (parsedPrograms.length === 0) return;
    const progs = parsedPrograms.map((p) => p.program);
    const newUsers: UserProfile[] = [];
    parsedPrograms.forEach((p) => {
      if (p.primaryUser && !users.find((u) => u.id === p.primaryUser?.id)) newUsers.push(p.primaryUser);
      if (p.alternateUser && !users.find((u) => u.id === p.alternateUser?.id)) newUsers.push(p.alternateUser);
    });

    onCommitPrograms(progs, newUsers);
    try {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch {}
    setCommittedSuccess(`Successfully imported ${progs.length} academic programs & coordinator mappings!`);
    setParsedPrograms([]);
    setProgramFileName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Examination Registry Ingestion Engine
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload institutional Excel spreadsheets (.xlsx, .xls, .csv) to populate the Central Examination Timetable and Coordinator Mapping roster. Powered by client-side SheetJS parsing with header validation.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => {
                setActiveTab('schedules');
                setCommittedSuccess(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'schedules'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>1. Exam Schedule Master</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('programs');
                setCommittedSuccess(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'programs'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Program & Coordinator Mapping</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {committedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{committedSuccess}</span>
          </div>
          <button
            onClick={() => onNavigate(activeTab === 'schedules' ? 'dashboard' : 'programs')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline"
          >
            <span>Go to {activeTab === 'schedules' ? 'Dashboard' : 'Programs Directory'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropzone & Template Download Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Dropzone (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {activeTab === 'schedules'
                ? 'Upload Exam Schedule Master Spreadsheet'
                : 'Upload Program Master & Coordinator Mapping'}
            </h3>
            <button
              onClick={() => {
                if (activeTab === 'schedules') downloadExamScheduleTemplate();
                else downloadProgramMappingTemplate();
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              title="Download pre-formatted blank template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Drag & drop your Excel file here, or{' '}
              <span className="text-indigo-600 underline">browse files</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
            </p>
          </div>

          {/* Options */}
          {activeTab === 'schedules' && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoGenTasks}
                  onChange={(e) => setAutoGenTasks(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">
                  Automatically generate default task workflow for all imported exams (QP Printing, Seating Plan, Attendance Sheets, Invigilation)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Required Format Reference (Right col) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Required Column Headers</span>
          </div>

          {activeTab === 'schedules' ? (
            <div className="space-y-2">
              <p className="text-slate-500 leading-relaxed text-[11px]">
                The schedule parser automatically extracts the official examination packaging layout matching your university master format:
              </p>
              <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded border border-slate-200 text-slate-600 max-h-60 overflow-y-auto">
                <div className="font-bold text-slate-900">PKGNo</div>
                <div>Logic1</div>
                <div>CM_School_Name</div>
                <div>CM_Course_Name</div>
                <div>Semester</div>
                <div>Elective</div>
                <div className="font-bold text-indigo-700">PaperCode</div>
                <div className="font-bold text-indigo-700">SM_Subject_Name</div>
                <div>Student Count</div>
                <div>Regular</div>
                <div>Backlog</div>
                <div>Exam Day</div>
                <div>Exam Date (DD/MM/YYYY)</div>
                <div>Date_Odd_Even</div>
                <div>AM_PM (AM / PM)</div>
                <div>Exam Time</div>
                <div>Exam Type (Regular / Backlog)</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-500 leading-relaxed text-[11px]">
                The program mapping file maps course programs to primary and alternate faculty coordinators:
              </p>
              <div className="space-y-1 font-mono text-[11px] bg-white p-2.5 rounded border border-slate-200 text-slate-600">
                <div>Sr. No.</div>
                <div className="font-bold text-indigo-700">Program Code</div>
                <div className="font-bold text-indigo-700">Program Name</div>
                <div>School Name</div>
                <div>Primary Coordinator Email/Name</div>
                <div>Alternate Coordinator Email/Name</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section for Exam Schedules */}
      {activeTab === 'schedules' && parsedSchedules.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Preview Parsed Exam Records: {scheduleFileName}
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {parsedSchedules.length} rows ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review data before committing to the institutional database.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setParsedSchedules([]);
                  setScheduleFileName('');
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                onClick={handleCommitSchedules}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit {parsedSchedules.length} Schedules to Database</span>
              </button>
            </div>
          </div>

          {/* Diagnostic errors if any */}
          {scheduleErrors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Validation Warnings ({scheduleErrors.length}):</span>
              </div>
              {scheduleErrors.slice(0, 3).map((err, i) => (
                <p key={i} className="text-[11px] font-mono">
                  · {err}
                </p>
              ))}
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">PKG</th>
                  <th className="py-2 px-2.5">Course Name</th>
                  <th className="py-2 px-2.5">Sem</th>
                  <th className="py-2 px-2.5">Paper Code</th>
                  <th className="py-2 px-2.5">Subject Name</th>
                  <th className="py-2 px-2.5 text-right">Students</th>
                  <th className="py-2 px-2.5">Exam Date</th>
                  <th className="py-2 px-2.5">AM/PM</th>
                  <th className="py-2 px-2.5">Exam Time</th>
                  <th className="py-2 px-2.5">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedSchedules.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-800">#{s.pkg_no}</td>
                    <td className="py-2 px-2.5 truncate max-w-[180px]">{s.cm_course_name}</td>
                    <td className="py-2 px-2.5 text-center font-mono">Sem {s.semester}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-indigo-700">{s.paper_code}</td>
                    <td className="py-2 px-2.5 font-medium text-slate-900 truncate max-w-[200px]">{s.sm_subject_name}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{s.student_count}</td>
                    <td className="py-2 px-2.5 font-mono">{s.exam_date}</td>
                    <td className="py-2 px-2.5 font-bold font-mono text-[10px]">{s.am_pm}</td>
                    <td className="py-2 px-2.5 font-mono text-[11px]">{s.exam_time}</td>
                    <td className="py-2 px-2.5 font-medium">{s.exam_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Section for Program Mapping */}
      {activeTab === 'programs' && parsedPrograms.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Preview Program & Coordinator Mappings: {programFileName}
                </h3>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {parsedPrograms.length} programs ready
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setParsedPrograms([]);
                  setProgramFileName('');
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>
              <button
                onClick={handleCommitPrograms}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Commit {parsedPrograms.length} Programs to Registry</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">Sr. No.</th>
                  <th className="py-2 px-2.5">Program Code</th>
                  <th className="py-2 px-2.5">Program Name</th>
                  <th className="py-2 px-2.5">School Name</th>
                  <th className="py-2 px-2.5">Primary Coordinator</th>
                  <th className="py-2 px-2.5">Alternate Coordinator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {parsedPrograms.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono text-slate-500">{item.program.sr_no}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-indigo-700">{item.program.program_code}</td>
                    <td className="py-2 px-2.5 font-medium text-slate-900">{item.program.program_name}</td>
                    <td className="py-2 px-2.5 text-slate-600">{item.program.school_name}</td>
                    <td className="py-2 px-2.5 text-slate-800">{item.primaryUser?.full_name || 'Mapped'}</td>
                    <td className="py-2 px-2.5 text-slate-800">{item.alternateUser?.full_name || 'Mapped'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
