/**
 * WorkoutPlanBuilder.tsx — Admin tool to create structured workout plans
 * with sections, exercises, and embedded social media videos.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, GripVertical, Save, Eye, EyeOff, ChevronDown, ChevronUp,
  Video, Dumbbell, Clock, AlertCircle, Loader2, Check, Link2, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { parseSocialUrl, platformLabel, platformColor } from '../lib/socialParser';
import { SocialVideoEmbed } from './SocialVideoEmbed';
import { RestTimer } from './RestTimer';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExerciseData {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  video_url: string;
  notes: string;
  equipment: string;
}

interface SectionData {
  id: string;
  title: string;
  order_index: number;
  exercises: ExerciseData[];
}

interface PlanData {
  id?: string;
  title: string;
  description: string;
  difficulty: string;
  estimated_minutes: number;
  is_published: boolean;
  cover_image_url: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _counter = 0;
const uid = () => `local_${Date.now()}_${++_counter}`;

const emptyExercise = (): ExerciseData => ({
  id: uid(), name: '', description: '', sets: 3, reps: '10',
  rest_seconds: 60, video_url: '', notes: '', equipment: '',
});

const emptySection = (order: number): SectionData => ({
  id: uid(), title: '', order_index: order, exercises: [emptyExercise()],
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface WorkoutPlanBuilderProps {
  existingPlan?: PlanData & { sections?: SectionData[] };
  onSaved?: () => void;
  onCancel?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WorkoutPlanBuilder({ existingPlan, onSaved, onCancel }: WorkoutPlanBuilderProps) {
  const [plan, setPlan] = useState<PlanData>({
    title: '',
    description: '',
    difficulty: 'Principiante',
    estimated_minutes: 60,
    is_published: false,
    cover_image_url: '',
    ...existingPlan,
  });

  const [sections, setSections] = useState<SectionData[]>(
    existingPlan?.sections?.length
      ? existingPlan.sections
      : [emptySection(0)]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(
    existingPlan?.sections?.map(s => s.id) ?? [sections[0]?.id]
  ));

  // ─── Section CRUD ──────────────────────────────────────────────────────────
  const addSection = () => {
    const s = emptySection(sections.length);
    setSections(prev => [...prev, s]);
    setExpandedSections(prev => new Set(prev).add(s.id));
  };

  const removeSection = (sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, patch: Partial<SectionData>) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...patch } : s));
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Exercise CRUD ─────────────────────────────────────────────────────────
  const addExercise = (sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s
    ));
  };

  const removeExercise = (sectionId: string, exId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, exercises: s.exercises.filter(e => e.id !== exId) } : s
    ));
  };

  const updateExercise = (sectionId: string, exId: string, patch: Partial<ExerciseData>) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, exercises: s.exercises.map(e => e.id === exId ? { ...e, ...patch } : e) }
        : s
    ));
  };

  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (publish: boolean) => {
    if (!plan.title.trim()) { setError('Escribe un título para el plan'); return; }
    setSaving(true);
    setError(null);

    try {
      const planPayload = {
        title: plan.title.trim(),
        description: plan.description.trim(),
        difficulty: plan.difficulty,
        estimated_minutes: plan.estimated_minutes,
        is_published: publish,
        cover_image_url: plan.cover_image_url.trim(),
      };

      let planId = plan.id;

      if (planId) {
        const { error: e1 } = await supabase.from('workout_plans').update(planPayload).eq('id', planId);
        if (e1) throw e1;
        // Remove old sections/exercises
        await supabase.from('workout_exercises').delete().in('section_id',
          sections.filter(s => s.id && !s.id.startsWith('local_')).map(s => s.id)
        );
        await supabase.from('workout_sections').delete().eq('plan_id', planId);
      } else {
        const { data, error: e1 } = await supabase.from('workout_plans').insert(planPayload).select('id').single();
        if (e1) throw e1;
        planId = data!.id;
      }

      // Insert sections + exercises
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const { data: secData, error: se } = await supabase
          .from('workout_sections')
          .insert({ plan_id: planId, title: sec.title, order_index: si })
          .select('id')
          .single();
        if (se) throw se;

        if (sec.exercises.length > 0) {
          const exercises = sec.exercises
            .filter(e => e.name.trim() !== '')
            .map((e, ei) => ({
              section_id: secData!.id,
              name: e.name.trim(),
              description: e.description.trim(),
              sets: e.sets,
              reps: e.reps.trim(),
              rest_seconds: e.rest_seconds,
              video_url: e.video_url.trim(),
              notes: e.notes.trim(),
              equipment: e.equipment.trim(),
              order_index: ei,
            }));
          if (exercises.length > 0) {
            const { error: ee } = await supabase.from('workout_exercises').insert(exercises);
            if (ee) throw ee;
          }
        }
      }

      setPlan(prev => ({ ...prev, id: planId, is_published: publish }));
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSaved?.(); }, 1200);
    } catch (err: any) {
      console.error('[WorkoutPlanBuilder] Save error:', err);
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold"
        >
          <Check className="w-4 h-4 shrink-0" />
          Plan guardado correctamente
        </motion.div>
      )}

      {/* ── Plan Metadata ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Datos del plan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Título</label>
            <input type="text" value={plan.title} onChange={e => setPlan(p => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Plan Boxing Semana 1"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Descripción</label>
            <textarea value={plan.description} onChange={e => setPlan(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe el objetivo del plan..."
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Dificultad</label>
            <select value={plan.difficulty} onChange={e => setPlan(p => ({ ...p, difficulty: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option>Principiante</option>
              <option>Intermedio</option>
              <option>Avanzado</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">Duración estimada (min)</label>
            <input type="number" value={plan.estimated_minutes} min={10} max={300} step={5}
              onChange={e => setPlan(p => ({ ...p, estimated_minutes: +e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* ── Sections ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Secciones ({sections.length})
          </h3>
          <button type="button" onClick={addSection}
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" /> Sección
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {sections.map((section, si) => (
            <motion.div key={section.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-xs font-black text-slate-400 w-6 text-center">{si + 1}</span>
                <input
                  type="text"
                  value={section.title}
                  onChange={e => updateSection(section.id, { title: e.target.value })}
                  placeholder={`Sección ${si + 1}`}
                  className="flex-1 bg-transparent border-b-2 border-transparent focus:border-primary/50 text-sm font-bold text-slate-900 dark:text-white focus:outline-none py-1 transition-colors"
                />
                <button type="button" onClick={() => toggleSection(section.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {expandedSections.has(section.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {sections.length > 1 && (
                  <button type="button" onClick={() => removeSection(section.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Exercises */}
              <AnimatePresence>
                {expandedSections.has(section.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {section.exercises.map((ex, ei) => (
                        <ExerciseRow
                          key={ex.id}
                          exercise={ex}
                          index={ei}
                          onChange={(patch) => updateExercise(section.id, ex.id, patch)}
                          onRemove={() => removeExercise(section.id, ex.id)}
                          canRemove={section.exercises.length > 1}
                        />
                      ))}

                      <button type="button" onClick={() => addExercise(section.id)}
                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/30 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ejercicio
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
        <button type="button" onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar borrador
        </button>
        <button type="button" onClick={() => handleSave(true)} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Publicar plan
        </button>
      </div>
    </div>
  );
}

