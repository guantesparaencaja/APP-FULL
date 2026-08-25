# AUDITORÍA DE CALIDAD (QA) — App GUANTES

> Checklist interactiva para auditoría completa del sitio. Marca cada casilla `- [x]` al verificarla.
> Adaptada al stack real: React 19 + Vite + Tailwind, Firebase (Auth/Hosting), Supabase (BD/Storage), Capacitor (Android/iOS), PWA, Sentry/LogRocket, pagos por comprobante manual.

---

## 0. PREPARACIÓN DEL ENTORNO

- [ ] **Inventario de rutas** — Encontrar y listar todas las páginas reales (src/App.tsx): `/`, `/login`, `/register`, `/saberes`, `/saberes/fundamentos`, `/workouts`, `/calentamiento`, `/calendar`, `/profile`, `/meals`, `/plans`, `/payments`, `/payment-review`, `/timer`, `/chat`, `/recipes`, `/store`.
  - **Esperado:** La lista coincide con el menú visible y no hay rutas huérfanas ni muertas.
  - **Herramienta:** recorrido manual del `Layout`/menú + grep de `<Route path` en `src/App.tsx`.
- [ ] **Crear matriz de pruebas** — Hoja de cálculo con columnas: Caso de prueba | Pasos | Datos de prueba | Resultado esperado | Resultado real | Estado (P/F) | Comentarios.
  - **Esperado:** 100% de casos cubiertos y trazables.
  - **Herramienta gratuita:** Google Sheets / Excel con formato de checklist.
- [ ] **Preparar datos de prueba** — 3 cuentas: usuario nuevo (sin plan), usuario con plan activo, usuario admin (para verificación de pagos y gestión).
  - **Esperado:** Poder simular los 3 estados de `plan_status` (none / pending_payment / active).
  - **Herramienta:** Firestore/Supabase console (gratis) para sembrar datos de prueba.
- [ ] **Preparar navegadores y dispositivos** — Chrome, Firefox, Safari, Edge + dispositivo Android/iOS real o emulador.
  - **Esperado:** Probar en al menos 2 motores de render y en iOS/Android reales (no solo responsive desktop).
  - **Herramienta:** DevTools de Chrome (gratis), Android Studio emulador, BrowserStack (gratis 30 min) o Xcode Simulator.

---

## 1. PRUEBAS DE INTERACCIÓN Y BOTONES (UI/UX)

### 1.1 Enlaces y navegación
- [ ] **Navegación principal (menú)** — Click en cada ítem del menú de navegación en escritorio y en móvil (menú hamburguesa).
  - **Esperado:** Cada ítem lleva a la ruta correcta; el menú se cierra tras navegar en móvil; la ruta activa se resalta.
  - **Herramienta:** Recorrido manual + Cypress (gratis) o Playwright.
- [ ] **Navegación con botón "atrás" del navegador / Android** — Desde una página anidada (ej. `/saberes/fundamentos/:videoId`) pulsar atrás.
  - **Esperado:** Vuelve a la página anterior sin salir de la app ni volver a login.
  - **Herramienta:** prueba manual en Android/iOS + DevTools.
- [ ] **Enlaces externos** — Todos los enlaces a redes sociales, WhatsApp, teléfono y fuentes externas (ej. imagen Unsplash, QR).
  - **Esperado:** Abren en pestaña nueva (`target="_blank"` con `rel="noopener"`), sin romper la sesión SPA.
  - **Herramienta:** extensión "Link Checker" o `wget --spider` (free) / Ahrefs Webmaster Tools (plan free).
- [ ] **Enlaces de pie de página** — Revisar todos los enlaces del footer (términos, privacidad, contacto).
  - **Esperado:** No hay 404, todos los enlaces apuntan a páginas existentes.
  - **Herramienta:** Broken Link Checker online (free) / `npx linkinator` (free).

