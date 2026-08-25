export interface LocalMeal {
  id: string;
  name: string;
  category: string; // Desayuno, Almuerzo, Cena, Snack
  image_url: string;
  ingredients: { name: string; amount: string; measure: string; icon: string }[];
  preparation_steps: { step: string }[];
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  tags: string[]; // e.g., 'economico', 'd1', 'ara'
}

export const MEAL_CATALOG: LocalMeal[] = [
  // DESAYUNOS
  {
    id: 'b1',
    name: 'Huevos Pericos con Arepa',
    category: 'Desayuno',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
    ingredients: [
      { name: 'Huevos', amount: '2', measure: '2 unidades', icon: '🥚' },
      { name: 'Arepa blanca (paquete D1/Ara)', amount: '1', measure: '1 unidad', icon: '🫓' },
      { name: 'Tomate y Cebolla', amount: '1/2', measure: 'Media taza picada', icon: '🍅' },
      { name: 'Mantequilla o aceite', amount: '1', measure: '1 cucharadita', icon: '🧈' },
    ],
    preparation_steps: [
      { step: 'Pica el tomate y la cebolla finamente.' },
      { step: 'Sofríe en una sartén con un poco de mantequilla o aceite.' },
      { step: 'Agrega los huevos, revuelve hasta que estén cocidos y pon sal al gusto.' },
      { step: 'Asa la arepa en un sartén o parrilla hasta que dore.' },
    ],
    macros: { calories: 320, protein: 16, carbs: 25, fats: 18 },
    tags: ['economico', 'tradicional'],
  },
  {
    id: 'b2',
    name: 'Avena en Hojuelas con Banano',
    category: 'Desayuno',
    image_url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&q=80',
    ingredients: [
      { name: 'Avena en hojuelas', amount: '50g', measure: '4 cucharadas', icon: '🌾' },
      { name: 'Leche (entera o deslactosada)', amount: '200ml', measure: '1 vaso', icon: '🥛' },
      { name: 'Banano', amount: '1', measure: '1 unidad', icon: '🍌' },
      { name: 'Canela (opcional)', amount: 'Pizca', measure: 'Al gusto', icon: '🤎' },
    ],
    preparation_steps: [
      { step: 'Pon a calentar la leche en una olla pequeña.' },
      { step: 'Agrega la avena y revuelve a fuego lento por 3-5 minutos hasta que espese.' },
      { step: 'Sirve en un plato hondo y pica el banano en rodajas por encima.' },
      { step: 'Espolvorea un poco de canela si tienes.' },
    ],
    macros: { calories: 350, protein: 12, carbs: 60, fats: 7 },
    tags: ['economico', 'energia'],
  },

  // ALMUERZOS
  {
    id: 'l1',
    name: 'Arroz, Frijoles y Huevo Frito',
    category: 'Almuerzo',
    image_url: 'https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=800&q=80',
    ingredients: [
      { name: 'Arroz blanco', amount: '150g', measure: '1 taza cocida', icon: '🍚' },
      { name: 'Frijoles (lata D1/Ara o caseros)', amount: '150g', measure: '1 taza', icon: '🫘' },
      { name: 'Huevo', amount: '1', measure: '1 unidad', icon: '🥚' },
      { name: 'Tajadas de plátano maduro', amount: '1/2', measure: 'Medio plátano', icon: '🍌' },
    ],
    preparation_steps: [
      {
        step: 'Calienta los frijoles (si son de lata, solo calentar; si son caseros, sírvelos calientes).',
      },
      { step: 'Fríe el huevo en una sartén con un poco de aceite.' },
      { step: 'Fríe o asa las tajadas de plátano maduro.' },
      { step: 'Sirve todo junto con el arroz blanco.' },
    ],
    macros: { calories: 580, protein: 22, carbs: 85, fats: 16 },
    tags: ['economico', 'volumen'],
  },
  {
    id: 'l2',
    name: 'Pechuga a la Plancha con Arroz y Ensalada',
    category: 'Almuerzo',
    image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80',
    ingredients: [
      { name: 'Pechuga de pollo', amount: '150g', measure: '1 porción', icon: '🍗' },
      { name: 'Arroz blanco', amount: '100g', measure: '3/4 taza cocida', icon: '🍚' },
      { name: 'Tomate y Cebolla', amount: '1', measure: 'Ensalada fresca', icon: '🥗' },
      { name: 'Limón', amount: '1/2', measure: 'Medio limón', icon: '🍋' },
    ],
    preparation_steps: [
      { step: 'Adoba la pechuga con sal, ajo y un poco de color/sazonador.' },
      { step: 'Asa la pechuga en una sartén a fuego medio hasta que dore por ambos lados.' },
      { step: 'Pica el tomate y la cebolla en rodajas, agrega sal y limón.' },
      { step: 'Sirve el pollo con el arroz y la ensalada fresca.' },
    ],
    macros: { calories: 450, protein: 45, carbs: 40, fats: 10 },
    tags: ['economico', 'proteina'],
  },

  // CENAS
  {
    id: 'd1',
    name: 'Arepa con Queso y Chocolate',
    category: 'Cena',
    image_url: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=800&q=80',
    ingredients: [
      { name: 'Arepa blanca', amount: '1', measure: '1 unidad', icon: '🫓' },
      { name: 'Queso tajado o campesino', amount: '2', measure: '2 tajadas', icon: '🧀' },
      { name: 'Chocolate de mesa', amount: '1', measure: '1 pastilla', icon: '☕' },
      { name: 'Leche o agua', amount: '250ml', measure: '1 taza', icon: '🥛' },
    ],
    preparation_steps: [
      { step: 'Asa la arepa en la parrilla o sartén.' },
      { step: 'Cuando esté caliente, ábrela o pon el queso encima para que se derrita.' },
      { step: 'Prepara el chocolate hirviendo la pastilla en leche o agua y batiendo bien.' },
      { step: 'Sirve caliente.' },
    ],
    macros: { calories: 380, protein: 14, carbs: 45, fats: 16 },
    tags: ['economico', 'tradicional'],
  },
  {
    id: 'd2',
    name: 'Atún con Galletas Saltinas',
    category: 'Cena',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    ingredients: [
      { name: 'Atún en lata (D1/Ara)', amount: '1', measure: '1 lata', icon: '🐟' },
      { name: 'Galletas Saltinas', amount: '1', measure: '1 taco pequeño', icon: '🍘' },
      { name: 'Tomate', amount: '1/2', measure: 'Medio tomate picado', icon: '🍅' },
      { name: 'Mayonesa o Limón (opcional)', amount: '1', measure: 'Al gusto', icon: '🍋' },
    ],
    preparation_steps: [
      { step: 'Abre y escurre el agua o aceite de la lata de atún.' },
      { step: 'Pica el tomate en cuadritos muy pequeños.' },
      { step: 'Mezcla el atún con el tomate y unas gotas de limón (o un toque de mayonesa).' },
      { step: 'Acompaña con las galletas saltinas.' },
    ],
    macros: { calories: 300, protein: 25, carbs: 25, fats: 10 },
    tags: ['economico', 'rapido'],
  },

  // SNACKS
  {
    id: 's1',
    name: 'Manzana con Mantequilla de Maní',
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800&q=80',
    ingredients: [
      { name: 'Manzana (roja o verde)', amount: '1', measure: '1 unidad', icon: '🍎' },
      { name: 'Mantequilla de maní', amount: '20g', measure: '1 cucharada', icon: '🥜' },
    ],
    preparation_steps: [
      { step: 'Lava y corta la manzana en cascos (rodajas gruesas).' },
      { step: 'Unta un poco de mantequilla de maní en cada trozo de manzana.' },
      { step: '¡Disfruta tu snack rápido y nutritivo!' },
    ],
    macros: { calories: 200, protein: 5, carbs: 25, fats: 10 },
    tags: ['economico', 'saludable'],
  },
  {
    id: 's2',
    name: 'Yogur con Granola',
    category: 'Snack',
    image_url: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80',
    ingredients: [
      { name: 'Yogur (vaso D1/Ara)', amount: '1', measure: '1 vaso (150g)', icon: '🥛' },
      { name: 'Granola', amount: '30g', measure: '2 cucharadas', icon: '🥣' },
    ],
    preparation_steps: [
      { step: 'Abre el yogur y sírvelo en un vaso o taza.' },
      { step: 'Agrega la granola por encima.' },
      { step: 'Mezcla y come de inmediato para que la granola siga crujiente.' },
    ],
    macros: { calories: 220, protein: 8, carbs: 35, fats: 5 },
    tags: ['economico', 'rapido'],
  },
];
