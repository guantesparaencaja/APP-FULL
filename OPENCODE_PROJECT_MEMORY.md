# Memoria operativa del proyecto GPTE Fitness

## Regla obligatoria antes de cada cambio

Antes de editar, crear, borrar, migrar o desplegar cualquier cosa, lee este archivo completo. Después revisa el estado de Git, las migraciones relacionadas y los flujos que consumen el código. Si una solicitud contradice estas reglas, detente y pide confirmación explicando el impacto.

## Arquitectura y almacenamiento

- La aplicación usa Supabase para autenticación, perfiles, reservas, pagos, permisos y datos estructurados.
- Las imágenes y videos de entrenamiento, tutoriales, portadas, miniaturas y modelos 3D NO deben subirse a Supabase Storage. El proyecto mantiene el plan gratuito usando URLs externas, Google Drive u otros puentes/CDN ya aprobados.
- No conviertas una URL externa en una subida automática a Supabase. Conserva la URL y valida que sea accesible desde el cliente.
- Los comprobantes de pago son una excepción de privacidad: si el flujo los necesita, deben ir únicamente al bucket privado `receipts`, dentro de la carpeta del usuario, con URLs firmadas temporales. Nunca uses `gpte-videos` para comprobantes.
- No incluy archivos multimedia pesados en Git ni en el bundle de producción.

## Seguridad

- Nunca escribas claves privadas, tokens, contraseñas, service accounts ni credenciales reales en código, commits, logs o documentación pública.
- Las credenciales deben venir de variables de entorno protegidas. Si una credencial apareció en el historial, recomienda revocarla y rotarla; eliminarla del archivo actual no la invalida.
- Los roles se definen en backend/RLS. El cliente nunca puede concederse permisos de administrador cambiando correo, estado o campos del perfil.
- Toda operación sensible debe validar sesión, propietario y rol en Supabase, no solo en React.
- No uses políticas RLS con `using (true)` o `with check (true)` para escritura sensible.

## Cambios y datos

- Prefiere migraciones SQL idempotentes para cambios de esquema, funciones, índices y políticas. Documenta cuándo deben ejecutarse en Supabase.
- Para reservas, cupos, pagos y devoluciones usa funciones atómicas o transacciones; no encadenes lecturas y escrituras independientes desde el navegador.
- Comprueba siempre los errores de Supabase y muestra un estado recuperable al usuario.
- Mantén un único vocabulario para estados de pago, aprobación y reservas.
- No borres ni reescribas historial Git sin autorización explícita.

## Calidad y despliegue

- Antes de commit: ejecuta comprobación de tipos, build, `git diff --check` y una prueba de arranque de la aplicación.
- Si Vite muestra ciclos de chunks, errores de módulos o warnings nuevos, resuélvelos o documenta por qué no bloquean el cambio.
- Después de cada grupo aprobado de cinco correcciones: crea un commit descriptivo y haz push a `main`.
- No inventes cambios para justificar un commit. Mantén los cambios enfocados y revisa `git diff` antes de publicar.
- Las funciones antiguas de Firebase no deben recibir datos nuevos si el flujo actual usa Supabase; antes de eliminarlas, identifica dependencias y prepara migración.

## Convenciones de implementación

- Centraliza permisos y constantes compartidas; evita repetir correos administrativos en múltiples componentes.
- Usa límites, validación server-side y restricciones de base de datos para cualquier dato enviado por el cliente.
- Para multimedia externa añade fallback visual, carga diferida y manejo de errores local; un video/modelo roto no debe tumbar toda la pantalla.
- Evita cambios que aumenten innecesariamente el tamaño del bundle o el consumo de Supabase.
