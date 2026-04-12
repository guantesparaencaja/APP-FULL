import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Tutorial } from './Tutorial';
import { sendWelcomeEmail } from '../lib/email';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Target, Zap, Dumbbell, ChefHat,
  ChevronRight, ChevronLeft, CheckCircle2,
  AlertTriangle, TrendingDown, Scale, TrendingUp,
} from 'lucide-react';

/**
 * OnboardingModal UNIFICADO — BLOQUE C
 * Fusiona el antiguo OnboardingModal (datos básicos + boxing goal)
 * con el AssessmentModal (fitness goal, actividad, experiencia, dieta).
 *
 * 5 pasos únicos, sin preguntas repetidas:
 *  1. Datos Personales (nombre, username, edad, peso, altura, mano)
 *  2. Objetivo Boxístico (boxing_goal)
 *  3. Objetivo Fitness (goal/fitness_goal)
 *  4. Actividad y Experiencia (activity_level, experience_level, injuries)
 *  5. Alimentación (dietary_restrictions)
 */
export function OnboardingModal() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  const [formData, setFormData] = useState({
    // Paso 1
    name: user?.name || '',
    username: '',
    age: user?.age || '',
    weight: user?.weight || '',
    height: user?.height || '',
    dominant_hand: user?.dominant_hand || '',
    // Paso 2
    boxing_goal: '',
    // Paso 3
    goal: (user as any)?.goal || 'mantener',
    fitness_goal: (user as any)?.fitness_goal || '',
    goal_timeframe: '',
    // Paso 4
    activity_level: (user as any)?.activity_level || 'moderado',
    experience_level: (user as any)?.experience_level || 'principiante',
    injuries: (user as any)?.injuries || '',
    // Paso 5
    dietary_restrictions: (user as any)?.dietary_restrictions || '',
  });

  const [showTutorial, setShowTutorial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Guards ──────────────────────────────────────────────────────────────────
  // Admin nunca ve el onboarding
  if (user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com') return null;
  if (!user) return null;

  // Si ya completó onboarding pero falta tutorial → mostrar tutorial
  if (user.is_new_user === false && !user.tutorial_completed) {
    return <Tutorial onComplete={() => setUser({ ...user, tutorial_completed: true } as any)} />;
  }
  // Si ya completó todo → nada que mostrar
  if (user.is_new_user === false && user.tutorial_completed) return null;

  if (showTutorial) {
    return (
      <Tutorial
        onComplete={() => {
          setShowTutorial(false);
          setUser({ ...user, is_new_user: false, tutorial_completed: true } as any);
        }}
      />
    );
  }

  // ── Validación por paso ──────────────────────────────────────────────────────
  const validateStep = (): boolean => {
    setError('');
    switch (step) {
      case 1:
        if (!formData.name || !formData.username || !formData.age || !formData.weight || !formData.height || !formData.dominant_hand) {
          setError('Por favor, completa todos los campos.');
          return false;
        }
        break;
      case 2:
        if (!formData.boxing_goal) {
          setError('Selecciona tu objetivo en el boxeo.');
          return false;
        }
        break;
      case 3:
        if (!formData.goal) {
          setError('Selecciona tu objetivo fitness.');
          return false;
        }
        if (formData.goal === 'bajar' && !formData.goal_timeframe) {
          setError('Selecciona el tiempo estimado para tu meta.');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', String(user.id));
      const updatedData = {
        name: formData.name,
        username: formData.username,
        age: parseInt(String(formData.age)),
        weight: parseFloat(String(formData.weight)),
        height: parseFloat(String(formData.height)),
        dominant_hand: formData.dominant_hand,
        boxing_goal: formData.boxing_goal,
        goal: formData.goal,
        fitness_goal: formData.fitness_goal || formData.goal,
        goal_timeframe: formData.goal_timeframe,
        activity_level: formData.activity_level,
        experience_level: formData.experience_level,
        injuries: formData.injuries,
        dietary_restrictions: formData.dietary_restrictions,
        // assessment_completed se marca aquí también para que no vuelva a aparecer
        assessment_completed: true,
        assessment_updated_at: new Date().toISOString(),
        is_new_user: false,
      };

      await updateDoc(userRef, updatedData);
      setUser({ ...user, ...updatedData } as any);

      // ✉️ Correo de bienvenida
      sendWelcomeEmail({
        nombre: formData.name,
        email: user.email || '',
        userId: String(user.id),
      }).catch(() => {});

      setTimeout(() => setShowTutorial(true), 100);
    } catch (err: any) {
      setError(err.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Metadata de cada paso ────────────────────────────────────────────────────
  const STEPS = [
    { icon: <User className="w-6 h-6 text-primary" />, label: 'Datos Personales' },
    { icon: <Target className="w-6 h-6 text-red-500" />, label: 'Objetivo Boxeo' },
    { icon: <TrendingDown className="w-6 h-6 text-blue-500" />, label: 'Objetivo Fitness' },
    { icon: <Dumbbell className="w-6 h-6 text-amber-500" />, label: 'Actividad' },
    { icon: <ChefHat className="w-6 h-6 text-emerald-500" />, label: 'Alimentación' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ── Header ── */}
        <div className="p-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
              {STEPS[step - 1].icon}
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {STEPS[step - 1].label}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-widest">
                Paso {step} de {TOTAL_STEPS}
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-1.5 h-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-500 ${
                  i + 1 <= step ? 'bg-primary' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Contenido por paso (scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {/* ══ PASO 1: Datos Personales ══ */}
              {step === 1 && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder="Nombre de usuario (para tu perfil)"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none w-full"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="Edad"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white focus:border-primary outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Peso (kg)"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white focus:border-primary outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Altura (cm)"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-white focus:border-primary outline-none"
                    />
                  </div>
                  <select
                    value={formData.dominant_hand}
                    onChange={(e) => setFormData({ ...formData, dominant_hand: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                  >
                    <option value="" disabled>Mano dominante para golpear</option>
                    <option value="Derecha">Derecha (Diestro)</option>
                    <option value="Izquierda">Izquierda (Zurdo)</option>
                  </select>
                </div>
              )}

              {/* ══ PASO 2: Objetivo Boxístico ══ */}
              {step === 2 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-400 mb-1">¿Cuál es tu objetivo principal con el boxeo?</p>
                  {[
                    { val: 'Boxeo para saber defenderme', emoji: '🛡️', desc: 'Técnica y defensa personal' },
                    { val: 'Boxeo para bajar peso o mantener saludable', emoji: '🔥', desc: 'Cardio y acondicionamiento' },
                    { val: 'Boxeo competitivo', emoji: '🏆', desc: 'Entrenamiento de alto rendimiento' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setFormData({ ...formData, boxing_goal: opt.val })}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                        formData.boxing_goal === opt.val
                          ? 'bg-primary/20 border-primary text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{opt.val}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                      {formData.boxing_goal === opt.val && (
                        <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* ══ PASO 3: Objetivo Fitness ══ */}
              {step === 3 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-400 mb-1">¿Cuál es tu meta corporal?</p>
                  {[
                    { id: 'bajar', label: 'Bajar Peso', desc: 'Cardio intenso y quema de grasa', icon: <TrendingDown className="w-5 h-5" /> },
                    { id: 'mantener', label: 'Mantener Peso', desc: 'Equilibrio y salud general', icon: <Scale className="w-5 h-5" /> },
                    { id: 'subir', label: 'Ganar Masa Muscular', desc: 'Fuerza, agilidad y potencia', icon: <TrendingUp className="w-5 h-5" /> },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setFormData({ ...formData, goal: g.id, fitness_goal: g.id, goal_timeframe: '' })}
                      className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                        formData.goal === g.id
                          ? 'border-primary bg-primary/5 text-white'
                          : 'border-slate-700 bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${formData.goal === g.id ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {g.icon}
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase tracking-tight">{g.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{g.desc}</p>
                      </div>
                      {formData.goal === g.id && <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />}
                    </button>
                  ))}
                  {formData.goal === 'bajar' && (
                    <div className="mt-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                      <p className="text-sm text-slate-300 mb-3 font-bold">¿En cuánto tiempo quieres lograrlo?</p>
                      <div className="flex flex-wrap gap-2">
                        {['2 meses', '4 meses', '6 meses', '10 meses', '12 meses'].map((t) => (
                          <button
                            key={t}
                            onClick={() => setFormData({ ...formData, goal_timeframe: t })}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                              formData.goal_timeframe === t
                                ? 'bg-primary text-white border-primary'
                                : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ PASO 4: Actividad y Experiencia ══ */}
              {step === 4 && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                      Nivel de Actividad Física
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'sedentario', label: 'Sedentario', desc: 'Casi no hago ejercicio' },
                        { id: 'ligero', label: 'Ligero', desc: '1-3 días por semana' },
                        { id: 'moderado', label: 'Moderado', desc: '3-5 días por semana' },
                        { id: 'intenso', label: 'Intenso', desc: '6-7 días por semana' },
                      ].map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setFormData({ ...formData, activity_level: a.id })}
                          className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                            formData.activity_level === a.id
                              ? 'border-primary bg-primary/10'
                              : 'border-slate-700 bg-slate-800/50'
                          }`}
                        >
                          <div>
                            <p className="font-black text-white text-sm uppercase tracking-tight">{a.label}</p>
                            <p className="text-xs text-slate-400">{a.desc}</p>
                          </div>
                          {formData.activity_level === a.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                      Nivel de Experiencia en Boxeo
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['principiante', 'intermedio', 'avanzado'].map((e) => (
                        <button
                          key={e}
                          onClick={() => setFormData({ ...formData, experience_level: e })}
                          className={`py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${
                            formData.experience_level === e
                              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1 block">
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      Lesiones o Dolores (opcional)
                    </label>
                    <textarea
                      value={formData.injuries}
                      onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
                      placeholder="Ej: Dolor en rodilla derecha, hernia discal..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white resize-none h-24 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              )}

              {/* ══ PASO 5: Alimentación ══ */}
              {step === 5 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-400">
                    Esto nos ayuda a personalizar tu plan de comidas y entrenamiento.
                  </p>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Restricciones Alimenticias (opcional)
                    </label>
                    <textarea
                      value={formData.dietary_restrictions}
                      onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                      placeholder="Ej: Vegano, alérgico al maní, sin gluten, diabético..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white resize-none h-40 focus:border-primary outline-none"
                    />
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex gap-3">
                    <ChefHat className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tus datos se usan exclusivamente para personalizar tu experiencia en Guantes Para Encajarte.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer Navigation ── */}
        <div className="p-6 pt-4 border-t border-slate-800 flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-800 text-slate-400 hover:bg-slate-700 transition-all border border-slate-700 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button
            onClick={step < TOTAL_STEPS ? handleNext : handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 min-h-[44px]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : step < TOTAL_STEPS ? (
              <> Siguiente <ChevronRight className="w-4 h-4" /> </>
            ) : (
              <> ¡Empecemos! <CheckCircle2 className="w-4 h-4" /> </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
