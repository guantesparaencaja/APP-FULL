import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Filter, RotateCcw, ChevronDown } from 'lucide-react';
import {
  WorkoutCategory,
  WorkoutFilters,
  MuscleGroup,
  DifficultyLevel,
  FitnessObjective,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_ICONS,
} from '../../types/workout.types';

interface WorkoutFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WorkoutCategory[];
  filters: WorkoutFilters;
  onFiltersChange: (filters: WorkoutFilters) => void;
  activeCount: number;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'arms', 'abs', 'legs', 'glutes', 'cardio', 'boxing', 'full_body',
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: 'principiante', label: 'Principiante', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'intermedio',   label: 'Intermedio',   color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'   },
  { value: 'avanzado',     label: 'Avanzado',     color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'élite',        label: 'Élite',        color: 'bg-red-500/20 text-red-400 border-red-500/30'         },
];

const OBJETIVO_OPTIONS: { value: FitnessObjective; label: string; emoji: string }[] = [
  { value: 'bajar_peso', label: 'Bajar de Peso',     emoji: '🔥' },
  { value: 'mantener',   label: 'Mantener',          emoji: '⚖️' },
  { value: 'aumentar',   label: 'Aumentar Músculo',  emoji: '💪' },
  { value: 'general',    label: 'Acondicionamiento', emoji: '🎯' },
];

const EQUIPMENT_OPTIONS = [
  { id: null,         label: 'Todo',           emoji: '🔍' },
  { id: 'Sin equipo', label: 'Sin Equipo',     emoji: '👤' },
  { id: 'Mancuernas', label: 'Mancuernas',     emoji: '🏋️' },
  { id: 'Saco',       label: 'Saco',           emoji: '🥊' },
  { id: 'Cuerda',     label: 'Cuerda',         emoji: '🪢' },
  { id: 'Barra',      label: 'Barra y Discos', emoji: '🏗️' },
  { id: 'Kettlebell', label: 'Kettlebell',     emoji: '🔔' },
  { id: 'Bandas',     label: 'Bandas',         emoji: '🎀' },
];

export function WorkoutFilterModal({
  isOpen,
  onClose,
  categories,
  filters,
  onFiltersChange,
  activeCount,
}: WorkoutFilterModalProps) {
  const [local, setLocal] = useState<WorkoutFilters>(filters);

  const update = <K extends keyof WorkoutFilters>(key: K, value: WorkoutFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const toggle = <K extends keyof WorkoutFilters>(key: K, value: WorkoutFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
  };

  const reset = () => {
    const clean: WorkoutFilters = {
      searchQuery: filters.searchQuery,
      lugar: null, categoria: null, herramienta: null,
      difficulty: null, objetivo: null, muscleGroup: null,
    };
    setLocal(clean);
    onFiltersChange(clean);
  };

  const apply = () => {
    onFiltersChange(local);
    onClose();
  };

  const localActiveCount = [
    local.lugar, local.categoria, local.herramienta,
    local.difficulty, local.objetivo, local.muscleGroup,
  ].filter(Boolean).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="filter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="filter-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Filtros
                </h2>
                {localActiveCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {localActiveCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {localActiveCount > 0 && (
                  <button
                    onClick={reset}
                    id="filter-reset-btn"
                    className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                )}
                <button
                  onClick={onClose}
                  id="filter-close-btn"
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-8">

              {/* Lugar */}
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  📍 Lugar
                </h3>
                <div className="flex gap-2">
                  {[
                    { value: 'casa',  label: '🏠 En Casa' },
                    { value: 'gym',   label: '🏋️ Gym'     },
                    { value: 'boxeo', label: '🥊 Boxeo'   },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      id={`filter-lugar-${opt.value}`}
                      onClick={() => toggle('lugar', opt.value as any)}
                      className={`flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border ${
                        local.lugar === opt.value
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Grupo Muscular */}
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  💪 Grupo Muscular
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {MUSCLE_GROUPS.map((mg) => (
                    <button
                      key={mg}
                      id={`filter-muscle-${mg}`}
                      onClick={() => toggle('muscleGroup', mg)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all ${
                        local.muscleGroup === mg
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      <span className="text-lg">{MUSCLE_GROUP_ICONS[mg]}</span>
                      <span className="text-[7px] font-black uppercase text-center leading-tight">
                        {MUSCLE_GROUP_LABELS[mg]}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Dificultad */}
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  ⚡ Nivel de Dificultad
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      id={`filter-diff-${opt.value}`}
                      onClick={() => toggle('difficulty', opt.value)}
                      className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                        local.difficulty === opt.value
                          ? `${opt.color} border-current`
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Objetivo */}
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  🎯 Objetivo
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {OBJETIVO_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      id={`filter-obj-${opt.value}`}
                      onClick={() => toggle('objetivo', opt.value)}
                      className={`py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                        local.objetivo === opt.value
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      <span className="text-left leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Equipo */}
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                  🛠️ Equipo
                </h3>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id ?? 'all'}
                      id={`filter-equip-${opt.id ?? 'all'}`}
                      onClick={() => update('herramienta', opt.id)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        local.herramienta === opt.id
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                      }`}
                    >
                      <span>{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Categoría */}
              {categories.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                    📁 Categoría
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      id="filter-cat-all"
                      onClick={() => update('categoria', null)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                        !local.categoria
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      Todas
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        id={`filter-cat-${cat.id}`}
                        onClick={() => update('categoria', cat.id)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                          local.categoria === cat.id
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary/30'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                id="filter-apply-btn"
                onClick={apply}
                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all text-sm"
              >
                {localActiveCount > 0
                  ? `Aplicar ${localActiveCount} filtro${localActiveCount !== 1 ? 's' : ''}`
                  : 'Ver Todos los Entrenamientos'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
