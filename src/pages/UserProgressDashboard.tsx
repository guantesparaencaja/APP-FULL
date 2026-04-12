import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Clock,
  Dumbbell,
  Calendar,
  TrendingUp,
  ChevronRight,
  Activity,
  Award,
  Target,
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { calculateStreak, StreakInfo } from '../utils/streakCalculator';
import { ACHIEVEMENTS, Achievement } from '../utils/achievements';
import { TrainingCalendar } from '../components/TrainingCalendar';

interface WorkoutRecord {
  id: string;
  timestamp: any;
  durationSeconds: number;
  exercises: any[];
  caloriesEstimate: number;
}

export const UserProgressDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [streak, setStreak] = useState<StreakInfo>({
    currentStreak: 0,
    bestStreak: 0,
    lastWorkoutDate: null,
  });
  const [punchesToday, setPunchesToday] = useState<number | null>(null);
  const [punchInput, setPunchInput] = useState('');
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    // ✅ onSnapshot para workout_history en tiempo real
    const q = query(
      collection(db, 'workout_history'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const unsubWorkouts = onSnapshot(
      q,
      (querySnapshot) => {
        const workoutData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkoutRecord[];
        setWorkouts(workoutData);
        const dates = workoutData.filter((w) => w.timestamp).map((w) => w.timestamp.toDate());
        setStreak(calculateStreak(dates));
      },
      (err) => {
        console.error('Error en listener workout_history:', err);
      }
    );

    // ✅ onSnapshot para achievements en tiempo real
    const aq = query(collection(db, 'user_achievements'), where('userId', '==', userId));
    const unsubAchievements = onSnapshot(
      aq,
      (snap) => {
        setUnlockedAchievements(snap.docs.map((doc) => doc.data().achievementId));
      },
      (err) => {
        console.error('Error en listener achievements:', err);
      }
    );

    // getDocs para datos de inicialización (plan semanal y punches_today)
    const initData = async () => {
      try {
        const pq = query(collection(db, 'weekly_plans'), where('userId', '==', userId), limit(1));
        const planSnapshot = await getDocs(pq);
        setWeeklyPlan(planSnapshot.docs.map((doc) => doc.data().combos || []).flat());

        if (auth.currentUser?.email) {
          const uSnap = await getDocs(
            query(collection(db, 'users'), where('email', '==', auth.currentUser.email))
          );
          if (!uSnap.empty) {
            setPunchesToday(uSnap.docs[0].data().punches_today || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching init data:', error);
      } finally {
        setLoading(false);
      }
    };
    initData();

    return () => {
      unsubWorkouts();
      unsubAchievements();
    };
  }, []);

  const totalMinutes = Math.floor(workouts.reduce((acc, w) => acc + w.durationSeconds, 0) / 60);
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((acc, w) => acc + w.exercises.length, 0);

  const handleRegisterPunches = async () => {
    if (!user || !punchInput) return;
    try {
      // Very basic implementation: just store it in the user doc
      const uSnap = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0];
        const current = uDoc.data().punches_today || 0;
        await updateDoc(uDoc.ref, { punches_today: current + parseInt(punchInput) });
        setPunchesToday(current + parseInt(punchInput));
        setPunchInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
      <header className="mb-8">
        <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-2 block">
          Tu Progreso
        </span>
        <h1 className="text-4xl font-black uppercase tracking-tight">Panel de Control</h1>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Flame className="text-orange-500" />}
          label="Días en el Ring"
          value={`${streak.currentStreak} días`}
        />
        <StatCard
          icon={<Clock className="text-blue-500" />}
          label="Minutos Totales"
          value={`${totalMinutes}`}
        />
        <StatCard
          icon={<Dumbbell className="text-emerald-500" />}
          label="Entrenamientos"
          value={`${totalWorkouts}`}
        />
        <StatCard
          icon={<Trophy className="text-yellow-500" />}
          label="Logros"
          value={`${unlockedAchievements.length}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Calendar & Achievements */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Historial de Asistencias (Calendario)
              </h2>
            </div>
            <TrainingCalendar
              workoutDates={workouts.filter((w) => w.timestamp).map((w) => w.timestamp.toDate())}
            />
          </section>

          {/* Nuevo Plan Semanal */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Plan de Entrenamiento Semanal
              </h2>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              {weeklyPlan.length === 0 ? (
                <div className="text-center text-slate-500 py-6">
                  <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">
                    Tu entrenador aún no ha asignado un plan semanal específico.
                  </p>
                  <p className="text-[10px] uppercase tracking-widest mt-1">
                    Trabaja en la licencia de saberes
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {weeklyPlan.map((item, i) => (
                    <li key={i} className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl">
                      <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">
                        {i + 1}
                      </div>
                      <span className="font-bold text-sm text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Logros Desbloqueados
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {unlockedAchievements.length} / {ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {ACHIEVEMENTS.map((achievement) => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${
                      isUnlocked
                        ? 'bg-slate-900 border-primary/30'
                        : 'bg-slate-900/30 border-slate-800 opacity-40 grayscale'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isUnlocked ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-600'}`}
                    >
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-tight leading-tight mb-1">
                      {achievement.title}
                    </h3>
                    <p className="text-[8px] text-slate-500 leading-tight">
                      {achievement.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Recent Activity & Streak */}
        <div className="space-y-8">
          <section className="bg-gradient-to-br from-primary/20 to-slate-900 p-6 rounded-3xl border border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />
            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Racha de Entrenamiento
            </h3>
            <div className="text-5xl font-black mb-2 flex items-baseline gap-2">
              {streak.currentStreak} <span className="text-sm text-slate-400">días seguidos</span>
            </div>
            {streak.currentStreak >= 7 && (
              <div className="mt-2 inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-500/30">
                <Trophy className="w-3 h-3" /> ¡Racha Semanal!
              </div>
            )}
            {streak.currentStreak >= 30 && (
              <div className="mt-2 inline-flex items-center gap-1 bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-500/30">
                <Flame className="w-3 h-3" /> ¡Leyenda Activa (1 mes)!
              </div>
            )}
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4 border-t border-slate-700/50 pt-2">
              Récord Personal: <span className="text-white">{streak.bestStreak} días</span>
            </p>
          </section>

          {/* Golpe Counter - Mejorado para Producción */}
          <section className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
            
            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              Contador de Golpes
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">
              Volumen de hoy: Saco / Sombra
            </p>
            
            <div className="flex gap-2 mb-6">
              <input
                type="number"
                placeholder="Ej. 500"
                value={punchInput}
                onChange={(e) => setPunchInput(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white w-full outline-none focus:border-primary transition-all font-black"
                onKeyPress={(e) => e.key === 'Enter' && handleRegisterPunches()}
              />
              <button
                onClick={handleRegisterPunches}
                className="bg-primary text-white font-black px-6 rounded-xl hover:bg-primary-dark active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] mb-1 block">
                    Total Acumulado Hoy
                  </span>
                  <span className="font-black text-3xl text-white tracking-tighter">
                    {punchesToday?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="text-right">
                   <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <Target className="w-5 h-5 text-primary" />
                   </div>
                </div>
              </div>

              {/* Progress visual indicator (basado en meta diaria sugerida de 2000 golpes) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-500">
                  <span>Meta Diaria Sugerida</span>
                  <span>{Math.min(100, Math.round(((punchesToday || 0) / 2000) * 100))}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((punchesToday || 0) / 2000) * 100)}%` }}
                    className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Actividad Reciente
            </h2>
            <div className="space-y-4">
              {workouts.slice(0, 5).map((workout) => (
                <div
                  key={workout.id}
                  className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-sm">Entrenamiento de Boxeo</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                      {workout.timestamp
                        ?.toDate()
                        .toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{' '}
                      • {Math.floor(workout.durationSeconds / 60)} min
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-primary">
                      +{workout.caloriesEstimate} kcal
                    </span>
                  </div>
                </div>
              ))}
              {workouts.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">Aún no has entrenado.</p>
                  <p className="text-xs uppercase font-black tracking-widest mt-2">
                    ¡Comienza hoy!
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 flex flex-col gap-3">
    <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center">{icon}</div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  </div>
);
