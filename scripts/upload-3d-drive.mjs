import { importPKCS8, SignJWT } from 'jose';
import { readFileSync } from 'node:fs';

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
d4obcoI0wbzvhoavuclTNJoFCQctO5A4nkwjUIys807dc/dcMR3AnEB836FdY9Mt
ZYnR8XopHPpae4iqPUwrw/JSjclt5W8SiaHwDrapgUMvLY/z1sstNmqyscIv+8a7
4QiNKBi+B2xq7lYb7I0lf2Q=
-----END PRIVATE KEY-----`;

const ROOT_FOLDER_ID = process.env.DRIVE_ROOT_FOLDER_ID || "1fmG_QHM5en9OAaWelBLW3KfP4DdqUAAB";
const MODEL_PATH = process.argv[2] || "public/modelo3D.glb";
const FOLDER_NAME = process.argv[3] || "3D Modelos";

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const alg = 'RS256';
  const privateKey = await importPKCS8(PRIVATE_KEY, alg);
  const jwt = await new SignJWT({
    iss: CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token'
  })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!res.ok) throw new Error("Auth Error: " + await res.text());
  return (await res.json()).access_token;
}

async function api(token, url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) }
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`${opts.method || 'GET'} ${url} → ${res.status}: ${await res.text()}`);
  }
  return res;
}

async function findOrCreateFolder(token, name, parentId) {
  const q = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await api(token, `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
  const exists = (await list.json()).files?.[0];
  if (exists) { console.log("Carpeta existe → ID:", exists.id); return exists.id; }
  const res = await api(token, 'https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
  });
  const folder = await res.json();
  console.log("Carpeta creada → ID:", folder.id);
  return folder.id;
}

async function uploadFile(token, filePath, folderId) {
  const data = new Uint8Array(readFileSync(filePath));
  const name = filePath.split(/[\\/]/).pop();
  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Length': data.length.toString()
    },
    body: JSON.stringify({ name, mimeType: 'model/gltf-binary', parents: [folderId] })
  });
  if (!initRes.ok) throw new Error("Init upload → " + initRes.status + ": " + await initRes.text());
  const location = initRes.headers.get('Location');
  const up = await fetch(location, { method: 'PUT', headers: { 'Content-Type': 'model/gltf-binary' }, body: data });
  if (!up.ok) throw new Error("Upload → " + up.status + ": " + await up.text());
  return up.json();
}

async function setPublic(token, fileId) {
  const res = await api(token, `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone', allowFileDiscovery: false })
  });
  if (!res.ok) throw new Error("Permiso → " + res.status + ": " + await res.text());
  console.log("Permiso público OK");
}

async function main() {
  const token = await getToken();
  console.log("Auth OK (token obtenido)");

  console.log("Verificando acceso a carpeta raíz:", ROOT_FOLDER_ID);
  const check = await api(token, `https://www.googleapis.com/drive/v3/files/${ROOT_FOLDER_ID}?fields=id,name`);
  if (check.status === 404) {
    console.error("✗ NO hay acceso a la carpeta raíz. Comparte la carpeta con drive-firestore-sync@gpte007.iam.gserviceaccount.com");
    return;
  }
  const rootMeta = await check.json();
  console.log("Raíz accesible:", rootMeta.name || "(sin nombre)", "| ID:", rootMeta.id);

  const folderId = await findOrCreateFolder(token, FOLDER_NAME, ROOT_FOLDER_ID);
  console.log("Subiendo:", MODEL_PATH, `(${(readFileSync(MODEL_PATH).length / 1024 / 1024).toFixed(2)} MB)`);
  const file = await uploadFile(token, MODEL_PATH, folderId);
  console.log("Archivo subido → ID:", file.id);
  await setPublic(token, file.id);
  console.log("\nURL preview: https://drive.google.com/file/d/" + file.id + "/preview");
  console.log("Download direct: https://drive.google.com/uc?export=download&id=" + file.id);
  console.log("uc export=view:  https://drive.google.com/uc?export=view&id=" + file.id);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });