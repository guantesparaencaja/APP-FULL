import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Heart,
  Flame,
  Trophy,
  Dumbbell,
  Calendar,
  Utensils,
  Quote,
  Smile,
  Target,
  Activity,
  Star,
  AlertCircle,
  Droplets,
  RefreshCw,
  ChevronRight,
  Video,
  Upload,
  Trash2,
  Lock,
  CheckCircle2,
  Info,
  Clock,
  Plus,
  X,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { AssessmentModal } from '../components/AssessmentModal';
import {
  doc,
  updateDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LazyVideoWrapper } from '../components/LazyVideoWrapper';
import { generateLocalWorkout } from '../services/geminiService';
import { EvolvingAvatar } from '../components/EvolvingAvatar';
import { uploadVideoToDrive } from '../lib/driveService';
import { MonthChallenge } from '../components/MonthChallenge';

const QUOTES = [
  { text: '¿Cansado? Mi abuela entrena más duro y tiene 90 años. ¡Sigue!', emoji: '👵' },
  { text: 'El sudor es solo la grasa llorando. ¡Hazla sufrir!', emoji: '💧' },
  { text: 'Si fuera fácil, todos serían campeones. ¡MUEVE EL CULO!', emoji: '🥊' },
  { text: 'No viniste a modelar, viniste a encajar. ¡Mueve esas manos!', emoji: '👊' },
  { text: '¿Un descanso? Claro, cuando estés muerto. Por ahora, ¡JAB-CROSS!', emoji: '💀' },
  { text: 'Tu sombra te está ganando el round. ¡Espabila!', emoji: '👻' },
  { text: '¿Duele? Perfecto. El dolor te recuerda que sigues vivo. ¡Sigue!', emoji: '🔥' },
  { text: 'Si quieres descansar, ve al spa. Aquí se viene a sudar sangre.', emoji: '🩸' },
  { text: 'La técnica sin agresividad es solo baile. ¡Pega con alma!', emoji: '👹' },
  {
    text: 'No llores por el entrenamiento, llora por las pastas que te comiste anoche.',
    emoji: '🍝',
  },
];

const normalJokes = [
  '¿Qué le dice un semáforo a otro? ¡No me mires que me estoy cambiando!',
  '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.',
  '¿Qué le dice una iguana a su hermana gemela? Somos iguanitas.',
  '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!',
  '¿Cómo se dice pañuelo en japonés? Saka-moko.',
  '¿Qué le dice un jaguar a otro jaguar? Jaguar you?',
  '¿Por qué los osos panda no quieren casarse? Porque tienen ojeras.',
  '¿Qué le dice un techo a otro? Te-echo de menos.',
  '¿Cómo se llama el campeón de buceo japonés? Tokofondo.',
  '¿Y el subcampeón? Kasitoko.',
  '¿Qué le dice una pulga a otra? ¿Vamos a pie o esperamos al perro?',
  '¿Por qué los esqueletos no pelean entre ellos? Porque no tienen agallas.',
  '¿Qué hace un perro con un taladro? Ta-drando.',
  '¿Cuál es el colmo de un zapatero? Que su mujer sea una zapatilla.',
  '¿Qué le dice un pez a otro? Nada.',
  '¿Por qué las focas miran siempre hacia arriba? ¡Porque ahí están los focos!',
  '¿Qué le dice una impresora a otra? ¿Esa hoja es tuya o es una impresión mía?',
  "¿Cómo se dice 'estoy perdido' en chino? Chon-ta-ma-la.",
  '¿Qué le dice una piedra a otra? La vida es dura.',
  '¿Por qué los fantasmas son malos mentirosos? Porque se les ve el plumero.',
  '¿Qué le dice un fideo a otro? ¡Oye, mi cuerpo pide salsa!',
  '¿Por qué los tomates no toman café? Porque toman té-mate.',
  '¿Qué hace un mudo bailando? ¡Muda-nza!',
  "¿Cómo se dice 'perro' en chino? Chu-chu-ma-lo.",
  '¿Qué le dice una taza a otra? ¿Qué taza-ciendo?',
  '¿Por qué los elefantes no usan computadora? Porque le tienen miedo al mouse.',
  '¿Qué hace un cocinero cuando está triste? ¡Llora-cebolla!',
  "¿Cómo se dice 'espejo' en chino? ¡Ay-soy-yo!",
  '¿Qué le dice un cable a otro? ¡Somos intocables!',
  '¿Por qué los libros de historia son tan pesados? Porque tienen mucho pasado.',
];

