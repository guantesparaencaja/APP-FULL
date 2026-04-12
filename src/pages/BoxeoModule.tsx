import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize2, RefreshCw,
  Trash2, Plus, ChevronRight, ChevronLeft, RotateCcw, Eye, EyeOff,
  Upload, X, Check, Loader2, Shield, Footprints, Zap, Target,
  Dumbbell, Wind, Flame, Heart, AlertCircle, Star, Edit2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, where, setDoc, onSnapshot, serverTimestamp, getDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayerModal } from '../components/VideoPlayerModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BoxeoVideo {
  id: string;
  nombre: string;
  subcategoria: string;
  nivel: 'Principiante' | 'Intermedio' | 'Avanzado';
  duracion_seg: number;
  descripcion: string;
  puntos_clave: string[];
  errores_comunes: string[];
  drive_file_id?: string;
  url_directa: string;
  miniatura_url?: string;
  activo: boolean;
  orden: number;
  creado_en?: any;
}

// ─── Subcategories config ─────────────────────────────────────────────────────
const SUBCATEGORIAS = [
  { id: 'Tecnica-Basica',  label: 'Técnica Básica',    icon: '🥊', color: 'from-red-600 to-red-800',     desc: 'Golpes fundamentales del boxeo' },
  { id: 'Footwork',        label: 'Footwork',           icon: '👣', color: 'from-blue-600 to-blue-800',    desc: 'Movimiento y posicionamiento' },
  { id: 'Defensa',         label: 'Defensa',            icon: '🛡️', color: 'from-emerald-600 to-emerald-800', desc: 'Esquivas y bloqueos' },
  { id: 'Combinaciones',   label: 'Combinaciones',      icon: '💥', color: 'from-orange-600 to-orange-800', desc: 'Secuencias de golpes' },
  { id: 'Saco',            label: 'Saco',               icon: '🎯', color: 'from-purple-600 to-purple-800', desc: 'Trabajo en el saco' },
  { id: 'Sombra',          label: 'Sombra',             icon: '👻', color: 'from-slate-500 to-slate-700',  desc: 'Shadow boxing' },
  { id: 'Fisico',          label: 'Físico para Boxeo',  icon: '💪', color: 'from-yellow-600 to-yellow-800', desc: 'Acondicionamiento físico' },
  { id: 'Calentamiento',   label: 'Calentamiento',      icon: '🔥', color: 'from-pink-600 to-pink-800',   desc: 'Movilidad y estiramiento' },
];

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_VIDEOS: Omit<BoxeoVideo, 'id'>[] = [
  // TÉCNICA BÁSICA
  { nombre: 'Guardia Correcta', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Posición de manos, codos y pies para protegerte y atacar con eficiencia.', puntos_clave: ['Manos a altura de barbilla', 'Codos hacia el cuerpo', 'Peso en ambos pies'], errores_comunes: ['Bajar las manos', 'Brazos extendidos', 'Talones levantados'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Jab', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Golpe recto con la mano delantera. Arma principal para medir distancia.', puntos_clave: ['Rotar el puño al impacto', 'Retraer rápido a guardia', 'Extender hombro delantero'], errores_comunes: ['No rotar cadera', 'Dejar el brazo extendido', 'Golpear con muñeca doblada'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Cross', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Golpe recto con la mano trasera. Más potente que el jab gracias a la rotación de cadera.', puntos_clave: ['Rotar la cadera completamente', 'Transferir el peso', 'Proteger el mentón con el hombro'], errores_comunes: ['No rotar cadera', 'Perder la guardia con la otra mano', 'Olvidar el retorno'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Hook Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Gancho lateral con la mano delantera. Ángulo del codo a 90°.', puntos_clave: ['Codo a 90°', 'Girar el torso', 'Pivote del pie delantero'], errores_comunes: ['Codo demasiado bajo o alto', 'Sin rotación de torso', 'Telegrafiar el golpe'], url_directa: '', activo: true, orden: 4 },
  { nombre: 'Hook Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Gancho con la mano trasera. Requiere caída del peso y giro de cadera.', puntos_clave: ['Caída del peso en pie trasero', 'Giro de cadera pronunciado', 'Mantener guardia con mano delantera'], errores_comunes: ['Pasar por alto la rotación', 'Codo demasiado alto', 'Perder equilibrio'], url_directa: '', activo: true, orden: 5 },
  { nombre: 'Uppercut Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Golpe ascendente desde la mano delantera. Generado desde las piernas.', puntos_clave: ['Doblar las rodillas', 'Trayectoria vertical', 'Recogida rápida'], errores_comunes: ['Sin flexión de rodillas', 'Telegrafiar bajando el hombro', 'No recoger el brazo'], url_directa: '', activo: true, orden: 6 },
  { nombre: 'Uppercut Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Golpe ascendente con la mano trasera. Más potente pero más lento.', puntos_clave: ['Explosividad desde piernas', 'Recogida rápida', 'Guardia con mano delantera'], errores_comunes: ['Exagerar el movimiento de la cadera', 'Sin retorno a guardia', 'Descubrir la cabeza'], url_directa: '', activo: true, orden: 7 },
  { nombre: 'Combinación 1-2 (Jab-Cross)', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'La combinación básica del boxeo. Fluidez y ritmo entre jab y cross.', puntos_clave: ['Jab como preparación', 'Cross inmediato', 'Regreso a guardia'], errores_comunes: ['Pausa entre golpes', 'No trasladar peso al cross', 'Descubrir la guardia'], url_directa: '', activo: true, orden: 8 },
  { nombre: 'Combinación 1-2-3', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Jab, Cross y Hook. Encadenamiento y distancia correcta.', puntos_clave: ['Fluidez en el encadenamiento', 'Mantener distancia correcta', 'Hook en el momento exacto'], errores_comunes: ['Perder distancia al hookear', 'Pausas entre golpes', 'Bajar la guardia'], url_directa: '', activo: true, orden: 9 },
  { nombre: 'Combinación 1-2-3-4', subcategoria: 'Tecnica-Basica', nivel: 'Avanzado', duracion_seg: 50, descripcion: 'Jab, Cross, Hook y Uppercut. Combinación completa.', puntos_clave: ['Ritmo sostenido', 'Cada golpe tiene su técnica', 'Regreso limpio a guardia'], errores_comunes: ['Sacrificar técnica por velocidad', 'Perder posición', 'Sin potencia en últimos golpes'], url_directa: '', activo: true, orden: 10 },
  // FOOTWORK
  { nombre: 'Posición Base', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Base fundamental del movimiento. Ancho de hombros, peso en bola del pie.', puntos_clave: ['Rodillas ligeramente flexionadas', 'Peso en bola del pie', 'Pie trasero a 45°'], errores_comunes: ['Talones en el suelo', 'Pies paralelos', 'Rodillas rígidas'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Paso Adelante y Atrás', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Movimiento longitudinal sin cruzar pies.', puntos_clave: ['Pie delantero primero al avanzar', 'Pie trasero primero al retroceder', 'Nunca cruzar los pies'], errores_comunes: ['Cruzar los pies', 'Dar pasos demasiado largos', 'Perder guardia al moverse'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Paso Lateral', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Deslizamiento lateral derecha e izquierda para crear ángulos.', puntos_clave: ['El pie del lado va primero', 'Mantener distancia entre pies', 'Deslizar no saltar'], errores_comunes: ['Saltar en lugar de deslizar', 'Juntar los pies', 'Perder equilibrio'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Pivote Izquierdo', subcategoria: 'Footwork', nivel: 'Intermedio', duracion_seg: 40, descripcion: 'Rotación sobre el pie delantero para cambiar ángulo de ataque.', puntos_clave: ['Girar sobre la bola del pie delantero', 'Pie trasero sigue el movimiento', 'Mantener guardia durante el giro'], errores_comunes: ['Girar sobre el talón', 'Perder equilibrio', 'Bajar manos en el giro'], url_directa: '', activo: true, orden: 4 },
  { nombre: 'Hexágono de Movimiento', subcategoria: 'Footwork', nivel: 'Avanzado', duracion_seg: 55, descripcion: 'Ejercicio de agilidad: moverse a 6 puntos del hexágono manteniendo guardia.', puntos_clave: ['Pasos cortos y rápidos', 'Orientación constante al frente', 'Regresar siempre al centro'], errores_comunes: ['Dar pasos demasiado largos', 'Perder orientación', 'Sin velocidad'], url_directa: '', activo: true, orden: 5 },
  // DEFENSA
  { nombre: 'Slip Izquierdo', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Esquivar un jab girando la cabeza hacia la izquierda.', puntos_clave: ['Mover la cabeza fuera de la línea', 'Ligera flexión de rodillas', 'Regresar a posición central'], errores_comunes: ['Mover todo el cuerpo', 'No regresar al centro', 'Sin contraataque preparado'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Bob and Weave', subcategoria: 'Defensa', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Agacharse y salir por el lado para esquivar golpes al cuerpo.', puntos_clave: ['Doblar las rodillas, no la espalda', 'Movimiento en U', 'Salir del lado contrario al golpe'], errores_comunes: ['Doblar la espalda', 'Movimiento lento', 'No completar el weave'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Cover Up', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Proteger la cabeza con guantes y codos ante una lluvia de golpes.', puntos_clave: ['Guantes a los lados de la cabeza', 'Codos juntos al frente', 'Observar a través de los guantes'], errores_comunes: ['Dejar huecos entre guantes', 'Cerrar los ojos', 'Sin plan de salida'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Shoulder Roll', subcategoria: 'Defensa', nivel: 'Avanzado', duracion_seg: 45, descripcion: 'Rodar el hombro para absorber y desviar golpes.', puntos_clave: ['Inclinar el hombro para desviar', 'Peso en pie trasero', 'Contra inmediato disponible'], errores_comunes: ['Movimiento exagerado', 'Sin contraataque', 'Perder guardia'], url_directa: '', activo: true, orden: 4 },
  // COMBINACIONES
  { nombre: '1-2 al Cuerpo y Cabeza', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Alternar niveles de ataque: golpe al cuerpo seguido de golpe a la cabeza.', puntos_clave: ['Cambio de nivel con las rodillas', 'No telegrafiar el nivel', 'Ritmo constante'], errores_comunes: ['Telegrafiar bajando la vista', 'Perder postura al atacar cuerpo', 'Pausar entre niveles'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Counter Jab', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Responder el jab del oponente con un jab propio.', puntos_clave: ['Timing exacto', 'Slip antes del counter', 'Velocidad de mano'], errores_comunes: ['Sin el slip previo', 'Timing incorrecto', 'Perder guardia al countear'], url_directa: '', activo: true, orden: 2 },
  { nombre: '1-2-3-2 (Jab-Cross-Hook-Cross)', subcategoria: 'Combinaciones', nivel: 'Avanzado', duracion_seg: 50, descripcion: 'Cuatro golpes fluidos que terminan con el potente cross.', puntos_clave: ['Fluidez en todo el encadenamiento', 'Cross final con máxima potencia', 'Regreso limpio a guardia'], errores_comunes: ['Perder ritmo en el hook', 'Cross final sin potencia', 'Descubrirse al terminar'], url_directa: '', activo: true, orden: 3 },
  // SACO
  { nombre: 'Distancia Correcta al Saco', subcategoria: 'Saco', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Encontrar la distancia óptima para cada golpe sin pegarse al saco.', puntos_clave: ['Brazo casi extendido al contacto', 'Nunca pegar pegado al saco', 'Ajustar distancia en movimiento'], errores_comunes: ['Pegarse demasiado al saco', 'Estar muy lejos sin potencia', 'No moverse después de golpear'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Round Básico de 3 Minutos', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 60, descripcion: 'Estructura completa de un round en el saco con movimiento, combinaciones y descansos activos.', puntos_clave: ['Moverse constantemente', 'Alternar velocidad y potencia', 'Respirar por la nariz'], errores_comunes: ['Quedarse estático', 'Golpear sin técnica', 'Contener la respiración'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Uppercuts al Saco', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Trabajo específico de uppercuts con ángulo correcto al saco.', puntos_clave: ['Ángulo de entrada por debajo', 'Generación desde piernas', 'Posición pegada al saco'], errores_comunes: ['Sin doblar rodillas', 'Golpe plano no ascendente', 'Posición incorrecta'], url_directa: '', activo: true, orden: 3 },
  // SOMBRA
  { nombre: 'Sombra Básica', subcategoria: 'Sombra', nivel: 'Principiante', duracion_seg: 50, descripcion: 'Moverte y golpear sin oponente. También llamado shadowboxing.', puntos_clave: ['Visualizar un oponente frente a ti', 'Combinar golpes y movimiento', 'Mantener guardia siempre'], errores_comunes: ['Sin movimiento de pies', 'Golpes sin extensión completa', 'Sin visualización activa'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Sombra Defensiva', subcategoria: 'Sombra', nivel: 'Intermedio', duracion_seg: 50, descripcion: 'Practicar exclusivamente esquivas y movimientos defensivos.', puntos_clave: ['Esquivas fluidas', 'Moverse fuera de la línea de ataque', 'Contrataque inmediato'], errores_comunes: ['Quedarse en el mismo lugar', 'Esquivas exageradas', 'Sin contraataque'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Sombra con Pesas Ligeras', subcategoria: 'Sombra', nivel: 'Avanzado', duracion_seg: 55, descripcion: 'Shadowboxing con mancuernas de 0.5-1kg para trabajar resistencia de hombros.', puntos_clave: ['Pesos muy ligeros (máx 1kg)', 'Técnica perfecta ante todo', 'Velocidad reducida'], errores_comunes: ['Pesos demasiado pesados', 'Sacrificar técnica', 'Golpear rápido sin control'], url_directa: '', activo: true, orden: 3 },
  // FÍSICO
  { nombre: 'Saltar Cuerda Básico', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 55, descripcion: 'Fundamento del acondicionamiento del boxeador. Ritmo y postura.', puntos_clave: ['Saltar solo 2-3cm del suelo', 'Muñecas impulsan la cuerda', 'Core activado'], errores_comunes: ['Saltar demasiado alto', 'Usar brazos en lugar de muñecas', 'Mirar la cuerda'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Flexiones para Boxeo', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Fuerza de empuje específica para el boxeo.', puntos_clave: ['Puños en el suelo (nudillos)', 'Bajar hasta pecho casi toque el suelo', 'Core contraído'], errores_comunes: ['Cadera hacia arriba', 'Sin rango completo', 'Codos muy abiertos'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Burpees de Boxeador', subcategoria: 'Fisico', nivel: 'Intermedio', duracion_seg: 50, descripcion: 'Burpee tradicional + guardia + 1-2 al levantarse.', puntos_clave: ['Explosividad al levantarse', 'Guardia inmediata', 'Ritmo sostenido'], errores_comunes: ['Sin guardia al levantarse', 'Ritmo inconsistente', 'Perder técnica en los golpes'], url_directa: '', activo: true, orden: 3 },
  // CALENTAMIENTO
  { nombre: 'Movilidad de Muñecas', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 35, descripcion: 'Rotaciones y flexiones para preparar las muñecas antes de boxear.', puntos_clave: ['Rotaciones completas', 'Flexión y extensión', '30 segundos por dirección'], errores_comunes: ['Hacerlo demasiado rápido', 'Sin ir al rango completo', 'Saltarlo'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Activación de Caderas para Footwork', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Movilidad de cadera específica para el movimiento del boxeo.', puntos_clave: ['Círculos amplios', 'Rango completo de cadera', 'Movimiento suave y controlado'], errores_comunes: ['Rango limitado', 'Velocidad excesiva', 'Sin calentar después'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Estiramiento Post-Entrenamiento', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 55, descripcion: 'Enfriamiento completo de 5 minutos después de la sesión.', puntos_clave: ['Hombros, espalda, isquiotibiales', 'Mantener 30 seg cada posición', 'Respiración profunda'], errores_comunes: ['Hacerlo con prisa', 'Estirar en frío', 'Olvidar el cuello'], url_directa: '', activo: true, orden: 3 },
];


// ─── Main Component ───────────────────────────────────────────────────────────
export function BoxeoModule({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const user = useStore(state => state.user);
  const navigate = useNavigate();

  const [videos, setVideos] = useState<BoxeoVideo[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<BoxeoVideo | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [undoVideo, setUndoVideo] = useState<BoxeoVideo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const defaultForm = { nombre: '', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: '', puntos_clave: '', errores_comunes: '', url_directa: '', drive_file_id: '' };
  const [addForm, setAddForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin';

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'boxeo_videos'), snap => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() } as BoxeoVideo)));
      setLoading(false);
    }, err => { console.error('boxeo_videos:', err); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, `users/${user.id}/boxeo_ocultos`));
        setHiddenIds(new Set(snap.docs.map(d => d.id)));
      } catch (_) {}
    };
    load();
  }, [user?.id]);

  // ── Seed ───────────────────────────────────────────────────────────────────
  const handleSeed = async () => {
    if (seeding || videos.length > 0) return;
    setSeeding(true);
    try {
      for (const v of SEED_VIDEOS) {
        await addDoc(collection(db, 'boxeo_videos'), { ...v, creado_en: serverTimestamp(), activo: true });
      }
    } catch (e) { console.error(e); }
    finally { setSeeding(false); }
  };

  // ── Hide video ─────────────────────────────────────────────────────────────
  const handleHide = async (video: BoxeoVideo) => {
    if (!user) return;
    setHiddenIds(prev => new Set([...prev, video.id]));
    setUndoVideo(video);
    setSelectedVideo(null);
    try { await setDoc(doc(db, `users/${user.id}/boxeo_ocultos`, video.id), { hidden_at: serverTimestamp() }); } catch (_) {}
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVideo(null), 5000);
  };

  const handleUndo = async () => {
    if (!user || !undoVideo) return;
    setHiddenIds(prev => { const n = new Set(prev); n.delete(undoVideo.id); return n; });
    try { await deleteDoc(doc(db, `users/${user.id}/boxeo_ocultos`, undoVideo.id)); } catch (_) {}
    setUndoVideo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  // ── Admin: Upload file to Storage ──────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { alert('Solo archivos de video.'); return; }
    setUploading(true);
    const storageRef = ref(storage, `boxeo/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      s => setUploadPct(Math.round(s.bytesTransferred / s.totalBytes * 100)),
      err => { alert('Error: ' + err.message); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setAddForm(f => ({ ...f, url_directa: url }));
        setUploading(false);
        setUploadPct(0);
      }
    );
  };

  // ── Admin: Add or Edit video ────────────────────────────────────────────────
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nombre || !addForm.subcategoria) return;
    try {
      const data = {
        ...addForm,
        puntos_clave: typeof addForm.puntos_clave === 'string' ? addForm.puntos_clave.split('\n').map(s => s.trim()).filter(Boolean) : addForm.puntos_clave,
        errores_comunes: typeof addForm.errores_comunes === 'string' ? addForm.errores_comunes.split('\n').map(s => s.trim()).filter(Boolean) : addForm.errores_comunes,
        actualizado_en: serverTimestamp(),
      };

      if (editingVideoId) {
        await updateDoc(doc(db, 'boxeo_videos', editingVideoId), data);
      } else {
        await addDoc(collection(db, 'boxeo_videos'), {
          ...data,
          activo: true,
          orden: 999,
          creado_en: serverTimestamp(),
        });
      }
      setShowAddModal(false);
      setEditingVideoId(null);
      setAddForm(defaultForm);
    } catch (err) { console.error(err); }
  };

  const openEditModal = (v: BoxeoVideo) => {
    setEditingVideoId(v.id);
    setAddForm({
      nombre: v.nombre || '',
      subcategoria: v.subcategoria || 'Tecnica-Basica',
      nivel: v.nivel || 'Principiante',
      duracion_seg: v.duracion_seg || 45,
      descripcion: v.descripcion || '',
      puntos_clave: (v.puntos_clave || []).join('\n'),
      errores_comunes: (v.errores_comunes || []).join('\n'),
      url_directa: v.url_directa || '',
      drive_file_id: v.drive_file_id || ''
    });
    setShowAddModal(true);
  };

  // ── Admin: Toggle active ───────────────────────────────────────────────────
  const handleToggleActive = async (v: BoxeoVideo) => {
    await updateDoc(doc(db, 'boxeo_videos', v.id), { activo: !v.activo });
  };

  // ── Admin: Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este video permanentemente?')) return;
    await deleteDoc(doc(db, 'boxeo_videos', id));
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const visibleVideos = videos.filter(v => {
    if (!v.activo && !isAdmin) return false;
    if (!isAdmin && hiddenIds.has(v.id)) return false;
    return true;
  });

  const subVideos = selectedSub
    ? visibleVideos.filter(v => v.subcategoria === selectedSub && (levelFilter === 'Todos' || v.nivel === levelFilter))
    : [];

  const getNumericLevel = (nivel: string) => {
    switch (nivel) {
      case 'Principiante': return 1;
      case 'Intermedio': return 5;
      case 'Avanzado': return 9;
      default: return 1;
    }
  };

  const subCounts = SUBCATEGORIAS.reduce<Record<string, number>>((acc, s) => {
    acc[s.id] = visibleVideos.filter(v => v.subcategoria === s.id).length;
    return acc;
  }, {});

  const currentIndex = selectedVideo ? subVideos.findIndex(v => v.id === selectedVideo.id) : -1;
  const nextVideo = currentIndex >= 0 && currentIndex < subVideos.length - 1 ? subVideos[currentIndex + 1] : undefined;

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  // ─── Video player con VideoPlayerModal compacto ───────────────────────────
  if (selectedVideo) {
    const driveUrl = selectedVideo.url_directa || (selectedVideo.drive_file_id ? `https://drive.google.com/uc?id=${selectedVideo.drive_file_id}` : '');
    const nivelColor = selectedVideo.nivel === 'Principiante' ? 'text-emerald-400' : selectedVideo.nivel === 'Intermedio' ? 'text-yellow-400' : 'text-red-400';
    return (
      <VideoPlayerModal
        title={selectedVideo.nombre}
        subtitle={selectedVideo.descripcion}
        level={selectedVideo.nivel}
        levelColor={nivelColor}
        duration={`${selectedVideo.duracion_seg}s`}
        videoUrl={driveUrl}
        keyPoints={selectedVideo.puntos_clave || []}
        commonErrors={selectedVideo.errores_comunes || []}
        onClose={() => setSelectedVideo(null)}
        onNext={nextVideo ? () => setSelectedVideo(nextVideo) : undefined}
        extraActions={
          !isAdmin ? (
            <>
              <button
                onClick={() => { const alts = subVideos.filter(v => v.id !== selectedVideo.id); if (alts.length) setSelectedVideo(alts[0]); }}
                className="bg-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase border border-slate-700"
              >Cambiar</button>
              <button
                onClick={() => handleHide(selectedVideo)}
                className="bg-red-500/10 text-red-400 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase border border-red-500/20"
              ><EyeOff className="w-4 h-4" /></button>
            </>
          ) : undefined
        }
      />
    );
  }

  // ─── Video list for subcategory ───────────────────────────────────────────
  if (selectedSub) {
    const subConfig = SUBCATEGORIAS.find(s => s.id === selectedSub)!;
    return (
      <div className={`${!isEmbedded ? 'min-h-screen bg-slate-950 pb-24' : 'pb-8'} text-white font-display`}>
        {/* Add modal for admin */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-end p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-slate-900 rounded-3xl p-6 w-full max-h-[90vh] overflow-y-auto border border-slate-800" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}>
                <div className="flex justify-between mb-6">
                  <h3 className="text-xl font-black text-white uppercase">{editingVideoId ? 'Editar Video' : 'Nuevo Video Boxeo'}</h3>
                  <button onClick={() => { setShowAddModal(false); setEditingVideoId(null); setAddForm(defaultForm); }}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleAddVideo} className="space-y-4">
                  <input required placeholder="Nombre del ejercicio" value={addForm.nombre} onChange={e => setAddForm(f => ({...f, nombre: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                  <select value={addForm.subcategoria} onChange={e => setAddForm(f => ({...f, subcategoria: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm">
                    {SUBCATEGORIAS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={addForm.nivel} onChange={e => setAddForm(f => ({...f, nivel: e.target.value}))} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm">
                      {['Principiante','Intermedio','Avanzado'].map(n => <option key={n}>{n}</option>)}
                    </select>
                    <input type="number" placeholder="Duración (seg)" value={addForm.duracion_seg} onChange={e => setAddForm(f => ({...f, duracion_seg: parseInt(e.target.value)}))} max={60} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <textarea placeholder="Descripción" value={addForm.descripcion} onChange={e => setAddForm(f => ({...f, descripcion: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <textarea placeholder="Puntos clave (uno por línea)" value={addForm.puntos_clave} onChange={e => setAddForm(f => ({...f, puntos_clave: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <textarea placeholder="Errores comunes (uno por línea)" value={addForm.errores_comunes} onChange={e => setAddForm(f => ({...f, errores_comunes: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video (Drive URL o subir archivo)</label>
                    <input type="url" placeholder="https://drive.google.com/uc?id=..." value={addForm.url_directa} onChange={e => setAddForm(f => ({...f, url_directa: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                    <input ref={videoFileRef} type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
                    <button type="button" onClick={() => videoFileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                      <Upload className="w-4 h-4" /> {uploading ? `Subiendo ${uploadPct}%` : 'Subir Video'}
                    </button>
                  </div>
                  <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest">{editingVideoId ? 'Actualizar Video' : 'Guardar Video'}</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4 flex items-center gap-4">
          <button onClick={() => setSelectedSub(null)} className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase tracking-tight text-white">{subConfig.icon} {subConfig.label}</h1>
            <p className="text-[10px] text-slate-400">{subVideos.length} videos disponibles</p>
          </div>
          {isAdmin && (
            <button onClick={() => { setEditingVideoId(null); setAddForm(defaultForm); setShowAddModal(true); }} className="bg-primary p-2.5 rounded-xl text-white shadow-lg">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </header>

        {/* Level filter */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto hide-scrollbar">
          {['Todos','Principiante','Intermedio','Avanzado'].map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                levelFilter === l ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
              {l}
            </button>
          ))}
        </div>

        {/* Video list */}
        <div className="px-4 space-y-3">
          {subVideos.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">{subConfig.icon}</div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                {isAdmin ? 'Agrega el primer video con el botón +' : 'Próximamente'}
              </p>
            </div>
          ) : subVideos.map((v) => {
            const isLocked = getNumericLevel(v.nivel) > (user?.license_level || 1) && !isAdmin;
            return (
            <motion.div key={v.id} layout className={`bg-slate-900 rounded-2xl border ${v.activo ? 'border-slate-800' : 'border-slate-800 opacity-50'} ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''} overflow-hidden`}>
              <button 
                className="w-full flex items-center gap-4 p-4 text-left" 
                onClick={() => {
                  if (isLocked) {
                    alert('Este video requiere un nivel de licencia superior.');
                    return;
                  }
                  setSelectedVideo(v);
                }}
              >
                {/* Thumbnail / placeholder */}
                <div className="w-24 h-16 flex-shrink-0 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative">
                  {isLocked ? (
                    <Lock className="w-8 h-8 text-slate-600" />
                  ) : v.miniatura_url ? (
                    <img src={v.miniatura_url} alt={v.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{subConfig.icon}</span>
                  )}
                  {!isLocked && v.url_directa && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Play className="w-6 h-6 text-white/80" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white text-sm truncate">{isLocked ? 'Contenido Bloqueado' : v.nombre}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      v.nivel === 'Principiante' ? 'bg-emerald-500/20 text-emerald-400' :
                      v.nivel === 'Intermedio' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>{v.nivel}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{v.duracion_seg}s</span>
                    {!isLocked && !v.url_directa && <span className="text-[9px] text-amber-400 font-bold">Sin video</span>}
                  </div>
                  {v.puntos_clave?.length > 0 && !isLocked && (
                    <p className="text-[10px] text-slate-500 mt-1 truncate">✓ {v.puntos_clave[0]}</p>
                  )}
                </div>
                {isLocked ? <Lock className="w-5 h-5 text-slate-700 shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />}
              </button>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleActive(v); }} className={`flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase transition-all flex items-center justify-center gap-1 ${v.activo ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {v.activo ? <><Check className="w-3 h-3"/> <span>Activo</span></> : <span>Inactivo</span>}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(v); }} className="flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(v.id); }} className="flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

        {/* Undo bar */}
        <AnimatePresence>
          {undoVideo && (
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="fixed bottom-24 left-4 right-4 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl z-40">
              <p className="text-sm text-white font-bold">Video oculto</p>
              <button onClick={handleUndo} className="bg-primary text-white text-sm font-black px-4 py-2 rounded-xl">Deshacer</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Main category grid ───────────────────────────────────────────────────
  return (
    <div className={`${!isEmbedded ? 'min-h-screen bg-slate-950 pb-24' : 'pb-8'} text-white font-display`}>
      {!isEmbedded && (
        <header className="px-4 pt-6 pb-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight italic">🥊 Módulo Boxeo</h1>
            <p className="text-slate-400 text-sm">{visibleVideos.length} videos · 8 categorías</p>
          </div>
        </header>
      )}

      {/* Hero banner */}
      <div className="mx-4 mb-6 rounded-3xl bg-gradient-to-br from-red-900/60 via-slate-900 to-slate-950 border border-red-900/30 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl -mr-12 -mt-12" />
        <p className="text-[11px] font-black text-red-400 uppercase tracking-[0.3em] mb-2">CORE DE LA APP</p>
        <h2 className="text-2xl font-black italic text-white leading-tight">Domina el Arte<br />del Boxeo</h2>
        <p className="text-slate-400 text-sm mt-2">Desde técnica básica hasta sparring profesional</p>
        {isAdmin && videos.length === 0 && (
          <button onClick={handleSeed} disabled={seeding}
            className="mt-4 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">
            {seeding ? <><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</> : '⚡ Cargar Contenido Inicial'}
          </button>
        )}
      </div>

      {/* Subcategory grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {SUBCATEGORIAS.map(sub => (
          <motion.button
            key={sub.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedSub(sub.id)}
            className={`relative overflow-hidden rounded-2xl p-5 text-left bg-gradient-to-br ${sub.color} border border-white/10 shadow-lg`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl -mr-5 -mt-5" />
            <span className="text-3xl block mb-3">{sub.icon}</span>
            <h3 className="font-black text-white text-sm uppercase tracking-tight leading-tight">{sub.label}</h3>
            <p className="text-white/60 text-[10px] mt-1">{sub.desc}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="text-white/80 text-[10px] font-black">{subCounts[sub.id] || 0} videos</span>
              <ChevronRight className="w-4 h-4 text-white/60" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
