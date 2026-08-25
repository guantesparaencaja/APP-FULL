# REPORTE DE AUDITORÍA QA — App GUANTES (GPTE)

**Fecha:** 2026-08-19 · **Alcance:** Código fuente, build, seguridad (Firebase + Supabase), rendimiento (Lighthouse), SEO técnico, accesibilidad.
**Comandos ejecutados:** `tsc --noEmit` (lint) ✅, `vite build` ✅ (6s), `npm audit`, Lighthouse (móvil, página /login).

---

## RESUMEN DE SCORES (Lighthouse, móvil, preview local)

| Métrica | Resultado | Referencia |
|---|---|---|
| Performance | **71** | LCP 4.9s ❌ · FCP 4.4s ❌ · TBT 60ms ✅ · CLS 0 ✅ |
| Accessibility | **80** | 5 fallos de contraste ❌ |
| Best Practices | **96** | 404 favicon.ico |
| SEO | **83** | Sin meta description ❌ · Sin robots.txt ❌ |

`npm audit`: **23 vulnerabilidades** (2 críticas · 14 altas · 4 moderadas · 3 bajas).

---

## HALLAZGOS CRÍTICOS (corregir ANTES de cualquier release)

### C-1. Todas las políticas "Admin" de Supabase están abiertas a cualquier usuario autenticado
- **Evidencia:** `supabase_schema.sql`. Todas usan `for all using (true)` sin verificación de rol:
  - `payments`: "Admin gestiona pagos" (`:194`) → **cualquier usuario puede cambiar su propio pago a `approved`** y romper el flujo de aprobación manual.
  - `bookings`: "Admin gestiona reservas" (`:131`) → modificar/borrar reservas ajenas.
  - `profiles`: "Admin lee todos perfiles" (`:68`) → **toda la PII de todos los usuarios (email, peso, lesiones, datos de salud)**.
  - `workout_videos`, `availabilities`, `planes`, `fundamentos_*`, `settings`, `challenges`, `combos`, `boxeo_videos`, etc.: `for all using (true)`.
- **Impacto:** acceso total a datos, manipulación de pagos, defacement de contenido.
- **Acción:** crear función `is_admin()` basada en `auth.jwt()` o tabla de roles y usarla en cada política. Nunca `using (true)` para escritura.

### C-2. Escalada de privilegios por auto-asignación de rol
- **Evidencia:** `supabase_schema.sql:65` — "Perfil propio editable" permite a cada usuario hacer `UPDATE profiles SET role='admin' WHERE id=auth.uid()`. Todo el gating admin es **solo client-side**: `src/App.tsx:86`, `src/pages/Profile.tsx:148`, `src/pages/Store.tsx:53`, etc. (`user.role === 'admin'`).
- **Impacto:** combinado con C-1, un usuario se hace admin y auto-aprueba sus pagos, edita contenido, ve todos los datos.
- **Acción:** `role` debe ser inmutable desde el cliente (restringir UPDATE de ese campo en RLS) y validar admin en backend/functions para acciones sensibles.

### C-3. Endpoint `/api/send-email` sin autenticación ni rate-limit
- **Evidencia:** `api/send-email.ts` — solo valida método POST y campos requeridos. Cualquiera puede llamarlo con cualquier `to` y abusar de tu cuenta Resend (spam relay, agotar cuota, suplantar tu remitente).
- **Acción:** exigir sesión (Supabase JWT), validar que `to` pertenezca al usuario autenticado, aplicar rate-limit y agregar CORS restrictivo.

### C-4. Inyección HTML en plantillas de email
- **Evidencia:** `src/lib/emailTemplates.ts` — `nombre`, `motivo`, `clase`, `fecha`, `hora`, `tipo` se interpolan en el HTML **sin escape** (`:97`, `:108`, `:262-267`, etc.). Con C-3, un atacante envía emails con payload HTML/JS arbitrario (phishing).
- **Acción:** función `escapeHtml()` sobre todos los campos antes de interpolar.

