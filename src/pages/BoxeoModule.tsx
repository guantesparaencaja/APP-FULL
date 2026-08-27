import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Play, Trash2, Plus, ChevronRight, ChevronLeft, EyeOff,
  X, Check, Loader2, Edit2, Lock, AlertTriangle, Search, BookOpen, Trophy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { BoxerAnimatedHero } from '../components/BoxerAnimatedHero';
import { BoxerViewer3D } from '../components/BoxerViewer3D';

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

const SUBCATEGORIAS = [
  { id: 'Tecnica-Basica',  label: 'Tecnica Basica',    icon: '\u{1F94A}', color: 'from-red-500/80 to-red-700/80',     glow: 'shadow-red-500/20',     desc: 'Golpes fundamentales del boxeo',      min_level: 1 },
  { id: 'Calentamiento',   label: 'Calentamiento',      icon: '\u{1F525}', color: 'from-pink-500/80 to-pink-700/80',   glow: 'shadow-pink-500/20',    desc: 'Movilidad y estiramiento',            min_level: 1 },
  { id: 'Fisico',          label: 'Fisico para Boxeo',  icon: '\u{1F4AA}', color: 'from-amber-500/80 to-amber-700/80', glow: 'shadow-amber-500/20',   desc: 'Acondicionamiento fisico',           min_level: 1 },
  { id: 'Footwork',        label: 'Footwork',           icon: '\u{1F463}', color: 'from-blue-500/80 to-blue-700/80',   glow: 'shadow-blue-500/20',    desc: 'Movimiento y posicionamiento',        min_level: 2 },
  { id: 'Defensa',         label: 'Defensa',            icon: '\u{1F6E1}\uFE0F', color: 'from-emerald-500/80 to-emerald-700/80', glow: 'shadow-emerald-500/20', desc: 'Esquivas y bloqueos',         min_level: 2 },
  { id: 'Sombra',          label: 'Sombra',             icon: '\u{1F47B}', color: 'from-slate-400/80 to-slate-600/80',  glow: 'shadow-slate-400/20',   desc: 'Shadow boxing',                       min_level: 3 },
  { id: 'Combinaciones',   label: 'Combinaciones',      icon: '\u{1F4A5}', color: 'from-orange-500/80 to-orange-700/80', glow: 'shadow-orange-500/20',  desc: 'Secuencias de golpes',              min_level: 4 },
  { id: 'Saco',            label: 'Saco',               icon: '\u{1F3AF}', color: 'from-indigo-500/80 to-indigo-700/80', glow: 'shadow-indigo-500/20',  desc: 'Trabajo en el saco',                min_level: 4 },
];

