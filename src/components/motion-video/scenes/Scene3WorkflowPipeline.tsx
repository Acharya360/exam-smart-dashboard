import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  FileCheck, 
  Grid3X3, 
  UserCheck, 
  ScanLine, 
  CheckCircle, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck 
} from 'lucide-react';
import { audioSynth } from '../audioSynth';

export const Scene3WorkflowPipeline: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    audioSynth.playWhoosh();
    const intervals = [
      setTimeout(() => { setActiveStep(1); audioSynth.playTechChime(640); }, 600),
      setTimeout(() => { setActiveStep(2); audioSynth.playTechChime(780); }, 1300),
      setTimeout(() => { setActiveStep(3); audioSynth.playTechChime(920); }, 2000),
      setTimeout(() => { setActiveStep(4); audioSynth.playTechChime(1100); }, 2700),
    ];
    return () => intervals.forEach(clearTimeout);
  }, []);

  const phases = [
    {
      step: 1,
      title: 'Phase 1: Question Paper Vault & Packaging',
      desc: 'High-speed encrypted printing, dual-custody tamper-proof vault sealing & COE master dispatch authorization.',
      icon: Lock,
      color: 'from-amber-500 to-orange-600',
      accent: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
      tag: 'MILITARY-GRADE VAULT',
    },
    {
      step: 2,
      title: 'Phase 2: Seating Plan & Roll Labels',
      desc: 'Automated randomized desk indexing, hall capacity balancing & barcode roll sticker distribution across test centers.',
      icon: Grid3X3,
      color: 'from-blue-500 to-indigo-600',
      accent: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
      tag: 'DYNAMIC HALL ENGINE',
    },
    {
      step: 3,
      title: 'Phase 3: Invigilation Duty Assignment',
      desc: 'Faculty workload balancing, conflict-of-interest checking, automated notification SMS/Email & standby roster reserve.',
      icon: UserCheck,
      color: 'from-violet-500 to-purple-600',
      accent: 'border-violet-500/50 text-violet-400 bg-violet-500/10',
      tag: 'DUTY ACKNOWLEDGEMENT',
    },
    {
      step: 4,
      title: 'Phase 4: Booklet & Counterfoil Verification',
      desc: 'High-speed barcode scanner tally, attendance cross-verification, bundle packet serialization & safe return receipt.',
      icon: ScanLine,
      color: 'from-emerald-500 to-teal-600',
      accent: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
      tag: 'CRYPTOGRAPHIC AUDIT',
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 md:px-8 select-none">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-6 z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-mono uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automated Examination Lifecycle</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white tracking-tight">
          The 4-Phase Operational Task Suite
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl mx-auto">
          Every committed timetable schedule automatically spawns a verified zero-failure execution pipeline.
        </p>
      </motion.div>

      {/* Pipeline Cards Grid */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {phases.map((phase) => {
          const isUnlocked = activeStep >= phase.step;
          const isCurrent = activeStep === phase.step;

          return (
            <motion.div
              key={phase.step}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ 
                opacity: isUnlocked ? 1 : 0.4, 
                y: 0, 
                scale: isCurrent ? 1.03 : 1 
              }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-2xl p-5 bg-slate-900/90 border transition-all duration-300 backdrop-blur-xl ${
                isCurrent 
                  ? 'border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50' 
                  : isUnlocked 
                  ? 'border-slate-700 shadow-lg' 
                  : 'border-slate-800'
              }`}
            >
              {/* Header Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border ${phase.accent}`}>
                  {phase.tag}
                </span>
                {isUnlocked ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <span className="text-[11px] font-mono text-slate-600">LOCKED</span>
                )}
              </div>

              {/* Icon Orb */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${phase.color} p-0.5 mb-4 shadow-md flex items-center justify-center`}>
                <div className="w-full h-full rounded-[10px] bg-slate-950/70 flex items-center justify-center">
                  <phase.icon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-base font-bold text-white mb-2 leading-snug">
                {phase.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-light">
                {phase.desc}
              </p>

              {/* Laser scanline effect for active item */}
              {isCurrent && (
                <motion.div
                  animate={{ y: [0, 180, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none opacity-60"
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Connecting Flow Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 mt-6 flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-950/60 px-4 py-2 rounded-full border border-slate-800"
      >
        <span className="text-emerald-400 font-semibold">SCHEDULE COMMITTED</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-violet-400 font-semibold">4 MILESTONES INITIALIZED</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-amber-400 font-semibold">COORDINATOR ASSIGNED</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-emerald-300 font-semibold">ZERO ROOM FOR DELAY</span>
      </motion.div>
    </div>
  );
};
