import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, ShieldCheck, Sparkles, Cpu, Layers } from 'lucide-react';
import { audioSynth } from '../audioSynth';

export const Scene1Prologue: React.FC = () => {
  useEffect(() => {
    audioSynth.playBassDrop();
    const timer = setTimeout(() => {
      audioSynth.playTechChime(750);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-4 overflow-hidden select-none">
      {/* Background radial lens glow */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.8, 1.2, 1], opacity: [0.4, 0.8, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-violet-600/25 via-indigo-500/20 to-amber-500/15 blur-3xl pointer-events-none"
      />

      {/* Rotating Cyber Ring */}
      <motion.div
        initial={{ rotate: 0, scale: 0.7, opacity: 0 }}
        animate={{ rotate: 360, scale: 1, opacity: 0.85 }}
        transition={{ rotate: { duration: 24, repeat: Infinity, ease: 'linear' }, scale: { duration: 1.2, ease: 'easeOut' }, opacity: { duration: 1 } }}
        className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full border border-violet-500/30 border-dashed pointer-events-none"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-violet-400 rounded-full shadow-[0_0_12px_#a855f7]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-[0_0_12px_#f59e0b]" />
      </motion.div>

      {/* Central Emblem Reveal */}
      <motion.div
        initial={{ scale: 0, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 100, delay: 0.15 }}
        className="relative z-10 mb-6 group cursor-pointer"
      >
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-gradient-to-tr from-violet-700 via-indigo-600 to-violet-500 p-1 shadow-[0_0_40px_rgba(124,58,237,0.5)] border border-violet-400/40 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-slate-950/80 backdrop-blur-md flex items-center justify-center relative overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(255,255,255,0.4)_360deg)] pointer-events-none"
            />
            <GraduationCap className="w-12 h-12 md:w-14 md:h-14 text-violet-300 drop-shadow-[0_0_15px_rgba(167,139,250,0.8)]" />
          </div>
        </div>

        {/* Orbiting micro chip badge */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-2 -right-3 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-lg flex items-center gap-1"
        >
          <Sparkles className="w-2.5 h-2.5 fill-current" /> ERP 3.0
        </motion.div>
      </motion.div>

      {/* Main Kinetic Title */}
      <div className="relative z-10 space-y-2">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-400/25 text-violet-300 text-xs font-semibold tracking-widest uppercase mb-1 backdrop-blur-sm"
        >
          <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          Acharya University Examination Operations
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight"
        >
          <span className="text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">Exam</span>
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(167,139,250,0.6)]">
            Track
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="max-w-2xl text-slate-300 text-sm sm:text-base md:text-lg font-light leading-relaxed mx-auto px-4"
        >
          Autonomous Timetable Coordination, Automated 4-Phase Task Lifecycle & Fail-Safe Multi-Tier University Governance.
        </motion.p>
      </div>

      {/* Staggered Feature Badges */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3 max-w-xl mx-auto"
      >
        {[
          { label: 'Real-Time Command Pulse', icon: Layers, color: 'text-violet-400' },
          { label: '4-Phase Auto Task Suites', icon: Sparkles, color: 'text-amber-400' },
          { label: 'Supabase RLS Vault', icon: ShieldCheck, color: 'text-emerald-400' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 + idx * 0.15, duration: 0.4 }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-slate-200 text-xs font-medium backdrop-blur-md shadow-md hover:border-slate-500 transition-colors"
          >
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <span>{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
