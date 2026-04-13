// Auth module using User OAuth Refresh Token (Evading Service Account Quota)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_DRIVE_REFRESH_TOKEN;

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGoogleDriveToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  if (cachedToken && tokenExpiry > now + 300) {
    return cachedToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error("Missing Google OAuth credentials in environment.");
    throw new Error("Variables de entorno Google OAuth faltantes. Contacte soporte.");
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google OAuth Refresh Error:', errText);
      throw new Error('Fallo al refrescar token de Google: ' + errText);
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = now + data.expires_in;
    return cachedToken as string;

  } catch (error: any) {
    console.error('getGoogleDriveToken error:', error);
    throw new Error('Error de conexión a Drive: ' + error.message);
  }
}
