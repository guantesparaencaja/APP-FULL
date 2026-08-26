import React, { useState, useEffect } from 'react';
import { ShieldCheck, Video, CheckCircle, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

interface VendajeVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  created_at?: any;
}

export function VendajeTutorial() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const setHasSeenVendaje = useStore((state) => state.setHasSeenVendaje);
  const navigate = useNavigate();

  const [videos, setVideos] = useState<VendajeVideo[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', description: '', video_url: '' });
  const [loading, setLoading] = useState(true);

  // ✅ onSnapshot — tiempo real para vendaje_videos
  useEffect(() => {
    // Initial fetch
    supabase
      .from('vendaje_videos')
      .select('*')
      .then(({ data, error }) => {
        if (error) console.error('Error fetching vendaje_videos:', error);
        if (data) setVideos(data as VendajeVideo[]);
        setLoading(false);
      });

    // Realtime channel
    const channel = supabase
      .channel('vendaje_videos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendaje_videos' }, () => {
        supabase
          .from('vendaje_videos')
          .select('*')
          .then(({ data }) => {
            if (data) setVideos(data as VendajeVideo[]);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleComplete = async () => {
    setHasSeenVendaje(true);
    if (user) {
      try {
        await supabase.from('profiles').update({
          vendaje_progreso: 100,
          has_seen_vendaje: true,
        }).eq('id', user.id);
        setUser({ ...user, vendaje_progreso: 100 });
      } catch (err) {
        console.error('Error updating vendaje progress:', err);
      }
    }
    // ✅ Ir directamente a la página de combos/licencia al completar vendaje
    navigate('/aprobacion');
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.title || !newVideo.video_url) return;
    try {
      await supabase.from('vendaje_videos').insert({
        ...newVideo,
        created_at: new Date().toISOString(),
      });
      setNewVideo({ title: '', description: '', video_url: '' });
      setShowAdd(false);
      // onSnapshot actualiza automáticamente
    } catch (err) {
      console.error('Error adding video:', err);
    }
  };

  const handleDeleteVideo = async (video: VendajeVideo) => {
    if (!confirm('¿Eliminar este video de vendaje?')) return;
    try {
      await supabase.from('vendaje_videos').delete().eq('id', video.id);
    } catch (err) {
      console.error('Error deleting video:', err);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="bg-slate-900 rounded-3xl p-6 border border-primary/30 shadow-2xl shadow-primary/10 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="bg-primary/20 p-3 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
            Vendaje de Manos
          </h2>
          <p className="text-primary font-bold text-sm">Protege tus manos correctamente</p>
        </div>
      </div>

      <p className="text-slate-300 mb-6 relative z-10">
        Antes de comenzar con tu entrenamiento y proceso de licencia, es obligatorio saber cómo
        proteger tus manos. Un buen vendaje previene lesiones graves.
      </p>

      {/* Admin: Add video button */}
      {isAdmin && (
        <div className="mb-6 relative z-10">
          {!showAdd ? (
            <button aria-label="Agregar"
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/50 py-3 rounded-xl font-bold hover:bg-primary/30 transition-all"
            >
              <Plus className="w-5 h-5" />
              Agregar Video de Vendaje
            </button>
          ) : (
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Nuevo Video de Vendaje</h3>
                <button aria-label="Cerrar"
                  onClick={() => setShowAdd(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddVideo} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Título (ej. Vendaje Básico)"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={newVideo.description}
                  onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">URL del Video</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newVideo.video_url}
                    onChange={(e) => setNewVideo({ ...newVideo, video_url: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                  {newVideo.video_url && (
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-bold flex justify-between items-center">
                      <span>✅ URL ingresada</span>
                      <button type="button" onClick={() => setNewVideo(prev => ({ ...prev, video_url: '' }))} className="text-red-400 hover:text-red-300">Eliminar</button>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!newVideo.title || !newVideo.video_url}
                  className="bg-primary text-white font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50"
                >
                  Guardar Video
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Videos List */}
      {loading ? (
        <div className="flex justify-center py-6 relative z-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10">
          {/* Placeholder cards when no videos exist */}
          {['Vendaje Básico', 'Vendaje Profesional'].map((title) => (
            <div
              key={title}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col items-center justify-center text-center gap-3"
            >
              <Video className="w-8 h-8 text-slate-400" />
              <div>
                <h3 className="font-bold text-white">{title}</h3>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Agrega un video usando el botón de arriba'
                    : 'Próximamente disponible'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10">
          {videos.map((v) => (
            <div
              key={v.id}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden group"
            >
              <div className="aspect-video bg-slate-900 relative">
                <video src={v.video_url} controls className="w-full h-full object-cover" />
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteVideo(v)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full z-30 shadow-lg opacity-100"
                    title="Eliminar video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white">{v.title}</h3>
                {v.description && <p className="text-xs text-slate-400 mt-1">{v.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 relative z-10">
        <button
          onClick={handleComplete}
          className="flex-1 bg-primary text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Ya sé vendarme / Continuar
        </button>
      </div>
    </div>
  );
}
