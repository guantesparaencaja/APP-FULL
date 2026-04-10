import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, AlertCircle, CheckCircle, Link, Loader2, Eye, X } from 'lucide-react';
import { importLyftaVideo, LyftaVideoMetadata } from '../../lib/driveService';
import { WorkoutCategory } from '../../types/workout.types';
import { LazyVideoWrapper } from '../LazyVideoWrapper';

interface LyftaImporterProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WorkoutCategory[];
  userId: string;
  onImported?: () => void;
}

type ImportStatus = 'idle' | 'checking' | 'preview' | 'importing' | 'success' | 'error';

const LYFTA_MP4_PATTERN = /apilyfta\.com\/static\/.*\.mp4/i;
const YOUTUBE_PATTERN = /youtube\.com|youtu\.be/i;

function detectVideoSource(url: string): 'lyfta' | 'youtube' | 'direct' | 'unknown' {
  if (LYFTA_MP4_PATTERN.test(url)) return 'lyfta';
  if (YOUTUBE_PATTERN.test(url)) return 'youtube';
  if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.gif')) return 'direct';
  return 'unknown';
}

export function LyftaImporter({ isOpen, onClose, categories, userId, onImported }: LyftaImporterProps) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [metadata, setMetadata] = useState<Partial<LyftaVideoMetadata>>({
    title: '',
    categoryId: '',
    difficulty: 'principiante',
    equipment: 'Sin equipo',
    objetivo: 'general',
    tipo: 'casa',
    description: '',
    tags: [],
  });

  const urlSource = url ? detectVideoSource(url) : 'unknown';
  const isValidUrl = urlSource !== 'unknown';

  const handlePreview = () => {
    if (!url.trim() || !isValidUrl) return;
    setShowPreview(true);
    setStatus('preview');
  };

  const handleImport = async () => {
    if (!url.trim() || !metadata.title || !metadata.categoryId) {
      setErrorMsg('Por favor completa el Título y la Categoría');
      return;
    }

    setStatus('importing');
    setErrorMsg('');

    try {
      await importLyftaVideo(url.trim(), metadata as LyftaVideoMetadata, userId);
      setStatus('success');
      setTimeout(() => {
        onImported?.();
        onClose();
        resetForm();
      }, 1800);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Error al importar el video');
    }
  };

  const resetForm = () => {
    setUrl('');
    setStatus('idle');
    setErrorMsg('');
    setShowPreview(false);
    setMetadata({
      title: '', categoryId: '', difficulty: 'principiante',
      equipment: 'Sin equipo', objetivo: 'general', tipo: 'casa', description: '',
    });
  };

  const SOURCE_BADGES: Record<string, { label: string; color: string; icon: string }> = {
    lyfta:   { label: 'Lyfta MP4', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
    youtube: { label: 'YouTube',   color: 'bg-red-500/20 text-red-400 border-red-500/30',             icon: '▶️' },
    direct:  { label: 'URL Directa', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        icon: '🔗' },
    unknown: { label: 'URL Inválida', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',    icon: '❓' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="lyfta-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="lyfta-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl">
                    <Download className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Importar Video
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Lyfta · YouTube · URL Directa
                    </p>
                  </div>
                </div>
                <button
                  id="lyfta-importer-close"
                  onClick={() => { onClose(); resetForm(); }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    URL del Video
                  </label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="lyfta-url-input"
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setStatus('idle'); setShowPreview(false); }}
                      placeholder="https://apilyfta.com/static/... o YouTube..."
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
                    />
                  </div>
                  {url && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide border ${SOURCE_BADGES[urlSource].color}`}>
                        {SOURCE_BADGES[urlSource].icon} {SOURCE_BADGES[urlSource].label}
                      </span>
                      {isValidUrl && (
                        <button
                          id="lyfta-preview-btn"
                          onClick={handlePreview}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {showPreview && url && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black"
                  >
                    <div className="relative aspect-video">
                      {urlSource === 'youtube' ? (
                        <iframe
                          src={url.replace('watch?v=', 'embed/')}
                          className="absolute inset-0 w-full h-full"
                          allowFullScreen
                          title="Preview"
                        />
                      ) : (
                        <LazyVideoWrapper
                          src={url}
                          className="absolute inset-0 w-full h-full object-contain"
                          controls
                          autoPlay
                          muted
                          playsInline
                        />
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Título */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Título del Ejercicio *
                  </label>
                  <input
                    id="lyfta-title-input"
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    placeholder="Ej: Flexiones de Pecho"
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
                  />
                </div>

                {/* Categoría */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Categoría *
                  </label>
                  <select
                    id="lyfta-category-select"
                    value={metadata.categoryId}
                    onChange={(e) => setMetadata({ ...metadata, categoryId: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Grid de opciones */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nivel
                    </label>
                    <select
                      id="lyfta-difficulty-select"
                      value={metadata.difficulty}
                      onChange={(e) => setMetadata({ ...metadata, difficulty: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="principiante">Principiante</option>
                      <option value="intermedio">Intermedio</option>
                      <option value="avanzado">Avanzado</option>
                      <option value="élite">Élite</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Lugar
                    </label>
                    <select
                      id="lyfta-tipo-select"
                      value={metadata.tipo}
                      onChange={(e) => setMetadata({ ...metadata, tipo: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
                    >
                      <option value="casa">🏠 En Casa</option>
                      <option value="gym">🏋️ Gym</option>
                      <option value="boxeo">🥊 Boxeo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Descripción (opcional)
                  </label>
                  <textarea
                    id="lyfta-desc-input"
                    value={metadata.description}
                    onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                    placeholder="Describe brevemente el ejercicio..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none"
                  />
                </div>

                {/* Info box */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                    El video quedará en estado <strong>Pendiente</strong> hasta que el administrador lo apruebe. Solo los administradores pueden ver videos pendientes.
                  </p>
                </div>

                {/* Error */}
                {status === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-500 font-medium">{errorMsg}</p>
                  </motion.div>
                )}

                {/* Success */}
                {status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-500 font-medium">
                      ¡Video enviado para revisión! El admin recibirá una notificación.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button
                  id="lyfta-cancel-btn"
                  onClick={() => { onClose(); resetForm(); }}
                  className="flex-1 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  id="lyfta-import-btn"
                  onClick={handleImport}
                  disabled={!isValidUrl || !metadata.title || !metadata.categoryId || status === 'importing' || status === 'success'}
                  className="flex-[2] flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-primary/50"
                >
                  {status === 'importing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importando...
                    </>
                  ) : status === 'success' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      ¡Importado!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Importar Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
