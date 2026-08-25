/**
 * Boxing.tsx — Sección BOXING: entrenos con videos y asignación a estudiantes.
 * - Estudiantes: ven los planes públicos o asignados a ellos.
 * - Admin: crea/edita planes, publica y asigna a estudiantes específicos.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell, Clock, ChevronRight, ArrowLeft, Play, Loader2,
  Plus, Eye, EyeOff, Trash2, Edit2, Users, CheckCircle2, X, Search,
  Target, Flame, AlertCircle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/PageHeader';
import { SocialVideoEmbed } from '../components/SocialVideoEmbed';
import { RestTimer } from '../components/RestTimer';
import { WorkoutPlanBuilder } from '../components/WorkoutPlanBuilder';
import { staggerContainer, staggerItem, liftCard } from '../lib/animations';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  is_published: boolean;
  is_public: boolean;
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

interface Student {
  id: string;
  name: string;
  email: string;
}

// ─── Difficulty color helper ──────────────────────────────────────────────────
function diffColor(d: string) {
  if (d === 'Avanzado') return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (d === 'Intermedio') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
}

// ─── Miniatura de video para preview compacto ─────────────────────────────────
function exerciseThumb(videoUrl: string): { type: 'yt' | 'direct' | 'none'; src?: string } {
  if (!videoUrl) return { type: 'none' };
  const ytMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (ytMatch) return { type: 'yt', src: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` };
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(videoUrl)) return { type: 'direct', src: videoUrl };
  return { type: 'none' };
}

function ExerciseThumb({ exercise, ...rest }: { exercise: Exercise } & Record<string, unknown>) {
  const thumb = exerciseThumb(exercise.video_url);
  return (
    <div className="relative w-[132px] shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
      <div className="aspect-video w-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        {thumb.type === 'yt' && thumb.src ? (
          <img src={thumb.src} alt={exercise.name} loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : thumb.type === 'direct' && thumb.src ? (
          <video src={thumb.src} preload="metadata" muted playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-5 h-5 text-slate-300 dark:text-slate-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">{exercise.name}</p>
        <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{exercise.sets} x {exercise.reps}</p>
      </div>
    </div>
  );
}

// ─── AssignModal: selector de estudiantes ─────────────────────────────────────
function AssignModal({
  plan, onClose, onAssigned,
}: {
  plan: Plan;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const user = useStore((s) => s.user);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Cargar estudiantes + asignaciones existentes del plan
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('profiles').select('id, name, email').neq('role', 'admin').order('name'),
        supabase.from('workout_assignments').select('user_id').eq('plan_id', plan.id),
      ]);
      setStudents(studs || []);
      setSelected(new Set((existing || []).map((e: any) => e.user_id)));
      setLoading(false);
    };
    load();
  }, [plan.id]);

  const filtered = students.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Borrar asignaciones existentes y crear las nuevas
      await supabase.from('workout_assignments').delete().eq('plan_id', plan.id);
      if (selected.size > 0) {
        const rows = Array.from(selected).map((userId) => ({
          plan_id: plan.id,
          user_id: userId,
          assigned_by: user?.id,
        }));
        const { error } = await supabase.from('workout_assignments').insert(rows);
        if (error) throw error;
      }
      setMsg('Asignación guardada correctamente');
      setTimeout(() => { onAssigned(); onClose(); }, 700);
    } catch (err: any) {
      setMsg('Error: ' + (err.message || 'no se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">
              Asignar a estudiantes
            </h3>
            <p className="text-xs text-slate-400 font-semibold truncate max-w-[240px]">{plan.title}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 mb-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar estudiante..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8 font-semibold">
              No hay estudiantes registrados aún
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                  selected.has(s.id)
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-primary/30'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                  selected.has(s.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {selected.has(s.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name || 'Sin nombre'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.email}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {msg && (
          <p className={`text-xs font-bold mb-2 ${msg.startsWith('Error') ? 'text-red-500' : 'text-emerald-500'}`}>
            {msg}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
          Guardar ({selected.size} estudiante{selected.size !== 1 ? 's' : ''})
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Component principal ─────────────────────────────────────────────────────
export function Boxing() {
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
  const [assignPlan, setAssignPlan] = useState<Plan | null>(null);

  // Active exercise (for rest timer)
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);

  // Video preview (expand to play on demand, keeps detail ligero)
  const [previewExercise, setPreviewExercise] = useState<Exercise | null>(null);

  // Acordeón de secciones en el detalle (más compacto)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Load plans + preview de ejercicios (RLS filtra por rol) ─────────────
  const loadPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .order('created_at', { ascending: false });
    const plansData = data || [];

    // Cargar secciones + ejercicios para previsualización compacta
    if (plansData.length > 0) {
      const planIds = plansData.map((p) => p.id);
      const { data: sections } = await supabase
        .from('workout_sections')
        .select('*')
        .in('plan_id', planIds)
        .order('order_index');
      const sectionIds = (sections || []).map((s) => s.id);
      const { data: exercises } = sectionIds.length > 0
        ? await supabase
            .from('workout_exercises')
            .select('*')
            .in('section_id', sectionIds)
            .order('order_index')
        : { data: [] };

      plansData.forEach((plan) => {
        plan.sections = (sections || [])
          .filter((s) => s.plan_id === plan.id)
          .map((s) => ({
            ...s,
            exercises: (exercises || []).filter((e) => e.section_id === s.id),
          }));
      });
    }

    setPlans(plansData);
    setLoading(false);
  }, []);

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
      const sectionIds = sections.map((s) => s.id);
      const { data: exercises } = await supabase
        .from('workout_exercises')
        .select('*')
        .in('section_id', sectionIds)
        .order('order_index');

      plan.sections = sections.map((s) => ({
        ...s,
        exercises: (exercises || []).filter((e) => e.section_id === s.id),
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
          emoji="🥊"
          title={editingPlan ? 'Editar plan' : 'Nuevo plan'}
          subtitle="Crea sesiones de entrenamiento con videos"
          right={
            <button type="button" onClick={() => { setShowBuilder(false); setEditingPlan(null); }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Volver"
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
          emoji="🥊"
          title={planDetail?.title || selectedPlan.title}
          subtitle={planDetail?.description || selectedPlan.description}
          right={
            <button type="button" onClick={() => { setSelectedPlan(null); setPlanDetail(null); }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Volver"
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
              {planDetail.is_public ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Público
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="w-3 h-3 inline mr-1" /> Solo asignados
                </span>
              )}
            </div>

            {/* Sections (acordeón compacto) */}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
              {(planDetail.sections || []).map((section, si) => {
                const isOpen = openSections.has(section.id) || (planDetail.sections || []).length === 1;
                const exercises = section.exercises || [];
                return (
                  <motion.div key={section.id} variants={staggerItem}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                        {si + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-700 dark:text-slate-300 truncate">
                          {section.title}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''} · {exercises.reduce((a, e) => a + (e.rest_seconds || 0), 0) > 0 ? 'con descanso' : 'sin descanso'}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-3.5 space-y-2">
                            {exercises.map((exercise, ei) => (
                              <motion.div key={exercise.id}
                                className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 p-3"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="text-[10px] font-black text-slate-300 mt-0.5 w-4 text-center shrink-0">
                                    {ei + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{exercise.name}</h4>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400">
                                      <span>{exercise.sets} x {exercise.reps}</span>
                                      {exercise.rest_seconds > 0 && <span>Descanso {exercise.rest_seconds}s</span>}
                                      {exercise.equipment && <span>{exercise.equipment}</span>}
                                    </div>
                                    {exercise.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                        {exercise.description}
                                      </p>
                                    )}

                                    {/* Video preview (expand on tap) */}
                                    {exercise.video_url && (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewExercise(exercise)}
                                        className="mt-2.5 w-full flex items-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 text-left hover:border-primary/40 transition-colors"
                                      >
                                        <div className="w-16 aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 relative">
                                          {(() => {
                                            const t = exerciseThumb(exercise.video_url);
                                            if (t.type === 'yt' && t.src) {
                                              return (
                                                <img src={t.src} alt="" loading="lazy"
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                              );
                                            }
                                            if (t.type === 'direct' && t.src) {
                                              return (
                                                <video src={t.src} preload="metadata" muted playsInline
                                                  className="w-full h-full object-cover"
                                                />
                                              );
                                            }
                                            return null;
                                          })()}
                                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                          </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                            Ver video
                                          </p>
                                          <p className="text-[10px] font-semibold text-slate-400 truncate">
                                            {exercise.sets} x {exercise.reps}{exercise.equipment ? ` · ${exercise.equipment}` : ''}
                                          </p>
                                        </div>
                                      </button>
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
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
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
                    onClick={(e) => e.stopPropagation()}
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

            {/* Video Preview Modal */}
            <AnimatePresence>
              {previewExercise && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setPreviewExercise(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 w-full max-w-2xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-sm uppercase tracking-widest text-slate-900 dark:text-white truncate mr-3">
                        {previewExercise.name}
                      </h4>
                      <button type="button" onClick={() => setPreviewExercise(null)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                        aria-label="Cerrar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <SocialVideoEmbed url={previewExercise.video_url} title={previewExercise.name} maxHeight={420} />
                    <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-semibold text-slate-400">
                      <span>{previewExercise.sets} x {previewExercise.reps}</span>
                      {previewExercise.rest_seconds > 0 && <span>Descanso {previewExercise.rest_seconds}s</span>}
                      {previewExercise.equipment && <span>{previewExercise.equipment}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPreviewExercise(null); startExercise(previewExercise); }}
                      className="mt-3 w-full py-3 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Iniciar con descanso
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

  // ─── Boxing List View ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <PageHeader
        emoji="🥊"
        title="Boxing"
        subtitle={isAdmin ? 'Gestiona y asigna los entrenos a tus estudiantes' : 'Tus entrenos con videos'}
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
            <p className="text-sm font-semibold text-slate-400">
              {isAdmin ? 'No hay planes. Crea el primero.' : 'Aún no tienes entrenos asignados.'}
            </p>
            {isAdmin && (
              <button type="button" onClick={() => { setShowBuilder(true); setEditingPlan(null); }}
                className="text-xs font-bold text-primary hover:underline"
              >
                Crear plan
              </button>
            )}
          </div>
        </Reveal>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
          {plans.map((plan) => (
            <motion.div key={plan.id} variants={staggerItem} {...liftCard}>
              <div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-shadow"
                onClick={() => { setSelectedPlan(plan); loadPlanDetail(plan.id); }}
              >
                {/* Encabezado compacto */}
                <div className="p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">{plan.title}</h3>
                      {!plan.is_published && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                          BORRADOR
                        </span>
                      )}
                      {plan.is_public ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                          PÚBLICO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                          ASIGNADO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold text-slate-400">
                      <span className={`px-2 py-0.5 rounded-full ${diffColor(plan.difficulty)}`}>
                        {plan.difficulty}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{plan.estimated_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />{totalExercises(plan)} ej.
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>

                {/* Previsualización de ejercicios */}
                {totalExercises(plan) > 0 && (
                  <div className="px-3.5 pb-3.5">
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin">
                      {(plan.sections || []).flatMap((s) => s.exercises || []).map((ex) => (
                        <ExerciseThumb key={ex.id} exercise={ex} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-4 px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => setAssignPlan(plan)}
                      className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Users className="w-3 h-3" /> Asignar
                    </button>
                    <button type="button" onClick={() => togglePublish(plan)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-primary transition-colors"
                    >
                      {plan.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {plan.is_published ? 'Ocultar' : 'Publicar'}
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

      {/* Assign Modal */}
      <AnimatePresence>
        {assignPlan && (
          <AssignModal
            plan={assignPlan}
            onClose={() => setAssignPlan(null)}
            onAssigned={() => loadPlans()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}