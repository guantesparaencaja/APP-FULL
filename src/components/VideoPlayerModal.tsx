/**
 * VideoPlayerModal — GPTE v2.0
 * Reproductor compacto: sin scroll, todo visible, fullscreen nativo.
 * Aplica a Saberes (BoxeoModule) y Workouts.
 */
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw,
  ChevronRight, X, AlertCircle, CheckCircle, ChevronDown,
} from 'lucide-react';

export interface VideoPlayerModalProps {
  title: string;
  subtitle?: string;
  level?: string;
  levelColor?: string;
  duration?: string;
  videoUrl?: string;
  keyPoints?: string[];
  commonErrors?: string[];
  onClose: () => void;
  onNext?: () => void;
  extraActions?: React.ReactNode;
}

export function VideoPlayerModal({
  title,
  subtitle,
  level,
  levelColor = 'text-primary',
  duration,
  videoUrl,
  keyPoints = [],
  commonErrors = [],
  onClose,
  onNext,
  extraActions,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('0:00');
  const [totalTime, setTotalTime] = useState('0:00');

  // Auto-play cuando el modal abre
  useEffect(() => {
    const v = videoRef.current;
    if (v && videoUrl) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }
    return () => { v?.pause(); };
  }, [videoUrl]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const retry = () => {
    setError(false);
    const v = videoRef.current;
    if (v) { v.load(); v.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const goFullscreen = async () => {
    const el = videoRef.current as any;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      const s = window.screen as any;
      if (s?.orientation?.lock) await s.orientation.lock('landscape').catch(() => {});
    } catch (_) {}
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    setCurrentTime(formatTime(v.currentTime));
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) setTotalTime(formatTime(videoRef.current.duration));
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur-md flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-sm uppercase tracking-tight truncate leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {level && (
              <span className={`text-[9px] font-black px-2 py-1 rounded-full bg-white/10 border border-white/20 uppercase ${levelColor}`}>
                {level}
              </span>
            )}
            {duration && (
              <span className="text-[9px] font-black text-slate-400 bg-white/10 px-2 py-1 rounded-full border border-white/10">
                {duration}
              </span>
            )}
          </div>
        </div>

        {/* ── Video area ── */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-0">
          {!videoUrl ? (
            <div className="text-center p-8">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-bold">Video no disponible todavía</p>
            </div>
          ) : error ? (
            <div className="text-center p-8">
              <AlertCircle className="w-10 h-10 text-red-500/60 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-bold mb-4">Error al cargar el video</p>
              <button
                onClick={retry}
                className="bg-primary text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                loop
                className="max-h-full max-w-full object-contain cursor-pointer"
                style={{ maxHeight: 'calc(100vh - 220px)' }}
                onError={() => setError(true)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onClick={goFullscreen}
              />

              {/* Play overlay tap */}
              <button
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                onClick={togglePlay}
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-5 border border-white/20">
                  {playing
                    ? <Pause className="w-8 h-8 text-white" />
                    : <Play className="w-8 h-8 text-white fill-white" />}
                </div>
              </button>
            </>
          )}
        </div>

        {/* ── Controls bar ── */}
        {videoUrl && !error && (
          <div className="bg-black/90 px-4 pt-2 pb-1 flex-shrink-0">
            {/* Progress bar */}
            <div
              className="w-full h-1 bg-white/20 rounded-full mb-2 cursor-pointer"
              onClick={seek}
            >
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="text-white p-1.5 rounded-full hover:bg-white/10">
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>
                <button onClick={toggleMute} className="text-white p-1.5 rounded-full hover:bg-white/10">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-[10px] text-slate-400 font-bold">{currentTime} / {totalTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={retry} className="text-white p-1.5 rounded-full hover:bg-white/10">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={goFullscreen} className="text-white p-1.5 rounded-full hover:bg-white/10">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Info panel compacto ── */}
        <div className="bg-slate-950 flex-shrink-0 border-t border-slate-800">
          <div className="px-4 py-3 space-y-2">

            {/* Key points — chips horizontales */}
            {keyPoints.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">
                  ✓ Puntos Clave
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {keyPoints.map((p, i) => (
                    <span
                      key={i}
                      className="bg-primary/10 text-primary text-[9px] font-black px-2.5 py-1 rounded-full border border-primary/20"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Common errors — collapsible */}
            {commonErrors.length > 0 && (
              <div>
                <button
                  onClick={() => setShowErrors(v => !v)}
                  className="w-full flex items-center justify-between bg-red-500/5 border border-red-500/15 rounded-xl px-3 py-2 text-red-400"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest">⚠ Errores Comunes</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showErrors ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showErrors && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-1">
                        {commonErrors.map((e, i) => (
                          <p key={i} className="text-[10px] text-slate-400 flex items-start gap-2 leading-snug">
                            <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span> {e}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions row */}
            <div className="flex gap-2 pt-1">
              {extraActions}
              {onNext && (
                <button
                  onClick={onNext}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                >
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
