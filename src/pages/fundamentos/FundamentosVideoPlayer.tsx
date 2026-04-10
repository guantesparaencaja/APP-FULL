import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FundamentosVideo } from '../../types/fundamentos.types';

export function FundamentosVideoPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const video = location.state?.video as FundamentosVideo;

  if (!video) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Volver atrás</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{video.title}</h1>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">{video.moduleId} • {video.level}</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
          <iframe
            src={video.videoUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                <Info className="w-4 h-4" /> Descripción Técnica
              </h3>
              <p className="text-slate-300 leading-relaxed italic">
                "{video.description}"
              </p>
            </section>

            <section className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/10">
              <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4" /> Guía de Ejecución
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {video.execution}
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-red-500/5 p-8 rounded-[2.5rem] border border-red-500/10">
              <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <AlertCircle className="w-4 h-4" /> Errores Comunes
              </h3>
              <ul className="space-y-4">
                {video.commonErrors.map((error, idx) => (
                  <li key={idx} className="flex gap-3 items-start text-sm text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    {error}
                  </li>
                ))}
              </ul>
            </section>

            <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800 text-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duración</h4>
              <p className="text-2xl font-black text-white">{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
