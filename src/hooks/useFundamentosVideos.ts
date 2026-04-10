import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { FundamentosVideo, FundamentosModule } from '../types/fundamentos.types';
import { FUNDAMENTOS_MODULES } from '../data/fundamentosData';

export function useFundamentosVideos() {
  const [videos, setVideos] = useState<FundamentosVideo[]>([]);
  const [modules, setModules] = useState<FundamentosModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let loadedVideos = false;
    let loadedModules = false;

    const checkDone = () => {
      if (loadedVideos && loadedModules) setLoading(false);
    };

    // 1. Escuchar videos
    const qVideos = query(
      collection(db, 'fundamentos_videos'),
      orderBy('order', 'asc')
    );

    const unsubVideos = onSnapshot(
      qVideos,
      (snapshot) => {
        setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundamentosVideo)));
        loadedVideos = true;
        checkDone();
      },
      (err) => {
        console.error('Error fetching fundamentos videos:', err);
        setError(err);
        loadedVideos = true;
        checkDone();
      }
    );

    // 2. Escuchar módulos dinámicos de Firestore
    const qModules = query(
      collection(db, 'fundamentos_v4_modules'),
      orderBy('order', 'asc')
    );

    const unsubModules = onSnapshot(
      qModules,
      (snapshot) => {
        if (snapshot.empty) {
          // Si aún no hay módulos en Firestore, caer en los datos estáticos
          setModules(FUNDAMENTOS_MODULES.map((m, i) => ({ ...m, order: i + 1 })));
        } else {
          setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FundamentosModule)));
        }
        loadedModules = true;
        checkDone();
      },
      (err) => {
        console.error('Error fetching fundamentos modules:', err);
        // Fallback a datos estáticos en caso de error
        setModules(FUNDAMENTOS_MODULES.map((m, i) => ({ ...m, order: i + 1 })));
        loadedModules = true;
        checkDone();
      }
    );

    return () => {
      unsubVideos();
      unsubModules();
    };
  }, []);

  return { videos, modules, loading, error };
}
