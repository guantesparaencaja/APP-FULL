import http from 'http';
import { exec } from 'child_process';

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Usage: node setup-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const openBrowser = (url) => {
  const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${start} "${url}"`);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/oauth2callback') {
      const code = url.searchParams.get('code');
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<div style="font-family:sans-serif;text-align:center;padding:50px;"><h1>¡Autorización Exitosa, Comandante! 🥊</h1><p>El código secreto ha sido interceptado de manera segura en tu localhost. Ya puedes cerrar esta pestaña y volver al chat.</p></div>');
        
        console.log('\n[+] ¡Código interceptado con éxito!');
        console.log('[+] Intercambiando por el Refresh Token (Token Eterno)...');
        
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
          })
        });
        
        const tokens = await tokenRes.json();
        
        if (!tokens.refresh_token) {
           console.log('\n[!] ADVERTENCIA: Google no devolvió un refresh_token.');
           console.log(tokens);
           console.log('Asegurate de haber borrado los permisos previos en Google Account si ya habías autorizado esto antes.');
        } else {
           console.log('\n==========================================================');
           console.log('🎉 REFRESH TOKEN OBTENIDO EXITOSAMENTE:');
           console.log(tokens.refresh_token);
           console.log('==========================================================\n');
           
           import('fs').then(fs => {
             const envPath = '.env.local';
             let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
             content += `\nVITE_GOOGLE_DRIVE_REFRESH_TOKEN="${tokens.refresh_token}"\n`;
             content += `VITE_GOOGLE_CLIENT_ID="${CLIENT_ID}"\n`;
             content += `VITE_GOOGLE_CLIENT_SECRET="${CLIENT_SECRET}"\n`;
             fs.writeFileSync(envPath, content);
             console.log('[+] ¡Credenciales inyectadas automáticamente en .env.local!');
           });
        }
        
        setTimeout(() => process.exit(0), 1000);
      } else {
        res.writeHead(400);
        res.end('No code found in URL');
      }
    }
  } catch (err) {
    console.error(err);
  }
});

server.listen(3000, () => {
  console.log('Servidor interceptor local iniciado en el puerto 3000...');
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${CLIENT_ID}&` + 
    `redirect_uri=${REDIRECT_URI}&` + 
    `response_type=code&` + 
    `scope=https://www.googleapis.com/auth/drive&` + 
    `access_type=offline&` + 
    `prompt=consent`;
    
  console.log('Abriendo tu navegador web automáticamente para que inicies sesión en Google...');
  openBrowser(authUrl);
});
