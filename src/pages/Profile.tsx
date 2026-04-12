import { useStore } from '../store/useStore';
import {
  User,
  Settings,
  LogOut,
  Shield,
  ArrowLeft,
  UserPlus,
  Camera,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  Users,
  Lock,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Flame,
  Award,
  CalendarCheck,
  TrendingUp,
  Bell,
  MessageSquare,
  CreditCard,
  Heart,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Target,
  Video,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { storage, db, auth, functions } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  getDoc,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'motion/react';

import { Modal } from '../components/Modal';
import { EvolvingAvatar } from '../components/EvolvingAvatar';
import { AlertCircle, Info, CheckCircle2, Send } from 'lucide-react';
import { sendPushNotification } from '../lib/fcmService';
import { twMerge } from 'tailwind-merge';
import { compressImage } from '../utils/imageUtils';

export function Profile() {
  const user = useStore((state) => state.user);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'student' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [beforePic, setBeforePic] = useState<string | null>(null);
  const [afterPic, setAfterPic] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ type: string; progress: number } | null>(
    null
  );
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [paymentTab, setPaymentTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [allComboEvals, setAllComboEvals] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [additionalProducts, setAdditionalProducts] = useState<any[]>([]); // GPTE STORE
  const [plans, setPlans] = useState<any[]>([]); // Gestion de Planes
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<any>({});

  const [notifications, setNotifications] = useState<any[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [showManualNotification, setShowManualNotification] = useState(false);
  const [manualNotification, setManualNotification] = useState({
    userId: '',
    title: '',
    message: '',
  });
  const [comboFeedback, setComboFeedback] = useState<{ [key: string]: string }>({});
  const [appSettings, setAppSettings] = useState({
    workouts_unlocked: false,
    nutrition_unlocked: false,
    technique_unlocked: false,
    challenge_unlocked: false,
  });
  const [togglingSection, setTogglingSection] = useState<string | null>(null);
  const [expandedAdminSections, setExpandedAdminSections] = useState<Set<string>>(
    new Set(['pagos', 'gestionPlanes'])
  );

  // States for Editing Discounts in Admin Payment Panel
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPriceForm, setEditPriceForm] = useState({ final_price: 0, discount_reason: '' });
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  const toggleAdminSection = (id: string) => {
    setExpandedAdminSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const deleteStorageFile = async (url?: string) => {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return;
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (error) {
      console.warn('Could not delete file from storage:', url, error);
    }
  };

  const handleFirestoreError = useCallback(
    (error: any, operationType: string, path: string | null) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Firestore Error [${operationType}] on ${path}:`, msg);
      // Do NOT throw — throwing kills onSnapshot listeners and leaves state empty
    },
    []
  );

  const showAlert = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setAlertModal({ isOpen: true, title, message, type });
    },
    []
  );

  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;
    let unsubAttendance: (() => void) | undefined;
    let unsubNotifications: (() => void) | undefined;

    if (user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com') {
      unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const usersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setAllUsers(usersData);
        },
        (err) => handleFirestoreError(err, 'list', 'users')
      );

      const paymentsQ = collection(db, 'payments');
      unsubPayments = onSnapshot(
        paymentsQ,
        (snapshot) => {
          const all = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any);
          // Ordenamos los más recientes primero si existen submitted_at o created_at
          const sortedAll = all.sort((a, b) => {
            const tA = new Date(a.submitted_at || a.created_at || '2000-01-01').getTime();
            const tB = new Date(b.submitted_at || b.created_at || '2000-01-01').getTime();
            return tB - tA;
          });
          setAllPayments(sortedAll);
          setPendingPayments(
            sortedAll.filter(
              (p) => p.status === 'submitted' || p.status === 'pending_class_payment'
            )
          );
        },
        (err) => handleFirestoreError(err, 'list', 'payments')
      );

      // Subscribe to all student approvals
      onSnapshot(collection(db, 'student_approvals'), (snapshot) => {
        setPendingApprovals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      // Subscribe to all combo evaluations
      onSnapshot(collection(db, 'combo_evaluations'), (snapshot) => {
        setAllComboEvals(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      // Subscribe to all combos (for reference)
      onSnapshot(collection(db, 'combos'), (snapshot) => {
        setCombos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      // Subscribe to all plans (for management)
      onSnapshot(collection(db, 'plans'), (snapshot) => {
        setPlans(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
      
      // Subscribe to store products
      onSnapshot(collection(db, 'products'), (snapshot) => {
        setAdditionalProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }

    // Load app settings for admin toggles
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setAppSettings(snap.data() as any);
    });

    if (user) {
      const allQ = query(collection(db, 'bookings'), where('user_id', '==', String(user.id)));
      unsubAttendance = onSnapshot(
        allQ,
        (snapshot) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const attended = snapshot.docs.filter((d) => {
            const data = d.data();
            return data.status === 'active' && data.date <= todayStr;
          }).length;
          setAttendanceCount(attended);

          // Fetch upcoming bookings for Google Calendar sync
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const upcoming = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter(
              (b: any) => b.status === 'active' && b.date >= today.toISOString().split('T')[0]
            )
            .sort((a: any, b: any) => a.date.localeCompare(b.date));

          setUpcomingBookings(upcoming);
        },
        (err) => handleFirestoreError(err, 'list', 'bookings')
      );

      const q = query(
        collection(db, 'notifications'),
        where('user_id', 'in', [user.id, 'admin']),
        where('read', '==', false)
      );
      unsubNotifications = onSnapshot(
        q,
        (snapshot) => {
          setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        },
        (err) => handleFirestoreError(err, 'list', 'notifications')
      );
    }

    try {
      if ('Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    } catch (e) {
      console.error('Notification API error:', e);
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubPayments) unsubPayments();
      if (unsubAttendance) unsubAttendance();
      if (unsubNotifications) unsubNotifications();
      unsubSettings();
    };
  }, [user?.id, user?.role, user?.email, handleFirestoreError]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showAlert('No soportado', 'Tu navegador no soporta notificaciones.', 'info');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (user) {
      try {
        await updateDoc(doc(db, 'users', String(user.id)), {
          notifications_enabled: permission === 'granted',
        });
        setUser({ ...user, notifications_enabled: permission === 'granted' } as any);
      } catch (err) {
        console.error('Error saving notification preference', err);
      }
    }
    if (permission === 'granted') {
      new Notification('¡Notificaciones activadas!', {
        body: 'Te avisaremos 1 hora antes de tus clases.',
        icon: '/favicon.ico',
      });
    } else {
      showAlert(
        'Permiso Denegado',
        'Habilita las notificaciones en la vista del sitio de tu navegador (el ícono de candado en la barra de URL) para recibir alertas.',
        'error'
      );
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    try {
      await setDoc(doc(collection(db, 'notifications')), {
        user_id: userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const handleSendManualNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNotification.userId || !manualNotification.title || !manualNotification.message) {
      showAlert('Error', 'Todos los campos son obligatorios', 'error');
      return;
    }
    try {
      await sendPushNotification(
        manualNotification.userId,
        manualNotification.title,
        manualNotification.message
      );
      showAlert('Éxito', 'Notificación enviada correctamente', 'success');
      setShowManualNotification(false);
      setManualNotification({ userId: '', title: '', message: '' });
    } catch (err) {
      console.error('Error sending manual notification:', err);
      showAlert('Error', 'Error al enviar la notificación', 'error');
    }
  };

  const handleApprovePayment = async (payment: any) => {
    if (!payment || !payment.user_id) {
      showAlert('Error', 'Información de pago incompleta o corrupta.', 'error');
      return;
    }

    try {
      // Use edited values if this payment was being edited
      const finalApprovedPrice =
        editingPaymentId === payment.id
          ? editPriceForm.final_price
          : payment.final_price || payment.amount || 0;
      const finalDiscountReason =
        editingPaymentId === payment.id
          ? editPriceForm.discount_reason
          : payment.discount_reason || '';

      // Update payment status and record final price/discount
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'approved',
        verifiedAt: serverTimestamp(),
        verifiedBy: user?.id,
        final_price: finalApprovedPrice,
        discount_reason: finalDiscountReason,
      });

      if (
        (payment.type === 'single_class' ||
          payment.plan_name?.toLowerCase().includes('clase individual')) &&
        payment.booking_id
      ) {
        // ✅ Clase individual: confirmar la reserva asociada
        await updateDoc(doc(db, 'bookings', payment.booking_id), {
          status: 'active',
        });

        // Notificar al estudiante que su clase fue confirmada
        await addDoc(collection(db, 'notifications'), {
          user_id: payment.user_id,
          type: 'booking_confirmed',
          title: '✅ Clase Confirmada',
          message: `Tu pago fue aprobado por $${finalApprovedPrice.toLocaleString()}. ¡Tu clase está confirmada!`,
          created_at: serverTimestamp(),
          read: false,
        });

        await sendPushNotification(
          payment.user_id,
          '✅ ¡Clase Confirmada!',
          `Tu comprobante fue aprobado. Tu clase está lista. ¡Te esperamos!`
        );

        showAlert(
          'Éxito',
          'Pago de clase individual aprobado. La reserva fue confirmada.',
          'success'
        );
      } else {
        const planName = payment.plan_name || 'Plan Mensual';
        // ✅ Plan mensual: activar el plan del usuario
        await updateDoc(doc(db, 'users', payment.user_id), {
          plan_id: payment.plan_id || 'manual',
          plan_name: planName,
          plan_status: 'active',
          plan_start_date: serverTimestamp(),
          classes_per_month: payment.classes_per_month || 0,
          classes_remaining: payment.classes_per_month || 0,
        });

        // Notificar al estudiante
        await addDoc(collection(db, 'notifications'), {
          user_id: payment.user_id,
          type: 'plan_approved',
          title: '🎉 ¡Plan Aprobado!',
          message: `Tu pago para el plan ${planName} fue aprobado por $${finalApprovedPrice.toLocaleString()}. ¡Disfruta de tus beneficios!`,
          created_at: serverTimestamp(),
          read: false,
        });

        await sendPushNotification(
          payment.user_id,
          '¡Plan Aprobado!',
          `Tu pago para el plan ${planName} ha sido aprobado. ¡Disfruta de tus beneficios!`
        );

        showAlert('Éxito', 'Pago de plan aprobado correctamente', 'success');
      }
      setEditingPaymentId(null);
    } catch (err) {
      handleFirestoreError(err, 'update', `payments/${payment?.id}`);
    }
  };

  const handleRejectPayment = async (payment: any) => {
    if (!payment || !payment.user_id) {
      showAlert('Error', 'Información de pago incompleta.', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'payments', payment.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        verifiedBy: user?.id,
      });

      // Update user status back to pending payment so they can try again
      await updateDoc(doc(db, 'users', payment.user_id), {
        plan_status: 'pending_payment',
      });

      const planName = payment.plan_name || 'Plan Mensual';

      // Send push notification
      await sendPushNotification(
        payment.user_id,
        'Pago Rechazado',
        `Lo sentimos, tu pago para el plan ${planName} ha sido rechazado. Por favor, verifica tu comprobante e intenta de nuevo.`
      );

      showAlert('Info', 'Pago de plan rechazado', 'info');
    } catch (err) {
      handleFirestoreError(err, 'update', `payments/${payment?.id}`);
    }
  };

  const generateGoogleCalendarUrl = (booking: any) => {
    try {
      if (!booking.date || !booking.time) return '#';

      const dateParts = booking.date.split('-');
      if (dateParts.length !== 3) return '#';

      // Handle the time ranges like "14:00 - 15:30" or just "14:00"
      const startTimeStr = booking.time.includes('-')
        ? booking.time.split('-')[0].trim()
        : booking.time;
      const endTimeStr = booking.time.includes('-')
        ? booking.time.split('-')[1].trim()
        : `${parseInt(startTimeStr.split(':')[0]) + 1}:${startTimeStr.split(':')[1] || '00'}`;

      const d = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
      );

      const [startH, startM] = startTimeStr.split(':').map(Number);
      const startD = new Date(d);
      startD.setHours(startH, startM, 0);

      const [endH, endM] = endTimeStr.split(':').map(Number);
      const endD = new Date(d);
      endD.setHours(endH, endM, 0);

      const formatTz = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
      };

      const title = encodeURIComponent('Clase de Boxeo - GUANTES');
      const details = encodeURIComponent(
        `Hola ${user?.name || ''}, esta es tu clase reservada. ¡No faltes!`
      );
      const location = encodeURIComponent('GUANTES Boxing Studio');

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatTz(startD)}/${formatTz(endD)}&details=${details}&location=${location}`;
    } catch (e) {
      console.error('Error generating GCal link', e);
      return '#';
    }
  };

  if (!user) return null;

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      const newUserId = userCredential.user.uid;

      await setDoc(doc(db, 'users', newUserId), {
        name: 'Nuevo Estudiante',
        email: newUser.email,
        weight: 0,
        age: 0,
        dominant_hand: 'Derecha',
        boxing_goal: 'Aprender a defenderme',
        fitness_goal: 'Mantener peso',
        goal: 'Mantener peso',
        role: 'student',
        streak: 0,
        lives: 3,
        license_level: 1,
        profile_pic: null,
        created_at: serverTimestamp(),
        is_new_user: true,
        tutorial_completed: false,
      });

      showAlert('Éxito', 'Usuario creado con éxito', 'success');
      setShowCreateUser(false);
      setNewUser({ email: '', password: '', role: 'student' });
    } catch (err: any) {
      handleFirestoreError(err, 'write', 'users');
    }
  };

  const handleApproveStep = async (userId: string, step: number) => {
    try {
      const field = `step${step}_status`;
      const nextField = step < 4 ? `step${step + 1}_status` : null;
      const approvalRef = doc(db, 'student_approvals', userId);
      const updates: any = {
        [field]: 'approved',
        [`step${step}_approved_at`]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (nextField) updates[nextField] = 'pending';
      await setDoc(approvalRef, updates, { merge: true });

      // Log to Activity Feed
      if (step === 4) {
        // Step 4 is usually the final step or a big milestone
        await addDoc(collection(db, 'activity_feed'), {
          type: 'milestone',
          userId: userId,
          userName: 'Un Estudiante', // We should ideally have the name here
          message: 'ha superado un paso clave en su proceso de licencia!',
          createdAt: serverTimestamp(),
        });
      }

      showAlert(
        '✅ Aprobado',
        `Paso ${step} aprobado exitosamente. El estudiante puede continuar.`,
        'success'
      );
    } catch (err) {
      handleFirestoreError(err, 'update', `student_approvals/${userId}`);
    }
  };

  const handleRejectStep = async (userId: string, step: number) => {
    try {
      if (step === 1) {
        const approvalSnap = await getDoc(doc(db, 'student_approvals', userId));
        if (approvalSnap.exists() && approvalSnap.data().step1_video_url) {
          await deleteStorageFile(approvalSnap.data().step1_video_url);
        }
      }
      const field = `step${step}_status`;
      await setDoc(
        doc(db, 'student_approvals', userId),
        {
          [field]: 'rejected',
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
      showAlert(
        '❌ Rechazado',
        `Paso ${step} rechazado. El estudiante recibirá la notificación.`,
        'info'
      );
    } catch (err) {
      handleFirestoreError(err, 'update', `student_approvals/${userId}`);
    }
  };

  const handleApproveComboMethod = async (
    evaluation: any,
    method: 'manillas' | 'combo' | 'contacto'
  ) => {
    try {
      const evalRef = doc(db, 'combo_evaluations', evaluation.id);
      const updates: any = {
        [`${method}_status`]: 'approved',
        [`${method}_feedback`]: '',
        updated_at: new Date().toISOString(),
      };

      // Auto-delete video if combo method is approved
      if (method === 'combo' && evaluation.combo_video_url) {
        await deleteStorageFile(evaluation.combo_video_url);
        updates.combo_video_url = '';
      }

      await updateDoc(evalRef, updates);

      if (method === 'combo') {
        try {
          const evalSnap = await getDocs(
            query(
              collection(db, 'combo_evaluations'),
              where('user_id', '==', evaluation.user_id),
              where('combo_status', '==', 'approved')
            )
          );
          const approvedCount = evalSnap.size;
          const newLevel = Math.floor(approvedCount / 5) + 1;

          const studentRef = doc(db, 'users', evaluation.user_id);
          const studentDoc = await getDoc(studentRef);

          if (studentDoc.exists() && (studentDoc.data().license_level || 1) < newLevel) {
            await updateDoc(studentRef, { license_level: newLevel });

            await addDoc(collection(db, 'activity_feed'), {
              type: 'level_up',
              userId: evaluation.user_id,
              userName: evaluation.user_name || 'Estudiante',
              message: `¡ha alcanzado el Nivel ${newLevel}! 🛡️`,
              createdAt: serverTimestamp(),
            });

            await sendPushNotification(
              evaluation.user_id,
              '🚀 ¡SUBIDA DE NIVEL!',
              `¡Felicidades! Has alcanzado el Nivel ${newLevel}. Sigue así guerrero.`
            );
          }
        } catch (e) {
          console.error('Error updating level:', e);
        }

        await addDoc(collection(db, 'activity_feed'), {
          type: 'combo_mastery',
          userId: evaluation.user_id,
          userName: evaluation.user_name || 'Estudiante',
          message: `¡ha dominado el combo: ${evaluation.combo_name}!`,
          createdAt: serverTimestamp(),
        });
      }

      await sendPushNotification(
        evaluation.user_id,
        '✅ Técnica Aprobada',
        `¡Tu evaluación de ${method} para ${evaluation.combo_name} ha sido aprobada!`
      );

      showAlert('✅ Éxito', `Método ${method} aprobado correctamente.`, 'success');
    } catch (err) {
      handleFirestoreError(err, 'update', `combo_evaluations/${evaluation.id}`);
    }
  };

  const handleRejectComboMethod = async (
    evaluation: any,
    method: 'manillas' | 'combo' | 'contacto'
  ) => {
    const feedback = comboFeedback[`${evaluation.id}_${method}`];
    if (!feedback || feedback.trim().length < 3) {
      showAlert('Aviso', 'Por favor ingresa un feedback breve antes de rechazar.', 'info');
      return;
    }

    try {
      const evalRef = doc(db, 'combo_evaluations', evaluation.id);
      await updateDoc(evalRef, {
        [`${method}_status`]: 'rejected',
        [`${method}_feedback`]: feedback,
        updated_at: new Date().toISOString(),
      });

      await sendPushNotification(
        evaluation.user_id,
        '❌ Técnica: Requiere Mejora',
        `Tu evaluación de ${method} para ${evaluation.combo_name} ha sido rechazada. Feedback: ${feedback}`
      );

      setComboFeedback((prev) => {
        const next = { ...prev };
        delete next[`${evaluation.id}_${method}`];
        return next;
      });

      showAlert('Info', `Método ${method} rechazado con feedback.`, 'info');
    } catch (err) {
      handleFirestoreError(err, 'update', `combo_evaluations/${evaluation.id}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !auth.currentUser || !deleteAdminPassword) {
      showAlert('Error', 'Debe ingresar su contraseña para confirmar.', 'error');
      return;
    }

    setIsDeletingUser(true);
    try {
      // 1. Reautenticar al admin (Seguridad de Firebase para acciones sensibles)
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, deleteAdminPassword);
      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (authErr: any) {
        console.error('Auth error during deletion:', authErr);
        throw new Error(
          authErr.code === 'auth/wrong-password'
            ? 'Contraseña de administrador incorrecta.'
            : 'Error de autenticación. Intenta cerrar sesión y volver a entrar.'
        );
      }

      // 2. Deep delete en Firestore y Storage
      const userRef = doc(db, 'users', userToDelete.id);
      
      // Eliminar notificaciones del usuario
      const notificationsSnap = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', userToDelete.id)));
      for (const d of notificationsSnap.docs) await deleteDoc(d.ref);

      // Eliminar pagos del usuario
      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('user_id', '==', userToDelete.id)));
      for (const d of paymentsSnap.docs) {
        const pData = d.data();
        if (pData.payment_proof_url) await deleteStorageFile(pData.payment_proof_url).catch(() => null);
        await deleteDoc(d.ref);
      }

      // Eliminar evaluaciones de técnica
      const evalsSnap = await getDocs(query(collection(db, 'combo_evaluations'), where('user_id', '==', userToDelete.id)));
      for (const d of evalsSnap.docs) {
        const eData = d.data();
        if (eData.combo_video_url) await deleteStorageFile(eData.combo_video_url).catch(() => null);
        await deleteDoc(d.ref);
      }

      // Cancelar futuras clases
      const bookingsRef = collection(db, 'bookings');
      const q = query(collection(db, 'bookings'), where('user_id', '==', userToDelete.id));
      const bookingsSnap = await getDocs(q);
      for (const bDoc of bookingsSnap.docs) await deleteDoc(bDoc.ref);

      // Llamar a Cloud Function para borrado definitivo de AUTH
      try {
        const deleteUserSecure = httpsCallable(functions, 'deleteUserSecure');
        await deleteUserSecure({ uid: userToDelete.id });
      } catch (funcErr) {
        console.warn('AUTH deletion failed:', funcErr);
      }

      // Limpiar imágenes de perfil y progreso
      const u = allUsers.find((x) => x.id === userToDelete.id);
      if (u) {
        if (u.profile_pic) await deleteStorageFile(u.profile_pic).catch(() => null);
        if (u.before_pic) await deleteStorageFile(u.before_pic).catch(() => null);
        if (u.after_pic) await deleteStorageFile(u.after_pic).catch(() => null);
      }

      // Eliminar registro de aprobación de licencia
      const approvalRef = doc(db, 'student_approvals', userToDelete.id);
      const approvalSnap = await getDoc(approvalRef);
      if (approvalSnap.exists()) {
        const approvalData = approvalSnap.data();
        if (approvalData.step1_video_url) await deleteStorageFile(approvalData.step1_video_url).catch(() => null);
        await deleteDoc(approvalRef).catch(() => null);
      }

      // Borrar documento principal del usuario
      await deleteDoc(userRef);

      showAlert('Éxito', 'Usuario y todos sus datos han sido eliminados de forma permanente.', 'success');

      showAlert('Éxito', 'Usuario eliminado y desactivado correctamente.', 'success');
      setUserToDelete(null);
      setDeleteAdminPassword('');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showAlert('Error', error.message || 'Error al eliminar usuario', 'error');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name === 'HONORARIOS' || user?.name === 'honorarios' ? '' : user?.name || '',
    weight: user?.weight || 0,
    height: user?.height || 0,
    dominant_hand: user?.dominant_hand || 'Derecha',
    gender: user?.gender || 'male',
    fitnessGoal: user?.fitnessGoal || 'general',
  });

  const [canUploadAfter, setCanUploadAfter] = useState(false);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name === 'HONORARIOS' || user.name === 'honorarios' ? '' : user.name || '',
        weight: user.weight || 0,
        height: user.height || 0,
        dominant_hand: user.dominant_hand || 'Derecha',
        gender: user.gender || 'male',
        fitnessGoal: user.fitnessGoal || 'general',
      });
      if (user.profile_pic) setProfilePic(user.profile_pic);
      if (user.before_pic) setBeforePic(user.before_pic);
      if (user.after_pic) setAfterPic(user.after_pic);

      if (user.created_at) {
        const createdAt = user.created_at.toDate
          ? user.created_at.toDate()
          : new Date(user.created_at);
        const diffTime = Math.abs(new Date().getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setCanUploadAfter(diffDays >= 30);
      } else {
        setCanUploadAfter(true);
      }
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', String(user.id));
      const updatedData = {
        ...editForm,
        profile_pic: profilePic,
        before_pic: beforePic,
        after_pic: afterPic,
      };

      await updateDoc(userRef, updatedData);
      setUser({ ...user, ...updatedData } as any);
      setIsEditing(false);
      showAlert('Éxito', 'Perfil actualizado correctamente', 'success');
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.id}`);
    }
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (passwordForm.newPassword.length < 6) {
      showAlert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden. Verifica e intenta de nuevo.', 'error');
      return;
    }
    if (!passwordForm.currentPassword) {
      showAlert('Error', 'Debes ingresar tu contraseña actual para confirmar el cambio.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      showAlert('Éxito', '✅ Tu contraseña se actualizó correctamente.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowCurrentPwd(false);
      setShowNewPwd(false);
      setShowConfirmPwd(false);
    } catch (error: any) {
      if (
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-password'
      ) {
        showAlert('Error', 'La contraseña es incorrecta.', 'error');
      } else if (error.code === 'auth/requires-recent-login') {
        showAlert(
          'Seguridad',
          'Tu sesión es antigua. Por seguridad, cierra sesión y vuelve a entrar para realizar esta acción.',
          'error'
        );
      } else {
        showAlert('Error', 'Error: ' + error.message, 'error');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleManualErrorReport = () => {
    const errorMsg = prompt('Describe brevemente el problema que encontraste:');
    if (!errorMsg || errorMsg.trim().length < 5) return;

    try {
      // Registrar en Sentry/LogRocket manualmente
      console.error('USER_REPORTED_ERROR:', errorMsg);
      // Sentry.captureMessage(`User Report: ${errorMsg}`);
      showAlert('Enviado', 'Gracias. Tu reporte ha sido enviado al equipo técnico.', 'success');
    } catch (e) {
      console.error(e);
    }
  };

  const [adminEditUser, setAdminEditUser] = useState<any>(null);
  const [adminEditForm, setAdminEditForm] = useState({
    name: '',
    weight: 0,
    height: 0,
    newPassword: '',
    plan_name: '',
    classes_remaining: 0,
    classes_per_month: 0,
  });
  const [isAdminSaving, setIsAdminSaving] = useState(false);

  const handleAdminSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditUser) return;
    setIsAdminSaving(true);
    try {
      await updateDoc(doc(db, 'users', adminEditUser.id), {
        name: adminEditForm.name,
        weight: Number(adminEditForm.weight),
        height: Number(adminEditForm.height),
        plan_name: adminEditForm.plan_name,
        classes_remaining: Number(adminEditForm.classes_remaining),
        classes_per_month: Number(adminEditForm.classes_per_month),
        ...(adminEditForm.plan_name &&
          adminEditForm.plan_name !== 'Sin Plan' && { plan_status: 'active' }),
      });

      if (adminEditForm.newPassword && adminEditForm.newPassword.length >= 6) {
        const updateAdminUserPassword = httpsCallable(functions, 'updateAdminUserPassword');
        await updateAdminUserPassword({
          uid: adminEditUser.id,
          newPassword: adminEditForm.newPassword,
        });
      }

      showAlert('Éxito', 'Usuario y contraseña actualizados correctamente', 'success');
      setAdminEditUser(null);
    } catch (error: any) {
      showAlert('Error', error.message || 'Error al actualizar usuario', 'error');
    } finally {
      setIsAdminSaving(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    isProfilePic = false,
    isBefore = false,
    isAfter = false
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showAlert('Error', 'Por favor, selecciona una imagen.', 'error');
        return;
      }

      const compressedFile = await compressImage(file, 1024, 0.8);

      const type = isProfilePic ? 'profile' : isBefore ? 'before' : 'after';
      const storageRef = ref(
        storage,
        `images/${user?.id}/${type}_${Date.now()}_${compressedFile.name}`
      );
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress({ type, progress: Math.round(progress) });
        },
        (error) => {
          console.error('Error al subir la imagen:', error);
          showAlert('Error', 'Error al subir la imagen: ' + error.message, 'error');
          setUploadProgress(null);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setter(downloadURL);
          setUploadProgress(null);

          if ((isProfilePic || isBefore || isAfter) && user) {
            try {
              const userRef = doc(db, 'users', String(user.id));
              const updatedData = {
                profile_pic: isProfilePic ? downloadURL : profilePic,
                before_pic: isBefore ? downloadURL : beforePic,
                after_pic: isAfter ? downloadURL : afterPic,
              };
              await updateDoc(userRef, updatedData);
              setUser({ ...user, ...updatedData } as any);
            } catch (error) {
              handleFirestoreError(error, 'update', `users/${user.id}`);
            }
          }
        }
      );
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display p-4 pb-32"
    >
      <motion.header variants={itemVariants} className="flex items-center justify-between mb-10">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors shadow-sm"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mi Perfil
        </h1>
        <div className="w-12"></div>
      </motion.header>

      <motion.div variants={itemVariants} className="flex flex-col items-center mb-12">
        <div className="relative mb-6">
          {user.role === 'student' ? (
            <div className="w-64 h-64">
              <EvolvingAvatar
                gender={(user.gender as any) || 'male'}
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
          ) : (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="w-40 h-40 rounded-[3rem] border-4 border-primary/30 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-5xl font-bold text-primary overflow-hidden shadow-2xl shadow-primary/20 relative group"
            >
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                (user.name || 'U').charAt(0)
              )}
              <div className="absolute inset-0 bg-linear-to-bt from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress?.type === 'profile'}
            className="absolute -bottom-2 -right-2 bg-primary text-white p-3.5 rounded-2xl border-4 border-white dark:border-slate-950 shadow-2xl hover:bg-primary-dark transition-all disabled:opacity-50 z-10"
          >
            <Camera className="w-5 h-5" />
          </motion.button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, setProfilePic, true)}
          />
        </div>
        {uploadProgress?.type === 'profile' && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '10rem' }}
            className="bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-4 border border-slate-300 dark:border-slate-700"
          >
            <motion.div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            ></motion.div>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.input
              key="edit-name"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-3 text-center text-2xl font-bold text-slate-900 dark:text-white mb-3 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          ) : (
            <motion.h2
              key="view-name"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-3xl font-black leading-tight tracking-tight text-center text-slate-900 dark:text-white uppercase"
            >
              {user.name === 'HONORARIOS' || user.name === 'honorarios'
                ? 'Usuario'
                : user.name || 'Usuario'}
            </motion.h2>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3 mt-2">
          {user.role === 'student' && (
            <span className="bg-primary/10 text-primary text-[11px] uppercase font-black px-4 py-1.5 rounded-xl tracking-[0.2em] border border-primary/20">
              Nivel {user.license_level}
            </span>
          )}
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-tight uppercase">
            {user.goal}
          </p>
        </div>
      </motion.div>

      {user.role === 'student' && (
        <motion.section variants={itemVariants} className="mb-12">
          <h3 className="text-xl font-black mb-6 flex items-center gap-4 text-slate-900 dark:text-white uppercase tracking-tight">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Award className="w-6 h-6 text-primary" />
            </div>
            Logros y Estadísticas
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <motion.div
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <Flame className="w-10 h-10 text-orange-500 mb-3" />
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {user.streak || 0}
              </span>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mt-2">
                Días Seguidos
              </span>
            </motion.div>
            <motion.div
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
              <CalendarCheck className="w-10 h-10 text-blue-500 mb-3" />
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {attendanceCount}
              </span>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-2">
                Clases Asistidas
              </span>
            </motion.div>
          </div>
          <motion.div whileHover={{ y: -5 }} className="glass-card rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Adherencia Semanal
                </h4>
              </div>
              <span
                className={`${Math.min(100, Math.round(((user.streak || 0) / 7) * 100)) > 50 ? 'text-emerald-500' : 'text-orange-500'} font-black text-2xl`}
              >
                {Math.min(100, Math.round(((user.streak || 0) / 7) * 100))}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800/50 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.round(((user.streak || 0) / 7) * 100))}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`${Math.min(100, Math.round(((user.streak || 0) / 7) * 100)) > 50 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]'} h-full rounded-full`}
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-5 text-center font-medium leading-relaxed">
              {Math.min(100, Math.round(((user.streak || 0) / 7) * 100)) === 0
                ? '¡Es hora de empezar a entrenar! Registra tu primera clase.'
                : Math.min(100, Math.round(((user.streak || 0) / 7) * 100)) < 50
                  ? '¡Sigue así! Estás construyendo el hábito.'
                  : '¡Excelente trabajo! Has cumplido la mayoría de tus entrenamientos esta semana.'}
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="glass-card rounded-[2.5rem] p-8 mt-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <CalendarCheck className="w-6 h-6 text-blue-500" />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Próximas Clases y Sincronización
                </h4>
              </div>
            </div>

            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium leading-relaxed py-4 opacity-70">
                No tienes reservas activas por delante. Cuando reserves, podrás sincronizarlas con
                Google Calendar.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50"
                  >
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">
                        {b.date || 'Sin fecha'}
                      </p>
                      <p className="text-xs text-primary font-bold">{b.time || 'Sin hora'}</p>
                    </div>
                    <a
                      href={generateGoogleCalendarUrl(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> Google Calendar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.section>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-5 rounded-4xl flex flex-col items-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          {isEditing ? (
            <input
              type="number"
              value={editForm.weight || ''}
              onChange={(e) => setEditForm({ ...editForm, weight: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-primary font-black text-lg py-1"
            />
          ) : (
            <span className="text-primary text-xl font-black tracking-tight">{user.weight}kg</span>
          )}
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] mt-2 text-center">
            Peso
          </span>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-5 rounded-4xl flex flex-col items-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          {isEditing ? (
            <input
              type="number"
              value={editForm.height || ''}
              onChange={(e) => setEditForm({ ...editForm, height: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-emerald-500 font-black text-lg py-1"
            />
          ) : (
            <span className="text-emerald-500 text-xl font-black tracking-tight">
              {user.height ? `${user.height}cm` : '—'}
            </span>
          )}
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] mt-2 text-center">
            Altura
          </span>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="glass-card p-5 rounded-4xl flex flex-col items-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          {isEditing ? (
            <select
              value={editForm.dominant_hand}
              onChange={(e) => setEditForm({ ...editForm, dominant_hand: e.target.value })}
              className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-primary font-black text-xs py-2"
            >
              <option value="Derecha">Derecha</option>
              <option value="Izquierda">Izquierda</option>
            </select>
          ) : (
            <span className="text-primary text-sm font-black tracking-tight text-center">
              {user.dominant_hand || 'Derecha'}
            </span>
          )}
          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] mt-2 text-center">
            Mano Dom.
          </span>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-12">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-card p-6 rounded-4xl flex flex-col items-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
          <div className="flex flex-col items-center w-full">
            <Target className="w-8 h-8 text-primary mb-3" />
            {isEditing ? (
              <div className="w-full space-y-6">
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Mi Género
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setEditForm({ ...editForm, gender: 'male' })}
                      className={twMerge(
                        'p-5 rounded-2xl border-2 transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3',
                        editForm.gender === 'male'
                          ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      )}
                    >
                      <User className="w-4 h-4" /> Masculino
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, gender: 'female' })}
                      className={twMerge(
                        'p-5 rounded-2xl border-2 transition-all font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3',
                        editForm.gender === 'female'
                          ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20'
                          : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                      )}
                    >
                      <User className="w-4 h-4" /> Femenino
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Mi Objetivo
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { id: 'bajar_peso', label: 'Bajar Peso', icon: TrendingUp },
                        { id: 'mantener', label: 'Mantener', icon: Target },
                        { id: 'aumentar', label: 'Masa Muscular', icon: Flame },
                        { id: 'general', label: 'General', icon: Activity },
                      ] as const
                    ).map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setEditForm({ ...editForm, fitnessGoal: goal.id })}
                        className={twMerge(
                          'p-4 rounded-2xl border-2 transition-all font-black uppercase tracking-widest text-[9px] flex flex-col items-center gap-2',
                          editForm.fitnessGoal === goal.id
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                            : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                        )}
                      >
                        <goal.icon className="w-5 h-5" />
                        {goal.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-primary text-xl font-black uppercase tracking-tight">
                {user.fitnessGoal === 'bajar_peso'
                  ? 'Bajar Peso'
                  : user.fitnessGoal === 'mantener'
                    ? 'Mantener'
                    : user.fitnessGoal === 'aumentar'
                      ? 'Aumentar Masa'
                      : 'General'}
              </span>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] mt-3">
              Mi Objetivo Fitness
            </span>
          </div>
        </motion.div>
      </motion.div>

      <motion.section variants={itemVariants} className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Notificaciones
            </h3>
          </div>
          <AnimatePresence>
            {notifications.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="bg-primary text-white text-[11px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20"
              >
                {notifications.length} nuevas
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="glass-card rounded-[2.5rem] p-6 max-h-[400px] overflow-y-auto hide-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-40">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                Bandeja de entrada vacía
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-6 rounded-4xl border-2 flex gap-5 items-start transition-all hover:scale-[1.01] ${
                      n.type === 'success'
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : n.type === 'error'
                          ? 'bg-red-500/5 border-red-500/20'
                          : n.type === 'warning'
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-blue-500/5 border-blue-500/20'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        {n.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Reciente'}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => markNotificationAsRead(n.id)}
                      className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all border border-transparent"
                    >
                      <Check className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <User className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Datos Personales
            </h3>
          </div>
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit-actions"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(false)}
                  className="w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                >
                  <X className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveProfile}
                  className="w-11 h-11 flex items-center justify-center bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <Check className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="view-actions"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="w-11 h-11 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-primary rounded-2xl hover:bg-primary/10 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <Edit2 className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="glass-card rounded-[2.5rem] p-8 space-y-2">
          <div className="flex justify-between items-center py-5 border-b border-slate-200/50 dark:border-slate-800/50">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest">
              Email
            </p>
            <p className="text-slate-900 dark:text-white text-base font-bold tracking-tight">
              {user.email}
            </p>
          </div>
          <div className="flex justify-between items-center py-5 border-b border-slate-200/50 dark:border-slate-800/50">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest">
              Rol
            </p>
            <p className="text-slate-900 dark:text-white text-base font-bold tracking-tight capitalize">
              {user.role}
            </p>
          </div>
          {user.role === 'student' && (
            <div className="flex justify-between items-center py-5">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest">
                Vidas Restantes
              </p>
              <div className="flex items-center gap-2 bg-red-500/10 px-4 py-1.5 rounded-xl border border-red-500/20">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <p className="text-red-500 text-base font-black">{user.lives}</p>
              </div>
            </div>
          )}
          {isEditing && (
            <div className="pt-4 mt-6 border-t border-slate-200/50 dark:border-slate-800/50 space-y-3">
              <p className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-widest">
                Cambiar Contraseña
              </p>
              {/* Contraseña actual */}
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  placeholder="Contraseña actual"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPwd ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4 opacity-40" />
                  )}
                </button>
              </div>
              {/* Nueva contraseña */}
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  placeholder="Nueva contraseña (mín. 6 caracteres)"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 pr-10 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPwd ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4 opacity-40" />
                  )}
                </button>
              </div>
              {/* Confirmar contraseña */}
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  placeholder="Confirmar nueva contraseña"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className={`w-full bg-white/50 dark:bg-slate-800/50 border rounded-xl px-4 py-2 pr-10 text-sm font-bold focus:ring-2 outline-none transition-all ${
                    passwordForm.confirmPassword &&
                    passwordForm.newPassword !== passwordForm.confirmPassword
                      ? 'border-red-400 focus:ring-red-400/50'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-primary/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPwd ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4 opacity-40" />
                  )}
                </button>
              </div>
              {passwordForm.confirmPassword &&
                passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-red-500 font-bold">⚠ Las contraseñas no coinciden</p>
                )}
              <button
                onClick={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  passwordForm.newPassword.length < 6 ||
                  passwordForm.newPassword !== passwordForm.confirmPassword ||
                  !passwordForm.currentPassword
                }
                className="w-full bg-primary text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {isChangingPassword ? 'Actualizando...' : '🔐 Actualizar Contraseña'}
              </button>
            </div>
          )}
        </div>
      </motion.section>

      {/* Student: Navigate to License Approval Progress */}
      {user.role !== 'admin' && (
        <motion.section variants={itemVariants} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Proceso de Licencia
            </h3>
          </div>
          <button
            onClick={() => navigate('/aprobacion')}
            className="w-full glass-card rounded-[2.5rem] p-6 flex items-center justify-between group hover:border-amber-500/30 transition-all border border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                🥊
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900 dark:text-white">Mi Progreso de Licencia</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Video · Manillas · Contacto · Combo Presencial
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
          </button>
        </motion.section>
      )}

      {(user.role === 'admin' || user.email === 'hernandezkevin001998@gmail.com') && (
        <motion.div variants={itemVariants} className="space-y-12">
          {/* Las aprobaciones de pagos se han movido a la página de Planes */}

          {/* Student License Approvals Admin Panel */}
          <section>
            <button
              onClick={() => toggleAdminSection('licencias')}
              className="flex items-center justify-between w-full mb-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Aprobaciones de Licencia
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500/10 text-amber-400 px-4 py-1.5 rounded-xl border border-amber-500/20 text-[11px] font-black tracking-widest uppercase">
                  {
                    pendingApprovals.filter(
                      (a) =>
                        a.step1_status === 'uploaded' ||
                        a.step2_status === 'uploaded' ||
                        a.step3_status === 'uploaded' ||
                        a.step4_status === 'uploaded'
                    ).length
                  }{' '}
                  pendientes
                </span>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedAdminSections.has('licencias') ? 'rotate-90' : ''}`}
                />
              </div>
            </button>
            {expandedAdminSections.has('licencias') && (
              <div className="glass-card rounded-[2.5rem] p-6 max-h-[600px] overflow-y-auto hide-scrollbar">
                {pendingApprovals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-40">
                    <Shield className="w-12 h-12 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">
                      No hay solicitudes
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ✅ Solo mostrar cuando el estudiante ya subió algo que requiera aprobación */}
                    {pendingApprovals
                      .filter(
                        (a) =>
                          a.step1_status === 'uploaded' ||
                          a.step2_status === 'uploaded' ||
                          a.step3_status === 'uploaded' ||
                          a.step4_status === 'uploaded'
                      )
                      .map((approval) => {
                        const stepLabels = [
                          'Video de Presentación',
                          'Manillas',
                          'Contacto',
                          'Combo Presencial',
                        ];
                        const stepsData = [
                          {
                            key: 'step1',
                            status: approval.step1_status,
                            videoUrl: approval.step1_video_url,
                          },
                          { key: 'step2', status: approval.step2_status },
                          { key: 'step3', status: approval.step3_status },
                          { key: 'step4', status: approval.step4_status },
                        ];
                        return (
                          <div
                            key={approval.id}
                            className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-4xl border border-slate-200/50 dark:border-slate-700/50"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-black text-slate-900 dark:text-white text-lg">
                                  {approval.user_name || approval.id}
                                </p>
                                <p className="text-xs text-primary font-bold">
                                  {approval.user_email}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                {stepsData.map((s, i) => (
                                  <div
                                    key={i}
                                    className={`w-4 h-4 rounded-full border ${
                                      s.status === 'approved'
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : s.status === 'uploaded' || s.status === 'pending'
                                          ? 'bg-amber-500 border-amber-500'
                                          : s.status === 'rejected'
                                            ? 'bg-red-500 border-red-500'
                                            : 'bg-slate-700 border-slate-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              {stepsData.map((step, i) => {
                                const stepNum = i + 1;
                                return (
                                  <div
                                    key={step.key}
                                    className={`p-3 rounded-xl border text-sm flex items-center justify-between gap-2 ${
                                      step.status === 'approved'
                                        ? 'border-emerald-500/20 bg-emerald-500/5'
                                        : step.status === 'uploaded'
                                          ? 'border-amber-500/30 bg-amber-500/10'
                                          : step.status === 'rejected'
                                            ? 'border-red-500/20 bg-red-500/5'
                                            : 'border-slate-700/50 bg-slate-900/30 opacity-40'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[9px] font-black uppercase text-slate-400 shrink-0">
                                        P{stepNum}
                                      </span>
                                      <span className="font-bold text-white text-xs truncate">
                                        {stepLabels[i]}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {(step as any).videoUrl && (
                                        <a
                                          href={(step as any).videoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[9px] font-black uppercase border border-blue-500/20"
                                        >
                                          📹 Ver
                                        </a>
                                      )}
                                      {(step.status === 'uploaded' || step.status === 'pending') &&
                                        step.status !== 'approved' &&
                                        step.status !== 'locked' && (
                                          <>
                                            <button
                                              onClick={() =>
                                                handleApproveStep(approval.id, stepNum)
                                              }
                                              className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase"
                                            >
                                              ✅
                                            </button>
                                            {stepNum === 1 && (
                                              <button
                                                onClick={() =>
                                                  handleRejectStep(approval.id, stepNum)
                                                }
                                                className="px-2 py-1 bg-red-500/10 text-red-400 rounded-lg text-[9px] font-black uppercase border border-red-500/20"
                                              >
                                                ❌
                                              </button>
                                            )}
                                          </>
                                        )}
                                      <span
                                        className={`text-[9px] font-black uppercase ${
                                          step.status === 'approved'
                                            ? 'text-emerald-400'
                                            : step.status === 'uploaded'
                                              ? 'text-amber-400'
                                              : step.status === 'rejected'
                                                ? 'text-red-400'
                                                : 'text-slate-600'
                                        }`}
                                      >
                                        {step.status === 'approved'
                                          ? '✅'
                                          : step.status === 'uploaded'
                                            ? '⏳'
                                            : step.status === 'rejected'
                                              ? '❌'
                                              : step.status === 'pending'
                                                ? '⌛'
                                                : '🔒'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* NEW Section: Combo Evaluations (Per Technique) */}
          <section className="mb-12">
            <button
              onClick={() => toggleAdminSection('tecnicas')}
              className="flex items-center justify-between w-full mb-8 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Video className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Evaluación de Técnicas
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-xl border border-indigo-500/20 text-[11px] font-black tracking-widest uppercase">
                  {allComboEvals.filter((e) => e.combo_status === 'uploaded').length} Pendientes
                </span>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedAdminSections.has('tecnicas') ? 'rotate-90' : ''}`}
                />
              </div>
            </button>

            {expandedAdminSections.has('tecnicas') && (
              <div className="space-y-6">
                {allComboEvals.filter(
                  (e) =>
                    e.combo_status === 'uploaded' ||
                    e.manillas_status === 'pending' ||
                    e.contacto_status === 'pending'
                ).length === 0 ? (
                  <div className="text-center py-12 glass-card rounded-[2.5rem] border-dashed border-slate-700/50">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] opacity-40">
                      No hay evaluaciones de técnica pendientes
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {allComboEvals
                      .filter(
                        (e) =>
                          e.combo_status === 'uploaded' ||
                          e.manillas_status === 'pending' ||
                          e.contacto_status === 'pending'
                      )
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="glass-card rounded-[2.5rem] p-8 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/30 transition-all"
                        >
                          <div className="flex flex-col md:flex-row gap-8">
                            {/* Student and Video Side */}
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">
                                    Evaluación de Combo
                                  </p>
                                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                    {ev.combo_name}
                                  </h4>
                                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">
                                    {ev.user_name}
                                  </p>
                                </div>
                              </div>

                              {ev.combo_video_url ? (
                                <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative group">
                                  <video
                                    src={ev.combo_video_url}
                                    controls
                                    className="w-full h-full"
                                  />
                                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                      <Video className="w-3 h-3 text-indigo-400" /> Video del
                                      Estudiante
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="aspect-video bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-800">
                                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
                                    Sin video adjunto
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Approval Methods Side */}
                            <div className="flex-1 flex flex-col gap-6">
                              {(['manillas', 'combo', 'contacto'] as const).map((method) => {
                                const status = ev[`${method}_status`];
                                const feedbackKey = `${ev.id}_${method}`;

                                return (
                                  <div
                                    key={method}
                                    className={`p-5 rounded-4xl border transition-all ${
                                      status === 'approved'
                                        ? 'border-emerald-500/20 bg-emerald-500/5'
                                        : status === 'rejected'
                                          ? 'border-red-500/20 bg-red-500/5'
                                          : 'border-slate-700/50 bg-slate-900/30'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-2 rounded-xl border ${
                                            status === 'approved'
                                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                              : 'bg-slate-800 border-slate-700 text-slate-400'
                                          }`}
                                        >
                                          {method === 'manillas' ? (
                                            <Target className="w-4 h-4" />
                                          ) : method === 'combo' ? (
                                            <Video className="w-4 h-4" />
                                          ) : (
                                            <Flame className="w-4 h-4" />
                                          )}
                                        </div>
                                        <span className="font-black uppercase tracking-widest text-xs text-slate-300">
                                          {method}
                                        </span>
                                      </div>
                                      <span
                                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                          status === 'approved'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : status === 'uploaded'
                                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                              : status === 'rejected'
                                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                : 'bg-slate-800 text-slate-500 border-slate-700'
                                        }`}
                                      >
                                        {status === 'approved'
                                          ? 'Aprobado'
                                          : status === 'uploaded'
                                            ? 'En revisión'
                                            : status === 'rejected'
                                              ? 'Rechazado'
                                              : 'Pendiente'}
                                      </span>
                                    </div>

                                    {status !== 'approved' && (
                                      <div className="space-y-4">
                                        <textarea
                                          value={comboFeedback[feedbackKey] || ''}
                                          onChange={(e) =>
                                            setComboFeedback((prev) => ({
                                              ...prev,
                                              [feedbackKey]: e.target.value,
                                            }))
                                          }
                                          placeholder={`Feedback para ${method}...`}
                                          className="w-full bg-black/50 border border-primary/20 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary h-40 resize-none transition-all shadow-inner"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleApproveComboMethod(ev, method)}
                                            className="flex-1 py-3 bg-emerald-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
                                          >
                                            Aprobar
                                          </button>
                                          <button
                                            onClick={() => handleRejectComboMethod(ev, method)}
                                            className="flex-1 py-3 bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-red-500/20 transition-all"
                                          >
                                            Rechazar
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {status === 'approved' && (
                                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold italic">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Método verificado perfectamente</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <button
              onClick={() => toggleAdminSection('usuarios')}
              className="flex items-center justify-between w-full mb-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Usuarios Registrados
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-xl border border-primary/20 text-[11px] font-black tracking-widest uppercase">
                  {allUsers.length} Total
                </span>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedAdminSections.has('usuarios') ? 'rotate-90' : ''}`}
                />
              </div>
            </button>
            {expandedAdminSections.has('usuarios') && (
              <>
                <motion.div
                  whileHover={{ y: -5 }}
                  className="glass-card rounded-[2.5rem] p-6 max-h-[400px] overflow-y-auto hide-scrollbar"
                >
                  {allUsers.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-12 font-bold uppercase tracking-widest opacity-40">
                      No hay usuarios registrados
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allUsers.map((u) => (
                        <div
                          key={u.id}
                          className="bg-white/40 dark:bg-slate-800/40 p-5 rounded-4xl border border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center group hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-primary font-black text-lg border border-slate-200 dark:border-slate-800">
                              {u.profile_pic ? (
                                <img
                                  src={u.profile_pic}
                                  alt={u.name}
                                  className="w-full h-full object-cover rounded-2xl"
                                />
                              ) : (
                                u.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                {u.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {u.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[9px] uppercase font-black px-3 py-1 rounded-lg tracking-[0.15em] border ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}
                            >
                              {u.role}
                            </span>
                            {u.id !== user.id && u.email !== 'hernandezkevin001998@gmail.com' && (
                              <div className="flex gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    setAdminEditUser(u);
                                    setAdminEditForm({
                                      name: u.name || '',
                                      weight: u.weight || 0,
                                      height: u.height || 0,
                                      newPassword: '',
                                      plan_name: u.plan_name || '',
                                      classes_remaining: u.classes_remaining || 0,
                                      classes_per_month: u.classes_per_month || 0,
                                    });
                                  }}
                                  className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/10"
                                  title="Editar usuario"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setUserToDelete({ id: u.id, name: u.name })}
                                  className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/10"
                                  title="Eliminar usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
                <div className="mt-6 p-6 bg-blue-500/5 rounded-4xl border border-blue-500/10 flex items-start gap-4">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                    Por seguridad de Firebase, las contraseñas y correos solo pueden ser modificados
                    por los propios usuarios desde su cuenta.
                  </p>
                </div>
              </>
            )}
          </section>

          <section className="mb-12">
            <button
              onClick={() => toggleAdminSection('estudiantes')}
              className="flex items-center justify-between w-full mb-8 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Crear Estudiante
                </h3>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedAdminSections.has('estudiantes') ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedAdminSections.has('estudiantes') && (
              <motion.div whileHover={{ y: -5 }} className="glass-card rounded-[2.5rem] p-8">
                <div className="relative">
                  <motion.button
                    style={{ display: !showCreateUser ? 'flex' : 'none' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateUser(true)}
                    className="w-full bg-primary/10 text-primary font-black py-5 rounded-4xl hover:bg-primary/20 transition-all border border-primary/30 items-center justify-center gap-4 uppercase tracking-[0.2em]"
                  >
                    <UserPlus className="w-6 h-6" />
                    <span>Nuevo Estudiante</span>
                  </motion.button>
                  <motion.form
                    style={{ display: showCreateUser ? 'block' : 'none' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: showCreateUser ? 1 : 0, y: showCreateUser ? 0 : 20 }}
                    onSubmit={handleCreateUser}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-4">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-4">
                        Contraseña Temporal
                      </label>
                      <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => setShowCreateUser(false)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-5 rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        Cancelar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="flex-1 bg-primary text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-xl shadow-primary/20"
                      >
                        Crear Cuenta
                      </motion.button>
                    </div>
                  </motion.form>
                </div>
              </motion.div>
            )}
          </section>

          {/* PANEL DE CONTROL DE SECCIONES */}
          <section className="mb-12">
            <button
              onClick={() => toggleAdminSection('secciones')}
              className="flex items-center justify-between w-full mb-8 text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Control de Secciones
                </h3>
              </div>
              <ChevronRight
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedAdminSections.has('secciones') ? 'rotate-90' : ''}`}
              />
            </button>

            {expandedAdminSections.has('secciones') && (
              <motion.div whileHover={{ y: -5 }} className="glass-card rounded-[2.5rem] p-8">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
                  Activa o desactiva secciones para todos los usuarios. Los cambios son inmediatos.
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {(
                    [
                      { key: 'workouts_unlocked', label: 'Entrenamientos', emoji: '💪' },
                      { key: 'technique_unlocked', label: 'Técnica / Saberes', emoji: '🥊' },
                      { key: 'nutrition_unlocked', label: 'Nutrición', emoji: '🥗' },
                      { key: 'challenge_unlocked', label: 'Reto del Día', emoji: '🏆' },
                    ] as const
                  ).map(({ key, label, emoji }) => {
                    const isOn = appSettings[key];
                    const isSpecificToggling = togglingSection === key;
                    return (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isSpecificToggling}
                        onClick={async () => {
                          setTogglingSection(key);
                          try {
                            const ref = doc(db, 'settings', 'global');
                            const snap = await getDoc(ref);
                            const currentVal = snap.exists() ? snap.data()[key] : false;
                            await setDoc(ref, { [key]: !currentVal }, { merge: true });
                          } catch (e) {
                            console.error('Error toggling section:', e);
                          } finally {
                            setTogglingSection(null);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${
                          isOn
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-500'
                        } ${isSpecificToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">{emoji}</span>
                          <span className="font-black uppercase tracking-tight text-base">
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                              isOn
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/20 text-red-500'
                            }`}
                          >
                            {isSpecificToggling ? '...' : isOn ? 'ABIERTO' : 'CERRADO'}
                          </span>
                          {isOn ? (
                            <ToggleRight className="w-8 h-8 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-red-400" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </section>

          {/* La gestión de precios de planes se ha movido a la página de Planes */}
        </motion.div>
      )}

      {user.role === 'student' && (
        <motion.section variants={itemVariants} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Plan Actual
            </h3>
          </div>
          <motion.div
            whileHover={{ y: -5 }}
            className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {user.plan_name || 'Sin Plan Activo'}
                </p>
                {user.plan_status === 'active' && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                      {user.classes_remaining ?? 0} clases restantes este mes
                    </p>
                  </div>
                )}
              </div>
              <span
                className={`text-[11px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest border shadow-lg ${
                  user.plan_status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10'
                    : user.plan_status === 'pending_payment'
                      ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-yellow-500/10'
                      : user.plan_status === 'pending_verification'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/10'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                {user.plan_status === 'active'
                  ? 'Activo'
                  : user.plan_status === 'pending_payment'
                    ? 'Pendiente de Pago'
                    : user.plan_status === 'pending_verification'
                      ? 'En Revisión'
                      : 'Inactivo'}
              </span>
            </div>
            {user.plan_start_date && (
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">
                Miembro desde el{' '}
                <span className="text-slate-900 dark:text-white font-bold">
                  {user.plan_start_date?.toDate
                    ? user.plan_start_date.toDate().toLocaleDateString()
                    : new Date(user.plan_start_date).toLocaleDateString()}
                </span>
              </p>
            )}
            {!user.plan_id && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/plans')}
                className="mt-8 w-full bg-primary text-white font-black py-4 rounded-2xl text-sm uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20"
              >
                Ver Planes Disponibles
              </motion.button>
            )}
          </motion.div>
        </motion.section>
      )}

      <motion.section variants={itemVariants} className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Ajustes
          </h3>
        </div>

        <div className="space-y-6">


          <motion.div
            whileHover={{ x: 5 }}
            className="glass-card rounded-4xl p-6 border border-slate-200 dark:border-slate-700/50"
          >
            <p className="text-sm font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest">
              Soporte y Ayuda
            </p>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="https://wa.me/573022028477"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white p-4 rounded-2xl hover:bg-[#25D366]/90 transition-all shadow-lg shadow-[#25D366]/20"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-black uppercase tracking-widest">WhatsApp Soporte</span>
            </motion.a>
            <p className="text-[10px] text-slate-500 mt-4 text-center uppercase tracking-widest font-bold">
              ¿Tienes dudas o inquietudes? Escríbenos directamente.
            </p>
          </motion.div>

          {user.email === 'hernandezkevin001998@gmail.com' && user.role !== 'admin' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  const userRef = doc(db, 'users', String(user.id));
                  await updateDoc(userRef, { role: 'admin' });
                  setUser({ ...user, role: 'admin' } as any);
                  showAlert(
                    'Éxito',
                    '¡Ahora eres administrador! Recarga la página si es necesario.',
                    'success'
                  );
                } catch (err) {
                  handleFirestoreError(err, 'update', `users/${user.id}`);
                }
              }}
              className="w-full flex items-center justify-center p-5 bg-purple-600 text-white rounded-4xl hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" />
                <span className="text-sm font-black uppercase tracking-widest">
                  Reclamar Permisos de Admin
                </span>
              </div>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-6 glass-card rounded-4xl border border-red-500/20 text-red-500 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest">Cerrar Sesión</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </motion.section>

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

      {/* Edit User Modal (Admin) */}
      <Modal
        isOpen={!!adminEditUser}
        onClose={() => setAdminEditUser(null)}
        title={`Editar a ${adminEditUser?.name}`}
      >
        <form onSubmit={handleAdminSaveUser} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
              Nombre
            </label>
            <input
              type="text"
              value={adminEditForm.name}
              onChange={(e) => setAdminEditForm({ ...adminEditForm, name: e.target.value })}
              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
                Peso (kg)
              </label>
              <input
                type="number"
                value={adminEditForm.weight}
                onChange={(e) =>
                  setAdminEditForm({ ...adminEditForm, weight: Number(e.target.value) })
                }
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
                Altura (cm)
              </label>
              <input
                type="number"
                value={adminEditForm.height}
                onChange={(e) =>
                  setAdminEditForm({ ...adminEditForm, height: Number(e.target.value) })
                }
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
              Plan Actual
            </label>
            <select
              value={adminEditForm.plan_name}
              onChange={(e) => setAdminEditForm({ ...adminEditForm, plan_name: e.target.value })}
              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none mb-4"
            >
              <option value="">Sin Plan</option>
              <option value="Suscripción Mensual">Suscripción Mensual</option>
              <option value="Clase Individual">Clase Individual</option>
              <option value="Plan Básico">Plan Básico</option>
              <option value="Plan Avanzado">Plan Avanzado</option>
              <option value="Plan Personalizado">Plan Personalizado</option>
            </select>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label
                className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block hover:text-primary transition-colors cursor-help"
                title={`Muestra el límite preestablecido de clases que proporciona el plan.\nClases consumidas: ${Math.max(0, adminEditForm.classes_per_month - adminEditForm.classes_remaining)}`}
              >
                Clases Totales (Base)
              </label>
              <input
                type="number"
                value={adminEditForm.classes_per_month}
                onChange={(e) =>
                  setAdminEditForm({ ...adminEditForm, classes_per_month: Number(e.target.value) })
                }
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1 block">
                Clases Restantes
              </label>
              <input
                type="number"
                value={adminEditForm.classes_remaining}
                onChange={(e) =>
                  setAdminEditForm({ ...adminEditForm, classes_remaining: Number(e.target.value) })
                }
                className="w-full bg-slate-100 dark:bg-slate-800/50 border border-emerald-500/30 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4 bg-primary/10 p-2 rounded-lg">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">
              Consumidas:
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {Math.max(0, adminEditForm.classes_per_month - adminEditForm.classes_remaining)}{' '}
              clases de {adminEditForm.classes_per_month}
            </span>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 block">
              Nueva Contraseña (Opcional)
            </label>
            <input
              type="password"
              placeholder="Dejar en blanco para no cambiar"
              value={adminEditForm.newPassword}
              onChange={(e) => setAdminEditForm({ ...adminEditForm, newPassword: e.target.value })}
              className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isAdminSaving}
            className="w-full bg-primary text-white font-black py-4 rounded-xl mt-4 hover:bg-primary-dark transition-colors"
          >
            {isAdminSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">¿Eliminar Usuario?</h3>
            <p className="text-slate-400 text-center text-sm mb-6">
              Estás a punto de eliminar a{' '}
              <span className="text-white font-bold">{userToDelete.name}</span>. Esta acción no se
              puede deshacer. Por seguridad, ingresa tu contraseña de administrador:
            </p>
            <input
              type="password"
              placeholder="Contraseña de admin"
              value={deleteAdminPassword}
              onChange={(e) => setDeleteAdminPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold text-white mb-6 focus:ring-2 focus:ring-red-500/50 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteAdminPassword('');
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
                disabled={isDeletingUser}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeletingUser || !deleteAdminPassword}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {isDeletingUser ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
