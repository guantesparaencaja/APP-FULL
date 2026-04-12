import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  Dumbbell, Play, Clock, ArrowLeft, Upload, Home, X, Plus, Trash2,
  Video, Search, RefreshCw, ChevronRight, AlertCircle, Loader2,
  Settings, Info, CheckSquare, Target, Filter, Download, Shield,
  SlidersHorizontal, ChevronDown, BarChart2, Heart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { uploadVideoToDrive, hardDeleteVideo, approveVideoWithAudit } from '../lib/driveService';
import { db, storage } from '../lib/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc,
  query, where, getDocs,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { getYouTubeEmbedUrl } from '../services/geminiService';
import { Modal } from '../components/Modal';
import { LazyVideoWrapper } from '../components/LazyVideoWrapper';
import { compressImage } from '../utils/imageUtils';
import { WorkoutVideoCard } from '../components/workouts/WorkoutVideoCard';
import { WorkoutFilterModal } from '../components/workouts/WorkoutFilterModal';
import { WorkoutAdminPanel } from '../components/workouts/WorkoutAdminPanel';
import { LyftaImporter } from '../components/workouts/LyftaImporter';
import {
  WorkoutVideo, WorkoutCategory, WorkoutFilters, CustomRoutine,
  getVideoStatus, isVideoVisible,
} from '../types/workout.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const deleteStorageFile = async (url?: string) => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn('[Workouts] Could not delete file from storage:', url, error);
  }
};