### 1.2 Botones Call to Action (CTA)
- [ ] **CTA críticos de conversión** — "Registrarse", "Iniciar sesión", "Ver Planes", "Reservar clase", "Subir comprobante", "Comprar", "Comenzar entrenamiento", botones del carrito.
  - **Esperado:** Cada CTA ejecuta su acción; estado de carga visible (spinner/disabled) mientras procesa; sin doble submit; feedback claro al completar.
  - **Herramienta:** Playwright (gratis) para automatizar clicks + grabación de video.
- [ ] **Estados de botón** — Hover, active, focus (visible con teclado), disabled, loading.
  - **Esperado:** Todo botón muestra estado visual distinto; los deshabilitados no responden; focus visible para accesibilidad.
  - **Herramienta:** Chrome DevTools + Lighthouse (gratis).
- [ ] **Doble submit / idempotencia** — Hacer doble click rápido en botones de envío (registro, pago, reserva).
  - **Esperado:** Solo se crea 1 registro/pago/reserva (sin duplicados en BD).
  - **Herramienta:** prueba manual + verificación en Supabase/Firebase console.

### 1.3 Menús desplegables y pestañas
- [ ] **Menús dropdown** — Todos los dropdowns (perfil de usuario, selector de plan, modos en Calendar `plan`/`payment`, filtros).
  - **Esperado:** Abren/cierran correctamente; se cierran al hacer click fuera; navegables con teclado (Esc cierra); sin desborde en pantallas pequeñas.
  - **Herramienta:** manual + Lighthouse/axe (gratis, en DevTools).
- [ ] **Pestañas y modos** — Pestañas del perfil (pendientes/historial), tabs de contenido, toggle del calendario.
  - **Esperado:** El contenido cambia al seleccionar; el estado se mantiene consistente al navegar entre pestañas.
  - **Herramienta:** manual + cypress (free).

### 1.4 Modales y diálogos
- [ ] **Todos los modales** — Alertas de confirmación, visor de video, selector de emoji, modales de pago.
  - **Esperado:** Apertura/cierre correcto, cierre con botón X, con click fuera y con tecla Esc; contenido centrado y no cortado en móvil; el scroll de fondo queda bloqueado.
  - **Herramienta:** axe DevTools (free) + manual.
- [ ] **Alertas de la app** — La función `showAlert` (éxito/error/info) en flujos críticos (pago aprobado, clase confirmada).
  - **Esperado:** Mensaje correcto según resultado; se auto-cierra o se cierra manualmente sin bloquear la app.
  - **Herramienta:** manual.

### 1.5 Formularios
- [ ] **Login y Registro** — Email/password y Google Sign-In (`@codetrix-studio/capacitor-google-auth`).
  - **Esperado:** Validación de formato de email y longitud de password; mensaje de error claro; redirección post-login correcta según `plan_status`; recuperación de contraseña funcional; sin error de consola.
  - **Herramienta:** manual + DevTools Network.
- [ ] **Registro de usuario** — Todos los campos del onboarding (pasos, subida de comprobante).
  - **Esperado:** Validación por campo; botón deshabilitado si faltan datos; carga de archivo con preview; error claro si falla upload a Supabase Storage.
  - **Herramienta:** manual + Supabase console (ver logs).
- [ ] **Validaciones de formularios** — Campos obligatorios, formatos (email, teléfono), máximos de caracteres.
  - **Esperado:** Mensaje de error bajo el campo; el formulario no se envía con datos inválidos; los errores se limpian al corregir.
  - **Herramienta:** Playwright (validaciones automatizadas).
- [ ] **Mensajes de éxito/error** — Enviar formularios con datos válidos e inválidos.
  - **Esperado:** Feedback visual (toast/alert) en ambos casos; sin datos duplicados; el estado se refleja en BD.
  - **Herramienta:** manual + Supabase/Firebase console.
- [ ] **Recepción de correos / notificaciones** — Los flujos que disparan emails/notificaciones (functions/src/index.ts: pago verificado, clase confirmada, plan aprobado, recordatorios).
  - **Esperado:** El usuario recibe el correo/push local con el contenido correcto y sin spam de duplicados.
  - **Herramienta:** Mailtrap (free) si usas SMTP en staging; LogRocket/Sentry para errores en functions.
