import React from 'react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import {
  ArrowLeft,
  Flame,
  Scale,
  TrendingUp,
  Info,
  ChevronRight,
  Apple,
  Beef,
  Salad,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RECIPES = {
  bajar_peso: [
    {
      title: 'Ensalada de Atún Pro',
      calories: '350 kcal',
      protein: '40g',
      time: '10 min',
      icon: Salad,
      desc: 'Ideal para cena ligera después del entreno.',
    },
    {
      title: 'Bowl de Pollo y Brócoli',
      calories: '450 kcal',
      protein: '45g',
      time: '20 min',
      icon: Beef,
      desc: 'Bajo en carbohidratos, alto en saciedad.',
    },
  ],
  aumentar: [
    {
      title: 'Pasta Bolognesa GPTE',
      calories: '850 kcal',
      protein: '55g',
      time: '25 min',
      icon: Beef,
      desc: 'Carga de energía para fuerza máxima.',
    },
    {
      title: 'Omelette Power Max',
      calories: '600 kcal',
      protein: '48g',
      time: '15 min',
      icon: Apple,
      desc: 'Desayuno para campeones en volumen.',
    },
  ],
  mantener: [
    {
      title: 'Salmón con Quinoa',
      calories: '550 kcal',
      protein: '42g',
      time: '20 min',
      icon: Beef,
      desc: 'Equilibrio perfecto de grasas saludables.',
    },
    {
      title: 'Wrap de Pollo y Aguacate',
      calories: '500 kcal',
      protein: '38g',
      time: '12 min',
      icon: Salad,
      desc: 'Excelente opción pre-entreno.',
    },
  ],
  general: [
    {
      title: 'Batido de Proteína GPTE',
      calories: '300 kcal',
      protein: '30g',
      time: '5 min',
      icon: Apple,
      desc: 'Recuperación rápida post-clase.',
    },
  ],
};

export function Recipes() {
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const goal = user?.fitnessGoal || 'general';
  const recipes = RECIPES[goal as keyof typeof RECIPES] || RECIPES.general;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 pb-24 min-h-screen bg-background-light dark:bg-background-dark"
    >
      <header className="flex items-center justify-between mb-8">
        <motion.button
          onClick={() => navigate(-1)}
          className="p-3 bg-white/10 rounded-2xl border border-white/20"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <h1 className="text-2xl font-black uppercase tracking-tighter italic text-white text-center">
          Nutrición GPTE
        </h1>
        <div className="w-11" />
      </header>

      {/* Goal Banner */}
      <motion.div
        variants={itemVariants}
        className="mb-8 p-6 bg-primary rounded-[2rem] shadow-xl shadow-primary/20 flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
            Tu Sugerencia para
          </p>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">
            {goal === 'bajar_peso' ? 'Bajar Peso' : goal === 'aumentar' ? 'Subir Peso' : 'Mantener'}
          </h2>
        </div>
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
          {goal === 'bajar_peso' ? (
            <Scale className="w-8 h-8 text-white" />
          ) : (
            <TrendingUp className="w-8 h-8 text-white" />
          )}
        </div>
      </motion.div>

      <section className="space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mb-2 px-2">
          Recetas Recomendadas
        </h3>
        {recipes.map((recipe, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="bg-white/5 dark:bg-slate-900/40 rounded-[2.5rem] p-6 border border-white/10 flex items-center gap-6 group hover:bg-white/10 transition-colors"
          >
            <div className="w-20 h-20 rounded-[1.5rem] bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
              <recipe.icon className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-black text-lg text-white tracking-tight">{recipe.title}</h4>
                <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                  {recipe.calories}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-3">{recipe.desc}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Beef className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {recipe.protein} PRO
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {recipe.time}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 transition-transform group-hover:translate-x-1" />
          </motion.div>
        ))}
      </section>

      <motion.div
        variants={itemVariants}
        className="mt-10 p-6 bg-slate-100 dark:bg-slate-900/60 rounded-[2.5rem] border border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 mb-3">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <h4 className="font-black text-sm uppercase tracking-tight text-white italic">
            Tip del Coach
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
          Recuerda hidratarte cada 15 minutos durante la clase. Evita comidas pesadas 2 horas antes
          de entrenar en GPTE.
        </p>
      </motion.div>
    </motion.div>
  );
}
