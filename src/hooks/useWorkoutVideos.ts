/**
 * useWorkoutVideos — Supabase Realtime v6.0 (purga Firebase)
 * Regla de oro: Supabase = fuente única de verdad.
 * Realtime universal: reacciona a cambios en workout_videos y workout_categories.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  WorkoutVideo,
  WorkoutCategory,
  WorkoutFilters,
  getVideoStatus,
  isVideoVisible,
} from '../types/workout.types';

const CACHE_KEY_VIDEOS = 'gpte_workout_videos_cache';
const CACHE_KEY_CATS = 'gpte_workout_cats_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

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
    sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignorar si sessionStorage lleno
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
  counts: { total: number; approved: number; pending: number };
}

export function useWorkoutVideos({
  isAdmin = false,
  filters,
}: UseWorkoutVideosOptions = {}): UseWorkoutVideosReturn {
  const [allVideos, setAllVideos] = useState<WorkoutVideo[]>(
    () => readCache<WorkoutVideo[]>(CACHE_KEY_VIDEOS) ?? []
  );
  const [categories, setCategories] = useState<WorkoutCategory[]>(
    () => readCache<WorkoutCategory[]>(CACHE_KEY_CATS) ?? []
  );
  const [isLoading, setIsLoading] = useState(allVideos.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const refetch = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY_VIDEOS);
    sessionStorage.removeItem(CACHE_KEY_CATS);
    setRefreshTick((t) => t + 1);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [{ data: vids, error: eVids }, { data: cats, error: eCats }] = await Promise.all([
        supabase.from('workout_videos').select('*').order('order_index'),
        supabase.from('workout_categories').select('*').order('order_index'),
      ]);
      if (eVids) throw new Error(eVids.message);
      if (eCats) throw new Error(eCats.message);

      const videosData = (vids ?? []) as WorkoutVideo[];
      const catsData = (cats ?? []) as WorkoutCategory[];
      setAllVideos(videosData);
      setCategories(catsData);
      writeCache(CACHE_KEY_VIDEOS, videosData);
      writeCache(CACHE_KEY_CATS, catsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Limpiar canales anteriores
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    fetchAll();

    // Realtime universal para ambas tablas
    const chVideos = supabase
      .channel('realtime:workout_videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_videos' }, fetchAll)
      .subscribe();

    const chCats = supabase
      .channel('realtime:workout_categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_categories' }, fetchAll)
      .subscribe();

    channelsRef.current = [chVideos, chCats];

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [fetchAll, refreshTick]);

  // Filtrado con lógica de roles
  const visibleVideos = allVideos.filter((v) => isVideoVisible(v, isAdmin));
  const pendingVideos = allVideos.filter((v) => getVideoStatus(v) === 'pending');
  const counts = {
    total: allVideos.length,
    approved: allVideos.filter((v) => getVideoStatus(v) === 'approved').length,
    pending: pendingVideos.length,
  };

  let filteredVideos = visibleVideos;
  if (filters) {
    const { searchQuery, lugar, categoria, herramienta, difficulty, objetivo, muscleGroup } = filters;
    filteredVideos = filteredVideos.filter((v) => {
      if (lugar && v.tipo !== lugar) return false;
      if (categoria && v.category_id !== categoria) return false;
      if (herramienta && v.equipment && !v.equipment.toLowerCase().includes(herramienta.toLowerCase())) return false;
      if (difficulty && v.difficulty && !v.difficulty.toLowerCase().includes(difficulty.toLowerCase())) return false;
      if (objetivo && v.objetivo !== objetivo) return false;
      if (muscleGroup && v.muscleGroups && !v.muscleGroups.includes(muscleGroup)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          v.title.toLowerCase().includes(q) ||
          (v.description?.toLowerCase().includes(q) ?? false) ||
          (v.equipment?.toLowerCase().includes(q) ?? false) ||
          (v.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }

  return { videos: filteredVideos, categories, pendingVideos, isLoading, error, refetch, counts };
}
