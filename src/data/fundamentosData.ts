import { FundamentosModule } from '../types/fundamentos.types';

export const FUNDAMENTOS_MODULES: FundamentosModule[] = [
  {
    id: 'golpes',
    title: 'Módulo 1: Golpes Básicos',
    emoji: '👊',
    description: 'La base ofensiva del boxeador: Jab, Cross, Hook y Uppercut.',
    content: [
      {
        title: 'Jab',
        description: 'Golpe directo con la mano delantera. Es el golpe más importante del boxeo.',
        execution: 'Rotar el puño al extender, volver inmediatamente a guardia. Pies bien plantados.',
        errors: 'No volver la mano, bajar el codo, no estirar el brazo completamente.',
        combinations: '1-1, 1-2, 1-1-2'
      },
      {
        title: 'Cross',
        description: 'Golpe recto con la mano trasera. Tu principal arma de potencia.',
        execution: 'Rotar cadera y pie trasero, transferir el peso del cuerpo hacia adelante.',
        errors: 'Telegrafiar el golpe, no rotar la cadera, quedar desequilibrado.'
      },
      {
        title: 'Hook (Gancho)',
        description: 'Golpe circular de corto alcance ideal para romper guardias.',
        execution: 'Codo a la altura del puño (90°), pivotar el pie delantero con fuerza.',
        errors: 'Gancho demasiado amplio, perder el equilibrio, bajar la mano opuesta.'
      },
      {
        title: 'Uppercut',
        description: 'Golpe ascendente para atacar por debajo de la guardia.',
        execution: 'Bajar ligeramente el hombro, explotar con las piernas hacia arriba.',
        errors: 'Bajar demasiado la guardia, ejecutarlo muy afuera del eje.'
      },
      {
        title: 'Body Shots',
        description: 'Ataques estratégicos al hígado y costillas.',
        execution: 'Doblar las rodillas para bajar el centro de gravedad, no inclinarse.',
        errors: 'Bajar la guardia de la cabeza al atacar el cuerpo.'
      },
      {
        title: 'Overhand',
        description: 'Golpe en arco descendente por encima de la guardia rival.',
        execution: 'Paso hacia adelante + rotación total del cuerpo buscando el ángulo.',
        errors: 'Exponerse demasiado, no cubrirse con el hombro.'
      }
    ],
    videoTags: ['Jab', 'Cross', 'Hook', 'Uppercut', 'Body Shot', 'Overhand']
  },
  {
    id: 'postura',
    title: 'Módulo 2: Postura y Guardia',
    emoji: '🛡️',
    description: 'Cimientos defensivos y equilibrio en el ring.',
    content: [
      {
        title: 'Guardia Ortodoxa',
        description: 'Para diestros: Pie izquierdo adelante, mano izquierda adelante.',
        execution: 'Distribución de peso: 60% pie trasero, 40% delantero. Rodillas semiflexionadas.',
        errors: 'Pies en línea, peso demasiado adelante.',
      },
      {
        title: 'Guardia Southpaw',
        description: 'Para zurdos: Pie derecho adelante, mano derecha adelante.',
        execution: 'Espejo de la ortodoxa. Genera ángulos problemáticos para el rival.',
        errors: 'Cruzar los pies al desplazarse.',
      },
      {
        title: 'Posición de Manos y Mentón',
        description: 'Protección constante de las zonas vitales.',
        execution: 'Puños a la altura del mentón, codos pegados a las costillas, mentón abajo.',
        errors: 'Codos abiertos, mentón expuesto.',
      },
      {
        title: 'Variantes de Guardia',
        description: 'Philly Shell, Peek-a-boo, High Guard.',
        execution: 'Ajustar según el estilo del rival y la distancia de pelea.',
        errors: 'Usar una guardia avanzada sin dominar la básica.',
      }
    ],
    videoTags: ['Ortodoxa', 'Southpaw', 'Philly Shell', 'Peek-a-boo', 'Corrección de postura']
  },
  {
    id: 'defensas',
    title: 'Módulo 3: Defensas y Esquivas',
    emoji: '🌀',
    description: 'El arte de no ser golpeado: Slips, Rolls y Parries.',
    content: [
      {
        title: 'Slip (Esquiva lateral)',
        description: 'Mover la cabeza fuera de la línea de fuego.',
        execution: 'Rotar ligeramente el torso. Slip externo vs Slip interno.',
        errors: 'Inclinarse demasiado, cerrar los ojos.',
      },
      {
        title: 'Roll / Bob and Weave',
        description: 'Movimiento semicircular bajo el golpe del rival.',
        execution: 'Doblar las rodillas para pasar bajo el golpe, no la espalda.',
        errors: 'Mirar al suelo, bajar las manos.',
      },
      {
        title: 'Parry (Desvío)',
        description: 'Redirigir el golpe con la palma de la mano.',
        execution: 'Movimiento corto con la mano, nunca "atrapar" el golpe.',
        errors: 'Mover la mano demasiado lejos de la cara.',
      },
      {
        title: 'Pull Back',
        description: 'Retroceder el torso para sacar la cabeza de distancia.',
        execution: 'Movimiento rápido de cintura hacia atrás y volver inmediatamente.',
        errors: 'Quedarse atrás demasiado tiempo.',
      }
    ],
    videoTags: ['Slip', 'Roll', 'Parry', 'Pull back', 'Cover', 'Clinch', 'Ángulos defensivos']
  },
  {
    id: 'footwork',
    title: 'Módulo 4: Desplazamientos',
    emoji: '👣',
    description: 'Control de la distancia y posicionamiento táctico.',
    content: [
      {
        title: 'Paso Lateral y Frontal',
        description: 'Moverse en el ring manteniendo la base.',
        execution: 'El pie de la dirección mueve primero. Nunca cruzar los pies.',
        errors: 'Juntar los pies, saltar innecesariamente.',
      },
      {
        title: 'Pivotes',
        description: 'Cambiar el ángulo de ataque rotando sobre un pie.',
        execution: 'Rotar sobre el metatarso del pie delantero para quedar de flanco al rival.',
        errors: 'Perder el equilibrio en el giro.',
      },
      {
        title: 'Cut Off (Cortar el Ring)',
        description: 'Cerrar las salidas al oponente para acorralarlo.',
        execution: 'Moverse lateralmente para interceptar al rival, no perseguirlo.',
        errors: 'Correr detrás del rival en línea recta.',
      }
    ],
    videoTags: ['Paso lateral', 'Paso adelante/atrás', 'Pivote', 'Círculo al rival', 'Cut off']
  },
  {
    id: 'sombra',
    title: 'Módulo 5: Sombra (Shadowboxing)',
    emoji: '👤',
    description: 'Visualización y perfeccionamiento técnico sin contacto.',
    content: [
      {
        title: 'Propósito y Estructura',
        description: 'Cómo entrenar solo frente al espejo o al aire.',
        execution: 'Visualizar un oponente. Rounds de técnica mixta con defensas.',
        errors: 'Golpear sin regresar a guardia, no mover los pies.',
      },
      {
        title: 'Técnicas de Mejora',
        description: 'Grabación, uso de espejo y rounds específicos.',
        execution: 'Alternar rounds lentos de precisión con rounds de ritmo real.',
        errors: 'Ir al 100% de potencia siempre.',
      }
    ],
    videoTags: ['Sombra principiante', 'Sombra intermedio', 'Sombra con foco en footwork', 'Sombra con defensa']
  },
  {
    id: 'implementos',
    title: 'Módulo 8: Trabajo con Implementos',
    emoji: '🥋',
    description: 'Sacos, mitts, pera y herramientas de entrenamiento.',
    content: [
      {
        title: 'Saco Pesado (Heavy Bag)',
        description: 'Desarrollo de potencia y resistencia de golpeo.',
        execution: 'Golpear a través del saco, mantener la distancia y el movimiento.',
        errors: 'Empujar el saco en lugar de golpearlo, abrazarlo.',
      },
      {
        title: 'Gobernadora y Mitts',
        description: 'Precisión y timing con el entrenador.',
        execution: 'Reaccionar a los estímulos, seguir moviéndose tras golpear.',
        errors: 'Golpear con ritmo monótono.',
      },
      {
        title: 'Vendaje de Manos',
        description: 'La protección fundamental antes de calzarse los guantes.',
        execution: 'Asegurar muñeca y nudillos. Firme pero sin cortar circulación.',
        errors: 'Vendar demasiado flojo.',
      }
    ],
    videoTags: ['Trabajo en saco', 'Trabajo en pads', 'Speed bag', 'Double end bag', 'Cómo vendarse las manos']
  },
  {
    id: 'acondicionamiento',
    title: 'Módulo 9: Acondicionamiento Físico',
    emoji: '💪',
    description: 'Fuerza, cardio y resistencia específica para combate.',
    content: [
      {
        title: 'Salto de Cuerda',
        description: 'Herramienta vital para el ritmo y el footwork.',
        execution: 'Saltos cortos sobre el metatarso. Usar muñecas, no brazos.',
        errors: 'Saltar demasiado alto, caer con el talón.',
      },
      {
        title: 'Fuerza Funcional',
        description: 'Flexiones, core y explosividad de piernas.',
        execution: 'Enfocarse en la cadena cinética del golpe.',
        errors: 'Hacer pesas lentas de hipertrofia pura.',
      }
    ],
    videoTags: ['Salto de cuerda básico', 'Salto de cuerda avanzado', 'Circuito de fuerza para boxeo']
  },
  {
    id: 'errores',
    title: 'Módulo 11: Errores Comunes',
    emoji: '⚠️',
    description: 'Identificación y corrección de vicios técnicos.',
    content: [
      {
        title: 'Top Errores de Guardia',
        description: 'Problemas de cobertura y exposición.',
        execution: 'Mantener codos pegados y manos siempre en el mentón.',
        errors: 'Bajar la mano trasera al lanzar el jab.',
      },
      {
        title: 'Errores de Respiración',
        description: 'Gestión ineficiente del oxígeno.',
        execution: 'Exhalar con cada golpe (sonido "tss"). No aguantar aire.',
        errors: 'Aguantar la respiración durante los intercambios.',
      }
    ],
    videoTags: ['Top 5 errores del principiante', 'Corrección de guardia', 'Corrección de jab', 'Corrección de hook']
  }
];
