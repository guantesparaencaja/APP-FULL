---
description: Cómo compilar y actualizar el APK en Android Studio
---
# Actualizando la Aplicación Android (APK)

Como la aplicación está construida con Capacitor, la interfaz gráfica (botones, pantallas, textos) se empaqueta **dentro** del archivo APK. Por lo tanto, cuando se hacen cambios visuales o se agregan nuevas pantallas, la página web (`https://gpte007.web.app`) se actualiza de inmediato, pero **la aplicación instalada en tu celular requiere un nuevo APK**.

(Nota: Los datos de la base de datos como reservas, usuarios y pagos sí están sincronizados siempre en tiempo real, sin importar si actualizas el APK o no).

Sigue estos pasos cada vez que quieras generar un nuevo APK con los últimos cambios visuales:

## Paso 1: Empaquetar la versión web más reciente
Abre la terminal de Windows (CMD o PowerShell) en la carpeta de tu proyecto (`c:\Users\styve\Downloads\Guantes-Para-Encajarte-main`) y ejecuta:
// turbo
```bash
npm run build
```
*(Esto genera los archivos estáticos más recientes en la carpeta `dist`)*.

## Paso 2: Sincronizar con Android
Luego, transfiere esos archivos nuevos a tu proyecto de Android ejecutando:
// turbo
```bash
npx cap sync android
```

## Paso 3: Abrir Android Studio
Abre el proyecto en Android Studio con este comando:
// turbo
```bash
npx cap open android
```

## Paso 4: Generar el APK
1. Una vez abierto Android Studio, espera unos segundos a que termine de cargar (abajo a la derecha dirá "Gradle Sync" y luego desaparecerá).
2. Ve al menú superior y selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Espera a que el proceso termine. Un cartel verde aparecerá abajo a la derecha diciendo "Build APK(s) successfully".
4. Haz clic en la palabra azul **"locate"** en ese mensaje.
5. Se abrirá la carpeta de tu computadora con el archivo `app-debug.apk`. 
6. Pásate ese archivo a tu celular (por cable, Drive o WhatsApp) e instálalo para ver todos los cambios nuevos.
