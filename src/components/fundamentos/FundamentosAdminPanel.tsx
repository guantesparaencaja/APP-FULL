import React, { useState, useRef } from 'react';
import { Upload, X, Plus, Trash2, Edit2, Play, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { uploadVideoToDrive, deleteVideoFromDrive } from '../../lib/driveService';
import { FundamentosVideo, FundamentosModule } from '../../types/fundamentos.types';
import { useStore } from '../../store/useStore';

interface Props {
  onClose: () => void;
  existingVideos: FundamentosVideo[];
  modules: FundamentosModule[];
}

type AdminView = 'main' | 'manage_modules' | 'add_module' | 'manage_videos' | 'add_video';

export function FundamentosAdminPanel({ onClose, existingVideos, modules }: Props) {
  const user = useStore((state) => state.user);
  const [view, setView] = useState<AdminView>('main');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Form estados — módulo
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleEmoji, setNewModuleEmoji] = useState('🥊');
  const [newModuleDesc, setNewModuleDesc] = useState('');

  // Form estados — video
  const [videoFormData, setVideoFormData] = useState({
    title: '',
    description: '',
    execution: '',
    commonErrors: '',
    level: 'Principiante' as 'Principiante' | 'Intermedio' | 'Avanzado',
    videoUrl: '',
    duration: 30,
  });
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'module' | 'video'; id: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const moduleVideos = existingVideos.filter(v => v.moduleId === selectedModuleId);

  // ─── Módulos ──────────────────────────────────────────────────────────────
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || !user) return;
    try {
      await addDoc(collection(db, 'fundamentos_v4_modules'), {
        title: newModuleTitle.trim(),
        emoji: newModuleEmoji,
        description: newModuleDesc.trim(),
        order: modules.length + 1,
        createdAt: serverTimestamp(),
        createdBy: user.id,
      });
      setNewModuleTitle('');
      setNewModuleEmoji('🥊');
      setNewModuleDesc('');
      setView('manage_modules');
      alert('✅ Módulo creado correctamente');
    } catch (err) {
      console.error(err);
      alert('❌ Error al crear el módulo');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    setIsDeleting(moduleId);
    try {
      // 1. Obtener todos los videos de este módulo
      const videosQuery = query(collection(db, 'fundamentos_videos'), where('moduleId', '==', moduleId));
      const videosSnap = await getDocs(videosQuery);

      // 2. Eliminar videos en Drive y Firestore
      for (const videoDoc of videosSnap.docs) {
        const videoData = videoDoc.data() as FundamentosVideo;
        if (videoData.videoUrl) {
          await deleteVideoFromDrive(videoData.videoUrl).catch(console.warn);
        }
        await deleteDoc(doc(db, 'fundamentos_videos', videoDoc.id));
      }

      // 3. Eliminar el módulo
      await deleteDoc(doc(db, 'fundamentos_v4_modules', moduleId));
      setConfirmDelete(null);
      alert('✅ Módulo y sus videos eliminados correctamente');
    } catch (err) {
      console.error(err);
      alert('❌ Error al eliminar el módulo');
    } finally {
      setIsDeleting(null);
    }
  };

  // ─── Videos ───────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 500 * 1024 * 1024) {
      alert('Archivo demasiado grande (máx 500MB)');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      const driveUrl = await uploadVideoToDrive(
        file,
        user.id,
        (p) => setUploadProgress(p),
        { type: 'fundamentos', title: videoFormData.title || file.name }
      );
      setVideoFormData(prev => ({ ...prev, videoUrl: driveUrl }));
      alert('✅ Video subido a Drive');
    } catch (err) {
      console.error(err);
      alert('❌ Error al subir el video');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFormData.videoUrl || !selectedModuleId || !user) {
      alert('Debes subir un video primero');
      return;
    }

    try {
      const data = {
        ...videoFormData,
        moduleId: selectedModuleId,
        commonErrors: videoFormData.commonErrors.split('\n').filter(l => l.trim()),
        tags: [],
        updatedAt: serverTimestamp(),
        createdBy: user.id,
        isPublished: true,
        order: existingVideos.length + 1,
      };

      if (editingVideoId) {
        await updateDoc(doc(db, 'fundamentos_videos', editingVideoId), data);
        alert('✅ Video actualizado');
      } else {
        await addDoc(collection(db, 'fundamentos_videos'), { ...data, createdAt: serverTimestamp() });
        alert('✅ Video publicado');
      }

      setVideoFormData({ title: '', description: '', execution: '', commonErrors: '', level: 'Principiante', videoUrl: '', duration: 30 });
      setEditingVideoId(null);
      setView('manage_videos');
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar el video');
    }
  };

  const handleDeleteVideo = async (video: FundamentosVideo) => {
    setIsDeleting(video.id);
    try {
      await deleteDoc(doc(db, 'fundamentos_videos', video.id));
      if (video.videoUrl) await deleteVideoFromDrive(video.videoUrl).catch(console.warn);
      setConfirmDelete(null);
      alert('✅ Video eliminado');
    } catch (err) {
      console.error(err);
      alert('❌ Error al eliminar el video');
    } finally {
      setIsDeleting(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/98 backdrop-blur-xl flex flex-col p-4 animate-in fade-in">
      <div className="max-w-4xl w-full mx-auto flex flex-col h-full">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            {view !== 'main' && (
              <button
                onClick={() => {
                  if (view === 'add_module') setView('manage_modules');
                  else if (view === 'add_video') setView('manage_videos');
                  else if (view === 'manage_videos') setView('manage_modules');
                  else setView('main');
                }}
                className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-2xl font-black text-white italic uppercase">
                {view === 'main' ? 'Panel de Fundamentos' :
                 view === 'manage_modules' ? 'Gestión de Módulos' :
                 view === 'add_module' ? 'Nuevo Módulo' :
                 view === 'manage_videos' ? `Videos · ${selectedModule?.title}` :
                 editingVideoId ? 'Editar Video' : 'Nuevo Video'}
              </h2>
              <p className="text-primary text-[10px] font-black uppercase tracking-widest">Admin GPTE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">

          {/* ── VISTA PRINCIPAL ── */}
          {view === 'main' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setView('manage_modules')}
                className="group bg-slate-900 border border-slate-800 rounded-3xl p-8 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="text-4xl mb-6">📚</div>
                <h3 className="font-black text-white text-xl mb-2">Gestionar Módulos</h3>
                <p className="text-slate-500 text-sm">Crear, ordenar y eliminar secciones técnicas. {modules.length} módulos activos.</p>
                <div className="mt-6 flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
                  Gestionar <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <div className="text-4xl mb-6">📊</div>
                <h3 className="font-black text-white text-xl mb-2">Estadísticas</h3>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Módulos</span>
                    <span className="text-white font-black text-xl">{modules.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Videos Publicados</span>
                    <span className="text-white font-black text-xl">{existingVideos.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── GESTIÓN DE MÓDULOS ── */}
          {view === 'manage_modules' && (
            <div className="space-y-4">
              <button
                onClick={() => setView('add_module')}
                className="w-full py-5 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center gap-3 text-slate-500 hover:border-primary/50 hover:text-primary transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Agregar Nuevo Módulo
              </button>

              {modules.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <p className="text-lg font-bold">Sin módulos creados</p>
                  <p className="text-sm mt-2">Crea el primer módulo técnico arriba</p>
                </div>
              ) : (
                modules.map(module => (
                  <div key={module.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-5">
                    <div className="text-3xl">{module.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white">{module.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{module.description}</p>
                      <p className="text-[10px] text-primary font-bold uppercase mt-1">
                        {existingVideos.filter(v => v.moduleId === module.id).length} videos
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => { setSelectedModuleId(module.id); setView('manage_videos'); }}
                        className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
                      >
                        Videos
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'module', id: module.id, title: module.title })}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── NUEVO MÓDULO ── */}
          {view === 'add_module' && (
            <form onSubmit={handleAddModule} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Emoji / Icono</label>
                <input
                  value={newModuleEmoji}
                  onChange={e => setNewModuleEmoji(e.target.value)}
                  placeholder="🥊"
                  maxLength={4}
                  className="w-24 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-3xl text-center outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título del Módulo *</label>
                <input
                  required
                  value={newModuleTitle}
                  onChange={e => setNewModuleTitle(e.target.value)}
                  placeholder="Ej: Módulo 6: Estrategia de Combate"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
                <textarea
                  value={newModuleDesc}
                  onChange={e => setNewModuleDesc(e.target.value)}
                  placeholder="Breve descripción del contenido de este módulo..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary transition-all resize-none"
                />
              </div>
              <button type="submit" className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-primary/90 transition-all text-sm">
                Crear Módulo
              </button>
            </form>
          )}

          {/* ── GESTIÓN DE VIDEOS ── */}
          {view === 'manage_videos' && (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setEditingVideoId(null);
                  setVideoFormData({ title: '', description: '', execution: '', commonErrors: '', level: 'Principiante', videoUrl: '', duration: 30 });
                  setView('add_video');
                }}
                className="w-full py-5 border-2 border-dashed border-slate-800 rounded-3xl flex items-center justify-center gap-3 text-slate-500 hover:border-primary/50 hover:text-primary transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Agregar Video
              </button>

              {moduleVideos.length === 0 ? (
                <div className="text-center py-16 text-slate-600">
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">Sin videos en este módulo</p>
                </div>
              ) : (
                moduleVideos.map(video => (
                  <div key={video.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center gap-5">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-sm">{video.title}</h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded mt-1 inline-block ${
                        video.level === 'Principiante' ? 'bg-emerald-500/10 text-emerald-400' :
                        video.level === 'Intermedio' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>{video.level}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingVideoId(video.id);
                          setVideoFormData({
                            title: video.title,
                            description: video.description,
                            execution: video.execution,
                            commonErrors: video.commonErrors?.join('\n') || '',
                            level: video.level,
                            videoUrl: video.videoUrl,
                            duration: video.duration,
                          });
                          setView('add_video');
                        }}
                        className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'video', id: video.id, title: video.title })}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── FORMULARIO DE VIDEO ── */}
          {view === 'add_video' && (
            <form onSubmit={handleSaveVideo} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título *</label>
                    <input
                      required
                      value={videoFormData.title}
                      onChange={e => setVideoFormData({ ...videoFormData, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nivel</label>
                    <select
                      value={videoFormData.level}
                      onChange={e => setVideoFormData({ ...videoFormData, level: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary"
                    >
                      <option value="Principiante">Principiante</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción *</label>
                    <textarea
                      required
                      rows={4}
                      value={videoFormData.description}
                      onChange={e => setVideoFormData({ ...videoFormData, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ejecución Correcta</label>
                    <textarea
                      rows={3}
                      value={videoFormData.execution}
                      onChange={e => setVideoFormData({ ...videoFormData, execution: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Errores Comunes (uno por línea)</label>
                    <textarea
                      rows={3}
                      value={videoFormData.commonErrors}
                      onChange={e => setVideoFormData({ ...videoFormData, commonErrors: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:border-primary resize-none"
                    />
                  </div>

                  {/* Subir Video */}
                  <div className="p-6 bg-slate-950 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center gap-4">
                    {uploadProgress !== null ? (
                      <div className="w-full space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[10px] font-black text-primary uppercase">Subiendo a Drive...</span>
                          <span className="text-lg font-black text-white">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className={`w-10 h-10 ${videoFormData.videoUrl ? 'text-emerald-500' : 'text-slate-700'}`} />
                        <p className="text-xs font-black text-white italic">
                          {videoFormData.videoUrl ? '✅ VIDEO LISTO' : 'SUBIR VIDEO'}
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                          {videoFormData.videoUrl ? 'Cambiar Video' : 'Seleccionar'}
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setView('manage_videos')}
                  className="px-8 py-4 bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !videoFormData.videoUrl}
                  className="px-12 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 hover:bg-primary/90 transition-all"
                >
                  {editingVideoId ? 'Guardar Cambios' : 'Publicar Video'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmar Eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">
              {confirmDelete.type === 'module' ? '¿Eliminar Módulo?' : '¿Eliminar Video?'}
            </h3>
            <p className="text-slate-400 text-sm mb-2">{confirmDelete.title}</p>
            {confirmDelete.type === 'module' && (
              <p className="text-red-400 text-xs font-bold mb-8">
                ⚠️ Se eliminarán también todos sus videos asociados.
              </p>
            )}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'module') handleDeleteModule(confirmDelete.id);
                  else {
                    const video = existingVideos.find(v => v.id === confirmDelete.id);
                    if (video) handleDeleteVideo(video);
                  }
                }}
                disabled={isDeleting === confirmDelete.id}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black disabled:opacity-50"
              >
                {isDeleting === confirmDelete.id ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
