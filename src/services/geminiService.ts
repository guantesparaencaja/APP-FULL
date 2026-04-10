import { GoogleGenAI, Type } from '@google/genai';
import { EXERCISE_CATALOG } from '../data/exercises';
import { MEAL_CATALOG } from '../data/meals';

const API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface Exercise {
  name: string;
  muscle_group: string;
  description: string;
  instructions: string;
  muscles_worked: string;
  video_url: string;
  sets: string;
  reps: string;
}

export const generateLocalMeals = (
  goal: string,
  weight: number,
  activityLevel: string,
  dietaryRestrictions: string,
  customMeals?: any[]
) => {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const catalogToUse = customMeals && customMeals.length > 0 ? customMeals : MEAL_CATALOG;

  const breakfasts = catalogToUse.filter((m) => m.category.toLowerCase() === 'desayuno');
  const lunches = catalogToUse.filter((m) => m.category.toLowerCase() === 'almuerzo');
  const dinners = catalogToUse.filter((m) => m.category.toLowerCase() === 'cena');
  const snacks = catalogToUse.filter((m) => m.category.toLowerCase() === 'snack');

  const getRandomMeal = (meals: any[]) =>
    meals.length > 0 ? meals[Math.floor(Math.random() * meals.length)] : null;

  const week = days.map((day) => {
    const b = getRandomMeal(breakfasts) || MEAL_CATALOG.find((m) => m.category === 'Desayuno');
    const l = getRandomMeal(lunches) || MEAL_CATALOG.find((m) => m.category === 'Almuerzo');
    const d = getRandomMeal(dinners) || MEAL_CATALOG.find((m) => m.category === 'Cena');
    const s = getRandomMeal(snacks) || MEAL_CATALOG.find((m) => m.category === 'Snack');

    return {
      day,
      meals: [
        {
          name: b.name,
          category: b.category,
          image_keyword: b.image_url || b.image_keyword,
          ingredients: b.ingredients,
          preparation_steps: b.preparation_steps || [{ step: b.instructions }],
          macros: b.macros || {
            calories: b.calories,
            protein: b.protein,
            carbs: b.carbs,
            fats: b.fats,
          },
        },
        {
          name: l.name,
          category: l.category,
          image_keyword: l.image_url || l.image_keyword,
          ingredients: l.ingredients,
          preparation_steps: l.preparation_steps || [{ step: l.instructions }],
          macros: l.macros || {
            calories: l.calories,
            protein: l.protein,
            carbs: l.carbs,
            fats: l.fats,
          },
        },
        {
          name: d.name,
          category: d.category,
          image_keyword: d.image_url || d.image_keyword,
          ingredients: d.ingredients,
          preparation_steps: d.preparation_steps || [{ step: d.instructions }],
          macros: d.macros || {
            calories: d.calories,
            protein: d.protein,
            carbs: d.carbs,
            fats: d.fats,
          },
        },
        {
          name: s.name,
          category: s.category,
          image_keyword: s.image_url || s.image_keyword,
          ingredients: s.ingredients,
          preparation_steps: s.preparation_steps || [{ step: s.instructions }],
          macros: s.macros || {
            calories: s.calories,
            protein: s.protein,
            carbs: s.carbs,
            fats: s.fats,
          },
        },
      ],
    };
  });

  return { week };
};

