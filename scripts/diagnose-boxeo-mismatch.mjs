/**
 * Diagnóstico de desajustes entre SEED_VIDEOS (BoxeoModule.tsx)
 * y LYFTA_BOXEO_VIDEOS (seedVideos.ts).
 *
 * Ejecutar: node scripts/diagnose-boxeo-mismatch.mjs
 */

// ─── Nombres extraídos directamente de los arrays fuente ──────────────────────

// SEED_VIDEOS (BoxeoModule.tsx) — nombre de cada objeto
const SEED_NAMES = [
  'Guardia Correcta',
  'Jab',
  'Cross',
  'Hook Izquierdo',
  'Hook Derecho',
  'Uppercut Izquierdo',
  'Uppercut Derecho',
  'Combinación 1-2 (Jab-Cross)',
  'Combinación 1-2-3',
  'Combinación 1-2-3-4',
  'Posición Base',
  'Paso Adelante y Atrás',
  'Paso Lateral',
  'Pivote Izquierdo',
  'Hexágono de Movimiento',
  'Slip Izquierdo',
  'Bob and Weave',
  'Cover Up',
  'Shoulder Roll',
  '1-2 al Cuerpo y Cabeza',
  'Counter Jab',
  '1-2-3-2 (Jab-Cross-Hook-Cross)',
  'Distancia Correcta al Saco',
  'Round Básico de 3 Minutos',
  'Uppercuts al Saco',
  'Sombra Básica',
  'Sombra Defensiva',
  'Sombra con Pesas Ligeras',
  'Saltar Cuerda Básico',
  'Flexiones para Boxeo',
  'Burpees de Boxeador',
  'Movilidad de Muñecas',
  'Activación de Caderas para Footwork',
  'Estiramiento Post-Entrenamiento',
];

// LYFTA_BOXEO_VIDEOS (seedVideos.ts) — nombre de cada objeto
const LYFTA_NAMES = [
  'Guardia Correcta',
  'Jab',
  'Cross',
  'Hook Izquierdo',
  'Hook Derecho',
  'Uppercut Izquierdo',
  'Uppercut Derecho',
  'Combinación 1-2',
  'Combinación 1-2-3',
  'Combinación 1-2-3-4',
  'Posición Base',
  'Paso Adelante y Atrás',
  'Paso Lateral',
  'Pivote Izquierdo',
  'Hexágono de Movimiento',
  'Slip Izquierdo',
  'Bob and Weave',
  'Cover Up',
  'Shoulder Roll',
  '1-2 Cuerpo y Cabeza',
  'Counter Jab',
  '1-2-3-2',
  'Distancia al Saco',
  'Round Básico 3 min',
  'Uppercuts al Saco',
  'Sombra Básica',
  'Sombra Defensiva',
  'Sombra con Pesas',
  'Saltar Cuerda',
  'Flexiones para Boxeo',
  'Burpees de Boxeador',
  'Movilidad de Muñecas',
  'Activación de Caderas',
  'Estiramiento Post',
];

// ─── Normalización para comparación ──────────────────────────────────────────
function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(s) {
  return stripAccents(s.toLowerCase().trim()).replace(/\s+/g, ' ');
}

// ─── Comparación ─────────────────────────────────────────────────────────────
const lyftaSet = new Set(LYFTA_NAMES.map(normalize));

console.log('═══════════════════════════════════════════════════════════════');
console.log(' DIAGNÓSTICO DE DESAJUSTES — SEED_VIDEOS vs LYFTA_BOXEO_VIDEOS');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(` SEED_VIDEOS:  ${SEED_NAMES.length} videos`);
console.log(` LYFTA:        ${LYFTA_NAMES.length} videos\n`);

let matched = 0;
const mismatches = [];

for (const seedName of SEED_NAMES) {
  const norm = normalize(seedName);
  if (lyftaSet.has(norm)) {
    matched++;
  } else {
    // Buscar la mejor candidata LYFTA (subcadena más larga)
    let best = '';
    for (const lyftaName of LYFTA_NAMES) {
      const lNorm = normalize(lyftaName);
      if (norm.includes(lNorm) || lNorm.includes(norm)) {
        if (lNorm.length > best.length) best = lyftaName;
      }
    }
    mismatches.push({ seed: seedName, candidate: best || '(sin coincidencia)' });
  }
}

console.log(` Coincidencias exactas (normalizadas): ${matched}/${SEED_NAMES.length}\n`);

if (mismatches.length === 0) {
  console.log(' ✅ Todos los nombres coinciden.\n');
} else {
  console.log(` ❌ ${mismatches.length} DESAJUSTE(S) ENCONTRADO(S):\n`);
  console.log('  #  │ SEED_VIDEOS (BoxeoModule)          │ LYFTA (seedVideos.ts)');
  console.log('────┼──────────────────────────────────────┼──────────────────────────────────');
  for (let i = 0; i < mismatches.length; i++) {
    const { seed, candidate } = mismatches[i];
    const num = String(i + 1).padStart(2);
    console.log(`  ${num} │ ${seed.padEnd(34)} │ ${candidate}`);
  }
  console.log('');
}
