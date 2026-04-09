import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { X, CheckCircle2, Target, Zap, AlertTriangle, ChefHat, Dumbbell, TrendingDown, Scale, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AssessmentModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal: user?.goal || 'mantener',
    fitnessGoal: user?.fitnessGoal || 'mantener',
    activity_level: user?.activity_level || 'moderado',
    experience_level: user?.experience_level || 'intermedio',
    injuries: user?.injuries || '',
    dietary_restrictions: user?.dietary_restrictions || ''
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', String(user.id));
      const now = new Date().toISOString();
      const updateData = {
        ...formData,
        assessment_completed: true,
        assessment_updated_at: now
      };
      await updateDoc(userRef, updateData);
      setUser({ ...user, ...updateData });
      onClose();
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      // Cerramos de todos modos para no bloquear al usuario
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      id: 'goal',
      title: 'Tu Objetivo Principal',
      subtitle: 'Personaliza tu experiencia',
      icon: <Target className="w-8 h-8 text-primary" />,
      content: (
        <div className="grid grid-cols-1 gap-4">
          {[
            { id: 'bajar', fGoal: 'bajar_peso', label: 'Bajar Peso', desc: 'Enfocado en cardio y quema de calorías', icon: <TrendingDown className="w-6 h-6" />, color: 'blue' },
            { id: 'mantener', fGoal: 'mantener', label: 'Mantener Peso', desc: 'Equilibrio entre cardio y fuerza', icon: <Scale className="w-6 h-6" />, color: 'emerald' },
            { id: 'subir', fGoal: 'aumentar', label: 'Aumentar Peso', desc: 'Hipertrofia y ganancia muscular', icon: <TrendingUp className="w-6 h-6" />, color: 'orange' }
          ].map((g) => (
            <motion.button
              key={g.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFormData({ ...formData, goal: g.id, fitnessGoal: g.fGoal as any })}
              className={`p-5 rounded-[2rem] border-2 transition-all text-left flex items-center gap-4 group ${formData.goal === g.id ? 'border-primary bg-primary/5' : 'border-slate-700 bg-slate-900/50'}`}
            >
              <div className={`p-4 rounded-2xl transition-colors ${formData.goal === g.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-500'}`}>
                {g.icon}
              </div>
              <div className="flex-1">
                <p className="font-black text-white uppercase tracking-tight">{g.label}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">{g.desc}</p>
              </div>
              {formData.goal === g.id && <CheckCircle2 className="w-6 h-6 text-primary" />}
            </motion.button>
          ))}
        </div>
      )
    },
    {
      id: 'activity',
      title: 'Nivel de Actividad',
      subtitle: '¿Qué tan activo eres?',
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      content: (
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'sedentario', label: 'Sedentario', desc: 'Poca o ninguna actividad' },
            { id: 'ligero', label: 'Ligero', desc: '1-3 días por semana' },
            { id: 'moderado', label: 'Moderado', desc: '3-5 días por semana' },
            { id: 'intenso', label: 'Intenso', desc: '6-7 días por semana' }
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => setFormData({ ...formData, activity_level: a.id })}
              className={`p-5 rounded-2xl border-2 transition-all text-left flex items-center justify-between ${formData.activity_level === a.id ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-900/50'}`}
            >
              <div>
                <p className="font-black text-white uppercase tracking-tight">{a.label}</p>
                <p className="text-xs text-slate-400 font-medium">{a.desc}</p>
              </div>
              {formData.activity_level === a.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </button>
          ))}
        </div>
      )
    },
    {
      id: 'experience',
      title: 'Experiencia y Salud',
      subtitle: 'Conozcamos tu estado físico',
      icon: <Dumbbell className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Nivel de Experiencia</label>
            <div className="grid grid-cols-3 gap-2">
              {['principiante', 'intermedio', 'avanzado'].map((e) => (
                <button
                  key={e}
                  onClick={() => setFormData({ ...formData, experience_level: e })}
                  className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${formData.experience_level === e ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-500" /> Lesiones o Dolores
            </label>
            <textarea
              value={formData.injuries}
              onChange={(e) => setFormData({ ...formData, injuries: e.target.value })}
              placeholder="Ej: Dolor en rodilla derecha, hernia discal..."
              className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-2xl p-4 text-sm text-white resize-none h-32 focus:border-primary outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>
      )
    },
    {
      id: 'diet',
      title: 'Alimentación',
      subtitle: 'Tus preferencias culinarias',
      icon: <ChefHat className="w-8 h-8 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Restricciones Alimenticias</label>
            <textarea
              value={formData.dietary_restrictions}
              onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
              placeholder="Ej: Vegano, alérgico al maní, sin gluten..."
              className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-2xl p-4 text-sm text-white resize-none h-40 focus:border-primary outline-none transition-all placeholder:text-slate-600"
            />
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg h-fit">
              <ChefHat className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Esta información nos ayuda a generar planes de comida y entrenamiento que se adapten 100% a tus necesidades y estilo de vida.
            </p>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-start">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-inner">
                {currentStep.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{currentStep.title}</h3>
                <p className="text-xs text-slate-500 font-bold mt-2 uppercase tracking-widest">{currentStep.subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-8 mb-8">
            <div className="flex gap-2 h-1.5 w-full">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-full transition-all duration-500 ${i + 1 <= step ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                />
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep.content}
            </motion.div>
          </div>

          {/* Navigation Footer */}
          <div className="p-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" /> Atrás
              </button>
            )}
            <button
              onClick={() => step < steps.length ? setStep(step + 1) : handleSave()}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {step < steps.length ? (
                    <>Siguiente <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>Finalizar Evaluación <CheckCircle2 className="w-4 h-4" /></>
                  )}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
