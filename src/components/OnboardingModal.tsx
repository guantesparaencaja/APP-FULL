import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Tutorial } from './Tutorial';

export function OnboardingModal() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: '',
    age: user?.age || '',
    weight: user?.weight || '',
    height: user?.height || '',
    boxing_goal: '',
    fitness_goal: '',
    goal_timeframe: '',
    dominant_hand: user?.dominant_hand || ''
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [error, setError] = useState('');

  if (user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com') return null;
  
  // Guard: si no hay usuario autenticado todavía, no renderizar nada
  if (!user) return null;

  // If user is not new but hasn't completed tutorial, show tutorial
  if (user.is_new_user === false && !user.tutorial_completed) {
    return <Tutorial onComplete={() => setUser({ ...user, tutorial_completed: true } as any)} />;
  }

  // If user is not new and has completed tutorial, don't show anything
  if (user.is_new_user === false && user.tutorial_completed) return null;

  if (showTutorial) {
    return <Tutorial onComplete={() => {
      setShowTutorial(false);
      setUser({ ...user, is_new_user: false, tutorial_completed: true } as any);
    }} />;
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.username || !formData.age || !formData.weight || !formData.height || !formData.dominant_hand) {
        setError('Por favor, completa todos los campos.');
        return;
      }
    }
    if (step === 2) {
      if (!formData.boxing_goal) {
        setError('Por favor, selecciona un objetivo boxístico.');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.fitness_goal) {
      setError('Por favor, selecciona un objetivo deportivo.');
      return;
    }
    if (formData.fitness_goal === 'Bajar peso' && !formData.goal_timeframe) {
      setError('Por favor, selecciona un tiempo estimado.');
      return;
    }

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
        fitness_goal: formData.fitness_goal,
        goal_timeframe: formData.goal_timeframe,
        is_new_user: false
      };

      await updateDoc(userRef, updatedData);
      setUser({ ...user, ...updatedData } as any);
      setTimeout(() => {
        setShowTutorial(true);
      }, 100);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 p-6 shadow-2xl overflow-y-auto max-h-[85vh] pb-12">
        <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido a GUANTES!</h2>
        <p className="text-slate-400 mb-6 text-sm">Para continuar, necesitamos configurar tu perfil.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-bold text-primary">Paso 1: Datos Personales</h3>
            <input type="text" placeholder="Nombre completo" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none" />
            <input type="text" placeholder="Nombre de usuario (Para tu perfil)" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none" />
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder="Edad" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none" />
              <input type="number" placeholder="Peso (kg)" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none" />
              <input type="number" placeholder="Altura (cm)" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none" />
            </div>
            <select value={formData.dominant_hand} onChange={e => setFormData({...formData, dominant_hand: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-primary outline-none">
              <option value="" disabled>Mano dominante para golpear</option>
              <option value="Derecha">Derecha (Diestro)</option>
              <option value="Izquierda">Izquierda (Zurdo)</option>
            </select>
            
            <button onClick={handleNext} className="w-full bg-primary text-white font-bold py-3 rounded-xl mt-4 hover:bg-primary/90 transition-colors">
              Siguiente
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-bold text-primary">Paso 2: Alcances Boxísticos</h3>
            <p className="text-sm text-slate-400">¿Cuál es tu objetivo principal con el boxeo?</p>
            
            {['Boxeo para saber defenderme', 'Boxeo para bajar peso o mantener saludable', 'Boxeo competitivo'].map(goal => (
              <button 
                key={goal}
                onClick={() => setFormData({...formData, boxing_goal: goal})}
                className={`p-4 rounded-xl border text-left transition-all ${formData.boxing_goal === goal ? 'bg-primary/20 border-primary text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                {goal}
              </button>
            ))}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors">Atrás</button>
              <button onClick={handleNext} className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors">Siguiente</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-bold text-primary">Paso 3: Alcances a Nivel Deportista</h3>
            
            {['Bajar peso', 'Mantener peso pero ser más resistente y fuerte', 'Tener más masa muscular pero ser rápido, ágil y poderos@'].map(goal => (
              <button 
                key={goal}
                onClick={() => setFormData({...formData, fitness_goal: goal, goal_timeframe: ''})}
                className={`p-4 rounded-xl border text-left transition-all ${formData.fitness_goal === goal ? 'bg-primary/20 border-primary text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                {goal}
              </button>
            ))}

            {formData.fitness_goal === 'Bajar peso' && (
              <div className="mt-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-300 mb-3">¿En cuánto tiempo quieres llegar a tu meta?</p>
                <div className="flex flex-wrap gap-2">
                  {['2 meses', '4 meses', '6 meses', '10 meses', '12 meses'].map(time => (
                    <button 
                      key={time}
                      onClick={() => setFormData({...formData, goal_timeframe: time})}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${formData.goal_timeframe === time ? 'bg-primary text-white border-primary' : 'bg-slate-800 text-slate-400 border-slate-600'}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors">Atrás</button>
              <button onClick={handleSubmit} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]">Finalizar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
