/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Dumbbell, Box, Zap, Repeat, Settings, User } from 'lucide-react';
import { Tool } from '../utils/exerciseClassifier';
import { translateTool } from '../utils/translateToSpanish';

interface ToolSelectorProps {
  selectedTools: Tool[];
  onChange: (tools: Tool[]) => void;
}

const TOOLS: { id: Tool; icon: any }[] = [
  { id: 'SIN EQUIPO', icon: User },
  { id: 'MANCUERNAS', icon: Dumbbell },
  { id: 'BARRA', icon: Box },
  { id: 'BANDAS ELASTICAS', icon: Zap },
  { id: 'KETTLEBELL', icon: Repeat },
  { id: 'MAQUINAS', icon: Settings },
];

export const ToolSelector: React.FC<ToolSelectorProps> = ({ selectedTools, onChange }) => {
  const toggleTool = (tool: Tool) => {
    if (selectedTools.includes(tool)) {
      onChange(selectedTools.filter(t => t !== tool));
    } else {
      onChange([...selectedTools, tool]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Herramientas Disponibles</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {TOOLS.map(({ id, icon: Icon }) => {
          const isSelected = selectedTools.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggleTool(id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                isSelected 
                  ? 'bg-primary/10 border-primary text-primary' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-slate-800'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">
                  {translateTool(id)}
                </span>
              </div>
              {isSelected && <Check className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
