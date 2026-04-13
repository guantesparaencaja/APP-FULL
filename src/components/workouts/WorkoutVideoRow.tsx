import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Clock, Heart, X, CheckSquare, Settings, Trash2,
  ChevronDown, ChevronUp, Maximize2, Info, Target, Dumbbell,
} from 'lucide-react';
import { WorkoutVideo, WorkoutCategory, getVideoStatus, MUSCLE_GROUP_LABELS } from '../../types/workout.types';
import { getYouTubeEmbedUrl } from '../../services/geminiService';
import { LazyVideoWrapper } from '../LazyVideoWrapper';

interface WorkoutVideoRowProps {
  key?: React.Key;
  video: WorkoutVideo;
  category?: WorkoutCategory;
  isAdmin?: boolean;
  onPlay: (video: WorkoutVideo) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (video: WorkoutVideo) => void;
  onDelete?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  principiante: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  intermedio:   { bg: 'bg-amber-500/20',   text: 'text-amber-400'   },
  avanzado:     { bg: 'bg-orange-500/20',  text: 'text-orange-400'  },
  élite:        { bg: 'bg-red-500/20',     text: 'text-red-400'     },
};

const STATUS_CONFIG = {
  pending:  { label: 'Pendiente',  dot: 'bg-amber-400',   border: 'border-amber-500/40'  },
  approved: { label: 'Aprobado',   dot: 'bg-emerald-400', border: 'border-transparent'   },
  rejected: { label: 'Rechazado', dot: 'bg-red-500',     border: 'border-red-500/40'    },
};

// ─── Thumbnail preview (muted, no controls) ────────────────────────────────
function InlineVideoPreview({ video }: { video: WorkoutVideo }) {
  const src = video.video_url;
  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
        <span className="text-4xl">🥊</span>
      </div>
    );
  }
  const embedUrl = getYouTubeEmbedUrl(src);
  if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
    return (
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        allowFullScreen
        title={video.title}
      />
    );
  }
  if (embedUrl.toLowerCase().endsWith('.gif')) {
    return (
      <img
        src={embedUrl}
        alt={video.title}
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <LazyVideoWrapper
      src={embedUrl}
      className="absolute inset-0 w-full h-full object-cover"
      controls={false}
      muted
      playsInline
    />
  );
}

