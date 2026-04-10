/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MuscleGroup } from '../utils/exerciseClassifier';
import { translateMuscleGroup } from '../utils/translateToSpanish';

interface MuscleGroupSelectorProps {
  selectedGroup: MuscleGroup;
  onChange: (group: MuscleGroup) => void;
}

const GROUPS: MuscleGroup[] = [
  'PECHO',
  'ESPALDA',
  'HOMBROS',
  'PIERNAS',
  'ABDOMEN',
  'BICEPS',
  'TRICEPS',
];

export const MuscleGroupSelector: React.FC<MuscleGroupSelectorProps> = ({
  selectedGroup,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
        Grupo Muscular Objetivo
      </h3>
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((group) => {
          const isSelected = selectedGroup === group;
          return (
            <button
              key={group}
              onClick={() => onChange(group)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                isSelected
                  ? 'bg-primary border-primary text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {translateMuscleGroup(group)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
