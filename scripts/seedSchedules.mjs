/**
 * seedSchedules.mjs — Carga los horarios GPTE en Firestore
 * Ejecución: node scripts/seedSchedules.mjs
 * 
 * Horario GPTE:
 * - Lunes, Miércoles, Jueves, Viernes: 7PM - 9PM (Clase Grupal, max 4)
 * - Martes: SIN CLASE
 * - Sábado: CERRADO
 * - Domingo: 5PM - 7PM (Club de Boxeo, max 4)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cargar service account
let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '../firebase-applet-config.json'), 'utf8')
  );
} catch {
  console.error('❌ No se encontró firebase-applet-config.json');
  console.error('   Debe estar en la raíz del proyecto.');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const RULES_LUNES_VIERNES = `• Cancelación con MÍNIMO 2 horas de anticipación antes del inicio de la clase.
• Clase no cancelada en tiempo y no asistida = será descontada del plan como "asistida".
• Qué llevar: guantes de boxeo, vendas para manos, hidratación.
• Llegar 5 minutos antes de la hora de inicio.
• Cupo máximo: 4 estudiantes por clase.
• Se aplica disciplina y respeto dentro del gimnasio.`;

const RULES_DOMINGO = `• Clase especial Club de Boxeo — espacio premium de entrenamiento en grupo.
• Cancelación con MÍNIMO 2 horas de anticipación.
• Clase no avisada = descontada del plan.
• Qué llevar: guantes, vendas, hidratación.
• Cupo máximo: 4 estudiantes.`;

const DESCRIPTION_SEMANAL = 'Entrenamiento técnico y funcional de boxeo con guantes. Trabajamos golpeo, combinaciones, déficit físico y resistencia cardiovascular diseñado por Coach GPTE.';
const DESCRIPTION_DOMINGO = 'Sesión especial del Club de Boxeo GPTE. Práctica de sparring técnico, combinaciones avanzadas y preparación competitiva en un ambiente grupal exclusivo.';
const MATERIALS = 'Guantes de boxeo, vendas para manos, toalla, agua o bebida isotónica.';

const schedules = [
  // Lunes
  {
    day_of_week: 'Lunes',
    start_time: '19:00',
    end_time: '21:00',
    title: 'Clase Grupal Boxeo — GPTE',
    description: DESCRIPTION_SEMANAL,
    rules: RULES_LUNES_VIERNES,
    materials: MATERIALS,
    duration_minutes: 120,
    max_students: 4,
  },
  // Martes — SIN CLASE (no se agrega)
  
  // Miércoles
  {
    day_of_week: 'Miércoles',
    start_time: '19:00',
    end_time: '21:00',
    title: 'Clase Grupal Boxeo — GPTE',
    description: DESCRIPTION_SEMANAL,
    rules: RULES_LUNES_VIERNES,
    materials: MATERIALS,
    duration_minutes: 120,
    max_students: 4,
  },
  // Jueves
  {
    day_of_week: 'Jueves',
    start_time: '19:00',
    end_time: '21:00',
    title: 'Clase Grupal Boxeo — GPTE',
    description: DESCRIPTION_SEMANAL,
    rules: RULES_LUNES_VIERNES,
    materials: MATERIALS,
    duration_minutes: 120,
    max_students: 4,
  },
  // Viernes
  {
    day_of_week: 'Viernes',
    start_time: '19:00',
    end_time: '21:00',
    title: 'Clase Grupal Boxeo — GPTE',
    description: DESCRIPTION_SEMANAL,
    rules: RULES_LUNES_VIERNES,
    materials: MATERIALS,
    duration_minutes: 120,
    max_students: 4,
  },
  // Domingo — Club de Boxeo
  {
    day_of_week: 'Domingo',
    start_time: '17:00',
    end_time: '19:00',
    title: 'Club de Boxeo — Sesión Especial',
    description: DESCRIPTION_DOMINGO,
    rules: RULES_DOMINGO,
    materials: MATERIALS,
    duration_minutes: 120,
    max_students: 4,
  },
];

async function seedSchedules() {
  console.log('🥊 GPTE — Cargando horarios en Firestore...\n');

  // Borrar horarios existentes primero para evitar duplicados
  console.log('🗑️  Limpiando horarios existentes...');
  const existing = await db.collection('availabilities').get();
  const deleteOps = existing.docs.map(d => d.ref.delete());
  await Promise.all(deleteOps);
  console.log(`   Eliminados: ${existing.docs.length} documentos\n`);

  // Insertar nuevos horarios
  for (const schedule of schedules) {
    const ref = await db.collection('availabilities').add({
      ...schedule,
      created_at: new Date().toISOString(),
    });
    console.log(`✅ ${schedule.day_of_week}: ${schedule.start_time}–${schedule.end_time} → ${ref.id}`);
  }

  console.log('\n🎉 Horarios cargados exitosamente!');
  console.log('   Lunes, Miércoles, Jueves, Viernes: 7PM–9PM (máx 4 estudiantes)');
  console.log('   Martes: SIN CLASE');
  console.log('   Sábado: CERRADO');
  console.log('   Domingo: 5PM–7PM (Club de Boxeo)');
  process.exit(0);
}

seedSchedules().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
