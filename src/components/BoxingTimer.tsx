import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Bell, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BoxingTimerProps {
  roundDurationSec: number;
  restDurationSec: number;
  roundsCount: number;
  onRoundEnd?: (round: number) => void;
  onSessionEnd?: () => void;
  comboCallerEnabled?: boolean;
  comboPool?: string[];
}

const COMBO_CALLER_STORAGE_KEY = 'gpte_combo_caller_enabled';

const DEFAULT_COMBO_POOL = [
  '1 2 / 2 1 / 5 6 -- 3 4 4 3',
  '2 1 / 5 6 - 4 3 P 2 1 2',
  'DJ 2 / - P 1 2 3 / 3',
  '6 3 2 / - PE 5 3 2 P',
  '2 PI 1 PD 1 / 2 / PA 3 2 1 4',
  '6 3 / 5 3 2 - 2 1 P',
  '6 3 / 5 3 2 - 2 DR P',
  'DUP 2 / 1 0 - / 3 2 2 1 PA',
  '1 1 8 1 1 2 / 9 3 - 5 6 PA 1',
  '2 2 7 2 2 1 / 1 0 4 - 5 6 PA 2',
  '7 8 - / PE 5 6 4 3 / PA',
  '8 7 - / PE 6 5 4 3 / PA',
];

/** Max combo length allowed per round bracket (progressive difficulty) */
function getMaxComboHits(round: number, totalRounds: number): number {
  const progress = round / totalRounds;
  if (progress <= 0.25) return 5;
  if (progress <= 0.5) return 7;
  if (progress <= 0.75) return 10;
  return 14;
}