- [ ] **Integración con CRM/BD** — Cada envío crea/actualiza el registro correcto en Supabase (`profiles`, `payments`, `bookings`, `notifications`, `orders`).
  - **Esperado:** Coincidencia 1:1 entre lo que ve el usuario y lo que hay en BD; sin filas huérfanas.
  - **Herramienta:** Supabase Table Editor (free) + Supabase Logs.

### 1.6 Pagos / carrito de compras (flujo manual con comprobante)
- [ ] **Selección de plan (`Plans.tsx`)** — Elegir plan, número de clases, método de pago (lista `payment_methods`).
  - **Esperado:** El resumen muestra precio y clases correctos; se guarda selección; el enlace de WhatsApp se genera con el mensaje correcto.
  - **Herramienta:** manual.
- [ ] **Subida de comprobante (`Plans.tsx` / `Payments.tsx`)** — Subir imagen en formatos válidos y en inválidos (PDF, archivo corrupto, >5MB).
  - **Esperado:** Solo acepta formatos permitidos; validación de tamaño; preview del archivo; error claro si falla; se inserta fila en `payments` con `payment_status: submitted`.
  - **Herramienta:** manual + Supabase Storage (ver archivos subidos).
- [ ] **QR de pago** — Verificación del QR Nequi mostrado en `Payments.tsx`.
  - **Esperado:** El QR se renderiza y apunta al enlace correcto; legible al escanear.
  - **Herramienta:** cualquier lector QR gratuito.
- [ ] **Aprobación/rechazo por admin (`Profile.tsx`)** — Aprobar y rechazar un pago.
  - **Esperado:** Al aprobar: `plan_status` cambia a `active`, se inserta notificación, se confirma booking si es clase individual. Al rechazar: vuelve a `pending_payment`. Precio final editable con motivo de descuento.
  - **Herramienta:** manual + Supabase console (realtime).
- [ ] **Carrito de tienda (`Store.tsx`)** — Añadir/remover productos, cantidades, total.
  - **Esperado:** Total y stock correctos; no permite checkout sin archivo de comprobante; tras enviar, navega a confirmación y crea `orders`.
  - **Herramienta:** manual.
- [ ] **Pagos duplicados** — Enviar el mismo comprobante dos veces.
  - **Esperado:** No se crean 2 pagos; se muestra aviso de "ya enviado" o se bloquea.
  - **Herramienta:** Supabase console (ver filas duplicadas).

### 1.7 Características específicas de la app
- [ ] **Calendario (`Calendar.tsx`)** — Reservar clase, cambiar entre modos plan/pago, visualizar clases.
  - **Esperado:** La clase reservada aparece en calendario; el estado se sincroniza en tiempo real con otros dispositivos (Supabase realtime); sin conflictos de doble reserva.
  - **Herramienta:** manual en 2 pestañas/dispositivos simultáneos.
- [ ] **Timer / Calentamiento / Workouts** — Iniciar, pausar, reiniciar, completar rutinas.
  - **Esperado:** El temporizador funciona en background; al salir y volver conserva estado; notificaciones locales (plugin `local-notifications`) se disparan.
  - **Herramienta:** manual + Capacitor DevTools.
- [ ] **Chat (`Chat.tsx`)** — Enviar mensajes, multimedia, notificaciones.
  - **Esperado:** Los mensajes llegan en tiempo real; se guardan en BD; sin pérdida de mensajes al cambiar de pestaña.
  - **Herramienta:** manual + Supabase realtime.
- [ ] **Reproductor de video (`FundamentosVideoPlayer`)** — Play/pause, fullscreen, calidad, siguiente video.
  - **Esperado:** Reproduce sin buffering excesivo; controles visibles en móvil; sin errores de consola.
  - **Herramienta:** manual + DevTools Media (Network throttling).
- [ ] **Cierre de sesión** — Logout desde perfil y cierre forzado de sesión.
  - **Esperado:** Vuelve a `/login`, borra datos sensibles locales, no queda sesión activa en backend.
  - **Herramienta:** manual + Firebase Auth console.

