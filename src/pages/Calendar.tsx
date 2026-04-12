import React, { useState, useEffect } from 'react';
import { useStore, User } from '../store/useStore';
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  XCircle,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Upload,
  User as UserIcon,
  Star,
  CheckCircle2,
  Info,
  Users,
  Edit2,
  Check as CheckIcon,
  X as XIcon,
  Loader2 as LoaderIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  addDays,
  startOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  differenceInHours,
  isBefore,
  parse,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  setDoc,
  onSnapshot,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { sendPushNotification } from '../lib/fcmService';
import { Modal } from '../components/Modal';
import { sendEmail } from '../lib/email';

interface Availability {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  rules: string;
  materials?: string;
  duration_minutes?: number;
  max_students?: number;
}

interface Class {
  id: number;
  method: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  material: string;
  capacity?: number;
}

interface Booking {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  class_id: string;
  date: string;
  time: string;
  status: string;
  rating?: number;
  feedback?: string;
  created_at?: string;
}

export function Calendar() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const isAdmin = user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com';

  // State
  const [classes, setClasses] = useState<Class[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<Availability | null>(null);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<User[]>([]);
  const [showAddAvailability, setShowAddAvailability] = useState(false);
  const [newAvailability, setNewAvailability] = useState<Partial<Availability>>({
    day_of_week: 'Lunes',
    start_time: '19:00',
    end_time: '21:00',
    title: 'Clase Grupal Boxeo',
    description: 'Entrenamiento técnico y funcional de boxeo con guantes.',
    rules:
      'Qué llevar: Guantes, vendas, hidratación. Cancelación con mínimo 2 horas de anticipación.',
    materials: 'Guantes, vendas, toalla, agua.',
    duration_minutes: 60,
    max_students: 4,
  });
  const [selectedStudentForSchedule, setSelectedStudentForSchedule] = useState<User | null>(null);
  const [scheduleMode, setScheduleMode] = useState<'plan' | 'payment'>('plan');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [newPlanCount, setNewPlanCount] = useState<number>(0);
  const [totalPlanCount, setTotalPlanCount] = useState<number>(0);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info';
    booking?: Booking;
  }>({ show: false, message: '', type: 'info' });
  const [loading, setLoading] = useState(false);
  const [exceptions, setExceptions] = useState<{ slot_id: string; date: string }[]>([]);
  const [confirmTimeSlot, setConfirmTimeSlot] = useState<string | null>(null);
  // T1+T2: Inline admin editing of description and rules
  const [editingField, setEditingField] = useState<'description' | 'rules' | null>(null);
  const [editingFieldValue, setEditingFieldValue] = useState('');
  const handleSaveField = async () => {
    if (!selectedTime || !editingField) return;
    try {
      await updateDoc(doc(db, 'availabilities', selectedTime.id), {
        [editingField]: editingFieldValue,
      });
      setEditingField(null);
    } catch (err) {
      console.error('Error saving field:', err);
    }
  };

  // delete confirmation modal state
  const [deleteSlotConfirm, setDeleteSlotConfirm] = useState<{
    show: boolean;
    slot: (Availability & { activeBookingsCount?: number }) | null;
    mode: 'today_only' | 'permanent';
  }>({ show: false, slot: null, mode: 'permanent' });

  const navigate = useNavigate();

  // Helper for conditional classes
  const cn = (...classes: (string | boolean | undefined | null)[]) =>
    classes.filter(Boolean).join(' ');

  const handleUpdatePlan = async () => {
    if (!selectedStudentForSchedule) return;
    setIsUpdatingPlan(true);
    try {
      const userRef = doc(db, 'users', selectedStudentForSchedule.id);
      await updateDoc(userRef, {
        classes_per_month: totalPlanCount,
        classes_remaining: newPlanCount,
        plan_status: newPlanCount > 0 ? 'active' : 'inactive',
      });
      setSelectedStudentForSchedule({
        ...selectedStudentForSchedule,
        classes_per_month: totalPlanCount,
        classes_remaining: newPlanCount,
        plan_status: newPlanCount > 0 ? 'active' : 'inactive',
      });
      setIsEditingPlan(false);
      setAlertModal({
        show: true,
        message: '✅ Plan y clases restantes actualizados.',
        type: 'success',
      });
    } catch (err) {
      console.error('Error updating plan:', err);
      setAlertModal({ show: true, message: 'Error al actualizar el plan.', type: 'info' });
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const fetchBookings = () => {
    if (!user) return () => {};
    const q = query(collection(db, 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Booking);
      setAllBookings(allData);
    });
    return () => unsubscribe();
  };

  useEffect(() => {
    let targetId = String(user?.id);
    if (isAdmin && selectedStudentForSchedule) {
      targetId = String(selectedStudentForSchedule.id);
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const filtered = allBookings.filter(
      (b) => b.user_id === targetId && b.date >= todayStr && b.status !== 'cancelled'
    );
    setBookings(filtered);
  }, [allBookings, user?.id, selectedStudentForSchedule, isAdmin]);

  const fetchAvailabilities = () => {
    if (!user) return () => {};
    const unsubscribe = onSnapshot(collection(db, 'availabilities'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Availability);
      setAvailabilities(data);
    });
    return () => unsubscribe();
  };

  useEffect(() => {
    if (!user) return;
    const unsubAvail = fetchAvailabilities();
    const unsubBookings = fetchBookings();
    const unsubExceptions = onSnapshot(collection(db, 'availability_exceptions'), (snap) => {
      setExceptions(snap.docs.map((d) => d.data() as { slot_id: string; date: string }));
    });
    let unsubUsers: (() => void) | undefined;
    if (isAdmin) {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const students = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as User)
          .filter((u) => u.role !== 'admin' && u.email && u.name);
        setAllRegisteredUsers(students);
      });
    }
    return () => {
      unsubAvail();
      unsubBookings();
      unsubExceptions();
      if (unsubUsers) unsubUsers();
    };
  }, [user, isAdmin]);

  const getStudentName = (booking: Booking): string => {
    if (booking.user_name && booking.user_name !== 'Estudiante') return booking.user_name;
    const found = allRegisteredUsers.find((u) => u.id === booking.user_id);
    return found?.name || booking.user_name || 'Estudiante';
  };

  const handleBook = async () => {
    const targetUser = isAdmin && selectedStudentForSchedule ? selectedStudentForSchedule : user;
    if (!targetUser || !selectedTime) return;

    const isManualPayment = isAdmin && scheduleMode === 'payment';
    if (!isManualPayment && (targetUser.classes_remaining || 0) <= 0) {
      setAlertModal({
        show: true,
        message: isAdmin
          ? `El estudiante ${targetUser.name} no tiene clases restantes.`
          : 'No tienes clases restantes en tu plan.',
        type: 'info',
      });
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const timeStr = `${selectedTime.start_time} - ${selectedTime.end_time}`;
      const status = isManualPayment ? 'pending_payment' : 'active';

      await addDoc(collection(db, 'bookings'), {
        user_id: String(targetUser.id),
        user_name: targetUser.name,
        user_email: targetUser.email || '',
        class_id: selectedTime.id,
        date: dateStr,
        time: timeStr,
        status: status,
        created_at: new Date().toISOString(),
      });

      if (status === 'active') {
        const newRemaining = Math.max(0, (targetUser.classes_remaining || 0) - 1);
        await updateDoc(doc(db, 'users', targetUser.id), { classes_remaining: newRemaining });
        if (targetUser.id === user?.id) setUser({ ...user!, classes_remaining: newRemaining });

        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #3f83f8; font-size: 28px; font-weight: 900; text-transform: uppercase;">🥊 GUANTES</h1>
                <p style="color: #64748b; font-size: 12px; letter-spacing: 3px;">PARA ENCAJARTE</p>
              </div>
              <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #22c55e;">✅ ¡Clase Confirmada!</h2>
                <p>Hola <strong>${targetUser.name}</strong>, tu reserva para el <strong>${format(selectedDate, "d 'de' MMMM", { locale: es })}</strong> a las <strong>${timeStr}</strong> ha sido exitosa.</p>
              </div>
            </div>
          `;
          await sendEmail(
            targetUser.email || '',
            '📅 Clase Confirmada — Guantes Para Encajarte',
            emailHtml
          );
          await sendPushNotification(
            targetUser.id,
            '✅ Clase Confirmada',
            `Tu reserva para el ${format(selectedDate, "d 'de' MMMM", { locale: es })} a las ${timeStr} ha sido exitosa.`
          );
        } catch (e) {
          console.warn('Booking notification error:', e);
        }
      }

      setAlertModal({ show: true, message: '✅ Reserva exitosa.', type: 'success' });
      setConfirmTimeSlot(null);
      setSelectedTime(null);
      setShowMyBookings(true);
    } catch (err: any) {
      setAlertModal({ show: true, message: 'Error: ' + err.message, type: 'info' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('¿Deseas cancelar esta reserva?')) return;
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        await updateDoc(bookingRef, { status: 'cancelled' });
        if (bookingData.status === 'active') {
          const userRef = doc(db, 'users', bookingData.user_id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const newRemaining = (userSnap.data().classes_remaining || 0) + 1;
            await updateDoc(userRef, { classes_remaining: newRemaining });
            if (bookingData.user_id === user?.id)
              setUser({ ...user!, classes_remaining: newRemaining });
          }
        }
      }
      setAlertModal({ show: true, message: 'Reserva cancelada.', type: 'info' });

      // Notificaciones de cancelación
      try {
        const bookingData = (await getDoc(doc(db, 'bookings', bookingId))).data();
        if (bookingData) {
          const cancelEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 16px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ef4444; font-size: 28px; font-weight: 900; text-transform: uppercase;">🥊 GUANTES</h1>
                <p style="color: #64748b; font-size: 12px; letter-spacing: 3px;">PARA ENCAJARTE</p>
              </div>
              <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #ef4444;">❌ Clase Cancelada</h2>
                <p>Tu reserva para el <strong>${bookingData.date}</strong> a las <strong>${bookingData.time}</strong> ha sido cancelada.</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 16px;">Se ha devuelto la clase a tu plan si era una reserva activa.</p>
              </div>
            </div>
          `;
          await sendEmail(
            bookingData.user_email || '',
            '❌ Clase Cancelada — Guantes Para Encajarte',
            cancelEmailHtml
          );
          await sendPushNotification(
            bookingData.user_id,
            '❌ Clase Cancelada',
            `Tu reserva para el ${bookingData.date} ha sido cancelada.`
          );
        }
      } catch (e) {
        console.warn('Cancellation notification error:', e);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSlotPermanent = async () => {
    const slot = deleteSlotConfirm.slot;
    if (!slot) return;
    try {
      const sameSlots = availabilities.filter(
        (a) =>
          a.day_of_week === slot.day_of_week &&
          a.start_time === slot.start_time &&
          a.end_time === slot.end_time
      );
      for (const s of sameSlots) {
        await deleteDoc(doc(db, 'availabilities', s.id));
      }
      setDeleteSlotConfirm({ show: false, slot: null, mode: 'permanent' });
      setAlertModal({
        show: true,
        message: `✅ Horario eliminado correctamente.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Error deleting slot:', err);
    }
  };

  const handleDeleteSlotToday = async () => {
    const slot = deleteSlotConfirm.slot;
    if (!slot) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await addDoc(collection(db, 'availability_exceptions'), {
        slot_id: slot.id,
        date: dateStr,
        created_at: serverTimestamp(),
      });
      setDeleteSlotConfirm({ show: false, slot: null, mode: 'today_only' });
      setAlertModal({
        show: true,
        message: `✅ Horario ocultado solo para el ${dateStr}.`,
        type: 'success',
      });
    } catch (err) {
      console.error('Error creating exception:', err);
    }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(currentMonth, { weekStartsOn: 0 });
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [currentMonth]);

  const availableSlotsWithCounts = (() => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const rawSlots = availabilities.filter(
      (a) => a.day_of_week === dayNames[selectedDate.getDay()]
    );
    const dedupedSlots = [];
    const seenTimes = new Set();
    
    // Sort so valid slots come before corrupted slots ('00:00'), ensuring validity wins in the Set
    rawSlots.sort((a, b) => {
      const aStart = (a.start_time || '').trim();
      const bStart = (b.start_time || '').trim();
      if (aStart === bStart) {
        if (a.end_time === '00:00') return 1;
        if (b.end_time === '00:00') return -1;
      }
      return 0;
    });

    for (const slot of rawSlots) {
      const cleanStartTime = (slot.start_time || '').trim();
      const cleanEndTime = (slot.end_time || '').trim();
      // Omitir slots corruptos y deduplicar
      if (!seenTimes.has(cleanStartTime) && cleanEndTime !== '00:00' && cleanEndTime !== '24:00') {
        seenTimes.add(cleanStartTime);
        dedupedSlots.push(slot);
      }
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const filteredSlots = dedupedSlots.filter(
      (slot) => !exceptions.some((ex) => ex.slot_id === slot.id && ex.date === dateStr)
    );
    return filteredSlots
      .map((a) => {
        const activeOnDate = allBookings.filter(
          (b) => b.class_id === a.id && b.date === dateStr && b.status !== 'cancelled'
        );
        return { ...a, activeBookingsCount: activeOnDate.length, activeBookings: activeOnDate };
      })
      .sort((a, b) => (a.start_time || '').trim().localeCompare((b.start_time || '').trim()));
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-6 pb-24 w-full">
      <div className="w-full max-w-[1200px] mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-2xl transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              Guantes Para Encajarte
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Calendario de Sesiones
            </p>
          </div>
          <button
            onClick={() => setShowMyBookings(!showMyBookings)}
            className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-2xl transition-all relative"
          >
            <CalendarIcon
              className={cn(
                'w-5 h-5 transition-colors',
                showMyBookings ? 'text-primary' : 'text-slate-400'
              )}
            />
            {bookings.length > 0 && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Admin Section (Maestro) */}
        {isAdmin && !showMyBookings && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-[0.2em] text-white">
                  Panel Administrativo
                </h2>
              </div>
              <button
                onClick={() => {
                  setEditingAvailabilityId(null);
                  setShowAddAvailability(true);
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                + Nuevo Horario Maestro
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Estudiante Seleccionado
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-primary transition-all appearance-none"
                  value={selectedStudentForSchedule?.id || ''}
                  onChange={(e) =>
                    setSelectedStudentForSchedule(
                      allRegisteredUsers.find((u) => u.id === e.target.value) || null
                    )
                  }
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233f83f8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1.25rem center',
                    backgroundSize: '1rem',
                  }}
                >
                  <option value="">-- Reserva Directa Admin --</option>
                  {allRegisteredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Rest: {u.classes_remaining || 0})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudentForSchedule && (
                <div className="bg-slate-950/50 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary mb-1">
                        Estado de Clases
                      </p>
                      <p className="text-xl font-black italic">
                        {selectedStudentForSchedule.classes_remaining || 0} /{' '}
                        {selectedStudentForSchedule.classes_per_month || 0}
                      </p>
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-xl">
                      <button
                        onClick={() => setScheduleMode('plan')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all',
                          scheduleMode === 'plan' ? 'bg-primary text-white' : 'text-slate-500'
                        )}
                      >
                        Plan
                      </button>
                      <button
                        onClick={() => setScheduleMode('payment')}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all',
                          scheduleMode === 'payment' ? 'bg-amber-600 text-white' : 'text-slate-500'
                        )}
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNewPlanCount(selectedStudentForSchedule.classes_remaining || 0);
                      setTotalPlanCount(selectedStudentForSchedule.classes_per_month || 0);
                      setIsEditingPlan(true);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-400 flex items-center justify-center gap-2 border border-slate-800"
                  >
                    <Edit2 className="w-3 h-3" /> Editar Plan del Alumno
                  </button>
                </div>
              )}
            </div>

            {isEditingPlan && selectedStudentForSchedule && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="pt-4 border-t border-slate-800 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">
                      Clases Totales
                    </label>
                    <input
                      type="number"
                      value={totalPlanCount}
                      onChange={(e) => setTotalPlanCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">
                      Restantes
                    </label>
                    <input
                      type="number"
                      value={newPlanCount}
                      onChange={(e) => setNewPlanCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdatePlan}
                    disabled={isUpdatingPlan}
                    className="flex-1 bg-primary py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
                  >
                    {isUpdatingPlan ? (
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                  <button
                    onClick={() => setIsEditingPlan(false)}
                    className="px-6 bg-slate-800 rounded-xl text-xs font-bold"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Main Content Area: Split View */}
        <div className="bg-slate-900/30 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm min-h-[600px] flex flex-col md:flex-row">
          {showMyBookings ? (
            <div className="w-full p-8 sm:p-12 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">
                  Mis Próximas Clases
                </h2>
                <button
                  onClick={() => setShowMyBookings(false)}
                  className="text-[10px] font-black uppercase text-primary hover:underline"
                >
                  Volver a Reservar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center opacity-20">
                    <CalendarIcon className="w-16 h-16 mb-4" />
                    <p className="text-sm font-black uppercase italic tracking-[0.3em]">
                      No hay reservas para mostrar
                    </p>
                  </div>
                ) : (
                  bookings.map((b) => (
                    <motion.div
                      key={b.id}
                      whileHover={{ y: -5 }}
                      className="bg-slate-950 p-6 rounded-4xl border border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <span className="px-2 py-1 bg-slate-900 rounded-lg text-[8px] font-black uppercase text-slate-500 border border-slate-800">
                            Confirmado
                          </span>
                        </div>
                        <h4 className="text-xl font-black italic uppercase tracking-tighter mb-1">
                          {format(parse(b.date, 'yyyy-MM-dd', new Date()), "EEEE d 'de' MMMM", {
                            locale: es,
                          })}
                        </h4>
                        <p className="text-sm font-bold text-slate-500 flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4 text-primary" /> {b.time}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        className="mt-8 w-full py-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancelar Reserva
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Column 1: Event Details (Calendly Left Sidebar) */}
              <div className="w-full md:w-80 lg:w-[400px] bg-slate-950/40 p-8 sm:p-12 border-b md:border-b-0 md:border-r border-slate-800 space-y-8 flex flex-col">
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-primary/20 rounded-4xl flex items-center justify-center border border-primary/30 shadow-xl shadow-primary/10">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-2 leading-tight">
                      {selectedTime?.title || 'Clase de Boxeo GPTE'}
                    </h2>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="font-bold text-sm tracking-widest uppercase">
                        {selectedTime?.duration_minutes || 60} MIN
                      </span>
                    </div>
                  </div>

                    <div className="space-y-6 pt-4">
                      {/* DESCRIPTION */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] flex items-center gap-2">
                            <Info className="w-3 h-3" /> Descripción
                          </p>
                          {isAdmin && selectedTime && editingField !== 'description' && (
                            <button
                              onClick={() => {
                                setEditingField('description');
                                setEditingFieldValue(selectedTime.description || '');
                              }}
                              className="text-primary/60 hover:text-primary transition-colors"
                              title="Editar descripción"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingField === 'description' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingFieldValue}
                              onChange={(e) => setEditingFieldValue(e.target.value)}
                              className="w-full bg-slate-800 border border-primary/30 rounded-xl px-3 py-2 text-sm text-white resize-none h-24 outline-none focus:border-primary"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={handleSaveField} className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-black uppercase">Guardar</button>
                              <button onClick={() => setEditingField(null)} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed text-slate-400 italic">
                            {selectedTime?.description || 'Sesión técnica y física diseñada por Coach GPTE para mejorar tu golpeo, reflejos y resistencia cardiovascular.'}
                          </p>
                        )}
                      </div>

                      {/* RULES — siempre visibles */}
                      <div className="space-y-2 pt-4 border-t border-slate-800/50">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">
                            📋 Reglas Importantes
                          </p>
                          {isAdmin && selectedTime && editingField !== 'rules' && (
                            <button
                              onClick={() => {
                                setEditingField('rules');
                                setEditingFieldValue(selectedTime.rules || '');
                              }}
                              className="text-emerald-500/60 hover:text-emerald-400 transition-colors"
                              title="Editar reglas"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {editingField === 'rules' ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingFieldValue}
                              onChange={(e) => setEditingFieldValue(e.target.value)}
                              className="w-full bg-slate-800 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white resize-none h-24 outline-none focus:border-emerald-500"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button onClick={handleSaveField} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black uppercase">Guardar</button>
                              <button onClick={() => setEditingField(null)} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed text-slate-500 whitespace-pre-line">
                            {selectedTime?.rules || '• Cancelación con mínimo 2 horas de anticipación.\n• Llegar 5 minutos antes.\n• Traer guantes, vendas e hidratación.'}
                          </p>
                        )}
                      </div>

                      {/* MATERIALS */}
                      {selectedTime?.materials && (
                        <div className="space-y-1 pt-4 border-t border-slate-800/50">
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em]">
                            Materiales Necesarios
                          </p>
                          <p className="text-xs leading-relaxed text-slate-500">
                            {selectedTime.materials}
                          </p>
                        </div>
                      )}
                    </div>
                </div>

                <div className="mt-auto pt-8 flex items-center gap-4 border-t border-slate-800/50">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1549476464-37392f717551?auto=format&fit=crop&q=80&w=100&h=100"
                      className="w-full h-full object-cover grayscale opacity-50"
                      alt="Coach"
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Reserva con</p>
                    <p className="text-xs font-black uppercase text-slate-300">Coach Kevin H.</p>
                  </div>
                </div>
              </div>

              {/* Column 2: Date and Time Picker (Calendly Grid) */}
              <div className="flex-1 p-8 sm:p-12 flex flex-col lg:flex-row gap-12 bg-slate-900/20">
                {/* Calendar Grid (Calendly Style) */}
                <div className="flex-1 space-y-8 animate-in fade-in duration-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase italic tracking-[0.2em] text-white">
                      Selecciona Fecha
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={prevMonth}
                        className="p-2.5 hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-2.5 hover:bg-slate-800 rounded-xl transition-all border border-slate-800"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-lg font-black text-slate-400 uppercase tracking-widest">
                      {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </p>

                    <div className="grid grid-cols-7 gap-3 sm:gap-4">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <div
                          key={i}
                          className="text-[10px] font-black text-slate-600 text-center py-2 h-10 flex items-center justify-center"
                        >
                          {d}
                        </div>
                      ))}

                      {calendarDays.map((day, i) => {
                        const isCurrent = isSameMonth(day, currentMonth);
                        const isSelected = isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const isBlocked = day.getDay() === 2 || day.getDay() === 6;
                        const isPast = isBefore(day, new Date()) && !isToday;

                        if (!isCurrent) return <div key={i} className="aspect-square" />;

                        return (
                          <motion.button
                            key={i}
                            whileHover={!isBlocked && !isPast ? { scale: 1.1 } : {}}
                            whileTap={!isBlocked && !isPast ? { scale: 0.95 } : {}}
                            onClick={() => {
                              setSelectedDate(day);
                              setConfirmTimeSlot(null);
                            }}
                            className={cn(
                              'aspect-square rounded-full flex flex-col items-center justify-center text-base font-black transition-all relative group',
                              isSelected
                                ? 'bg-primary text-white shadow-2xl shadow-primary/30 z-10 scale-110'
                                : isBlocked || isPast
                                  ? 'text-slate-850 pointer-events-none opacity-20'
                                  : 'text-slate-100 hover:bg-primary/20 hover:text-primary border border-transparent hover:border-primary/30'
                            )}
                          >
                            <span className={cn(isToday && !isSelected && 'text-primary')}>
                              {format(day, 'd')}
                            </span>
                            {isToday && !isSelected && (
                              <div className="absolute bottom-2 w-1 h-1 bg-primary rounded-full" />
                            )}
                            {!isBlocked && !isPast && !isSelected && (
                              <div className="absolute -bottom-1 w-1.5 h-1.5 bg-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Time Slots (Calendly Style Right Bar) */}
                <div className="w-full lg:w-72 space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black uppercase italic tracking-[0.2em] text-white leading-none">
                      {format(selectedDate, 'EEEE d', { locale: es })}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-2 tracking-widest">
                      Disponibilidad
                    </p>
                  </div>

                  {selectedDate.getDay() === 2 || selectedDate.getDay() === 6 ? (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-950/20 rounded-3xl border border-slate-800/50">
                      <AlertCircle className="w-12 h-12 text-slate-800 mb-4" />
                      <p className="text-[10px] font-black uppercase text-slate-700 tracking-widest">
                        Cerrado
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                      {availableSlotsWithCounts.length === 0 ? (
                        <div className="py-20 text-center text-slate-600 italic text-sm">
                          Pronto tendremos horarios para este día
                        </div>
                      ) : (
                        availableSlotsWithCounts.map((slot) => {
                          const isSlotSelected = selectedTime?.id === slot.id;
                          const isSlotConfirming = confirmTimeSlot === slot.id;
                          const isFull = slot.activeBookingsCount >= (slot.max_students || 4);

                          if (isFull && !isAdmin) return null;

                          return (
                            <div key={slot.id} className="relative group">
                              <div className="flex gap-2">
                                <motion.button
                                  layout
                                  onClick={() => {
                                    setSelectedTime(slot);
                                    setConfirmTimeSlot(isSlotConfirming ? null : slot.id);
                                  }}
                                  className={cn(
                                    'flex-1 py-4 text-sm font-black rounded-xl border-2 transition-all duration-300',
                                    isSlotConfirming
                                      ? 'w-[45%] bg-slate-800 border-slate-700 text-slate-500'
                                      : isSlotSelected
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-transparent border-primary/30 text-primary hover:border-primary hover:bg-primary/5'
                                  )}
                                >
                                  {slot.start_time}
                                </motion.button>

                                <AnimatePresence>
                                  {isSlotConfirming && (
                                    <motion.button
                                      initial={{ scaleX: 0, opacity: 0 }}
                                      animate={{ scaleX: 1, opacity: 1 }}
                                      exit={{ scaleX: 0, opacity: 0 }}
                                      onClick={handleBook}
                                      disabled={loading}
                                      className="flex-1 bg-primary text-white py-4 px-6 rounded-xl text-xs font-black uppercase shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all"
                                    >
                                      {loading ? (
                                        <LoaderIcon className="w-5 h-5 animate-spin mx-auto" />
                                      ) : (
                                        'Confirmar'
                                      )}
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </div>

                              {isAdmin && (
                                <div className="mt-3 space-y-3">
                                  <div className="flex items-center justify-between px-2 text-[9px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-3 h-3 text-slate-500" />
                                      <span
                                        className={cn(isFull ? 'text-red-500' : 'text-emerald-500')}
                                      >
                                        {slot.activeBookingsCount}/{slot.max_students || 4}{' '}
                                        Estudiantes
                                      </span>
                                    </div>
                                    <div className="flex gap-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAvailabilityId(slot.id);
                                          setNewAvailability({ ...slot });
                                          setShowAddAvailability(true);
                                        }}
                                        className="text-slate-600 hover:text-primary transition-colors"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteSlotConfirm({
                                            show: true,
                                            slot: slot,
                                            mode: 'permanent',
                                          });
                                        }}
                                        className="text-slate-600 hover:text-red-500 transition-colors"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  </div>

                                  {/* Student Names List (Admin Only) */}
                                  {slot.activeBookings && slot.activeBookings.length > 0 && (
                                    <div className="px-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                                      {slot.activeBookings.map((b: Booking) => (
                                        <div
                                          key={b.id}
                                          className="flex items-center justify-between bg-slate-950/50 border border-slate-800/50 rounded-xl p-2 group/student"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                                              {getStudentName(b).charAt(0)}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                                              {getStudentName(b)}
                                            </span>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelBooking(b.id);
                                            }}
                                            className="opacity-0 group-hover/student:opacity-100 p-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                            title="Eliminar y devolver crédito"
                                          >
                                            <XIcon className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Booking Status Modal */}
      <Modal
        isOpen={alertModal.show}
        onClose={() => setAlertModal({ ...alertModal, show: false })}
        title="Notificación GPTE"
      >
        <div className="p-6 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto border border-primary/20">
            {alertModal.type === 'success' ? (
              <CheckCircle className="w-10 h-10 text-primary" />
            ) : (
              <Info className="w-10 h-10 text-primary" />
            )}
          </div>
          <p className="text-lg font-bold text-slate-100">{alertModal.message}</p>
          <button
            onClick={() => setAlertModal({ ...alertModal, show: false })}
            className="w-full py-4 bg-primary rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
          >
            Entendido
          </button>
        </div>
      </Modal>

      {/* Add/Edit Availability Modal (Maestro) */}
      <Modal
        isOpen={showAddAvailability}
        onClose={() => setShowAddAvailability(false)}
        title={editingAvailabilityId ? 'Editar Horario Recurrente' : 'Programar Nuevo Horario'}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editingAvailabilityId) {
                await updateDoc(doc(db, 'availabilities', editingAvailabilityId), newAvailability);
              } else {
                await addDoc(collection(db, 'availabilities'), newAvailability);
              }
              setAlertModal({
                show: true,
                message: '✅ Horario actualizado con éxito.',
                type: 'success',
              });
              setShowAddAvailability(false);
              setEditingAvailabilityId(null);
            } catch (err: any) {
              alert(err.message);
            }
          }}
          className="p-2 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar"
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Día de la Semana
              </label>
              <select
                value={newAvailability.day_of_week}
                onChange={(e) =>
                  setNewAvailability({ ...newAvailability, day_of_week: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
              >
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Inicio
                </label>
                <input
                  type="time"
                  value={newAvailability.start_time}
                  onChange={(e) =>
                    setNewAvailability({ ...newAvailability, start_time: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Fin</label>
                <input
                  type="time"
                  value={newAvailability.end_time}
                  onChange={(e) =>
                    setNewAvailability({ ...newAvailability, end_time: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Título de la Sesión
              </label>
              <input
                type="text"
                value={newAvailability.title || ''}
                onChange={(e) => setNewAvailability({ ...newAvailability, title: e.target.value })}
                placeholder="Ej: Clase de Boxeo Intermedia"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Duración (min)
                </label>
                <input
                  type="number"
                  value={newAvailability.duration_minutes || 60}
                  onChange={(e) =>
                    setNewAvailability({
                      ...newAvailability,
                      duration_minutes: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  Cupo Máximo
                </label>
                <input
                  type="number"
                  value={newAvailability.max_students || 4}
                  onChange={(e) =>
                    setNewAvailability({ ...newAvailability, max_students: Number(e.target.value) })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Descripción
              </label>
              <textarea
                value={newAvailability.description || ''}
                onChange={(e) =>
                  setNewAvailability({ ...newAvailability, description: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm min-h-[100px]"
                placeholder="¿De qué trata la clase?"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Reglas & Cancelación
              </label>
              <textarea
                value={newAvailability.rules || ''}
                onChange={(e) => setNewAvailability({ ...newAvailability, rules: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm min-h-[80px]"
                placeholder="Ej: Cancelación con 2h de anticipación..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                Materiales Necesarios
              </label>
              <textarea
                value={newAvailability.materials || ''}
                onChange={(e) =>
                  setNewAvailability({ ...newAvailability, materials: e.target.value })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white text-sm min-h-[80px]"
                placeholder="Ej: Guantes, vendas, hidratación..."
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Guardar Configuración
          </button>
        </form>
      </Modal>

      {/* Delete/Hide Slot Modal */}
      <Modal
        isOpen={deleteSlotConfirm.show}
        onClose={() => setDeleteSlotConfirm({ show: false, slot: null, mode: 'permanent' })}
        title="Gestión de Disponibilidad"
      >
        <div className="p-4 space-y-6">
          <p className="text-center text-slate-400 text-sm">
            ¿Cómo quieres gestionar este horario para el{' '}
            <strong>{format(selectedDate, "d 'de' MMMM", { locale: es })}</strong>?
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleDeleteSlotToday}
              className="w-full py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-amber-500 hover:text-white transition-all"
            >
              <XCircle className="w-5 h-5" /> Quitar Solo Por Hoy
            </button>
            <button
              onClick={handleDeleteSlotPermanent}
              className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 className="w-5 h-5" /> Eliminar Permanentemente
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
