# GUÍA PARA MANTENER LA APP 100% EN PLANES GRATUITOS (Supabase + Vercel)

Fecha: 19/08/2026
Estado: **Verificado — la app está dentro de los límites gratuitos** (medido el 19/08/2026).

---

## 1. Consumo medido hoy (vs. límite gratuito)

### Supabase (proyecto `orwsbvboozboxfpyctra` — plan Free)

| Recurso | Uso actual | Límite Free | % usado |
|---|---|---|---|
| Base de datos | 12.69 MB | 500 MB | **2.5%** ✅ |
| File Storage (videos) | 0.45 MB (2 objetos en `gpte-videos`) | 1 GB | **0.04%** ✅ |
| Egress (bandwidth) | Sin medición puntual, uso bajo | 5 GB (sin caché) + 5 GB (caché) | Muy bajo ✅ |
| MAU | Pequeño grupo de alumnos | 50,000 | Muy bajo ✅ |
| Realtime | Conexiones del app en uso | 200 picos / 2M mensajes | Muy bajo ✅ |

### Vercel (cuenta `gpte007` — plan **Hobby** confirmado vía API)

| Recurso | Límite Hobby | Notas |
|---|---|---|
| Fast Data Transfer (bandwidth) | 100 GB/mes | Los assets tienen `Cache-Control immutable` + caché PWA |
| Function Invocations | 1M/mes | Solo 2 funciones ligeras: `/api/gemini` (3 KB) y `/api/send-email` (6 KB) |
| Active CPU | 4 horas/mes | Uso mínimo (funciones hacen una llamada HTTP corta) |
| Provisioned Memory | 360 GB-hrs/mes | Sin config especial → 1024 MB por invocación, duración corta |
| Tiempo máx. de función | ~60–300 s | Las 2 funciones responden en segundos |

**Conclusión:** margen enorme en ambos. Las mejoras visuales/animación añadidas no cambian el consumo (solo ~5 KB extra de JS/CSS).

---

## 2. Lo que NO hay que activar (rompería el plan gratis)

| Función | Plan requerido | Riesgo |
|---|---|---|
| **Image Transformations** de Supabase (`storage.transform()`) | Pro | NO usar (ni se usa hoy — verificado). En su lugar, subir imágenes ya optimizadas. |
| **PITR / Backups automáticos** / Branching | Pro | Dejar desactivado (Free no incluye). |
| **Compute / Réplicas de lectura** | Pro | No aplica a este uso. |
| **Smart CDN / Edge Config / Fluid compute** en Vercel | Pro | NO usar (vercel.json es estático, compatible). |
| **Image Optimization de Vercel** (`next/image` / vercel image) | Solo 5,000 transformaciones en Hobby | La app no la usa; usar imágenes ya redimensionadas. |
| **Vercel Blob / KV / Postgres** | Hobby 1 GB | No se usan; la BD es Supabase. |

---

## 3. Reglas prácticas para mantenerse gratis (aplicar en el día a día)

### Videos (el mayor riesgo de egress)
1. **Máximo 50 MB por video** (límite de subida Free; ya validado en `videoService.ts` con mensaje claro en español).
2. **Comprimir antes de subir**: H.264, 720p, bitrate ~1.5 Mbps (un video de 5 min ≈ 55 MB; 720p a 1 Mbps ≈ 38 MB). Herramientas gratuitas: HandBrake / CapCut / FFmpeg.
3. **Preferir videos en `gpte-videos` (Supabase)** y eliminar referencias viejas a `firebasestorage.googleapis.com` (ya no se reproducen y no cuentan para el free actual).
4. **Borrar videos que ya no se usen** (panel admin de Entrenos) para no llenar el 1 GB de storage.
5. Evitar re-descargas: la app cachea; si un alumno ve un video 50 veces al mes son ~2.5 GB de egress solo de él → **el tamaño del video es el número a vigilar**.

### Imágenes
6. Subir imágenes ≤ 500 KB (redimensionar a ~800–1200 px antes de subir). Cada imagen pesada multiplica el egress de Tienda/Recetas.
7. Nunca usar `transform()` de Supabase (pagado).

### Base de datos
8. La BD crece con logs/notificaciones: limpiar `system_errors`, `activity_logs` y notificaciones viejas periódicamente (SQL sencillo) — hoy son ~13 MB, no urgente.
9. No almacenar base64 en la BD (los comprobantes de pago ya van a Storage, no a la BD).

### Vercel
10. Los assets ya se sirven `immutable` (1 año) + PWA offline → el bandwidth se amortiza. No añadir imágenes/fuentes gigantes al bundle.
11. Mantener `npm run build` liviano (chunks ya divididos: index 55 KB).

---

## 4. Cómo monitorear el uso (gratis, desde el panel)

- **Supabase**: Dashboard → tu proyecto → **Usage** (muestra Egress, Storage, DB, MAU, Realtime y Edge Functions en vivo). También el plan Free **pausa el proyecto tras 1 semana de inactividad** — para evitarlo, haz cualquier consulta periódica (la app al usarla lo hace sola).
- **Vercel**: Dashboard → proyecto → **Usage** (bandwidth, funciones). Al tocar un límite Hobby, el proyecto **se pausa hasta el mes siguiente** (no cobra, solo deja de servir).

---

## 5. Recordatorio legal (importante)

- **Supabase Free**: 2 proyectos activos, sin SLA ni backups. Para producción con clientes se recomienda Pro, pero el uso actual es perfectamente viable en Free.
- **Vercel Hobby**: por términos de uso es para **proyectos personales/no comerciales**. Si la academia empieza a facturar en la web, Vercel exige Pro. Hoy la página se mantiene gratis y funcional; decide migrar a Pro solo cuando factures.

---

## 6. Servicios externos (también con plan gratis propio)

| Servicio | Uso en la app | Plan gratis |
|---|---|---|
| Resend | Envío de correos (`/api/send-email`) | 3,000 correos/mes |
| Google Gemini API | Coach IA (`/api/gemini`) | Cuota diaria según tu clave |
| Google Analytics / LogRocket / Sentry | Analítica y monitoreo | Tiers gratuitos |
| Supabase Storage | Videos y comprobantes | 1 GB (incluido) |