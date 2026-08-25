# Google Sign-In con Supabase — Guía paso a paso

Objetivo: permitir que los usuarios entren con **"Continuar con Google"** usando
Supabase Auth (gratis, ya integrado en `src/lib/authService.ts`).

La app ya tiene el código listo:

- `src/lib/authService.ts` → `signInWithGoogle()` (usa `supabase.auth.signInWithOAuth({ provider: 'google' })`).
- `src/pages/Login.tsx` → botón "Continuar con Google" (web + nativo).
- `onAuthChange()` crea automáticamente el perfil en `public.profiles` y asigna `role='admin'` si el correo es uno de los de `ADMIN_EMAILS` (el trigger `profiles_handle_role` del SQL refuerza esto en BD).

Solo falta **configurar las credenciales en Google Cloud + activar el proveedor en Supabase**.

---

## Paso 1 — Crear las credenciales OAuth en Google Cloud

1. Entra a https://console.cloud.google.com → crea o selecciona tu proyecto.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**.
   - Completa nombre de la app, email de soporte y correos de prueba (agrega tu email y el del profesor).
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: **Web application**.
   - Authorized JavaScript origins: `https://tu-dominio.vercel.app` y `https://gpte007.web.app` (o tu dominio).
   - Authorized redirect URIs (MUY IMPORTANTE, debe ser exacto):
     ```
     https://<tu-ref>.supabase.co/auth/v1/callback
     ```
     El `<tu-ref>` es el subdominio de tu proyecto Supabase (lo ves en Settings → API → Project URL, ej. `abcdefghijkl.supabase.co`).
   - Guarda el **Client ID** y el **Client Secret**.

## Paso 2 — Activar Google en Supabase

1. Dashboard Supabase → tu proyecto → **Authentication → Providers → Google**.
2. Activa el toggle **Enable Sign in with Google**.
3. Pega el **Client ID** y **Client Secret** del Paso 1.
4. Guarda.

> En el plan gratuito de Supabase los **dominios de redirect** aceptados son solo el de
> `*.supabase.co` del propio proyecto (y localhost en dev). Para dominios propios
> (vercel.app / web.app) necesitas al menos el plan Pro o usar el redirect estándar
> `https://<ref>.supabase.co/auth/v1/callback` (que es el que ya usa el código).

## Paso 3 — Variables de entorno

En tu `.env` local (para `npm run dev`) y en **Vercel → Settings → Environment Variables**:

```
VITE_SUPABASE_URL=https://<tu-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

No necesitas la key `service_role` en el cliente. El Client ID/Secret de Google
**solo** se pegan en el Dashboard de Supabase, NO en el frontend.

## Paso 4 — Probar

1. `npm.cmd run dev` → ve a `/login`.
2. Toca "Continuar con Google" → se abre la ventana de Google → al aceptar, Supabase
   redirige de vuelta con una sesión válida.
3. `onAuthChange` en `App.tsx` carga el perfil y navega al Home.

Si al volver cae en un error de redirect, revisa la **URL de redirect exacta** en el
Paso 1 (debe coincidir carácter por carácter con la del consent screen).

---

## Nativo (Android/iOS) — Capacitor

En el APK el flujo actual usa el mismo `signInWithGoogle()`; para que el deeplink
funcione en Android:

1. Configura `@codetrix-studio/capacitor-google-auth` (ya está en `package.json`):
   - Añade en el `capacitor.config.ts`:
     ```ts
     plugins: {
       GoogleAuth: {
         scopes: ['profile', 'email'],
         serverClientId: '<TU_WEB_CLIENT_ID>',
         forceCodeForRefreshToken: true,
       },
     }
     ```
2. En **OAuth consent screen** agrega tu correo de desarrollador como **test user**.
3. Rebuild del APK (`npx cap sync android` + build).

> El `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` del `.env` se usan para el login con
> plugin nativo y para Google Drive; no interfieren con el OAuth web de Supabase.

---

## Qué más agregar (roadmap recomendado)

### Prioridad alta — seguridad / correctitud
1. **Ejecutar `supabase_schema.sql`** en el SQL Editor de Supabase (es la base de todo lo demás):
   - RLS seguras (el rol viene del trigger `profiles_handle_role`, no del cliente).
   - Las 12 tablas faltantes (chats, meals, products, orders, configuracion, etc.).
   - Bucket `receipts` para comprobantes de la tienda (ya lo usa `Store.tsx`).
   - Realtime para chats/meals/products/custom_routines.
   - ⚠️ Prueba el bloque `DO` de políticas: si el editor marca error, avísame y lo ajusto.
2. **Desplegar los endpoints serverless en Vercel**: `api/send-email.ts` y `api/gemini.ts`
   necesitan en Vercel: `RESEND_API_KEY`, `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   Revisa `GUIA_EMAIL.md` para el flujo de email.
3. **Subir las reglas**: `firebase deploy --only firestore:rules,storage` con las nuevas
   `firestore.rules` / `storage.rules` (ya endurecidas).
4. **Verificar el CSRF en Supabase**: en Authentication → URL Configuration deja el
   `Site URL` apuntando a tu dominio y añade los redirects permitidos.
5. **API key de Gemini en Vercel**: eliminar cualquier `VITE_GEMINI_API_KEY` de tu `.env`
   (ya no se usa; solo `GEMINI_API_KEY` server-side).

### Prioridad media — producto
6. **Confirmación automática de pagos**: hoy es manual. Cuando un `payments.status`
   pase a `'approved'`, disparar automáticamente: actualizar `profiles.plan_status`,
   `classes_per_month`, `classes_remaining`, y notificar al usuario (función DB + edge
   function en Supabase, o trigger que actualice la tabla `email_queue`).
7. **Pasarela de pago**: Nequi/PSE automatizado (Plin/PayPal) para quitar la
   dependencia del comprobante manual. Requiere cuenta de negocio (costo).
8. **Push notifications**: con el bucket y tablas listas, conectar FCM server-side
   (Cloud Messaging) para enviar recordatorios de clase sin depender del cliente.
9. **Modo offline completo**: sincronizar workouts/meals con `syncQueue` (ya existe la
   cola) para que el modo avión no pierda datos.
10. **App Store / Play Store**: firmar el APK (`Update_Android_APK.md`), generar iconos
    de alta calidad (los actuales son placeholder "G"), y publicar.

### Prioridad baja — pulido
11. **GA4**: añadir `VITE_GA_MEASUREMENT_ID` para activar analítica (ya está el código en
    `src/lib/analytics.ts` con eventos de login/registro/pago).
12. **Imágenes del avatar** (`female_*.png`, `male_*.png` ~5 MB): convertir a WebP/AVIF
    para bajar el peso inicial y mejorar LCP.
13. **Migrar Firebase → Supabase del todo**: las funciones de `functions/src/index.ts`
    aún usan Firestore; mover la lógica de desafíos/correos a edge functions de Supabase
    y apagar Firebase (menos costo, una sola fuente de verdad).
14. **Eliminar el OAuth de Drive del cliente** (`googleAuth.ts` con refresh token en el
    bundle): moverlo a un serverless `/api/drive` como se hizo con Gemini.
15. **i18n / accesibilidad**: revisar contrastes restantes (`text-slate-500` en otras
    páginas) y añadir `aria-live` a los modales.