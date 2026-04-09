import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, updateDoc, setDoc, getDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ArrowLeft, CreditCard, Smartphone, Check, ShieldCheck, Zap, Star, Trophy, Flame, Edit2, Save, Clock, MessageCircle, Calendar as CalendarIcon, Upload, Loader2, CheckCircle2, Info, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_personalizada: number;
  price_decisao: number;
  icon: string;
  classes_per_month: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  number: string;
}

interface Availability {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  title: string;
}

export function Plans() {
  const { data: plansData, loading: plansLoading } = useRealtimeCollection<Plan>('plans');
  const { data: methodsData, loading: methodsLoading } = useRealtimeCollection<PaymentMethod>('payment_methods');
  const { data: availabilitiesData } = useRealtimeCollection<Availability>('availabilities');
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const { data: bookingsData } = useRealtimeCollection<{class_id: string, date: string, status: string}>('bookings');
  
  const user = useStore((state) => state.user);
  const navigate = useNavigate();

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const allowedClasses = selectedPlan ? (selectedPlan.classes_per_month || (selectedPlan.name.toLowerCase().includes('individual') || selectedPlan.name.toLowerCase().includes('personalizad') ? 1 : 4)) : 1;
  const [selectedDateMode, setSelectedDateMode] = useState<'personalizada' | 'decisao'>('decisao');
  const [selectedClasses, setSelectedClasses] = useState<{date: Date, avail: Availability}[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Payment State
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (plansData.length > 0) {
      setPlans([...plansData].sort((a, b) => parseInt(a.id) - parseInt(b.id)));
    }
  }, [plansData]);

  useEffect(() => {
    if (methodsData.length > 0) {
      setPaymentMethods(methodsData);
    }
  }, [methodsData]);

  useEffect(() => {
    if (availabilitiesData.length > 0) {
      setAvailabilities(availabilitiesData);
    }
  }, [availabilitiesData]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-10 h-10 text-primary" />;
      case 'Star': return <Star className="w-10 h-10 text-primary" />;
      case 'Trophy': return <Trophy className="w-10 h-10 text-primary" />;
      case 'Flame': return <Flame className="w-10 h-10 text-primary" />;
      case 'Timer': return <Clock className="w-10 h-10 text-primary" />;
      default: return <Zap className="w-10 h-10 text-primary" />;
    }
  };

  const handleSelectPlan = (plan: Plan, mode: 'personalizada' | 'decisao') => {
    setSelectedPlan(plan);
    setSelectedDateMode(mode);
    setSelectedClasses([]);
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClassSelection = (date: Date, avail: Availability) => {
    if (!selectedPlan) return;
    
    const existingIndex = selectedClasses.findIndex(c => isSameDay(c.date, date) && c.avail.id === avail.id);
    if (existingIndex >= 0) {
      setSelectedClasses(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      if (selectedClasses.length < allowedClasses) {
        setSelectedClasses(prev => [...prev, { date, avail }]);
      } else {
        alert(`Ya has seleccionado las ${allowedClasses} clases permitidas por tu plan.`);
      }
    }
  };

  const currentPrice = selectedPlan 
    ? (selectedDateMode === 'personalizada' ? selectedPlan.price_personalizada : selectedPlan.price_decisao) 
    : 0;

  // ── Descuento automático 10% para nuevos estudiantes con plan ≥ 12 clases ──
  const isNewStudent = (() => {
    if (!user || !user.created_at) return false;
    const createdAt = user.created_at?.toDate ? user.created_at.toDate() : new Date(user.created_at);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return createdAt >= threeMonthsAgo;
  })();

  const qualifiesForDiscount = isNewStudent && selectedPlan && (selectedPlan.classes_per_month || 0) >= 12;
  const discountPercent = qualifiesForDiscount ? 10 : 0;
  const discountAmount = Math.round(currentPrice * discountPercent / 100);
  const finalPrice = currentPrice - discountAmount;

  const handlePaymentSubmit = async () => {
    if (!user || !selectedPlan || !paymentFile || selectedClasses.length === 0) return;
    
    setIsUploading(true);
    try {
      // 1. Convertir imagen a base64 para evitar errores de Firebase Storage
      const receiptBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(paymentFile);
      });

      // 2. Actualizar plan del usuario con la imagen en base64
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        plan_status: 'pending_approval',
        classes_per_month: allowedClasses,
        classes_remaining: allowedClasses,
        receipt_url: receiptBase64,
        receipt_filename: paymentFile.name,
        receipt_uploaded_at: serverTimestamp(),
      });

      // 3. Crear Reservas (estado pending)
      for (const cls of selectedClasses) {
        await addDoc(collection(db, 'bookings'), {
          user_id: user.id,
          user_name: user.name,
          user_email: user.email || '',
          class_id: cls.avail.id,
          date: format(cls.date, 'yyyy-MM-dd'),
          time: `${cls.avail.start_time} - ${cls.avail.end_time}`,
          status: 'pending',
          created_at: serverTimestamp(),
          receipt_filename: paymentFile.name,
        });
      }

      // 4. Registrar descuento si aplica
      if (qualifiesForDiscount) {
        await addDoc(collection(db, 'payments'), {
          user_id: user.id,
          user_name: user.name,
          user_email: user.email || '',
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          original_price: currentPrice,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          final_price: finalPrice,
          discount_reason: 'Descuento nuevo estudiante 10% — plan 12+ clases primeros 3 meses',
          classes_per_month: allowedClasses,
          status: 'submitted',
          submitted_at: serverTimestamp(),
          payment_mode: selectedDateMode,
        });
      }

      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      alert('Hubo un error al enviar el comprobante: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleWhatsAppBypass = async () => {
    if (!user || !selectedPlan || selectedClasses.length === 0) return;
    setIsUploading(true);
    try {
      const userRef = doc(db, 'users', String(user.id));
      await updateDoc(userRef, {
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        plan_status: 'pending_approval',
        classes_per_month: allowedClasses,
        classes_remaining: allowedClasses,
        receipt_url: 'whatsapp_pending'
      });

      for (const cls of selectedClasses) {
        await addDoc(collection(db, 'bookings'), {
          user_id: user.id,
          user_name: user.name,
          class_id: cls.avail.id,
          date: format(cls.date, 'yyyy-MM-dd'),
          time: cls.avail.start_time,
          status: 'pending',
          created_at: serverTimestamp(),
          receipt_url: 'whatsapp_pending'
        });
      }

      const message = `Hola, mi nombre es ${user.name}. Acabo de solicitar el plan ${selectedPlan.name} en la app y por aquí adjuntaré mi comprobante de pago.`;
      window.open(`https://wa.me/573022028477?text=${encodeURIComponent(message)}`, '_blank');
      
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error in WhatsApp bypass:', error);
      alert('Error en el sistema de reservas: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const simulateAdminApproval = async () => {
    if (!user || !selectedPlan) return;
    try {
      const userRef = doc(db, 'users', String(user.id));
      await updateDoc(userRef, {
        plan_status: 'active'
      });
      // Also update pending bookings
      // Done in a real backend, but for simulation we just change UI state
      setCurrentStep(5);
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar Helpers for Step 2
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  const dayNamesES = {
    'lunes': 'Lunes', 'martes': 'Martes', 'miércoles': 'Miércoles', 'miercoles': 'Miércoles', 
    'jueves': 'Jueves', 'viernes': 'Viernes', 'sábado': 'Sábado', 'sabado': 'Sábado', 'domingo': 'Domingo'
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 pb-24 font-sans">
      
      {/* Header App / Stepper */}
      <div className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md pt-8 pb-4 px-6 border-b border-white/10 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => currentStep > 1 && currentStep < 4 ? setCurrentStep(currentStep - 1) : navigate(-1)} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 dark:bg-slate-900/10 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 hover:bg-white/20 transition-all shadow-md"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex gap-2 isolate">
            {[1, 2, 3, 4, 5].map(step => (
              <div key={step} className={`w-10 h-2 rounded-full transition-all duration-500 ${currentStep >= step ? 'bg-primary shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-300 dark:bg-slate-800'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        
        <AnimatePresence mode="wait">
          {/* STEP 1: ELEGIR PLAN */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div>
                <h1 className="text-6xl font-black uppercase tracking-tighter italic leading-[0.85] text-slate-900 dark:text-white mb-4">
                  Elige tu <br /> <span className="text-primary drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">Plan</span>
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.3em] text-[11px] opacity-80">
                  Selecciona la membresía que mejor se ajuste a tus objetivos
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan) => (
                  <motion.div 
                    key={plan.id}
                    whileHover={{ y: -5 }}
                    className="glass-card rounded-[3rem] p-8 flex flex-col gap-8 transition-all duration-500 border-white/20 dark:border-slate-800/50 shadow-2xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150" />
                    
                    <div className="flex items-center gap-6 relative z-10">
                      <div className="w-20 h-20 bg-slate-100/50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 group-hover:scale-110 transition-transform">
                        {getIcon(plan.icon)}
                      </div>
                      <div>
                        <h3 className="font-black text-2xl italic uppercase tracking-tight text-slate-900 dark:text-white leading-tight">{plan.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">{plan.classes_per_month} Clases / Mes</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      {/* Personalizada Box */}
                      <button 
                        onClick={() => handleSelectPlan(plan, 'personalizada')}
                        className="bg-white/30 dark:bg-slate-900/40 p-5 rounded-3xl border border-white/20 dark:border-slate-800/50 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/30 transition-all text-left group/btn"
                      >
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 opacity-80 group-hover/btn:text-primary transition-colors">Personalizada</span>
                        <span className="text-xl md:text-2xl font-black text-primary tracking-tighter">${plan.price_personalizada.toLocaleString()}</span>
                      </button>
                      
                      {/* Decisao Box */}
                      <button 
                        onClick={() => handleSelectPlan(plan, 'decisao')}
                        className="bg-white/30 dark:bg-slate-900/40 p-5 rounded-3xl border border-white/20 dark:border-slate-800/50 hover:bg-purple-500/5 dark:hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left group/btn"
                      >
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 opacity-80 group-hover/btn:text-purple-500 transition-colors">Sede Decisao</span>
                        <span className="text-xl md:text-2xl font-black text-purple-500 tracking-tighter">${plan.price_decisao.toLocaleString()}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: RESERVAR CLASES */}
          {currentStep === 2 && selectedPlan && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="glass-card rounded-[2rem] p-6 border-white/20 dark:border-slate-800/50 flex justify-between items-center shadow-lg">
                <div>
                  <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Plan Seleccionado</h3>
                  <p className="text-xl font-black text-white italic tracking-tight uppercase">{selectedPlan.name} <span className="text-primary">• {selectedDateMode}</span></p>
                </div>
                <div className="text-right">
                  <h3 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Clases a elegir</h3>
                  <p className="text-2xl font-black text-primary">{selectedClasses.length} / {allowedClasses}</p>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Reserva tus horarios</h2>
                <p className="text-slate-500 text-sm mb-6">Selecciona en el calendario de acuerdo a la disponibilidad visible.</p>
                
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm uppercase tracking-widest">{format(startOfCurrentWeek, 'MMMM yyyy', { locale: es })}</span>
                  <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 rotate-180">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
                  {weekDays.map(date => {
                    const dayName = format(date, 'EEEE', { locale: es }).toLowerCase();
                    // ✅ Bloquear Martes y Sábado (no hay clases esos días)
                    const DIAS_SIN_CLASE = ['martes', 'sábado', 'sabado'];
                    const isBannedDay = DIAS_SIN_CLASE.some(d => dayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === d.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

                    const rawDayAvails = isBannedDay ? [] : availabilities.filter(a => {
                      const normalizedAvail = a.day_of_week.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      const normalizedDay = dayName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      return normalizedAvail === normalizedDay;
                    });
                    
                    // Deduplicate in memory
                    const dayAvails: Availability[] = [];
                    const seenTimes = new Set<string>();
                    rawDayAvails.forEach(a => {
                      const key = `${a.start_time}-${a.end_time}`;
                      if (!seenTimes.has(key)) {
                        seenTimes.add(key);
                        dayAvails.push(a);
                      }
                    });
                    
                    const isPast = date < new Date() && !isSameDay(date, new Date());

                    return (
                      <div key={date.toISOString()} className="glass-card p-4 rounded-2xl border-white/10 dark:border-slate-800/50">
                        <div className="text-center mb-4">
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{format(date, 'EEE', { locale: es })}</p>
                          <p className={`text-2xl font-black ${isSameDay(date, new Date()) ? 'text-primary' : 'text-slate-100'}`}>{format(date, 'd')}</p>
                        </div>
                        
                        <div className="space-y-2">
                          {isBannedDay ? (
                            <p className="text-[10px] text-center text-slate-600 italic">⛪ sin clases</p>
                          ) : dayAvails.length === 0 ? (
                            <p className="text-[10px] text-center text-slate-500 italic">Sin turnos</p>
                          ) : (
                            dayAvails.map(avail => {
                              const isSelected = selectedClasses.some(c => isSameDay(c.date, date) && c.avail.start_time === avail.start_time);
                              const dateStr = format(date, 'yyyy-MM-dd');
                              // Count activas por hora y fecha
                              const activeBookingsCount = bookingsData.filter(b => b.date === dateStr && b.time === avail.start_time && b.status === 'active').length;
                              const maxStudents = (avail as any).max_students || 4;
                              const spotsLeft = maxStudents - activeBookingsCount;
                              const isFull = spotsLeft <= 0;
                              
                              return (
                                <button
                                  key={avail.id}
                                  disabled={isPast || isFull || (!isSelected && selectedClasses.length >= allowedClasses)}
                                  onClick={() => handleClassSelection(date, avail)}
                                  className={`w-full py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                                    isSelected 
                                      ? 'bg-primary border-primary text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                                      : isPast || isFull
                                        ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/50 text-slate-500' 
                                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                  }`}
                                >
                                  <span>{avail.start_time} - {avail.end_time}</span>
                                  {!isPast && (
                                    <span className={`block text-[9px] font-black tracking-widest ${isFull ? 'text-red-400' : spotsLeft <= 1 ? 'text-amber-400' : 'text-emerald-400/70'}`}>
                                      {isFull ? 'AGOTADO' : `${spotsLeft}/${maxStudents} libres`}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: selectedClasses.length === allowedClasses ? 1.02 : 1 }}
                whileTap={{ scale: selectedClasses.length === allowedClasses ? 0.98 : 1 }}
                disabled={selectedClasses.length !== allowedClasses}
                onClick={() => setCurrentStep(3)}
                className={`w-full py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-xl ${
                  selectedClasses.length === allowedClasses
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                Continuar al Pago
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: PAGO */}
          {currentStep === 3 && selectedPlan && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="glass-card rounded-[2rem] p-6 border-white/20 dark:border-slate-800/50 shadow-lg text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Total a Pagar</p>
                {qualifiesForDiscount ? (
                  <>
                    <p className="text-2xl font-black text-slate-500 tracking-tighter mt-2 line-through">${currentPrice.toLocaleString()}</p>
                    <p className="text-5xl font-black text-emerald-500 tracking-tighter">${finalPrice.toLocaleString()}</p>
                    <div className="inline-flex items-center gap-2 mt-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl">
                      <span className="text-emerald-400 text-[11px] font-black uppercase tracking-widest">🎉 10% Descuento — Nuevo Estudiante</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Ahorras ${discountAmount.toLocaleString()} en tus primeros 3 meses</p>
                  </>
                ) : (
                  <p className="text-5xl font-black text-emerald-500 tracking-tighter mt-2">${currentPrice.toLocaleString()}</p>
                )}
                <p className="text-xs text-white uppercase tracking-widest mt-2">{selectedPlan.name} • {selectedDateMode}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Metodos */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Métodos de Pago</h3>
                  
                  {/* QR Code Nequi */}
                  <div className="glass-card p-6 rounded-3xl border-white/10 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-[2rem] mb-4">
                      {/* Using the attached newly saved QR image! */}
                      <img src="/qr-nequi.jpg" alt="QR Nequi BreB" className="w-48 h-48 object-cover rounded-2xl" />
                    </div>
                    <p className="text-white font-bold uppercase tracking-widest text-sm">Escanea para pagar</p>
                    <p className="text-slate-400 text-xs">Nequi Negocios • Guantes Para Encajarte</p>
                  </div>

                  {paymentMethods.map(method => (
                    <div key={method.id} className="glass-card p-5 rounded-2xl border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                          <Smartphone className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{method.name}</p>
                          <p className="text-lg text-white font-black tracking-widest">{method.number}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(method.number); alert('Copiado'); }}
                        className="p-3 bg-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subir Comprobante */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight italic">Comprobante</h3>
                  <div className="glass-card p-8 rounded-3xl border-white/10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="text-white font-bold text-lg mb-2">Sube tu recibo</h4>
                    <p className="text-slate-400 text-xs mb-6">Adjunta la captura de pantalla de la transferencia.</p>
                    
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                      className="hidden" 
                      ref={fileInputRef} 
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-slate-600 rounded-2xl text-slate-300 hover:border-primary hover:text-primary transition-all font-bold text-sm tracking-widest uppercase"
                    >
                      {paymentFile ? paymentFile.name : 'Seleccionar Archivo'}
                    </button>
                  </div>

                  <motion.button
                    disabled={!paymentFile || isUploading}
                    whileHover={{ scale: paymentFile && !isUploading ? 1.02 : 1 }}
                    whileTap={{ scale: paymentFile && !isUploading ? 0.98 : 1 }}
                    onClick={handlePaymentSubmit}
                    className={`w-full py-6 rounded-[2rem] flex items-center justify-center gap-3 text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-xl ${
                      paymentFile && !isUploading
                        ? 'bg-primary text-white shadow-primary/30 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Comprobante'}
                  </motion.button>

                  <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 mb-3 font-medium">¿Problemas al subir o ya lo enviaste?</p>
                    <button 
                      onClick={handleWhatsAppBypass}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      <Smartphone className="w-5 h-5 flex-shrink-0" /> Envialo por WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PENDIENTE DE APROBACIÓN */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 rounded-[3rem] border-white/10 text-center max-w-2xl mx-auto"
            >
              <div className="w-32 h-32 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/30">
                <Clock className="w-16 h-16 text-amber-500" />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-4">Pago en Revisión</h2>
              <p className="text-slate-400 pb-8 text-lg">Hemos recibido tu comprobante. Nuestro equipo validará el pago en breve. Te notificaremos cuando tu membresía esté activa.</p>
              
              <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 text-left mb-8 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <p className="text-sm text-slate-300">Si envías esto fuera del horario laboral, podría tardar un poco más en ser aprobado. ¡Gracias por tu paciencia!</p>
              </div>

              {/* Development Simulation button */}
              <button 
                onClick={simulateAdminApproval}
                className="w-full py-4 rounded-xl border border-amber-500/50 text-amber-500 uppercase font-black text-xs tracking-widest hover:bg-amber-500 hover:text-white transition-all"
              >
                (Simular Aprobación Automática - Modo Dev)
              </button>
            </motion.div>
          )}

          {/* STEP 5: APROBADO COMPLETADO */}
          {currentStep === 5 && selectedPlan && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="w-40 h-40 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-emerald-500/30">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <CheckCircle2 className="w-20 h-20 text-emerald-500 relative z-10" />
              </div>
              
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white mb-4">¡Plan Activado!</h2>
              <p className="text-emerald-400 font-bold tracking-widest mb-12">BIENVENIDO A GUANTES PARA ENCAJARTE</p>

              <div className="glass-card p-8 rounded-[3rem] border-white/10 mb-8 text-left">
                <h3 className="font-black text-white uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Lo que acabas de desbloquear:</h3>
                
                <ul className="space-y-4">
                  <li className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500"><CalendarIcon className="w-5 h-5"/></div>
                    <span className="text-slate-300 font-bold">{allowedClasses} Clases reservadas con éxito</span>
                  </li>
                  {allowedClasses >= 4 && (
                    <>
                      <li className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500"><PlayCircle className="w-5 h-5"/></div>
                        <span className="text-slate-300 font-bold">Módulo VIP Saberes (Aprender Boxeo Online)</span>
                      </li>
                      <li className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500"><Flame className="w-5 h-5"/></div>
                        <span className="text-slate-300 font-bold">Nutrición y Control de Tareas</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/calendar')}
                className="bg-primary text-white w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-lg shadow-primary/30"
              >
                Ir a mi Calendario
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
