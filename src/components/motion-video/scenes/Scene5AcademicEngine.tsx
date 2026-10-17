import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Calculator, 
  FileSpreadsheet, 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  FileText,
  SlidersHorizontal,
  QrCode
} from 'lucide-react';
import { audioSynth } from '../audioSynth';

export const Scene5AcademicEngine: React.FC = () => {
  const [calculatedSGPA, setCalculatedSGPA] = useState('0.00');

  useEffect(() => {
    audioSynth.playWhoosh();
    let val = 0;
    const interval = setInterval(() => {
      val += 0.35;
      if (val >= 9.42) {
        val = 9.42;
        clearInterval(interval);
        audioSynth.playTechChime(1040);
      }
      setCalculatedSGPA(val.toFixed(2));
    }, 40);
    return () => clearInterval(interval);
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/30 text-violet-300 text-xs font-mono uppercase tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5 text-violet-400" />
          <span>Academic Framework & Computational Grade Engine</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight">
          LTPS Course Master & Tabulation Register (TR)
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          High-accuracy credit weighting, CA/EST assessment harmonization, and tamper-evident institutional registers.
        </p>
      </motion.div>

      {/* Main Grid */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: LTPS Course Credit Master */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-violet-400 font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" /> LTPS Architecture
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                COURSE MASTER
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Deep Learning & Neural Networks
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-mono">CODE: CS-801 • SEMESTER VIII</p>

            {/* LTPS Breakdown */}
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              {[
                { label: 'LECTURE', val: '3', sub: 'L-Hours' },
                { label: 'TUTORIAL', val: '1', sub: 'T-Hours' },
                { label: 'PRACTICAL', val: '2', sub: 'P-Hours' },
                { label: 'SELF-STUDY', val: '2', sub: 'S-Hours' },
              ].map((item) => (
                <div key={item.label} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-[9px] font-mono text-slate-500 block">{item.label}</span>
                  <span className="text-lg font-bold text-violet-300 font-mono">{item.val}</span>
                  <span className="text-[9px] text-slate-400 block">{item.sub}</span>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-violet-950/30 border border-violet-500/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Total Course Earned Credits:</span>
              <span className="text-sm font-extrabold text-violet-300 font-mono">5.0 CREDITS</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Assessment: CA (40) + EST (60)</span>
            <span className="text-emerald-400">Validated</span>
          </div>
        </motion.div>

        {/* Card 2: Real-Time SGPA Engine */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="rounded-2xl bg-slate-900/90 border border-emerald-500/40 p-5 backdrop-blur-xl shadow-[0_0_35px_rgba(16,185,129,0.15)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" /> Computation Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                ACTIVE PIPELINE
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Credit-Weighted SGPA Formula
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-light">
              Automatic standard deviation moderation, grace mark regulation & TNG candidate filter.
            </p>

            {/* Big SGPA Meter */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-center relative overflow-hidden">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                SEMESTER GRADE POINT AVERAGE
              </span>
              <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                {calculatedSGPA}
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono">
                  OUTSTANDING ('O')
                </span>
                <span className="text-xs text-slate-400 font-mono">100% ELIGIBLE</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>UGC 10-Point Scale Standard</span>
            <span className="text-emerald-400">Zero Error</span>
          </div>
        </motion.div>

        {/* Card 3: Tamper-Proof Tabulation Register */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Official TR Sheet
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                TAMPER-PROOF
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              University Tabulation Register
            </h3>
            <p className="text-xs text-slate-400 mb-3 font-light">
              Comprehensive institutional registry with cryptographic hash verification and QR provenance.
            </p>

            <div className="space-y-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PRN 2024-CSE-0182</span>
                <span className="text-emerald-400 font-mono font-semibold">PASS • FIRST CLASS DIST.</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PRN 2024-CSE-0183</span>
                <span className="text-emerald-400 font-mono font-semibold">PASS • FIRST CLASS DIST.</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">PRN 2024-CSE-0184</span>
                <span className="text-amber-400 font-mono font-semibold">TNG (ATTENDANCE &lt; 75%)</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-slate-950/50 border border-slate-800">
              <QrCode className="w-7 h-7 text-amber-400 shrink-0" />
              <div className="text-[10px] text-slate-400 font-mono leading-tight">
                <p className="text-slate-200 font-semibold">SHA-256 SEAL: #7f3a9e2</p>
                <p>Digital Institutional Registry Signoff</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> COE Digital Seal
            </span>
            <span>Archived to Supabase</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
