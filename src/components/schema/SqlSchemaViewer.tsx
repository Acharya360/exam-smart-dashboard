import React, { useState } from 'react';
import { SUPABASE_SQL_MIGRATION } from '../../services/sqlGenerator';
import { 
  Database, 
  Copy, 
  Check, 
  ShieldCheck, 
  Layers, 
  Table, 
  KeyRound, 
  FileCode,
  ExternalLink
} from 'lucide-react';

export const SqlSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'architecture'>('sql');

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                PostgreSQL Database Schema & Supabase RLS Policies
              </h2>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Production-Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Complete migration script including Table definitions, Foreign Key constraints, Enums, Indexes, and Row-Level Security (RLS) policies enforcing strict data isolation between Super Admins (CoE, DyCoE, ACoE) and Exam Coordinators.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('sql')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'sql' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SQL Migration Script
              </button>
              <button
                onClick={() => setActiveTab('architecture')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'architecture' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                RBAC & Isolation Matrix
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'sql' ? (
        <div className="bg-slate-950 text-slate-200 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>supabase_examtrack_migration.sql</span>
            </div>
            <span>PostgreSQL 15+ / Supabase Auth</span>
          </div>

          <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-[640px] overflow-y-auto selection:bg-indigo-700 selection:text-white">
            {SUPABASE_SQL_MIGRATION}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Table Architecture */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-100">
              <Table className="w-4 h-4 text-indigo-600" />
              <span className="text-sm">Database Tables & Foreign Keys</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold font-mono text-indigo-700">1. public.profiles</div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Linked 1:1 with <code className="bg-white px-1 py-0.5 rounded border border-slate-200">auth.users</code>. Stores name, email, department and RBAC role (<code className="text-indigo-600">COE</code>, <code className="text-indigo-600">DYCOE</code>, <code className="text-indigo-600">ACOE</code>, <code className="text-emerald-600">COORDINATOR</code>).
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold font-mono text-indigo-700">2. public.programs</div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Program master containing <code className="bg-white px-1 py-0.5 rounded border border-slate-200">program_code</code> (Unique Key), <code className="bg-white px-1 py-0.5 rounded border border-slate-200">primary_coordinator_id</code> and <code className="bg-white px-1 py-0.5 rounded border border-slate-200">alternate_coordinator_id</code> referencing <code className="text-indigo-600">profiles.id</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold font-mono text-indigo-700">3. public.exam_schedules</div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Matches exact Excel columns (PKGNo, Logic1, Course, School, Semester, PaperCode, Subject Name, Student Count, Regular, Backlog, Exam Date, Session AM/PM, Time, Type).
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold font-mono text-indigo-700">4. public.exam_tasks</div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Workflow tracking table referencing <code className="bg-white px-1 py-0.5 rounded border border-slate-200">exam_schedules.id</code>. Tracks status (Pending, In Progress, Completed, Escalated to Alternate), notes, timestamps, and escalation reason.
                </p>
              </div>
            </div>
          </div>

          {/* Security & RLS Enforcement */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-sm">Row-Level Security (RLS) Isolation Logic</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800">Super Admin Bypass</div>
                <p className="text-slate-600 text-[11px] mt-1">
                  The security definer function <code className="bg-white px-1 py-0.5 rounded border border-slate-200">public.is_super_admin()</code> evaluates if the authenticated user's role is in <code className="text-indigo-700 font-mono">('COE', 'DYCOE', 'ACOE')</code>, granting comprehensive cross-school CRUD access.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800">Coordinator Isolation Policy</div>
                <p className="text-slate-600 text-[11px] mt-1">
                  For users with role <code className="text-emerald-700 font-mono">COORDINATOR</code>, the policy strictly allows reading exam schedules and programs where:
                </p>
                <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700 mt-1">
                  primary_coordinator_id = auth.uid() OR alternate_coordinator_id = auth.uid()
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800">Upload & Ingestion Protection</div>
                <p className="text-slate-600 text-[11px] mt-1">
                  INSERT and UPDATE statements on <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">exam_schedules</code> and <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">programs</code> require <code className="text-indigo-700 font-mono">WITH CHECK (public.is_super_admin())</code>, stopping coordinator role spoofing at the PostgreSQL database level.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
