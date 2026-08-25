/**
 * useFundamentosVideos — Supabase (purga Firebase)
 * Regla de oro: Supabase = fuente única de verdad.
 * Fallback a datos estáticos si tabla vacía.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FundamentosVideo, FundamentosModule } from '../types/fundamentos.types';
import { FUNDAMENTOS_MODULES } from '../data/fundamentosData';

export function useFundamentosVideos() {
  const [videos, setVideos] = useState<FundamentosVideo[]>([]);
  const [modules, setModules] = useState<FundamentosModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [{ data: vids, error: eVids }, { data: mods, error: eMods }] = await Promise.all([
          supabase.from('fundamentos_videos').select('*').order('order', { ascending: true }),
          supabase.from('fundamentos_modules').select('*').order('order', { ascending: true }),
        ]);

        if (!active) return;

        if (eVids) console.error('[useFundamentosVideos] videos:', eVids.message);
        else setVideos((vids ?? []) as FundamentosVideo[]);

        if (eMods || !mods || mods.length === 0) {
          // Fallback a datos estáticos
          setModules(FUNDAMENTOS_MODULES.map((m, i) => ({ ...m, order: i + 1 })));
        } else {
          setModules(mods as FundamentosModule[]);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err : new Error('Error cargando fundamentos'));
        setModules(FUNDAMENTOS_MODULES.map((m, i) => ({ ...m, order: i + 1 })));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAll();

    // Realtime universal para fundamentos
    const chVideos = supabase
      .channel('realtime:fundamentos_videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamentos_videos' }, fetchAll)
      .subscribe();

    const chMods = supabase
      .channel('realtime:fundamentos_modules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fundamentos_modules' }, fetchAll)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(chVideos);
      supabase.removeChannel(chMods);
    };
  }, []);

  return { videos, modules, loading, error };
}
