import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  KeyRound, 
  AlertTriangle, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Fingerprint, 
  Database,
  UserCheck
} from 'lucide-react';
import { audioSynth } from '../audioSynth';

export const Scene4SecurityRBAC: React.FC = () => {
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    audioSynth.playWhoosh();
    const timer = setTimeout(() => {
      setEscalated(true);
      audioSynth.playTechChime(580);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 md:px-8 select-none">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-mono uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>4-Tier University Governance & Zero-Trust RLS</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight">
          Role-Based Access & Auto-Escalation Protocol
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          Strict separation of duties between University Super Admins and Program Coordinators with automated fail-over.
        </p>
      </motion.div>

      {/* Main Split Grid */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 4-Tier RBAC Rings */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-violet-400" />
                Institutional RBAC Hierarchy
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
                SUPABASE RLS ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              {[
                { role: 'COE', title: 'Controller of Examinations', scope: 'Full University Oversight, Timetable Signoff & Final Arbitration', badge: 'SUPER ADMIN', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
                { role: 'DYCOE', title: 'Deputy Controller of Examinations', scope: 'Staff Governance, Passwords, Mass Excel Ingestion', badge: 'SUPER ADMIN', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                { role: 'ACOE', title: 'Assistant Controller of Examinations', scope: 'Daily Timetable Operations & Coordinator Mapping Audits', badge: 'SUPER ADMIN', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
                { role: 'COORDINATOR', title: 'Department Program Coordinator', scope: 'Assigned Programs Only: Task Milestones & Safe Escalations', badge: 'PROGRAM SCOPED', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
              ].map((tier, idx) => (
                <motion.div
                  key={tier.role}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono font-bold text-sm text-white">
                      {tier.role}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{tier.title}</p>
                      <p className="text-[11px] text-slate-400 font-light">{tier.scope}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${tier.color} shrink-0 ml-2`}>
                    {tier.badge}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Database className="w-3.5 h-3.5" /> Row-Level Security: 100% Gated
            </span>
            <span>Zero Cross-Program Leakage</span>
          </div>
        </motion.div>

        {/* Right Column: Live Auto-Escalation Simulation */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-6 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase text-slate-300 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Fail-Safe Escalation Circuit
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                escalated 
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/40' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/40'
              }`}>
                {escalated ? 'INCIDENT HANDOFF ACTIVE' : 'MONITORING DEADLINES'}
              </span>
            </div>

            {/* Simulated Live Event */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-400 font-mono">TASK #TSK-8921 • B.TECH CSE</span>
                  <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[10px] font-mono">
                    DUE IN 2 HOURS
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Question Paper Printing & Secure Vault Packaging
                </h4>
                <p className="text-xs text-slate-400">
                  Primary Coordinator flagged mechanical risograph delay at 09:15 AM.
                </p>
              </div>

              {/* Dynamic Escalation Handoff Animation */}
              <div className="relative py-2 flex items-center justify-between gap-3">
                <div className="flex-1 p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-center">
                  <p className="text-[10px] text-slate-500 font-mono">PRIMARY COORDINATOR</p>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">Prof. R. Sharma</p>
                  <span className="text-[10px] text-rose-400 font-mono">BLOCKED</span>
                </div>

                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                  <span className="text-[9px] font-mono text-amber-400 mt-1">AUTO TRANSFER</span>
                </div>

                <div className={`flex-1 p-3 rounded-lg border text-center transition-all duration-500 ${
                  escalated 
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-950/50 border-slate-800'
                }`}>
                  <p className="text-[10px] text-slate-500 font-mono">ALTERNATE COORDINATOR</p>
                  <p className="text-xs font-semibold text-slate-200 mt-0.5">Dr. A. Verma</p>
                  <span className={`text-[10px] font-mono ${escalated ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                    {escalated ? 'ASSIGNED & ACTIVE' : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Rationale Quote */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-300 font-mono">
                <span className="text-amber-400 font-semibold">Mandatory Rationale Logged: </span>
                "High-speed vault printer spooler jammed; routed to COE Secondary High-Security Vault Room B."
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-emerald-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Full Audit Trail Recorded
            </span>
            <span className="text-slate-500">Incident Resolved In 4 Min</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