### C-5. `firestore.rules` — catch-all permisivo
- **Evidencia:** `firestore.rules:104-107`: `match /{path=**}` → `allow read: if isAuthenticated(); allow write: if isAdmin(); allow write: if isAuthenticated() && request.method != 'delete';` → **cualquier usuario autenticado puede crear/actualizar en cualquier colección** no cubierta explícitamente.
- **Además:** `payments` (`:77-81`) permite `update` al propietario → puede auto-aprobarse (status `approved`).
- **Acción:** eliminar la regla abierta; definir colecciones explícitas; bloquear cambio de `status` por parte del propietario.

### C-6. `storage.rules` Firebase — escritura abierta en carpetas de contenido
- **Evidencia:** `storage.rules:17-32`: `/entrenos`, `/workouts`, `/community`, `/combos` → `allow write: if isAuthenticated()`. Cualquier usuario puede sobrescribir/borrar videos de entrenamiento.
- **Acción:** `allow write: if isAdmin()` en esas rutas.

---

## HALLAZGOS ALTOS

| ID | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| H-1 | **GEMINI_API_KEY expuesta en el frontend** | `src/services/geminiService.ts:5` (key baked en el bundle) | Mover a endpoint serverless (Vercel function) que guarde la key |
| H-2 | **Bundle principal de 763 KB (227 KB gzip)** | build Vite: `index-*.js`; warning "chunks larger than 500 kB" | `manualChunks` para separar supabase/sentry/motion; revisar qué mete lucide-react completo |
| H-3 | **LCP 4.9s / FCP 4.4s / TTI 6.0s en móvil** | Lighthouse | Consecuencia de H-2 + fuente Google Fonts; priorizar el chunk inicial y precargar |
| H-4 | **12 tablas usadas por la app NO existen en el schema** | `orders`, `products`, `meals`, `chats`, `mail`, `email_queue`, `weekly_plans`, `custom_routines`, `student_approvals`, `combo_evaluations`, `rejected_videos`, `configuracion` — vs `supabase_schema.sql` | Reconciliar schema ↔ BD real; si existen sin RLS, están expuestas; si no existen, Tienda/Comidas/Chat fallan |
| H-5 | **SSRF en Cloud Function `onVideoCreated`** | `functions/src/index.ts:31` hace `fetch(data.url)` de un doc Firestore (que cualquier autenticado puede crear) | Validar URL (http/https, dominios permitidos), límite de tamaño y timeout |
| H-6 | **Dependencias con 2 vulnerabilidades críticas** | `npm audit`: `tar` (file smuggling, RCE) y `serialize-javascript` vía `workbox-build`; `vite ≤6.4.2`, `ws` altas | `npm audit fix` + actualizar Vite/workbox; evaluar `npm approve-scripts` |

---

## HALLAZGOS MEDIOS