// ─── ExerciseRow ──────────────────────────────────────────────────────────────
interface ExerciseRowProps {
  exercise: ExerciseData;
  index: number;
  onChange: (patch: Partial<ExerciseData>) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function ExerciseRow({ exercise, index, onChange, onRemove, canRemove, ...rest }: ExerciseRowProps & { key?: React.Key }) {
  const [showVideo, setShowVideo] = useState(false);
  const parsed = exercise.video_url ? parseSocialUrl(exercise.video_url) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-slate-400 w-5 text-center shrink-0">{index + 1}</span>
        <input
          type="text"
          value={exercise.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Nombre del ejercicio"
          className="flex-1 bg-transparent text-sm font-semibold text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Series</label>
          <input type="number" value={exercise.sets} min={1} max={20}
            onChange={e => onChange({ sets: +e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Reps</label>
          <input type="text" value={exercise.reps}
            onChange={e => onChange({ reps: e.target.value })}
            placeholder="10"
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Descanso (s)</label>
          <input type="number" value={exercise.rest_seconds} min={0} max={600} step={15}
            onChange={e => onChange({ rest_seconds: +e.target.value })}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Video URL input */}
      <div>
        <button type="button" onClick={() => setShowVideo(!showVideo)}
          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
        >
          <Video className="w-3 h-3" />
          {exercise.video_url ? platformLabel(parsed?.platform ?? 'unknown') + ' vinculado' : 'Agregar video'}
          {exercise.video_url && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
        {showVideo && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={exercise.video_url}
                  onChange={e => onChange({ video_url: e.target.value })}
                  placeholder="Pega URL de YouTube, TikTok, Instagram..."
                  className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-300"
                />
                {exercise.video_url && (
                  <button type="button" onClick={() => onChange({ video_url: '' })}
                    className="p-0.5 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {exercise.video_url && (
              <SocialVideoEmbed url={exercise.video_url} title={exercise.name} maxHeight={200} />
            )}
          </div>
        )}
      </div>

      {/* Equipment + Notes */}
      <div className="grid grid-cols-2 gap-2">
        <input type="text" value={exercise.equipment}
          onChange={e => onChange({ equipment: e.target.value })}
          placeholder="Equipo necesario"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-slate-300"
        />
        <input type="text" value={exercise.notes}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Notas..."
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-slate-300"
        />
      </div>
    </motion.div>
  );
}
