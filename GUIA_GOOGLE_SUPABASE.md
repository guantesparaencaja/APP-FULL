# Inicio de sesión con Google usando Supabase

El botón de Google ya usa `supabase.auth.signInWithOAuth({ provider: 'google' })`. Para activarlo en producción hay que configurar Google Cloud, el proveedor Google de Supabase y las variables de Vercel.

## 1. Rotar las claves expuestas

La `SUPABASE_SERVICE_ROLE_KEY`, la clave de Vercel y cualquier secreto pegado en chats deben rotarse antes de producción:

1. Supabase Dashboard → **Project Settings → API** → generar una nueva `service_role`/secret key.
2. Vercel → proyecto → **Settings → Environment Variables** → reemplazar `SUPABASE_SERVICE_ROLE_KEY` en Production, Preview y Development según corresponda.
3. El token de Vercel se revoca/regenera desde la sección de tokens de la cuenta Vercel.
4. No poner ninguna de esas claves en `VITE_*`, Git, el navegador ni capturas.

## 2. Crear el OAuth Client en Google Cloud

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/) y seleccionar el proyecto de la aplicación.
2. **APIs & Services → OAuth consent screen**: configurar la aplicación. Para una prueba interna, agregar los correos de prueba; para producción, completar la publicación/verificación solicitada por Google.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
4. Tipo: **Web application**.
5. En **Authorized JavaScript origins**, agregar:
   - `http://localhost:3000`
   - `https://gpte-fitness.vercel.app`
6. En **Authorized redirect URIs**, copiar exactamente la URL que aparece en Supabase en **Authentication → Providers → Google**. Para este proyecto normalmente es:
   - `https://orwsbvboozboxfpyctra.supabase.co/auth/v1/callback`
7. Crear y copiar el **Client ID** y el **Client secret**.

## 3. Activar Google en Supabase

1. Supabase Dashboard → **Authentication → Providers → Google**.
2. Activar Google.
3. Pegar el **Client ID** y **Client secret** de Google Cloud.
4. Guardar.
5. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `https://gpte-fitness.vercel.app`
   - **Redirect URLs**: `https://gpte-fitness.vercel.app/` y `http://localhost:3000/`
6. Guardar los cambios.

## 4. Variables de entorno

En local, `.env.local` debe tener únicamente valores locales reales y nunca se debe commitear:

```env
VITE_SUPABASE_URL=https://orwsbvboozboxfpyctra.supabase.co
VITE_SUPABASE_ANON_KEY=<clave-publicable-nueva>
```

En Vercel → **Settings → Environment Variables**, agregar:

```env
VITE_SUPABASE_URL=https://orwsbvboozboxfpyctra.supabase.co
VITE_SUPABASE_ANON_KEY=<clave-publicable-nueva>
SUPABASE_URL=https://orwsbvboozboxfpyctra.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-nueva>
ADMIN_EMAIL=hernandezkevin001998@gmail.com
```

Después de guardar, hacer **Redeploy**. La `VITE_SUPABASE_ANON_KEY` es la única de estas que puede llegar al navegador; la service role solo la usa `/api/admin-delete-user` en el servidor.

Para el login web no es necesario llenar `VITE_GOOGLE_CLIENT_ID` ni `VITE_GOOGLE_CLIENT_SECRET`: esas credenciales las administra Supabase. Esas variables solo corresponden a integraciones nativas/Drive y el secret nunca debe exponerse como `VITE_*`.

## 5. Verificación

1. Abrir una ventana incógnito en `https://gpte-fitness.vercel.app/login`.
2. Pulsar **Continuar con Google**.
3. Elegir una cuenta y aceptar los permisos.
4. Confirmar que vuelve a `https://gpte-fitness.vercel.app/` y que aparece el perfil.
5. En Supabase → **Authentication → Users**, comprobar que se creó el usuario.
6. Probar también un registro nuevo: el trigger/`ensureProfile` crea su fila en `public.profiles` con rol `student`.

Si Google muestra `redirect_uri_mismatch`, la URI de Google Cloud no coincide exactamente con la que muestra Supabase. Si vuelve a la app pero no aparece el usuario, revisar la consola del navegador y las políticas/trigger de `public.profiles`.