---

## 2. RENDIMIENTO Y ASPECTOS TÉCNICOS

### 2.1 Core Web Vitals
- [ ] **LCP (Largest Contentful Paint)** — Medir la carga del elemento más grande (hero, imágenes, título).
  - **Esperado:** `< 2.5s` (bueno) en móvil 4G simulado; cargar imágenes con `loading="lazy"` (excepto LCP) y dimensiones explícitas.
  - **Herramienta:** PageSpeed Insights (gratis), Lighthouse, CrUX.
- [ ] **INP (Interaction to Next Paint)** — Interacciones lentas (clicks, envíos, abrir menú).
  - **Esperado:** `< 200ms`; sin JS bloqueante en el hilo principal; code-splitting por ruta (Vite ya lo hace con React.lazy/Suspense).
  - **Herramienta:** Lighthouse v10+, Web Vitals extension de Chrome, PageSpeed Insights.
- [ ] **CLS (Cumulative Layout Shift)** — Cargar la página y ver si el layout "salta" (imágenes, fonts, placeholders).
  - **Esperado:** `< 0.1`; todos los medios con `width/height` o `aspect-ratio`; reservar espacio para Skeleton loaders en las vistas de datos.
  - **Herramienta:** Lighthouse / PageSpeed Insights.
- [ ] **Time to Interactive (TTI) y First Contentful Paint** — Verificar tiempos globales de arranque.
  - **Esperado:** FCP `< 1.8s`, TTI `< 3.8s` en móvil.
  - **Herramienta:** Lighthouse / WebPageTest (free).

### 2.2 Velocidad de carga y bundle
- [ ] **Peso del bundle JS** — Revisar tamaño de los chunks generados por Vite.
  - **Esperado:** Chunk principal `< 200KB` gzip idealmente; rutas con lazy-loading; sin duplicados (Tailwind 4 purga CSS).
  - **Herramienta:** `vite build` + reporte `rollup-plugin-visualizer` (free) / source-map-explorer.
- [ ] **Optimización de imágenes** — Imágenes del sitio y las subidas por usuarios.
  - **Esperado:** Imágenes en WebP/AVIF, comprimidas, con tamaños responsivos (`srcset`/`sizes`); sin imágenes gigantes sin redimensionar.
  - **Herramienta:** PageSpeed Insights, Squoosh (free), Cloudinary (free tier).
- [ ] **Fuentes web** — Carga de `Space Grotesk` desde Google Fonts.
  - **Esperado:** Carga con `display=swap` (ya configurado); preconnect a Google Fonts; sin FOIT (texto invisible).
  - **Herramienta:** Lighthouse / DevTools Network.
- [ ] **Caché y Service Worker (PWA)** — Comprobar `vite-plugin-pwa`.
  - **Esperado:** App funciona offline para rutas cacheadas; el SW se actualiza sin romper la versión actual; `precache` correcto.
  - **Herramienta:** Lighthouse PWA / DevTools Application > Service Workers.

### 2.3 Seguridad SSL/HTTPS
- [ ] **Certificado SSL** — Dominio y subdominios (api, functions) con HTTPS válido.
  - **Esperado:** Candado válido, sin advertencias de certificado, sin contenido mixto (HTTP bloqueado en página HTTPS).
  - **Herramienta:** SSL Labs (free), Why No Padlock.
- [ ] **Contenido mixto** — Buscar recursos cargados por HTTP dentro de HTTPS.
  - **Esperado:** Cero llamadas a `http://` (firebase/supabase y APIs usan https).
  - **Herramienta:** DevTools Console (muestra bloqueos) / `curl -I`.
- [ ] **Headers de seguridad** — Revisar CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
  - **Esperado:** Headers presentes en `vercel.json`/hosting de Firebase; CSP no bloquea funcionalidad.
  - **Herramienta:** SecurityHeaders.com (free).
