import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Settings, Play, Trophy, Search, Plus, Trash2, Video, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useFundamentosVideos } from '../../hooks/useFundamentosVideos';
import { FundamentosVideo } from '../../types/fundamentos.types';
import { FundamentosAdminPanel } from '../../components/fundamentos/FundamentosAdminPanel';

export function FundamentosBoxeo() {
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const { videos, modules, loading } = useFundamentosVideos();

  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<FundamentosVideo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const filteredModules = modules.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.title.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/saberes')}
          className="w-12 h-12 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white">Fundamentos del Boxeo</h1>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Módulo Técnico Elite</p>
        </div>
        {user?.role === 'admin' ? (
          <button
            onClick={() => setShowAdmin(true)}
            className="w-12 h-12 flex items-center justify-center bg-primary/20 rounded-2xl border border-primary/30 text-primary hover:bg-primary/30 transition-all"
          >
            <Settings className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-12" />
        )}
      </header>

      {/* Hero */}
      <section className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 overflow-hidden shadow-2xl mb-8">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Trophy className="w-32 h-32 text-primary" />
        </div>
        <div className="relative z-10">
          <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest mb-4 inline-block">
            Plan de Estudios 2026
          </span>
          <h2 className="text-4xl font-black text-white italic leading-none mb-4 uppercase tracking-tighter">
            Domina el Arte <br />de la Noble Ciencia
          </h2>
          <p className="text-slate-400 font-medium leading-relaxed max-w-lg italic">
            "La técnica es el puente entre el esfuerzo y la gloria."
          </p>
        </div>
      </section>

      {/* Buscador */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar módulo técnico..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-primary/50 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Módulos */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-800" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
              Currículo Técnico · {modules.length} Módulos
            </p>
            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {filteredModules.map((module) => {
            const moduleVideos = videos.filter(v => v.moduleId === module.id);
            const isExpanded = expandedModules.has(module.id);

            return (
              <div key={module.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                {/* Cabecera del módulo (clickable) */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-5 p-6 text-left hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    {module.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-white text-lg leading-tight">{module.title}</h3>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed line-clamp-2">{module.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-black text-primary uppercase px-2 py-1 bg-primary/10 rounded-lg">
                        {moduleVideos.length} {moduleVideos.length === 1 ? 'video' : 'videos'}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-600 flex-shrink-0">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Videos del módulo (colapsable) */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {moduleVideos.length === 0 ? (
                      <div className="text-center py-8 text-slate-600">
                        <Video className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Sin videos en este módulo</p>
                        {user?.role === 'admin' && (
                          <p className="text-xs text-slate-700 mt-1">Añade videos desde el panel de gestión ⚙️</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {moduleVideos.map(video => (
                          <button
                            key={video.id}
                            onClick={() => setSelectedVideo(video)}
                            className="group bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <Play className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm leading-tight mb-1">{video.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2">{video.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    video.level === 'Principiante' ? 'bg-emerald-500/10 text-emerald-400' :
                                    video.level === 'Intermedio' ? 'bg-amber-500/10 text-amber-400' :
                                    'bg-red-500/10 text-red-400'
                                  }`}>{video.level}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Panel Admin */}
      <AnimatePresence>
        {showAdmin && (
          <FundamentosAdminPanel
            onClose={() => setShowAdmin(false)}
            existingVideos={videos}
            modules={modules}
          />
        )}
      </AnimatePresence>

      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedVideo.title}</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                    {selectedVideo.level} · {modules.find(m => m.id === selectedVideo.moduleId)?.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src={selectedVideo.videoUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              </div>
              {(selectedVideo.description || selectedVideo.execution) && (
                <div className="p-6 space-y-4">
                  {selectedVideo.description && (
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-4 border-primary pl-4">
                      {selectedVideo.description}
                    </p>
                  )}
                  {selectedVideo.execution && (
                    <div className="bg-slate-950 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Ejecución Correcta</p>
                      <p className="text-sm text-slate-300">{selectedVideo.execution}</p>
                    </div>
                  )}
                  {selectedVideo.commonErrors?.length > 0 && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Errores Comunes</p>
                      <ul className="space-y-1">
                        {selectedVideo.commonErrors.map((err, i) => (
                          <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>{err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
