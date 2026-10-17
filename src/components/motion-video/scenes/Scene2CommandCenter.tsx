import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, 
  CalendarDays, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Radio, 
  ArrowUpRight 
} from 'lucide-react';
import { audioSynth } from '../audioSynth';

export const Scene2CommandCenter: React.FC = () => {
  const [counts, setCounts] = useState({ exams: 0, students: 0, readiness: 0, vaults: 0 });

  useEffect(() => {
    audioSynth.playWhoosh();
    const duration = 1200;
    const startTime = performance.now();

    const animateCounters = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

      setCounts({
        exams: Math.floor(easeProgress * 482),
        students: Math.floor(easeProgress * 45280),
        readiness: Number((easeProgress * 99.4).toFixed(1)),
        vaults: 0,
      });

      if (progress < 1) {
        requestAnimationFrame(animateCounters);
      } else {
        audioSynth.playTechChime(920);
      }
    };

    requestAnimationFrame(animateCounters);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 md:px-8 select-none">
      {/* Scene Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-mono uppercase tracking-wider mb-2">
          <Radio className="w-3.5 h-3.5 text-indigo-400 animate-ping" />
          <span>Central Command • Live Institutional Pulse</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight">
          Real-Time University Examination Telemetry
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          Instant multi-field cross-school oversight with zero-latency synchronization.
        </p>
      </motion.div>

      {/* Main 3D Floating Command Grid */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 18 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 90, delay: 0.2 }}
        className="relative z-10 w-full max-w-5xl bg-slate-900/80 border border-slate-700/70 rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Top telemetry bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-5 gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold uppercase tracking-wider">ACTIVE CONCURRENCY: NORMAL</span>
            <span className="text-slate-500 hidden sm:inline">|</span>
            <span className="text-slate-400 font-mono hidden sm:inline">SESSION: AM • 10:30 AM TO 12:30 PM</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">SERVER CLUSTERS: HEALTHY</span>
            <span className="px-2 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-700/50">RLS POLICIES: 100% ENFORCED</span>
          </div>
        </div>

        {/* 4 Core KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              label: 'Scheduled Papers',
              value: counts.exams.toLocaleString(),
              note: 'Across 14 Academic Schools',
              icon: CalendarDays,
              color: 'from-violet-500 to-indigo-600',
              border: 'border-violet-500/40',
            },
            {
              label: 'Registered Candidates',
              value: counts.students.toLocaleString(),
              note: 'Verified with PRN Registry',
              icon: Users,
              color: 'from-blue-500 to-cyan-600',
              border: 'border-blue-500/40',
            },
            {
              label: 'Milestone Readiness',
              value: `${counts.readiness}%`,
              note: 'On-schedule Task Completion',
              icon: CheckCircle2,
              color: 'from-emerald-500 to-teal-600',
              border: 'border-emerald-500/40',
            },
            {
              label: 'Vault Discrepancies',
              value: 'ZERO',
              note: '100% Secure Cryptographic Signoff',
              icon: ShieldAlert,
              color: 'from-amber-500 to-rose-600',
              border: 'border-amber-500/40',
            },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 + idx * 0.1, duration: 0.4 }}
              className={`p-4 rounded-xl bg-slate-950/60 border ${item.border} relative overflow-hidden group`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium text-slate-300">{item.label}</span>
                <div className={`p-1.5 rounded-lg bg-gradient-to-tr ${item.color} text-white`}>
                  <item.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                {item.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>{item.note}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live Academic Schools Progress Ticker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="uppercase font-semibold tracking-wider text-slate-300">Live Departmental Readiness Stream</span>
            <span>4 OF 4 ZONES SYNCHRONIZED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { school: 'School of Engineering', prog: 'B.TECH (CSE, AI, ECE)', status: '100% Ready', color: 'bg-emerald-500' },
              { school: 'School of Management', prog: 'MBA, BBA, FINANCE', status: '98% Ready', color: 'bg-emerald-400' },
              { school: 'School of Design', prog: 'B.DES, ANIMATION', status: '96% Ready', color: 'bg-violet-400' },
              { school: 'School of Pharmacy', prog: 'B.PHARM, PHARM.D', status: '100% Ready', color: 'bg-emerald-500' },
            ].map((sch, i) => (
              <motion.div
                key={sch.school}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.65 + i * 0.1 }}
                className="px-3 py-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-200">{sch.school}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{sch.prog}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${sch.color}`} />
                    {sch.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
