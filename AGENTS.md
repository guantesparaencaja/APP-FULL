# Instrucciones obligatorias para OpenCode

Antes de cualquier cambio en este repositorio, lee completamente [`OPENCODE_PROJECT_MEMORY.md`](./OPENCODE_PROJECT_MEMORY.md) y respeta sus reglas. Revisa también el estado de Git, las migraciones relacionadas y los consumidores del código antes de editar.

No subas imágenes, videos, miniaturas, portadas ni modelos 3D de entrenamiento a Supabase: usa las URLs externas, Google Drive o puentes ya definidos. Solo los comprobantes de pago pueden usar el bucket privado `receipts`; nunca `gpte-videos`.

No expongas secretos, no cambies permisos solo en el cliente, no uses escrituras sensibles con RLS abierto, y no encadenes operaciones de reservas/pagos que deban ser atómicas. Antes de publicar ejecuta tipos, build, `git diff --check` y smoke test. Agrupa cinco correcciones enfocadas por commit y haz push solo después de validar.
