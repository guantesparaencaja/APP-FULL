import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Calendar, ArrowRight, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TUTORIAL_STEPS = [
  {
    title: 'Bienvenido a GUANTES',
    icon: BookOpen,
    description:
      'Descubre la teoría, técnica perfeccionada y táctica. El conocimiento de un campeón directo a tu bolsillo.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    shadow: 'shadow-blue-500/30',
  },
  {
    title: 'Entrena a tu Ritmo',
    icon: Clock,
    description:
      'Usa el nuevo Temporizador para tus rounds y nuestras rutinas guiadas. En casa o en el gym, tú decides.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/50',
    shadow: 'shadow-emerald-500/30',
  },
  {
    title: 'Reserva tus Clases',
    icon: Calendar,
    description:
      'Agenda fácilmente tus sesiones presenciales, selecciona tu horario ideal y asegura tu cupo en tiempo real.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    shadow: 'shadow-purple-500/30',
  },
  {
    title: 'Sube de Nivel',
    icon: Trophy,
    description: '¡Registra tus golpes, sigue tu progreso y conviértete en un verdadero peleador!',
    color: 'text-orange-500',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/50',
    shadow: 'shadow-orange-500/30',
  },
];

export function Tutorial({ onComplete }: { onComplete: () => void }) {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', String(user.id));
      await updateDoc(userRef, { tutorial_completed: true });
      setUser({ ...user, tutorial_completed: true } as any);
      onComplete();
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
      onComplete(); // Complete anyway so user isn't stuck
    }
  };

  const currentStep = TUTORIAL_STEPS[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4 }}
        className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
      >
        {/* Progress Bar Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2 w-full pr-4">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div key={idx} className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: idx <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className={`h-full ${idx === step ? currentStep.bg.replace('/20', '') : 'bg-slate-600'}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleComplete}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
          >
            Saltar
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[280px] flex flex-col items-center justify-center text-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center w-full"
            >
              <div
                className={`w-32 h-32 rounded-3xl ${currentStep.bg} border ${currentStep.border} flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] ${currentStep.shadow}`}
              >
                <Icon className={`w-16 h-16 ${currentStep.color}`} />
              </div>

              <h3 className="text-3xl font-black text-white mb-4 tracking-tight leading-none">
                {currentStep.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed px-2 font-medium">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className={`w-full py-4 mt-8 rounded-2xl font-black text-white ${currentStep.bg.replace('/20', '')} shadow-lg ${currentStep.shadow} transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm`}
        >
          {step === TUTORIAL_STEPS.length - 1 ? (
            <>
              ¡Empezar a entrenar! <CheckCircle2 className="w-5 h-5" />
            </>
          ) : (
            <>
              Siguiente <ArrowRight className="w-5 h-5" />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
