/**
 * WorkoutPlans.tsx — Student view: browse & follow structured training plans.
 * Admin view: create & publish plans via WorkoutPlanBuilder.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell, Clock, ChevronRight, ArrowLeft, Play,
  Plus, Settings, Loader2, AlertCircle, Eye, EyeOff, Trash2, Edit2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/PageHeader';
import { SocialVideoEmbed } from '../components/SocialVideoEmbed';
import { RestTimer } from '../components/RestTimer';
import { WorkoutPlanBuilder } from '../components/WorkoutPlanBuilder';
import { staggerContainer, staggerItem, liftCard } from '../lib/animations';
import { platformLabel, platformColor } from '../lib/socialParser';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  is_published: boolean;
  cover_image_url: string;
  created_by: string;
  created_at: string;
  sections?: Section[];
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  exercises?: Exercise[];
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  video_url: string;
  notes: string;
  equipment: string;
  order_index: number;
}

// ─── Difficulty color helper ──────────────────────────────────────────────────
function diffColor(d: string) {
  if (d === 'Avanzado') return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (d === 'Intermedio') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkoutPlans() {
  const user = useStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planDetail, setPlanDetail] = useState<Plan | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Admin
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Active exercise (for rest timer)
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // ─── Load plans ────────────────────────────────────────────────────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    const isAdmin = user?.role === 'admin';
    let query = supabase
      .from('workout_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (!isAdmin) {
      query = query.eq('is_published', true);
    }
    const { data } = await query;
    setPlans(data || []);
    setLoading(false);
  }, [user?.role]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // ─── Load plan detail ──────────────────────────────────────────────────────
  const loadPlanDetail = useCallback(async (planId: string) => {
    setLoadingDetail(true);
    const { data: plan } = await supabase.from('workout_plans').select('*').eq('id', planId).single();
    if (!plan) { setLoadingDetail(false); return; }

    const { data: sections } = await supabase
      .from('workout_sections')
      .select('*')
      .eq('plan_id', planId)
      .order('order_index');

    if (sections && sections.length > 0) {
      const sectionIds = sections.map(s => s.id);
      const { data: exercises } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('section_id', sectionIds)
        .order('order_index');

      plan.sections = sections.map(s => ({
        ...s,
        exercises: (exercises || []).filter(e => e.section_id === s.id),
      }));
    } else {
      plan.sections = [];
    }

    setPlanDetail(plan);
    setLoadingDetail(false);
  }, []);

  // ─── Delete plan ───────────────────────────────────────────────────────────
  const handleDelete = async (planId: string) => {
    if (!confirm('Eliminar este plan permanentemente?')) return;
    setDeleting(planId);
    await supabase.from('workout_plans').delete().eq('id', planId);
    await loadPlans();
    setDeleting(null);
    if (selectedPlan?.id === planId) { setSelectedPlan(null); setPlanDetail(null); }
  };

  // ─── Toggle publish ────────────────────────────────────────────────────────
  const togglePublish = async (plan: Plan) => {
    await supabase.from('workout_plans').update({ is_published: !plan.is_published }).eq('id', plan.id);
    await loadPlans();
    if (selectedPlan?.id === plan.id) await loadPlanDetail(plan.id);
  };

  // ─── Active exercise detail: select and show timer ─────────────────────────
  const startExercise = (exercise: Exercise) => {
    setActiveExercise(exercise);
    if (exercise.rest_seconds > 0) setShowRestTimer(true);
  };

  // ─── Calculate total exercises ─────────────────────────────────────────────
  const totalExercises = (plan: Plan) => {
    if (plan.sections) return plan.sections.reduce((acc, s) => acc + (s.exercises?.length || 0), 0);
    return 0;
  };

  // ─── Builder mode ──────────────────────────────────────────────────────────
  if (showBuilder) {
    return (
      <div className="space-y-4">
        <PageHeader
          emoji="📋"
          title={editingPlan ? 'Editar plan' : 'Nuevo plan'}
          subtitle="Crea sesiones de entrenamiento estructuradas"
          right={
            <button type="button" onClick={() => { setShowBuilder(false); setEditingPlan(null); }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          }
        />
        <WorkoutPlanBuilder
          existingPlan={editingPlan || undefined}
          onSaved={() => { setShowBuilder(false); setEditingPlan(null); loadPlans(); }}
          onCancel={() => { setShowBuilder(false); setEditingPlan(null); }}
        />
      </div>
    );
  }

  // ─── Plan Detail View ──────────────────────────────────────────────────────
  if (selectedPlan) {
    return (
      <div className="space-y-5">
        <PageHeader
          emoji="📋"
          title={planDetail?.title || selectedPlan.title}
          subtitle={planDetail?.description || selectedPlan.description}
          right={
            <button type="button" onClick={() => { setSelectedPlan(null); setPlanDetail(null); }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          }
        />

        {loadingDetail ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : planDetail ? (
          <>
            {/* Plan meta badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${diffColor(planDetail.difficulty)}`}>
                {planDetail.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500">
                <Clock className="w-3 h-3 inline mr-1" />
                {planDetail.estimated_minutes} min
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500">
                <Dumbbell className="w-3 h-3 inline mr-1" />
                {totalExercises(planDetail)} ejercicios
              </span>
            </div>

            {/* Sections */}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
              {(planDetail.sections || []).map((section, si) => (
                <motion.div key={section.id} variants={staggerItem}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                      {si + 1}
                    </span>
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300">
                      {section.title}
                    </h3>
                  </div>

                  <div className="space-y-2 pl-9">
                    {(section.exercises || []).map((exercise, ei) => (
                      <motion.div key={exercise.id} variants={staggerItem}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-black text-slate-300 mt-1 w-4 text-center shrink-0">
                            {ei + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{exercise.name}</h4>
                              {exercise.video_url && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white"
                                  style={{ backgroundColor: platformColor(exercise.video_url.includes('youtube') ? 'youtube' : exercise.video_url.includes('tiktok') ? 'tiktok' : exercise.video_url.includes('instagram') ? 'instagram' : 'unknown') }}
                                >
                                  VIDEO
                                </span>
                              )}
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] font-semibold text-slate-400">
                              <span>{exercise.sets} x {exercise.reps}</span>
                              {exercise.rest_seconds > 0 && <span>Descanso {exercise.rest_seconds}s</span>}
                              {exercise.equipment && <span>{exercise.equipment}</span>}
                            </div>

                            {exercise.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {exercise.description}
                              </p>
                            )}

                            {/* Video embed */}
                            {exercise.video_url && (
                              <div className="mt-3">
                                <SocialVideoEmbed url={exercise.video_url} title={exercise.name} maxHeight={300} />
                              </div>
                            )}

                            {/* Start exercise button */}
                            <button
                              type="button"
                              onClick={() => startExercise(exercise)}
                              className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Iniciar ejercicio
                            </button>

                            {exercise.notes && (
                              <p className="text-[10px] text-slate-400 mt-1 italic">{exercise.notes}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Rest Timer Modal */}
            <AnimatePresence>
              {showRestTimer && activeExercise && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => { setShowRestTimer(false); setActiveExercise(null); }}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                    <h4 className="font-black text-center text-sm uppercase tracking-widest text-slate-500 mb-1">
                      Descanso
                    </h4>
                    <p className="text-center text-xs text-slate-400 mb-4">
                      {activeExercise.sets} x {activeExercise.reps} — {activeExercise.name}
                    </p>
                    <RestTimer
                      seconds={activeExercise.rest_seconds}
                      onComplete={() => setShowRestTimer(false)}
                      autoStart
                    />
                    <button type="button"
                      onClick={() => { setShowRestTimer(false); setActiveExercise(null); }}
                      className="mt-4 w-full py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      Cerrar
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <p className="text-center text-slate-400 py-16">Plan no encontrado</p>
        )}
      </div>
    );
  }

  // ─── Plans List View ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        emoji="📋"
        title="Planes de Entrenamiento"
        subtitle="Sesiones estructuradas con videos y guias"
        right={isAdmin ? (
          <button type="button" onClick={() => { setShowBuilder(true); setEditingPlan(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        ) : undefined}
      />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
        <Reveal>
          <div className="text-center py-16 space-y-3">
            <Dumbbell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">No hay planes disponibles</p>
            {isAdmin && (
              <button type="button" onClick={() => { setShowBuilder(true); setEditingPlan(null); }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Crea el primer plan
              </button>
            )}
          </div>
        </Reveal>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {plans.map(plan => (
            <motion.div key={plan.id} variants={staggerItem} {...liftCard}>
              <div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-shadow"
                onClick={() => { setSelectedPlan(plan); loadPlanDetail(plan.id); }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">{plan.title}</h3>
                      {!plan.is_published && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          BORRADOR
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full ${diffColor(plan.difficulty)}`}>
                        {plan.difficulty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {plan.estimated_minutes} min
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 mt-1" />
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => togglePublish(plan)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                    >
                      {plan.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {plan.is_published ? 'Publicado' : 'Borrador'}
                    </button>
                    <button type="button" onClick={() => { setEditingPlan(plan); setShowBuilder(true); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(plan.id)}
                      disabled={deleting === plan.id}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
