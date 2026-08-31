import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  ArrowLeft,
  Plus,
  Utensils,
  Flame,
  Wheat,
  Beef,
  X,
  Image as ImageIcon,
  Trash2,
  Droplet,
  Search,
  CheckCircle2,
  Calendar,
  RefreshCw,
  ShoppingCart,
  Coffee,
  Moon,
  Apple,
  Clock,
  Lightbulb,
  Edit2,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateLocalMeals } from '../services/geminiService';
import { AssessmentModal } from '../components/AssessmentModal';
import { HEALTHY_RECIPES, HealthyRecipe } from '../data/healthyRecipes';
import { HEALTHY_TIPS } from '../data/healthyTips';
import { RecipeCard } from '../components/RecipeCard';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/PageHeader';
import { staggerContainer, staggerItem, liftCard } from '../lib/animations';

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
  goal?: 'bajar' | 'mantener' | 'subir' | 'general' | string;
  tips?: string;
  source_book?: string;
  created_by?: string;
}

const GOAL_OPTIONS = [
  { id: 'bajar', label: 'Bajar peso', description: 'Menos calorías y más saciedad' },
  { id: 'mantener', label: 'Mantener', description: 'Alimentación equilibrada' },
  { id: 'subir', label: 'Subir peso', description: 'Más energía y proteína' },
] as const;

const normalizeGoal = (value?: string) => {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('bajar') || normalized.includes('perd')) return 'bajar';
  if (normalized.includes('subir') || normalized.includes('aument') || normalized.includes('ganar')) return 'subir';
  return 'mantener';
};

const EXTERNAL_MEAL_PLACEHOLDERS: Record<string, string> = {
  desayuno: 'https://images.unsplash.com/photo-1533087375-6c3f4f9f5a1f?w=1200&q=80',
  almuerzo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80',
  cena: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80',
  snack: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=1200&q=80',
};

const getMealImage = (meal: Meal) => meal.image_url || EXTERNAL_MEAL_PLACEHOLDERS[meal.category.toLowerCase()] || EXTERNAL_MEAL_PLACEHOLDERS.almuerzo;

