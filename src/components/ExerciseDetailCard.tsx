import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Play, Plus, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExerciseDetailCardProps {
  id: string;
  title: string;
  description: string;
  muscles: string[];
  series: number;
  reps: string | number;
  commonMistakes?: string[];
  onStart?: () => void;
  onAdd?: () => void;
}

export const ExerciseDetailCard: React.FC<ExerciseDetailCardProps> = ({
  title,
  description,
  muscles,
  series,
  reps,
  commonMistakes = [],
  onStart,
  onAdd,
}) => {
  const [showMistakes, setShowMistakes] = useState(false);

  return (
    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">{title}</h2>
          <div className="flex flex-wrap gap-2">
            {muscles.map((m) => (
              <span
                key={m}
                className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
            Objetivo
          </div>
          <div className="text-lg font-black text-white leading-none">
            {series} x {reps}
          </div>
        </div>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed mb-6">{description}</p>

      {commonMistakes.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowMistakes(!showMistakes)}
            className="flex items-center justify-between w-full p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-xs font-black uppercase tracking-widest text-red-500">
                Errores comunes
              </span>
            </div>
            {showMistakes ? (
              <ChevronUp className="w-5 h-5 text-red-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-red-500" />
            )}
          </button>

          <AnimatePresence>
            {showMistakes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="mt-3 space-y-2 px-4">
                  {commonMistakes.map((mistake, i) => (
                    <li key={i} className="flex gap-3 text-xs text-slate-400 leading-tight">
                      <span className="text-red-500 font-black">•</span>
                      {mistake}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onStart}
          className="flex items-center justify-center gap-2 bg-primary text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5 fill-current" />
          Iniciar
        </button>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 bg-slate-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest hover:bg-slate-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Rutina
        </button>
      </div>
    </div>
  );
};
