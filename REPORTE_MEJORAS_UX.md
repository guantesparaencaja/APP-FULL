# REPORTE DE MEJORAS VISUALES Y DE ANIMACIÓN — GPTE APP

Fecha: 19/08/2026
Estado: Aplicado en código y desplegado en https://gpte-fitness.vercel.app

---

## Infraestructura compartida creada (beneficia a todas las secciones)

| Recurso | Descripción |
|---|---|
| `src/lib/animations.ts` | Variantes Framer Motion reutilizables: `fadeUp`, `fadeIn`, `scaleIn`, `slideInRight/Left`, `staggerContainer/staggerItem`, `liftCard`, `pageTransition`. |
| `src/components/Reveal.tsx` | Wrapper de aparición al hacer scroll (`whileInView`, una sola vez, con dirección). |
| `src/components/PageHeader.tsx` | Encabezado de sección animado y consistente (emoji + título + subtítulo + acciones a la derecha). |
| `src/index.css` | Utilidades globales: `.card-hover` (elevación), `.btn-press` (respuesta táctil), `.text-gradient`, `.skeleton` (shimmer de carga), soporte `prefers-reduced-motion`. |
| `src/components/Layout.tsx` | **Transición de página global**: cada cambio de ruta ahora entra con desvanecido/deslizamiento (`AnimatePresence`), mejorando TODAS las secciones a la vez. |

---

## Mejoras por apartado (mínimo 5 c/u)

### 1) Login / Register
Aplicado:
1. Formulario con entrada escalonada (`staggerContainer` + `staggerItem`) en campos, enlaces y botones.
2. Logo/título animado con `scaleIn` (spring).
3. Errores y avisos con `fadeUp` que se re-animan en cada aparición.
4. Botones ENTRAR / GOOGLE con `btn-press` + `whileHover/whileTap`.
5. Register: transición entre pasos 1→2→3 con `AnimatePresence` (deslizamiento), conservando los datos del formulario.

Propuesto (roadmap):
6. Validación visual en vivo (borde verde/rojo por campo con animación).
7. Indicador de fuerza de contraseña con barra animada.
8. Modo oscuro/claro del fondo del formulario con degradado y partículas de fondo.
9. Shake en el formulario al fallar el login (feedback de error memorable).
10. Botón "mostrar contraseña" con icono animado (ojo).

### 2) Inicio (Home)
Aplicado:
1. Encabezado con saludo personalizado + badges de XP/vidas (`PageHeader`).
2. Grid de navegación (6 accesos) con entrada escalonada y `liftCard` al hover.
3. Secciones (Reto del Día, Mes, Licencia, Hidratación, Frase) con `Reveal` por scroll.
4. Botones principales con `btn-press`.
5. Estado vacío del reto con entrada animada.

Propuesto:
6. Avatar "EvolvingAvatar" con animación de respiración continua (scale sutil).
7. Tarjetas de reto con barra de progreso animada al completar tareas.
8. Carrusel horizontal de frases motivacionales con auto-scroll.
9. Contador de racha con animación de "fuego" (pulse) cuando se mantiene.
10. Mini-gráfico de actividad semanal (XP por día) animado al cargar.

### 3) Saberes / Fundamentos
Aplicado:
1. Encabezado animado (`PageHeader`) con estado de licencia.
2. Barra de XP del rango con `animate={{ width }}` (transición suave del progreso).
3. Grid de combos por nivel con `staggerContainer` + `liftCard`.
4. Módulos expandibles con animación de altura (`AnimatePresence`).
5. Skeletons en carga y estado vacío animado; modales con `scaleIn`.

Propuesto:
6. Timeline visual del camino de licencia (niveles conectados con línea animada).
7. Confetti al completar un nivel/módulo.
8. Miniaturas de video con hover (escala + overlay de reproducción).
9. Filtro de búsqueda con resultados que se animan en cascada.
10. Pestañas con indicador deslizante (`layoutId`).

