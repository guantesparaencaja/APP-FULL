import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, TrendingDown, Scale, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function FitnessGoalModal() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We only show if user is fully loaded and fitnessGoal is unset
  if (!user || user.fitnessGoal) return null;

  const handleSelectGoal = async (goal: 'bajar_peso' | 'mantener' | 'aumentar' | 'general') => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { fitnessGoal: goal });
      setUser({ ...user, fitnessGoal: goal });
    } catch (error) {
      console.error('Error saving fitness goal:', error);
      // Actualizamos localmente para no bloquear al usuario si Firestore falla temporalmente
      setUser({ ...user, fitnessGoal: goal });
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = {
    bajar_peso: {
      button: 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/40',
      icon: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
    },
    mantener: {
      button:
        'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40',
      icon: 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
    },
    aumentar: {
      button:
        'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 hover:border-orange-500/40',
      icon: 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white',
    },
  };

  const renderOption = (
    value: 'bajar_peso' | 'mantener' | 'aumentar',
    icon: React.ReactNode,
    title: string,
    desc: string
  ) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleSelectGoal(value)}
      disabled={isSubmitting}
      className={`w-full text-left p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 group ${colors[value].button}`}
    >
      <div className={`p-4 rounded-2xl transition-colors ${colors[value].icon}`}>{icon}</div>
      <div>
        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">
          {title}
        </h4>
        <p className="text-xs text-slate-500 font-medium mt-1">{desc}</p>
      </div>
    </motion.button>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center border-2 border-primary/20">
              <Target className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h2 className="text-2xl font-black text-center text-slate-900 dark:text-white uppercase tracking-tight mb-2">
            ¿Cuál es tu objetivo?
          </h2>
          <p className="text-center text-sm text-slate-500 mb-8 font-medium">
            Selecciona tu meta principal para personalizar tus rutinas y recomendaciones.
          </p>

          <div className="space-y-4">
            {renderOption(
              'bajar_peso',
              <TrendingDown className="w-6 h-6" />,
              'Bajar de Peso',
              'Enfocado en cardio y quema de calorías.'
            )}
            {renderOption(
              'mantener',
              <Scale className="w-6 h-6" />,
              'Mantenerme',
              'Equilibrio entre cardio y fuerza.'
            )}
            {renderOption(
              'aumentar',
              <TrendingUp className="w-6 h-6" />,
              'Aumentar Masa',
              'Rutinas enfocadas en hipertrofia y fuerza.'
            )}
          </div>

          <button
            onClick={() => handleSelectGoal('general')}
            disabled={isSubmitting}
            className="w-full mt-6 py-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-black uppercase tracking-widest transition-colors"
          >
            Omitir por ahora (General)
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
