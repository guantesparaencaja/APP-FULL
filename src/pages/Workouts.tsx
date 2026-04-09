import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Dumbbell, Play, Clock, ArrowLeft, Upload, Home, Building2, X, Plus, Trash2, Video, Search, CheckSquare, Square, Calendar, MapPin, RefreshCw, ChevronRight, ChevronDown, Info, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { uploadVideoToDrive } from '../lib/driveService';
import { db, storage } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getYouTubeEmbedUrl } from '../services/geminiService';
import { Modal } from '../components/Modal';
import { LazyVideoWrapper } from '../components/LazyVideoWrapper';
import { compressImage } from '../utils/imageUtils';

interface Category {
  id: string;
  name: string;
}

interface WorkoutVideo {
  id: string;
  category_id: string;
  title: string;
  description: string;
  instructions?: string;
  common_errors?: string;
  video_url?: string;
  cover_url?: string;
  difficulty?: string;
  equipment?: string;
  duration?: number;
  tipo?: 'boxeo' | 'gym';
  objetivo?: 'bajar_peso' | 'mantener' | 'aumentar' | 'general';
  createdAt?: any;
  createdBy?: string;
  isApproved?: boolean;
}

interface CustomRoutine {
  id: string;
  user_id: string;
  name: string;
  exercises: string[];
  createdAt: string;
}

const deleteStorageFile = async (storage: any, url?: string) => {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Could not delete file from storage:", url, error);
  }
};

