import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Clock, Heart, X, CheckSquare, Settings, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { WorkoutVideo, WorkoutCategory, getVideoStatus, MUSCLE_GROUP_LABELS } from '../../types/workout.types';
import { getYouTubeEmbedUrl } from '../../services/geminiService';
import { LazyVideoWrapper } from '../LazyVideoWrapper';

interface WorkoutVideoRowProps {
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

/**
 * WorkoutVideoRow — layout horizontal: video izquierda (60%) + info derecha (40%)
 * En mobile (< sm) apila verticalmente: video arriba, info abajo.
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
  const [descExpanded, setDescExpanded] = useState(false);
  const status = getVideoStatus(video);
  const statusCfg = STATUS_CONFIG[status];
  const diffKey = (video.difficulty || '').toLowerCase();
  const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS['principiante'];
  const isPending = status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative flex flex-row rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 min-h-[160px] ${statusCfg.border ?? 'border-slate-200 dark:border-slate-800'} ${isPending && isAdmin ? 'ring-2 ring-amber-400/40' : ''}`}
    >
      {/* ── LEFT: Video thumbnail (40% en mobile, 60% en desktop para verse bien) ── */}
      <div
        className="relative w-[40%] sm:w-[60%] flex-shrink-0 cursor-pointer overflow-hidden"
        onClick={() => onPlay(video)}
      >
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
          {/* Play button center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-2 sm:p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
              <Play className="w-5 h-5 sm:w-7 sm:h-7 text-white fill-white" />
            </div>
          </div>
          {/* Status badge (admin only) */}
          {isAdmin && status !== 'approved' && (
            <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-sm bg-black/40 border ${statusCfg.border}`}>
              <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
              <span className="hidden sm:inline text-[9px] font-black text-white uppercase tracking-widest">{statusCfg.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Info panel (60% en mobile, 40% en desktop) ── */}
      <div className="flex flex-col gap-1.5 p-3 sm:p-5 w-[60%] sm:w-[40%] flex-1 justify-between">
        <div className="flex flex-col gap-2">

          {/* Categoría */}
          {category && (
            <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
              {category.name}
            </span>
          )}

          {/* Título */}
          <h3 className="font-black text-base leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors duration-300">
            {video.title}
          </h3>

          {/* Descripción expandible */}
          {video.description && (
            <div>
              <p className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
                {video.description}
              </p>
              {video.description.length > 120 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                  className="flex items-center gap-1 text-[10px] text-primary font-bold mt-1 hover:underline"
                >
                  {descExpanded ? <><ChevronUp className="w-3 h-3" /> Menos</> : <><ChevronDown className="w-3 h-3" /> Más</>}
                </button>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            {video.difficulty && (
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${diffColor.bg} ${diffColor.text}`}>
                {video.difficulty}
              </span>
            )}
            {video.duration ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                <Clock className="w-2.5 h-2.5" />
                {video.duration}s
              </span>
            ) : null}
            {video.equipment && video.equipment !== 'Sin equipo' && (
              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 truncate max-w-[120px]">
                {video.equipment}
              </span>
            )}
            {video.tipo && (
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                video.tipo === 'casa'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : video.tipo === 'boxeo'
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {video.tipo === 'casa' ? '🏠' : video.tipo === 'boxeo' ? '🥊' : '🏋️'} {video.tipo}
              </span>
            )}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between mt-2 gap-2">
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
            onClick={() => onPlay(video)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 min-h-[44px]"
          >
            <Play className="w-4 h-4 fill-current" />
            Reproducir
          </button>

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {onApprove && isPending && (
                <button
                  id={`approve-row-${video.id}`}
                  onClick={() => onApprove(video.id)}
                  className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Aprobar"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
              {onReject && (
                <button
                  id={`reject-row-${video.id}`}
                  onClick={() => onReject(video.id)}
                  className="p-2.5 bg-red-500/80 text-white rounded-xl hover:bg-red-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Rechazar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button
                  id={`edit-row-${video.id}`}
                  onClick={() => onEdit(video)}
                  className="p-2.5 bg-blue-500/80 text-white rounded-xl hover:bg-blue-600 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Editar"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              {onDelete && status === 'approved' && (
                <button
                  id={`delete-row-${video.id}`}
                  onClick={() => onDelete(video.id)}
                  className="p-2.5 bg-slate-700/80 text-white rounded-xl hover:bg-red-500 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
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
  );
}
