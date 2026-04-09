/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const translateMuscleGroup = (muscle: string): string => {
  const translations: Record<string, string> = {
    'CHEST': 'PECHO',
    'BACK': 'ESPALDA',
    'SHOULDERS': 'HOMBROS',
    'LEGS': 'PIERNAS',
    'ABS': 'ABDOMEN',
    'BICEPS': 'BICEPS',
    'TRICEPS': 'TRICEPS',
    'PECHO': 'PECHO',
    'ESPALDA': 'ESPALDA',
    'HOMBROS': 'HOMBROS',
    'PIERNAS': 'PIERNAS',
    'ABDOMEN': 'ABDOMEN'
  };
  return translations[muscle.toUpperCase()] || muscle;
};

export const translateTool = (tool: string): string => {
  const translations: Record<string, string> = {
    'BODYWEIGHT': 'SIN EQUIPO',
    'DUMBBELL': 'MANCUERNAS',
    'BARBELL': 'BARRA',
    'BAND': 'BANDAS ELASTICAS',
    'KETTLEBELL': 'KETTLEBELL',
    'MACHINE': 'MAQUINAS',
    'SIN EQUIPO': 'SIN EQUIPO',
    'MANCUERNAS': 'MANCUERNAS',
    'BARRA': 'BARRA',
    'BANDAS ELASTICAS': 'BANDAS ELASTICAS',
    'MAQUINAS': 'MAQUINAS'
  };
  return translations[tool.toUpperCase()] || tool;
};
