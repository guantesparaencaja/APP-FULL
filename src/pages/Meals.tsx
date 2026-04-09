import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ArrowLeft, Plus, Utensils, Flame, Wheat, Beef, X, Image as ImageIcon, Trash2, Droplet, Search, CheckCircle2, Calendar, RefreshCw, ShoppingCart, Coffee, Moon, Apple, Clock, Lightbulb, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { generateLocalMeals } from '../services/geminiService';
import { AssessmentModal } from '../components/AssessmentModal';
import { HEALTHY_RECIPES, HealthyRecipe } from '../data/healthyRecipes';
import { HEALTHY_TIPS } from '../data/healthyTips';
import { RecipeCard } from '../components/RecipeCard';

interface Meal {
  id: string;
  name: string;
  category: string;
  ingredients: string;
  instructions: string;
  image_url?: string;
  video_url?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fats?: number;
  tags?: string[];
  created_by?: string;
}

export function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingNutritionId, setEditingNutritionId] = useState<string | null>(null);
  const [newMeal, setNewMeal] = useState<Partial<Meal>>({ name: '', category: 'desayuno', ingredients: '', instructions: '', video_url: '', image_url: '' });
  const [nutrition, setNutrition] = useState({ calories: '', carbs: '', protein: '', fats: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todas');
  const [consumedMeals, setConsumedMeals] = useState<string[]>([]);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'mis_recetas' | 'libro' | 'tips'>('mis_recetas');
  const [selectedHealthyRecipe, setSelectedHealthyRecipe] = useState<HealthyRecipe | null>(null);


  const handleGenerateMealPlan = async () => {
    if (!user?.assessment_completed) {
      setShowAssessment(true);
      return;
    }

    setIsGenerating(true);
    try {
      const plan = generateLocalMeals(
        user?.goal || 'mantener',
        user?.weight || 70,
        user?.activity_level || 'moderado',
        user?.dietary_restrictions || 'ninguna',
        meals
      );
      
      if (user?.id) {
        const userRef = doc(db, 'users', String(user.id));
        await updateDoc(userRef, {
          weekly_meal_plan: plan
        });
        
        useStore.getState().setUser({
          ...user,
          weekly_meal_plan: plan
        });
      }
      setShowMealPlanner(false);
    } catch (err) {
      console.error(err);
      alert('Error al generar el plan de comidas. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const weight = user?.weight || 70;
  const goal = user?.goal || 'mantener';
  
  let baseCalories = weight * 24 * 1.3;
  if (goal === 'bajar') baseCalories -= 500;
  if (goal === 'subir') baseCalories += 500;
  
  const targetProtein = Math.round(weight * 2.2);
  const targetFats = Math.round(weight * 1);
  const targetCarbs = Math.round((baseCalories - (targetProtein * 4) - (targetFats * 9)) / 4);
  const targetCalories = Math.round(baseCalories);

  const consumedMacros = consumedMeals.reduce((acc, mealId) => {
    const meal = meals.find(m => m.id === mealId);
    if (meal) {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fats += meal.fats || 0;
    }
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const toggleConsumed = (mealId: string) => {
    if (consumedMeals.includes(mealId)) {
      setConsumedMeals(consumedMeals.filter(id => id !== mealId));
    } else {
      setConsumedMeals([...consumedMeals, mealId]);
    }
  };

  const filteredMeals = meals.filter(meal => {
    const matchesSearch = meal.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          meal.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'todas' || meal.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // ✅ onSnapshot — tiempo real para la colección meals
  useEffect(() => {
    const unsubMeals = onSnapshot(collection(db, 'meals'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Meal));
      setMeals(data);
    }, (error) => {
      console.error('Error en listener de meals:', error);
    });
    return () => unsubMeals();
  }, []);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMealId) {
        await updateDoc(doc(db, 'meals', editingMealId), newMeal);
        setEditingMealId(null);
      } else {
        await addDoc(collection(db, 'meals'), { ...newMeal, created_by: String(user?.id) });
      }
      setShowAddForm(false);
      setNewMeal({ name: '', category: 'desayuno', ingredients: '', instructions: '', video_url: '', image_url: '' });
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    if (!window.confirm('¿Deseas eliminar esta receta definitivamente?')) return;
    try {
      if (meal.image_url) {
        try {
          const imageRef = ref(storage, meal.image_url);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn("Could not delete image from storage:", e);
        }
      }
      await deleteDoc(doc(db, 'meals', meal.id));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const handleDeleteImage = async () => {
    if (!newMeal.image_url) return;
    if (!window.confirm('¿Deseas quitar la imagen actual? Se borrará permanentemente del servidor.')) return;

    try {
      const imageRef = ref(storage, newMeal.image_url);
      await deleteObject(imageRef);
      setNewMeal({ ...newMeal, image_url: '' });
      
      // Si estamos editando un plato existente, actualizar la DB inmediatamente
      if (editingMealId) {
        await updateDoc(doc(db, 'meals', editingMealId), { image_url: '' });
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen del servidor.');
    }
  };

  const handleEditMealClick = (meal: Meal) => {
    setNewMeal(meal);
    setEditingMealId(meal.id);
    setShowAddForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `meals/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        null,
        (error) => {
          console.error('Error uploading image:', error);
          setUploadingImage(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setNewMeal({ ...newMeal, image_url: downloadURL });
          setUploadingImage(false);
        }
      );
    } catch (error) {
      console.error('Error in image upload:', error);
      setUploadingImage(false);
    }
  };


  const handleAddNutrition = async (e: React.FormEvent, mealId: string) => {
    e.preventDefault();
    const updatedMeal = {
      calories: parseInt(nutrition.calories),
      carbs: parseInt(nutrition.carbs),
      protein: parseInt(nutrition.protein),
      fats: parseInt(nutrition.fats)
    };

    try {
      await updateDoc(doc(db, 'meals', mealId), updatedMeal);
      // onSnapshot actualiza automáticamente
      setEditingNutritionId(null);
      setNutrition({ calories: '', carbs: '', protein: '', fats: '' });
    } catch (error) {
      console.error('Error updating nutrition:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display p-4 pb-32">
      <header className="flex items-center justify-between mb-6">
        <div className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Comidas Saludables</h1>
        <div className="size-12"></div>
      </header>

      <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
        <button 
          onClick={() => setActiveSection('mis_recetas')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'mis_recetas' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Mis Recetas
        </button>
        <button 
          onClick={() => setActiveSection('libro')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'libro' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Recetas del Libro
        </button>
        <button 
          onClick={() => setActiveSection('tips')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'tips' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Tips Nutrición
        </button>
      </div>

      {activeSection === 'mis_recetas' && (
        <>
          <section className="mb-8">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Plan de Comidas Semanal
                </h2>
                <div className="flex gap-2">
                  {user?.weekly_meal_plan && (
                    <button 
                      onClick={() => setShowShoppingList(true)}
                      className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" /> Compras
                    </button>
                  )}
                  <button 
                    onClick={() => setShowMealPlanner(!showMealPlanner)}
                    className="text-xs font-bold bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    {user?.weekly_meal_plan ? 'Ver Mi Plan' : 'Generar Plan'}
                  </button>
                </div>
              </div>

              {showMealPlanner && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  <p className="text-sm text-slate-400">
                    Generaremos un plan de 7 días basado en tus objetivos de {user?.goal} y tu peso de {user?.weight}kg.
                  </p>
                  <button 
                    onClick={handleGenerateMealPlan}
                    disabled={isGenerating}
                    className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Utensils className="w-5 h-5" />}
                    {user?.weekly_meal_plan ? 'Regenerar Mi Plan' : 'Generar Mi Plan Semanal'}
                  </button>

                  {user?.weekly_meal_plan && user.weekly_meal_plan.week && (
                    <div className="mt-8 space-y-4">
                      <h3 className="font-black italic text-lg uppercase text-primary">Tu Plan Generado</h3>
                      {user.weekly_meal_plan.week.map((dayPlan: any, i: number) => (
                        <div key={i} className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => setExpandedDay(expandedDay === dayPlan.day ? null : dayPlan.day)}
                            className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-800 transition-colors"
                          >
                            <span className="font-black uppercase tracking-widest">{dayPlan.day}</span>
                            <span className="text-primary font-bold text-xl">{expandedDay === dayPlan.day ? '-' : '+'}</span>
                          </button>
                          {expandedDay === dayPlan.day && (
                            <div className="p-4 border-t border-slate-800 space-y-4">
                              {dayPlan.meals.map((m: any, idx: number) => (
                                <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-lg">{m.name}</h4>
                                    <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded">{m.category}</span>
                                  </div>
                                  <div className="flex gap-3 text-[10px] font-bold text-slate-400 tracking-widest mt-2">
                                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {m.macros?.calories || 0} kcal</span>
                                    <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-rose-400" /> {m.macros?.protein || 0}g prot</span>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ingredientes</p>
                                    <ul className="text-xs text-slate-300 space-y-1">
                                      {Array.isArray(m.ingredients) 
                                        ? m.ingredients.map((ing: any, k: number) => <li key={k}>• {ing.amount} {ing.measure} {ing.name}</li>)
                                        : <li>{m.ingredients}</li>}
                                    </ul>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Preparación</p>
                                    <ul className="text-xs text-slate-300 space-y-1">
                                      {Array.isArray(m.preparation_steps)
                                        ? m.preparation_steps.map((step: any, k: number) => <li key={k}>{k+1}. {step.step || step}</li>)
                                        : <li>{m.instructions || 'Preparación detallada.'}</li>}
                                    </ul>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="mb-6">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 mb-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-500" />
                  Tus Macros Diarios
                </h2>
                <span className="text-xs font-bold bg-slate-700 px-2 py-1 rounded text-slate-300 uppercase">
                  Objetivo: {goal}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Flame className="w-5 h-5 text-orange-400 mb-1" />
                  <span className="text-xs text-slate-400">Kcal</span>
                  <span className="font-bold text-sm">{consumedMacros.calories} / {targetCalories}</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Beef className="w-5 h-5 text-rose-400 mb-1" />
                  <span className="text-xs text-slate-400">Prot</span>
                  <span className="font-bold text-sm">{consumedMacros.protein}g / {targetProtein}g</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Wheat className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-xs text-slate-400">Carbs</span>
                  <span className="font-bold text-sm">{consumedMacros.carbs}g / {targetCarbs}g</span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Droplet className="w-5 h-5 text-yellow-400 mb-1" />
                  <span className="text-xs text-slate-400">Grasas</span>
                  <span className="font-bold text-sm">{consumedMacros.fats}g / {targetFats}g</span>
                </div>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar recetas o ingredientes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white"
              />
            </div>

            <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 pb-2">
              {[
                { id: 'todas', label: 'Todas', icon: Utensils },
                { id: 'desayuno', label: 'Desayuno', icon: Coffee },
                { id: 'almuerzo', label: 'Almuerzo', icon: Beef },
                { id: 'cena', label: 'Cena', icon: Moon },
                { id: 'snack', label: 'Snack', icon: Apple }
              ].map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all capitalize ${activeCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
            
            {!showAddForm && (
              <div className="grid grid-cols-1 gap-3 mb-6">
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/30 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Subir Receta Manualmente
                </button>
              </div>
            )}

            <AssessmentModal isOpen={showAssessment} onClose={() => setShowAssessment(false)} />

            {showAddForm && (
              <div className="bg-slate-800 p-4 rounded-xl mb-6 border border-slate-700 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">{editingMealId ? 'Editar Receta' : 'Nueva Receta'}</h3>
                  <button onClick={() => {
                    setShowAddForm(false);
                    setEditingMealId(null);
                    setNewMeal({ name: '', category: 'desayuno', ingredients: '', instructions: '', video_url: '', image_url: '' });
                  }} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddMeal} className="flex flex-col gap-3">
                  <div 
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    className={`w-full min-h-[200px] bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative group ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                        <span className="text-sm font-medium text-slate-400">Subiendo imagen...</span>
                      </div>
                    ) : newMeal.image_url ? (
                      <div className="relative w-full group">
                        <img src={newMeal.image_url} alt="Preview" className="w-full h-auto object-contain max-h-[400px]" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage();
                          }}
                          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-12">
                        <ImageIcon className="w-12 h-12 text-slate-500 mb-3" />
                        <span className="text-sm font-medium text-slate-400 font-bold uppercase tracking-widest">Añadir foto del plato</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  <input 
                    type="text" 
                    placeholder="Nombre de la receta" 
                    value={newMeal.name}
                    onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white"
                    required
                  />
                  <select 
                    value={newMeal.category}
                    onChange={(e) => setNewMeal({...newMeal, category: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none text-white"
                  >
                    <option value="desayuno">Desayuno</option>
                    <option value="almuerzo">Almuerzo</option>
                    <option value="cena">Cena</option>
                    <option value="snack">Snack</option>
                  </select>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1">Calorías (kcal)</label>
                      <input 
                        type="number" 
                        value={newMeal.calories || ''}
                        onChange={(e) => setNewMeal({...newMeal, calories: parseInt(e.target.value) || 0})}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-white text-center"
                        placeholder="Ej: 300"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1">Proteínas (g)</label>
                      <input 
                        type="number" 
                        value={newMeal.protein || ''}
                        onChange={(e) => setNewMeal({...newMeal, protein: parseInt(e.target.value) || 0})}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-white text-center"
                        placeholder="Ej: 25"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1">Carbohidratos (g)</label>
                      <input 
                        type="number" 
                        value={newMeal.carbs || ''}
                        onChange={(e) => setNewMeal({...newMeal, carbs: parseInt(e.target.value) || 0})}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-white text-center"
                        placeholder="Ej: 30"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-bold uppercase mb-1">Grasas (g)</label>
                      <input 
                        type="number" 
                        value={newMeal.fats || ''}
                        onChange={(e) => setNewMeal({...newMeal, fats: parseInt(e.target.value) || 0})}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none text-white text-center"
                        placeholder="Ej: 10"
                      />
                    </div>
                  </div>
                  <textarea 
                    placeholder="Ingredientes (separados por coma)" 
                    value={newMeal.ingredients}
                    onChange={(e) => setNewMeal({...newMeal, ingredients: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-20 text-white"
                    required
                  />
                  <textarea 
                    placeholder="Instrucciones de preparación" 
                    value={newMeal.instructions}
                    onChange={(e) => setNewMeal({...newMeal, instructions: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24 text-white"
                    required
                  />
                  <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-lg mt-2 hover:bg-primary/90 transition-colors">
                    {editingMealId ? 'Guardar Cambios' : 'Guardar Receta'}
                  </button>
                </form>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4">
            {filteredMeals.map(meal => {
              const isConsumed = consumedMeals.includes(meal.id);
              return (
                <div key={meal.id} className={`bg-slate-800 rounded-xl border transition-colors overflow-hidden shadow-lg ${isConsumed ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-700'}`}>
                  {meal.image_url && (
                    <div className="w-full aspect-[16/10] bg-slate-900 flex items-center justify-center border-b border-slate-700 relative overflow-hidden">
                      <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-2xl text-white break-words pr-2">{meal.name}</h3>
                      <div className="flex gap-2">
                        {user && (user.role === 'admin' || meal.created_by === String(user.id)) && (
                          <>
                            <button onClick={() => handleEditMealClick(meal)} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-primary transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={async () => { await handleDeleteMeal(meal); }} className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => toggleConsumed(meal.id)}
                          className={`p-2 rounded-lg transition-colors ${isConsumed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {meal.calories || 0} kcal</span>
                      <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-rose-400" /> {meal.protein || 0}g</span>
                      <span className="flex items-center gap-1"><Wheat className="w-3 h-3 text-amber-400" /> {meal.carbs || 0}g</span>
                      <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-yellow-400" /> {meal.fats || 0}g</span>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ingredientes</p>
                        <p className="text-sm text-slate-300">{meal.ingredients}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Preparación</p>
                        <p className="text-sm text-slate-300">{meal.instructions}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {activeSection === 'libro' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HEALTHY_RECIPES.map(recipe => (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onViewDetails={setSelectedHealthyRecipe} 
              />
            ))}
          </div>

          {selectedHealthyRecipe && (
            <div className="fixed inset-0 z-[60] bg-slate-950/95 flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="relative h-48 md:h-64 shrink-0">
                  <img 
                    src={selectedHealthyRecipe.imagen_url} 
                    alt={selectedHealthyRecipe.titulo}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setSelectedHealthyRecipe(null)}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2 break-words">{selectedHealthyRecipe.titulo}</h2>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedHealthyRecipe.tiempo}</span>
                      <span className="flex items-center gap-1"><Flame className="w-4 h-4" /> {selectedHealthyRecipe.calorias_aprox} kcal</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest mb-3">Ingredientes</h4>
                      <ul className="space-y-2">
                        {selectedHealthyRecipe.ingredientes.map((ing, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest mb-3">Preparación</h4>
                      <div className="space-y-4">
                        {selectedHealthyRecipe.preparacion.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="font-bold text-emerald-500 text-sm">{i + 1}.</span>
                            <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fuente: {selectedHealthyRecipe.fuente}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'tips' && (
        <section className="space-y-4">
          <div className="bg-amber-600/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 mb-6">
            <div className="bg-amber-500 p-3 rounded-xl">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Tips de Nutrición</h3>
              <p className="text-xs text-slate-400">Consejos prácticos para una vida más saludable.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {HEALTHY_TIPS.map(tip => (
              <div key={tip.id} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-3 gap-4">
                  <h4 className="font-bold text-lg text-white break-words min-w-0">{tip.titulo}</h4>
                  <span className="bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                    {tip.categoria}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{tip.contenido}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Fuente: {tip.fuente}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
