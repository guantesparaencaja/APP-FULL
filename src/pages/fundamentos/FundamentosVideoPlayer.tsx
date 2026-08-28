import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Info, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FundamentosVideo } from '../../types/fundamentos.types';
import { Reveal } from '../../components/Reveal';
import { PageHeader } from '../../components/PageHeader';
import { fadeIn, spring } from '../../lib/animations';
import { FundamentosMediaPlayer } from '../../components/fundamentos/FundamentosMediaPlayer';

export function FundamentosVideoPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const video = location.state?.video as FundamentosVideo;

  if (!video) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-6 bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="flex flex-col items-center gap-4 text-slate-500"
        >
          <Video className="w-16 h-16" />
          <p className="font-bold text-slate-400">No hay un video seleccionado.</p>
        </motion.div>
        <button type="button" onClick={() => navigate(-1)} className="btn-press text-primary font-bold">
          Volver atrás
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 pb-20">
      <div className="dark">
        <PageHeader
          emoji="🥊"
          title={video.title}
          subtitle={`${video.moduleId} • ${video.level}`}
          right={
            <button aria-label="Volver" type="button" onClick={() => navigate(-1)} className="btn-press p-3 bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 hover:text-white transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          }
        />
      </div>

      <motion.div
        key={video.id}
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto space-y-8"
      >
        <Reveal direction="none">
          <div className="aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
            <FundamentosMediaPlayer video={video} />
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Reveal delay={0.05}>
              <section className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <Info className="w-4 h-4" /> Descripción Técnica
                </h3>
                <p className="text-slate-300 leading-relaxed italic">
                  "{video.description}"
                </p>
              </section>
            </Reveal>

            <Reveal delay={0.1}>
              <section className="bg-emerald-500/5 p-8 rounded-[2.5rem] border border-emerald-500/10">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4" /> Guía de Ejecución
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {video.execution}
                </p>
              </section>
            </Reveal>
          </div>

          <div className="space-y-6">
            <Reveal delay={0.05}>
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
            </Reveal>

            <Reveal delay={0.1}>
              <div className="p-8 bg-slate-900/40 rounded-[2.5rem] border border-slate-800 text-center">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Duración</h4>
                <p className="text-2xl font-black text-white">{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
