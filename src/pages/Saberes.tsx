import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PlayCircle, CheckCircle, Lock, ArrowLeft, Upload, Check, Video, Plus, X, Edit2, Trash2, Play, Loader2, Award, Shield, AlertTriangle, ChevronRight, User, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { getDriveEmbedUrl, isDriveUrl } from '../lib/driveService';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/fcmService';
import { InteractiveLesson } from '../components/InteractiveLesson';
import { BoxingGlossary } from '../components/BoxingGlossary';
import { VendajeTutorial } from '../components/VendajeTutorial';
import { BoxeoModule } from './BoxeoModule';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/PageHeader';
import { staggerContainer, staggerItem, spring, scaleIn } from '../lib/animations';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: number;
  level: number;
  category: string;
  video_url: string;
}

interface Combo {
  id: string;
  name: string;
  video_approved: boolean;
  manillas_approved: boolean;
  contacto_approved: boolean;
  desarrollo_approved: boolean;
  video_url?: string;
  level: number;
}

interface ComboProgress {
  id: string;
  combo_id: string;
  user_id: string;
  user_name: string;
  video_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: any;
  video_approved?: boolean;
  manillas_approved?: boolean;
  contacto_approved?: boolean;
  desarrollo_approved?: boolean;
}

// Removal of legacy Evaluation interface and showEvaluations state


const DBZ_RANKS = [
  { level: 1, name: "Humano", icon: "👨‍🦲", color: "text-slate-400", glow: "shadow-slate-500/20" },
  { level: 2, name: "Discípulo de Roshi", icon: "🐢", color: "text-orange-400", glow: "shadow-orange-500/20" },
  { level: 3, name: "Guerrero Z", icon: "⭐", color: "text-emerald-400", glow: "shadow-emerald-500/20" },
  { level: 4, name: "Sayayin de Élite", icon: "🦍", color: "text-red-400", glow: "shadow-red-500/20" },
  { level: 5, name: "Super Sayayin", icon: "🔥", color: "text-yellow-400", glow: "shadow-yellow-500/40" },
  { level: 6, name: "Super Sayayin 2", icon: "⚡", color: "text-yellow-300", glow: "shadow-yellow-400/50" },
  { level: 7, name: "Super Sayayin 3", icon: "✨", color: "text-yellow-200", glow: "shadow-yellow-300/60" },
  { level: 8, name: "Super Sayayin Dios", icon: "🔴", color: "text-red-500", glow: "shadow-red-600/70" },
  { level: 9, name: "Super Sayayin Blue", icon: "🔵", color: "text-blue-500", glow: "shadow-blue-500/80" },
  { level: 10, name: "Ultra Instinto (S)", icon: "🌀", color: "text-slate-300", glow: "shadow-slate-200/90" },
  { level: 11, name: "Ultra Instinto (D)", icon: "⚪", color: "text-white", glow: "shadow-white/100" },
  { level: 12, name: "Dios de la Destrucción", icon: "🟣", color: "text-violet-400", glow: "shadow-violet-400/100" }
];