- [ ] **Reglas de seguridad de BD/Storage** — Revisar `firestore.rules` y `storage.rules` + RLS de Supabase.
  - **Esperado:** Solo usuarios autenticados y autorizados leen/escriben; admin con rol `isAdmin`; sin reglas `true` abiertas.
  - **Herramienta:** revisión manual de los archivos de reglas + Firebase/Supabase console.

### 2.4 Errores de consola y JS
- [ ] **Errores de consola en cada ruta** — Navegar por las 17+ rutas con DevTools abiertas.
  - **Esperado:** Cero errores `Uncaught`, cero warnings críticos (React key, deprecados); solo warnings informativos permitidos.
  - **Herramienta:** Chrome DevTools Console (filtro "Errors").
- [ ] **Errores en red (API)** — Revisar pestaña Network en cada flujo (auth, supabase, storage, functions).
  - **Esperado:** Todas las peticiones con status 2xx; 4xx/5xx solo en escenarios de prueba esperados.
  - **Herramienta:** DevTools Network + Supabase/Firebase logs.
- [ ] **Captura de errores en producción** — Confirmar que Sentry y LogRocket registran errores reales.
  - **Esperado:** `src/lib/monitoring.ts` inicializa ambos; los errores de JS aparecen en el dashboard con stack trace y session replay.
  - **Herramienta:** Sentry (free tier) y LogRocket (free tier) dashboards.

### 2.5 Enlaces rotos y redirecciones
- [ ] **Barrido completo de 404** — Crawlear todo el sitio incluyendo rutas SPA y recursos.
  - **Esperado:** Cero enlaces rotos internos; los 404 de la SPA devuelven una página de error amigable (no pantalla en blanco).
  - **Herramienta:** Screaming Frog SEO Spider (free hasta 500 URLs), `npx linkinator`.
- [ ] **Bucles de redirección** — Probar redirecciones de auth (login → home, logout → login).
  - **Esperado:** Sin bucle infinito; el `ProtectedRoute` no redirige a login si ya hay sesión válida; tras login se llega a la ruta destino original.
  - **Herramienta:** Screaming Frog / manual con DevTools.

---

## 3. ADAPTABILIDAD MÓVIL Y VISUAL

### 3.1 Responsive (móvil / tablet / escritorio)
- [ ] **Tamaños clave** — Probar en: 360×640 (móvil pequeño), 390×844 (iPhone), 768×1024 (tablet), 1280×800, 1920×1080.
  - **Esperado:** Sin scroll horizontal, sin elementos cortados, sin solapamientos; la disposición se adapta correctamente en cada breakpoint de Tailwind.
  - **Herramienta:** Chrome DevTools device toolbar + vista real en Android/iOS (importante: es app Capacitor).
- [ ] **Menú hamburguesa en móvil** — Abrir, navegar, cerrar.
  - **Esperado:** Menú a pantalla completa o drawer; todos los ítems visibles sin scroll perdido; se cierra al navegar.
  - **Herramienta:** manual + Playwright (mobile emulation).
- [ ] **Tablas y grids de datos** — Perfil (pagos), calendario, planes.
  - **Esperado:** En móvil las tablas se convierten en cards o scroll vertical; sin columnas que desborden la pantalla.
  - **Herramienta:** manual + Lighthouse (viewport).
- [ ] **Teclado en pantalla** — Campos de texto en móvil (login, registro, chat, store).
  - **Esperado:** El teclado no tapa el campo activo ni el botón de envío; la vista hace scroll al foco; sin zoom accidental (viewerport `user-scalable=no` ya configurado).
  - **Herramienta:** dispositivo real o emulador.

### 3.2 Zonas táctiles
- [ ] **Tamaño de objetivos táctiles** — Todos los botones y enlaces tocables.
  - **Esperado:** Mínimo 48×48px (ideal 56px); sin botones adyacentes demasiado juntos; sin doble-tap accidental.
  - **Herramienta:** Lighthouse (auditoría "Tap targets"), axe DevTools.
- [ ] **Spacing entre elementos** — Espaciado visual alrededor de CTA y ítems de menú.
  - **Esperado:** Al menos 8px de separación; sin clicks accidentales en enlaces cercanos.
  - **Herramienta:** manual con ruler de DevTools.
