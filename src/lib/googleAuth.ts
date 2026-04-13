import { importPKCS8, SignJWT } from 'jose';

// NOTA: Estas credenciales se usarán solo en el cliente porque el usuario 
// expresamente lo solicitó para evadir Firebase Functions y N8N.
const CLIENT_EMAIL = "drive-firestore-sync@gpte007.iam.gserviceaccount.com";
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDjVe0WpWHR9Jm0
o0hxbVmSwQLsaOKCebRBqaYPJcavjpa4pU5OVt4knw2C8i6ze8dCHTchDN/YmhcL
/psSI6kUCTctTe70eOykbES1+3TasciHfJXWvNM4+GYcZvRHEOgSOoueSjB9D2Mz
iO9Qq7rYZvGtZXbKBZvWDUx9KuDXtvogFMgYr7D/md778iSSkSqJTHDfTLy+fXSD
29tF51Sc+AJQYwKt5NMcVUANfzfvyk4cyNHLYb7n+rJPYUMrgqiqOUv+OvXDlXWr
27NSB8WVsvv2LwNoxM2mDCabsVLyhcIhw3hRbPkbQInRdR+4H+iIIfWJzXQXeAlh
yqFNDVFVAgMBAAECggEANoOe4GzVKbc5eo8jKov5zE67aDx4gKg1mP9ZAk3hOKz9
KJb/UZrUFz0KzOlNWJ3oeMqvsx22ueateyNZRT7G5zaUhCkpkXdD6+PIkEkVyvGR
8CdoeP97uTAbsFjh3/7GX8SpQVJyETM06yE9nf8oRYdeEeIAW85/gZNb0bIMC73x
xsIUw4YNvZ5/eVMWjVVIMgKz88ebMbbIkg+PTY1XLbOgD62wGRMbKHABfjHZ985c
f9fNgAz5Bx40nHO0mLuE3PYTNn5UpjKcWfatJM1+NMwfT2ER0NSjpFiWJY7pOzDl
THVDKiBFTCxN2LeRGk2VCb1f4y5pTsMJYxGPG6FPKwKBgQDxrzJEMyH9tVLi+jF7
H3cx5HnDVt4HEGq7UvFwHbXqzvzvXDN01KM8SggRyTmmh8bdFBR+P9XjbTlnsu6K
bE0O+9OrjTHuxtmOdbb7TuWjMQhDhWDP5svxNzJw0DH+DpznpdUXYLQMYyFce/jK
VpTx6mXj9Gyyj9sGfZ2ZbdViowKBgQDwzSbXgGn/TZBcD8j86TIrSJnLhcB52/H1
1PNKX0xvH1vhD9VYfNVjtkXA98+H0TkR+wY5oXK8x7pdV3bmMBpYnuX8gFrfUDbX
IeUbIIBYa9hjAnHu9mUdSEftEDbe2pLT9mVQyGX8t3GxJkFX7rbNJ1vzFInKL1Nx
3vjkkbazpwKBgEpoZvBqUa+7sI4i+zLt6BObRQWn6+l+221axux+qTBmk6bZ2xnA
EZWRMVTQgAhOSyJreTe5TY+cZA0SILDLURoo2+04JkReQkLC6RgMHVUV1nZ7TOgV
JXrZRJVI8+tE8ne7LZTp9+TMbEv9+wXIjEjCoqYA7ao38fXYnLnM/+JDAoGAW+Ls
327xA6rlWzvqxhd2PW4GwdLYD6gOPHB2JfsXf4/Hz6nrD0kTZGk5VNk7J+h+jo3r
YjJpRgAw7U1i4ZOZeheoSyHviydgxdb5RdCxKQx+FcnpD/aVvwbF64A0b/WX8aok
Hx9ZS4X0rFScuqEswDw0qh08Nxq4DMu4zf+MaCECgYEAnj//TzmXVSAyPwjAow84
d4obcoI0wbzvhoavuclTNJoFCQctO5A4nkwjUIys807dc/dcMR3AnEB836FdY9Mt\nZYnR8XopHPpae4iqPUwrw/JSjclt5W8SiaHwDrapgUMvLY/z1sstNmqyscIv+8a7
4QiNKBi+B2xq7lYb7I0lf2Q=
-----END PRIVATE KEY-----`;

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getGoogleDriveToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  if (cachedToken && tokenExpiry > now + 300) {
    return cachedToken;
  }

  try {
    const alg = 'RS256';
    const privateKey = await importPKCS8(PRIVATE_KEY, alg);

    const jwt = await new SignJWT({
      iss: CLIENT_EMAIL,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token'
    })
      .setProtectedHeader({ alg, typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google OAuth Error:', errText);
      throw new Error('Fallo al obtener token de Google');
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
