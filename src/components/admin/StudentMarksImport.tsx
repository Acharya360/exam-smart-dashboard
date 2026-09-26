import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { StudentMark } from '../../types';
import { parseStudentMarksExcel, downloadStudentMarksTemplate } from '../../services/excelParser';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  Search,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Filter,
} from 'lucide-react';

export const StudentMarksImport: React.FC = () => {
  const { isSuperAdmin, currentUser } = useAuth();
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [assessmentFilter, setAssessmentFilter] = useState<string>('ALL');
  const [paperFilter, setPaperFilter] = useState<string>('ALL');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMarks = async () => {
    const data = await db.getStudentMarks();
    setMarks(data);
  };

  useEffect(() => {
    fetchMarks();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadSuccess(null);
    setUploadErrors([]);
    setIsUploading(true);

    const buffer = await file.arrayBuffer();
    const result = await parseStudentMarksExcel(buffer);

    if (!result.success || result.data.length === 0) {
      setUploadErrors(result.errors.length ? result.errors : ['No valid data found in file.']);
      setIsUploading(false);
      return;
    }

    if (result.errors.length > 0) {
      setUploadErrors(result.errors);
    }

    // Call upsert
    const upsertResult = await db.upsertStudentMarks(result.data, currentUser.id);
    setIsUploading(false);

    if (upsertResult.error) {
      setUploadErrors(prev => [...prev, `DB Error: ${upsertResult.error}`]);
    } else {
      setUploadSuccess(`Successfully processed (inserted or updated) ${upsertResult.total} student mark records.`);
      fetchMarks();
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student mark record?')) {
      await db.deleteStudentMark(id);
      fetchMarks();
    }
  };

  // Derived filter options
  const uniqueAssessments = Array.from(new Set(marks.map(m => m.assessment_type))).sort();
  const uniquePapers = Array.from(new Set(marks.map(m => m.paper_code))).sort();

  const filteredMarks = marks.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      m.prn.toLowerCase().includes(q) || 
      m.student_name.toLowerCase().includes(q) ||
      m.sm_subject_name.toLowerCase().includes(q);
      
    const matchesAssessment = assessmentFilter === 'ALL' || m.assessment_type === assessmentFilter;
    const matchesPaper = paperFilter === 'ALL' || m.paper_code === paperFilter;
    
    return matchesSearch && matchesAssessment && matchesPaper;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Student Marks Import
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload subject-wise and component-wise marks (CA1, CA2, CA3, ESE). Existing records update automatically.
          </p>
        </div>
        
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadStudentMarksTemplate}
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
              {isUploading ? 'Uploading...' : 'Import Marks'}
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

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PRN, Student Name, or Subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
          >
            <option value="ALL">All Types</option>
            {uniqueAssessments.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={paperFilter}
            onChange={(e) => setPaperFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-32"
          >
            <option value="ALL">All Papers</option>
            {uniquePapers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-bold text-slate-700 w-32">PRN / Name</th>
                <th className="text-left px-4 py-3 font-bold text-slate-700 min-w-[200px]">Program & Subject</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700">Type</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200">Theory</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700">Pract</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700">Skills</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 bg-slate-200/50">Total</th>
                <th className="text-center px-3 py-3 font-bold text-slate-700 border-l border-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMarks.map((m) => {
                const total = m.theory + m.practical + m.skills;
                return (
                  <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-bold text-indigo-700 font-mono">{m.prn}</div>
                      <div className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate max-w-[120px]">{m.student_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600">
                          {m.paper_code}
                        </span>
                        {m.sm_subject_name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[250px]" title={m.cm_course_name}>
                        {m.cm_course_name} (Sem {m.semester})
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        m.assessment_type === 'ESE' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {m.assessment_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono border-l border-slate-100">
                      {m.theory > 0 ? m.theory : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {m.practical > 0 ? m.practical : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {m.skills > 0 ? m.skills : '-'}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-800 bg-slate-50">
                      {total}
                    </td>
                    <td className="px-3 py-3 text-center border-l border-slate-100">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMarks.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mb-2" />
                      <p>No marks records found.</p>
                      {isSuperAdmin && <p className="text-[10px] mt-1">Upload an Excel file to get started. Duplicate uploads will automatically update existing records.</p>}
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