export function Workouts() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<WorkoutVideo | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, confirmText?: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<WorkoutVideo | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [userRoutines, setUserRoutines] = useState<CustomRoutine[]>([]);
  const [newRoutineName, setNewRoutineName] = useState('');

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    level: 'Principiante',
    categoryId: '',
    duration: 0,
    instructions: '',
    common_errors: '',
    equipment: 'Sin equipo',
    tipo: 'boxeo',
    objetivo: 'General',
    video_url: ''
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const user = useStore((state) => state.user);
  const hasWarmedUp = useStore((state) => state.hasWarmedUp);
  const setHasWarmedUp = useStore((state) => state.setHasWarmedUp);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullScreenVideoUrl, setFullScreenVideoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'boxeo' | 'gym'>('boxeo');

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const safeName = file.name.replace(/\s+/g, '_');
    const storageRef = ref(storage, `${path}/${Date.now()}_${safeName}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const missingFields = [];
    if (!uploadForm.title) missingFields.push('Título');
    if (!uploadForm.categoryId) missingFields.push('Categoría');
    if (!videoFile && !editingVideo?.video_url) missingFields.push('Archivo de Video');
    if (!uploadForm.tipo) missingFields.push('Tipo (Boxeo/Gym)');
    if (!uploadForm.objetivo) missingFields.push('Objetivo');

    if (missingFields.length > 0) {
      alert(`Por favor completa los siguientes campos: ${missingFields.join(', ')}`);
      return;
    }

    setIsUploading(true);
    setOverallProgress(0);

    try {
      // 1. Upload Cover Image (optional)
      let currentCoverUrl = editingVideo?.cover_url;
      if (coverFile) {
        const finalCover = await compressImage(coverFile, 1024, 0.8);
        currentCoverUrl = await handleFileUpload(finalCover, 'entrenos/portadas');
      }
      
      // 2. Upload Video (if changed) to Drive via n8n
      let currentVideoUrl = uploadForm.video_url !== '' ? uploadForm.video_url : (editingVideo?.video_url || '');
      if (videoFile) {
        setOverallProgress(50);
        currentVideoUrl = await uploadVideoToDrive(
          videoFile, 
          String(user?.id || 'admin'), 
          (p) => setOverallProgress(50 + (p / 2)),
          { title: uploadForm.title, type: uploadForm.tipo }
        );
      }

      // Handle new or existing category
      let finalCategoryId = uploadForm.categoryId;
      const existingCat = categories.find(c => c.id === finalCategoryId || c.name.toLowerCase() === finalCategoryId.toLowerCase());
      
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const docRef = await addDoc(collection(db, 'workout_categories'), { name: finalCategoryId });
        finalCategoryId = docRef.id;
      }

      // 3. Save/Update to Firestore
      const videoData: Omit<WorkoutVideo, 'id'> = {
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
        createdBy: editingVideo?.createdBy || user?.id || 'admin'
      };
      
      // Clean up undefined values for Firestore
      Object.keys(videoData).forEach(key => {
        if (videoData[key as keyof typeof videoData] === undefined) {
          delete videoData[key as keyof typeof videoData];
        }
      });

      if (editingVideo) {
        await updateDoc(doc(db, 'workout_videos', editingVideo.id), videoData);
      } else {
        await addDoc(collection(db, 'workout_videos'), videoData);
      }

      // Reset and close
      handleCloseUploadModal();
      alert(editingVideo ? 'Video actualizado exitosamente' : 'Video subido exitosamente');
    } catch (error) {
      console.error("Error saving workout:", error);
      alert('Error al guardar el entrenamiento. Por favor intenta de nuevo.');
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setEditingVideo(null);
    setUploadForm({
      title: '',
      description: '',
      level: 'Principiante',
      categoryId: '',
      duration: 0,
      instructions: '',
      common_errors: '',
      equipment: 'Sin equipo',
      tipo: 'boxeo',
      objetivo: 'General',
      video_url: ''
    });
    setCoverFile(null);
    setVideoFile(null);
  };

  const handleVideoClick = (video: WorkoutVideo) => {
    const category = categories.find(c => c.id === video.category_id);
    const isWarmup = category?.name.toLowerCase().includes('calentamiento') || category?.name.toLowerCase().includes('movilidad');
    
    if (isWarmup) {
      setHasWarmedUp(true);
      setSelectedVideoDetails(video);
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
      setSelectedVideoDetails(video);
    }
  };

  useEffect(() => {
    const unsubCategories = onSnapshot(collection(db, 'workout_categories'), 
      (snapshot) => {
        const catsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(catsData);
      },
      (error) => console.error("Error fetching categories:", error)
    );

    const unsubVideos = onSnapshot(collection(db, 'workout_videos'), 
      (snapshot) => {
        const videosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutVideo));
        setVideos(videosData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching videos:", error);
        setIsLoading(false);
      }
    );

    let unsubRoutines: (() => void) | undefined;
    if (user) {
      const q = query(collection(db, 'custom_routines'), where('user_id', '==', String(user?.id)));
      unsubRoutines = onSnapshot(q, 
        (snapshot) => {
          const routinesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomRoutine));
          setUserRoutines(routinesData);
        },
        (error) => console.error("Error fetching routines:", error)
      );
    }

    return () => {
      unsubCategories();
      unsubVideos();
      if (unsubRoutines) unsubRoutines();
    };
  }, [user]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'workout_categories'), { name: newCategoryName });
      setCategories([...categories, { id: docRef.id, name: newCategoryName }]);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Categoría',
      message: '¿Estás seguro de que deseas eliminar esta categoría? Se eliminarán todos los videos asociados.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workout_categories', id));
          setCategories(categories.filter(c => c.id !== id));
          
          // Delete associated videos
          const videosToDelete = videos.filter(v => v.category_id === id);
          for (const video of videosToDelete) {
            await deleteStorageFile(storage, video.video_url);
            await deleteStorageFile(storage, video.cover_url);
            await deleteDoc(doc(db, 'workout_videos', video.id));
          }
          setVideos(videos.filter(v => v.category_id !== id));
          
          if (selectedCategory === id) setSelectedCategory(null);
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (error) {
          console.error("Error deleting category:", error);
        }
      }
    });
  };

  const startEditVideo = (video: WorkoutVideo) => {
    setEditingVideo(video);
    setUploadForm({
      title: video.title,
      description: video.description,
      level: video.difficulty || 'Principiante',
      categoryId: video.category_id || '',
      duration: video.duration || 0,
      instructions: video.instructions || '',
      common_errors: video.common_errors || '',
      equipment: video.equipment || 'Sin equipo',
      tipo: video.tipo || 'boxeo',
      objetivo: video.objetivo || 'General',
      video_url: video.video_url || ''
    });
    setShowUploadModal(true);
  };

  const handleDeleteVideo = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Video',
      message: '¿Estás seguro de que deseas eliminar este video?',
      onConfirm: async () => {
        try {
          const videoToDelete = videos.find(v => v.id === id);
          if (videoToDelete) {
            await deleteStorageFile(storage, videoToDelete.video_url);
            await deleteStorageFile(storage, videoToDelete.cover_url);
          }
          await deleteDoc(doc(db, 'workout_videos', id));
          setVideos(videos.filter(v => v.id !== id));
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        } catch (error) {
          console.error("Error deleting video:", error);
        }
      }
    });
  };

  const seedMuscleWikiVideos = async () => {
    try {
      // Check if categories already exist to avoid duplication
      const existingCats = await getDocs(collection(db, 'workout_categories'));
      if (!existingCats.empty) {
        const confirmSeed = window.confirm('Ya existen categorías. ¿Deseas cargar más videos de prueba? Esto podría generar duplicados si ya están cargados.');
        if (!confirmSeed) return;
      }

      // Helper to find or create category
      const getCategoryId = async (name: string) => {
        const q = query(collection(db, 'workout_categories'), where('name', '==', name));
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].id;
        const docRef = await addDoc(collection(db, 'workout_categories'), { name });
        return docRef.id;
      };

      const catIds = {
        chest: await getCategoryId('Pecho'),
        back: await getCategoryId('Espalda'),
        legs: await getCategoryId('Piernas'),
        shoulders: await getCategoryId('Hombros'),
        abs: await getCategoryId('Abdominales'),
        glutes: await getCategoryId('Glúteos'),
        arms: await getCategoryId('Brazos'),
        cardio: await getCategoryId('Cardio'),
        boxing: await getCategoryId('Boxeo'),
        gym: await getCategoryId('Gym'),
        home: await getCategoryId('Casa'),
        hiit: await getCategoryId('HIIT'),
        funcional: await getCategoryId('Funcional'),
        stretching: await getCategoryId('Estiramientos')
      };

      // Comprehensive list of MuscleWiki videos (under 30s)
      const sampleVideos = [
        // PECHO
        {
          category_id: catIds.chest,
          title: 'Press de Banca con Barra',
          description: 'Acuéstate en un banco plano, baja la barra al pecho y empuja hacia arriba.',
          instructions: '1. Acuéstate en el banco con los pies apoyados en el suelo.\n2. Sujeta la barra con un agarre algo más ancho que los hombros.\n3. Baja la barra lentamente hasta la parte media del pecho.\n4. Empuja la barra hacia arriba extendiendo los brazos completamente.',
          common_errors: 'Levantar los pies del suelo, arquear demasiado la espalda o rebotar la barra en el pecho.',
          video_url: 'https://www.youtube.com/embed/rT7DgCr-3pg',
          difficulty: 'intermedio'
        },
        {
          category_id: catIds.chest,
          title: 'Aperturas con Mancuernas',
          description: 'Acuéstate en un banco y abre los brazos con mancuernas, manteniendo una ligera flexión en los codos.',
          instructions: '1. Sujeta las mancuernas sobre el pecho con las palmas enfrentadas.\n2. Baja las mancuernas hacia los lados en un arco amplio.\n3. Siente el estiramiento en el pecho y vuelve a la posición inicial.',
          common_errors: 'Extender los codos completamente o bajar demasiado las mancuernas poniendo en riesgo el hombro.',
          video_url: 'https://www.youtube.com/embed/eozdVDA78K0',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.chest,
          title: 'Flexiones de Pecho (Push-ups)',
          description: 'Baja el cuerpo manteniendo la espalda recta y empuja hacia arriba.',
          instructions: '1. Colócate en posición de plancha con las manos bajo los hombros.\n2. Baja el cuerpo hasta que el pecho casi toque el suelo.\n3. Mantén el core contraído y empuja hacia arriba.',
          common_errors: 'Dejar caer la cadera o encoger los hombros hacia las orejas.',
          video_url: 'https://www.youtube.com/embed/IODxDxX7oi4',
          difficulty: 'principiante'
        },
        // ESPALDA
        {
          category_id: catIds.back,
          title: 'Dominadas (Pull-ups)',
          description: 'Cuélgate de una barra y tira de tu cuerpo hacia arriba hasta que la barbilla pase la barra.',
          instructions: '1. Sujeta la barra con un agarre prono (palmas hacia afuera).\n2. Tira de tu cuerpo hacia arriba hasta que la barbilla pase la barra.\n3. Baja lentamente hasta la posición inicial.',
          common_errors: 'Balancear el cuerpo o no completar el rango de movimiento.',
          video_url: 'https://www.youtube.com/embed/eGo4IYVPNfQ',
          difficulty: 'avanzado'
        },
        {
          category_id: catIds.back,
          title: 'Remo con Mancuerna a una mano',
          description: 'Apoya una mano en un banco y tira de la mancuerna hacia tu cadera.',
          instructions: '1. Apoya una rodilla y una mano en un banco.\n2. Con la otra mano, tira de la mancuerna hacia la cadera manteniendo el codo pegado al cuerpo.\n3. Baja lentamente.',
          common_errors: 'Girar el torso o tirar con el brazo en lugar de la espalda.',
          video_url: 'https://www.youtube.com/embed/dFzUjzfih7k',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.back,
          title: 'Jalón al Pecho',
          description: 'Tira de la barra hacia la parte superior del pecho mientras mantienes la espalda recta.',
          instructions: '1. Siéntate en la máquina y sujeta la barra con un agarre ancho.\n2. Tira de la barra hacia la parte superior del pecho inclinándote ligeramente hacia atrás.\n3. Vuelve a la posición inicial con control.',
          common_errors: 'Tirar de la barra detrás de la nuca o usar demasiado impulso.',
          video_url: 'https://www.youtube.com/embed/CAwf7n6Luuc',
          difficulty: 'principiante'
        },
        // PIERNAS
        {
          category_id: catIds.legs,
          title: 'Sentadilla con Barra',
          description: 'Coloca la barra en tus hombros, baja las caderas y vuelve a subir.',
          instructions: '1. Coloca la barra sobre los trapecios.\n2. Baja la cadera manteniendo la espalda recta y el pecho arriba.\n3. Empuja con los talones para volver a subir.',
          common_errors: 'Levantar los talones o dejar que las rodillas se cierren.',
          video_url: 'https://www.youtube.com/embed/bEv6CCg2BC8',
          difficulty: 'intermedio'
        },
        {
          category_id: catIds.legs,
          title: 'Zancadas (Lunges)',
          description: 'Da un paso adelante y baja la rodilla trasera hacia el suelo.',
          instructions: '1. Da un paso hacia adelante.\n2. Baja la rodilla trasera hasta que casi toque el suelo.\n3. Mantén el torso erguido.',
          common_errors: 'Paso demasiado corto o inclinar el torso hacia adelante.',
          video_url: 'https://www.youtube.com/embed/D7KaRcUTQeE',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.legs,
          title: 'Prensa de Piernas',
          description: 'Empuja la plataforma con las piernas hasta que estén casi extendidas.',
          instructions: '1. Siéntate en la máquina y apoya los pies en la plataforma.\n2. Empuja la plataforma extendiendo las piernas sin bloquear las rodillas.\n3. Baja lentamente.',
          common_errors: 'Bloquear las rodillas al extender o despegar la zona lumbar del asiento.',
          video_url: 'https://www.youtube.com/embed/IZxyjW7MPJQ',
          difficulty: 'intermedio'
        },
        // HOMBROS
        {
          category_id: catIds.shoulders,
          title: 'Press Militar con Barra',
          description: 'Empuja la barra desde tus hombros hacia arriba sobre tu cabeza.',
          instructions: '1. Sujeta la barra a la altura de los hombros.\n2. Empuja la barra hacia arriba extendiendo los brazos por completo.\n3. Baja lentamente hasta la posición inicial.',
          common_errors: 'Arquear la espalda baja o no bloquear los codos arriba.',
          video_url: 'https://www.youtube.com/embed/2yjwxt_Yeas',
          difficulty: 'intermedio'
        },
        {
          category_id: catIds.shoulders,
          title: 'Elevaciones Laterales',
          description: 'Levanta las mancuernas hacia los lados hasta la altura de los hombros.',
          instructions: '1. Sujeta las mancuernas a los lados.\n2. Eleva los brazos lateralmente con una ligera flexión de codo hasta la altura de los hombros.\n3. Baja lentamente.',
          common_errors: 'Subir por encima de los hombros o usar impulso.',
          video_url: 'https://www.youtube.com/embed/3VcKaXpzqRo',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.shoulders,
          title: 'Face Pulls',
          description: 'Tira de la cuerda hacia tu cara, separando las manos al final del movimiento.',
          instructions: '1. Sujeta la cuerda de la polea alta.\n2. Tira de la cuerda hacia tu cara, separando las manos y llevando los codos hacia atrás.\n3. Vuelve lentamente.',
          common_errors: 'Tirar con demasiada carga o no rotar externamente los hombros.',
          video_url: 'https://www.youtube.com/embed/rep-qVOkqgk',
          difficulty: 'intermedio'
        },
        // ABDOMINALES
        {
          category_id: catIds.abs,
          title: 'Plancha Estática',
          description: 'Mantén el cuerpo recto apoyado en los antebrazos y las puntas de los pies.',
          instructions: '1. Apóyate en los antebrazos y las puntas de los pies.\n2. Mantén el cuerpo en línea recta desde la cabeza hasta los talones.\n3. Contrae el abdomen y mantén la posición.',
          common_errors: 'Levantar demasiado la cadera o dejarla caer.',
          video_url: 'https://www.youtube.com/embed/ASdvN_XEl_c',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.abs,
          title: 'Crunch Abdominal',
          description: 'Túmbate boca arriba y eleva el tronco contrayendo el abdomen.',
          instructions: '1. Túmbate boca arriba con las rodillas flexionadas.\n2. Eleva los hombros del suelo contrayendo el abdomen.\n3. Baja lentamente.',
          common_errors: 'Tirar del cuello con las manos o subir demasiado rápido.',
          video_url: 'https://www.youtube.com/embed/Xyd_fa5zoEU',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.abs,
          title: 'Elevación de Piernas',
          description: 'Tumbado boca arriba, levanta las piernas rectas hasta que queden perpendiculares al suelo.',
          instructions: '1. Túmbate boca arriba con las manos bajo los glúteos.\n2. Levanta las piernas rectas hasta que queden perpendiculares al suelo.\n3. Baja lentamente sin tocar el suelo.',
          common_errors: 'Arquear la espalda baja o bajar las piernas demasiado rápido.',
          video_url: 'https://www.youtube.com/embed/l4kQd9eWclE',
          difficulty: 'intermedio'
        },
        // GLUTEOS
        {
          category_id: catIds.glutes,
          title: 'Puente de Glúteo',
          description: 'Túmbate boca arriba y eleva la cadera apretando los glúteos.',
          instructions: '1. Túmbate boca arriba con las rodillas flexionadas y los pies apoyados.\n2. Eleva la cadera apretando los glúteos en la parte superior.\n3. Baja lentamente.',
          common_errors: 'Arquear demasiado la espalda o no apretar los glúteos.',
          video_url: 'https://www.youtube.com/embed/wPM8icPu6H8',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.glutes,
          title: 'Peso Muerto Rumano',
          description: 'Baja la barra manteniendo las piernas casi rectas para estirar los isquiotibiales y glúteos.',
          instructions: '1. Sujeta la barra frente a los muslos.\n2. Baja la barra manteniendo la espalda recta y las rodillas ligeramente flexionadas.\n3. Siente el estiramiento en los isquiotibiales y vuelve a subir.',
          common_errors: 'Arquear la espalda o flexionar demasiado las rodillas.',
          video_url: 'https://www.youtube.com/embed/JCXUYuzwuyw',
          difficulty: 'intermedio'
        },
        {
          category_id: catIds.glutes,
          title: 'Hip Thrust',
          description: 'Apoya la espalda en un banco y eleva la cadera con peso sobre la pelvis.',
          instructions: '1. Apoya la parte superior de la espalda en un banco.\n2. Coloca una barra sobre la pelvis.\n3. Eleva la cadera hasta que el cuerpo esté paralelo al suelo, apretando los glúteos.',
          common_errors: 'No completar el rango de movimiento o hiperextender la espalda.',
          video_url: 'https://www.youtube.com/embed/LM8LG_tr8_g',
          difficulty: 'avanzado'
        },
        // BRAZOS
        {
          category_id: catIds.arms,
          title: 'Curl de Bíceps con Barra',
          description: 'Flexiona los codos para llevar la barra hacia tus hombros.',
          instructions: '1. Sujeta la barra con las palmas hacia arriba.\n2. Flexiona los codos llevando la barra hacia los hombros sin mover los brazos.\n3. Baja lentamente.',
          common_errors: 'Balancear el cuerpo o mover los codos hacia adelante.',
          video_url: 'https://www.youtube.com/embed/lyn7uY99iSg',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.arms,
          title: 'Extensión de Tríceps en Polea',
          description: 'Empuja la barra hacia abajo extendiendo completamente los codos.',
          instructions: '1. Sujeta la barra de la polea alta.\n2. Empuja la barra hacia abajo extendiendo los codos por completo.\n3. Vuelve lentamente manteniendo los codos pegados al cuerpo.',
          common_errors: 'Separar los codos del cuerpo o usar el peso del cuerpo para empujar.',
          video_url: 'https://www.youtube.com/embed/2-LAMcpzHLU',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.arms,
          title: 'Martillo con Mancuernas',
          description: 'Sujeta las mancuernas con agarre neutro y flexiona los codos.',
          instructions: '1. Sujeta las mancuernas con las palmas enfrentadas.\n2. Flexiona los codos llevando las mancuernas hacia los hombros.\n3. Baja lentamente.',
          common_errors: 'Balancear el cuerpo o no completar el rango de movimiento.',
          video_url: 'https://www.youtube.com/embed/zC3nLlEvin4',
          difficulty: 'principiante'
        },
        // CARDIO
        {
          category_id: catIds.cardio,
          title: 'Burpees',
          description: 'Baja a posición de flexión, salta hacia adelante y luego salta hacia arriba.',
          video_url: 'https://www.youtube.com/embed/auBLPXO8Fww',
          difficulty: 'intermedio'
        },
        {
          category_id: catIds.cardio,
          title: 'Jumping Jacks',
          description: 'Salta abriendo piernas y brazos simultáneamente.',
          video_url: 'https://www.youtube.com/embed/nGaXj3kkmzU',
          difficulty: 'principiante'
        },
        // BOXEO
        {
          category_id: catIds.boxing,
          title: 'Sombra de Boxeo (Shadow Boxing)',
          description: 'Lanza golpes al aire practicando técnica y movimiento de pies.',
          video_url: 'https://www.youtube.com/embed/MUPvVp_5pJA',
          difficulty: 'principiante'
        },
        {
          category_id: catIds.boxing,
          title: 'Saltar la Cuerda',
          description: 'Ejercicio fundamental para coordinación y resistencia cardiovascular.',
          video_url: 'https://www.youtube.com/embed/u3zgHI8QnqE',
          difficulty: 'intermedio'
        }
      ];

      // Add videos avoiding duplicates by title and URL
      const existingVideos = await getDocs(collection(db, 'workout_videos'));
      const existingTitles = new Set(existingVideos.docs.map(d => d.data().title.trim().toLowerCase()));
      const existingUrls = new Set(existingVideos.docs.map(d => d.data().video_url));

      for (const video of sampleVideos) {
        if (!existingTitles.has(video.title.trim().toLowerCase()) && !existingUrls.has(video.video_url)) {
          const embedUrl = `${video.video_url}?autoplay=1&loop=1&playlist=${video.video_url.split('/').pop()}&controls=0&mute=1&modestbranding=1&rel=0`;
          await addDoc(collection(db, 'workout_videos'), { 
            ...video, 
            video_url: embedUrl,
            isApproved: true // MuscleWiki videos are auto-approved for now
          });
        }
      }

      alert('Contenido de MuscleWiki actualizado exitosamente.');
    } catch (error) {
      console.error('Error seeding videos:', error);
      alert('Error al cargar los videos.');
    }
  };

  const clearGymWorkouts = async () => {
    if (!window.confirm('¿Deseas eliminar DEFINITIVAMENTE todos los ejercicios marcados como "En Gym" o de tipo gimnasio? Esta acción no se puede deshacer.')) return;
    
    setIsLoading(true);
    try {
      const q = query(collection(db, 'workout_videos'), where('tipo', '==', 'gym'));
      const snap = await getDocs(q);
      let count = 0;
      for (const d of snap.docs) {
        const data = d.data();
        await deleteStorageFile(storage, data.video_url);
        await deleteStorageFile(storage, data.cover_url);
        await deleteDoc(doc(db, 'workout_videos', d.id));
        count++;
      }
      alert(`✅ Se eliminaron ${count} ejercicios de gimnasio exitosamente.`);
    } catch (error) {
      console.error("Error clearing gym:", error);
      alert("Error al limpiar ejercicios de gimnasio.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveVideo = async (id: string, approve: boolean) => {
    try {
      if (approve) {
        // Aprove flow: Mark as approved. 
        // Note: Admin uploads already go to Drive. 
        // Lyfta videos stay as external URLs for now to save space, but are marked as safe.
        await updateDoc(doc(db, 'workout_videos', id), { isApproved: true });
        alert('✅ Video aprobado y visible para estudiantes.');
      } else {
        // Reject flow: Delete AND Add to rejected_videos ban-list
        const v = videos.find(vid => vid.id === id);
        if (v) {
          // Add to rejected list (minimal data: title and URL)
          await addDoc(collection(db, 'rejected_videos'), {
            title: v.title,
            video_url: v.video_url,
            rejectedAt: new Date().toISOString()
          });

          await deleteStorageFile(storage, v.video_url);
          await deleteStorageFile(storage, v.cover_url);
        }
        await deleteDoc(doc(db, 'workout_videos', id));
        alert('❌ Video rechazado y eliminado permanentemente. No volverá a aparecer en la sincronización.');
      }
    } catch (error) {
      console.error("Error toggling approval:", error);
      alert('Error al gestionar el video.');
    }
  };

  const seedLyftaVideos = async () => {
    try {
      const getCategoryId = async (name: string) => {
        const q = query(collection(db, 'workout_categories'), where('name', '==', name));
        const snap = await getDocs(q);
        if (!snap.empty) return snap.docs[0].id;
        const docRef = await addDoc(collection(db, 'workout_categories'), { name });
        return docRef.id;
      };

      const lyftaSample = [
        // 50 EJERCICIOS ÚNICOS 100% PARA CASA (SIN EQUIPO O EQUIPO MÍNIMO)
        { title: "Flexiones de Brazo (Push-ups)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Básico fundamental de empuje." },
        { title: "Sentadilla Libre Profunda", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Fortalecimiento de tren inferior." },
        { title: "Plancha Abdominal Clásica", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Core y estabilidad." },
        { title: "Zancadas de Velocidad", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/04031201-Dumbbell-Lunges_Thighs.mp4", description: "Potencia de piernas." },
        { title: "Burpees GPTE", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4", description: "Cardio total." },
        { title: "Escaladores Dinámicos", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Resistencia cardiovascular." },
        { title: "Bicicleta Core", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Enfoque en oblicuos." },
        { title: "Skipping en el Sitio", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4", description: "Agilidad y coordinación." },
        { title: "Puente de Glúteo Unilateral", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/25301201-Hanging-Straight-Leg-Raise-(female)_Hips.mp4", description: "Activación posterior." },
        { title: "Jab-Cross Sombra Express", category: "Boxeo", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Golpeo técnico en casa." },
        { title: "Flexiones Diamante (Triceps)", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "aumentar", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Brazos potentes en casa." },
        { title: "Sentadilla Isométrica (Pared)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Resistencia de cuádriceps." },
        { title: "Caminata de Gusano Pro", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Flexibilidad y fuerza." },
        { title: "Jumping Jacks (Salto Payaso)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/25301201-Hanging-Straight-Leg-Raise-(female)_Hips.mp4", description: "Calentamiento dinámico." },
        { title: "Tríceps en Silla / Banco", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Extensiones por encima de cabeza." },
        { title: "Crunch de Abdomen Inverso", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Abdominales inferiores." },
        { title: "Giro Ruso (Russian Twist)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Rotación de tronco." },
        { title: "Shadow Boxing: Uppercuts", category: "Boxeo", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Velocidad de manos." },
        { title: "Sombra Pro: Esquivas Laterales", category: "Boxeo", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Movimiento defensivo." },
        { title: "Zancada Lateral de Potencia", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Fuerza abductora." },
        { title: "Superman de Espalda (Lumbares)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Postura y salud lumbar." },
        { title: "Flexiones de Pica (Hombros)", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "aumentar", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4", description: "Fuerza superior vertical." },
        { title: "Sentadilla con Salto HIIT", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Explosividad máxima." },
        { title: "Plancha con Toque de Hombros", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Control escapular." },
        { title: "Paso de Boxeador Core", category: "Boxeo", difficulty: "principiante", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4", description: "Cardio y coordinación." },
        { title: "Flexiones en 'V' Simplificadas", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Hombros y tríceps." },
        { title: "Sentadilla Sumo (Pies abiertos)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Aductores y glúteo medio." },
        { title: "Plancha Extensible (Largo)", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Core extremo de palanca larga." },
        { title: "Tijeras de Pierna (Abdominal)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/25301201-Hanging-Straight-Leg-Raise-(female)_Hips.mp4", description: "Trabajo abdominal dinámico." },
        { title: "Sombra: Defensa Peeks", category: "Boxeo", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Bloqueo y visión periférica." },
        { title: "Sentadilla Búlgara Express", category: "Casa", difficulty: "avanzado", equipment: "Silla / Sin equipo", objetivo: "aumentar", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Hipertrofia unilateral de pierna." },
        { title: "Tríceps Diamante de Rodillas", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Adaptación de empuje." },
        { title: "Zancada con Salto Pro", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Potencia elástica de pierna." },
        { title: "Bird-Dog (Equilibrio)", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Core y coordinación contralateral." },
        { title: "Flexiones con Aplauso HIIT", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "aumentar", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Poder explosivo superior." },
        { title: "Shadow Boxing: Pasos Laterales", category: "Boxeo", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Juego de pies básico." },
        { title: "Pivote de Boxeador Drill", category: "Boxeo", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Cambio de ángulos." },
        { title: "Deadbug Core Estabilizador", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Salud lumbar y core." },
        { title: "Plancha con Rotación", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Fuerza rotacional de núcleo." },
        { title: "Sprints Estáticos (Rodillas)", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/03341201-Dumbbell-Lateral-Raise_shoulder-FIX_.mp4", description: "Máximo esfuerzo cardiovascular." },
        { title: "Sentadilla con Toque de Suelo", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Movilidad dinámica." },
        { title: "Flexiones Inclinadas (Sofá)", category: "Casa", difficulty: "principiante", equipment: "Mueble de casa", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Adaptación para principiantes." },
        { title: "Zancada Trasera Dinámica", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Estabilidad y fuerza." },
        { title: "Cranch Abdominal GPTE", category: "Casa", difficulty: "principiante", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Recto abdominal aislado." },
        { title: "Sombra: Esquiva y Jab", category: "Boxeo", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Defensa activa." },
        { title: "Saltos Laterales Skater", category: "Casa", difficulty: "intermedio", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Potencia lateral." },
        { title: "Plancha en Triángulo", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/01501201-Cable-Bar-Lateral-Pulldown_Back.mp4", description: "Core de alta exigencia." },
        { title: "Flexiones de Arquero", category: "Casa", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "aumentar", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Fuerza unilateral de empuje." },
        { title: "Zanjadas (Step Ups) en Escalón", category: "Casa", difficulty: "principiante", equipment: "Escalón / Sin equipo", objetivo: "general", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/00431201-Barbell-Full-Squat_Thighs.mp4", description: "Fortalecimiento funcional." },
        { title: "Sombra Final de Cardio", category: "Boxeo", difficulty: "avanzado", equipment: "Sin equipo", objetivo: "bajar_peso", tipo: "casa", video_url: "https://apilyfta.com/static/GymvisualMP4/06621201-Push-up-m_Chest.mp4", description: "Gaste total post-entreno." }
      ];

      // Get existing videos for deduplication (Title AND URL)
      const existingVideos = await getDocs(collection(db, 'workout_videos'));
      const existingTitles = new Set(existingVideos.docs.map(d => d.data().title?.trim().toLowerCase()));
      const existingUrls = new Set(existingVideos.docs.map(d => d.data().video_url));

      // Get rejected videos for permanent ban
      const rejectedVideos = await getDocs(collection(db, 'rejected_videos'));
      const rejectedUrls = new Set(rejectedVideos.docs.map(d => d.data().video_url));

      let addedCount = 0;
      let skippedCount = 0;
      let bannedCount = 0;

      for (const ex of lyftaSample) {
        // Strict Deduplication and Ban-list check
        if (existingTitles.has(ex.title.trim().toLowerCase()) || existingUrls.has(ex.video_url)) {
          skippedCount++;
          continue;
        }

        if (rejectedUrls.has(ex.video_url)) {
          bannedCount++;
          continue;
        }

        const catId = await getCategoryId(ex.category);
        await addDoc(collection(db, 'workout_videos'), {
          ...ex,
          category_id: catId,
          createdAt: new Date().toISOString(),
          createdBy: "system_audit",
          isApproved: false // Require admin chulito
        });
        addedCount++;
        existingTitles.add(ex.title.trim().toLowerCase()); 
        existingUrls.add(ex.video_url);
      }

      alert(`🚀 Biblioteca Lyfta sincronizada.\nNuevos (En Revisión): ${addedCount}\nOmitidos (Existentes): ${skippedCount}\nVetados (Rechazados previamente): ${bannedCount}`);
    } catch (error) {
       console.error("Error seeding Lyfta:", error);
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesTab = v.tipo === activeTab || 
                       (!v.tipo && activeTab === 'gym') || 
                       (activeTab === 'gym' && v.tipo === 'casa');
    const isApproved = v.isApproved !== false; // Solo videos aprobados para estudiantes
    
    // Si no es admin y el video no está aprobado, ocultar
    if (user?.role !== 'admin' && !isApproved) return false;
    
    const matchesCategory = selectedCategory ? v.category_id === selectedCategory : true;
    const matchesDifficulty = selectedDifficulty ? v.difficulty === selectedDifficulty : true;
    const matchesEquipment = selectedEquipment ? v.equipment?.toLowerCase().includes(selectedEquipment.toLowerCase()) : true;
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.equipment?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesTab || !matchesCategory || !matchesDifficulty || !matchesEquipment || !matchesSearch) return false;

    // 4. Fitness Goal Filtering
    if (!user?.fitnessGoal || user.fitnessGoal === 'general') return true;
    
    const videoGoal = v.objetivo || 'general';
    const isTargetedToUser = videoGoal === user.fitnessGoal;
    const isGeneral = videoGoal === 'general';
    
    return isTargetedToUser || isGeneral;
  }).sort((a, b) => {
    // Sort by goal priority
    if (!user?.fitnessGoal || user.fitnessGoal === 'general') return 0;
    
    const goalA = a.objetivo || 'general';
    const goalB = b.objetivo || 'general';
    
    if (goalA === user.fitnessGoal && goalB !== user.fitnessGoal) return -1;
    if (goalA !== user.fitnessGoal && goalB === user.fitnessGoal) return 1;
    return 0;
  });

  // Admin Actions
  const adminAddActions = (
    <div className="flex gap-2">
       <button 
         onClick={clearGymWorkouts} 
         className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
        >
          <Trash2 className="w-3 h-3" /> Limpiar Gym
       </button>
       <button 
         onClick={seedLyftaVideos} 
         className="px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" /> Sincronizar Lyfta
       </button>
       <button 
         onClick={() => setShowUploadModal(true)} 
         className="p-4 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group border-4 border-white dark:border-slate-900"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
       </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white pb-32 font-sans px-4 sm:px-6">
      {/* Admin Floating Action Button */}
      {user?.role === 'admin' && (
        <div className="fixed bottom-24 right-6 z-40">
          {adminAddActions}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title="Subir Nuevo Video"
      >
        <form onSubmit={handleSubmitVideo} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
              <input
                type="text"
                required
                value={uploadForm.title}
                onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                placeholder="Ej: Jab-Cross-Hook Combo"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <select
                required
                value={uploadForm.categoryId}
                onChange={e => setUploadForm({...uploadForm, categoryId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
              >
                <option value="">Seleccionar Categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
            <textarea
              required
              value={uploadForm.description}
              onChange={e => setUploadForm({...uploadForm, description: e.target.value})}
              placeholder="Describe brevemente el entrenamiento..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none resize-none h-20 sm:h-24 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
            <select
              required
              value={uploadForm.tipo}
              onChange={e => setUploadForm({...uploadForm, tipo: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="boxeo">Boxeo / Técnica</option>
              <option value="gym">Gym / Musculación / HIIT</option>
            </select>
          </div>
          <div className="space-y-1 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel</label>
            <select
              value={uploadForm.level}
              onChange={e => setUploadForm({...uploadForm, level: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
              <option value="Élite">Élite</option>
            </select>
          </div>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Herramientas / Equipo</label>
            <select
              value={uploadForm.equipment}
              onChange={e => setUploadForm({...uploadForm, equipment: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none"
            >
              <option value="Sin equipo">Sin equipo</option>
              <option value="Mancuernas">Mancuernas</option>
              <option value="Saco de Boxeo">Saco de Boxeo</option>
              <option value="Vendas / Guantes">Vendas / Guantes</option>
              <option value="Cuerda para saltar">Cuerda para saltar</option>
              <option value="Banco plano/inclinado">Banco plano/inclinado</option>
              <option value="Barra y Discos">Barra y Discos</option>
              <option value="Kettlebell">Kettlebell</option>
              <option value="Bandas elásticas">Bandas elásticas</option>
              <option value="TRX">TRX</option>
              <option value="Peso corporal">Peso corporal</option>
            </select>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <label className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo</label>
            <select
              required
              value={uploadForm.objetivo}
              onChange={e => setUploadForm({...uploadForm, objetivo: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base text-slate-900 dark:text-white focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="bajar_peso">Bajar de Peso</option>
              <option value="mantener">Mantener</option>
              <option value="aumentar">Aumentar Masa Muscular</option>
              <option value="general">Acondicionamiento General</option>
            </select>
          </div>

          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1 sm:space-y-2">
              <label className="text-[10px] sm:text-[11px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-2">
                <Video className="w-4 h-4" /> Enlace de Video (Directo)
              </label>
              <input
                type="url"
                value={uploadForm.video_url}
                onChange={e => setUploadForm({...uploadForm, video_url: e.target.value})}
                placeholder="Ej: https://lyfta... / https://youtube..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-primary outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase ml-1">O sube un archivo nuevo si no tienes el enlace:</p>
            </div>
            <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full text-slate-500" />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-primary uppercase tracking-widest">
                <span>Subiendo...</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} className="bg-primary h-full" />
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-3 sm:gap-4">
            <button type="button" onClick={() => setShowUploadModal(false)} disabled={isUploading} className="flex-1 px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={isUploading} className="flex-[2] bg-primary text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/30 disabled:opacity-50 transition-all">
              {isUploading ? 'Procesando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Header with Navigation */}
      <header className="flex items-center justify-between py-6 sm:py-10 mb-4 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none italic">Entrenamientos</h1>
            <p className="text-[10px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest leading-none">{activeTab === 'boxeo' ? 'Boxeo y Técnica' : 'Musculación y HIIT'}</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary transition-all shadow-sm"
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </header>

      {/* Main Tabs (Boxeo vs Gym) */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl mb-6 sm:mb-10 border border-slate-200 dark:border-slate-800/50 max-w-sm mx-auto relative z-20">
        <button
          onClick={() => { setActiveTab('boxeo'); setSelectedCategory(null); }}
          className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'boxeo' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50'}`}
        >
          <Video className="w-4 h-4 sm:w-5 sm:h-5" />
          Boxeo
        </button>
        <button
          onClick={() => { setActiveTab('gym'); setSelectedCategory(null); }}
          className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'gym' ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-900/50'}`}
        >
          <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
          Gym
        </button>
      </div>

      {/* Admin Audit Section (Videos Pendientes) */}
      {user?.role === 'admin' && videos.filter(v => v.isApproved === false).length > 0 && (
         <div className="mb-10 p-6 bg-amber-500/5 border border-amber-500/20 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                     <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Revisión de Contenido</h2>
                     <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{videos.filter(v => v.isApproved === false).length} videos nuevos por aprobar</p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/50 animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-amber-500/20 animate-pulse delay-150" />
               </div>
            </div>
            
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
               {videos.filter(v => v.isApproved === false).map(v => (
                  <div key={v.id} className="flex-shrink-0 w-64 glass-card border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col group">
                     <div className="aspect-video bg-black relative">
                        <LazyVideoWrapper src={v.video_url} className="w-full h-full object-cover" controls={false} muted playsInline wrap={false} />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                           <Play className="w-8 h-8 text-white opacity-50 group-hover:opacity-100 transition-all" />
                        </div>
                     </div>
                     <div className="p-4 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">{v.title}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{v.category_id}</p>
                     </div>
                     <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                        <button 
                           onClick={() => handleApproveVideo(v.id, true)}
                           className="flex-1 bg-emerald-500 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
                        >
                           <CheckSquare className="w-3.5 h-3.5" /> Aprobar
                        </button>
                        <button 
                           onClick={() => handleApproveVideo(v.id, false)}
                           className="flex-1 bg-red-500 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-500/20"
                        >
                           <X className="w-3.5 h-3.5" /> Borrar
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      <div className="flex flex-col gap-6 sm:gap-8 mb-8 sm:mb-16">
        {/* Search Bar */}
        <div className="relative group max-w-4xl mx-auto w-full">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar ejercicio o técnica..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] sm:rounded-3xl pl-12 sm:pl-16 pr-6 py-4 sm:py-6 text-sm sm:text-lg focus:outline-none focus:border-primary font-medium shadow-sm transition-all"
          />
        </div>

        {/* Categories Bar */}
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-3 px-2">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${!selectedCategory ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${selectedCategory === cat.id ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Admin: Manage Categories inline */}
        {user?.role === 'admin' && (
          <div className="w-full px-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Categorías:</span>
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 group">
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-red-400 hover:text-red-600 transition-all"
                    title="Eliminar categoría"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {showAddCategory ? (
                <form onSubmit={handleAddCategory} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="Nueva categoría..."
                    autoFocus
                    className="bg-white dark:bg-slate-900 border border-primary rounded-xl px-3 py-1.5 text-[11px] font-bold text-slate-900 dark:text-white outline-none w-40"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
                  <button type="button" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="px-3 py-1.5 text-slate-400 text-[10px] font-black uppercase">✕</button>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-primary/50 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary/5 transition-all"
                >
                  <Plus className="w-3 h-3" /> Categoría
                </button>
              )}
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-3 px-2">
            {[
              { id: null, name: 'Toda Herramienta' },
              { id: 'mancuerna', name: 'Mancuernas' },
              { id: 'barra', name: 'Barra' },
              { id: 'banda', name: 'Banda' },
              { id: 'kettlebell', name: 'Kettlebell' },
              { id: 'sin equipo', name: 'Sin Equipo' }
            ].map(tool => (
              <button 
                key={tool.id || 'all'}
                onClick={() => setSelectedEquipment(tool.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedEquipment === tool.id ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        {isLoading ? (
          // Skeleton Loader
          [1, 2, 3].map(i => (
            <div key={i} className="flex flex-col glass-card rounded-[2rem] overflow-hidden animate-pulse">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16" />
                </div>
              </div>
            </div>
          ))
        ) : filteredVideos.length === 0 ? (
          <div className="col-span-full text-center py-20 glass-card rounded-[2rem] border-dashed">
            <Video className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No hay videos en esta categoría.</p>
          </div>
        ) : (
          filteredVideos.map(video => (
            <div key={video.id} onClick={() => handleVideoClick(video)} className="flex flex-col glass-card rounded-[2rem] overflow-hidden group cursor-pointer hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className={`relative aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-lg group/video border-2 ${video.isApproved === false ? 'border-red-500/50 shadow-red-500/5' : 'border-transparent'}`}>
              {video.isApproved === false && (
                <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  Pendiente
                </div>
              )}
                {video.cover_url ? (
                  <img 
                    src={video.cover_url} 
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80'; // Fallback boxing context image
                    }}
                  />
                ) : video.video_url ? (
                  (() => {
                    const videoSrc = getYouTubeEmbedUrl(video.video_url);
                    return videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') ? (
                      <iframe 
                        src={videoSrc} 
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-105 group-hover:scale-110 transition-transform duration-700"
                        allowFullScreen
                      ></iframe>
                    ) : videoSrc.toLowerCase().endsWith('.gif') ? (
                      <img 
                        src={videoSrc} 
                        alt={video.title}
                        className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <LazyVideoWrapper 
                        src={videoSrc} 
                        className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700" 
                        controls={false}
                        muted
                        playsInline
                      />
                    );
                  })()
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-700">
                    <Dumbbell className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform duration-500" />
                    <span className="text-xs font-black uppercase tracking-[0.3em]">Combo</span>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-slate-900/90 text-primary p-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 shadow-xl">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
                
                {(user?.role === 'admin' || user?.role === 'teacher') && (
                  <div className="absolute top-4 right-4 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditVideo(video);
                      }}
                      className="bg-white/90 dark:bg-slate-900/90 text-blue-500 p-2.5 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVideo(video.id);
                      }}
                      className="bg-white/90 dark:bg-slate-900/90 text-red-500 p-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h4 className="font-bold text-lg leading-tight text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">{video.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 flex-1">{video.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {video.duration && (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      <Clock className="w-3 h-3" /> {video.duration} min
                    </span>
                  )}
                  {video.difficulty && (
                    <span className="inline-block text-[10px] font-black uppercase tracking-[0.15em] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      {video.difficulty}
                    </span>
                  )}
                  {video.equipment && (
                    <span className="inline-block text-[10px] font-black uppercase tracking-[0.15em] bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">
                      {video.equipment}
                    </span>
                  )}
                  {video.tipo && (
                    <span className={`inline-block text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border ${
                      video.tipo === 'casa' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {video.tipo === 'casa' ? '🏠 En Casa' : '🏋️ En Gym'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>


      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-colors"
              >
                {confirmDialog.confirmText || 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVideoDetails && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="relative aspect-video bg-black">
              {selectedVideoDetails.video_url ? (
                (() => {
                  const videoSrc = getYouTubeEmbedUrl(selectedVideoDetails.video_url);
                  return videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') ? (
                    <iframe 
                      src={videoSrc.replace('controls=0', 'controls=1').replace('mute=1', 'mute=0')} 
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    ></iframe>
                  ) : videoSrc.toLowerCase().endsWith('.gif') ? (
                    <img 
                      src={videoSrc} 
                      alt={selectedVideoDetails.title}
                      className="absolute inset-0 w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <LazyVideoWrapper 
                      src={videoSrc} 
                      className="absolute inset-0 w-full h-full object-contain" 
                      controls
                      autoPlay
                      playsInline
                    />
                  );
                })()
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Dumbbell className="w-16 h-16 mb-4" />
                  <span className="text-lg font-bold uppercase tracking-widest">Combo</span>
                </div>
              )}
              <button 
                onClick={() => setSelectedVideoDetails(null)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedVideoDetails.title}</h2>
                  <div className="flex gap-2 mt-2">
                    {selectedVideoDetails.difficulty && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded">
                        {selectedVideoDetails.difficulty}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">
                      {categories.find(c => c.id === selectedVideoDetails.category_id)?.name}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRoutineModal(true)}
                  className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                  title="Añadir a rutina personalizada"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" /> Descripción
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedVideoDetails.description}
                    </p>
                  </div>

                  {selectedVideoDetails.equipment && (
                    <div className="w-full">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" /> Equipamiento
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                        {selectedVideoDetails.equipment}
                      </p>
                    </div>
                  )}
                </div>

                {selectedVideoDetails.instructions && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-500" /> Instrucciones
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedVideoDetails.instructions}
                    </p>
                  </div>
                )}

                {selectedVideoDetails.common_errors && (
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Errores Comunes
                    </h3>
                    <p className="text-red-700 dark:text-red-300/80 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedVideoDetails.common_errors}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button 
                onClick={() => setSelectedVideoDetails(null)}
                className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-white py-4 rounded-2xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              {selectedVideoDetails.video_url && (
                <button 
                  onClick={() => setFullScreenVideoUrl(selectedVideoDetails.video_url!)}
                  className="flex-[2] bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" /> Ver en Pantalla Completa
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRoutineModal && selectedVideoDetails && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Añadir a Rutina</h3>
              <button onClick={() => setShowRoutineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
              {userRoutines.length === 0 ? (
                <p className="text-center text-slate-500 py-4 text-sm italic">No tienes rutinas creadas.</p>
              ) : (
                userRoutines.map(routine => (
                  <button
                    key={routine.id}
                    onClick={async () => {
                      try {
                        const updatedExercises = [...routine.exercises, selectedVideoDetails.id];
                        await updateDoc(doc(db, 'custom_routines', routine.id), { exercises: updatedExercises });
                        setUserRoutines(userRoutines.map(r => r.id === routine.id ? { ...r, exercises: updatedExercises } : r));
                        setShowRoutineModal(false);
                        alert(`Añadido a ${routine.name}`);
                      } catch (error) {
                        console.error("Error updating routine:", error);
                      }
                    }}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-primary/10 hover:text-primary transition-all group"
                  >
                    <span className="font-bold">{routine.name}</span>
                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full group-hover:bg-primary/20">{routine.exercises.length} ej.</span>
                  </button>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">O crea una nueva</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nombre de la rutina" 
                  value={newRoutineName}
                  onChange={e => setNewRoutineName(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-primary"
                />
                <button 
                  onClick={async () => {
                    if (!newRoutineName.trim()) return;
                    try {
                      const routineData = {
                        user_id: String(user?.id),
                        name: newRoutineName,
                        exercises: [selectedVideoDetails.id],
                        createdAt: new Date().toISOString()
                      };
                      const docRef = await addDoc(collection(db, 'custom_routines'), routineData);
                      setUserRoutines([...userRoutines, { id: docRef.id, ...routineData } as CustomRoutine]);
                      setNewRoutineName('');
                      setShowRoutineModal(false);
                      alert(`Rutina ${newRoutineName} creada.`);
                    } catch (error) {
                      console.error("Error creating routine:", error);
                    }
                  }}
                  className="bg-primary text-white p-2 rounded-xl"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fullScreenVideoUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="p-4 flex justify-end bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
            <button 
              onClick={() => setFullScreenVideoUrl(null)}
              className="bg-slate-800/80 text-white p-2 rounded-full hover:bg-slate-700 transition-colors backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {fullScreenVideoUrl.toLowerCase().endsWith('.gif') ? (
              <img 
                src={fullScreenVideoUrl} 
                alt="Fullscreen animation"
                className="w-full h-full max-h-screen object-contain"
                referrerPolicy="no-referrer"
              />
            ) : fullScreenVideoUrl.includes('youtube.com') || fullScreenVideoUrl.includes('youtu.be') ? (
              <iframe 
                src={getYouTubeEmbedUrl(fullScreenVideoUrl).replace('controls=0', 'controls=1').replace('mute=1', 'mute=0')} 
                className="w-full h-full max-h-screen"
                allowFullScreen
                allow="autoplay; fullscreen"
              ></iframe>
            ) : (
              <LazyVideoWrapper 
                src={fullScreenVideoUrl} 
                className="w-full h-full max-h-screen object-contain"
                controls
                autoPlay
                playsInline
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
