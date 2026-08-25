import React, { useState } from 'react';
import { Play, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FundamentosVideo } from '../../types/fundamentos.types';
import { FundamentosLevelBadge } from './FundamentosLevelBadge';

interface Props {
  video: FundamentosVideo;
  onPlay: (video: FundamentosVideo) => void;
  key?: React.Key;
}

export function FundamentosVideoCard({ video, onPlay }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden hover:border-primary/30 transition-all group"
    >
      <div className="relative aspect-video bg-slate-800 overflow-hidden cursor-pointer" onClick={() => onPlay(video)}>
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
            <Play className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-primary/20 backdrop-blur-md border border-primary/50 flex items-center justify-center text-primary scale-90 group-hover:scale-100 transition-all duration-300">
            <Play className="w-6 h-6 fill-current" />
          </div>
        </div>
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/10">
          <Clock className="w-3 h-3" />
          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="font-bold text-slate-100 leading-tight group-hover:text-primary transition-colors">
            {video.title}
          </h4>
          <FundamentosLevelBadge level={video.level} />
        </div>

        <p className="text-sm text-slate-400 line-clamp-2 mb-4">
          {video.description}
        </p>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors pt-4 border-t border-slate-800/50"
        >
          <span>Detalles Técnicos</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                <div>
                  <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Ejecución Correcta
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                    {video.execution}
                  </p>
                </div>
                {video.commonErrors.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Errores Comunes
                    </h5>
                    <ul className="space-y-1.5">
                      {video.commonErrors.map((error, i) => (
                        <li key={i} className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="text-red-500/50">•</span> {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
