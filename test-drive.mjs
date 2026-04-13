import { importPKCS8, SignJWT } from 'jose';

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

async function test() {
  console.log("Generating token...");
  const now = Math.floor(Date.now() / 1000);
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
    console.error("Auth Error:", await res.text());
    return;
  }
  const token = (await res.json()).access_token;
  console.log("Got token!", token.substring(0, 20) + "...");

  const metadata = { name: 'test.mp4', mimeType: 'video/mp4' };
  console.log("Initiating upload...");
  
  const fakeBinary = new TextEncoder().encode("dummy video content for GPTE test");

  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': fakeBinary.length.toString()
    },
    body: JSON.stringify(metadata)
  });

  if (!initRes.ok) {
    console.log("Google Drive Error:", initRes.status, initRes.statusText);
    console.log(await initRes.text());
    return;
  }
  
  const location = initRes.headers.get('Location');
  console.log("Success! Location:", location);

  // Send fake binary
  console.log("Uploading file...");
  
  const uploadRes = await fetch(location, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: fakeBinary
  });

  if (!uploadRes.ok) {
    console.log("Upload failed:", await uploadRes.text());
    return;
  }
  
  const result = await uploadRes.json();
  const fileId = result.id;
  console.log("Upload Success! File ID:", fileId);

  // Try permission
  console.log("Setting public permission...");
  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' })
  });
  
  if (!permRes.ok) {
     console.log("Permission Error:", await permRes.text());
  } else {
     console.log("Permissions set. URL: https://drive.google.com/file/d/" + fileId + "/preview");
  }
}

test().catch(console.error);