- [ ] **Gestos** — Swipe en carruseles/lista de videos, pull-to-refresh.
  - **Esperado:** Los gestos funcionan y no entran en conflicto con el scroll; el contenedor no propaga gestos al navegador.
  - **Herramienta:** dispositivo real.

### 3.3 Visual y consistencia
- [ ] **Consistencia de diseño** — Tipografía, colores, tamaños de botón en todas las páginas.
  - **Esperado:** Paleta y tipografía uniformes; botones del mismo tipo con el mismo estilo; sin estilos inline que rompan el tema.
  - **Herramienta:** revisión visual + grep de clases inline en src.
- [ ] **Tema oscuro/claro** — La app fuerza tema dark (`<body class="dark">`).
  - **Esperado:** Todos los componentes legibles en dark (contrast ≥ 4.5:1); sin textos grises sobre fondo gris.
  - **Herramienta:** axe DevTools (contrast), Wave (free).
- [ ] **Textos truncados/desbordados** — Nombres largos, títulos, mensajes largos en tarjetas.
  - **Esperado:** Se truncan con `ellipsis` o envuelven bien; sin desbordes que rompan el layout.
  - **Herramienta:** manual en todos los breakpoints.
- [ ] **Estados vacíos y carga** — Listas sin datos (sin reservas, sin mensajes, sin pagos).
  - **Esperado:** Mensaje amigable tipo "No tienes reservas aún" + CTA; skeletons mientras carga; sin pantallas en blanco.
  - **Herramienta:** manual con datos vacíos en BD.

---

## 4. RASTREO, ANALÍTICA Y SEO TÉCNICO

### 4.1 Metadatos
- [ ] **Title y meta description por página** — Revisar `<title>` y meta description de cada vista relevante.
  - **Esperado:** Título único y descriptivo por página (hoy solo existe el global "GUANTES - Entrenamiento de Boxeo"); meta description < 160 caracteres.
  - **Herramienta:** Screaming Frog (free) / extensión SEO META.
- [ ] **Etiquetas Open Graph / Twitter Cards** — Compartir URLs en WhatsApp/redes.
  - **Esperado:** Previsualización con título, descripción e imagen correctos al compartir.
  - **Herramienta:** Opengraph.xyz (free), meta tags checker.
- [ ] **`<html lang>`** — El documento usa `lang="en"` pero el contenido es español (`index.html:2`).
  - **Esperado:** `lang="es"` para correcta accesibilidad y SEO internacional.
  - **Herramienta:** Lighthouse (accesibilidad) / revisión manual.
- [ ] **Canonical** — URLs canónicas en páginas públicas.
  - **Esperado:** URL canónica sin parámetros (ej. evitar `?utm_` duplicados).
  - **Herramienta:** Screaming Frog.

### 4.2 Imágenes
- [ ] **Alt text en todas las imágenes** — `<img>` y `<img>` decorativas con `alt=""`.
  - **Esperado:** Toda imagen con significado tiene alt descriptivo; decorativas con `alt=""` y `aria-hidden`.
  - **Herramienta:** Lighthouse / axe / Chrome Accessibility.
- [ ] **Imágenes de fondo y emoji como contenido** — Verificar que info crítica no dependa solo de imágenes.
  - **Esperado:** La info clave también está en texto.
  - **Herramienta:** axe.

### 4.3 robots.txt y sitemap
- [ ] **robots.txt** — Confirmar que existe y permite el rastreo deseado.
  - **Esperado:** Presente en hosting (Firebase/Vercel); no bloquea recursos críticos CSS/JS; permite crawling de páginas públicas.
  - **Herramienta:** comprobar en `dominio/robots.txt` / Google Search Console.
- [ ] **sitemap.xml** — Generar y validar.
  - **Esperado:** Incluye todas las URLs públicas con `<lastmod>`; sin URLs 404; actualizado al publicar.
  - **Herramienta:** XML-Sitemaps.com (free) + Google Search Console.
