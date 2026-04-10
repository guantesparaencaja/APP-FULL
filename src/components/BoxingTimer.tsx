import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BoxingTimerProps {
  roundDurationSec: number;
  restDurationSec: number;
  roundsCount: number;
  onRoundEnd?: (round: number) => void;
  onSessionEnd?: () => void;
}

export const BoxingTimer: React.FC<BoxingTimerProps> = ({
  roundDurationSec,
  restDurationSec,
  roundsCount,
  onRoundEnd,
  onSessionEnd,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(roundDurationSec);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

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
      // Fallback to beep if file missing or blocked
      playBeep(1000, 0.8);
    });
  }, [playBeep]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (!isResting) {
            if (next === 10) {
              speak('¡Últimos diez segundos, ráfaga final!');
            } else if (next > 10 && next % 30 === 0 && next !== roundDurationSec) {
              const randomPhrase =
                motivationPhrases[Math.floor(Math.random() * motivationPhrases.length)];
              speak(randomPhrase);
            }
          }
          return next;
        });
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isResting) {
        // Round ended
        playBell();
        if (currentRound < roundsCount) {
          speak('¡Tiempo! Descansa y respira.');
          setIsResting(true);
          setTimeLeft(restDurationSec);
          onRoundEnd?.(currentRound);
        } else {
          setIsActive(false);
          setIsFinished(true);
          speak('¡Sesión terminada, excelente entrenamiento!');
          onSessionEnd?.();
        }
      } else {
        // Rest ended
        playBell();
        speak(`¡Round ${currentRound + 1}, a pelear!`);
        setIsResting(false);
        setCurrentRound((prev) => prev + 1);
        setTimeLeft(roundDurationSec);
      }
    }

    return () => clearInterval(interval);
  }, [
    isActive,
    timeLeft,
    isResting,
    currentRound,
    roundsCount,
    roundDurationSec,
    restDurationSec,
    onRoundEnd,
    onSessionEnd,
    playBell,
  ]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setIsResting(false);
    setCurrentRound(1);
    setTimeLeft(roundDurationSec);
    setIsFinished(false);
  };

  const skipStep = () => {
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      <div className="flex flex-col items-center mb-10">
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

      <div className="flex items-center justify-center gap-6">
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