export function Saberes() {
  const user = useStore((state) => state.user);
  const hasWarmedUp = useStore((state) => state.hasWarmedUp);
  const hasSeenVendaje = useStore((state) => state.hasSeenVendaje);
  const setHasWarmedUp = useStore((state) => state.setHasWarmedUp);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingComboId, setUploadingComboId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tutorialUploadProgress, setTutorialUploadProgress] = useState<number | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboProgress, setComboProgress] = useState<ComboProgress[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [showAddCombo, setShowAddCombo] = useState(false);
  const [newComboName, setNewComboName] = useState('');
  const [newComboLevel, setNewComboLevel] = useState(1);
  const [editingComboLevel, setEditingComboLevel] = useState<{id: string, level: number} | null>(null);
  const adminVideoInputRef = useRef<HTMLInputElement>(null);
  const tutorialFileInputRef = useRef<HTMLInputElement>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [showAddTutorial, setShowAddTutorial] = useState(false);
  const [newTutorial, setNewTutorial] = useState({ title: '', description: '', duration: 60, level: 1, category: 'técnica', video_url: '' });
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, confirmText?: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [activeLesson, setActiveLesson] = useState<Tutorial | null>(null);
  const [showVendajes, setShowVendajes] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ [key: string]: string }>({});
  const [allStudents, setAllStudents] = useState<{ id: string; name: string }[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Aprender' | 'Combos y Evaluación'>('Aprender');
  // ✅ Preview de video: muestra el video al estudiante antes de confirmar el envío
  const [videoPreview, setVideoPreview] = useState<{ file: File; previewUrl: string; comboId: string; isAdmin?: boolean } | null>(null);
  // ✅ Fullscreen video tutorial
  const [fullscreenVideo, setFullscreenVideo] = useState<Tutorial | null>(null);


  // Legacy evaluation handlers removed. New system uses combo_progress exclusively.


  const handleTutorialClick = (tutorial: Tutorial) => {
    const isWarmup = tutorial.category.toLowerCase().includes('calentamiento') || tutorial.category.toLowerCase().includes('movilidad');
    
    if (isWarmup) {
      setHasWarmedUp(true);
      setActiveLesson(tutorial);
    } else if (!hasWarmedUp) {
      setConfirmDialog({
        isOpen: true,
        title: '¡Espera! Calentamiento Obligatorio',
        message: 'Debes completar una secuencia de movilidad o calentamiento antes de iniciar tu rutina para evitar lesiones.',
        confirmText: 'Ir a Calentamiento',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          navigate('/calentamiento');
        }
      });
    } else {
      setActiveLesson(tutorial);
    }
  };

  const seedInitialCombos = async () => {
    if (seeding) return;
    setSeeding(true);
    
    const initialCombos = [
      // Nivel 1: Humano (Basicos)
      { name: '1 2 / 2 1 / 5 6 -- 3 4 4 3', level: 1 },
      { name: '1 2 / 3 4 - 2 1', level: 1 },
      { name: '1 2 3 4 - 2', level: 1 },
      // Nivel 2: Discipulo de Roshi (Coordinacion)
      { name: '2 1 / 5 6 - 4 3 P 2 1 2', level: 2 },
      { name: '1 2 3 4 5 - 2 1', level: 2 },
      { name: 'DJ 2 / 3 4 - 2', level: 2 },
      // Nivel 3: Guerrero Z (Defensa)
      { name: 'DJ 2 / - P 1 2 3 / 3', level: 3 },
      { name: '1 2 - 3 4 / 2 1', level: 3 },
      { name: 'DJ - 3 4 / 2', level: 3 },
      // Nivel 4: Sayayin de Elite (Contra-ataque)
      { name: '6 3 2 / - PE 5 3 2 P', level: 4 },
      { name: '1 2 / 3 - 5 6 / 2', level: 4 },
      { name: 'DJ / 3 4 - 2 1 / 2', level: 4 },
      // Nivel 5: Super Sayayin (Fluidez)
      { name: '2 PI 1 PD 1 / 2 / PA 3 2 1 4', level: 5 },
      { name: '1 2 PA 1 2 / 3', level: 5 },
      { name: 'DUP P 1 2', level: 5 },
      // Nivel 6: SSJ 2 (Presion)
      { name: '6 3 / 5 3 2 - 2 1 P', level: 6 },
      { name: '1 2 3 4 5 6 7 8', level: 6 },
      { name: 'DJ 2 PA DUP P', level: 6 },
      // Nivel 7: SSJ 3 (Angulos - Lomachenko)
      { name: '6 3 / 5 3 2 - 2 DR P', level: 7 },
      { name: '1 2 P 3 4', level: 7 },
      { name: 'DJ P 3 2', level: 7 },
      { name: '1 2 - 3 2', level: 7 },
      { name: '1 2 / 9 3 / 2', level: 7 },
      // Nivel 8: SSJ Dios (Velocidad - Naoya Inoue)
      { name: 'DUP 2 / 10 - / 3 2 2 1 PA', level: 8 },
      { name: '1 1 2 3 2', level: 8 },
      { name: '1 2 9 2 3', level: 8 },
      { name: 'DJ 2 9 3', level: 8 },
      { name: '1 2 3 2 9 2', level: 8 },
      // Nivel 9: SSJ Blue (Maestria Cuerpo)
      { name: '1 1 8 1 1 2 / 9 3 - 5 6 PA 1', level: 9 },
      { name: '1 2 9 5 2', level: 9 },
      { name: '1 8 3 6 3', level: 9 },
      { name: 'DJ 9 2 5 3', level: 9 },
      { name: '1 2 9 3 2 5', level: 9 },
      // Nivel 10: Ultra Instinto S (Contraataque - Mayweather)
      { name: '2 2 7 2 2 1 / 10 4 - 5 6 PA 2', level: 10 },
      { name: '1 2 - 2 3', level: 10 },
      { name: '1 2 / 5 3 2', level: 10 },
      { name: '1 F 3 2 P 2', level: 10 },
      { name: '1 2 P 2 9', level: 10 },
      // Nivel 11: Ultra Instinto D (Perfeccion)
      { name: '7 8 - / PE 5 6 4 3 / PA', level: 11 },
      { name: '1 2 - 2 / 5 3 2', level: 11 },
      { name: 'DJ 2 - / 5 3 2', level: 11 },
      { name: '1 2 9 3 - / 2 5', level: 11 },
      { name: '1 F 9 2 - 5 3 2', level: 11 },
      // Nivel 12: Dios de la Destruccion
      { name: '8 7 - / PE 6 5 4 3 / PA', level: 12 },
      { name: '1 1 2 3 2 - / 5 3 2', level: 12 },
      { name: '1 2 3 2 5 6 9 3 2 - / 3 2', level: 12 },
      { name: '1 2 9 3 - / P 5 3 - 2', level: 12 },
      { name: '1 F 2 - 9 5 3 - / P 3 2', level: 12 },
      { name: 'DJ 2 P 9 3 2 - / 5', level: 12 },
      { name: 'DJ 2 9 3 5 3 - / 2 P 3 2', level: 12 },
    ];

    try {
      for (const c of initialCombos) {
        await supabase.from('combos').insert({ name: c.name, level: c.level, video_approved: false, manillas_approved: false, contacto_approved: false, desarrollo_approved: false });
      }
      setConfirmDialog({ isOpen: true, title: 'Combos Cargados', message: '50 Combos tecnicos cargados correctamente en la base de datos.', onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    } catch (err) { console.error('Error seeding combos:', err); } finally { setSeeding(false); }
  };

  const seedInitialTutorials = async () => {
    if (seeding) return;
    setSeeding(true);
    const initialTutorials = [
      {
        title: 'Posición de Combate y Desplazamiento',
        description: 'La base de todo boxeador. Aprende a pararte y moverte con equilibrio.',
        duration: 45,
        level: 1,
        category: 'Técnica Básica',
        video_url: 'https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4' // Placeholder video funcional
      },
      {
        title: 'El Recto (Jab y Cross)',
        description: 'Los golpes más importantes. Aprende la rotación y el alcance correcto.',
        duration: 60,
        level: 1,
        category: 'Golpeo',
        video_url: 'https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4'
      },
      {
        title: 'Combinación 1-2 (Jab-Cross)',
        description: 'La combinación fundamental. Coordinación y fluidez.',
        duration: 50,
        level: 1,
        category: 'Combinaciones',
        video_url: 'https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4'
      }
    ];

    try {
      for (const t of initialTutorials) { await supabase.from('tutorials').insert(t); }
      setConfirmDialog({ isOpen: true, title: 'Tutoriales Cargados', message: 'Tutoriales iniciales cargados correctamente.', onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    } catch (err) { console.error('Error seeding tutorials:', err); } finally { setSeeding(false); }
  };


  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: combosData } = await supabase.from('combos').select('*').order('level');
      if (combosData) setCombos(combosData as Combo[]);
      const maxLevel = (user.role === 'admin' || user.role === 'teacher') ? 999 : (user.license_level || 1) + 1;
      const { data: tutData } = await supabase.from('tutorials').select('*').lte('level', maxLevel).order('level');
      if (tutData) setTutorials(tutData as Tutorial[]);
      const progressQ = supabase.from('combo_progress').select('*');
      if (user.role !== 'admin' && user.role !== 'teacher') progressQ.eq('user_id', String(user.id));
      const { data: progData } = await progressQ;
      if (progData) setComboProgress(progData as ComboProgress[]);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) return;
    const { data } = await supabase.from('profiles').select('id, name').eq('role', 'student');
    if (data) setAllStudents(data.map(s => ({ id: s.id, name: s.name })));
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    loadStudents();
    const ch = supabase.channel('saberes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combos' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combo_progress' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const fetchTutorials = async () => {
    const { data } = await supabase.from('tutorials').select('*').order('level');
    if (data) setTutorials(data as Tutorial[]);
  };

  const handleTutorialVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Por favor, selecciona un archivo de video.');
        return;
      }
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = async () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 300) {
          alert('El video no puede durar más de 5 minutos (300 segundos).');
        } else {
          setTutorialUploadProgress(0);
          try {
            const ext = file.name.split('.').pop();
            const storagePath = `tutorials/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('gpte-videos').upload(storagePath, file, { upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from('gpte-videos').getPublicUrl(storagePath);
            setNewTutorial(prev => ({ ...prev, video_url: data.publicUrl }));
          } catch (err: any) {
            alert('Error al subir: ' + err.message);
          } finally {
            setTutorialUploadProgress(null);
            if (tutorialFileInputRef.current) tutorialFileInputRef.current.value = '';
          }
        }
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleAddTutorial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('tutorials').insert(newTutorial);
      setShowAddTutorial(false);
      setNewTutorial({ title: '', description: '', duration: 60, level: 1, category: 'técnica', video_url: '' });
      fetchTutorials();
    } catch (err) { console.error(err); }
  };

  const handleDeleteTutorial = (id: string) => {
    setConfirmDialog({ isOpen: true, title: 'Eliminar Tutorial', message: '¿Estás seguro?',
      onConfirm: async () => {
        try { await supabase.from('tutorials').delete().eq('id', id); fetchTutorials(); } catch (err) { console.error(err); }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleVideoUploadClick = (comboId: string) => {
    setUploadingComboId(comboId);
    setUploadProgress(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Por favor, selecciona un archivo de video.');
      return;
    }

    // Validar duración: Admin = 300s (5 min), Estudiante = 180s (3 min)
    const maxDuration = user?.role === 'admin' ? 300 : 180;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > maxDuration) {
        if (user?.role === 'admin') {
          alert('El video no puede durar más de 5 minutos (300 segundos).');
        } else {
          alert('Tu video no puede durar más de 3 minutos (180 segundos). Recórtalo e inténtalo de nuevo.');
        }
        return;
      }
      // ✅ Mostrar preview antes de confirmar
      const previewUrl = URL.createObjectURL(file);
      if (user?.role === 'admin' && editingCombo) {
        setVideoPreview({ file, previewUrl, comboId: editingCombo.id, isAdmin: true });
      } else if (uploadingComboId) {
        setVideoPreview({ file, previewUrl, comboId: uploadingComboId });
      }
    };
    video.src = URL.createObjectURL(file);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (adminVideoInputRef.current) adminVideoInputRef.current.value = '';
  };

  const handleConfirmVideoUpload = async (file: File, isAdmin = false) => {
    setUploadProgress(0);
    try {
      if (isAdmin && editingCombo) {
        const ext = file.name.split('.').pop();
        const storagePath = `combo_videos/admin_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('gpte-videos').upload(storagePath, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('gpte-videos').getPublicUrl(storagePath);
        await supabase.from('combos').update({ video_url: data.publicUrl }).eq('id', editingCombo.id);
        setEditingCombo(null);
        alert('Video de referencia actualizado correctamente.');
      } else {
        const ext = file.name.split('.').pop();
        const storagePath = `combo_videos/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('gpte-videos').upload(storagePath, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('gpte-videos').getPublicUrl(storagePath);
        const comboId = videoPreview?.comboId;
        if (comboId) {
          await supabase.from('combo_progress').insert({
            combo_id: comboId, user_id: user?.id || '', user_name: user?.name || '', video_url: data.publicUrl, status: 'pending', created_at: new Date().toISOString(),
          });
        }
        alert('Video enviado para revisión.');
      }
    } catch (err: any) { alert('Error al subir: ' + (err?.message || 'Intenta de nuevo')); } finally {
      setUploadProgress(null); setUploadingComboId(null);
      if (videoPreview?.previewUrl) URL.revokeObjectURL(videoPreview.previewUrl);
      setVideoPreview(null);
    }
  };

  const handleCancelVideoPreview = () => {
    if (videoPreview?.previewUrl) URL.revokeObjectURL(videoPreview.previewUrl);
    setVideoPreview(null);
    setUploadingComboId(null);
    setUploadProgress(null);
  };

  const handleAddCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComboName.trim()) return;
    try {
      await supabase.from('combos').insert({ name: newComboName, level: newComboLevel, video_approved: false, manillas_approved: false, contacto_approved: false, desarrollo_approved: false });
      setNewComboName(''); setNewComboLevel(1); setShowAddCombo(false);
    } catch (err) { console.error(err); }
  };

  const handleUpdateComboLevel = async (comboId: string, newLevel: number) => {
    try { await supabase.from('combos').update({ level: newLevel }).eq('id', comboId); setEditingComboLevel(null); } catch (err) { console.error(err); }
  };

  const handleDeleteProgressVideo = (comboId: string, userId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Video de Prueba',
      message: '¿Estás seguro de que deseas eliminar este video de prueba?',
      onConfirm: async () => {
        try {
          // Implementation depends on how progress is stored
          console.log('Delete progress video', comboId, userId);
        } catch (err) {
          console.error(err);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteCombo = (id: string) => {
    setConfirmDialog({ isOpen: true, title: 'Eliminar Combo', message: '¿Estás seguro?',
      onConfirm: async () => {
        try {
          await supabase.from('combos').delete().eq('id', id);
        } catch (err) { console.error(err); }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteComboVideo = async (combo: Combo) => {
    if (!confirm('¿Eliminar el video explicativo de este combo?')) return;
    try {
      await supabase.from('combos').update({ video_url: '' }).eq('id', combo.id);
      alert('✅ Video explicativo eliminado.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el video.');
    }
  };

  const handleApproveCombo = async (comboId: string, type: 'video' | 'manillas' | 'contacto' | 'desarrollo', userId: string) => {
    try {
      await supabase.from('combos').update({ [`${type}_approved`]: true }).eq('id', comboId);
      await sendPushNotification(userId, '✅ ¡Combo Aprobado!', `Tu progreso en ${type} ha sido aprobado. ¡Sigue así!`, { type: 'success' });
    } catch (err) { console.error(err); }
  };

  const handleApproveComboInPerson = async (comboId: string, studentId: string, studentName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Aprobar Combo en Vivo',
      message: `¿Aprobar el combo "${combos.find(c => c.id === comboId)?.name || ''}" para ${studentName} en clase?`,
      confirmText: 'Aprobar Ahora',
      onConfirm: async () => {
        try {
          // 1. Upsert combo_progress as approved
          const existing = comboProgress.find(p => p.combo_id === comboId && p.user_id === studentId);
          if (existing) {
            await supabase.from('combo_progress').update({
              video_approved: true, manillas_approved: true, contacto_approved: true, desarrollo_approved: true, status: 'approved'
            }).eq('id', existing.id);
          } else {
            await supabase.from('combo_progress').insert({
              combo_id: comboId, user_id: studentId, user_name: studentName, video_url: '', status: 'approved',
              video_approved: true, manillas_approved: true, contacto_approved: true, desarrollo_approved: true,
              created_at: new Date().toISOString()
            });
          }

          // 2. Count total approved combos for this student
          const { data: allProgress } = await supabase.from('combo_progress').select('combo_id').eq('user_id', studentId).eq('status', 'approved');
          const approvedCount = (allProgress || []).length;

          // 3. Determine new license level based on approved combos
          let newLevel = 1;
          if (approvedCount >= 40) newLevel = 12;
          else if (approvedCount >= 35) newLevel = 11;
          else if (approvedCount >= 30) newLevel = 10;
          else if (approvedCount >= 25) newLevel = 9;
          else if (approvedCount >= 20) newLevel = 8;
          else if (approvedCount >= 17) newLevel = 7;
          else if (approvedCount >= 14) newLevel = 6;
          else if (approvedCount >= 10) newLevel = 5;
          else if (approvedCount >= 7) newLevel = 4;
          else if (approvedCount >= 4) newLevel = 3;
          else if (approvedCount >= 2) newLevel = 2;

          // 4. Update license_level if higher
          const { data: studentProfile } = await supabase.from('profiles').select('license_level').eq('id', studentId).single();
          if (studentProfile && newLevel > (studentProfile.license_level || 1)) {
            await supabase.from('profiles').update({ license_level: newLevel }).eq('id', studentId);
          }

          // 5. Send notification
          const comboName = combos.find(c => c.id === comboId)?.name || 'Combo';
          await sendPushNotification(studentId, '✅ ¡Combo Aprobado en Clase!', `${comboName} ha sido aprobado por el profesor. Nivel de licencia: ${newLevel}`, { type: 'success' });

          // 6. Reload progress
          await loadAll();

          alert(`${studentName} ha aprobado "${comboName}" en clase. Nivel de licencia: ${newLevel}`);
        } catch (err) {
          console.error(err);
          alert('Error al aprobar el combo.');
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Show ALL combos to students (no video requirement), sorted by level then name
  const visibleCombos = [...combos].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name);
  });

  // Group combos by level for display
  const combosByLevel = visibleCombos.reduce<Record<number, Combo[]>>((acc, combo) => {
    if (!acc[combo.level]) acc[combo.level] = [];
    acc[combo.level].push(combo);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display p-4 pb-32">
      <PageHeader
        emoji="🥊"
        title="Licencia Provisional"
        subtitle="Saberes Box · Formación técnica y combos"
        right={
          <div className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer btn-press" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft className="w-8 h-8" />
          </div>
        }
      />

      <input 
        type="file" 
        accept="video/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <input 
        type="file" 
        accept="video/*" 
        ref={adminVideoInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      {/* ✅ Modal de Preview de Video - confirmar o rechazar antes de enviar */}
      {videoPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-4">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-black text-white text-lg">Vista Previa del Video</h3>
              <button aria-label="Cerrar" type="button" onClick={handleCancelVideoPreview} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <video
              src={videoPreview.previewUrl}
              controls
              autoPlay
              className="w-full max-h-64 bg-black object-contain"
            />
            <div className="p-4 flex flex-col gap-3">
              <p className="text-slate-400 text-sm text-center">¿Este es el video correcto que quieres enviar para revisión?</p>
              {uploadProgress !== null && (
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelVideoPreview}
                  className="btn-press flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Rechazar — Elegir otro
                </button>
                <button
                  onClick={() => handleConfirmVideoUpload(videoPreview.file, videoPreview.isAdmin)}
                  disabled={uploadProgress !== null}
                  className="btn-press flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploadProgress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {uploadProgress !== null ? `Enviando ${uploadProgress}%...` : 'Confirmar y Enviar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ Modal Fullscreen Tutorial */}
      {fullscreenVideo && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-primary uppercase tracking-widest truncate">{fullscreenVideo.category}</p>
              <h4 className="text-base font-black text-white uppercase italic tracking-tight truncate">{fullscreenVideo.title}</h4>
            </div>
            <button aria-label="Cerrar"
              onClick={() => setFullscreenVideo(null)}
              className="btn-press ml-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Video fullscreen */}
          <div className="flex-1 bg-black flex items-center justify-center">
            {fullscreenVideo.video_url ? (
              <video
                src={fullscreenVideo.video_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-slate-600">
                <Video className="w-16 h-16" />
                <p className="text-sm font-bold uppercase">Sin video disponible</p>
              </div>
            )}
          </div>
          {/* Descripción completa */}
          <div className="bg-slate-950 border-t border-slate-800 px-5 py-4 max-h-40 overflow-y-auto">
            {fullscreenVideo.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{fullscreenVideo.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-black uppercase">Nivel {fullscreenVideo.level}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{fullscreenVideo.duration}min</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Reveal direction="none">
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button
            onClick={() => setActiveTab('Aprender')}
            className={`btn-press flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'Aprender' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            Aprender Boxeo
          </button>
          <button
            onClick={() => setActiveTab('Combos y Evaluación')}
            className={`btn-press flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'Combos y Evaluación' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            Combos y Evaluación
          </button>
        </div>
      </Reveal>

      {activeTab === 'Aprender' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 -mx-4 h-full">
          <ErrorBoundary>
            <BoxeoModule isEmbedded={true} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'Combos y Evaluación' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Reveal direction="none">
            <BoxingGlossary />
          </Reveal>

          {(!hasSeenVendaje && user?.vendaje_progreso !== 100) ? (
            <VendajeTutorial />
          ) : (
            <>
              <section className="mb-6">
                <Reveal direction="none">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold tracking-tight">Módulos de Formación</h2>
                    <button
                      onClick={() => setShowVendajes(!showVendajes)}
                      className="btn-press text-primary text-sm font-bold flex items-center gap-1"
                    >
                      {showVendajes ? 'Ocultar Vendajes' : 'Ver Vendajes'}
                    </button>
                  </div>
                </Reveal>

            {showVendajes && (
              <div className="mb-8 animate-in fade-in slide-in-from-top-4">
                <VendajeTutorial />
              </div>
            )}

        <Reveal direction="none">
          <h2 className="text-3xl font-bold tracking-tight mb-6 mt-8">Progreso de Licencia</h2>
        </Reveal>
        
        {user?.role === 'admin' && (
          <div className="mb-6">
            {!showAddCombo ? (
              <div className="flex gap-3">
                <button aria-label="Agregar" type="button" 
                  onClick={() => setShowAddCombo(true)}
                  className="btn-press flex-1 flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/50 py-3 rounded-xl font-bold hover:bg-primary/30 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Combo
                </button>
                {combos.length === 0 && (
                  <button type="button" 
                    onClick={seedInitialCombos}
                    disabled={seeding}
                    className="btn-press flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-4 py-3 rounded-xl font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50 text-sm"
                  >
                    {seeding ? 'Cargando...' : '⚡ Cargar Lista Inicial'}
                  </button>
                )}
                {tutorials.length === 0 && (
                  <button type="button" 
                    onClick={seedInitialTutorials}
                    disabled={seeding}
                    className="btn-press flex items-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/40 px-4 py-3 rounded-xl font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50 text-sm"
                  >
                    {seeding ? 'Cargando...' : '📖 Cargar Tutoriales'}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Nuevo Combo</h3>
                  <button aria-label="Cerrar" type="button" onClick={() => setShowAddCombo(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddCombo} className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder="Nombre del combo (ej. 12/21/56)" 
                    value={newComboName}
                    onChange={(e) => setNewComboName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white"
                    required
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Nivel:</label>
                    <select
                      value={newComboLevel}
                      onChange={(e) => setNewComboLevel(parseInt(e.target.value))}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white flex-1"
                    >
                      {[1,2,3,4,5,6,7,8,9,10].map(l => (
                        <option key={l} value={l}>Nivel {l}{l === 10 ? ' — SÚPER PRO 🏆' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="bg-primary text-white font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                    Guardar
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
        
        {uploadProgress !== null && (
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
            <p className="text-sm font-bold text-slate-300 mb-2">Subiendo video...</p>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        <Reveal direction="none">
        <div className="bg-slate-900/80 rounded-3xl border border-slate-700/50 p-6 shadow-2xl relative overflow-hidden group">
          {/* Animated Background Aura */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={user?.license_level || 1}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.15, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`absolute inset-0 blur-3xl bg-linear-to-tr ${
                (user?.license_level || 1) >= 10 ? 'from-slate-100 via-white to-slate-200' :
                (user?.license_level || 1) >= 8 ? 'from-red-600 via-orange-500 to-red-400' :
                (user?.license_level || 1) >= 5 ? 'from-yellow-400 via-yellow-600 to-amber-400' :
                'from-primary/30 to-transparent'
              }`}
            />
          </AnimatePresence>
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className={`relative shrink-0 w-24 h-24 rounded-full border-4 flex items-center justify-center bg-slate-950 shadow-2xl transition-all duration-500 hover:scale-110 ${
              DBZ_RANKS.find(r => r.level === (user?.license_level || 1))?.glow || 'shadow-primary/20'
            } ${
              DBZ_RANKS.find(r => r.level === (user?.license_level || 1))?.color?.replace('text-', 'border-') || 'border-primary/30'
            }`}>
              <div className="text-4xl animate-pulse">
                {DBZ_RANKS.find(r => r.level === (user?.license_level || 1))?.icon || '🥋'}
              </div>
              {/* Gender specific avatar overlay (mini) */}
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 rounded-full p-1.5 shadow-lg">
                {user?.gender === 'female' ? '👩‍🎤' : '👨‍🎤'}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${(user?.license_level || 1) >= 5 ? 'text-yellow-400 animate-pulse' : 'text-primary'}`}>
                  Nivel de Poder
                </span>
                {(user?.license_level || 1) >= 5 && <div className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></div>}
              </div>
              <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-1 transition-all ${
                DBZ_RANKS.find(r => r.level === (user?.license_level || 1))?.color || 'text-white'
              }`}>
                {DBZ_RANKS.find(r => r.level === (user?.license_level || 1))?.name || 'Guerrero'}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nivel {user?.license_level || 1}</p>
                <div className="h-4 w-px bg-slate-800"></div>
                <p className="text-xs font-bold text-slate-400">{user?.xp || 0} XP Acumulada</p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-48">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black uppercase text-slate-500">Siguiente Rango</span>
                <span className="text-[9px] font-black text-primary">{(user?.license_level || 1) + 1}</span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/50 p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((user?.xp || 0) % 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    (user?.license_level || 1) >= 10 ? 'bg-white shadow-[0_0_10px_#fff]' :
                    (user?.license_level || 1) >= 8 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                    (user?.license_level || 1) >= 5 ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' :
                    'bg-primary shadow-[0_0_10px_#0077ff]'
                  }`}
                />
              </div>
              <p className="text-[9px] text-center mt-2 font-bold text-slate-600 uppercase tracking-tighter">
                Faltan {100 - ((user?.xp || 0) % 100)} XP para el siguiente despertar
              </p>
            </div>
          </div>
        </div>
        </Reveal>

      </section>

      <section className="flex flex-col gap-4">

        <Reveal direction="none">
          <h3 className="text-lg font-bold">Lista de Saberes Box</h3>
        </Reveal>
        
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton h-36" />
            ))}
          </div>
        )}

        {!loading && visibleCombos.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="text-center py-10 bg-slate-800/30 rounded-xl border border-slate-700/50"
          >
            <PlayCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 font-medium">No hay combos disponibles por el momento.</p>
            {user?.role === 'admin' && (
              <p className="text-slate-500 text-sm mt-2">Usa el botón "⚡ Cargar Lista Inicial" para agregar los combos del programa.</p>
            )}
          </motion.div>
        )}

        {/* Render combos grouped by level */}
        {!loading && Object.entries(combosByLevel)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([level, levelCombos]) => (
            <motion.div
              key={level}
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="mb-8"
            >
              {/* Level Header - Sayayin Style */}
              <motion.div variants={staggerItem} className="flex items-center gap-4 mb-4">
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl border-2 rotate-3 group-hover:rotate-0 transition-transform duration-300 ${
                  DBZ_RANKS.find(r => r.level === parseInt(level))?.glow || 'shadow-primary/10'
                } ${
                  DBZ_RANKS.find(r => r.level === parseInt(level))?.color?.replace('text-', 'border-') || 'border-slate-700'
                } bg-slate-900`}>
                  <span className="text-xl">{DBZ_RANKS.find(r => r.level === parseInt(level))?.icon || '🥋'}</span>
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-black uppercase italic tracking-tighter leading-none ${
                    DBZ_RANKS.find(r => r.level === parseInt(level))?.color || 'text-white'
                  }`}>
                    {DBZ_RANKS.find(r => r.level === parseInt(level))?.name || `Nivel ${level}`}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Clasificación de Poder Nivel {level}</p>
                </div>
                <div className={`h-px flex-1 bg-linear-to-r transition-all duration-1000 ${
                  parseInt(level) >= 10 ? 'from-slate-100 to-transparent' :
                  parseInt(level) >= 8 ? 'from-red-600 to-transparent' :
                  parseInt(level) >= 5 ? 'from-yellow-400 to-transparent' :
                  'from-primary/30 to-transparent'
                }`}></div>
              </motion.div>

              {levelCombos.map((combo, index) => {
                const globalIndex = visibleCombos.indexOf(combo);
                const isCompleted = combo.video_approved && combo.manillas_approved && combo.contacto_approved && combo.desarrollo_approved;
                // El combo está bloqueado si su nivel es mayor al nivel de licencia del usuario
                const isLocked = combo.level > (user?.license_level || 1) && user?.role !== 'admin';
                const isActive = !isLocked && !isCompleted;

                return (
                  <motion.div
                    key={combo.id}
                    variants={staggerItem}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.97 }}
                    className={`group relative flex flex-col gap-4 p-4 rounded-xl border transition-colors mb-3 ${
                      isCompleted ? 'bg-slate-800 border-primary/50 ring-1 ring-primary/20' : 
                      isActive || user?.role === 'admin' ? 'bg-slate-800 border-slate-700 hover:border-primary/40' : 
                      'bg-slate-800/50 border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-primary/20 text-primary' : 
                        isActive || user?.role === 'admin' ? 'bg-slate-700 text-slate-400' : 
                        'bg-slate-700 text-slate-500'
                      }`}>
                        {isLocked ? <Lock className="w-6 h-6" /> : <span className="text-xl font-bold">{globalIndex + 1}</span>}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className={`font-bold text-lg ${isLocked ? 'text-slate-400' : ''}`} translate="no">{combo.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {combo.video_url ? (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                  <Video className="w-3 h-3" /> Video Disponible
                                </span>
                              ) : user?.role === 'admin' ? (
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Sin Video</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isCompleted && <CheckCircle className="text-primary w-6 h-6" />}
                            {isActive && !isCompleted && user?.role !== 'admin' && <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">ACTIVO</span>}
                            
                            {user?.role === 'admin' && (
                              <div className="flex gap-2 items-center">
                                {/* Level editor */}
                                {editingComboLevel?.id === combo.id ? (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={editingComboLevel.level}
                                      onChange={(e) => setEditingComboLevel({ id: combo.id, level: parseInt(e.target.value) })}
                                      className="bg-slate-900 border border-primary/50 rounded px-2 py-1 text-xs text-white"
                                      autoFocus
                                    >
                                      {[1,2,3,4,5,6,7,8,9,10].map(l => (
                                        <option key={l} value={l}>N{l}{l===10?' 🏆':''}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleUpdateComboLevel(combo.id, editingComboLevel.level)}
                                      className="p-1 text-emerald-400 hover:text-emerald-300"
                                      title="Guardar nivel"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button aria-label="Cerrar"
                                      onClick={() => setEditingComboLevel(null)}
                                      className="p-1 text-slate-400 hover:text-white"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setEditingComboLevel({ id: combo.id, level: combo.level })}
                                    className="text-[10px] font-black px-2 py-1 bg-slate-700 rounded text-slate-300 hover:text-primary hover:bg-slate-600 transition-colors border border-slate-600"
                                    title="Editar nivel"
                                  >
                                    Nv{combo.level}
                                  </button>
                                )}
                                <button type="button" 
                                  onClick={() => {
                                    setEditingCombo(combo);
                                    adminVideoInputRef.current?.click();
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-primary bg-slate-700/50 rounded-lg transition-colors"
                                  title="Subir Video Explicativo"
                                >
                                  <Upload className="w-4 h-4" />
                                </button>
                                {combo.video_url && (
                                  <button type="button" 
                                    onClick={() => handleDeleteComboVideo(combo)}
                                    className="p-1.5 text-red-400 hover:text-red-300 bg-slate-700/50 rounded-lg transition-colors"
                                    title="Eliminar Video Explicativo"
                                  >
                                    <Video className="w-4 h-4 text-red-500" />
                                  </button>
                                )}
                                <button type="button" 
                                  onClick={() => handleDeleteCombo(combo.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-700/50 rounded-lg transition-colors"
                                  title="Eliminar Combo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isLocked && user?.role !== 'admin' && (() => {
                      const myProgress = comboProgress.find(p => p.combo_id === combo.id && p.user_id === String(user?.id));
                      return (
                        <div className="flex flex-col gap-3 mt-2 border-t border-slate-700 pt-3">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <span className="text-sm font-medium text-slate-300">Mis Evaluaciones:</span>
                            <div className="flex gap-2 flex-wrap">
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${myProgress?.video_approved ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                {myProgress?.video_approved && <Check className="w-3 h-3" />} Video
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${myProgress?.manillas_approved ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                {myProgress?.manillas_approved && <Check className="w-3 h-3" />} Manillas
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${myProgress?.contacto_approved ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                {myProgress?.contacto_approved && <Check className="w-3 h-3" />} Contacto
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${myProgress?.desarrollo_approved ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-400'}`}>
                                {myProgress?.desarrollo_approved && <Check className="w-3 h-3" />} Desarrollo
                              </div>
                            </div>
                          </div>

                          {/* Student sees evaluation status — evaluated in person by the teacher */}
                          {!isCompleted ? (
                            myProgress?.status === 'approved' ? (
                              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                <p className="text-xs text-emerald-400 font-bold">Combo aprobado en clase</p>
                              </div>
                            ) : myProgress?.status === 'pending' ? (
                              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                                <Loader2 className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />
                                <p className="text-xs text-yellow-400 font-bold">En revisión por el profe</p>
                              </div>
                            ) : myProgress?.status === 'rejected' ? (
                              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                <X className="w-4 h-4 text-red-400 shrink-0" />
                                <p className="text-xs text-red-400 font-bold">No aprobado — intenta de nuevo en la próxima clase</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-slate-700/30 border border-slate-600/50 rounded-xl px-3 py-2">
                                <User className="w-4 h-4 text-slate-400 shrink-0" />
                                <p className="text-xs text-slate-400 font-bold">Evaluación presencial — Tu profe te calificará en clase</p>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              <p className="text-xs text-emerald-400 font-bold">Combo completamente aprobado</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Admin: show pending/approved students per combo + "Aprobar en Vivo" */}
                    {user?.role === 'admin' && (() => {
                      const listForCombo = comboProgress.filter(p => p.combo_id === combo.id);
                      return (
                        <div className="mt-2 border-t border-slate-700 pt-3 flex flex-col gap-3">
                          {/* Aprobar en Vivo: student selector + approve button */}
                          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Aprobar Combo en Vivo (Presencial)</p>
                            <div className="flex gap-2">
                              <select
                                id={`student-select-${combo.id}`}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-bold"
                                defaultValue=""
                              >
                                <option value="" disabled>Seleccionar estudiante...</option>
                                {allStudents.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => {
                                  const sel = document.getElementById(`student-select-${combo.id}`) as HTMLSelectElement;
                                  const studentId = sel?.value;
                                  const student = allStudents.find(s => s.id === studentId);
                                  if (!student) { alert('Selecciona un estudiante primero.'); return; }
                                  handleApproveComboInPerson(combo.id, student.id, student.name);
                                }}
                                className="btn-press flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-400 transition-colors shrink-0"
                              >
                                <Zap className="w-4 h-4" /> Aprobar en Vivo
                              </button>
                            </div>
                          </div>

                          {listForCombo.length > 0 && (
                            <>
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Progreso de Estudiantes en este Combo ({listForCombo.length})</p>
                              {listForCombo.map(progress => (
                                <div key={progress.id} className="bg-slate-900/80 rounded-xl p-3 border border-slate-700">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs font-bold text-slate-300">{progress.user_name}</p>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${progress.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : progress.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                      {progress.status === 'approved' ? 'Aprobado' : progress.status === 'rejected' ? 'Rechazado' : 'En Revisión'}
                                    </span>
                                  </div>
                                  {progress.video_url ? (
                                    isDriveUrl(progress.video_url) ? (
                                      <iframe
                                        src={getDriveEmbedUrl(progress.video_url)}
                                        className="w-full h-36 rounded-lg bg-black mb-2 border-0"
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                      />
                                    ) : (
                                      <video src={progress.video_url} controls className="w-full h-36 object-cover rounded-lg bg-slate-950 mb-2" />
                                    )
                                  ) : (
                                    <div className="w-full h-16 rounded-lg bg-slate-950 mb-2 flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase">Evaluación presencial — sin video</div>
                                  )}
                                  <div className="flex flex-wrap gap-4 mb-3 border-y border-slate-700/50 py-2">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 cursor-pointer">
                                      <input type="checkbox" checked={!!progress.video_approved} onChange={async (e) => await supabase.from('combo_progress').update({ video_approved: e.target.checked }).eq('id', progress.id)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-primary" /> Video
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 cursor-pointer">
                                      <input type="checkbox" checked={!!progress.manillas_approved} onChange={async (e) => await supabase.from('combo_progress').update({ manillas_approved: e.target.checked }).eq('id', progress.id)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-primary" /> Manillas
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 cursor-pointer">
                                      <input type="checkbox" checked={!!progress.contacto_approved} onChange={async (e) => await supabase.from('combo_progress').update({ contacto_approved: e.target.checked }).eq('id', progress.id)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-primary" /> Contacto
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 cursor-pointer">
                                      <input type="checkbox" checked={!!progress.desarrollo_approved} onChange={async (e) => await supabase.from('combo_progress').update({ desarrollo_approved: e.target.checked }).eq('id', progress.id)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-primary" /> Desarrollo
                                    </label>
                                  </div>
                                  <div className="flex gap-2">
                                    {progress.status !== 'approved' && (
                                      <button
                                        onClick={async () => {
                                          await supabase.from('combo_progress').update({ status: 'approved', video_approved: true, manillas_approved: true, contacto_approved: true, desarrollo_approved: true }).eq('id', progress.id);
                                          await sendPushNotification(progress.user_id, '✅ ¡Combo Aprobado!', `${combo.name} ha sido aprobado por el profesor.`, { type: 'success' });
                                          await loadAll();
                                        }}
                                        className="btn-press flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                                      >✓ Aprobar Combo</button>
                                    )}
                                    {progress.status !== 'rejected' && (
                                      <button
                                        onClick={async () => { await supabase.from('combo_progress').update({ status: 'rejected' }).eq('id', progress.id); await loadAll(); }}
                                        className="btn-press flex-1 bg-red-500/20 text-red-400 border border-red-500/30 py-2 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
                                      >✗ Rechazar Combo</button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      );
                    })()}

                  </motion.div>
                );
              })}
            </motion.div>
          ))
        }
      </section>

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-300 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button type="button" 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="btn-press flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button type="button" 
                onClick={confirmDialog.onConfirm}
                className="btn-press flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                {confirmDialog.confirmText || 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {activeLesson && (
        <InteractiveLesson
          title={activeLesson.title}
          level={activeLesson.level}
          steps={[
            {
              title: 'Aprende la Técnica',
              description: activeLesson.description,
              duration: activeLesson.duration,
              type: 'video',
              video_url: activeLesson.video_url
            },
            {
              title: 'Práctica Libre',
              description: 'Practica el movimiento frente al espejo o con sombra.',
              duration: 60,
              type: 'practice'
            },
            {
              title: 'Quiz de Conocimiento',
              description: 'Demuestra lo que has aprendido.',
              duration: 0,
              type: 'quiz',
              quiz: {
                question: `¿Cuál es el objetivo principal de ${activeLesson.title}?`,
                options: [
                  'Mejorar la resistencia cardiovascular',
                  'Perfeccionar la técnica y postura',
                  'Aumentar la fuerza máxima',
                  'Relajar los músculos'
                ],
                correctAnswer: 1
              }
            }
          ]}
          onClose={() => setActiveLesson(null)}
          onComplete={async () => {
            if (user) {
              const newXp = (user.xp || 0) + 50;
              const newLevel = Math.floor(newXp / 100) + 1; // 100 XP per level
              
              try {
                await supabase.from('profiles').update({
                  xp: newXp,
                  license_level: newLevel > user.license_level ? newLevel : user.license_level
                }).eq('id', user.id);
                setUser({ 
                  ...user, 
                  xp: newXp,
                  license_level: newLevel > user.license_level ? newLevel : user.license_level
                });
                alert(`¡Lección completada con éxito! Has ganado 50 XP. ${newLevel > user.license_level ? '¡Has subido de nivel!' : ''}`);
              } catch (err) {
                console.error("Error updating XP:", err);
              }
            }
            setActiveLesson(null);
          }}
        />
      )}
      </>
      )}
      </div>
      )}
    </div>
  );
}
