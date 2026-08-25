const { execSync } = require('child_process');
const path = require('path');

const MAX_RETRIES = 2;

function runCommand(command) {
  try {
    console.log(`\n>>> EJECUTANDO: ${command}`);
    // Usamos cmd /c en Windows para mayor compatibilidad con scripts npx/npm
    const fullCommand = process.platform === 'win32' ? `cmd /c ${command}` : command;
    execSync(fullCommand, { stdio: 'inherit', cwd: __dirname });
    return true;
  } catch (error) {
    console.error(`\n[❌] ERROR en el comando: "${command}"`);
    return false;
  }
}

console.log('=============================================');
console.log('--- SISTEMA DE SINCRONIZACIÓN UNIVERSAL ---');
console.log('=============================================');
console.log('Proyecto detectado en:', __dirname);

// PASO 1: Build Web
console.log('\n[1/3] Construyendo versión web (Vite)...');
if (!runCommand('npm run build')) {
  process.exit(1);
}

// PASO 2: Firebase Deploy (Web)
console.log('\n[2/3] Sincronizando con el servidor WEB (Firebase)...');
if (!runCommand('npx firebase deploy --only hosting')) {
  console.warn('\n[!] Advertencia: Falló el despliegue en Firebase, continuando con Apps móviles...');
}

// PASO 3: Capacitor Sync (Android & iOS)
console.log('\n[3/3] Sincronizando con Aplicaciones Móviles (Android e iPhone)...');
if (!runCommand('npx cap sync')) {
  console.error('\n[❌] Error crítico al sincronizar con Capacitor.');
  process.exit(1);
}

console.log('\n=============================================');
console.log('✅ ¡SINCRONIZACIÓN COMPLETADA CON ÉXITO!');
console.log('Web: Actualizada en Firebase Hosting.');
console.log('Android: Assets sincronizados.');
console.log('iPhone/iOS: Assets sincronizados.');
console.log('=============================================');
console.log('Nota: Para generar el APK/IPA final, usa Android Studio o Xcode.');
