import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, X, Meh, Flame, Calendar, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { twMerge } from 'tailwind-merge';

interface MonthChallengeProps {
  userId: string;
  onMotivationalQuote?: (quote: string) => void;
}

const MOTIVATIONAL_PHRASES = [
  '¡No te rindas! Mañana es una nueva oportunidad.',
  'El éxito es la suma de pequeños esfuerzos repetidos.',
  'La disciplina es el puente entre metas y logros.',
  'Tu único límite eres tú mismo. ¡Levántate!',
  'Un mal día no deshace tu progreso. ¡Sigue adelante!',
  'El dolor es temporal, el orgullo es para siempre.',
  'No cuentes los días, haz que los días cuenten.',
];

export const MonthChallenge: React.FC<MonthChallengeProps> = ({ userId, onMotivationalQuote }) => {
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0-6 (Sunday-Saturday)

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'user_challenges', userId), (snap) => {
      if (snap.exists()) {
        setChallenge(snap.data());
        setSelectedDays(snap.data().selectedDays || []);
      } else {
        setShowDaySelector(true);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const handleDayToggle = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const saveDaySelection = async () => {
    if (selectedDays.length < 5 || selectedDays.length > 6) {
      alert('Debes escoger entre 5 y 6 días para tu meta del mes.');
      return;
    }
    await setDoc(
      doc(db, 'user_challenges', userId),
      {
        selectedDays,
        createdAt: serverTimestamp(),
        completions: [],
        streak: 0,
      },
      { merge: true }
    );
    setShowDaySelector(false);
  };

  const toggleCompletion = async (date: Date) => {
    if (!challenge) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const completions = challenge.completions || [];
    const newCompletions = completions.includes(dateStr)
      ? completions.filter((d: string) => d !== dateStr)
      : [...completions, dateStr];

    await updateDoc(doc(db, 'user_challenges', userId), {
      completions: newCompletions,
      updatedAt: serverTimestamp(),
    });
  };

  if (loading) return null;

  return (
    <div className="w-full">
      <AnimatePresence>
        {showDaySelector && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 rounded-[2.5rem] border-2 border-primary/30 shadow-2xl shadow-primary/10 mb-8"
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Configura tu Meta
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xs">
                Escoge los 5 o 6 días de la semana en los que te comprometes a entrenar este mes.
              </p>
            </div>

            <div className="grid grid-cols-7 gap-3 mb-8">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, i) => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(i)}
                  className={twMerge(
                    'aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all group',
                    selectedDays.includes(i)
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                  )}
                >
                  <span
                    className="text-[10px] font-black uppercase tracking-widest mb-1"
                    translate="no"
                  >
                    {day}
                  </span>
                  {selectedDays.includes(i) && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <button
              onClick={saveDaySelection}
              disabled={selectedDays.length < 5 || selectedDays.length > 6}
              className="w-full py-5 bg-primary disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
              Comenzar Desafío
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showDaySelector && challenge && (
        <div className="glass-card p-6 sm:p-8 rounded-[2.5rem]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white">
                  Meta del Mes
                </h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  {format(new Date(), 'MMMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDaySelector(true)}
                className="p-2 text-slate-500 hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4">
            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((day, i) => (
              <div
                key={i}
                className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest py-2"
              >
                {day}
              </div>
            ))}

            {/* Padding for start of month (Sunday start for Calendly style) */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {days.map((day) => {
              const dayOfWeek = getDay(day);
              const isSelected = selectedDays.includes(dayOfWeek);
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCompleted = challenge.completions?.includes(dateStr);
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              const isCurrent = isToday(day);

              if (!isSelected) {
                return (
                  <div
                    key={dateStr}
                    className="aspect-square bg-white/5 rounded-xl border border-white/5 opacity-20"
                  />
                );
              }

              const isFailed = isPast && !isCompleted;

              return (
                <motion.button
                  key={dateStr}
                  whileTap={!isPast || isCurrent ? { scale: 0.9 } : undefined}
                  onClick={() => (!isPast || isCurrent) && toggleCompletion(day)}
                  className={twMerge(
                    'aspect-square flex flex-col items-center justify-center rounded-2xl border-2 transition-all relative overflow-hidden',
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : isFailed
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : isCurrent
                          ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10'
                          : 'bg-white/5 border-white/10 text-slate-500'
                  )}
                >
                  <span className="text-xs font-black">{format(day, 'd')}</span>
                  <div className="mt-1">
                    {isCompleted ? (
                      <Trophy className="w-4 h-4 fill-current" />
                    ) : isFailed ? (
                      <X className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Flame className="w-4 h-4 " />
                    ) : null}
                  </div>

                  {isFailed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 pointer-events-none">
                      <Meh className="w-8 h-8 opacity-10" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-slate-500">Logrado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-[10px] font-black uppercase text-slate-500">No Cumplido</span>
              </div>
            </div>

            {challenge.completions?.length > 0 && (
              <div className="px-6 py-3 bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                  Racha Actual
                </span>
                <span className="text-xl font-black text-primary">{challenge.streak || 0}</span>
                <Flame className="w-5 h-5 text-primary fill-current" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
