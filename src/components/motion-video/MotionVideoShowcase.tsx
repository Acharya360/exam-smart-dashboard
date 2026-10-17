import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  X,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Radio,
  Sliders,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { ParticleCanvas } from './ParticleCanvas';
import { audioSynth } from './audioSynth';
import { exportMotionVideo } from './videoExporter';

// Scene components
import { Scene1Prologue } from './scenes/Scene1Prologue';
import { Scene2CommandCenter } from './scenes/Scene2CommandCenter';
import { Scene3WorkflowPipeline } from './scenes/Scene3WorkflowPipeline';
import { Scene4SecurityRBAC } from './scenes/Scene4SecurityRBAC';
import { Scene5AcademicEngine } from './scenes/Scene5AcademicEngine';
import { Scene6GrandFinale } from './scenes/Scene6GrandFinale';

interface MotionVideoShowcaseProps {
  onClose?: () => void;
  onNavigateToDashboard?: () => void;
  isModal?: boolean;
}

interface ChapterDef {
  id: number;
  title: string;
  shortTitle: string;
  duration: number; // in seconds
  themeColor: 'violet' | 'indigo' | 'emerald' | 'amber' | 'cyan' | 'gold';
  subtitle: string;
}

const CHAPTERS: ChapterDef[] = [
  {
    id: 0,
    title: '01 • Institutional Vision & Identity',
    shortTitle: 'Prologue',
    duration: 6.5,
    themeColor: 'violet',
    subtitle: 'Acharya360 ExamTrack: Autonomous higher education examination command center and operations suite.',
  },
  {
    id: 1,
    title: '02 • Central Command & Live Telemetry',
    shortTitle: 'Command Pulse',
    duration: 7.0,
    themeColor: 'indigo',
    subtitle: 'Real-time multi-school scheduling telemetry, live candidate volumes, and instant concurrency synchronization.',
  },
  {
    id: 2,
    title: '03 • Automated 4-Phase Task Lifecycle',
    shortTitle: '4-Phase Suite',
    duration: 7.5,
    themeColor: 'emerald',
    subtitle: 'Automated milestone generation: Secure vault printing, room seating plans, invigilation duty rosters, and booklet receipts.',
  },
  {
    id: 3,
    title: '04 • 4-Tier RBAC & Fail-Safe Auto-Escalation',
    shortTitle: 'RBAC & RLS',
    duration: 7.0,
    themeColor: 'amber',
    subtitle: 'Strict separation of duties between University Super Admins and Program Coordinators with automated instant hand-off.',
  },
  {
    id: 4,
    title: '05 • LTPS Academic Engine & TR Tabulation',
    shortTitle: 'Academic Engine',
    duration: 7.0,
    themeColor: 'cyan',
    subtitle: 'Comprehensive LTPS credit weighting, Continuous Assessment (CA) calculation, and cryptographic Tabulation Registers.',
  },
  {
    id: 5,
    title: '06 • Grand Finale & Institutional Impact',
    shortTitle: 'Grand Finale',
    duration: 8.5,
    themeColor: 'gold',
    subtitle: 'Empowering Controller of Examinations with zero error margins and unmatched institutional excellence.',
  },
];

const TOTAL_DURATION = CHAPTERS.reduce((acc, c) => acc + c.duration, 0);