export function Meals() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingNutritionId, setEditingNutritionId] = useState<string | null>(null);
  const [newMeal, setNewMeal] = useState<Partial<Meal>>({
    name: '',
    category: 'desayuno',
    ingredients: '',
    instructions: '',
    video_url: '',
    image_url: '',
    goal: 'general',
    tips: '',
    source_book: '',
  });
  const [nutrition, setNutrition] = useState({ calories: '', carbs: '', protein: '', fats: '' });
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('todas');
  const [activeGoal, setActiveGoal] = useState<string>('mantener');
  const [consumedMeals, setConsumedMeals] = useState<string[]>([]);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'mis_recetas' | 'libro' | 'tips'>(
    'mis_recetas'
  );
  const [selectedHealthyRecipe, setSelectedHealthyRecipe] = useState<HealthyRecipe | null>(null);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const handleGenerateMealPlan = async () => {
    if (!user?.assessment_completed) { setShowAssessment(true); return; }
    setIsGenerating(true);
    try {
      const plan = generateLocalMeals(user?.goal || 'mantener', user?.weight || 70, user?.activity_level || 'moderado', user?.dietary_restrictions || 'ninguna', meals);
      if (user?.id) {
        await supabase.from('profiles').update({ weekly_meal_plan: plan }).eq('id', user.id);
        useStore.getState().setUser({ ...user, weekly_meal_plan: plan });
      }
      setShowMealPlanner(false);
    } catch (err) { console.error(err); alert('Error al generar el plan.'); } finally { setIsGenerating(false); }
  };

  const weight = user?.weight || 70;
  const goal = user?.goal || 'mantener';

  useEffect(() => {
    setActiveGoal(normalizeGoal(user?.goal));
  }, [user?.goal]);

  let baseCalories = weight * 24 * 1.3;
  if (goal === 'bajar') baseCalories -= 500;
  if (goal === 'subir') baseCalories += 500;

  const targetProtein = Math.round(weight * 2.2);
  const targetFats = Math.round(weight * 1);
  const targetCarbs = Math.round((baseCalories - targetProtein * 4 - targetFats * 9) / 4);
  const targetCalories = Math.round(baseCalories);

  const consumedMacros = consumedMeals.reduce(
    (acc, mealId) => {
      const meal = meals.find((m) => m.id === mealId);
      if (meal) {
        acc.calories += meal.calories || 0;
        acc.protein += meal.protein || 0;
        acc.carbs += meal.carbs || 0;
        acc.fats += meal.fats || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const toggleConsumed = (mealId: string) => {
    if (consumedMeals.includes(mealId)) {
      setConsumedMeals(consumedMeals.filter((id) => id !== mealId));
    } else {
      setConsumedMeals([...consumedMeals, mealId]);
    }
  };

  const filteredMeals = meals.filter((meal) => {
    const matchesSearch =
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'todas' || meal.category === activeCategory;
    const matchesGoal = activeGoal === 'todas' || !meal.goal || meal.goal === 'general' || normalizeGoal(meal.goal) === activeGoal;
    return matchesSearch && matchesCategory && matchesGoal;
  });

  const filteredBookRecipes = HEALTHY_RECIPES.filter((recipe) => {
    if (activeGoal === 'todas') return true;
    if (recipe.objetivo) return recipe.objetivo === activeGoal || recipe.objetivo === 'general';
    // Compatibilidad con el catálogo anterior mientras se clasifican los libros.
    const inferred = recipe.calorias_aprox <= 350 ? 'bajar' : recipe.calorias_aprox >= 600 ? 'subir' : 'mantener';
    return inferred === activeGoal;
  });

  useEffect(() => {
    supabase.from('meals').select('*').then(({ data }) => { if (data) setMeals(data as Meal[]); });
    const channel = supabase.channel('meals-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, async () => {
        const { data } = await supabase.from('meals').select('*');
        if (data) setMeals(data as Meal[]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedEditingId = editingMealId;
      const { error } = savedEditingId
        ? await supabase.from('meals').update(newMeal).eq('id', savedEditingId)
        : await supabase.from('meals').insert({ ...newMeal, created_by: String(user?.id) });
      if (error) throw error;
      setEditingMealId(null);
      setActiveCategory(newMeal.category); setSearchQuery('');
      setShowAddForm(false);
      setNewMeal({ name: '', category: 'desayuno', ingredients: '', instructions: '', video_url: '', image_url: '', goal: 'general', tips: '', source_book: '' });
    } catch (error) { console.error('Error saving meal:', error); showAlert('No se guardó la receta', 'Revisa los datos e inténtalo de nuevo.', 'error'); }
  };

  const handleDeleteMeal = async (meal: Meal) => {
    if (!window.confirm('¿Deseas eliminar esta receta definitivamente?')) return;
    try { await supabase.from('meals').delete().eq('id', meal.id); } catch (error) { console.error('Error deleting meal:', error); }
  };

  const handleEditMealClick = (meal: Meal) => {
    setNewMeal(meal);
    setEditingMealId(meal.id);
    setShowAddForm(true);
  };

  const handleAddNutrition = async (e: React.FormEvent, mealId: string) => {
    e.preventDefault();
    const updatedMeal = { calories: parseInt(nutrition.calories), carbs: parseInt(nutrition.carbs), protein: parseInt(nutrition.protein), fats: parseInt(nutrition.fats) };
    try {
      await supabase.from('meals').update(updatedMeal).eq('id', mealId);
      setEditingNutritionId(null); setNutrition({ calories: '', carbs: '', protein: '', fats: '' });
    } catch (error) { console.error('Error updating nutrition:', error); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display p-4 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-8 h-8" />
        </div>
        <PageHeader
          emoji="🥗"
          title="Comidas Saludables"
          subtitle="Recetas, planes y macros diarios"
        />
      </div>

      <Reveal className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
        <button
          onClick={() => setActiveSection('mis_recetas')}
          className={`btn-press flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'mis_recetas' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Mis Recetas
        </button>
        <button
          onClick={() => setActiveSection('libro')}
          className={`btn-press flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'libro' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Recetas del Libro
        </button>
        <button
          onClick={() => setActiveSection('tips')}
          className={`btn-press flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'tips' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Tips Comidas Saludables
        </button>
      </Reveal>

      {activeSection === 'mis_recetas' && (
        <>
          <Reveal>
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
                      className="btn-press text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"
                    >
                      <ShoppingCart className="w-3 h-3" /> Compras
                    </button>
                  )}
                  <button
                    onClick={() => setShowMealPlanner(!showMealPlanner)}
                    className="btn-press text-xs font-bold bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors"
                  >
                    {user?.weekly_meal_plan ? 'Ver Mi Plan' : 'Generar Plan'}
                  </button>
                </div>
              </div>

              {showMealPlanner && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                  <p className="text-sm text-slate-400">
                    Generaremos un plan de 7 días basado en tus objetivos de {user?.goal} y tu peso
                    de {user?.weight}kg.
                  </p>
                  <button
                    onClick={handleGenerateMealPlan}
                    disabled={isGenerating}
                    className="btn-press w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Utensils className="w-5 h-5" />
                    )}
                    {user?.weekly_meal_plan ? 'Regenerar Mi Plan' : 'Generar Mi Plan Semanal'}
                  </button>

                  {user?.weekly_meal_plan && user.weekly_meal_plan.week && (
                    <div className="mt-8 space-y-4">
                      <h3 className="font-black italic text-lg uppercase text-primary">
                        Tu Plan Generado
                      </h3>
                      {user.weekly_meal_plan.week.map((dayPlan: any, i: number) => (
                        <div
                          key={i}
                          className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedDay(expandedDay === dayPlan.day ? null : dayPlan.day)
                            }
                            className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-800 transition-colors"
                          >
                            <span className="font-black uppercase tracking-widest">
                              {dayPlan.day}
                            </span>
                            <span className="text-primary font-bold text-xl">
                              {expandedDay === dayPlan.day ? '-' : '+'}
                            </span>
                          </button>
                          {expandedDay === dayPlan.day && (
                            <div className="p-4 border-t border-slate-800 space-y-4">
                              {dayPlan.meals.map((m: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-slate-800 p-4 rounded-xl border border-slate-700/50"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-lg">{m.name}</h4>
                                    <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-1 rounded">
                                      {m.category}
                                    </span>
                                  </div>
                                  <div className="flex gap-3 text-[10px] font-bold text-slate-400 tracking-widest mt-2">
                                    <span className="flex items-center gap-1">
                                      <Flame className="w-3 h-3 text-orange-400" />{' '}
                                      {m.macros?.calories || 0} kcal
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Beef className="w-3 h-3 text-rose-400" />{' '}
                                      {m.macros?.protein || 0}g prot
                                    </span>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                                      Ingredientes
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-1">
                                      {Array.isArray(m.ingredients) ? (
                                        m.ingredients.map((ing: any, k: number) => (
                                          <li key={k}>
                                            • {ing.amount} {ing.measure} {ing.name}
                                          </li>
                                        ))
                                      ) : (
                                        <li>{m.ingredients}</li>
                                      )}
                                    </ul>
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                                      Preparación
                                    </p>
                                    <ul className="text-xs text-slate-300 space-y-1">
                                      {Array.isArray(m.preparation_steps) ? (
                                        m.preparation_steps.map((step: any, k: number) => (
                                          <li key={k}>
                                            {k + 1}. {step.step || step}
                                          </li>
                                        ))
                                      ) : (
                                        <li>{m.instructions || 'Preparación detallada.'}</li>
                                      )}
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
          </Reveal>

          <section className="mb-6">
            <Reveal>
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
                  <span className="font-bold text-sm">
                    {consumedMacros.calories} / {targetCalories}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Beef className="w-5 h-5 text-rose-400 mb-1" />
                  <span className="text-xs text-slate-400">Prot</span>
                  <span className="font-bold text-sm">
                    {consumedMacros.protein}g / {targetProtein}g
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Wheat className="w-5 h-5 text-amber-400 mb-1" />
                  <span className="text-xs text-slate-400">Carbs</span>
                  <span className="font-bold text-sm">
                    {consumedMacros.carbs}g / {targetCarbs}g
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
                  <Droplet className="w-5 h-5 text-yellow-400 mb-1" />
                  <span className="text-xs text-slate-400">Grasas</span>
                  <span className="font-bold text-sm">
                    {consumedMacros.fats}g / {targetFats}g
                  </span>
                </div>
              </div>
            </div>
            </Reveal>

            <Reveal className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar recetas o ingredientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-white"
              />
            </Reveal>

            <Reveal className="flex overflow-x-auto hide-scrollbar gap-2 mb-3 pb-2">
              {[
                { id: 'todas', label: 'Todas', icon: Utensils },
                { id: 'desayuno', label: 'Desayuno', icon: Coffee },
                { id: 'almuerzo', label: 'Almuerzo', icon: Beef },
                { id: 'cena', label: 'Cena', icon: Moon },
                { id: 'snack', label: 'Snack', icon: Apple },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`btn-press flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all capitalize ${activeCategory === cat.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </Reveal>

            <Reveal className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Objetivo nutricional</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setActiveGoal('todas')}
                  className={`btn-press px-3 py-2 rounded-xl text-xs font-bold ${activeGoal === 'todas' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >Todas
                </button>
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setActiveGoal(option.id)}
                    title={option.description}
                    className={`btn-press px-3 py-2 rounded-xl text-xs font-bold ${activeGoal === option.id ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                  >{option.label}
                  </button>
                ))}
              </div>
            </Reveal>

            {user?.role === 'admin' && !showAddForm && (
              <div className="grid grid-cols-1 gap-3 mb-6">
                <button aria-label="Agregar"
                  onClick={() => setShowAddForm(true)}
                  className="btn-press w-full flex items-center justify-center gap-2 bg-primary/20 text-primary border border-primary/50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/30 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Subir Receta Manualmente
                </button>
              </div>
            )}

            <AssessmentModal isOpen={showAssessment} onClose={() => setShowAssessment(false)} />

            <Modal
              isOpen={showAddForm}
              onClose={() => {
                setShowAddForm(false);
                setEditingMealId(null);
                setNewMeal({
                  name: '',
                  category: 'desayuno',
                  ingredients: '',
                  instructions: '',
                  video_url: '',
                  image_url: '',
                });
              }}
              title={editingMealId ? 'Editar Receta' : 'Nueva Receta'}
            >
              <form onSubmit={handleAddMeal} className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL externa de imagen</label>
                  </div>
                  <input
                    type="url"
                    placeholder="https://... (Drive público, CDN o imagen externa)"
                    value={newMeal.image_url || ''}
                    onChange={(e) => setNewMeal({ ...newMeal, image_url: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">No se suben imágenes a Supabase ni a Vercel.</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Nombre de la Receta</label>
                    <input
                      type="text"
                      placeholder="Ej: Pollo Teriyaki con Brócoli"
                      value={newMeal.name}
                      onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Categoría</label>
                    <select
                      value={newMeal.category}
                      onChange={(e) => setNewMeal({ ...newMeal, category: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white appearance-none"
                    >
                      <option value="desayuno">Desayuno</option>
                      <option value="almuerzo">Almuerzo</option>
                      <option value="cena">Cena</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Objetivo del estudiante</label>
                    <select
                      value={newMeal.goal || 'general'}
                      onChange={(e) => setNewMeal({ ...newMeal, goal: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white appearance-none"
                    >
                      <option value="general">General / mostrar en todos</option>
                      {GOAL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-center">Calorías</label>
                      <input
                        type="number"
                        value={newMeal.calories || ''}
                        onChange={(e) =>
                          setNewMeal({ ...newMeal, calories: e.target.value === '' ? 0 : Number(e.target.value) })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 text-sm font-black text-orange-400 text-center outline-none focus:border-orange-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-center">Proteínas</label>
                      <input
                        type="number"
                        value={newMeal.protein || ''}
                        onChange={(e) =>
                          setNewMeal({ ...newMeal, protein: e.target.value === '' ? 0 : Number(e.target.value) })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 text-sm font-black text-blue-400 text-center outline-none focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-center">Carbs</label>
                      <input
                        type="number"
                        value={newMeal.carbs || ''}
                        onChange={(e) =>
                          setNewMeal({ ...newMeal, carbs: e.target.value === '' ? 0 : Number(e.target.value) })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 text-sm font-black text-amber-400 text-center outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-center">Grasas</label>
                      <input
                        type="number"
                        value={newMeal.fats || ''}
                        onChange={(e) =>
                          setNewMeal({ ...newMeal, fats: e.target.value === '' ? 0 : Number(e.target.value) })
                        }
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-3 text-sm font-black text-yellow-400 text-center outline-none focus:border-yellow-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Ingredientes</label>
                    <textarea
                      placeholder="Pollo, arroz, brócoli, salsa soja..."
                      value={newMeal.ingredients}
                      onChange={(e) => setNewMeal({ ...newMeal, ingredients: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white h-24 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Preparación</label>
                    <textarea
                      placeholder="1. Cocinar el arroz...\n2. Saltear el pollo..."
                      value={newMeal.instructions}
                      onChange={(e) => setNewMeal({ ...newMeal, instructions: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white h-32 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Tips de valor</label>
                    <textarea
                      placeholder="Conservación, sustituciones, punto de cocción o recomendación nutricional..."
                      value={newMeal.tips || ''}
                      onChange={(e) => setNewMeal({ ...newMeal, tips: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1">Libro / fuente</label>
                    <input
                      type="text"
                      placeholder="Nombre del libro o fuente autorizada"
                      value={newMeal.source_book || ''}
                      onChange={(e) => setNewMeal({ ...newMeal, source_book: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary outline-none text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-press w-full bg-emerald-600 text-white font-black py-4 rounded-xl mt-4 shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {editingMealId ? 'Guardar Cambios' : 'Publicar Receta'}
                </button>
              </form>
            </Modal>
          </section>

          <motion.section
            key={activeCategory}
            initial="hidden"
            animate="show"
            variants={staggerContainer}
            className="flex flex-col gap-4"
          >
            {filteredMeals.map((meal) => {
              const isConsumed = consumedMeals.includes(meal.id);
              return (
                <motion.div
                  key={meal.id}
                  variants={staggerItem}
                  {...liftCard}
                  className={`bg-slate-800 rounded-xl border transition-colors overflow-hidden shadow-lg ${isConsumed ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-slate-700'}`}
                >
                  <div className="w-full aspect-16/10 bg-slate-900 flex items-center justify-center border-b border-slate-700 relative overflow-hidden">
                    <img
                      src={getMealImage(meal)}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                    {!meal.image_url && <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80">Imagen provisional</span>}
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-2xl text-white wrap-break-word pr-2">
                        {meal.name}
                      </h3>
                      <div className="flex gap-2">
                        {user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleEditMealClick(meal)}
                              className="btn-press p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-primary transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button aria-label="Eliminar"
                              onClick={async () => {
                                await handleDeleteMeal(meal);
                              }}
                              className="btn-press p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => toggleConsumed(meal.id)}
                          className={`btn-press p-2 rounded-lg transition-colors ${isConsumed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                        {meal.goal === 'bajar' ? 'Bajar peso' : meal.goal === 'subir' ? 'Subir peso' : meal.goal === 'mantener' ? 'Mantener' : 'General'}
                      </span>
                      {meal.source_book && <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">{meal.source_book}</span>}
                    </div>

                    <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" /> {meal.calories || 0} kcal
                      </span>
                      <span className="flex items-center gap-1">
                        <Beef className="w-3 h-3 text-rose-400" /> {meal.protein || 0}g
                      </span>
                      <span className="flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-amber-400" /> {meal.carbs || 0}g
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-yellow-400" /> {meal.fats || 0}g
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                          Ingredientes
                        </p>
                        <p className="text-2xl text-slate-300 leading-relaxed">{meal.ingredients}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                          Preparación
                        </p>
                        <p className="text-2xl text-slate-300 leading-relaxed">{meal.instructions}</p>
                      </div>
                      {meal.tips && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Tips de valor</p>
                          <p className="text-sm text-slate-300 leading-relaxed">{meal.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingMealId === meal.id && (
                    <div className="p-5 border-t border-slate-700 bg-slate-900/50 animate-in slide-in-from-top-4 duration-300">
                      <form onSubmit={handleAddMeal} className="flex flex-col gap-4">
                        <div className="space-y-4">
                          <input
                            type="text"
                            placeholder="Nombre de la Receta"
                            value={newMeal.name}
                            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary outline-none"
                            required
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              placeholder="Kcal"
                              value={newMeal.calories || ''}
                              onChange={(e) => setNewMeal({ ...newMeal, calories: Number(e.target.value) })}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-orange-400 font-black text-center"
                            />
                            <input
                              type="number"
                              placeholder="Prot (g)"
                              value={newMeal.protein || ''}
                              onChange={(e) => setNewMeal({ ...newMeal, protein: Number(e.target.value) })}
                              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-blue-400 font-black text-center"
                            />
                          </div>
                          <textarea
                            placeholder="Ingredientes..."
                            value={newMeal.ingredients}
                            onChange={(e) => setNewMeal({ ...newMeal, ingredients: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white h-32 resize-none"
                            required
                          />
                          <textarea
                            placeholder="Preparación..."
                            value={newMeal.instructions}
                            onChange={(e) => setNewMeal({ ...newMeal, instructions: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white h-32 resize-none"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="btn-press flex-1 bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMealId(null);
                              setNewMeal({ name: '', category: 'desayuno', ingredients: '', instructions: '', video_url: '', image_url: '' });
                            }}
                            className="btn-press px-6 bg-slate-700 text-slate-300 font-black py-4 rounded-xl hover:bg-slate-600 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.section>
        </>
      )}

      {activeSection === 'libro' && (
        <section className="space-y-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-slate-300">
              <p className="font-bold text-emerald-300">Recetas organizadas por objetivo</p>
              <p className="mt-1 text-xs text-slate-400">El filtro se adapta a tu objetivo. Las recetas sin objetivo específico aparecen como generales.</p>
            </div>
            {filteredBookRecipes.map((recipe) => (
              <motion.div key={recipe.id} variants={staggerItem} {...liftCard}>
                <RecipeCard
                  recipe={recipe}
                  onViewDetails={setSelectedHealthyRecipe}
                />
              </motion.div>
            ))}
          </motion.div>

          {selectedHealthyRecipe && (
            <div className="fixed inset-0 z-60 bg-slate-950/95 flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="relative h-48 md:h-64 shrink-0">
                  <img
                    src={selectedHealthyRecipe.imagen_url}
                    alt={selectedHealthyRecipe.titulo}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button aria-label="Cerrar"
                    onClick={() => setSelectedHealthyRecipe(null)}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2 wrap-break-word">
                      {selectedHealthyRecipe.titulo}
                    </h2>
                    <div className="flex gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {selectedHealthyRecipe.tiempo}
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-4 h-4" /> {selectedHealthyRecipe.calorias_aprox} kcal
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest mb-3">
                        Ingredientes
                      </h4>
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
                      <h4 className="font-bold text-emerald-400 uppercase text-xs tracking-widest mb-3">
                        Preparación
                      </h4>
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
                    {selectedHealthyRecipe.tips && <p className="text-sm text-amber-300 mb-4">Tip: {selectedHealthyRecipe.tips}</p>}
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Fuente: {selectedHealthyRecipe.fuente}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeSection === 'tips' && (
        <section className="space-y-4">
          <Reveal className="bg-amber-600/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 mb-6">
            <div className="bg-amber-500 p-3 rounded-xl">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Tips de Comidas Saludables</h3>
              <p className="text-xs text-slate-400">
                Consejos prácticos para una vida más saludable.
              </p>
            </div>
          </Reveal>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {HEALTHY_TIPS.map((tip) => (
              <motion.div
                key={tip.id}
                variants={staggerItem}
                {...liftCard}
                className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl shrink-0">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">
                      {tip.categoria}
                    </span>
                    <h4 className="font-bold text-white text-sm leading-tight">{tip.titulo}</h4>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed pl-11">{tip.contenido}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 mt-auto">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                    Fuente: {tip.fuente}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              {alertModal.type === 'success' && (
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              )}
              {alertModal.type === 'error' && <X className="w-16 h-16 text-red-500 mb-4" />}
              {alertModal.type === 'info' && <Lightbulb className="w-16 h-16 text-blue-500 mb-4" />}
              <h3 className="text-xl font-bold text-white mb-2">{alertModal.title}</h3>
              <p className="text-slate-400 text-sm mb-6">{alertModal.message}</p>
              <button
                onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
                className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
