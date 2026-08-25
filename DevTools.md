# GPTE Developer Tools & Extensions

Para asegurar que la estructura de la aplicación sea robusta, sincronizada y libre de errores, te recomiendo instalar las siguientes herramientas:

## 1. Extensiones de VS Code

### Obligatorias
- **ESLint**: Detecta errores de sintaxis y patrones problemáticos automáticamente.
- **Prettier**: Mantiene el código formateado de manera uniforme.
- **Tailwind CSS IntelliSense**: Autocompletado y ayuda visual para las clases de diseño.

### Recomendadas para este proyecto
- **Firebase Explorer**: Te permite ver tus colecciones de Firestore y el estado de la base de datos sin salir de VS Code.
- **Console Ninja**: Muestra los logs de `console.log` directamente al lado del código mientras la app corre (ideal para debuguear sincronizaciones).
- **Error Lens**: Resalta los errores y advertencias de TypeScript en la misma línea de código.

## 2. Herramientas de Sincronización (MCP)

Si deseas monitorear la app de forma más avanzada, estos "Model Context Protocols" o servicios pueden ayudar:

- **Sentry**: Monitoreo de errores en tiempo real. Te avisará en tu correo si un usuario tiene un fallo en la app (Android/iOS/Web).
- **LogRocket**: Permite grabar sesiones de usuario para ver exactamente qué falló cuando un estudiante reporta un "bug".
- **Google Search Console**: Vital para el SEO y la visibilidad de la versión Web.

## 3. Estructura y Código
- **Sincronización Universal**: Usa siempre `npm run sync`. Este comando ejecuta nuestro script `sincronizar.cjs` que unifica la Build de Vite con los activos de Capacitor (Android/iOS) y Firebase.

---
*Este reporte ha sido generado para optimizar la salud técnica de GPTE v3.0.*
