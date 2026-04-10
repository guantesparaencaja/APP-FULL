import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Loader2,
  Video,
  Upload,
  Settings,
  AlertCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { uploadVideoToDrive } from '../lib/driveService';
import { motion, AnimatePresence } from 'motion/react';

export const Calentamiento: React.FC = () => {
  const navigate = useNavigate();
  const setHasWarmedUp = useStore((state) => state.setHasWarmedUp);
  const user = useStore((state) => state.user);

  const [videoConfig, setVideoConfig] = useState<{
    tipo: 'storage';
    videoUrl: string;
    titulo: string;
    descripcion: string;
    duracion: string;
  } | null>(null);

  const [loadingVideo, setLoadingVideo] = useState(true);
  const [editForm, setEditForm] = useState({
    titulo: '',
    descripcion: '',
    duracion: '',
    videoUrl: '',
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'configuracion', 'calentamiento'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setVideoConfig(data);
        setEditForm({
          titulo: data.titulo || '',
          descripcion: data.descripcion || '',
          duracion: data.duracion || '',
          videoUrl: data.videoUrl || '',
        });
      } else {
        const defaultConfig: any = {
          tipo: 'storage',
          videoUrl: '',
          titulo: 'Calentamiento Pro Boxeo',
          descripcion: 'Rutina obligatoria de movilidad articular y activación neuromuscular.',
          duracion: '10-12 minutos',
        };
        setVideoConfig(defaultConfig);
        setEditForm(defaultConfig);
      }
      setLoadingVideo(false);
    });
    return () => unsub();
  }, []);

  const handleSaveVideo = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      let finalUrl = editForm.videoUrl;

      if (videoFile) {
        setUploading(true);
        finalUrl = await uploadVideoToDrive(
          videoFile,
          user.id,
          (progress) => setUploadProgress(progress),
          { type: 'calentamiento', title: editForm.titulo }
        );
      }

      if (!finalUrl && !videoFile) {
        throw new Error('Debes subir un video para guardar la configuración.');
      }

      await setDoc(doc(db, 'configuracion', 'calentamiento'), {
        tipo: 'storage',
        videoUrl: finalUrl,
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        duracion: editForm.duracion,
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: user.email,
      });

      setVideoFile(null);
      setUploadProgress(0);
      setUploading(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving video:', err);
      setSaveError('Error: ' + (err.message || 'Error al procesar el video'));
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!window.confirm('¿Deseas eliminar el video actual de calentamiento?')) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'configuracion', 'calentamiento'), {
        tipo: 'storage',
        videoUrl: '',
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        duracion: editForm.duracion,
        actualizadoEn: new Date().toISOString(),
        actualizadoPor: user?.email,
      });
      setVideoConfig((prev) => (prev ? { ...prev, videoUrl: '' } : null));
      setEditForm((prev) => ({ ...prev, videoUrl: '' }));
      alert('Video eliminado con éxito');
    } catch (err: any) {
      console.error('Error deleting video:', err);
      setSaveError('Error al eliminar el video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-4 pb-24">
      <header className="flex items-center justify-between mb-8 max-w-4xl mx-auto w-full pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-transform active:scale-90"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">
            Guantes Protocolo
          </p>
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Calentamiento</h1>
        </div>
        <div className="w-12"></div>
      </header>

      <main className="flex-1 flex flex-col gap-8 max-w-4xl mx-auto w-full">
        {/* Reproductor de Video (Premium Style) */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl relative">
          {loadingVideo ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-slate-950">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                Sincronizando Video...
              </p>
            </div>
          ) : videoConfig?.videoUrl ? (
            <div className="aspect-video w-full bg-black relative group">
              <video
                src={videoConfig.videoUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full object-contain"
                poster="https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80"
              />
              <div className="absolute top-4 left-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    Protocolo GPTE
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center text-center p-8">
              <Video className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-500 font-bold uppercase italic text-sm">
                No hay video configurado
              </p>
              {user?.role === 'admin' && (
                <p className="text-slate-700 text-xs mt-2">Sube uno en el panel de abajo</p>
              )}
            </div>
          )}

          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                  <Play className="w-7 h-7 fill-current" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">
                    {videoConfig?.titulo || 'Calentamiento Oficial'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                      Esencial
                    </span>
                    <p className="text-slate-400 text-xs font-bold">
                      {videoConfig?.duracion || '10 min'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
              {videoConfig?.descripcion ||
                'Esta rutina es fundamental para preparar el cuerpo antes de la sesión principal. Enfócate en la técnica del movimiento.'}
            </p>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setHasWarmedUp(true);
                navigate(-1);
              }}
              className="w-full bg-primary py-5 rounded-3xl text-white font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all flex items-center justify-center gap-3"
            >
              <CheckCircle className="w-6 h-6" /> Completar y Continuar
            </motion.button>
          </div>
        </section>

        {/* Panel Admin (Solo para Administradores) */}
        {user?.role === 'admin' && (
          <section className="mt-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-primary">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic leading-none mb-1 text-slate-900 dark:text-white">
                      Admin: Nuevo Calentamiento
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sube videos directamente — Sin YouTube
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-red-500/5 rounded-2xl border border-red-500/10">
                  <ShieldCheck className="w-5 h-5 text-red-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Selector de Video */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Archivo de Video (MP4)
                    </label>
                    <input
                      type="file"
                      id="video-upload-admin"
                      accept="video/*"
                      onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])}
                      className="hidden"
                    />
                    <label
                      htmlFor="video-upload-admin"
                      className={`w-full aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden
                        ${videoFile ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:border-primary/50'}
                      `}
                    >
                      {videoFile ? (
                        <div className="text-center animate-in zoom-in-95">
                          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Video className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm font-black text-slate-800 dark:text-white px-4 truncate max-w-[200px]">
                            {videoFile.name}
                          </p>
                          <p className="text-[10px] font-black text-slate-500 uppercase mt-1">
                            {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="text-center group-hover:scale-105 transition-transform flex flex-col items-center">
                          {videoConfig?.videoUrl ? (
                            <div className="relative">
                              <Video className="w-10 h-10 text-primary mx-auto mb-3 opacity-50" />
                              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            </div>
                          ) : (
                            <Upload className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                          )}
                          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                            {videoConfig?.videoUrl ? 'Cambiar Video Actual' : 'Seleccionar Video'}
                          </p>
                        </div>
                      )}

                      {uploading && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
                          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                            Subiendo: {uploadProgress}%
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                        Título Público
                      </label>
                      <input
                        type="text"
                        value={editForm.titulo}
                        onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                        placeholder="Ej: Calentamiento de Elite"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                        Duración
                      </label>
                      <input
                        type="text"
                        value={editForm.duracion}
                        onChange={(e) => setEditForm({ ...editForm, duracion: e.target.value })}
                        placeholder="Ej: 12 Minutos"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                        Instrucciones
                      </label>
                      <textarea
                        value={editForm.descripcion}
                        onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                        placeholder="Describe los beneficios..."
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm focus:border-primary outline-none resize-none h-28 text-slate-900 dark:text-white font-medium shadow-inner"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-500 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-tight">
                          ¡Video Actualizado con Éxito!
                        </span>
                      </motion.div>
                    )}
                    {saveError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-500/20"
                      >
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-tight">
                          {saveError}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-4">
                    <button
                      onClick={handleSaveVideo}
                      disabled={saving || uploading}
                      className="flex-[2] bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black uppercase tracking-widest py-5 rounded-[1.5rem] disabled:opacity-20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 border border-slate-800 dark:border-slate-200 shadow-xl"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '💾 Publicar Video'}
                    </button>

                    {videoConfig?.videoUrl && (
                      <button
                        onClick={handleDeleteVideo}
                        disabled={saving || uploading}
                        className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-5 rounded-[1.5rem] border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