const darkJokes: string[] = [
  '¿Por qué los esqueletos no pelean entre ellos? Porque no tienen agallas.',
  'Mi abuelo tiene el corazón de un león y una prohibición de por vida en el zoológico.',
  '¿Por qué en África no juegan al póker? Porque hay demasiados leopardos.',
  '¿Qué le dice un huérfano a otro huérfano? ¡Qué pasa, bro! (Mentira, no tienen hermanos)',
  '¿Cómo sabes que un vampiro ha estado en la panadería? Porque falta el pan de muerto.',
  'La paciencia es una virtud... que se pierde rápido en el tráfico.',
  'Mi perro solía perseguir a las personas en bicicleta... hasta que le quité la bicicleta.',
  'Tengo un chiste sobre el desempleo, pero no funciona.',
  'Escribí un libro sobre poltergeists. Literalmente, desapareció de las estanterías.',
  "El psiquiatra me dijo que estaba loco. Le pedí una segunda opinión. Él dijo: 'También eres feo'.",
  'Las donaciones de órganos son geniales, hasta que empiezan a preguntar de dónde los sacaste.',
  'Llevo a mi suegra en el corazón... justo donde el médico le diagnosticó el infarto.',
  'El chiste sobre la electricidad fue un cortocircuito.',
  'Mi psicólogo me recomendó que le escribiera cartas a las personas que odio y luego las quemara. Ya lo hice, ¿pero qué hago con las cartas?',
  'El médico me dio un año de vida. Así que le disparé y el juez me dio 15 años.',
  '¿Cuál es el colmo de un electricista? Que su mujer se llame Luz y los hijos le salgan corrientes.',
  "Quería ser donante de sangre, pero siempre hacen demasiadas preguntas. '¿De quién es esta sangre?' '¿Por qué está en un balde?'",
  '¿Por qué el libro de matemáticas se suicidó? Porque tenía demasiados problemas.',
  'Ojalá la muerte fuera de madera... para tocarla y que de buena suerte.',
  'Si quieres que algo esté bien hecho... probablemente no deberías pedirme que lo haga.',
];

