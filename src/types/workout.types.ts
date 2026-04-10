/**
 * GPTE Workout Types v5.0
 * Sistema de tipos extendido para el módulo Entrenamientos.
 * Compatible con el schema existente de Firebase (retrocompatible).
 */

/** Estado del ciclo de vida de un video */
export type VideoStatus = 'pending' | 'approved' | 'rejected';

/** Grupos musculares principales */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'legs'
  | 'glutes'
  | 'cardio'
  | 'boxing'
  | 'full_body';

/** Tipo de lugar de entrenamiento */
export type TrainingLocation = 'casa' | 'gym' | 'boxeo';

/** Objetivo de entrenamiento */
export type FitnessObjective = 'bajar_peso' | 'mantener' | 'aumentar' | 'general';

/** Nivel de dificultad */
export type DifficultyLevel = 'principiante' | 'intermedio' | 'avanzado' | 'élite';

/** Entrada de auditoría para trazabilidad */
export interface AuditEntry {
  action: 'uploaded' | 'approved' | 'rejected' | 'edited' | 'downloaded';
  adminId: string;
  adminName?: string;
  timestamp: string;
  notes?: string;
}

/** Categoría de entrenamiento */
export interface WorkoutCategory {
  id: string;
  name: string;
  icon?: string;
  muscleGroup?: MuscleGroup;
  color?: string;
}

/**
 * WorkoutVideo v5.0
 * Extiende el schema existente con campos opcionales para no romper compatibilidad.
 */
export interface WorkoutVideo {
  id: string;
  category_id: string;
  title: string;
  description: string;

  // --- Campos existentes (retrocompatibles) ---
  instructions?: string;
  common_errors?: string;
  video_url?: string;
  cover_url?: string;
  difficulty?: string;
  equipment?: string;
  duration?: number;
  tipo?: TrainingLocation | string;
  objetivo?: FitnessObjective | string;
  createdAt?: any;
  createdBy?: string;

  /**
   * Estado del video. Retrocompatible:
   * - `undefined` o `true` → se trata como 'approved'
   * - `false` → se trata como 'pending'
   * - Nuevos: 'pending' | 'approved' | 'rejected'
   */
  isApproved?: boolean;
  status?: VideoStatus;

  // --- Campos nuevos v5.0 ---
  muscleGroups?: MuscleGroup[];
  driveFileId?: string;
  downloadUrl?: string;
  isFavorite?: boolean;
  viewCount?: number;
  auditLog?: AuditEntry[];
  tags?: string[];
  thumbnailUrl?: string;
  sourceUrl?: string; // URL original de Lyfta u otro proveedor
}

/** Rutina personalizada del usuario */
export interface CustomRoutine {
  id: string;
  user_id: string;
  name: string;
  exercises: string[];
  createdAt: string;
}

/** Opciones del filtro de videos */
export interface WorkoutFilters {
  searchQuery: string;
  lugar: TrainingLocation | null;
  categoria: string | null;
  herramienta: string | null;
  difficulty: DifficultyLevel | null;
  objetivo: FitnessObjective | null;
  muscleGroup: MuscleGroup | null;
}

/** Mapa de grupos musculares a nombres en español */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  arms: 'Brazos',
  abs: 'Abdomen',
  legs: 'Piernas',
  glutes: 'Glúteos',
  cardio: 'Cardio',
  boxing: 'Boxeo',
  full_body: 'Cuerpo Completo',
};

/** Íconos emoji para grupos musculares */
export const MUSCLE_GROUP_ICONS: Record<MuscleGroup, string> = {
  chest: '💪',
  back: '🔙',
  shoulders: '🏋️',
  arms: '💪',
  abs: '⚡',
  legs: '🦵',
  glutes: '🍑',
  cardio: '❤️',
  boxing: '🥊',
  full_body: '🔥',
};

/**
 * Normaliza el campo `isApproved` (boolean legacy) al nuevo sistema de estados.
 * Garantiza retrocompatibilidad con todos los documentos existentes en Firestore.
 */
export function getVideoStatus(video: WorkoutVideo): VideoStatus {
  // Nuevo campo explícito tiene prioridad
  if (video.status) return video.status;
  // Retrocompatibilidad con boolean
  if (video.isApproved === false) return 'pending';
  return 'approved'; // undefined o true → approved
}

/** Verifica si un video es visible para usuarios normales */
export function isVideoVisible(video: WorkoutVideo, isAdmin: boolean): boolean {
  const status = getVideoStatus(video);
  if (status === 'rejected') return false; // nunca visible
  if (status === 'pending') return isAdmin; // solo admin
  return true; // approved → visible para todos
}
