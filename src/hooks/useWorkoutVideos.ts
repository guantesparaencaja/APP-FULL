/**
 * GPTE useWorkoutVideos Hook v5.0
 * Hook de sincronización bidireccional en tiempo real con Firebase.
 * - Escucha `workout_videos` y `workout_categories` simultáneamente.
 * - Filtra automáticamente por rol (admin ve todo, usuarios solo 'approved').
 * - Cache ligero con sessionStorage para evitar parpadeos en navegación.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  WorkoutVideo,
  WorkoutCategory,
  WorkoutFilters,
  getVideoStatus,
  isVideoVisible,
} from '../types/workout.types';

const CACHE_KEY_VIDEOS = 'gpte_workout_videos_cache';
const CACHE_KEY_CATS = 'gpte_workout_cats_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage puede estar lleno, ignorar silenciosamente
  }
}

interface UseWorkoutVideosOptions {
  isAdmin?: boolean;
  filters?: Partial<WorkoutFilters>;
}

interface UseWorkoutVideosReturn {
  videos: WorkoutVideo[];
  categories: WorkoutCategory[];
  pendingVideos: WorkoutVideo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  // Contadores útiles para el admin
  counts: {
    total: number;
    approved: number;
    pending: number;
  };
}

export function useWorkoutVideos({
  isAdmin = false,
  filters,
}: UseWorkoutVideosOptions = {}): UseWorkoutVideosReturn {
  const [allVideos, setAllVideos] = useState<WorkoutVideo[]>(() => {
    return readCache<WorkoutVideo[]>(CACHE_KEY_VIDEOS) ?? [];
  });
  const [categories, setCategories] = useState<WorkoutCategory[]>(() => {
    return readCache<WorkoutCategory[]>(CACHE_KEY_CATS) ?? [];
  });
  const [isLoading, setIsLoading] = useState(allVideos.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const unsubRefs = useRef<Array<() => void>>([]);

  const refetch = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY_VIDEOS);
    sessionStorage.removeItem(CACHE_KEY_CATS);
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // Limpiar listeners anteriores
    unsubRefs.current.forEach((u) => u());
    unsubRefs.current = [];

    setIsLoading(true);
    setError(null);

    // ── Listener de Categorías ──────────────────────────────────────────────
    const unsubCats = onSnapshot(
      collection(db, 'workout_categories'),
      (snap) => {
        const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkoutCategory);
        setCategories(cats);
        writeCache(CACHE_KEY_CATS, cats);
      },
      (err) => {
        console.error('[useWorkoutVideos] Categories error:', err);
        setError('Error al cargar categorías.');
      }
    );

    // ── Listener de Videos ──────────────────────────────────────────────────
    const videosQuery = query(collection(db, 'workout_videos'));
    const unsubVideos = onSnapshot(
      videosQuery,
      (snap) => {
        const vids = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkoutVideo);
        setAllVideos(vids);
        writeCache(CACHE_KEY_VIDEOS, vids);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useWorkoutVideos] Videos error:', err);
        setError('Error al cargar videos.');
        setIsLoading(false);
      }
    );

    unsubRefs.current = [unsubCats, unsubVideos];

    return () => {
      unsubCats();
      unsubVideos();
    };
  }, [refreshTick]);

  // ── Filtrado con lógica de roles ──────────────────────────────────────────
  const visibleVideos = allVideos.filter((v) => isVideoVisible(v, isAdmin));
  const pendingVideos = allVideos.filter((v) => getVideoStatus(v) === 'pending');

  // Contadores para el dashboard de admin
  const counts = {
    total: allVideos.length,
    approved: allVideos.filter((v) => getVideoStatus(v) === 'approved').length,
    pending: pendingVideos.length,
  };

  // ── Aplicar filtros adicionales ───────────────────────────────────────────
  let filteredVideos = visibleVideos;

  if (filters) {
    const { searchQuery, lugar, categoria, herramienta, difficulty, objetivo, muscleGroup } =
      filters;

    filteredVideos = filteredVideos.filter((v) => {
      // Lugar
      if (lugar && v.tipo !== lugar) return false;

      // Categoría
      if (categoria) {
        if (v.category_id !== categoria) return false;
      }

      // Herramienta / Equipo
      if (herramienta && v.equipment) {
        if (!v.equipment.toLowerCase().includes(herramienta.toLowerCase())) return false;
      }

      // Dificultad
      if (difficulty && v.difficulty) {
        if (!v.difficulty.toLowerCase().includes(difficulty.toLowerCase())) return false;
      }

      // Objetivo
      if (objetivo && v.objetivo !== objetivo) return false;

      // Grupo muscular
      if (muscleGroup && v.muscleGroups) {
        if (!v.muscleGroups.includes(muscleGroup)) return false;
      }

      // Búsqueda de texto
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesDesc = v.description?.toLowerCase().includes(q) ?? false;
        const matchesEquip = v.equipment?.toLowerCase().includes(q) ?? false;
        const matchesTags = v.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesEquip && !matchesTags) return false;
      }

      return true;
    });
  }

  return {
    videos: filteredVideos,
    categories,
    pendingVideos,
    isLoading,
    error,
    refetch,
    counts,
  };
}