| ID | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| M-1 | **Sin GA4 / GTM / píxeles** — solo analytics interno en Supabase + Sentry/LogRocket | grep `gtag\|dataLayer\|GTM\|fbq` en `src/` = 0 | Instalar GA4 vía GTM y disparar eventos (`sign_up`, `payment_submitted`, `purchase`) |
| M-2 | **Sin `robots.txt` ni `sitemap.xml`** | Lighthouse: 18 errores robots; `public/` solo tiene QRs | Crear ambos en `public/` y configurar en Search Console |
| M-3 | **Sin meta description ni Open Graph** | `index.html:10` solo `<title>`; Lighthouse meta-description score 0 | Añadir description + OG/Twitter tags |
| M-4 | **`<html lang="en">` con contenido en español** | `index.html:2` | Cambiar a `lang="es"` |
| M-5 | **Sin favicon → 404 en producción** | Lighthouse errors-in-console; `dist/favicon.ico` no existe | Añadir favicon local (PNG/ICO/SVG) |
| M-6 | **Contraste de color insuficiente** (5 elementos) | Lighthouse color-contrast: texto `text-primary` y `text-slate-500` sobre fondo oscuro | Subir luminosidad del naranja `#f97316` → ej. `#fb923c` sobre `#0f172a` |
| M-7 | **~300 `<button>` sin `type`** (default submit) | scan de `src/**/*.tsx` (Calendar 24, Saberes 25, Workouts 32, Profile 17…) | Añadir `type="button"` salvo en submits reales |
| M-8 | **Botones de solo icono sin nombre accesible** | `aria-label` solo en 4 botones (Layout, VideoUploader); cerrar modales con `<X>` no tienen label | Añadir `aria-label` a botones de icono |
| M-9 | **`receipt_url` en base64 dentro de la BD** (Tienda) | `src/pages/Store.tsx:110-124` | Subir a Supabase Storage y guardar URL; acotar tamaño |
| M-10 | **Headers de seguridad incompletos** | `vercel.json` falta CSP, HSTS, Permissions-Policy | Añadir CSP (con cuidado de Google Fonts) y HSTS |
| M-11 | **`console.log` en producción** (~15 en servicios) | `syncQueue.ts:116`, `cacheManager.ts:34/54/87`, `driveService.ts:62-106`, `pushNotifications.ts` | Sustituir por logs estructurados o eliminarlos |
| M-12 | **Reglas Firestore con emails hardcodeados** y dualidad de fuente de verdad (Firebase↔Supabase) | `firestore.rules:19-20`; la app migró a Supabase | Elegir un backend y desmantelar el otro |
| M-13 | **PWA: iconos del manifest en URL remota de Unsplash** | `vite.config.ts:25-33`; precache de 1.8 MB | Iconos locales en `public/` |

---

## HALLAZGOS BAJOS

- Archivos basura en la raíz: `temp_calendar_original.tsx` (116 KB), `Untitled-1775946082242.n8n` (0 B), `tsc-errors.txt`, `ts-output.txt`, `test_report.json`.
- `browserslist` desactualizado (caniuse-lite 6 meses) — correr `npx update-browserslist-db`.
- Header `X-XSS-Protection` deprecado (se puede retirar).
- `apple-touch-icon` apunta a Unsplash (`index.html:9`).

---

## LO QUE ESTÁ BIEN ✅

- Typecheck (`tsc --noEmit`) y build pasan sin errores.
- Code-splitting con `React.lazy` en las 17+ rutas (`src/App.tsx:22-39`).
- Las 27 `<img>` tienen `alt`; `target="_blank"` siempre con `rel="noopener noreferrer"`.
- `ProtectedRoute` guarda acceso por sesión, rol y estado de plan.
- PWA: `registerSW.js` se registra automáticamente; SW generado (67 entradas precacheadas).
- `vercel.json`: cache `immutable` para assets y headers básicos de seguridad.
- Sentry + LogRocket inicializados en `src/lib/monitoring.ts`.
- `.env*` gitignored; sin claves reales en el repo.
- Supabase RLS **habilitado** en todas las tablas listadas (aunque las políticas son abiertas, ver C-1).
- Menu lateral: overlay, cierre al navegar, swipe gestures implementados.

---

## PRIORIDAD DE CORRECCIÓN

1. **Inmediato (bloqueante):** C-1 a C-6 (seguridad de datos y pagos) + H-1 (API key expuesta).
2. **Esta iteración:** H-2/H-3 (rendimiento), H-4 (schema), H-6 (dependencias), M-1 a M-3 (analítica/SEO), M-5 (favicon).
3. **Backlog:** M-6 a M-13, bajos.

> Nota: los datos de rendimiento (Lighthouse) se tomaron sobre el preview local sin CDN ni HTTPS; los valores absolutos pueden mejorar en producción con cache de borde, pero el peso del bundle JS (H-2) es un cuello de botella real.

---

## ESTADO DE CORRECCIONES (2026-08-19)