export const generateLocalWorkout = (
  age: number,
  goal: string,
  experienceLevel: string,
  equipment: string[],
  muscles: string[],
  durationMinutes: number = 60
) => {
  // Determine number of exercises based on time (9-12 as requested)
  let numExercises = 9;
  if (durationMinutes >= 60) numExercises = 12;
  if (durationMinutes <= 30) numExercises = 6;

  // Specific MuscleWiki Schedule Logic
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayName = days[new Date().getDay()];

  let targetMuscles = [...muscles];

  // Override muscles based on schedule if no specific muscles provided or if we want to follow the plan
  if (muscles.length === 0 || muscles.includes('Cuerpo Completo')) {
    switch (todayName) {
      case 'Lunes':
        targetMuscles = ['Pecho', 'Bíceps', 'Core'];
        break;
      case 'Martes':
        targetMuscles = ['Piernas', 'Gemelos', 'Cardio'];
        break;
      case 'Miércoles':
        targetMuscles = ['Espalda', 'Tríceps', 'Hombros'];
        break;
      case 'Jueves':
        targetMuscles = ['Pecho', 'Bíceps', 'Core', 'Cardio'];
        break;
      case 'Viernes':
        targetMuscles = ['Piernas', 'Gemelos']; // Femorales, Isquios, Gluteos are in Piernas
        break;
      case 'Domingo':
        targetMuscles = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Core'];
        break;
      default:
        targetMuscles = ['Core', 'Cardio']; // Saturday default
    }
  }

  // Filter catalog by muscles
  let availableExercises = EXERCISE_CATALOG.filter((ex) =>
    targetMuscles.some(
      (m) =>
        ex.muscle_group.toLowerCase().includes(m.toLowerCase()) ||
        m.toLowerCase().includes(ex.muscle_group.toLowerCase())
    )
  );

  // If no exact match, fallback to all
  if (availableExercises.length === 0) {
    availableExercises = [...EXERCISE_CATALOG];
  }

  // Use a seed based on the date to ensure it changes daily but stays consistent for the day
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((acc, val) => acc + Number(val), 0);

  // Custom shuffle with seed
  const seededShuffle = (array: any[], seed: number) => {
    let m = array.length,
      t,
      i;
    while (m) {
      i = Math.floor(Math.abs(Math.sin(seed++) * m--));
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  };

  const shuffled = seededShuffle([...availableExercises], seed);

  // Select top N
  const selected = shuffled.slice(0, numExercises);

  // Map to expected format
  const exercises = selected.map((ex) => {
    // Determine sets/reps based on goal
    let sets = '3';
    let reps = '10-12';

    if (goal.toLowerCase().includes('fuerza')) {
      sets = '4';
      reps = '5-8';
    } else if (goal.toLowerCase().includes('peso')) {
      sets = '3';
      reps = '15-20';
    }

    return {
      name: ex.name,
      muscle_group: ex.muscle_group,
      description: ex.description,
      instructions: ex.instructions,
      muscles_worked: ex.muscles_worked,
      video_url: ex.video_url,
      sets,
      reps,
    };
  });

  return {
    workout_name: `Rutina de ${muscles.join(', ')} (${durationMinutes} min)`,
    exercises,
  };
};

export const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';

  let videoId = '';
  if (url.includes('embed/')) {
    videoId = url.split('embed/')[1].split('?')[0];
  } else if (url.includes('v=')) {
    videoId = url.split('v=')[1].split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  }

  return videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&mute=1&modestbranding=1&rel=0`
    : url;
};

export const generateWorkout = async (
  age: number,
  goal: string,
  experienceLevel: string,
  equipment: string[],
  muscles: string[]
) => {
  const prompt = `Actúa como un experto de MuscleWiki. Genera una rutina de entrenamiento de un solo día para un usuario.
  Perfil del usuario:
  - Edad: ${age} años
  - Objetivo: ${goal}
  - Nivel de experiencia: ${experienceLevel}
  - Equipamiento disponible: ${equipment.join(', ')}
  - Músculos a entrenar: ${muscles.join(', ')}
  
  Genera exactamente 9 ejercicios en total (distribuidos equitativamente entre los músculos seleccionados, ej: si son 3 músculos, 3 ejercicios por músculo).
  Cada ejercicio debe incluir: nombre, grupo muscular, descripción detallada, instrucciones paso a paso (instructions), músculos trabajados (muscles_worked), sets, reps y una URL de búsqueda de YouTube para el ejercicio (video_url) usando este formato exacto: "https://www.youtube.com/embed?listType=search&list=nombre+del+ejercicio+tutorial".
  Responde estrictamente en formato JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          workout_name: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                muscle_group: { type: Type.STRING },
                description: { type: Type.STRING },
                instructions: { type: Type.STRING },
                muscles_worked: { type: Type.STRING },
                video_url: { type: Type.STRING },
                sets: { type: Type.STRING },
                reps: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

export const generateWeeklyMeals = async (
  goal: string,
  weight: number,
  activityLevel: string,
  dietaryRestrictions: string
) => {
  const prompt = `Actúa como un experto de MyRealFood. Genera un plan de comidas de 3 días (Lunes, Martes, Miércoles) para un usuario.
  Perfil del usuario:
  - Objetivo: ${goal}
  - Peso: ${weight}kg
  - Nivel de actividad: ${activityLevel}
  - Restricciones alimenticias: ${dietaryRestrictions}
  
  Para cada día, proporciona Desayuno, Almuerzo, Cena y Snack.
  Cada comida debe incluir:
  - name: nombre de la receta
  - category: categoría (Desayuno, Almuerzo, Cena, Snack)
  - image_keyword: palabra clave en inglés para buscar una imagen del plato final (ej: "orange carrot juice glass")
  - ingredients: lista de ingredientes. Cada ingrediente debe tener:
    - name: nombre del ingrediente
    - amount: cantidad (ej: "60 gramos")
    - measure: medida aproximada (ej: "aprox. 3 cucharadas")
    - icon: un emoji representativo del ingrediente
  - preparation_steps: lista de pasos de preparación. Cada paso debe tener:
    - step: descripción detallada del paso
  - macros: información nutricional detallada (calories, carbs, fats, sugars, protein, salt, saturated_fats)
  
  Responde estrictamente en formato JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          week: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                meals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      category: { type: Type.STRING },
                      image_keyword: { type: Type.STRING },
                      ingredients: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            amount: { type: Type.STRING },
                            measure: { type: Type.STRING },
                            icon: { type: Type.STRING },
                          },
                        },
                      },
                      preparation_steps: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            step: { type: Type.STRING },
                          },
                        },
                      },
                      macros: {
                        type: Type.OBJECT,
                        properties: {
                          calories: { type: Type.NUMBER },
                          carbs: { type: Type.NUMBER },
                          fats: { type: Type.NUMBER },
                          sugars: { type: Type.NUMBER },
                          protein: { type: Type.NUMBER },
                          salt: { type: Type.NUMBER },
                          saturated_fats: { type: Type.NUMBER },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  // Si solo generó 3 días, duplicamos/variamos para rellenar los 7 días
  if (parsed.week && parsed.week.length === 3) {
    const fullWeek = [
      { day: 'Lunes', meals: parsed.week[0].meals },
      { day: 'Martes', meals: parsed.week[1].meals },
      { day: 'Miércoles', meals: parsed.week[2].meals },
      { day: 'Jueves', meals: parsed.week[0].meals },
      { day: 'Viernes', meals: parsed.week[1].meals },
      { day: 'Sábado', meals: parsed.week[2].meals },
      { day: 'Domingo', meals: parsed.week[0].meals },
    ];
    parsed.week = fullWeek;
  }

  return parsed;
};

export const analyzeMealImage = async (base64Image: string) => {
  const prompt = `Analiza esta imagen de comida y proporciona la siguiente información en formato JSON:
  - name: nombre sugerido para el plato
  - calories: estimación de calorías totales (número)
  - protein: estimación de proteínas en gramos (número)
  - carbs: estimación de carbohidratos en gramos (número)
  - fats: estimación de grasas en gramos (número)
  - ingredients: una cadena de texto con los ingredientes principales detectados separados por comas.
  - instructions: una breve descripción de cómo parece haber sido preparado (máximo 2 líneas).
  
  Sé lo más preciso posible basándote en lo que ves en la foto. Responde ÚNICAMENTE con el objeto JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fats: { type: Type.NUMBER },
          ingredients: { type: Type.STRING },
          instructions: { type: Type.STRING },
        },
      },
    },
  });

  return JSON.parse(response.text || '{}');
};
