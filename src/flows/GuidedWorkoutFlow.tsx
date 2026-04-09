import React, { useState, useEffect, useCallback } from 'react';
import { Play, X, ChevronRight, Trophy, Clock, Dumbbell, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExerciseVideoPlayer } from '../components/ExerciseVideoPlayer';
import { ExerciseDetailCard } from '../components/ExerciseDetailCard';
import { BoxingTimer } from '../components/BoxingTimer';
import { saveWorkoutHistory } from '../utils/firebaseHelpers';
import { auth, db } from '../lib/firebase';
import { checkAndUnlockAchievements } from '../utils/achievements';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Exercise {
  id: string;
  title: string;
  videoUrl: string;
  series: number;
  reps: number | string;
  estSec: number;
  description?: string;
  muscles?: string[];
  commonMistakes?: string[];
}

interface Routine {
  id: string;
  title: string;
  exercises: Exercise[];
}

interface GuidedWorkoutFlowProps {
  routine: Routine;
  onClose: () => void;
  onFinish: (stats: { totalTime: number; completedExercises: number }) => void;
}

type FlowState = 'idle' | 'preparing' | 'active' | 'finished';

export const GuidedWorkoutFlow: React.FC<GuidedWorkoutFlowProps> = ({
  routine,
  onClose,
  onFinish
}) => {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [preparationCountdown, setPreparationCountdown] = useState(5);
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  const currentExercise = routine.exercises[currentExerciseIndex];

  const startWorkout = () => {
    setFlowState('preparing');
    setPreparationCountdown(5);
  };

  const nextExercise = useCallback(() => {
    if (currentExerciseIndex < routine.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      finishWorkout();
    }
  }, [currentExerciseIndex, routine.exercises.length]);

  const finishWorkout = useCallback(async () => {
    const endTime = Date.now();
    const duration = startTime ? Math.floor((endTime - startTime) / 1000) : 0;
    setTotalTimeElapsed(duration);
    setFlowState('finished');

    // Save to Firestore
    const userId = auth.currentUser?.uid || 'guest_user';
    await saveWorkoutHistory({
      userId,
      durationSeconds: duration,
      exercises: routine.exercises.map(ex => ({
        id: ex.id,
        title: ex.title,
        sets: ex.series,
        reps: ex.reps,
        durationSeconds: ex.estSec
      }))
    });

    // Check for achievements
    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'workout_history'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const allWorkouts = snapshot.docs.map(doc => doc.data());
        
        const stats = {
          totalWorkouts: allWorkouts.length,
          totalMinutes: Math.floor(allWorkouts.reduce((acc, w) => acc + (w.durationSeconds || 0), 0) / 60),
          totalRounds: allWorkouts.reduce((acc, w) => acc + (w.exercises?.length || 0), 0),
          exercisesCompleted: allWorkouts.reduce((acc, w) => acc + (w.exercises?.length || 0), 0)
        };

        const unlocked = await checkAndUnlockAchievements(userId, stats);
        if (unlocked.length > 0) {
          console.log('Nuevos logros desbloqueados:', unlocked.map(a => a.title));
          // You could show a toast or modal here
        }
      } catch (error) {
        console.error('Error checking achievements after workout:', error);
      }
    }

    onFinish({
      totalTime: duration,
      completedExercises: routine.exercises.length
    });
  }, [startTime, routine.exercises, onFinish]);

  // Preparation Countdown Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (flowState === 'preparing' && preparationCountdown > 0) {
      timer = setInterval(() => {
        setPreparationCountdown(prev => prev - 1);
      }, 1000);
    } else if (flowState === 'preparing' && preparationCountdown === 0) {
      setFlowState('active');
      setStartTime(Date.now());
    }
    return () => clearInterval(timer);
  }, [flowState, preparationCountdown]);

  const skipExercise = () => {
    nextExercise();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto">
      <AnimatePresence mode="wait">
        {/* IDLE STATE: Routine Overview */}
        {flowState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col p-6 max-w-2xl mx-auto"
          >
            <header className="flex items-center justify-between mb-8">
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-primary">Resumen de Rutina</span>
              <div className="w-10" />
            </header>

            <div className="flex-1">
              <h1 className="text-4xl font-black uppercase tracking-tight mb-2">{routine.title}</h1>
              <div className="flex items-center gap-4 text-slate-400 mb-8">
                <div className="flex items-center gap-1">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-sm font-bold">{routine.exercises.length} Ejercicios</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    ~{Math.ceil(routine.exercises.reduce((acc, ex) => acc + ex.estSec, 0) / 60)} min
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-12">
                {routine.exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    <span className="text-xl font-black text-slate-700">{i + 1}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{ex.title}</h3>
                      <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{ex.series} series x {ex.reps}</p>
                    </div>
                    <div className="text-primary font-bold text-xs">{ex.estSec}s</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startWorkout}
              className="w-full bg-primary text-white font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-current" />
              Comenzar Entrenamiento
            </button>
          </motion.div>
        )}

        {/* PREPARING STATE: Countdown */}
        {flowState === 'preparing' && (
          <motion.div
            key="preparing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="min-h-screen flex flex-col items-center justify-center p-6"
          >
            <span className="text-primary font-black uppercase tracking-[0.3em] mb-4">Prepárate</span>
            <motion.div
              key={preparationCountdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[12rem] font-black leading-none"
            >
              {preparationCountdown}
            </motion.div>
          </motion.div>
        )}

        {/* ACTIVE STATE: Exercise Flow */}
        {flowState === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col p-4 md:p-8 max-w-4xl mx-auto"
          >
            <header className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Ejercicio {currentExerciseIndex + 1} de {routine.exercises.length}</span>
                <h2 className="text-xl font-black uppercase tracking-tight">{currentExercise.title}</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <ExerciseVideoPlayer
                  videoUrl={currentExercise.videoUrl}
                  title={currentExercise.title}
                  muscles={currentExercise.muscles}
                  series={currentExercise.series}
                  reps={currentExercise.reps}
                />
                <ExerciseDetailCard
                  id={currentExercise.id}
                  title={currentExercise.title}
                  description={currentExercise.description || "Realiza el ejercicio manteniendo la técnica correcta."}
                  muscles={currentExercise.muscles || []}
                  series={currentExercise.series}
                  reps={currentExercise.reps}
                  commonMistakes={currentExercise.commonMistakes}
                />
              </div>

              <div className="flex flex-col gap-6">
                <BoxingTimer
                  key={currentExercise.id} // Re-mount timer for each exercise
                  roundDurationSec={currentExercise.estSec}
                  restDurationSec={15} // 15s rest between exercises
                  roundsCount={1}
                  onCompleteSession={nextExercise}
                />
                
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Controles de Sesión</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={skipExercise}
                      className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all"
                    >
                      Omitir
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={finishWorkout}
                      className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-4 rounded-2xl transition-all border border-red-500/20"
                    >
                      Finalizar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* FINISHED STATE: Summary */}
        {flowState === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6 border-2 border-primary/30">
              <Trophy className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">¡Entrenamiento Completado!</h1>
            <p className="text-slate-400 mb-12">Has demostrado una gran disciplina hoy.</p>

            <div className="grid grid-cols-2 gap-6 w-full max-w-md mb-12">
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Tiempo Total</span>
                <span className="text-2xl font-black text-white">{Math.floor(totalTimeElapsed / 60)}:{(totalTimeElapsed % 60).toString().padStart(2, '0')}</span>
              </div>
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Ejercicios</span>
                <span className="text-2xl font-black text-white">{routine.exercises.length}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full max-w-md bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Volver al inicio
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