### 4) Entrenos (Workouts)
Aplicado:
1. Encabezado + buscador y filtros con `Reveal` escalonado.
2. Grid/lista de videos con `staggerContainer` + `staggerItem` + `liftCard`.
3. Skeletons en carga y estado vacío animado con `scaleIn`.
4. `btn-press` en FABs admin, filtros, toggle grid/lista y modales.
5. Botones con micro-interacción en pills de categorías.

Propuesto:
6. Vista previa del video al pasar el cursor (thumbnail animada).
7. Contador de vistas/reproducciones con número animado.
8. Filtro "continuar donde quedé" con badge de progreso.
9. Modo oscuro del reproductor con controles custom.
10. Calificación de rutina (estrellas) con animación de llenado.

### 5) Calentamiento
Aplicado:
1. Encabezado animado (`PageHeader` 🔥).
2. Sección de video con `Reveal`.
3. Estado "sin video configurado" animado con `scaleIn`.
4. Botones Completar/Publicar/Eliminar con `btn-press`.
5. Panel admin con `Reveal`.

Propuesto:
6. Cronómetro de calentamiento con cuenta regresiva animada y círculo de progreso.
7. Lista de pasos del calentamiento con check animado al completar.
8. Sonido de inicio/fin (opcional, con toggle).
9. Recordatorio de "mínimo 5 min" con tostada animada.
10. Historias de calentamientos recientes (última sesión).

### 6) Calendario
Aplicado:
1. Encabezado animado con botones de navegación en `right`.
2. Grid del mes que se re-anima con stagger al cambiar de mes (`key`).
3. Día actual con anillo + pulso animado.
4. Tarjetas de próximas clases con `liftCard`; slots con `fadeIn`.
5. Skeletons en carga y estados vacíos animados (icono + mensaje).

Propuesto:
6. Vista de semana/hora con animación de transición.
7. Colores por tipo de clase con leyenda animada.
8. Gestos: swipe para cambiar de mes en móvil.
9. Recordatorio del día antes de la clase (badge con pulso).
10. Vista "hoy" con lista de clases ordenadas por hora.

### 7) Perfil
Aplicado:
1. Encabezado animado con rol y botón volver.
2. 10 secciones con `Reveal` por scroll.
3. Grids (logros, stats) con `staggerContainer` + `staggerItem`.
4. Estados vacíos animados (notificaciones, solicitudes, evaluaciones, usuarios).
5. Avatar con `group-hover:scale-110`; botones admin con `btn-press`.

Propuesto:
6. Tarjeta de progreso con foto "antes/después" y slider comparativo.
7. Nivel con barra de XP animada y confetti al subir.
8. Edición de foto con recorte y previsualización.
9. Cambio de tema con transición suave entre modos.
10. Insignias desbloqueadas con animación de "flip".

### 8) Tienda (Store)
Aplicado:
1. Encabezado animado (`PageHeader` 🥊).
2. Grid de productos con `staggerContainer` + `liftCard`.
3. Skeletons en carga y estado vacío animado.
4. Botón flotante del carrito con `spring` y badge animado por cantidad.
5. Panel admin con transición de altura refinada y botones `btn-press`.

Propuesto:
6. Modal de producto con imagen que entra en escala y precio con count-up.
7. Carrito con lista que se anima al añadir/quitar (AnimatePresence layout).
8. Badge "stock bajo" o "oferta" con pulso.
9. Checkout en pasos con barra de progreso animada.
10. Confirmación de pedido con animación de éxito (check).

### 9) Comidas / Recetas
Aplicado:
1. Encabezado animado con flecha atrás (`PageHeader`).
2. Tabs, chips y búsqueda con `Reveal` + `btn-press`.
3. Lista de comidas que re-stagger al cambiar de categoría.
4. Grids (libro de recetas, tips) con `staggerContainer` + `liftCard`.
5. Botones (generar plan, marcar consumida, subir, editar) con `btn-press`.

Propuesto:
6. Contador de calorías diarias con anillo de progreso animado.
7. Foto de la comida con hover (zoom) y valor nutricional desplegable.
8. Marcar "consumida" con animación de check + confeti.
9. Plan semanal arrastrable/reordenable.
10. Búsqueda con resaltado de texto.