// ─── Fullscreen Video Modal ────────────────────────────────────────────────
function VideoFullscreenModal({
  video,
  category,
  onClose,
}: {
  video: WorkoutVideo;
  category?: WorkoutCategory;
  onClose: () => void;
}) {
  const src = video.video_url || '';
  const embedUrl = getYouTubeEmbedUrl(src);
  const isYoutube = embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be');
  const isGif = embedUrl.toLowerCase().endsWith('.gif');

  const diffKey = (video.difficulty || '').toLowerCase();
  const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS['principiante'];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-200 bg-black/95 backdrop-blur-md flex flex-col"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-950/80 border-b border-white/10 shrink-0">
          <div className="flex flex-col min-w-0">
            {category && (
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-0.5">
                {category.name}
              </span>
            )}
            <h2 className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight truncate">
              {video.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white flex-shrink-0"
            id="video-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main content: video LEFT + info RIGHT (desktop) / stacked (mobile) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

          {/* ── Video panel ── */}
          <div className="relative bg-black flex items-center justify-center lg:w-[60%] h-[45vw] min-h-[220px] lg:h-full shrink-0">
            {!src ? (
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <span className="text-5xl">🥊</span>
                <p className="text-xs font-bold uppercase tracking-widest">Sin video disponible</p>
              </div>
            ) : isYoutube ? (
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
                title={video.title}
              />
            ) : isGif ? (
              <img
                src={embedUrl}
                alt={video.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <video
                src={embedUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* ── Info + Description panel (always RIGHT on desktop) ── */}
          <div className="flex-1 overflow-y-auto bg-slate-950 border-t lg:border-t-0 lg:border-l border-white/10 p-4 sm:p-6 space-y-5">

            {/* Badges row */}
            <div className="flex flex-wrap gap-2">
              {video.difficulty && (
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide ${diffColor.bg} ${diffColor.text}`}>
                  {video.difficulty}
                </span>
              )}
              {video.duration ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase text-slate-400 bg-slate-800">
                  <Clock className="w-3 h-3" />{video.duration}s
                </span>
              ) : null}
              {video.equipment && video.equipment !== 'Sin equipo' && (
                <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase text-slate-400 bg-slate-800">
                  {video.equipment}
                </span>
              )}
              {video.tipo && (
                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${
                  video.tipo === 'casa' ? 'bg-emerald-500/10 text-emerald-500' :
                  video.tipo === 'boxeo' ? 'bg-red-500/10 text-red-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  {video.tipo === 'casa' ? '🏠' : video.tipo === 'boxeo' ? '🥊' : '🏋️'} {video.tipo}
                </span>
              )}
            </div>

            {/* Description */}
            {video.description && (
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Descripción
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">{video.description}</p>
              </div>
            )}

            {/* Instructions */}
            {video.instructions && (
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Instrucciones
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{video.instructions}</p>
              </div>
            )}

            {/* Common errors */}
            {video.common_errors && (
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" /> Errores Comunes
                </p>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{video.common_errors}</p>
              </div>
            )}

            {/* Objetivo */}
            {video.objetivo && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Objetivo: <span className="text-primary">{video.objetivo}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Row Component ────────────────────────────────────────────────────
/**
 * WorkoutVideoRow — layout horizontal: thumbnail (40%) + info (60%) sin descripción.
 * Al hacer click → abre VideoFullscreenModal con video + descripción a la derecha.
 */
export function WorkoutVideoRow({
  video,
  category,
  isAdmin = false,
  onPlay,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  isFavorite = false,
  onToggleFavorite,
}: WorkoutVideoRowProps) {
  const [showModal, setShowModal] = useState(false);
  const status = getVideoStatus(video);
  const statusCfg = STATUS_CONFIG[status];
  const diffKey = (video.difficulty || '').toLowerCase();
  const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS['principiante'];
  const isPending = status === 'pending';

  const handlePlay = () => {
    setShowModal(true);
    onPlay(video); // mantener llamada al padre para compatibilidad
  };

  return (
    <>
      {/* ── Card Row ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`group relative flex flex-row rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 min-h-[140px] cursor-pointer ${statusCfg.border ?? 'border-slate-200 dark:border-slate-800'} ${isPending && isAdmin ? 'ring-2 ring-amber-400/40' : ''}`}
        onClick={handlePlay}
      >
        {/* ── LEFT: Thumbnail (40%) ── */}
        <div className="relative w-[40%] sm:w-[40%] shrink-0 overflow-hidden">
          <div className="absolute inset-0">
            {video.cover_url ? (
              <img
                src={video.cover_url}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <InlineVideoPreview video={video} />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-black/30" />

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 backdrop-blur-sm border border-white/20 p-3 sm:p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white" />
              </div>
            </div>

            {/* Status badge (admin only) */}
            {isAdmin && status !== 'approved' && (
              <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-sm bg-black/40 border ${statusCfg.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
                <span className="hidden sm:inline text-[9px] font-black text-white uppercase tracking-widest">{statusCfg.label}</span>
              </div>
            )}

            {/* Fullscreen hint */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/50 backdrop-blur-sm p-1.5 rounded-lg">
                <Maximize2 className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Info (60%) — sin descripción, solo título + badges + acciones ── */}
        <div className="flex flex-col gap-1.5 p-3 sm:p-4 w-[60%] flex-1 justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-2">
            {/* Categoría */}
            {category && (
              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
                {category.name}
              </span>
            )}

            {/* Título */}
            <h3 className="font-black text-sm sm:text-base leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {video.title}
            </h3>

            {/* Badges compactos */}
            <div className="flex flex-wrap gap-1">
              {video.difficulty && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${diffColor.bg} ${diffColor.text}`}>
                  {video.difficulty}
                </span>
              )}
              {video.duration ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                  <Clock className="w-2.5 h-2.5" />{video.duration}s
                </span>
              ) : null}
              {video.tipo && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                  video.tipo === 'casa' ? 'bg-emerald-500/10 text-emerald-500' :
                  video.tipo === 'boxeo' ? 'bg-red-500/10 text-red-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>
                  {video.tipo === 'casa' ? '🏠' : video.tipo === 'boxeo' ? '🥊' : '🏋️'} {video.tipo}
                </span>
              )}
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between mt-1 gap-1.5">
            {/* Favorito */}
            {onToggleFavorite && (
              <button
                id={`fav-row-${video.id}`}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(video.id); }}
                className={`p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500'
                }`}
                title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Play button */}
            <button
              onClick={(e) => { e.stopPropagation(); handlePlay(); }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 min-h-[44px]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Ver
            </button>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {onApprove && isPending && (
                  <button
                    id={`approve-row-${video.id}`}
                    onClick={() => onApprove(video.id)}
                    className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Aprobar"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                {onReject && (
                  <button
                    id={`reject-row-${video.id}`}
                    onClick={() => onReject(video.id)}
                    className="p-2 bg-red-500/80 text-white rounded-xl hover:bg-red-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Rechazar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {onEdit && (
                  <button
                    id={`edit-row-${video.id}`}
                    onClick={() => onEdit(video)}
                    className="p-2 bg-blue-500/80 text-white rounded-xl hover:bg-blue-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Editar"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                {onDelete && status === 'approved' && (
                  <button
                    id={`delete-row-${video.id}`}
                    onClick={() => onDelete(video.id)}
                    className="p-2 bg-slate-700/80 text-white rounded-xl hover:bg-red-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Fullscreen Modal ── */}
      {showModal && (
        <VideoFullscreenModal
          video={video}
          category={category}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