/** Tokenize a combo string into individual tokens (handles multi-char tokens) */
function tokenizeCombo(combo: string): string[] {
  const TOKENS = ['DCR', 'DUPR', 'DUP', 'PDE', 'DJ', 'DR', 'DG', 'PA', 'PI', 'PD', 'PC', 'PE', '10', '--'];
  const tokens: string[] = [];
  let i = 0;
  const s = combo.replace(/\s+/g, '');
  while (i < s.length) {
    let matched = false;
    for (const t of TOKENS) {
      if (s.substring(i, i + t.length) === t) {
        tokens.push(t);
        i += t.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push(s[i]);
      i++;
    }
  }
  return tokens;
}

/** Translate numeric combo notation into spoken Spanish words */
export function traducirCombo(combo: string): string {
  const MAP: Record<string, string> = {
    '1': 'Jab',
    '2': 'Recto',
    '3': 'Gancho',
    '4': 'Croche',
    '5': 'Uppercut izquierdo',
    '6': 'Uppercut derecho',
    '7': 'Jab al cuerpo',
    '8': 'Recto al cuerpo',
    '9': 'Gancho al cuerpo',
    '10': 'Croche al cuerpo',
    'DJ': 'Doble jab',
    'DR': 'Doble recto',
    'DG': 'Doble gancho',
    'DCR': 'Doble croche',
    'DUP': 'Doble uppercut izquierdo',
    'DUPR': 'Doble uppercut derecho',
    'PA': 'Paso atrás',
    'PI': 'Paso izquierda',
    'PD': 'Paso derecha',
    'PDE': 'Paso adelante',
    'PC': 'Paso cruzado',
    'PE': 'Péndulo',
    'P': 'Pivote',
    '/': 'Cabeceo',
    '-': 'Rolly',
    '--': 'Doble roly',
  };
  const tokens = tokenizeCombo(combo);
  return tokens.map((t) => MAP[t] || t).join(', ');
}

function randomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const BoxingTimer: React.FC<BoxingTimerProps> = ({
  roundDurationSec,
  restDurationSec,
  roundsCount,
  onRoundEnd,
  onSessionEnd,
  comboCallerEnabled,
  comboPool,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(roundDurationSec);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [comboCallerOn, setComboCallerOn] = useState(() => {
    if (comboCallerEnabled === false) return false;
    if (comboCallerEnabled === true) return true;
    try {
      return localStorage.getItem(COMBO_CALLER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [lastCombo, setLastCombo] = useState<string | null>(null);

  const motivationPhrases = [
    '¡Vamos, con fuerza!',
    '¡Sigue así, no pares!',
    '¡Un esfuerzo más, tú puedes!',
    '¡Mantén la guardia arriba!',
    '¡Respira y golpea!',
    '¡Excelente trabajo, sigue!',
    '¡Concéntrate en la técnica!',
    '¡No te rindas ahora!',
  ];

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.15;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((frequency = 880, duration = 0.5) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
      console.log('audio:beep-fallback');
    } catch (e) {
      console.warn('audio:beep-failed', e);
    }
  }, []);

  const playBell = useCallback(() => {
    const audio = new Audio('/assets/sounds/campana.mp3');
    audio.play().catch(() => {
      playBeep(1000, 0.8);
    });
  }, [playBeep]);

  const heavyHaptic = useCallback(async () => {
    try {
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch (e) {
      console.warn('haptic:heavy-failed', e);
    }
  }, []);

  const lightHaptic = useCallback(async () => {
    try {
      if ((window as any).Capacitor?.isNativePlatform?.()) {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (e) {
      console.warn('haptic:light-failed', e);
    }
  }, []);

  const speakRef = useRef(speak);
  speakRef.current = speak;

  const motivationRef = useRef(motivationPhrases);
  motivationRef.current = motivationPhrases;

  const startedAtMsRef = useRef<number>(0);
  const durationTargetRef = useRef<number>(roundDurationSec);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentRoundRef = useRef<number>(1);
  const isRestingRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(false);
  const spokenTenRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastComboRef = useRef<string | null>(null);

  currentRoundRef.current = currentRound;
  isRestingRef.current = isResting;
  isActiveRef.current = isActive;

  // Persist combo caller preference
  const toggleComboCaller = useCallback(() => {
    setComboCallerOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COMBO_CALLER_STORAGE_KEY, String(next));
      } catch { /* noop */ }
      return next;
    });
  }, []);

  // Pick a combo from the pool filtered by max hits for current round
  const pickCombo = useCallback((): string => {
    const pool = (comboPool && comboPool.length > 0) ? comboPool : DEFAULT_COMBO_POOL;
    const maxHits = getMaxComboHits(currentRoundRef.current, roundsCount);
    const eligible = pool.filter((c) => {
      const hits = tokenizeCombo(c).length;
      return hits <= maxHits;
    });
    if (eligible.length === 0) return pool[Math.floor(Math.random() * pool.length)];
    return eligible[Math.floor(Math.random() * eligible.length)];
  }, [comboPool, roundsCount]);

  // Schedule next combo call (12-18 seconds from now)
  const scheduleNextCombo = useCallback(() => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    if (!isActiveRef.current || isRestingRef.current || !comboCallerOn) return;
    comboTimerRef.current = setTimeout(() => {
      if (!isActiveRef.current || isRestingRef.current) return;
      const combo = pickCombo();
      lastComboRef.current = combo;
      setLastCombo(combo);
      speak(traducirCombo(combo));
      lightHaptic();
      scheduleNextCombo();
    }, randomInterval(12, 18) * 1000);
  }, [comboCallerOn, pickCombo, speak, lightHaptic]);

  // Cancel combo timer
  const cancelComboTimer = useCallback(() => {
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && isActive) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('wakeLock:request-failed', e);
    }
  }, [isActive]);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {
      console.warn('wakeLock:release-failed', e);
    }
  }, []);

  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isActiveRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAtMsRef.current) / 1000);
      const remaining = Math.max(0, durationTargetRef.current - elapsed);
      setTimeLeft(remaining);
    }, 250);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle round/rest transitions when time hits 0
  useEffect(() => {
    if (!isActive || timeLeft > 0) return;

    if (!isResting) {
      cancelComboTimer();
      playBell();
      heavyHaptic();
      if (currentRound < roundsCount) {
        speak('¡Tiempo! Descansa y respira.');
        setIsResting(true);
        durationTargetRef.current = restDurationSec;
        startedAtMsRef.current = Date.now();
        setTimeLeft(restDurationSec);
        onRoundEnd?.(currentRound);
      } else {
        setIsActive(false);
        stopTick();
        releaseWakeLock();
        setIsFinished(true);
        speak('¡Sesión terminada, excelente entrenamiento!');
        onSessionEnd?.();
      }
    } else {
      playBell();
      heavyHaptic();
      speak(`¡Round ${currentRound + 1}, a pelear!`);
      setIsResting(false);
      setCurrentRound((prev) => prev + 1);
      durationTargetRef.current = roundDurationSec;
      startedAtMsRef.current = Date.now();
      setTimeLeft(roundDurationSec);
    }
  }, [isActive, timeLeft, isResting, currentRound, roundsCount, roundDurationSec, restDurationSec, onRoundEnd, onSessionEnd, playBell, speak, heavyHaptic, stopTick, releaseWakeLock, cancelComboTimer]);

  // Speak/haptic effect — fires AFTER state updates, outside setState
  useEffect(() => {
    if (!isActive || isResting || isFinished) return;
    if (timeLeft === 0) return;

    if (timeLeft === 10 && !spokenTenRef.current) {
      spokenTenRef.current = true;
      speak('¡Últimos diez segundos, ráfaga final!');
      lightHaptic();
    } else if (timeLeft > 10 && timeLeft % 30 === 0 && timeLeft !== roundDurationSec) {
      if (!comboCallerOn) {
        const phrase = motivationRef.current[Math.floor(Math.random() * motivationRef.current.length)];
        speak(phrase);
      }
    }
  }, [timeLeft, isActive, isResting, isFinished, roundDurationSec, speak, lightHaptic, comboCallerOn]);

  // Start combo caller schedule when round becomes active
  useEffect(() => {
    if (isActive && !isResting && !isFinished && comboCallerOn) {
      scheduleNextCombo();
    } else {
      cancelComboTimer();
    }
    return () => cancelComboTimer();
  }, [isActive, isResting, isFinished, comboCallerOn, scheduleNextCombo, cancelComboTimer]);

  // Reset spokenTenRef when entering a new round
  useEffect(() => {
    spokenTenRef.current = false;
  }, [currentRound, isResting]);

  // Visibility change listener — recalculate on tab focus
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        const elapsed = Math.floor((Date.now() - startedAtMsRef.current) / 1000);
        const remaining = Math.max(0, durationTargetRef.current - elapsed);
        setTimeLeft(remaining);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Wake lock management
  useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isActive, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleWakeLockVisibility = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleWakeLockVisibility);
    return () => document.removeEventListener('visibilitychange', handleWakeLockVisibility);
  }, [requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTick();
      releaseWakeLock();
      cancelComboTimer();
    };
  }, [stopTick, releaseWakeLock, cancelComboTimer]);

  const toggleTimer = () => {
    if (isActive) {
      stopTick();
      cancelComboTimer();
      releaseWakeLock();
      setIsActive(false);
    } else {
      setIsActive(true);
      durationTargetRef.current = isResting ? restDurationSec : (currentRound === 1 && !isResting ? roundDurationSec : durationTargetRef.current);
      startedAtMsRef.current = Date.now() - ((durationTargetRef.current - timeLeft) * 1000);
      startTick();
      requestWakeLock();
    }
  };

  const resetTimer = () => {
    stopTick();
    cancelComboTimer();
    releaseWakeLock();
    setIsActive(false);
    setIsResting(false);
    setCurrentRound(1);
    setTimeLeft(roundDurationSec);
    setIsFinished(false);
    setLastCombo(null);
    durationTargetRef.current = roundDurationSec;
    startedAtMsRef.current = 0;
    currentRoundRef.current = 1;
    isRestingRef.current = false;
    isActiveRef.current = false;
    spokenTenRef.current = false;
    lastComboRef.current = null;
  };

  const skipStep = () => {
    durationTargetRef.current = 0;
    startedAtMsRef.current = Date.now();
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showComboCaller = comboCallerEnabled !== false;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-8 transition-colors duration-500 ${
        isFinished
          ? 'bg-slate-900'
          : isResting
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
      } border shadow-2xl`}
    >
      <div className="flex justify-between items-center mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Round
          </span>
          <span className="text-4xl font-black text-white">
            {currentRound} / {roundsCount}
          </span>
        </div>
        <div
          className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            isResting
              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
              : 'bg-red-500/20 text-red-500 border-red-500/30'
          }`}
        >
          {isResting ? 'Descanso' : 'Trabajo'}
        </div>
      </div>

      <div className="flex flex-col items-center mb-6">
        <motion.div
          key={timeLeft}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-8xl font-black tabular-nums leading-none ${
            isResting ? 'text-emerald-500' : 'text-white'
          }`}
        >
          {formatTime(timeLeft)}
        </motion.div>
      </div>

      {/* Combo Caller display */}
      {showComboCaller && !isResting && !isFinished && lastCombo && isActive && (
        <motion.div
          key={lastCombo + currentRound}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <Swords className="w-4 h-4 text-primary" />
          <span className="text-sm font-black uppercase tracking-widest text-primary">
            {traducirCombo(lastCombo)}
          </span>
          <span className="text-[10px] text-slate-500 ml-1">({lastCombo})</span>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-6 mb-6">
        <button
          onClick={resetTimer}
          className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={toggleTimer}
          className={`w-20 h-20 flex items-center justify-center rounded-full shadow-xl transition-all ${
            isActive ? 'bg-slate-800 text-white' : 'bg-primary text-white scale-110'
          }`}
        >
          {isActive ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={skipStep}
          className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Combo Caller toggle */}
      {showComboCaller && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={toggleComboCaller}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
              comboCallerOn
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-white/5 text-slate-500 border-white/10'
            }`}
          >
            <Swords className="w-3 h-3" />
            Modo Combos
          </button>
        </div>
      )}

      {isFinished && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-center p-6"
        >
          <Bell className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
            ¡Sesión Terminada!
          </h3>
          <button
            onClick={resetTimer}
            className="mt-4 text-xs font-black uppercase tracking-widest text-primary hover:underline"
          >
            Reiniciar Temporizador
          </button>
        </motion.div>
      )}
    </div>
  );
};
