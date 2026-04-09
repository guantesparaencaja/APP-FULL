/**
 * GPTE Drive Service via n8n
 * Este servicio se encarga de subir videos a Google Drive utilizando un Webhook de n8n.
 * Esto evita costes de almacenamiento en Firebase y el límite de 1MB de Firestore.
 */

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_DRIVE_WEBHOOK || 'https://n8n.tu-instancia.com/webhook/gpte-drive-upload';

export async function uploadVideoToDrive(
  file: File, 
  userId: string, 
  onProgress?: (progress: number) => void,
  metadata: any = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('userId', userId);
    formData.append('fileName', `${Date.now()}_${file.name}`);
    formData.append('metadata', JSON.stringify(metadata));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', N8N_WEBHOOK_URL, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.videoUrl) {
            resolve(data.videoUrl);
          } else {
            reject(new Error('n8n no devolvió una URL de video válida'));
          }
        } catch (e) {
          reject(new Error('Error al parsear la respuesta de n8n'));
        }
      } else {
        reject(new Error(`Error servidor n8n: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red al subir a n8n'));
    xhr.send(formData);
  });
}

/**
 * Ejemplo de Estructura de Workflow en n8n:
 * 1. Webhook (POST, Multipart-form-data)
 * 2. Google Drive: Upload File (Usa el binario 'video')
 * 3. Google Drive: Share (Hace el archivo público o a quien tenga el link)
 * 4. Respond to Webhook (JSON: { "videoUrl": "https://drive.google.com/..." })
 */
