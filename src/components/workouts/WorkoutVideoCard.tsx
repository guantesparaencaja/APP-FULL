import React from 'react';
import { motion } from 'motion/react';
import { Play, Clock, CheckSquare, X, Settings, Trash2, Eye, Heart } from 'lucide-react';
import { WorkoutVideo, WorkoutCategory, getVideoStatus, MUSCLE_GROUP_LABELS } from '../../types/workout.types';
import { getYouTubeEmbedUrl } from '../../services/geminiService';
import { LazyVideoWrapper } from '../LazyVideoWrapper';

interface WorkoutVideoCardProps {
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
  pending:  { label: 'Pendiente',  dot: 'bg-amber-400',  border: 'border-amber-500/40'  },
  approved: { label: 'Aprobado',   dot: 'bg-emerald-400', border: 'border-transparent'  },
  rejected: { label: 'Rechazado',  dot: 'bg-red-500',    border: 'border-red-500/40'    },
};

function VideoPreview({ video }: { video: WorkoutVideo }) {
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
        className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-110"
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
        className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <LazyVideoWrapper
      src={embedUrl}
      className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-700"
      controls={false}
      muted
      playsInline
    />
  );
}

export function WorkoutVideoCard({
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
}: WorkoutVideoCardProps) {
  const status = getVideoStatus(video);
  const statusCfg = STATUS_CONFIG[status];
  const diffKey = (video.difficulty || '').toLowerCase();
  const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS['principiante'];

  const isPending = status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer ${statusCfg.border ?? 'border-slate-200 dark:border-slate-800'} ${isPending && isAdmin ? 'ring-2 ring-amber-400/40' : ''}`}
      onClick={() => onPlay(video)}
    >
      {/* ── Thumbnail (portrait 3:4 ratio tipo Lyfta) ── */}
      <div className="relative overflow-hidden" style={{ paddingBottom: '75%' }}>
        {/* Cover image o video preview */}
        {video.cover_url ? (
          <img
            src={video.cover_url}
            alt={video.title}
            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <VideoPreview video={video} />
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent group-hover:via-black/20 transition-all duration-500" />

        {/* Badge de estado (solo admin) */}
        {isAdmin && status !== 'approved' && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm bg-black/40 border ${statusCfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">
              {statusCfg.label}
            </span>
          </div>
        )}

        {/* Botón Favorito */}
        {onToggleFavorite && (
          <button
            id={`fav-${video.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(video.id);
            }}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all ${
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-black/40 text-white/70 opacity-0 group-hover:opacity-100'
            }`}
            title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Botón de reproducción central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
            <Play className="w-7 h-7 text-white fill-white" />
          </div>
        </div>

        {/* Controles admin en hover */}
        {isAdmin && (
          <div
            className="absolute bottom-0 left-0 right-0 flex gap-1.5 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {onApprove && isPending && (
              <button
                id={`approve-${video.id}`}
                onClick={() => onApprove(video.id)}
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-500 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30"
              >
                <CheckSquare className="w-3 h-3" />
                Aprobar
              </button>
            )}
            {onReject && (
              <button
                id={`reject-${video.id}`}
                onClick={() => onReject(video.id)}
                className={`flex items-center justify-center gap-1 ${isPending ? 'flex-1' : 'px-3'} bg-red-500/80 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/30`}
              >
                <X className="w-3 h-3" />
                {isPending ? 'Rechazar' : ''}
              </button>
            )}
            {onEdit && (
              <button
                id={`edit-${video.id}`}
                onClick={() => onEdit(video)}
                className="p-2 bg-blue-500/80 text-white rounded-xl hover:bg-blue-600 transition-all"
                title="Editar"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && status === 'approved' && (
              <button
                id={`delete-${video.id}`}
                onClick={() => onDelete(video.id)}
                className="p-2 bg-slate-700/80 text-white rounded-xl hover:bg-red-500 transition-all"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Info ─────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Categoría */}
        {category && (
          <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">
            {category.name}
          </span>
        )}

        {/* Título */}
        <h3 className="font-black text-sm leading-snug text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {video.title}
        </h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
          {video.difficulty && (
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${diffColor.bg} ${diffColor.text}`}>
              {video.difficulty}
            </span>
          )}
          {video.duration ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
              <Clock className="w-2.5 h-2.5" />
              {video.duration}min
            </span>
          ) : null}
          {video.equipment && video.equipment !== 'Sin equipo' && (
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 truncate max-w-[100px]">
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
    </motion.div>
  );
}
