import React, { useState } from 'react';
import { X, Plus, Save, GripVertical, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface CustomExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  rest: number;
}

interface CustomRoutineBuilderProps {
  onClose: () => void;
}

export function CustomRoutineBuilder({ onClose }: CustomRoutineBuilderProps) {
  const user = useStore((state) => state.user);
  const [routineName, setRoutineName] = useState('');
  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [newExercise, setNewExercise] = useState({ name: '', sets: 3, reps: 10, rest: 60 });

  const handleAddExercise = () => {
    if (!newExercise.name) return;
    setExercises([...exercises, { ...newExercise, id: Date.now().toString() }]);
    setNewExercise({ name: '', sets: 3, reps: 10, rest: 60 });
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id));
  };

  const handleSaveRoutine = async () => {
    if (!user?.id || !routineName || exercises.length === 0) return;

    const newRoutine = {
      id: Date.now().toString(),
      name: routineName,
      exercises,
    };

    const currentRoutines = user.custom_routines || [];
    const updatedRoutines = [...currentRoutines, newRoutine];

    try {
      await updateDoc(doc(db, 'users', String(user.id)), {
        custom_routines: updatedRoutines,
      });
      useStore.getState().setUser({ ...user, custom_routines: updatedRoutines });
      onClose();
    } catch (err) {
      console.error('Error saving routine:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Crear Rutina Personalizada</h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
              Nombre de la Rutina
            </label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Ej: Día de Pierna Pesado"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
            />
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h4 className="text-sm font-bold text-primary mb-3">Añadir Ejercicio</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={newExercise.name}
                onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                placeholder="Nombre del ejercicio"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase">Series</label>
                  <input
                    type="number"
                    value={newExercise.sets}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, sets: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase">Reps</label>
                  <input
                    type="number"
                    value={newExercise.reps}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, reps: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase">Descanso (s)</label>
                  <input
                    type="number"
                    value={newExercise.rest}
                    onChange={(e) =>
                      setNewExercise({ ...newExercise, rest: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleAddExercise}
                disabled={!newExercise.name}
                className="w-full bg-slate-700 text-white font-bold py-2 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Añadir a la lista
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-300 mb-3">
              Ejercicios ({exercises.length})
            </h4>
            <div className="space-y-2">
              {exercises.map((ex, index) => (
                <div
                  key={ex.id}
                  className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700"
                >
                  <GripVertical className="w-5 h-5 text-slate-500 cursor-grab" />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white">{ex.name}</p>
                    <p className="text-xs text-slate-400">
                      {ex.sets} series x {ex.reps} reps • {ex.rest}s descanso
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {exercises.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  No has añadido ejercicios aún.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleSaveRoutine}
            disabled={!routineName || exercises.length === 0}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" /> Guardar Rutina
          </button>
        </div>
      </div>
    </div>
  );
}
