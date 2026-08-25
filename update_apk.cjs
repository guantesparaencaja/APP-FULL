const { execSync } = require('child_process');

const MAX_RETRIES = 3;

function runCommandWithRetry(command, retries = 0) {
  try {
    console.log(`\n>>> Ejecutando: ${command}`);
    // stdio: 'inherit' allows output to stream directly to the terminal
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.log(`\n[!] Error ejecutando "${command}". Reintentando (${retries + 1}/${MAX_RETRIES})...`);
      return runCommandWithRetry(command, retries + 1);
    } else {
      console.error(`\n[❌] FALLO CRÍTICO: La actualización del APK falló después de ${MAX_RETRIES} reintentos.`);
      console.error(`Ocurrió un error con el comando: "${command}". Por favor, revisa los logs arriba y asegúrate de tener todo configurado correctamente.`);
      return false;
    }
  }
}

console.log('=============================================');
console.log('--- ACTUALIZACIÓN DEL APK CON REINTENTOS ---');
console.log('=============================================');

console.log('\nPaso 1: Empaquetar la versión web más reciente');
const buildSuccess = runCommandWithRetry('npm run build');

if (buildSuccess) {
  console.log('\n✅ Paso 1 Exitoso.');
  console.log('\nPaso 2: Sincronizar con Android');
  const syncSuccess = runCommandWithRetry('npx cap sync android');
  
  if (syncSuccess) {
    console.log('\n✅ Paso 2 Exitoso.');
    console.log('\nPaso 3: Abrir Android Studio');
    // Open might not need retry as much, but we wrap it just in case
    runCommandWithRetry('npx cap open android');
    
    console.log('\n✅ Proceso automatizado completado. Android Studio debería estar abriéndose.');
    console.log('Recuerda generar el APK final desde el menú Build > Build Bundle(s) / APK(s) > Build APK(s) dentro de Android Studio.');
  }
}
