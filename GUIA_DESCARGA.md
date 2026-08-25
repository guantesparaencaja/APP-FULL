# Guía de Descarga e Instalación - Guantes Para Encajarte

Esta guía detalla los pasos para desplegar los cambios en la nube y luego compilar la aplicación en dispositivos Android e iOS.

---

## ☁️ Paso 0: Despliegue en la Nube (CRUCIAL)

Antes de generar el APK o probar la web, debes subir los últimos cambios del código (específicamente la nueva configuración de correo y sincronización):

### 1. Desplegar la Web (Hosting)
En la carpeta raíz del proyecto, ejecuta:
```powershell
npm run build
firebase deploy --only hosting
```

### 2. Desplegar los Correos (Functions)
Entra en la carpeta `functions` y ejecuta:
```powershell
cd functions
npm run build
firebase deploy --only functions
```

### 3. Sincronizar con el Móvil
Vuelve a la carpeta raíz y sincroniza Capacitor:
```powershell
.\node_modules\.bin\cap.cmd sync
```

---

## 🤖 Android (Android Studio)

### Paso 1: Preparar el Build
Desde la carpeta raíz del proyecto (donde está `package.json`), ejecuta:
```bash
npm run build
```

### Paso 2: Sincronizar con Capacitor
Si es la primera vez o recibes el error "android platform has not been added yet":
```bash
npx cap add android
```
Luego sincroniza los cambios:
```bash
npx cap sync android
```

### Paso 3: Abrir en Android Studio
```bash
npx cap open android
```
- En Android Studio, espera a que termine el indexado de Gradle.
- Ve a **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
- Una vez finalizado, aparecerá un aviso para "Locate" el archivo `.apk` para instalar en tu celular.

## 🍎 iOS (iPhone)

   ```
3. En Xcode, selecciona tu iPhone y haz clic en el botón de **Play (Run)**.

### Opción B: Usando servicios en la nube (Sin Mac)
Si no tienes acceso a una Mac, puedes usar servicios como:
- **AppFlow (Ionic)**: Permite compilar para iOS en la nube desde Windows.
- **Expo (Si el proyecto fuera Expo)**: No aplica directamente aquí, pero es una alternativa para futuros proyectos.

---

## ⚠️ Notas Importantes
- **Sincronización**: Cada vez que hagas cambios en el código web (React), debes ejecutar `npm run build` y `npx cap sync` para que los cambios se reflejen en la app móvil.
- **Firebase**: Asegúrate de que las APIs de Firebase estén configuradas correctamente en los archivos `google-services.json` (Android) y `GoogleService-Info.plist` (iOS).