const EMPTY_FILTERS: WorkoutFilters = {
  searchQuery: '',
  lugar: null, categoria: null, herramienta: null,
  difficulty: null, objetivo: null, muscleGroup: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Workouts() {
  // ── Core state ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<WorkoutCategory[]>([]);
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<WorkoutVideo | null>(null);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<WorkoutVideo | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLyftaImporter, setShowLyftaImporter] = useState(false);
  const [fullScreenVideoUrl, setFullScreenVideoUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<WorkoutFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ── Routines ──────────────────────────────────────────────────────────────
  const [userRoutines, setUserRoutines] = useState<CustomRoutine[]>([]);
  const [newRoutineName, setNewRoutineName] = useState('');

  // ── Upload form ───────────────────────────────────────────────────────────
  const [uploadForm, setUploadForm] = useState({
    title: '', description: '', level: 'Principiante', categoryId: '',
    duration: 0, instructions: '', common_errors: '', equipment: 'Sin equipo',
    tipo: 'boxeo', objetivo: 'General', video_url: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean; title: string; message: string; confirmText?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ── Store ─────────────────────────────────────────────────────────────────
  const user = useStore((state) => state.user);
  const hasWarmedUp = useStore((state) => state.hasWarmedUp);
  const setHasWarmedUp = useStore((state) => state.setHasWarmedUp);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'teacher';

  // ─── Firebase Listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubCategories = onSnapshot(
      collection(db, 'workout_categories'),
      (snap) => setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkoutCategory)),
      (err) => console.error('[Workouts] Categories error:', err)
    );

    const unsubVideos = onSnapshot(
      collection(db, 'workout_videos'),
      (snap) => {
        setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WorkoutVideo));
        setIsLoading(false);
      },
      (err) => { console.error('[Workouts] Videos error:', err); setIsLoading(false); }
    );

    let unsubRoutines: (() => void) | undefined;
    if (user) {
      const q = query(collection(db, 'custom_routines'), where('user_id', '==', String(user.id)));
      unsubRoutines = onSnapshot(q,
        (snap) => setUserRoutines(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomRoutine)),
        (err) => console.error('[Workouts] Routines error:', err)
      );
    }

    return () => { unsubCategories(); unsubVideos(); if (unsubRoutines) unsubRoutines(); };
  }, [user]);

  // ─── Filtered videos ─────────────────────────────────────────────────────
  const filteredVideos = videos
    .filter((v) => {
      // Role-based visibility (retrocompatible con boolean)
      if (!isVideoVisible(v, !!isAdmin)) return false;

      // Wizard / Filter logic
      if (filters.lugar && v.tipo !== filters.lugar) return false;
      if (filters.categoria) {
        if (v.category_id !== filters.categoria) return false;
      }
      if (filters.herramienta && v.equipment) {
        if (!v.equipment.toLowerCase().includes(filters.herramienta.toLowerCase())) return false;
      }
      if (filters.difficulty && v.difficulty) {
        if (!v.difficulty.toLowerCase().includes(filters.difficulty.toLowerCase())) return false;
      }
      if (filters.objetivo && v.objetivo !== filters.objetivo) return false;

      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          (v.description || '').toLowerCase().includes(q) ||
          (v.equipment || '').toLowerCase().includes(q) ||
          (v.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (!user?.fitnessGoal || user.fitnessGoal === 'general') return 0;
      const gA = a.objetivo || 'general';
      const gB = b.objetivo || 'general';
      if (gA === user.fitnessGoal && gB !== user.fitnessGoal) return -1;
      if (gA !== user.fitnessGoal && gB === user.fitnessGoal) return 1;
      return 0;
    });

  const pendingVideos = videos.filter((v) => getVideoStatus(v) === 'pending');
  const counts = {
    total: videos.length,
    approved: videos.filter((v) => getVideoStatus(v) === 'approved').length,
    pending: pendingVideos.length,
  };
  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'searchQuery' && v !== null
  ).length;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleVideoClick = (video: WorkoutVideo) => {
    const category = categories.find((c) => c.id === video.category_id);
    const isWarmup = category?.name.toLowerCase().includes('calentamiento') ||
      category?.name.toLowerCase().includes('movilidad');

    if (isWarmup) {
      setHasWarmedUp(true);
      setSelectedVideoDetails(video);
    } else if (!hasWarmedUp) {
      setConfirmDialog({
        isOpen: true,
        title: '¡Calentamiento Obligatorio!',
        message: 'Debes completar una secuencia de movilidad antes de iniciar tu rutina para evitar lesiones.',
        confirmText: 'Ir a Calentamiento',
        onConfirm: () => {
          setConfirmDialog((p) => ({ ...p, isOpen: false }));
          navigate('/calentamiento');
        },
      });
    } else {
      setSelectedVideoDetails(video);
    }
  };

  const handleApproveVideo = async (id: string) => {
    try {
      await approveVideoWithAudit(id, user?.id || 'admin', user?.name);
      setVideos((vids) => vids.map((v) => v.id === id ? { ...v, status: 'approved', isApproved: true } : v));
    } catch (err) { console.error('[Workouts] Error approving:', err); }
  };

  const handleDeleteVideo = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Video',
      message: '¿Deseas eliminar este video permanentemente de todas las plataformas?',
      onConfirm: async () => {
        try {
          const vid = videos.find((v) => v.id === id);
          if (vid) {
            await hardDeleteVideo(id, {
              video_url: vid.video_url, cover_url: vid.cover_url,
              title: vid.title, adminId: user?.id,
            });
          } else {
            await deleteDoc(doc(db, 'workout_videos', id));
          }
          setVideos((vids) => vids.filter((v) => v.id !== id));
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (err) { console.error('[Workouts] Error deleting:', err); }
      },
    });
  };

  const handleRejectVideo = async (id: string) => {
    const vid = videos.find((v) => v.id === id);
    if (!vid) return;
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Rechazar y Eliminar',
      message: `¿Rechazar "${vid.title}"? Esto lo eliminará PERMANENTEMENTE de Firestore, Storage y Drive. Esta acción es IRREVERSIBLE.`,
      confirmText: 'Sí, Rechazar',
      onConfirm: async () => {
        try {
          await hardDeleteVideo(id, {
            video_url: vid.video_url, cover_url: vid.cover_url,
            title: vid.title, adminId: user?.id,
          });
          setVideos((vids) => vids.filter((v) => v.id !== id));
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (err) { console.error('[Workouts] Error rejecting:', err); }
      },
    });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const ref_ = await addDoc(collection(db, 'workout_categories'), { name: newCategoryName });
      setCategories([...categories, { id: ref_.id, name: newCategoryName }]);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err) { console.error('[Workouts] Error adding category:', err); }
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Categoría',
      message: '¿Eliminar esta categoría y todos sus videos asociados?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workout_categories', id));
          const toDelete = videos.filter((v) => v.category_id === id);
          for (const vid of toDelete) {
            await deleteStorageFile(vid.video_url);
            await deleteStorageFile(vid.cover_url);
            await deleteDoc(doc(db, 'workout_videos', vid.id));
          }
          setCategories(categories.filter((c) => c.id !== id));
          setVideos(videos.filter((v) => v.category_id !== id));
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (err) { console.error('[Workouts] Error deleting category:', err); }
      },
    });
  };

  const startEditVideo = (video: WorkoutVideo) => {
    setEditingVideo(video);
    setUploadForm({
      title: video.title,
      description: video.description || '',
      level: video.difficulty || 'Principiante',
      categoryId: video.category_id || '',
      duration: video.duration || 0,
      instructions: video.instructions || '',
      common_errors: video.common_errors || '',
      equipment: video.equipment || 'Sin equipo',
      tipo: video.tipo || 'boxeo',
      objetivo: video.objetivo || 'General',
      video_url: video.video_url || '',
    });
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setEditingVideo(null);
    setUploadForm({
      title: '', description: '', level: 'Principiante', categoryId: '',
      duration: 0, instructions: '', common_errors: '', equipment: 'Sin equipo',
      tipo: 'boxeo', objetivo: 'General', video_url: '',
    });
    setCoverFile(null);
    setVideoFile(null);
  };

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const safeName = file.name.replace(/\s+/g, '_');
    const storageRef = ref(storage, `${path}/${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = [];
    if (!uploadForm.title) missing.push('Título');
    if (!uploadForm.categoryId) missing.push('Categoría');
    if (!videoFile && !editingVideo?.video_url && !uploadForm.video_url) missing.push('Video');
    if (missing.length) { alert(`Completa: ${missing.join(', ')}`); return; }

    setIsUploading(true);
    setOverallProgress(0);

    try {
      let currentCoverUrl = editingVideo?.cover_url;
      if (coverFile) {
        const compressed = await compressImage(coverFile, 1024, 0.8);
        currentCoverUrl = await handleFileUpload(compressed, 'entrenos/portadas');
      }

      let currentVideoUrl = uploadForm.video_url || editingVideo?.video_url || '';
      if (videoFile) {
        setOverallProgress(50);
        currentVideoUrl = await uploadVideoToDrive(
          videoFile, String(user?.id || 'admin'),
          (p) => setOverallProgress(50 + p / 2),
          { title: uploadForm.title, type: uploadForm.tipo }
        );
      }

      let finalCategoryId = uploadForm.categoryId;
      const existingCat = categories.find(
        (c) => c.id === finalCategoryId || c.name.toLowerCase() === finalCategoryId.toLowerCase()
      );
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const docRef = await addDoc(collection(db, 'workout_categories'), { name: finalCategoryId });
        finalCategoryId = docRef.id;
      }

      const videoData = {
        title: uploadForm.title,
        description: uploadForm.description,
        category_id: finalCategoryId,
        difficulty: uploadForm.level,
        duration: Number(uploadForm.duration),
        instructions: uploadForm.instructions,
        common_errors: uploadForm.common_errors,
        equipment: uploadForm.equipment,
        tipo: uploadForm.tipo,
        objetivo: uploadForm.objetivo,
        video_url: currentVideoUrl || '',
        cover_url: currentCoverUrl || null,
        createdAt: editingVideo?.createdAt || new Date().toISOString(),
        createdBy: editingVideo?.createdBy || user?.id || 'admin',
        status: 'approved',  // videos subidos por admin son auto-aprobados
        isApproved: true,
      };

      // Limpiar undefined
      (Object.keys(videoData) as Array<keyof typeof videoData>).forEach((key) => {
        if (videoData[key] === undefined) delete (videoData as any)[key];
      });

      if (editingVideo) {
        await updateDoc(doc(db, 'workout_videos', editingVideo.id), videoData);
      } else {
        await addDoc(collection(db, 'workout_videos'), videoData);
      }

      handleCloseUploadModal();
      alert(editingVideo ? 'Video actualizado' : 'Video publicado');
    } catch (err) {
      console.error('[Workouts] Error saving:', err);
      alert('Error al guardar el entrenamiento.');
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
    }
  };

  const cleanupDuplicateVideos = async () => {
    if (!window.confirm('¿Buscar y eliminar videos duplicados por URL?')) return;
    try {
      const snap = await getDocs(collection(db, 'workout_videos'));
      const seen = new Set<string>();
      let removed = 0;
      for (const d of snap.docs) {
        const url = d.data().video_url;
        if (!url) continue;
        if (seen.has(url)) { await deleteDoc(d.ref); removed++; }
        else seen.add(url);
      }
      alert(`Limpieza: ${removed} duplicados eliminados.`);
    } catch (err) { console.error(err); }
  };

  const [syncMsg, setSyncMsg] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncLyfta = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMsg('Buscando siguiente lote...');
    try {
      const { syncWorkoutBatch } = await import('../scripts/seedVideos');
      const result = await syncWorkoutBatch(user?.id || 'admin');
      setSyncMsg(result.message);
      setTimeout(() => setSyncMsg(''), 8000);
    } catch (err: any) {
      setSyncMsg('❌ Error: ' + (err?.message || 'desconocido'));
    } finally {
      setIsSyncing(false);
    }
  };


  // ─── Render ───────────────────────────────────────────────────────────────

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name || '';
  const selectedCategory = categories.find((c) => c.id === filters.categoria);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white pb-32 font-sans">

      {/* ── Admin Floating Actions ── */}
      {isAdmin && (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3">
          {/* Panel de revisión badge */}
          {pendingVideos.length > 0 && (
            <button
              id="admin-panel-trigger"
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-2xl shadow-xl shadow-amber-500/30 font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all"
            >
              <AlertCircle className="w-4 h-4 animate-pulse" />
              {pendingVideos.length} Pendientes
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={cleanupDuplicateVideos}
              className="px-3 py-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all"
              title="Limpiar duplicados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleSyncLyfta}
              disabled={isSyncing}
              id="lyfta-sync-trigger"
              className="px-3 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase hover:bg-emerald-500/20 transition-all flex items-center gap-1 disabled:opacity-50"
              title="Sincronizar siguiente lote de videos Lyfta"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowAdminPanel(true)}
              id="admin-panel-open"
              className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase hover:bg-blue-500/20 transition-all"
              title="Panel de revisión"
            >
              <Shield className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              id="add-video-btn"
              className="p-4 bg-primary text-white rounded-full shadow-2xl shadow-primary/30 hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-slate-900"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* ── SyncMsg Toast ── */}
      {syncMsg && (
        <div className="fixed bottom-40 right-4 z-40 max-w-xs">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl px-4 py-3 shadow-2xl">
            <p className="text-xs text-emerald-400 font-bold">{syncMsg}</p>
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title={editingVideo ? 'Editar Video' : 'Nuevo Entrenamiento'}
      >
        <form onSubmit={handleSubmitVideo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</label>
              <input type="text" required value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Ej: Jab-Cross-Hook Combo"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
              <select required value={uploadForm.categoryId}
                onChange={(e) => setUploadForm({ ...uploadForm, categoryId: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
              >
                <option value="">Seleccionar...</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
            <textarea required value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              rows={3} placeholder="Describe el entrenamiento..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
              <select value={uploadForm.tipo}
                onChange={(e) => setUploadForm({ ...uploadForm, tipo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
              >
                <option value="boxeo">🥊 Boxeo / Técnica</option>
                <option value="gym">🏋️ Gym / HIIT</option>
                <option value="casa">🏠 En Casa</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel</label>
              <select value={uploadForm.level}
                onChange={(e) => setUploadForm({ ...uploadForm, level: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
                <option value="Élite">Élite</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</label>
              <select value={uploadForm.equipment}
                onChange={(e) => setUploadForm({ ...uploadForm, equipment: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
              >
                <option>Sin equipo</option><option>Mancuernas</option>
                <option>Saco de Boxeo</option><option>Vendas / Guantes</option>
                <option>Cuerda para saltar</option><option>Barra y Discos</option>
                <option>Kettlebell</option><option>Bandas elásticas</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</label>
              <select value={uploadForm.objetivo}
                onChange={(e) => setUploadForm({ ...uploadForm, objetivo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none appearance-none"
              >
                <option value="bajar_peso">Bajar de Peso</option>
                <option value="mantener">Mantener</option>
                <option value="aumentar">Aumentar Músculo</option>
                <option value="general">Acondicionamiento</option>
              </select>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Video className="w-4 h-4" /> Enlace o Archivo de Video
            </label>
            <input type="url" value={uploadForm.video_url}
              onChange={(e) => setUploadForm({ ...uploadForm, video_url: e.target.value })}
              placeholder="https://apilyfta.com/... o YouTube..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none"
            />
            <input type="file" accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 w-full text-slate-500"
            />
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-primary uppercase">
                <span>Subiendo...</span><span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }}
                  className="bg-primary h-full rounded-full" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleCloseUploadModal} disabled={isUploading}
              className="flex-1 py-3 rounded-2xl text-sm font-black uppercase text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isUploading}
              className="flex-[2] bg-primary text-white py-3 rounded-2xl text-sm font-black uppercase shadow-xl shadow-primary/30 disabled:opacity-50 transition-all">
              {isUploading ? 'Procesando...' : editingVideo ? 'Actualizar' : 'Publicar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Header ── */}
      <header className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-none">
                ENTRENAMIENTOS
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                {filteredVideos.length} ejercicios disponibles
              </p>
            </div>
          </div>
          <button onClick={() => navigate('/')}
            className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary transition-all shadow-sm">
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Filter row */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              id="workout-search"
              placeholder="Buscar ejercicio..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:border-primary shadow-sm transition-all"
            />
          </div>
          <button
            id="filters-btn"
            onClick={() => setShowFilterModal(true)}
            className={`relative flex items-center gap-2 px-4 py-3.5 rounded-2xl border font-black text-sm transition-all ${
              activeFilterCount > 0
                ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-primary/30">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filters pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {filters.lugar && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">
                {filters.lugar === 'casa' ? '🏠 Casa' : filters.lugar === 'gym' ? '🏋️ Gym' : '🥊 Boxeo'}
                <button onClick={() => setFilters({ ...filters, lugar: null })} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.categoria && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">
                {selectedCategory?.name || filters.categoria}
                <button onClick={() => setFilters({ ...filters, categoria: null })} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.difficulty && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase">
                {filters.difficulty}
                <button onClick={() => setFilters({ ...filters, difficulty: null })} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Category pills horizontal scroll */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilters({ ...filters, categoria: null })}
            className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              !filters.categoria
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl border-transparent'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="relative group/cat flex-shrink-0">
              <button
                onClick={() => setFilters({ ...filters, categoria: cat.id })}
                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  filters.categoria === cat.id
                    ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {cat.name}
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/cat:opacity-100 transition-opacity shadow-lg z-10"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
          {isAdmin && (
            showAddCategory ? (
              <form onSubmit={handleAddCategory} className="flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded-2xl flex-shrink-0">
                <input
                  type="text" value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nombre..." autoFocus
                  className="bg-transparent border-none text-[10px] font-bold text-slate-900 dark:text-white outline-none w-24"
                />
                <button type="submit" className="text-primary"><Plus className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setShowAddCategory(false)} className="text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddCategory(true)}
                className="whitespace-nowrap px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all flex items-center gap-1 flex-shrink-0"
              >
                <Plus className="w-3 h-3" /> Categoría
              </button>
            )
          )}
        </div>
      </header>

      {/* ── Admin pending alert ── */}
      {isAdmin && pendingVideos.length > 0 && (
        <div className="mx-4 sm:mx-6 mb-6">
          <button
            onClick={() => setShowAdminPanel(true)}
            className="w-full flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                {pendingVideos.length} video{pendingVideos.length !== 1 ? 's' : ''} pendiente{pendingVideos.length !== 1 ? 's' : ''} de revisión
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      )}

      {/* ── Video Grid ── */}
      <main className="px-4 sm:px-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🥊</div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">
              Sin resultados
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              No hay videos que coincidan con tus filtros.
            </p>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters(EMPTY_FILTERS)}
                className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-primary/30">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map((video, i) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <WorkoutVideoCard
                    video={video}
                    category={categories.find((c) => c.id === video.category_id)}
                    isAdmin={!!isAdmin}
                    onPlay={handleVideoClick}
                    onApprove={isAdmin ? handleApproveVideo : undefined}
                    onReject={isAdmin ? handleRejectVideo : undefined}
                    onEdit={isAdmin ? startEditVideo : undefined}
                    onDelete={isAdmin ? handleDeleteVideo : undefined}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* ── Filter Modal ── */}
      <WorkoutFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
        activeCount={activeFilterCount}
      />

      {/* ── Admin Panel Drawer ── */}
      <WorkoutAdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        pendingVideos={pendingVideos}
        categories={categories}
        counts={counts}
        adminId={user?.id || 'admin'}
        adminName={user?.name}
        onRefetch={() => {}} // onSnapshot ya mantiene todo en sync
      />

      {/* ── Lyfta Importer ── */}
      <LyftaImporter
        isOpen={showLyftaImporter}
        onClose={() => setShowLyftaImporter(false)}
        categories={categories}
        userId={user?.id || 'guest'}
        onImported={() => {}}
      />

      {/* ── Video Detail Modal ── */}
      {selectedVideoDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            {/* Video player */}
            <div className="relative aspect-video bg-black">
              {selectedVideoDetails.video_url ? (
                (() => {
                  const src = getYouTubeEmbedUrl(selectedVideoDetails.video_url);
                  if (src.includes('youtube.com') || src.includes('youtu.be')) {
                    return <iframe src={src.replace('controls=0', 'controls=1').replace('mute=1', 'mute=0')}
                      className="absolute inset-0 w-full h-full" allowFullScreen />;
                  }
                  if (src.endsWith('.gif')) {
                    return <img src={src} alt={selectedVideoDetails.title}
                      className="absolute inset-0 w-full h-full object-contain" referrerPolicy="no-referrer" />;
                  }
                  return <LazyVideoWrapper id="workout-detail-video" src={src} className="absolute inset-0 w-full h-full object-contain"
                    controls autoPlay playsInline />;
                })()
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <Dumbbell className="w-16 h-16" />
                </div>
              )}
              <button onClick={() => setSelectedVideoDetails(null)}
                className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                title="Cerrar">
                <X className="w-5 h-5" />
              </button>
              {/* Botón Pantalla Completa */}
              {selectedVideoDetails.video_url && (
                <button
                  onClick={() => {
                    const videoEl = document.querySelector('#workout-detail-video') as HTMLVideoElement | null;
                    if (videoEl?.requestFullscreen) videoEl.requestFullscreen();
                    else if ((videoEl as any)?.webkitRequestFullscreen) (videoEl as any).webkitRequestFullscreen();
                  }}
                  className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  title="Pantalla completa">
                  <Play className="w-3.5 h-3.5" /> Pantalla Completa
                </button>
              )}
            </div>

            {/* Info */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-2">
                    {selectedVideoDetails.title}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideoDetails.difficulty && (
                      <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase">
                        {selectedVideoDetails.difficulty}
                      </span>
                    )}
                    {selectedVideoDetails.equipment && (
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase">
                        {selectedVideoDetails.equipment}
                      </span>
                    )}
                    {selectedVideoDetails.duration && (
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {selectedVideoDetails.duration}min
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowRoutineModal(true)}
                  className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                  title="Añadir a rutina">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-5">
                <section>
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Descripción
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {selectedVideoDetails.description || 'Sin descripción disponible para este ejercicio.'}
                  </p>
                </section>
                {selectedVideoDetails.instructions && (
                  <section>
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Instrucciones
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {selectedVideoDetails.instructions}
                      </p>
                    </div>
                  </section>
                )}
                {selectedVideoDetails.common_errors && (
                  <section>
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Errores Comunes
                    </h3>
                    <div className="bg-red-50 dark:bg-red-500/5 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
                      <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line leading-relaxed">
                        {selectedVideoDetails.common_errors}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 space-y-3">
              {isAdmin && (
                <div className="flex gap-2 p-3 bg-primary/5 rounded-2xl border border-primary/20">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">
                      Gestión
                    </p>
                    <p className="text-xs text-slate-400">
                      {getVideoStatus(selectedVideoDetails) === 'approved' ? '✅ Aprobado' : '⏳ Pendiente'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getVideoStatus(selectedVideoDetails) === 'pending' && (
                      <button
                        onClick={() => { handleApproveVideo(selectedVideoDetails.id); setSelectedVideoDetails(null); }}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                        Aprobar
                      </button>
                    )}
                    <button
                      onClick={() => { handleDeleteVideo(selectedVideoDetails.id); setSelectedVideoDetails(null); }}
                      className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setSelectedVideoDetails(null)}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                  Cerrar
                </button>
                {selectedVideoDetails.video_url && (
                  <button
                    onClick={() => setFullScreenVideoUrl(selectedVideoDetails.video_url!)}
                    className="flex-[2] bg-primary text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Play className="w-5 h-5 fill-current" /> Pantalla Completa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Routine Modal ── */}
      {showRoutineModal && selectedVideoDetails && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Añadir a Rutina</h3>
              <button onClick={() => setShowRoutineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 mb-5 max-h-56 overflow-y-auto">
              {userRoutines.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm italic">No tienes rutinas creadas.</p>
              ) : (
                userRoutines.map((routine) => (
                  <button key={routine.id}
                    onClick={async () => {
                      try {
                        const updated = [...routine.exercises, selectedVideoDetails.id];
                        await updateDoc(doc(db, 'custom_routines', routine.id), { exercises: updated });
                        setUserRoutines(userRoutines.map((r) => r.id === routine.id ? { ...r, exercises: updated } : r));
                        setShowRoutineModal(false);
                        alert(`Añadido a ${routine.name}`);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group">
                    <span className="font-bold text-sm">{routine.name}</span>
                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full group-hover:bg-primary/20">
                      {routine.exercises.length} ej.
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">O crea una nueva</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Nombre de la rutina" value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={async () => {
                    if (!newRoutineName.trim()) return;
                    try {
                      const data = {
                        user_id: String(user?.id),
                        name: newRoutineName,
                        exercises: [selectedVideoDetails.id],
                        createdAt: new Date().toISOString(),
                      };
                      const ref_ = await addDoc(collection(db, 'custom_routines'), data);
                      setUserRoutines([...userRoutines, { id: ref_.id, ...data }]);
                      setNewRoutineName('');
                      setShowRoutineModal(false);
                      alert(`Rutina "${newRoutineName}" creada.`);
                    } catch (err) { console.error(err); }
                  }}
                  className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Video ── */}
      {fullScreenVideoUrl && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col">
          <div className="p-4 flex justify-end absolute top-0 left-0 right-0 z-10">
            <button onClick={() => setFullScreenVideoUrl(null)}
              className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {fullScreenVideoUrl.includes('youtube.com') || fullScreenVideoUrl.includes('youtu.be') ? (
              <iframe
                src={getYouTubeEmbedUrl(fullScreenVideoUrl).replace('controls=0', 'controls=1').replace('mute=1', 'mute=0')}
                className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" />
            ) : fullScreenVideoUrl.endsWith('.gif') ? (
              <img src={fullScreenVideoUrl} alt="Fullscreen" className="w-full h-full max-h-screen object-contain" referrerPolicy="no-referrer" />
            ) : (
              <LazyVideoWrapper src={fullScreenVideoUrl} className="w-full h-full max-h-screen object-contain"
                controls autoPlay playsInline referrerPolicy="no-referrer" />
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase italic">
              {confirmDialog.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white py-3 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm">
                Cancelar
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 text-sm">
                {confirmDialog.confirmText || 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
