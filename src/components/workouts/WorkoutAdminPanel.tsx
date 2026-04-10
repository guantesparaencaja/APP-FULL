import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckSquare, X, AlertCircle, Clock, Trash2, ChevronDown,
  BarChart2, Activity, Eye, Shield, RefreshCw, Filter,
} from 'lucide-react';
import { WorkoutVideo, WorkoutCategory, getVideoStatus, AuditEntry } from '../../types/workout.types';
import { hardDeleteVideo, approveVideoWithAudit } from '../../lib/driveService';
import { LazyVideoWrapper } from '../LazyVideoWrapper';
import { getYouTubeEmbedUrl } from '../../services/geminiService';

interface WorkoutAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pendingVideos: WorkoutVideo[];
  categories: WorkoutCategory[];
  counts: { total: number; approved: number; pending: number };
  adminId: string;
  adminName?: string;
  onRefetch: () => void;
}

type PanelTab = 'pending' | 'audit' | 'stats';

function MiniVideoPreview({ video }: { video: WorkoutVideo }) {
  const src = video.video_url;
  if (!src) return <div className="w-full h-full bg-slate-800 flex items-center justify-center text-2xl">🥊</div>;

  const embedUrl = getYouTubeEmbedUrl(src);

  if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
    return <iframe src={embedUrl} className="w-full h-full pointer-events-none" title={video.title} />;
  }
  if (embedUrl.endsWith('.gif')) {
    return <img src={embedUrl} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <LazyVideoWrapper
      src={embedUrl}
      className="w-full h-full object-cover"
      controls={false}
      muted
      playsInline
    />
  );
}

export function WorkoutAdminPanel({
  isOpen,
  onClose,
  pendingVideos,
  categories,
  counts,
  adminId,
  adminName,
  onRefetch,
}: WorkoutAdminPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<WorkoutVideo | null>(null);

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const handleApprove = async (video: WorkoutVideo) => {
    setProcessingId(video.id);
    try {
      await approveVideoWithAudit(video.id, adminId, adminName);
      onRefetch();
    } catch (err) {
      console.error('[AdminPanel] Error aprobando:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectConfirm) return;
    const video = rejectConfirm;
    setRejectConfirm(null);
    setProcessingId(video.id);
    try {
      await hardDeleteVideo(video.id, {
        video_url: video.video_url,
        cover_url: video.cover_url,
        title: video.title,
        adminId,
      });
      onRefetch();
    } catch (err) {
      console.error('[AdminPanel] Error rechazando:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const TABS: { id: PanelTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'pending',
      label: 'Pendientes',
      icon: <AlertCircle className="w-4 h-4" />,
      badge: pendingVideos.length,
    },
    {
      id: 'stats',
      label: 'Estadísticas',
      icon: <BarChart2 className="w-4 h-4" />,
    },
    {
      id: 'audit',
      label: 'Auditoría',
      icon: <Shield className="w-4 h-4" />,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="adminpanel-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel Drawer (derecha) */}
          <motion.div
            key="adminpanel-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950/50 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-2xl">
                  <Eye className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Panel de Revisión
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Gestión de contenido
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="admin-panel-refresh"
                  onClick={onRefetch}
                  className="p-2 rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                  title="Actualizar"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  id="admin-panel-close"
                  onClick={onClose}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 bg-white dark:bg-slate-900">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`admin-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all relative ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                      activeTab === tab.id ? 'bg-primary text-white' : 'bg-amber-400 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── TAB: Pendientes ──────────────────────────── */}
              {activeTab === 'pending' && (
                <div className="p-4 space-y-4">
                  {pendingVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-5xl mb-4">✅</div>
                      <p className="font-black text-slate-900 dark:text-white uppercase">
                        Sin videos pendientes
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Todos los videos están revisados.
                      </p>
                    </div>
                  ) : (
                    pendingVideos.map((video) => (
                      <motion.div
                        key={video.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-amber-400/30"
                      >
                        {/* Video preview */}
                        <div className="relative aspect-video bg-black">
                          <MiniVideoPreview video={video} />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[8px] font-black uppercase ">Pendiente</span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4">
                          <h3 className="font-black text-sm text-slate-900 dark:text-white mb-0.5 line-clamp-1">
                            {video.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">
                            {getCategoryName(video.category_id)}
                            {video.difficulty && ` · ${video.difficulty}`}
                            {video.createdAt &&
                              ` · ${new Date(video.createdAt).toLocaleDateString('es-CO')}`}
                          </p>

                          {/* Action buttons */}
                          {processingId === video.id ? (
                            <div className="flex items-center justify-center py-3">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                id={`panel-approve-${video.id}`}
                                onClick={() => handleApprove(video)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Aprobar
                              </button>
                              <button
                                id={`panel-reject-${video.id}`}
                                onClick={() => setRejectConfirm(video)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 text-red-500 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* ── TAB: Estadísticas ──────────────────────── */}
              {activeTab === 'stats' && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total',     value: counts.total,    color: 'text-slate-900 dark:text-white',   bg: 'bg-slate-100 dark:bg-slate-800'    },
                      { label: 'Aprobados', value: counts.approved, color: 'text-emerald-500',                  bg: 'bg-emerald-500/10'                  },
                      { label: 'Pendientes',value: counts.pending,  color: 'text-amber-500',                    bg: 'bg-amber-500/10'                    },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                        <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Barra de progreso */}
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      <span>Aprobación</span>
                      <span>
                        {counts.total > 0
                          ? Math.round((counts.approved / counts.total) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${counts.total > 0 ? (counts.approved / counts.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tip de calidad */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                    <div className="flex gap-3 items-start">
                      <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-primary uppercase tracking-wide mb-1">
                          Calidad de Contenido
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Mantén al menos el 80% de videos aprobados para una experiencia óptima para los estudiantes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: Auditoría ─────────────────────────── */}
              {activeTab === 'audit' && (
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">
                    Últimas acciones de moderación
                  </p>
                  <div className="p-8 text-center text-slate-400">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">
                      Los logs de auditoría aparecerán aquí conforme se aprueben o rechacen videos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Confirm reject dialog */}
          {rejectConfirm && (
            <motion.div
              key="reject-confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            >
              <motion.div
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-red-500/10 rounded-xl">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white uppercase">
                    Confirmar Rechazo
                  </h3>
                </div>
                <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                  ¿Eliminar permanentemente <strong>"{rejectConfirm.title}"</strong>?
                </p>
                <p className="text-xs text-red-500 font-bold mb-5 bg-red-500/10 p-3 rounded-xl">
                  ⚠️ Esta acción eliminará el video de Firestore, Storage y Google Drive. Es IRREVERSIBLE.
                </p>
                <div className="flex gap-3">
                  <button
                    id="reject-confirm-cancel"
                    onClick={() => setRejectConfirm(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    id="reject-confirm-ok"
                    onClick={handleConfirmReject}
                    className="flex-1 py-3 rounded-xl font-black text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