- [ ] **Indexación** — Enviar sitemap a Search Console.
  - **Esperado:** Las páginas públicas indexadas sin errores de cobertura.
  - **Herramienta:** Google Search Console (free).
- [ ] **Nota SEO en SPA** — Es una SPA con React; verificar SSR/prerender o contenido estático en `index.html`.
  - **Esperado:** El HTML inicial contiene el contenido principal o se usa prerendering; de lo contrario el SEO público será débil.
  - **Herramienta:** "View Source" / Google Rich Results Test (free).

### 4.4 Analítica (GA4 / GTM / píxeles)
- [ ] **GA4 implementado** — Buscar `gtag`/`dataLayer` o `firebase-analytics` en `index.html` y `src`.
  - **Esperado:** Etiqueta GA4 cargada en todas las páginas; eventos básicos (page_view, session_start) aparecen en el stream en tiempo real.
  - **Herramienta:** GA4 DebugView + Tag Assistant (free). ⚠️ Si no existe la etiqueta en el código, este punto falla: se debe añadir vía GTM o `firebase.analytics()`.
- [ ] **Eventos de conversión** — Confirmar que disparan: `sign_up`, `login`, `reserva`, `payment_submitted`, `order_placed`, `purchase`.
  - **Esperado:** Cada evento clave aparece en DebugView con sus parámetros (plan, valor, método de pago).
  - **Herramienta:** GA4 DebugView / Tag Assistant / GTM Preview mode.
- [ ] **Tag Manager (GTM)** — Si se usa GTM, verificar contenedor publicado.
  - **Esperado:** Contenedor carga sin errores; triggers y variables configurados; sin etiquetas duplicadas (doble conteo).
  - **Herramienta:** GTM Preview Mode (free).
- [ ] **Píxeles publicitarios** — Meta Pixel, TikTok, Google Ads (si aplica).
  - **Esperado:** Píxel carga una sola vez; dispara Purchase/Lead con parámetros; sin duplicados al navegar en SPA.
  - **Herramienta:** Meta Pixel Helper / Tag Assistant (free).
- [ ] **Atribución y consentimiento** — Modo de consentimiento (cookie banner) si aplica.
  - **Esperado:** Las etiquetas no cargan antes del consentimiento; ajustes respetados.
  - **Herramienta:** manual + DevTools Network.

### 4.5 Monitorización continua
- [ ] **Sentry** — Errores y trazas de producción.
  - **Esperado:** Errores agrupados, con breadcrumbs y sourcemaps (build debe subir `sourcemaps`); sin ruido excesivo.
  - **Herramienta:** Sentry dashboard (free tier).
- [ ] **LogRocket** — Replays de sesión.
  - **Esperado:** Replays útiles para diagnosticar problemas de UX; sin datos sensibles de pago grabados (verificar redacción).
  - **Herramienta:** LogRocket dashboard (free tier).

---

## 5. RESUMEN DE HALLAZGOS (plantilla)

| ID | Severidad (Alta/Media/Baja) | Área | Hallazgo | Evidencia | Acción recomendada | Responsable |
|----|----|----|----|----|----|----|
| A-01 | | | | | | |

**Criterios de cierre:** todo hallazgo Alta debe corregirse antes de release. Media en la siguiente iteración. Baja en backlog.

---

## Herramientas gratuitas de referencia rápida
- **Crawling/SEO técnico:** Screaming Frog (free ≤500 URLs), Google Search Console, PageSpeed Insights
- **E2E automatizado:** Playwright / Cypress (free)
- **Accesibilidad:** Lighthouse, axe DevTools, Wave
- **Enlaces rotos:** linkinator (`npx linkinator <url>`), Broken Link Checker online
- **Rendimiento:** Lighthouse, WebPageTest, Web Vitals extension
- **Seguridad:** SSL Labs, SecurityHeaders.com, Why No Padlock
- **Analítica:** GA4 DebugView, Google Tag Assistant, Meta Pixel Helper, GTM Preview
- **Monitoreo:** Sentry / LogRocket (free tiers)
- **Correos:** Mailtrap (free), Supabase Logs, Firebase Console