| ID | Estado | Resolución |
|---|---|---|
| C-1 | ✅ | `supabase_schema.sql`: función `is_admin()` (security definer) + reescritura de TODAS las políticas RLS (nunca `using (true)` en escritura) |
| C-2 | ✅ | Trigger `profiles_handle_role` en BD: rol inmutable desde el cliente (solo admin puede escalar, y solo vía email whitelist del trigger) |
| C-3 | ✅ | `api/send-email.ts`: exige JWT Supabase (Bearer), rate-limit en memoria, `to` solo del usuario autenticado (admin a terceros) |
| C-4 | ✅ | `src/lib/emailTemplates.ts`: `escapeHtml()` sobre `nombre, motivo, clase, fecha, hora, tipo` |
| C-5 | ✅ | `firestore.rules`: eliminado el catch-all de escritura; `payments` solo admin puede actualizar; `bookings` el dueño solo puede cancelar |
| C-6 | ✅ | `storage.rules`: `/entrenos, /workouts, /community, /combos` → write solo admin; `pagos/` → dueño sube, admin borra |
| H-1 | ✅ | `/api/gemini.ts` (serverless, key solo server-side) + `geminiService.ts` refactorizado; la key salió del bundle |
| H-2 | ✅ | `manualChunks` en `vite.config.ts`: chunk principal 763 KB → **56 KB** (react/supabase/vendor/motion separados) |
| H-3 | ⚠️ | Parcial: bundle inicial muy reducido; pendiente optimizar imágenes avatar PNG (4-5 MB) y fuentes |
| H-4 | ✅ | 12 tablas faltantes creadas en `supabase_schema.sql` + RLS por tabla + realtime |
| H-5 | ✅ | `functions/src/index.ts`: validación anti-SSRF (https, no IPs privadas, timeout 30s, límite 120 MB) |
| H-6 | ✅ | `npm audit fix`: 23 vulns → **1 baja** (esbuild, solo dev-server Windows); `browserslist` actualizado |
| M-1 | ✅ | `src/lib/analytics.ts` GA4 opcional (`VITE_GA_MEASUREMENT_ID`) + eventos `login`, `sign_up`, `payment_submitted`, `order_placed` |
| M-2 | ✅ | `public/robots.txt` + `public/sitemap.xml` |
| M-3 | ✅ | `index.html`: meta description + OG/Twitter tags |
| M-4 | ✅ | `lang="es"` |
| M-5 | ✅ | Favicon local `public/favicon.png` + iconos PWA en `public/icons/` |
| M-6 | ✅ | `index.css`: `.dark .text-primary → #60a5fa` + `dark:text-slate-400` en Payments |
| M-7 | ✅ | Script: `type="button"` en 324 botones (salvo submits reales) |
| M-8 | ✅ | Script: `aria-label` en 107 botones de solo icono |
| M-9 | ✅ | `Store.tsx`: comprobante a Supabase Storage (bucket `receipts`, no base64) |
| M-10 | ✅ | `vercel.json`: CSP, HSTS, Permissions-Policy, nosniff/DENY |
| M-11 | ✅ | 20 `console.log` eliminados de servicios |
| M-12 | ⚠️ | Parcial: emails hardcodeados se mantienen por compatibilidad (firma de funciones); pendiente desmantelar Firebase legacy |
| M-13 | ✅ | Manifest PWA con iconos locales + maskable |
| B | ✅ | Basura eliminada (`temp_calendar_original.tsx`, `Untitled-*.n8n`, `tsc-errors.txt`, `ts-output.txt`) |
| Verif. | ✅ | `tsc --noEmit` ✅ · `vite build` ✅ · `npm audit` 1 baja · Lighthouse best-practices **100** |

### Pendiente de ejecución manual (requiere credenciales/dominios)
- Ejecutar `supabase_schema.sql` en el SQL Editor de Supabase.
- Desplegar `api/send-email.ts` y `api/gemini.ts` en Vercel con sus variables.
- Subir `firestore.rules` / `storage.rules` (`firebase deploy --only firestore:rules,storage`).
- Configurar Google Sign-In: ver `GUIA_GOOGLE_SIGNIN.md`.