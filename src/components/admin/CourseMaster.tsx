import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { CourseMaster } from '../../types';
import { parseCourseMasterExcel, downloadCourseMasterTemplate } from '../../services/excelParser';
import {
  BookOpen,
  UploadCloud,
  Download,
  Search,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

export const CourseMasterUI: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [courses, setCourses] = useState<CourseMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCourses = async () => {
    const data = await db.getCourseMaster();
    setCourses(data);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadSuccess(null);
    setUploadErrors([]);
    setIsUploading(true);

    const buffer = await file.arrayBuffer();
    const result = await parseCourseMasterExcel(buffer);

    if (!result.success || result.data.length === 0) {
      setUploadErrors(result.errors.length ? result.errors : ['No valid data found in file.']);
      setIsUploading(false);
      return;
    }

    if (result.errors.length > 0) {
      setUploadErrors(result.errors);
    }

    const upsertResult = await db.upsertCourseMaster(result.data);
    setIsUploading(false);

    if (upsertResult.error) {
      setUploadErrors(prev => [...prev, `DB Error: ${upsertResult.error}`]);
    } else {
      setUploadSuccess(`Successfully processed ${upsertResult.inserted} course records.`);
      fetchCourses();
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this course configuration?')) {
      await db.deleteCourseMasterRecord(id);
      fetchCourses();
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.cm_course_name.toLowerCase().includes(q) ||
      c.paper_code.toLowerCase().includes(q) ||
      c.sm_subject_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Course Master Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage program syllabus, credits (L-T-P-S) and assessment marks criteria
          </p>
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCourseMasterTemplate}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors shadow-xs border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Import Courses'}
            </button>
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Upload Feedback */}
      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{uploadSuccess}</span>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto">
          <div className="flex items-center gap-2 text-rose-800 font-bold mb-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            Upload Issues Found
          </div>
          <ul className="list-disc pl-5 text-rose-700 space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{courses.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Courses</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {new Set(courses.map(c => c.cm_course_name)).size}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique Programs</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {new Set(courses.map(c => c.paper_code)).size}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Unique Subjects</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subject or paper code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-700 w-12">#</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700 min-w-[200px]">Program & Subject</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700">Paper Code</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700 whitespace-nowrap">Sem</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700" title="Lecture-Tutorial-Practical-Skills">L-T-P-S</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700">Cr.</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Total Max</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700">Total Min</th>
                <th className="text-center px-2 py-3 font-bold text-slate-700 border-l border-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c, idx) => (
                <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-4 py-3 text-slate-500">{c.sr_no || idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{c.sm_subject_name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[250px]" title={c.cm_course_name}>
                      {c.cm_course_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                      {c.paper_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{c.semester}</td>
                  <td className="px-2 py-3 text-center text-slate-500 font-mono tracking-widest">
                    {c.l}-{c.t}-{c.p}-{c.s}
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-indigo-700 bg-indigo-50/50">
                    {c.total_credits}
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-slate-800 border-l border-slate-100">
                    {c.total_marks}
                  </td>
                  <td className="px-2 py-3 text-center font-bold text-rose-700 bg-rose-50/30">
                    {c.total_marks_min}
                  </td>
                  <td className="px-2 py-3 text-center border-l border-slate-100">
                    {isSuperAdmin ? (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No courses found.</p>
                      {isSuperAdmin && <p className="text-[10px] mt-1">Upload an Excel file to get started.</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
