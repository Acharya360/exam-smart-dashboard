import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Download, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  Zap, 
  GraduationCap 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioSynth } from '../audioSynth';

interface GrandFinaleProps {
  onReplay: () => void;
  onEnterDashboard: () => void;
  onExportVideo?: () => void;
  isExporting?: boolean;
}

export const Scene6GrandFinale: React.FC<GrandFinaleProps> = ({
  onReplay,
  onEnterDashboard,
  onExportVideo,
  isExporting = false,
}) => {
  useEffect(() => {
    audioSynth.playFanfare();

    // Trigger golden and violet confetti explosion
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'],
      });
    } catch {}
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center px-4 md:px-8 select-none text-center">
      {/* Background celebration glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-600/30 via-amber-500/25 to-emerald-500/20 blur-3xl pointer-events-none"
      />

      {/* Emblem Crown */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 100 }}
        className="relative z-10 mb-4"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-tr from-amber-400 via-violet-600 to-indigo-500 p-1 shadow-[0_0_50px_rgba(245,158,11,0.5)] border border-amber-300/50 flex items-center justify-center mx-auto">
          <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur-md flex items-center justify-center">
            <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-amber-300 drop-shadow-[0_0_20px_#f59e0b]" />
          </div>
        </div>
      </motion.div>

      {/* Hero Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 max-w-3xl space-y-2 mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          The Gold Standard of Higher Education Operations
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight">
          Institutional Excellence.{' '}
          <span className="bg-gradient-to-r from-amber-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
            Zero Margin for Error.
          </span>
        </h2>

        <p className="text-slate-300 text-sm sm:text-base font-light max-w-xl mx-auto leading-relaxed">
          Empowering the Controller of Examinations and Academic Leadership with autonomous task orchestration and rock-solid compliance.
        </p>
      </motion.div>

      {/* Key Metric Highlights in 3 Pillars */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full mx-auto mb-8"
      >
        {[
          { label: 'Autonomous Task Suites', desc: '100% Scheduled Auto-Milestones', icon: Zap, color: 'text-amber-400' },
          { label: 'Multi-Tier RLS Security', desc: 'Zero Cross-Program Leakage', icon: ShieldCheck, color: 'text-violet-400' },
          { label: 'Instant Audit Integrity', desc: 'Full Real-Time Transparency', icon: CheckCircle2, color: 'text-emerald-400' },
        ].map((pillar) => (
          <div
            key={pillar.label}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60 backdrop-blur-md text-left"
          >
            <pillar.icon className={`w-5 h-5 ${pillar.color} mb-1.5`} />
            <h4 className="text-xs font-bold text-white">{pillar.label}</h4>
            <p className="text-[11px] text-slate-400 font-light mt-0.5">{pillar.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Interactive Action Buttons */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="relative z-10 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          onClick={onEnterDashboard}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span>Launch Central Command</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onReplay}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 text-slate-200 font-medium text-sm transition-all duration-200 hover:text-white cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Replay Video</span>
        </button>

        {onExportVideo && (
          <button
            onClick={onExportVideo}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Recording HD Video...' : 'Export Video (.webm)'}</span>
          </button>
        )}
      </motion.div>
    </div>
  );
};