### 10) Planes (Plans)
Aplicado:
1. Skeletons en carga.
2. Tarjetas de plan con `liftCard` y glow pulsante en el plan activo.
3. Botones de acción con `btn-press`.
4. (Transición de página global ya cubre la entrada.)

Propuesto:
5. Comparador visual de planes (tabla responsive).
6. Animación de selección con `layoutId` (tarjeta que se "activa").
7. Cuenta regresiva de oferta (si aplica) con pulso.
8. Testimonios de alumnos con entrada escalonada.
9. FAQ desplegable animado.

### 11) Pagos (Payments)
Aplicado:
1. Estados (éxito/reservas/vacío/formulario) con `AnimatePresence`.
2. Dropzone de comprobante con feedback visual drag-and-drop (nuevo, funcional).
3. Pasos de instrucciones con `staggerContainer` + `staggerItem`.
4. Error con `fadeUp` (in/out).
5. Botones con `btn-press` + hover.

Propuesto:
6. Barra de progreso de subida del comprobante (porcentaje real).
7. Confirmación de pago con animación de éxito (check + confetti).
8. Preview de la imagen del comprobante antes de enviar.
9. Recordatorio de pago pendiente con badge animado.
10. Historial de pagos con estados visuales.

### 12) Timer
Aplicado:
1. Número del cronómetro animado segundo a segundo (`key` + spring).
2. Etiqueta de fase animada al cambiar (LISTO/TRABAJO/DESCANSO).
3. Panel de configuración con stagger.
4. Botones play/pausa/reset/sonido con `btn-press`.

Propuesto:
5. Círculo de progreso alrededor del cronómetro (SVG animado).
6. Vibración/haptic al terminar cada fase (Capacitor).
7. Sonido de campana opcional al finalizar.
8. Guardado de presets de rondas.
9. Cambio de color del fondo según la fase (rojo trabajo / verde descanso).

### 13) Coach (Chat)
Aplicado:
1. Mensajes con entrada animada (`fadeUp` + spring por mensaje).
2. Scroll automático suave al recibir mensajes.
3. Indicador "escribiendo..." con 3 puntos pulsantes.
4. Skeletons en carga inicial.
5. Estado vacío animado; botones con `btn-press`.

Propuesto:
6. Burbujas con cola y diferencia visual alumno/coach.
7. Sello de tiempo con animación de agrupación por fecha.
8. Reacciones rápidas (emojis) con animación de bounce.
9. Adjuntar imagen con vista previa.
10. Sugerencias de preguntas rápidas (chips animados).

### 14) Fundamentos (player de video)
Aplicado:
1. Encabezado animado.
2. Transición entre videos con `fadeIn` (key por video).
3. Secciones con `Reveal`.
4. Estado vacío mejorado con icono + spring.
5. Botones con `btn-press`.

Propuesto:
6. Barra de progreso del video con preview en hover.
7. Modo cinema (ocultar UI).
8. Playlist lateral con stagger y marcado de visto.
9. Autoplay del siguiente video con animación de transición.
10. Velocidad de reproducción con control animado.

---

## Métricas de diseño aplicadas
- **Movimiento consistente**: todas las entradas usan las mismas variantes (`fadeUp`, `stagger`, `spring`) → la app se siente coherente.
- **Reduced motion**: respetado automáticamente (`prefers-reduced-motion`).
- **Performance**: animaciones solo en `transform`/`opacity` (no afectan layout).
- **Accesibilidad**: se conservaron `aria-label`, `type="button"` y focus states.

## Próximos pasos sugeridos (impacto rápido)
1. Configurar Lottie/Rive para animaciones de marca (logo, trofeos).
2. Reducir uso de emojis en favor de iconos SVG animados consistentes.
3. Añadir modo "cinema" y controles custom al reproductor de video.
4. Implementar confetti (librería ligera `canvas-confetti`) en logros y pagos.