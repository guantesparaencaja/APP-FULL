/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Dumbbell, Play, CheckCircle2 } from 'lucide-react';
import { GeneratedRoutine } from '../utils/routineGenerator';
import { translateTool } from '../utils/translateToSpanish';

interface RoutinePreviewProps {
  routine: GeneratedRoutine;
  onStart: () => void;
}

export const RoutinePreview: React.FC<RoutinePreviewProps> = ({ routine, onStart }) => {
  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight text-white">{routine.title}</h2>
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/30">
            Auto-Generada
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">{routine.totalEstimatedMinutes} min</span>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">{routine.exercises.length} Ejercicios</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Herramientas Requeridas</h3>
          <div className="flex flex-wrap gap-2">
            {routine.toolsUsed.map(tool => (
              <span key={tool} className="bg-slate-800 text-slate-300 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-700">
                {translateTool(tool)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Plan de Entrenamiento</h3>
          <div className="space-y-3">
            {routine.exercises.map((ex, index) => (
              <div key={ex.id} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-tight">{ex.title}</h4>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {ex.series} series • {ex.reps}
                  </p>
                </div>
                {ex.title.toLowerCase().includes('estiramiento') && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
        >
          <Play className="w-5 h-5 fill-current" />
          Comenzar Rutina
        </button>
      </div>
    </div>
  );
};