const SEED_VIDEOS: Omit<BoxeoVideo, 'id'>[] = [
  { nombre: 'Guardia Correcta', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Posicion de manos, codos y pies para protegerte y atacar con eficiencia.', puntos_clave: ['Manos a altura de barbilla', 'Codos hacia el cuerpo', 'Peso en ambos pies'], errores_comunes: ['Bajar las manos', 'Brazos extendidos', 'Talones levantados'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Jab', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Golpe recto con la mano delantera. Arma principal para medir distancia.', puntos_clave: ['Rotar el puno al impacto', 'Retraer rapido a guardia', 'Extender hombro delantero'], errores_comunes: ['No rotar cadera', 'Dejar el brazo extendido', 'Golpear con muneca doblada'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Cross', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Golpe recto con la mano trasera. Mas potente que el jab gracias a la rotacion de cadera.', puntos_clave: ['Rotar la cadera completamente', 'Transferir el peso', 'Proteger el menton con el hombro'], errores_comunes: ['No rotar cadera', 'Perder la guardia con la otra mano', 'Olvidar el retorno'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Hook Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Gancho lateral con la mano delantera. Angulo del codo a 90 grados.', puntos_clave: ['Codo a 90 grados', 'Girar el torso', 'Pivote del pie delantero'], errores_comunes: ['Codo demasiado bajo o alto', 'Sin rotacion de torso', 'Telegrafiar el golpe'], url_directa: '', activo: true, orden: 4 },
  { nombre: 'Hook Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Gancho con la mano trasera. Requiere caida del peso y giro de cadera.', puntos_clave: ['Caida del peso en pie trasero', 'Giro de cadera pronunciado', 'Mantener guardia con mano delantera'], errores_comunes: ['Pasar por alto la rotacion', 'Codo demasiado alto', 'Perder equilibrio'], url_directa: '', activo: true, orden: 5 },
  { nombre: 'Uppercut Izquierdo', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Golpe ascendente desde la mano delantera. Generado desde las piernas.', puntos_clave: ['Doblar las rodillas', 'Trayectoria vertical', 'Recogida rapida'], errores_comunes: ['Sin flexion de rodillas', 'Telegrafiar bajando el hombro', 'No recoger el brazo'], url_directa: '', activo: true, orden: 6 },
  { nombre: 'Uppercut Derecho', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Golpe ascendente con la mano trasera. Mas potente pero mas lento.', puntos_clave: ['Explosividad desde piernas', 'Recogida rapida', 'Guardia con mano delantera'], errores_comunes: ['Exagerar el movimiento de la cadera', 'Sin retorno a guardia', 'Descubrir la cabeza'], url_directa: '', activo: true, orden: 7 },
  { nombre: 'Combinacion 1-2 (Jab-Cross)', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: 'La combinacion basica del boxeo. Fluidez y ritmo entre jab y cross.', puntos_clave: ['Jab como preparacion', 'Cross inmediato', 'Regreso a guardia'], errores_comunes: ['Pausa entre golpes', 'No trasladar peso al cross', 'Descubrir la guardia'], url_directa: '', activo: true, orden: 8 },
  { nombre: 'Combinacion 1-2-3', subcategoria: 'Tecnica-Basica', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Jab, Cross y Hook. Encadenamiento y distancia correcta.', puntos_clave: ['Fluidez en el encadenamiento', 'Mantener distancia correcta', 'Hook en el momento exacto'], errores_comunes: ['Perder distancia al hookear', 'Pausas entre golpes', 'Bajar la guardia'], url_directa: '', activo: true, orden: 9 },
  { nombre: 'Combinacion 1-2-3-4', subcategoria: 'Tecnica-Basica', nivel: 'Avanzado', duracion_seg: 50, descripcion: 'Jab, Cross, Hook y Uppercut. Combinacion completa.', puntos_clave: ['Ritmo sostenido', 'Cada golpe tiene su tecnica', 'Regreso limpio a guardia'], errores_comunes: ['Sacrificar tecnica por velocidad', 'Perder posicion', 'Sin potencia en ultimos golpes'], url_directa: '', activo: true, orden: 10 },
  { nombre: 'Posicion Base', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Base fundamental del movimiento. Ancho de hombros, peso en bola del pie.', puntos_clave: ['Rodillas ligeramente flexionadas', 'Peso en bola del pie', 'Pie trasero a 45 grados'], errores_comunes: ['Talones en el suelo', 'Pies paralelos', 'Rodillas rigidas'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Paso Adelante y Atras', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Movimiento longitudinal sin cruzar pies.', puntos_clave: ['Pie delantero primero al avanzar', 'Pie trasero primero al retroceder', 'Nunca cruzar los pies'], errores_comunes: ['Cruzar los pies', 'Dar pasos demasiado largos', 'Perder guardia al moverse'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Paso Lateral', subcategoria: 'Footwork', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Deslizamiento lateral derecha e izquierda para crear angulos.', puntos_clave: ['El pie del lado va primero', 'Mantener distancia entre pies', 'Deslizar no saltar'], errores_comunes: ['Saltar en lugar de deslizar', 'Juntar los pies', 'Perder equilibrio'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Pivote Izquierdo', subcategoria: 'Footwork', nivel: 'Intermedio', duracion_seg: 40, descripcion: 'Rotacion sobre el pie delantero para cambiar angulo de ataque.', puntos_clave: ['Girar sobre la bola del pie delantero', 'Pie trasero sigue el movimiento', 'Mantener guardia durante el giro'], errores_comunes: ['Girar sobre el talon', 'Perder equilibrio', 'Bajar manos en el giro'], url_directa: '', activo: true, orden: 4 },
  { nombre: 'Hexagono de Movimiento', subcategoria: 'Footwork', nivel: 'Avanzado', duracion_seg: 55, descripcion: 'Ejercicio de agilidad: moverse a 6 puntos del hexagono manteniendo guardia.', puntos_clave: ['Pasos cortos y rapidos', 'Orientacion constante al frente', 'Regresar siempre al centro'], errores_comunes: ['Dar pasos demasiado largos', 'Perder orientacion', 'Sin velocidad'], url_directa: '', activo: true, orden: 5 },
  { nombre: 'Slip Izquierdo', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Esquivar un jab girando la cabeza hacia la izquierda.', puntos_clave: ['Mover la cabeza fuera de la linea', 'Ligera flexion de rodillas', 'Regresar a posicion central'], errores_comunes: ['Mover todo el cuerpo', 'No regresar al centro', 'Sin contraataque preparado'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Bob and Weave', subcategoria: 'Defensa', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Agacharse y salir por el lado para esquivar golpes al cuerpo.', puntos_clave: ['Doblar las rodillas, no la espalda', 'Movimiento en U', 'Salir del lado contrario al golpe'], errores_comunes: ['Doblar la espalda', 'Movimiento lento', 'No completar el weave'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Cover Up', subcategoria: 'Defensa', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Proteger la cabeza con guantes y codos ante una lluvia de golpes.', puntos_clave: ['Guantes a los lados de la cabeza', 'Codos juntos al frente', 'Observar a traves de los guantes'], errores_comunes: ['Dejar huecos entre guantes', 'Cerrar los ojos', 'Sin plan de salida'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Shoulder Roll', subcategoria: 'Defensa', nivel: 'Avanzado', duracion_seg: 45, descripcion: 'Rodar el hombro para absorber y desviar golpes.', puntos_clave: ['Inclinar el hombro para desviar', 'Peso en pie trasero', 'Contra inmediato disponible'], errores_comunes: ['Movimiento exagerado', 'Sin contraataque', 'Perder guardia'], url_directa: '', activo: true, orden: 4 },
  { nombre: '1-2 al Cuerpo y Cabeza', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Alternar niveles de ataque: golpe al cuerpo seguido de golpe a la cabeza.', puntos_clave: ['Cambio de nivel con las rodillas', 'No telegrafiar el nivel', 'Ritmo constante'], errores_comunes: ['Telegrafiar bajando la vista', 'Perder postura al atacar cuerpo', 'Pausar entre niveles'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Counter Jab', subcategoria: 'Combinaciones', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Responder el jab del oponente con un jab propio.', puntos_clave: ['Timing exacto', 'Slip antes del counter', 'Velocidad de mano'], errores_comunes: ['Sin el slip previo', 'Timing incorrecto', 'Perder guardia al countear'], url_directa: '', activo: true, orden: 2 },
  { nombre: '1-2-3-2 (Jab-Cross-Hook-Cross)', subcategoria: 'Combinaciones', nivel: 'Avanzado', duracion_seg: 50, descripcion: 'Cuatro golpes fluidos que terminan con el potente cross.', puntos_clave: ['Fluidez en todo el encadenamiento', 'Cross final con maxima potencia', 'Regreso limpio a guardia'], errores_comunes: ['Perder ritmo en el hook', 'Cross final sin potencia', 'Descubrirse al terminar'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Distancia Correcta al Saco', subcategoria: 'Saco', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Encontrar la distancia optima para cada golpe sin pegarse al saco.', puntos_clave: ['Brazo casi extendido al contacto', 'Nunca pegar pegado al saco', 'Ajustar distancia en movimiento'], errores_comunes: ['Pegarse demasiado al saco', 'Estar muy lejos sin potencia', 'No moverse despues de golpear'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Round Basico de 3 Minutos', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 60, descripcion: 'Estructura completa de un round en el saco con movimiento, combinaciones y descansos activos.', puntos_clave: ['Moverse constantemente', 'Alternar velocidad y potencia', 'Respirar por la nariz'], errores_comunes: ['Quedarse estatico', 'Golpear sin tecnica', 'Contener la respiracion'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Uppercuts al Saco', subcategoria: 'Saco', nivel: 'Intermedio', duracion_seg: 45, descripcion: 'Trabajo especifico de uppercuts con angulo correcto al saco.', puntos_clave: ['Angulo de entrada por debajo', 'Generacion desde piernas', 'Posicion pegada al saco'], errores_comunes: ['Sin doblar rodillas', 'Golpe plano no ascendente', 'Posicion incorrecta'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Sombra Basica', subcategoria: 'Sombra', nivel: 'Principiante', duracion_seg: 50, descripcion: 'Moverte y golpear sin oponente. Tambien llamado shadowboxing.', puntos_clave: ['Visualizar un oponente frente a ti', 'Combinar golpes y movimiento', 'Mantener guardia siempre'], errores_comunes: ['Sin movimiento de pies', 'Golpes sin extension completa', 'Sin visualizacion activa'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Sombra Defensiva', subcategoria: 'Sombra', nivel: 'Intermedio', duracion_seg: 50, descripcion: 'Practicar exclusivamente esquivas y movimientos defensivos.', puntos_clave: ['Esquivas fluidas', 'Moverse fuera de la linea de ataque', 'Contrataque inmediato'], errores_comunes: ['Quedarse en el mismo lugar', 'Esquivas exageradas', 'Sin contraataque'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Sombra con Pesas Ligeras', subcategoria: 'Sombra', nivel: 'Avanzado', duracion_seg: 55, descripcion: 'Shadowboxing con mancuernas de 0.5-1kg para trabajar resistencia de hombros.', puntos_clave: ['Pesos muy ligeros (max 1kg)', 'Tecnica perfecta ante todo', 'Velocidad reducida'], errores_comunes: ['Pesos demasiado pesados', 'Sacrificar tecnica', 'Golpear rapido sin control'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Saltar Cuerda Basico', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 55, descripcion: 'Fundamento del acondicionamiento del boxeador. Ritmo y postura.', puntos_clave: ['Saltar solo 2-3cm del suelo', 'Munecas impulsan la cuerda', 'Core activado'], errores_comunes: ['Saltar demasiado alto', 'Usar brazos en lugar de munecas', 'Mirar la cuerda'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Flexiones para Boxeo', subcategoria: 'Fisico', nivel: 'Principiante', duracion_seg: 45, descripcion: 'Fuerza de empuje especifica para el boxeo.', puntos_clave: ['Punos en el suelo (nudillos)', 'Bajar hasta pecho casi toque el suelo', 'Core contraido'], errores_comunes: ['Cadera hacia arriba', 'Sin rango completo', 'Codos muy abiertos'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Burpees de Boxeador', subcategoria: 'Fisico', nivel: 'Intermedio', duracion_seg: 50, descripcion: 'Burpee tradicional + guardia + 1-2 al levantarse.', puntos_clave: ['Explosividad al levantarse', 'Guardia inmediata', 'Ritmo sostenido'], errores_comunes: ['Sin guardia al levantarse', 'Ritmo inconsistente', 'Perder tecnica en los golpes'], url_directa: '', activo: true, orden: 3 },
  { nombre: 'Movilidad de Munecas', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 35, descripcion: 'Rotaciones y flexiones para preparar las munecas antes de boxear.', puntos_clave: ['Rotaciones completas', 'Flexion y extension', '30 segundos por direccion'], errores_comunes: ['Hacerlo demasiado rapido', 'Sin ir al rango completo', 'Saltarlo'], url_directa: '', activo: true, orden: 1 },
  { nombre: 'Activacion de Caderas para Footwork', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 40, descripcion: 'Movilidad de cadera especifica para el movimiento del boxeo.', puntos_clave: ['Circulos amplios', 'Rango completo de cadera', 'Movimiento suave y controlado'], errores_comunes: ['Rango limitado', 'Velocidad excesiva', 'Sin calentar despues'], url_directa: '', activo: true, orden: 2 },
  { nombre: 'Estiramiento Post-Entrenamiento', subcategoria: 'Calentamiento', nivel: 'Principiante', duracion_seg: 55, descripcion: 'Enfriamiento completo de 5 minutos despues de la sesion.', puntos_clave: ['Hombros, espalda, isquiotibiales', 'Mantener 30 seg cada posicion', 'Respiracion profunda'], errores_comunes: ['Hacerlo con prisa', 'Estirar en frio', 'Olvidar el cuello'], url_directa: '', activo: true, orden: 3 },
];

const NIVEL_COLORS: Record<string, { bg: string; text: string }> = {
  Principiante: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  Intermedio:   { bg: 'bg-amber-500/20',   text: 'text-amber-400' },
  Avanzado:     { bg: 'bg-red-500/20',     text: 'text-red-400' },
};

export function BoxeoModule({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const user = useStore(state => state.user);
  const navigate = useNavigate();

  const [videos, setVideos] = useState<BoxeoVideo[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<BoxeoVideo | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [undoVideo, setUndoVideo] = useState<BoxeoVideo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const defaultForm = { nombre: '', subcategoria: 'Tecnica-Basica', nivel: 'Principiante', duracion_seg: 45, descripcion: '', puntos_clave: '', errores_comunes: '', url_directa: '', drive_file_id: '' };
  const [addForm, setAddForm] = useState(defaultForm);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const load = async () => {
      try {
        const { data, error } = await supabase.from('boxeo_videos').select('*').order('orden');
        if (error) {
          if (retryCount < maxRetries) { retryCount++; setTimeout(load, 2000 * retryCount); return; }
          setSeedError('No se pudieron cargar los videos.');
        } else if (data) {
          setVideos(data as BoxeoVideo[]);
          setSeedError(null);
        }
      } catch {
        if (retryCount < maxRetries) { retryCount++; setTimeout(load, 2000 * retryCount); return; }
        setSeedError('Sin conexion.');
      }
      setLoading(false);
    };
    load();
    const channel = supabase.channel('boxeo-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boxeo_videos' }, async () => {
        const { data } = await supabase.from('boxeo_videos').select('*').order('orden');
        if (data) setVideos(data as BoxeoVideo[]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('boxeo_ocultos').select('video_id').eq('user_id', user.id).then(({ data }) => {
      if (data) setHiddenIds(new Set(data.map((r: any) => r.video_id)));
    });
    supabase.from('video_progress').select('video_id').eq('user_id', user.id).then(({ data }) => {
      if (data) setWatchedIds(new Set(data.map((r: any) => r.video_id)));
    });
  }, [user?.id]);

  const handleMarkWatched = async (videoId: string) => {
    if (!user || watchedIds.has(videoId)) return;
    setWatchedIds(prev => new Set([...prev, videoId]));
    await supabase.from('video_progress').upsert({ user_id: user.id, video_id: videoId }, { onConflict: 'user_id,video_id' });
  };

  const [seedMsg, setSeedMsg] = useState('');
  const handleSeed = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      if (videos.length === 0) {
        for (const v of SEED_VIDEOS) {
          await supabase.from('boxeo_videos').insert({ ...v, activo: true });
        }
      }
      const { seedBoxeoVideos } = await import('../scripts/seedVideos');
      await seedBoxeoVideos();
    } catch (e: any) { console.error('[BoxeoModule] seed error:', e.message); } finally { setSeeding(false); }
  };

  const seedRunRef = useRef(false);
  useEffect(() => {
    if (!loading && !seedRunRef.current) { seedRunRef.current = true; handleSeed(); }
  }, [loading, isAdmin]);

  const handleHide = async (video: BoxeoVideo) => {
    if (!user) return;
    setHiddenIds(prev => new Set([...prev, video.id]));
    setUndoVideo(video); setSelectedVideo(null);
    try { await supabase.from('boxeo_ocultos').upsert({ user_id: user.id, video_id: video.id }); } catch {}
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndoVideo(null), 5000);
  };

  const handleUndo = async () => {
    if (!user || !undoVideo) return;
    setHiddenIds(prev => { const n = new Set(prev); n.delete(undoVideo.id); return n; });
    try { await supabase.from('boxeo_ocultos').delete().eq('user_id', user.id).eq('video_id', undoVideo.id); } catch {}
    setUndoVideo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nombre || !addForm.subcategoria) return;
    try {
      const data = {
        ...addForm,
        puntos_clave: typeof addForm.puntos_clave === 'string' ? addForm.puntos_clave.split('\n').map(s => s.trim()).filter(Boolean) : addForm.puntos_clave,
        errores_comunes: typeof addForm.errores_comunes === 'string' ? addForm.errores_comunes.split('\n').map(s => s.trim()).filter(Boolean) : addForm.errores_comunes,
        updated_at: new Date().toISOString(),
      };
      if (editingVideoId) {
        await supabase.from('boxeo_videos').update(data).eq('id', editingVideoId);
      } else {
        await supabase.from('boxeo_videos').insert({ ...data, activo: true, orden: 999, created_at: new Date().toISOString() });
      }
      setShowAddModal(false); setEditingVideoId(null); setAddForm(defaultForm);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const openEditModal = (v: BoxeoVideo) => {
    setEditingVideoId(v.id);
    setAddForm({
      nombre: v.nombre || '', subcategoria: v.subcategoria || 'Tecnica-Basica', nivel: v.nivel || 'Principiante',
      duracion_seg: v.duracion_seg || 45, descripcion: v.descripcion || '',
      puntos_clave: (v.puntos_clave || []).join('\n'), errores_comunes: (v.errores_comunes || []).join('\n'),
      url_directa: v.url_directa || '', drive_file_id: v.drive_file_id || ''
    });
    setShowAddModal(true);
  };

  const handleToggleActive = async (v: BoxeoVideo) => {
    await supabase.from('boxeo_videos').update({ activo: !v.activo }).eq('id', v.id);
  };

  const handleDelete = async (v: BoxeoVideo) => {
    if (!confirm('Eliminar este video permanentemente?')) return;
    await supabase.from('boxeo_videos').delete().eq('id', v.id);
  };

  const visibleVideos = videos.filter(v => {
    if (!v.activo && !isAdmin) return false;
    if (!isAdmin && hiddenIds.has(v.id)) return false;
    return true;
  });

  const subVideos = selectedSub
    ? visibleVideos.filter(v => v.subcategoria === selectedSub && (levelFilter === 'Todos' || v.nivel === levelFilter) && (!searchTerm || v.nombre.toLowerCase().includes(searchTerm.toLowerCase())))
    : [];

  const getNumericLevel = (nivel: string) => {
    switch (nivel) { case 'Principiante': return 1; case 'Intermedio': return 5; case 'Avanzado': return 9; default: return 1; }
  };

  const subCounts = useMemo(() => {
    return SUBCATEGORIAS.reduce<Record<string, number>>((acc, s) => {
      acc[s.id] = visibleVideos.filter(v => v.subcategoria === s.id).length;
      return acc;
    }, {});
  }, [visibleVideos]);

  const subWatched = useMemo(() => {
    return SUBCATEGORIAS.reduce<Record<string, number>>((acc, s) => {
      acc[s.id] = visibleVideos.filter(v => v.subcategoria === s.id && watchedIds.has(v.id)).length;
      return acc;
    }, {});
  }, [visibleVideos, watchedIds]);

  const totalWatched = watchedIds.size;
  const totalVisible = visibleVideos.length;
  const overallProgress = totalVisible > 0 ? Math.round((totalWatched / totalVisible) * 100) : 0;

  const currentIndex = selectedVideo ? subVideos.findIndex(v => v.id === selectedVideo.id) : -1;
  const nextVideo = currentIndex >= 0 && currentIndex < subVideos.length - 1 ? subVideos[currentIndex + 1] : undefined;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 280;
    carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  if (seedError && videos.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
        <p className="text-slate-300 text-sm font-bold">{seedError}</p>
        <button onClick={() => { setLoading(true); setSeedError(null); seedRunRef.current = false; }} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
          Reintentar
        </button>
      </div>
    </div>
  );

  if (!loading && videos.length === 0) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <Loader2 className="w-12 h-12 text-primary mx-auto animate-pulse" />
        <p className="text-slate-300 text-sm font-bold">Biblioteca en preparacion</p>
        <p className="text-slate-500 text-xs">Los videos de boxeo se estan cargando.</p>
        <button onClick={() => { setLoading(true); seedRunRef.current = false; }} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">
          Reintentar
        </button>
      </div>
    </div>
  );

  if (selectedVideo) {
    const driveUrl = selectedVideo.url_directa || (selectedVideo.drive_file_id ? `https://drive.google.com/uc?id=${selectedVideo.drive_file_id}` : '');
    const nivelColor = selectedVideo.nivel === 'Principiante' ? 'text-emerald-400' : selectedVideo.nivel === 'Intermedio' ? 'text-amber-400' : 'text-red-400';
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
        onNext={nextVideo ? () => { handleMarkWatched(selectedVideo.id); setSelectedVideo(nextVideo); } : undefined}
        extraActions={
          !isAdmin ? (
            <>
              <button onClick={() => { handleMarkWatched(selectedVideo.id); const alts = subVideos.filter(v => v.id !== selectedVideo.id); if (alts.length) setSelectedVideo(alts[0]); }}
                className="bg-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase border border-slate-700"
              >Cambiar</button>
              <button onClick={() => handleHide(selectedVideo)}
                className="bg-red-500/10 text-red-400 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase border border-red-500/20"
              ><EyeOff className="w-4 h-4" /></button>
            </>
          ) : undefined
        }
      />
    );
  }

  if (selectedSub) {
    const subConfig = SUBCATEGORIAS.find(s => s.id === selectedSub)!;
    const progress = subCounts[selectedSub] > 0 ? Math.round((subWatched[selectedSub] / subCounts[selectedSub]) * 100) : 0;
    return (
      <div className={`${!isEmbedded ? 'min-h-screen bg-slate-950 pb-24' : 'pb-8'} text-white font-display`}>
        <AnimatePresence>
          {showAddModal && (
            <motion.div className="fixed inset-0 z-50 bg-black/70 flex items-end p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-slate-900 rounded-3xl p-6 w-full max-h-[90vh] overflow-y-auto border border-slate-800" initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}>
                <div className="flex justify-between mb-6">
                  <h3 className="text-xl font-black text-white uppercase">{editingVideoId ? 'Editar Video' : 'Nuevo Video'}</h3>
                  <button aria-label="Cerrar" type="button" onClick={() => { setShowAddModal(false); setEditingVideoId(null); setAddForm(defaultForm); }}><X className="w-5 h-5 text-slate-400" /></button>
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
                    <input type="number" placeholder="Duracion (seg)" value={addForm.duracion_seg} onChange={e => setAddForm(f => ({...f, duracion_seg: parseInt(e.target.value)}))} max={300} min={1} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <textarea placeholder="Descripcion" value={addForm.descripcion} onChange={e => setAddForm(f => ({...f, descripcion: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <textarea placeholder="Puntos clave (uno por linea)" value={addForm.puntos_clave} onChange={e => setAddForm(f => ({...f, puntos_clave: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <textarea placeholder="Errores comunes (uno por linea)" value={addForm.errores_comunes} onChange={e => setAddForm(f => ({...f, errores_comunes: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm resize-none h-20" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL del video (Google Drive)</label>
                    <input type="url" placeholder="https://drive.google.com/file/d/..." value={addForm.url_directa} onChange={e => setAddForm(f => ({...f, url_directa: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest">{editingVideoId ? 'Actualizar Video' : 'Guardar Video'}</button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4 flex items-center gap-4">
          <button aria-label="Volver" type="button" onClick={() => { setSelectedSub(null); setSearchTerm(''); setLevelFilter('Todos'); }}
            className="text-primary px-4 py-2 hover:bg-primary/10 flex items-center gap-2 rounded-xl border border-primary/20 transition-colors font-black uppercase text-xs">
            <ArrowLeft className="w-5 h-5" /> Volver
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black uppercase tracking-tight text-white">{subConfig.icon} {subConfig.label}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-slate-400">{subWatched[selectedSub] || 0}/{subCounts[selectedSub] || 0} vistos</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-black text-primary">{progress}%</span>
            </div>
          </div>
          {isAdmin && (
            <button aria-label="Agregar" type="button" onClick={() => { setEditingVideoId(null); setAddForm(defaultForm); setShowAddModal(true); }} className="bg-primary p-2.5 rounded-xl text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Buscar video..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50 transition-all" />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
          {['Todos','Principiante','Intermedio','Avanzado'].map(l => (
            <button type="button" key={l} onClick={() => setLevelFilter(l)}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                levelFilter === l ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:border-slate-600'
              }`}>
              {l}
            </button>
          ))}
        </div>

        <motion.div className="px-4 space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {subVideos.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">{subConfig.icon}</div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
                {isAdmin ? 'Agrega el primer video con el boton +' : searchTerm ? 'Sin resultados' : 'Proximamente'}
              </p>
            </div>
          ) : subVideos.map((v, i) => {
            const isLocked = getNumericLevel(v.nivel) > (user?.license_level || 1) && !isAdmin;
            const isWatched = watchedIds.has(v.id);
            return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`bg-slate-900/80 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all hover:border-slate-700 ${
                v.activo ? 'border-slate-800/50' : 'border-slate-800/50 opacity-50'
              } ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <button type="button"
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => {
                  if (isLocked) { alert('Este video requiere un nivel de licencia superior.'); return; }
                  setSelectedVideo(v);
                }}
              >
                <div className="w-24 h-16 shrink-0 bg-slate-800/80 rounded-xl flex items-center justify-center overflow-hidden relative">
                  {isLocked ? (
                    <Lock className="w-7 h-7 text-slate-600" />
                  ) : v.miniatura_url ? (
                    <img src={v.miniatura_url} alt={v.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{subConfig.icon}</span>
                  )}
                  {!isLocked && v.url_directa && <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Play className="w-6 h-6 text-white" /></div>}
                  {isWatched && <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white text-sm truncate">{isLocked ? 'Contenido Bloqueado' : v.nombre}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${NIVEL_COLORS[v.nivel]?.bg || 'bg-slate-700'} ${NIVEL_COLORS[v.nivel]?.text || 'text-slate-400'}`}>{v.nivel}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{v.duracion_seg}s</span>
                    {!isLocked && !v.url_directa && <span className="text-[9px] text-amber-400 font-bold">Sin video</span>}
                  </div>
                  {v.puntos_clave?.length > 0 && !isLocked && (
                    <p className="text-[10px] text-slate-500 mt-1.5 truncate">{'\u2713'} {v.puntos_clave[0]}</p>
                  )}
                </div>
                {isLocked ? <Lock className="w-5 h-5 text-slate-700 shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />}
              </button>
              {isAdmin && (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  <button aria-label="Toggle" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleActive(v); }} className={`flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase transition-all flex items-center justify-center gap-1 ${v.activo ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {v.activo ? <><Check className="w-3 h-3"/> <span>Activo</span></> : <span>Inactivo</span>}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(v); }} className="flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button aria-label="Eliminar" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(v); }} className="flex-1 text-[10px] font-black px-3 py-2 rounded-xl uppercase bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-1">
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
        </motion.div>

        <AnimatePresence>
          {undoVideo && (
            <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              className="fixed bottom-24 left-4 right-4 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl z-40">
              <p className="text-sm text-white font-bold">Video oculto</p>
              <button type="button" onClick={handleUndo} className="bg-primary text-white text-sm font-black px-4 py-2 rounded-xl">Deshacer</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`${!isEmbedded ? 'min-h-screen bg-slate-950 pb-24' : 'pb-8'} text-white font-display`}>
      {!isEmbedded && (
        <header className="px-4 pt-6 pb-4 flex items-center gap-4">
          <button aria-label="Volver" type="button" onClick={() => navigate(-1)} className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight italic">{'\u{1F94A}'} Modulo Boxeo</h1>
            <p className="text-slate-400 text-sm">{visibleVideos.length} videos {'\u00B7'} 8 categorias</p>
          </div>
        </header>
      )}

      {/* Hero with animated boxer */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mx-4 mb-6 rounded-3xl overflow-hidden border border-white/5">
        <div className="relative">
          <BoxerAnimatedHero height="280px" />
          <div className="absolute inset-0 z-10 p-6 flex flex-col justify-between pointer-events-none">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-[10px] font-black rounded-lg uppercase tracking-widest border border-white/10">
                Modulo de Aprendizaje
              </span>
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/10">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-black text-white">Nivel {user?.license_level || 1}</span>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black italic text-white leading-tight mb-2">Domina el Arte<br/>de la Noble Ciencia</h2>
              <p className="text-white/50 text-sm">Desde tecnica basica hasta sparring profesional</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Progreso Total</span>
                    <span className="text-[11px] font-black text-primary">{totalWatched}/{totalVisible}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-primary to-red-500 rounded-full"
                      initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
                <span className="text-2xl font-black text-white">{overallProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Viewer 3D interactivo */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
        className="mx-4 mb-6">
        <div className="rounded-3xl overflow-hidden border border-white/5 relative">
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-[10px] font-black rounded-lg uppercase tracking-widest border border-white/10">
              Tu Boxeador 3D
            </span>
          </div>
          <BoxerViewer3D glbUrl="/modelo3D.glb" height="360px" />
          <p className="absolute bottom-3 right-4 z-10 text-[10px] font-bold text-white/40 pointer-events-none">
            Arrastra para rotar
          </p>
        </div>
      </motion.div>

      {/* Carousel */}
      <div className="relative mb-6">
        <button aria-label="Izquierda" type="button" onClick={() => scrollCarousel('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-full flex items-center justify-center text-white hover:bg-slate-800 transition-colors shadow-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button aria-label="Derecha" type="button" onClick={() => scrollCarousel('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-full flex items-center justify-center text-white hover:bg-slate-800 transition-colors shadow-lg">
          <ChevronRight className="w-5 h-5" />
        </button>

        <div ref={carouselRef} className="flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory hide-scrollbar scroll-smooth">
          {SUBCATEGORIAS.map((sub, i) => {
            const userLevel = user?.license_level || 1;
            const isSubLocked = !isAdmin && sub.min_level > userLevel;
            const watched = subWatched[sub.id] || 0;
            const total = subCounts[sub.id] || 0;
            const catProgress = total > 0 ? Math.round((watched / total) * 100) : 0;
            return (
              <motion.button key={sub.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={isSubLocked ? {} : { scale: 1.03, y: -4 }} whileTap={isSubLocked ? {} : { scale: 0.97 }}
                onClick={() => {
                  if (isSubLocked) { alert(`Desbloquea ${sub.label} llegando al nivel ${sub.min_level} en Combos.`); return; }
                  setSelectedSub(sub.id);
                }}
                className={`relative snap-center shrink-0 w-[260px] rounded-2xl p-5 text-left backdrop-blur-sm border transition-all duration-300 ${
                  isSubLocked
                    ? 'bg-slate-900/60 border-slate-800/50 opacity-60 cursor-not-allowed'
                    : `bg-gradient-to-br ${sub.color} border-white/10 shadow-lg ${sub.glow} hover:shadow-xl cursor-pointer`
                }`}
              >
                {isSubLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[2px] rounded-2xl z-10 gap-1.5">
                    <Lock className="w-7 h-7 text-white/60" />
                    <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Nivel {sub.min_level}</span>
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <motion.span className="text-4xl block" animate={isSubLocked ? {} : { rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                    {isSubLocked ? '\u{1F512}' : sub.icon}
                  </motion.span>
                  {!isSubLocked && total > 0 && (
                    <span className="text-[10px] font-black text-white/80 bg-white/10 backdrop-blur-sm px-2 py-1 rounded-lg">
                      {watched}/{total}
                    </span>
                  )}
                </div>
                <h3 className="font-black text-white text-sm uppercase tracking-tight leading-tight">{sub.label}</h3>
                <p className="text-white/50 text-[10px] mt-1 leading-relaxed">{isSubLocked ? `Requiere nivel ${sub.min_level}` : sub.desc}</p>
                {!isSubLocked && total > 0 && (
                  <div className="mt-4">
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white/70 rounded-full transition-all duration-500" style={{ width: `${catProgress}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-white/50 mt-1 block">{catProgress}% completado</span>
                  </div>
                )}
                {isSubLocked ? (
                  <div className="mt-4 flex items-center gap-1 text-white/40">
                    <Lock className="w-3 h-3" /> <span className="text-[9px] font-black uppercase">Bloqueado</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-1 text-white/70">
                    <BookOpen className="w-3 h-3" /> <span className="text-[9px] font-black uppercase">{total} videos</span>
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {undoVideo && (
          <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            className="fixed bottom-24 left-4 right-4 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl z-40">
            <p className="text-sm text-white font-bold">Video oculto</p>
            <button type="button" onClick={handleUndo} className="bg-primary text-white text-sm font-black px-4 py-2 rounded-xl">Deshacer</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