export const MotionVideoShowcase: React.FC<MotionVideoShowcaseProps> = ({
  onClose,
  onNavigateToDashboard,
  isModal = false,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; text: string }>({ percent: 0, text: '' });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChapter = CHAPTERS[currentChapterIndex] || CHAPTERS[0];

  // Helper to format time as 00:00.00
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  };

  // Compute chapter start times
  const chapterStartTimes = useRef<number[]>([]);
  if (chapterStartTimes.current.length === 0) {
    let accumulated = 0;
    chapterStartTimes.current = CHAPTERS.map((c) => {
      const start = accumulated;
      accumulated += c.duration;
      return start;
    });
  }

  // Jump to specific chapter
  const goToChapter = useCallback((index: number) => {
    const safeIdx = Math.max(0, Math.min(index, CHAPTERS.length - 1));
    setCurrentChapterIndex(safeIdx);
    setElapsedTime(chapterStartTimes.current[safeIdx]);
    setIsPlaying(true);
    audioSynth.playWhoosh();
  }, []);

  // Jump by delta seconds
  const seekDelta = useCallback((delta: number) => {
    setElapsedTime((prev) => {
      const next = Math.max(0, Math.min(prev + delta, TOTAL_DURATION));
      // find corresponding chapter
      for (let i = CHAPTERS.length - 1; i >= 0; i--) {
        if (next >= chapterStartTimes.current[i]) {
          setCurrentChapterIndex(i);
          break;
        }
      }
      return next;
    });
  }, []);

  // Timeline auto-advance loop
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimestamp) / 1000) * playbackSpeed;
      lastTimestamp = now;

      setElapsedTime((prev) => {
        const next = prev + deltaSec;
        if (next >= TOTAL_DURATION) {
          setIsPlaying(false);
          return TOTAL_DURATION;
        }

        // Check if chapter changed
        const nextChapterIdx = chapterStartTimes.current.findIndex(
          (startTime, idx) => {
            const chapterDuration = CHAPTERS[idx].duration;
            return next >= startTime && next < startTime + chapterDuration;
          }
        );

        if (nextChapterIdx !== -1 && nextChapterIdx !== currentChapterIndex) {
          setCurrentChapterIndex(nextChapterIdx);
        }

        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, currentChapterIndex]);

  // Handle Mute toggle
  const toggleMute = () => {
    const muted = audioSynth.toggleMute();
    setIsMuted(muted);
  };

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekDelta(-3);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekDelta(3);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isModal && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModal, onClose, seekDelta]);

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  // Handle Video Export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setIsPlaying(false);
      await exportMotionVideo({
        fps: 60,
        durationSeconds: 15,
        onProgress: (percent, text) => {
          setExportProgress({ percent, text });
        },
      });
    } catch (err) {
      console.error('Export error:', err);
      alert('Could not record video: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full min-h-[580px] bg-slate-950 text-white overflow-hidden flex flex-col justify-between font-sans select-none ${
        isModal ? 'fixed inset-0 z-50' : 'rounded-3xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* 60fps Ambient Particle Background Canvas */}
      <ParticleCanvas themeColor={activeChapter.themeColor} intensity={1} showGrid={true} />

      {/* Cinematic Top Letterbox Bar & HUD */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
        transition={{ duration: 0.3 }}
        className="relative z-30 flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent backdrop-blur-sm border-b border-slate-800/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-300 text-xs font-mono font-bold">
            <Tv className="w-3.5 h-3.5 text-violet-400" />
            <span>4K 60FPS REEL</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACHARYA360 EXAMTRACK CINEMATIC EXPERIENCE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Video Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold font-mono transition-colors cursor-pointer disabled:opacity-50"
            title="Download real WebM video file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export Video'}</span>
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 transition-colors ml-1 cursor-pointer"
              title="Close Showcase"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Main Cinematic Stage Body (Active Scene) */}
      <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {currentChapterIndex === 0 && (
            <motion.div
              key="scene-0"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene1Prologue />
            </motion.div>
          )}

          {currentChapterIndex === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene2CommandCenter />
            </motion.div>
          )}

          {currentChapterIndex === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene3WorkflowPipeline />
            </motion.div>
          )}

          {currentChapterIndex === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene4SecurityRBAC />
            </motion.div>
          )}

          {currentChapterIndex === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene5AcademicEngine />
            </motion.div>
          )}

          {currentChapterIndex === 5 && (
            <motion.div
              key="scene-5"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full"
            >
              <Scene6GrandFinale
                onReplay={() => {
                  goToChapter(0);
                  setIsPlaying(true);
                }}
                onEnterDashboard={() => {
                  if (onNavigateToDashboard) onNavigateToDashboard();
                  else if (onClose) onClose();
                }}
                onExportVideo={handleExport}
                isExporting={isExporting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Synchronized Voiceover / Subtitles Banner */}
      <div className="relative z-20 px-6 py-2 text-center pointer-events-none">
        <motion.div
          key={activeChapter.subtitle}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="inline-block px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700/60 backdrop-blur-md shadow-lg"
        >
          <p className="text-xs sm:text-sm text-slate-200 font-medium tracking-wide">
            {activeChapter.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Cinematic Bottom Controls Deck */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 30 }}
        transition={{ duration: 0.3 }}
        className="relative z-30 px-4 sm:px-8 py-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent backdrop-blur-md border-t border-slate-800/50 space-y-3"
      >
        {/* Scrubber Timeline Bar */}
        <div className="relative group cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
          const targetSeconds = ratio * TOTAL_DURATION;
          setElapsedTime(targetSeconds);
          for (let i = CHAPTERS.length - 1; i >= 0; i--) {
            if (targetSeconds >= chapterStartTimes.current[i]) {
              setCurrentChapterIndex(i);
              break;
            }
          }
        }}>
          {/* Track background */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden transition-all group-hover:h-2">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-amber-400 rounded-full transition-all duration-75"
              style={{ width: `${(elapsedTime / TOTAL_DURATION) * 100}%` }}
            />
          </div>

          {/* Chapter Split Markers */}
          {chapterStartTimes.current.map((st, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-0.5 bg-slate-950/80 pointer-events-none"
              style={{ left: `${(st / TOTAL_DURATION) * 100}%` }}
            />
          ))}
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Left: Playback buttons & Timecode */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => seekDelta(-5)}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Rewind 5s"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => seekDelta(5)}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Forward 5s"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                goToChapter(0);
                setIsPlaying(true);
              }}
              className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Replay from start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="font-mono text-slate-300 font-medium pl-1">
              <span>{formatTime(elapsedTime)}</span>
              <span className="text-slate-600 mx-1.5">/</span>
              <span className="text-slate-500">{formatTime(TOTAL_DURATION)}</span>
            </div>
          </div>

          {/* Center: Chapter Pills */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {CHAPTERS.map((ch, idx) => {
              const isActive = currentChapterIndex === idx;
              return (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {ch.shortTitle}
                </button>
              );
            })}
          </div>

          {/* Right: Playback Speed & Status */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
                const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
                setPlaybackSpeed(speeds[nextIdx]);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Cycle Speed"
            >
              {playbackSpeed}x SPEED
            </button>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>{activeChapter.title}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Export Progress Modal Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/30 animate-spin">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Rendering HD 60FPS Video...</h3>
            <p className="text-xs text-slate-400">{exportProgress.text || 'Compiling video stream frames...'}</p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-200"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400">{exportProgress.percent}% Complete</span>
          </div>
        </div>
      )}
    </div>
  );
};
