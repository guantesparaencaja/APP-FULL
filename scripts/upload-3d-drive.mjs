import { importPKCS8, SignJWT } from 'jose';
import { readFileSync } from 'node:fs';

const CLIENT_EMAIL = process.env.DRIVE_CLIENT_EMAIL || '';
const PRIVATE_KEY = (process.env.DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!CLIENT_EMAIL || !PRIVATE_KEY) {
  throw new Error('DRIVE_CLIENT_EMAIL and DRIVE_PRIVATE_KEY are required');
}

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
