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
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
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
  const user = useStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    const userId = String(user.id);
    const load = async () => {
      const { data: wh } = await supabase.from('workout_history').select('*').eq('user_id', userId).order('timestamp', { ascending: false });
      if (wh) {
        setWorkouts(wh as WorkoutRecord[]);
        const dates = wh.filter((w: any) => w.timestamp).map((w: any) => new Date(w.timestamp));
        setStreak(calculateStreak(dates));
      }
      const { data: ach } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', userId);
      if (ach) setUnlockedAchievements(ach.map((a: any) => a.achievement_id));
      const { data: plan } = await supabase.from('weekly_plans').select('combos').eq('user_id', userId).limit(1);
      if (plan?.[0]) setWeeklyPlan(plan[0].combos || []);
      const { data: profile } = await supabase.from('profiles').select('punches_today').eq('id', userId).single();
      if (profile) setPunchesToday(profile.punches_today || 0);
      setLoading(false);
    };
    load();
    const ch = supabase.channel('progress-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_history', filter: `user_id=eq.${userId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const totalMinutes = Math.floor(workouts.reduce((acc, w) => acc + w.durationSeconds, 0) / 60);
  const totalWorkouts = workouts.length;
  const totalExercises = workouts.reduce((acc, w) => acc + w.exercises.length, 0);

  const handleRegisterPunches = async () => {
    if (!user || !punchInput) return;
    try {
      const current = punchesToday || 0;
      const newCount = current + parseInt(punchInput);
      await supabase.from('profiles').update({ punches_today: newCount }).eq('id', user.id);
      setPunchesToday(newCount); setPunchInput('');
    } catch (e) { console.error(e); }
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
              <div className="mt-2 inline-flex items-center gap-1 bg-accent-purple/20 text-accent-purple px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-purple/30">
                <Flame className="w-3 h-3" /> ¡Leyenda Activa (1 mes)!
              </div>
            )}
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-4 border-t border-slate-700/50 pt-2">
              Récord Personal: <span className="text-white">{streak.bestStreak} días</span>
            </p>
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