export function Home() {
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const [dailyQuote, setDailyQuote] = useState({ text: '', emoji: '' });
  const [dailyJokes, setDailyJokes] = useState<{ normal: string; dark: string[] }>({
    normal: '',
    dark: [],
  });
  const [showAssessment, setShowAssessment] = useState(false);
  const [dailyWorkout, setDailyWorkout] = useState<any>(null);
  const [currentChallenge, setCurrentChallenge] = useState<{
    id: string;
    url?: string;
    text?: string;
    title?: string;
    categoria?: string;
    dificultad?: string;
    objetivo?: string;
    tasks?: string[];
    period?: 'dia' | 'semana' | 'mes';
    createdAt?: any;
  } | null>(null);
  const [isChallengeCompleted, setIsChallengeCompleted] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [appSettings, setAppSettings] = useState({
    workouts_unlocked: false,
    nutrition_unlocked: false,
    technique_unlocked: false,
    challenge_unlocked: false,
  });
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    text: '',
    categoria: 'Boxeo',
    dificultad: 'intermedio',
    objetivo: 'general',
    tasks: [] as string[],
    period: 'dia' as 'dia' | 'semana' | 'mes',
  });
  // Helper: manage task items in the form
  const [newTaskInput, setNewTaskInput] = useState('');
  const [allUsersCount, setAllUsersCount] = useState(0);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const setUser = useStore((state) => state.setUser);

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Actualizar presencia
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', String(user.id)), {
          last_seen: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Error presence update:', err);
      }
    };
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 120000); // Cada 2 min

    // Fetch global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setAppSettings(doc.data() as any);
      }
    });

    // Check if assessment is needed (every 3 months)
    const checkAssessment = () => {
      // Admin nunca necesita completar el assessment
      if (user.role === 'admin') return;
      if (!user.assessment_completed) {
        setShowAssessment(true);
        return;
      }

      if (user.assessment_updated_at) {
        const lastUpdate = new Date(user.assessment_updated_at);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (lastUpdate < threeMonthsAgo) {
          setShowAssessment(true);
        }
      }
    };

    checkAssessment();

    // Admin counts & social listeners
    let unsubUsers: (() => void) | undefined;
    if (user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com') {
      const qUsers = query(collection(db, 'users'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const activeCount = snapshot.docs.filter((d) => d.data().isActive !== false).length;
        setAllUsersCount(activeCount);
      });
    }

    const qTop = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(5));
    const unsubscribeTop = onSnapshot(qTop, (snap) => {
      setTopUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const qAct = query(collection(db, 'activity_feed'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeAct = onSnapshot(qAct, (snap) => {
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      clearInterval(presenceInterval);
      unsubscribeSettings();
      unsubscribeTop();
      unsubscribeAct();
      if (unsubUsers) unsubUsers();
    };
  }, [user, navigate]);

  const refreshJokesAndQuotes = () => {
    const randomDayIndex = Math.floor(Math.random() * 10000);
    setDailyQuote(QUOTES[randomDayIndex % QUOTES.length]);

    const normalJoke = normalJokes[randomDayIndex % normalJokes.length];
    const darkJoke1 = darkJokes[randomDayIndex % darkJokes.length];
    const darkJoke2 = darkJokes[(randomDayIndex + 1) % darkJokes.length];
    const darkJoke3 = darkJokes[(randomDayIndex + 2) % darkJokes.length];

    setDailyJokes({
      normal: normalJoke,
      dark: [darkJoke1, darkJoke2, darkJoke3],
    });
  };

  useEffect(() => {
    // Calculate index based on days since epoch, changing at 9 PM (21:00)
    const now = new Date();
    // Shift time back by 21 hours so that "midnight" for the calculation is 9 PM
    const shiftedTime = new Date(now.getTime() - 21 * 60 * 60 * 1000);
    const dayIndex = Math.floor(shiftedTime.getTime() / (1000 * 60 * 60 * 24));

    setDailyQuote(QUOTES[dayIndex % QUOTES.length]);

    // Select 1 normal joke and 3 dark jokes based on dayIndex
    const normalJoke = normalJokes[dayIndex % normalJokes.length];
    const darkJoke1 = darkJokes[dayIndex % darkJokes.length];
    const darkJoke2 = darkJokes[(dayIndex + 1) % darkJokes.length];
    const darkJoke3 = darkJokes[(dayIndex + 2) % darkJokes.length];

    setDailyJokes({
      normal: normalJoke,
      dark: [darkJoke1, darkJoke2, darkJoke3],
    });

    // Generate daily workout - only if relevant user data changed
    if (user) {
      const workout = generateLocalWorkout(
        user.age || 25,
        user.goal || 'Mantener peso',
        user.experience_level || 'principiante',
        [],
        ['Cuerpo Completo'],
        45
      );

      // Only set if different from current daily workout to avoid re-render loops
      setDailyWorkout((prev: any) => {
        if (JSON.stringify(prev) === JSON.stringify(workout)) return prev;
        return workout;
      });
    }
  }, [user?.age, user?.goal, user?.experience_level]);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch the latest challenge for the user's goal
    const qChallenge = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));

    const unsubscribeChallenges = onSnapshot(qChallenge, async (snapshot) => {
      const allChallenges = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);

      // Filter logic: match user.fitnessGoal or 'general'
      const userGoal = user.fitnessGoal || 'general';
      const filtered = allChallenges.filter(
        (c) => c.objetivo === userGoal || c.objetivo === 'general' || !c.objetivo
      );

      if (filtered.length > 0) {
        const challenge = filtered[0];
        setCurrentChallenge(challenge);
        setCheckedTasks(new Set()); // reset task checks when challenge changes

        // Check if completed today using the subcollection
        const todayStr = new Date().toISOString().split('T')[0];
        const recordRef = doc(db, 'challenge_completions', user.id, 'records', todayStr);
        onSnapshot(recordRef, (snap) => {
          setIsChallengeCompleted(snap.exists());
          // restore checked tasks from firestore
          const data = snap.data();
          if (data?.checkedTasks) {
            setCheckedTasks(new Set(data.checkedTasks as number[]));
          }
        });
      } else {
        setCurrentChallenge(null);
      }
    });

    return () => unsubscribeChallenges();
  }, [user?.fitnessGoal, user?.id]);

  if (!user) return null;

  const handleWaterClick = async (index: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const currentCount = user.water_intake?.date === today ? user.water_intake.count : 0;

    // If clicking the same glass that is the current max, decrease by 1 (unfill)
    // Otherwise, fill up to the clicked glass
    const newCount = index + 1 === currentCount ? index : index + 1;

    try {
      const userRef = doc(db, 'users', String(user.id));
      const waterData = { date: today, count: newCount };
      await updateDoc(userRef, { water_intake: waterData });
      setUser({ ...user, water_intake: waterData });
    } catch (error) {
      console.error('Error updating water intake:', error);
    }
  };

  const waterCount =
    user?.water_intake?.date === new Date().toISOString().split('T')[0]
      ? user.water_intake.count
      : 0;

  const isSpecialUser =
    user?.email === 'hernandezkevin001998@gmail.com' ||
    user?.role === 'admin' ||
    user?.plan === 'premium';
  const hasFullAccess =
    isSpecialUser ||
    (user?.classes_per_month && user.classes_per_month >= 4) ||
    (user?.plan_id && user.plan_id.includes('decisao'));

  const isNutritionUnlocked = isSpecialUser || appSettings.nutrition_unlocked || hasFullAccess;
  const isTechniqueUnlocked = isSpecialUser || appSettings.technique_unlocked || hasFullAccess;
  const isChallengeUnlocked = isSpecialUser || appSettings.challenge_unlocked || hasFullAccess;
  const isWorkoutsUnlocked = isSpecialUser || appSettings.workouts_unlocked || hasFullAccess;

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      showAlert('Error', 'El video es demasiado grande. Máximo 200MB.', 'error');
      e.target.value = '';
      return;
    }

    setUploadProgress(0);

    try {
      const downloadURL = await uploadVideoToDrive(
        file,
        String(user?.id || 'admin'),
        (progress) => setUploadProgress(progress),
        { title: 'Reto del Día', type: 'challenge' }
      );

      await addDoc(collection(db, 'challenges'), {
        url: downloadURL,
        title: 'Nuevo Reto de Video',
        objetivo: 'general',
        categoria: 'Boxeo',
        dificultad: 'intermedio',
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      });

      showAlert('Éxito', 'Video subido correctamente.', 'success');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      showAlert(
        'Error',
        'Error al subir el video: ' + (error.message || 'Error desconocido'),
        'error'
      );
    } finally {
      setUploadProgress(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.title) {
      showAlert('Error', 'El título es obligatorio.', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'challenges'), {
        ...challengeForm,
        createdAt: new Date().toISOString(),
        createdBy: user.id,
      });
      setShowChallengeModal(false);
      setChallengeForm({
        title: '',
        text: '',
        categoria: 'Boxeo',
        dificultad: 'intermedio',
        objetivo: 'general',
        tasks: [],
        period: 'dia',
      });
      setNewTaskInput('');
      showAlert('Éxito', 'Reto publicado correctamente.', 'success');
    } catch (error) {
      console.error('Error saving challenge:', error);
      showAlert('Error', 'No se pudo guardar el reto.', 'error');
    }
  };

  const handleDeleteChallenge = async () => {
    if (!currentChallenge) return;
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Reto?',
      message: '¿Estás seguro de que quieres eliminar el reto del día?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'challenges', currentChallenge.id));
          setCurrentChallenge(null);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Error deleting challenge:', error);
          showAlert('Error', 'No se pudo eliminar el reto.', 'error');
        }
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans pb-32">
      <AssessmentModal isOpen={showAssessment} onClose={() => setShowAssessment(false)} />

      <header className="flex items-center justify-between mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
            <span className="text-xl sm:text-3xl font-bold text-primary">
              {user.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Hola, {user.name}
            </h1>
            {user.role === 'student' && (
              <p className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 truncate">
                Nivel {user.license_level} • {user.goal}
              </p>
            )}
            {user.role !== 'student' && (
              <p className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 capitalize mt-0.5 sm:mt-1">
                {user.role}
              </p>
            )}
          </div>
        </div>

        {user.role === 'student' && (
          <div className="flex gap-1.5 sm:gap-3">
            <div
              className="flex items-center gap-1 sm:gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
              title="Experiencia"
            >
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                {user.xp || 0}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 fill-red-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
                {user.lives}
              </span>
            </div>
          </div>
        )}
      </header>



      {user.role === 'student' && (
        <section className="mb-16">
          <MonthChallenge
            userId={user.id}
            onMotivationalQuote={(quote) => showAlert('¡Ánimo!', quote, 'info')}
          />
        </section>
      )}

      <section className={`mb-16 relative ${!isChallengeUnlocked ? 'opacity-60 grayscale' : ''}`}>
        {!isChallengeUnlocked && (
          <div className="absolute inset-0 bg-slate-950/20 z-30 flex items-center justify-center rounded-[2.5rem] backdrop-blur-[2px]">
            <Lock className="w-12 h-12 text-white/50" />
          </div>
        )}
        <div className="glass-card p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="p-3 sm:p-4 bg-orange-500/10 rounded-xl sm:rounded-2xl border border-orange-500/20">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Reto del Día
                </h2>
                <p className="text-[10px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                  ¡Supera tus límites hoy!
                </p>
              </div>
            </div>
            {isSpecialUser && (
              <div className="flex gap-2">
                <label className="cursor-pointer p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 text-xs font-bold">
                  <Upload className="w-4 h-4" /> Subir Video
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </label>
                {currentChallenge && (
                  <button
                    onClick={handleDeleteChallenge}
                    className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors border border-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {uploadProgress !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-primary font-medium">Subiendo video...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {currentChallenge ? (
            <div className="space-y-6">
              {user.role === 'admin' && (
                <div className="flex justify-end p-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                    ID: {currentChallenge.id} | {currentChallenge.objetivo || 'general'}
                  </span>
                </div>
              )}
              {currentChallenge.url ? (
                <div className="space-y-4">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-black relative shadow-2xl border border-slate-800">
                    <LazyVideoWrapper
                      src={currentChallenge.url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {(currentChallenge.title || currentChallenge.text) && (
                    <div className="p-4 sm:p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
                      {currentChallenge.title && (
                        <h4 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
                          <Target className="w-5 h-5 text-primary shrink-0" />
                          {currentChallenge.title}
                        </h4>
                      )}
                      {currentChallenge.text && (
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                          {currentChallenge.text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 sm:p-8 bg-slate-900/40 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-inner">
                  <h4 className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />{' '}
                    {currentChallenge.title || 'Misión del Día'}
                  </h4>
                  <p className="text-slate-300 text-sm sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {currentChallenge.text}
                  </p>
                </div>
              )}


              <div className="flex flex-wrap gap-3">
                {currentChallenge.categoria && (
                  <span className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-widest">
                    {currentChallenge.categoria}
                  </span>
                )}
                {currentChallenge.dificultad && (
                  <span className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest">
                    {currentChallenge.dificultad}
                  </span>
                )}
                {currentChallenge.period && currentChallenge.period !== 'dia' && (
                  <span className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-black uppercase tracking-widest">
                    {currentChallenge.period === 'semana' ? '📅 Reto semanal' : '🗓️ Reto mensual'}
                  </span>
                )}
              </div>

              {/* ── Checklist de tareas ── */}
              {currentChallenge.tasks && currentChallenge.tasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tareas ({checkedTasks.size}/{currentChallenge.tasks.length})
                  </p>
                  {currentChallenge.tasks.map((task, idx) => {
                    const done = checkedTasks.has(idx);
                    return (
                      <motion.button
                        key={idx}
                        onClick={async () => {
                          if (isChallengeCompleted) return;
                          const next = new Set(checkedTasks);
                          done ? next.delete(idx) : next.add(idx);
                          setCheckedTasks(next);
                          const today = new Date().toISOString().split('T')[0];
                          try {
                            await setDoc(doc(db, 'challenge_completions', user.id, 'records', today), {
                              challengeId: currentChallenge.id,
                              userId: user.id,
                              checkedTasks: Array.from(next),
                            }, { merge: true });
                          } catch (_) {}
                        }}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all text-sm font-bold ${
                          done
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-primary/40'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                        }`}>
                          {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={done ? 'line-through opacity-60' : ''}>{task}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {!isChallengeCompleted ? (
                <button
                  disabled={
                    !!(currentChallenge.tasks?.length) &&
                    checkedTasks.size < (currentChallenge.tasks?.length ?? 0)
                  }
                  onClick={async () => {
                    try {
                      setIsChallengeCompleted(true);
                      const today = new Date().toISOString().split('T')[0];
                      await setDoc(doc(db, 'challenge_completions', user.id, 'records', today), {
                        challengeId: currentChallenge.id,
                        completedAt: new Date().toISOString(),
                        userId: user.id,
                        checkedTasks: Array.from(checkedTasks),
                      });

                      // Log to Activity Feed
                      await addDoc(collection(db, 'activity_feed'), {
                        type: 'challenge_completion',
                        userId: user.id,
                        userName: user.name,
                        message: '¡ha completado el reto del día!',
                        createdAt: serverTimestamp(),
                      });

                      showAlert(
                        '¡Felicidades!',
                        'Has completado el reto de hoy. ¡Sigue así!',
                        'success'
                      );
                    } catch (error) {
                      console.error('Error completing challenge:', error);
                      setIsChallengeCompleted(false);
                      showAlert(
                        'Error',
                        'No se pudo registrar como completado. Inténtalo de nuevo.',
                        'error'
                      );
                    }
                  }}
                  className="w-full bg-primary text-white font-black py-4 sm:py-5 rounded-2xl sm:rounded-3xl uppercase text-xs sm:text-base tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  {currentChallenge.tasks?.length && checkedTasks.size < currentChallenge.tasks.length
                    ? `Completa ${currentChallenge.tasks.length - checkedTasks.size} tarea${currentChallenge.tasks.length - checkedTasks.size !== 1 ? 's' : ''} más`
                    : 'Completar Reto del Día'}
                </button>
              ) : (
                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black py-4 sm:py-5 rounded-2xl sm:rounded-3xl uppercase text-xs sm:text-base tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3">
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> ¡Reto Completado!
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video rounded-lg border-2 border-dashed border-slate-700 flex flex-col items-center justify-center bg-slate-900/30 text-slate-500">
              <Video className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-xs">No hay reto disponible para hoy</p>
            </div>
          )}
        </div>
      </section>

      {user.role === 'student' && (
        <section className="mb-16">
          <div
            onClick={() => navigate('/saberes')}
            className="glass-card p-8 rounded-[2.5rem] cursor-pointer hover:border-primary/40 transition-all group"
          >
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="shrink-0 group-hover:scale-105 transition-transform duration-500">
                <EvolvingAvatar
                  gender={user.gender || 'male'}
                  level={
                    (user.classes_per_month || 0) >= 4
                      ? (user.lives || 0) <= 1
                        ? 'thin'
                        : (user.streak || 0) >= 5
                          ? 'strong'
                          : 'normal'
                      : 'normal'
                  }
                />
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary mb-3">
                      Mi Licencia
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-primary transition-colors">
                      Domina el Arte del Boxeo
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 group-hover:rotate-12 transition-transform">
                    <Trophy className="w-9 h-9 text-yellow-500" />
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/50 h-5 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-slate-700/50">
                  <div
                    className="bg-primary h-full shadow-[0_0_20px_rgba(0,119,255,0.5)] transition-all duration-1000"
                    style={{ width: '35%' }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    Nivel {user.license_level} • 35% para el siguiente nivel
                  </p>
                  <ChevronRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0" />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4 text-slate-900 dark:text-white tracking-tight">
        <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl sm:rounded-2xl border border-blue-500/20">
          <Droplets className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 animate-pulse" />
        </div>
        Hidratación Diaria
      </h2>
      <div className="glass-card p-6 sm:p-10 rounded-4xl sm:rounded-[3rem] mb-12 sm:mb-16 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-blue-500/5 rounded-full -mr-24 -mt-24 sm:-mr-32 sm:-mt-32 transition-transform group-hover:scale-110"></div>

        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 relative z-10">
          {/* Character Visual */}
          <div className="relative">
            <motion.div
              animate={{
                y: [0, -10, 0],
                scale: waterCount >= 7 ? [1, 1.08, 1] : 1,
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-28 h-28 sm:w-40 sm:h-40 bg-blue-500/10 rounded-4xl sm:rounded-[3rem] flex items-center justify-center border border-blue-500/20 relative overflow-hidden shadow-inner"
            >
              <span className="text-5xl sm:text-7xl z-10">
                {waterCount === 0
                  ? '😫'
                  : waterCount < 3
                    ? '😐'
                    : waterCount < 5
                      ? '😊'
                      : waterCount < 7
                        ? '😎'
                        : '🤩'}
              </span>

              {/* Water level inside character circle */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(waterCount / 7) * 100}%` }}
                className="absolute bottom-0 left-0 right-0 bg-blue-500/25 transition-all duration-1000 ease-out"
              />
            </motion.div>

            {waterCount >= 7 && (
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="absolute -top-4 -right-4 bg-yellow-500 text-white p-3 rounded-2xl shadow-2xl shadow-yellow-500/40 border-2 border-white dark:border-slate-900"
              >
                <Trophy className="w-6 h-6" />
              </motion.div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="mb-6 sm:mb-10">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 leading-tight tracking-tight">
                {waterCount === 0
                  ? '¡Tengo muchísima sed! 🌵'
                  : waterCount < 3
                    ? 'Un poco mejor, ¡más agua! 💧'
                    : waterCount < 5
                      ? '¡Me siento hidratado! ✨'
                      : waterCount < 7
                        ? '¡Casi al 100%! 🚀'
                        : '¡Nivel de hidratación ÓPTIMO! 🏆'}
              </h3>
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-medium">
                Has bebido <span className="text-blue-500 font-bold">{waterCount}</span> de{' '}
                <span className="text-slate-900 dark:text-white font-bold">7</span> vasos hoy.
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-5">
              {[...Array(7)].map((_, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.15, y: -6 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleWaterClick(i)}
                  className={`relative w-11 h-16 sm:w-14 sm:h-20 rounded-b-[1.2rem] sm:rounded-b-3xl border-2 transition-all duration-500 ${
                    i < waterCount
                      ? 'bg-blue-500/20 border-blue-400 shadow-xl shadow-blue-500/15'
                      : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  {/* Glass reflection */}
                  <div className="absolute top-1.5 left-1.5 w-1.5 h-6 bg-white/20 rounded-full" />

                  {/* Water filling animation */}
                  <AnimatePresence>
                    {i < waterCount && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: '100%', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-blue-500/40 to-blue-300/30 rounded-b-[14px]"
                      />
                    )}
                  </AnimatePresence>

                  {/* Bubbles animation when full */}
                  {i < waterCount && (
                    <motion.div
                      animate={{ y: [-5, -20], opacity: [0, 1, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/30 rounded-full"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-12 sm:mb-16">
        <button
          onClick={() => isWorkoutsUnlocked && navigate('/workouts')}
          className={`relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card-premium p-6 sm:p-10 rounded-4xl transition-all text-left group min-h-[200px] sm:min-h-[240px] ${!isWorkoutsUnlocked ? 'opacity-60 grayscale cursor-not-allowed' : 'neon-border-red hover:shadow-2xl hover:shadow-red-500/10'}`}
        >
          {!isWorkoutsUnlocked && (
            <div className="absolute inset-0 bg-slate-950/20 z-20 flex items-center justify-center backdrop-blur-[2px]">
              <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-white/50" />
            </div>
          )}
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="bg-red-500/10 text-red-500 text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-red-500/20">
              Rutinas
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white group-hover:text-red-500 transition-colors uppercase tracking-tight leading-none">
              Entrenamientos
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              {isWorkoutsUnlocked ? 'Rutinas personalizadas.' : 'Sección Bloqueada'}
            </p>
          </div>
        </button>

        <button
          onClick={() => isTechniqueUnlocked && navigate('/saberes')}
          className={`relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card-premium p-6 sm:p-10 rounded-4xl transition-all text-left group min-h-[200px] sm:min-h-[240px] ${!isTechniqueUnlocked ? 'opacity-60 grayscale cursor-not-allowed' : 'neon-border-red hover:shadow-2xl hover:shadow-primary/10'}`}
        >
          {!isTechniqueUnlocked && (
            <div className="absolute inset-0 bg-slate-950/20 z-20 flex items-center justify-center backdrop-blur-[2px]">
              <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-white/50" />
            </div>
          )}
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Target className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="bg-primary/10 text-primary text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-primary/20">
              Técnica
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
              Aprender Boxeo
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              {isTechniqueUnlocked ? 'Domina los fundamentos del boxeo.' : 'Sección Bloqueada'}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/calendar')}
          className="relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] hover:border-purple-500/40 transition-all text-left group min-h-[200px] sm:min-h-[240px] hover:shadow-xl hover:shadow-purple-500/5"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-purple-500/5 rounded-full -mr-24 -mt-24 sm:-mr-32 sm:-mt-32 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="bg-purple-500/10 text-purple-500 text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-purple-500/20">
              Presencial
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors uppercase tracking-tight leading-none">
              Reservar Clase
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              Agenda tu sesión con el profesor.
            </p>
          </div>
        </button>

        <button
          onClick={() => isNutritionUnlocked && navigate('/meals')}
          className={`relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] transition-all text-left group min-h-[200px] sm:min-h-[240px] ${!isNutritionUnlocked ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5'}`}
        >
          {!isNutritionUnlocked && (
            <div className="absolute inset-0 bg-slate-950/20 z-20 flex items-center justify-center backdrop-blur-[2px]">
              <Lock className="w-10 h-10 sm:w-12 sm:h-12 text-white/50" />
            </div>
          )}
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Utensils className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="bg-orange-500/10 text-orange-500 text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-orange-500/20">
              Comidas Saludables
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white group-hover:text-orange-500 transition-colors uppercase tracking-tight leading-none">
              Alimentación
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              {isNutritionUnlocked ? 'Recetas y planes de alimentación.' : 'Sección Bloqueada'}
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/timer')}
          className="relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] hover:border-emerald-500/40 transition-all text-left group min-h-[200px] sm:min-h-[240px] hover:shadow-xl hover:shadow-emerald-500/5"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/5 rounded-full -mr-24 -mt-24 sm:-mr-32 sm:-mt-32 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-emerald-500/20">
              Herramienta
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors uppercase tracking-tight leading-none">
              Temporizador
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              Cronómetro de asaltos, preparación y descanso.
            </p>
          </div>
        </button>

        <button
          onClick={() => navigate('/plans')}
          className="relative overflow-hidden flex flex-col gap-4 sm:gap-6 glass-card-premium p-6 sm:p-10 rounded-4xl transition-all text-left group md:col-span-2 shadow-xl border border-primary/20 neon-glow-blue"
        >
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-80 sm:h-80 bg-primary/5 rounded-full -mr-32 -mt-32 sm:-mr-40 sm:-mt-40 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between relative z-10">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover:scale-105 transition-transform duration-500">
              <Star className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <span className="bg-primary/10 text-primary text-[9px] sm:text-[11px] font-black px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl uppercase tracking-[0.2em] border border-primary/20">
              Membresía Premium
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-black text-2xl sm:text-3xl text-slate-900 dark:text-white group-hover:text-primary transition-colors uppercase tracking-tight leading-none">
              Planes y Precios
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 sm:mt-4 font-medium leading-relaxed">
              Conoce nuestras tarifas y reserva tu clase personal.
            </p>
          </div>
        </button>
      </div>


      <div className="flex flex-col gap-6">
        <div className="flex justify-end -mb-6 relative z-20">
          <button
            onClick={refreshJokesAndQuotes}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 px-4 py-2 rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-lg"
            title="Mostrar otra frase y chistes"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="bg-linear-to-br from-slate-900 to-slate-950 p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] border border-slate-800 relative overflow-hidden shadow-2xl">
          <Quote className="absolute top-8 right-8 w-12 h-12 sm:w-20 sm:h-20 text-white/5 rotate-180" />
          <h3 className="text-primary font-black text-[10px] sm:text-[11px] uppercase tracking-[0.25em] mb-6 sm:mb-8 flex items-center gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl border border-primary/20">
              {dailyQuote.emoji}
            </div>
            Frase del Día
          </h3>
          <p className="text-xl sm:text-2xl font-medium italic text-slate-100 relative z-10 leading-relaxed tracking-tight">
            "{dailyQuote.text}"
          </p>
        </div>

        <div className="glass-card p-6 sm:p-10 rounded-4xl sm:rounded-[2.5rem] mb-12">
          <h3 className="flex items-center gap-3 sm:gap-4 font-black text-xl sm:text-2xl mb-8 sm:mb-10 text-slate-900 dark:text-white uppercase tracking-tight">
            <div className="p-2.5 sm:p-3 bg-yellow-500/10 rounded-xl sm:rounded-2xl border border-yellow-500/20">
              <Smile className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-500" />
            </div>
            Rincón del Humor
          </h3>

          <div className="space-y-6 sm:space-y-8">
            <div className="bg-white/40 dark:bg-slate-800/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
              <span className="text-[10px] sm:text-[11px] font-black text-emerald-500 uppercase tracking-[0.25em] mb-3 sm:mb-4 block">
                Humor Familiar 😄
              </span>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {dailyJokes.normal}
              </p>
            </div>

            {dailyJokes.dark.length > 0 && (
              <div className="bg-slate-900/50 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-700/50 shadow-inner relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-4xl sm:text-6xl opacity-10">🦇</div>
                <span className="text-[10px] sm:text-[11px] font-black text-purple-400 uppercase tracking-[0.25em] mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  Humor Negro 💀
                </span>
                <div className="space-y-4 sm:space-y-6 relative z-10">
                  {dailyJokes.dark.map((joke, idx) => (
                    <div key={idx} className="flex gap-3 sm:gap-4 items-start">
                      <span className="text-purple-500/50 font-black text-lg sm:text-xl">
                        {idx + 1}.
                      </span>
                      <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
                        {joke}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
      >
        <div className="flex flex-col items-center text-center p-4">
          {alertModal.type === 'success' && (
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
          )}
          {alertModal.type === 'error' && <AlertCircle className="w-16 h-16 text-red-500 mb-4" />}
          {alertModal.type === 'info' && <Info className="w-16 h-16 text-blue-500 mb-4" />}
          <p className="text-slate-300">{alertModal.message}</p>
          <button
            onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
            className="mt-6 w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
      >
        <div className="flex flex-col items-center text-center p-4">
          <AlertCircle className="w-16 h-16 text-orange-500 mb-4" />
          <p className="text-slate-300 mb-6">{confirmModal.message}</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmModal.onConfirm}
              className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* Panel de Control de Secciones está SOLO en Perfil (admin) */}

      {/* Challenge Admin Modal */}
      <Modal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        title="Crear Nuevo Reto"
      >
        <div className="space-y-8 p-2">
          {/* Opción A: Video Upload */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Video className="w-4 h-4" /> Opción A: Subir Video
            </h4>
            <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-4 transition-all hover:border-primary/50">
              <Upload className="w-10 h-10 text-slate-300" />
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={uploadProgress !== null}
                className="text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer w-full"
              />
              {uploadProgress !== null && (
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-500 font-bold tracking-widest">
                Ó
              </span>
            </div>
          </div>

          {/* Opción B: Text Content */}
          <form onSubmit={handleChallengeSubmit} className="space-y-6">
            <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
              <Quote className="w-4 h-4" /> Opción B: Texto e Instrucciones
            </h4>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Título del Reto
              </label>
              <input
                type="text"
                placeholder="Ej: 500 Golpes de Saco"
                value={challengeForm.title}
                onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Descripción / Instrucciones
              </label>
              <textarea
                placeholder="Describe qué deben hacer los alumnos..."
                value={challengeForm.text}
                onChange={(e) => setChallengeForm({ ...challengeForm, text: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary h-32 resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Categoría
                </label>
                <select
                  value={challengeForm.categoria}
                  onChange={(e) =>
                    setChallengeForm({ ...challengeForm, categoria: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary appearance-none"
                >
                  <option value="Boxeo">Boxeo</option>
                  <option value="Gym">Gym / Musculación</option>
                  <option value="HIIT">HIIT / Funcional</option>
                  <option value="Fuerza">Fuerza</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Dificultad
                </label>
                <select
                  value={challengeForm.dificultad}
                  onChange={(e) =>
                    setChallengeForm({ ...challengeForm, dificultad: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary appearance-none"
                >
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                  <option value="elite">Élite</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Objetivo Fitness (Asignación)
              </label>
              <select
                value={challengeForm.objetivo}
                onChange={(e) => setChallengeForm({ ...challengeForm, objetivo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-primary appearance-none"
              >
                <option value="general">Cualquier Objetivo (General)</option>
                <option value="bajar_peso">Bajar Peso</option>
                <option value="mantener">Mantener</option>
                <option value="aumentar">Aumentar Masa</option>
              </select>
            </div>

            {/* Período */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Período del Reto
              </label>
              <div className="flex gap-2">
                {(['dia', 'semana', 'mes'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChallengeForm({ ...challengeForm, period: p })}
                    className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${
                      challengeForm.period === p
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-primary'
                    }`}
                  >
                    {p === 'dia' ? '📅 Día' : p === 'semana' ? '🗓️ Semana' : '🏆 Mes'}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Tareas */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Lista de Tareas (Opcional)
              </label>
              {challengeForm.tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm font-bold">
                    {task}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChallengeForm({
                      ...challengeForm,
                      tasks: challengeForm.tasks.filter((_, i) => i !== idx)
                    })}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: 3 rounds de saltar cuerda"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!newTaskInput.trim()) return;
                      setChallengeForm({ ...challengeForm, tasks: [...challengeForm.tasks, newTaskInput.trim()] });
                      setNewTaskInput('');
                    }
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-slate-900 dark:text-white outline-none focus:border-primary transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTaskInput.trim()) return;
                    setChallengeForm({ ...challengeForm, tasks: [...challengeForm.tasks, newTaskInput.trim()] });
                    setNewTaskInput('');
                  }}
                  className="px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-2xl font-black text-xs uppercase hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-white font-black py-5 rounded-3xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.01] transition-all mt-4"
            >
              Publicar Reto Escrito
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
