/**
 * RestTimer.tsx — Countdown timer for rest periods between exercises.
 * Timestamp-based (no drift on tab blur), side-effects outside setState.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';

interface RestTimerProps {
  seconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  className?: string;
}

export function RestTimer({ seconds: initialSeconds, onComplete, autoStart = false, className = '' }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(autoStart);
  const [finished, setFinished] = useState(false);

  const endAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const tick = useCallback(() => {
    if (!endAtRef.current) return;
    const left = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      setRunning(false);
      setFinished(true);
      endAtRef.current = null;
      onCompleteRef.current?.();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 250);
  }, [tick]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Pause / resume on tab visibility
  useEffect(() => {
    const onVis = () => {
      if (!running || !endAtRef.current) return;
      if (document.hidden) {
        stopInterval();
      } else {
        startInterval();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [running, startInterval, stopInterval]);

  // Start / stop interval based on running state
  useEffect(() => {
    if (running && endAtRef.current) {
      startInterval();
    } else {
      stopInterval();
    }
    return stopInterval;
  }, [running, startInterval, stopInterval]);

  // Reset when initialSeconds changes
  useEffect(() => {
    stopInterval();
    endAtRef.current = null;
    setRemaining(initialSeconds);
    setRunning(false);
    setFinished(false);
  }, [initialSeconds, stopInterval]);

  const handleStart = () => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
    setFinished(false);
  };

  const handlePause = () => {
    if (endAtRef.current) {
      setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
      endAtRef.current = null;
    }
    setRunning(false);
  };

  const handleReset = () => {
    stopInterval();
    endAtRef.current = null;
    setRemaining(initialSeconds);
    setRunning(false);
    setFinished(false);
  };

  const handleSkip = () => {
    stopInterval();
    endAtRef.current = null;
    setRemaining(0);
    setRunning(false);
    setFinished(true);
    onCompleteRef.current?.();
  };

  const progress = 1 - remaining / initialSeconds;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6"
            className="text-slate-200 dark:text-slate-700" />
          <motion.circle
            cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeLinecap="round"
            className={finished ? 'text-emerald-500' : remaining <= 10 ? 'text-red-500' : 'text-primary'}
            stroke="currentColor"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black tabular-nums ${finished ? 'text-emerald-500' : remaining <= 10 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
            {formatTime(remaining)}
          </span>
          {finished && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Listo</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleReset}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Reiniciar"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button type="button" onClick={running ? handlePause : handleStart}
          className={`px-4 py-2 rounded-xl font-bold text-sm text-white transition-colors ${running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:bg-primary/90'}`}
        >
          {running ? <Pause className="w-4 h-4 inline mr-1" /> : <Play className="w-4 h-4 inline mr-1" />}
          {running ? 'Pausar' : 'Iniciar'}
        </button>
        <button type="button" onClick={handleSkip}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Saltar descanso"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
