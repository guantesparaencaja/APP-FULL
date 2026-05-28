/**
 * useRealtimeCollection — Supabase Realtime (reemplaza Firebase onSnapshot)
 * Regla de oro: SOLO Supabase. Sin Firebase.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeCollection<T extends { id: string }>(
  table: string,
  // filtros opcionales: { column: value }
  filters?: Record<string, string | number | boolean>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from(table).select('*');
    if (filters) {
      Object.entries(filters).forEach(([col, val]) => {
        query = query.eq(col, val as string);
      });
    }
    const { data: rows, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setData((rows ?? []) as T[]);
    }
    setLoading(false);
  }, [table, JSON.stringify(filters)]);

  useEffect(() => {
    fetchData();

    // Realtime universal — escucha INSERT/UPDATE/DELETE en la tabla
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          // Re-fetch al detectar cualquier cambio
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
