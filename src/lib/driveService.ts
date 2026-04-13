/**
 * GPTE Drive Service v2.0
 * Servicio de integración con Google Drive a través de n8n.
 * v2.0: Añade hard-delete en cascada, integración de URLs de Lyfta y auditoría.
 */

import { db, storage } from './firebase';
import {
  doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp,
  getDocs, query, where,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { AuditEntry } from '../types/workout.types';

const emailBase = (import.meta as any).env.VITE_N8N_EMAIL_BASE || 'https://gpte.app.n8n.cloud/webhook';
const N8N_WEBHOOK_URL =
  (import.meta as any).env.VITE_N8N_DRIVE_WEBHOOK ||
  `${emailBase.replace(/\/$/, '')}/gpte-drive-upload`;

// ─── Upload Video to Drive ────────────────────────────────────────────────────

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

// ─── Delete Video from Drive ──────────────────────────────────────────────────

export async function deleteVideoFromDrive(videoUrl: string): Promise<boolean> {
  if (!videoUrl || !videoUrl.includes('drive.google.com')) return false;

  try {
    const response = await fetch(N8N_WEBHOOK_URL.replace('upload', 'delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', videoUrl }),
    });

    return response.ok;
  } catch (error) {
    console.error('[driveService] Error deleting from Drive:', error);
    return false;
  }
}

// ─── Hard Delete (Cascade) ────────────────────────────────────────────────────

/**
 * Elimina un video de forma permanente de TODAS las plataformas:
 * 1. Firebase Storage (cover_url y video_url si son de Storage)
 * 2. Google Drive (si el video_url apunta a Drive)
 * 3. Firestore (el documento del video)
 * 4. Registra en `rejected_videos` para ban-list permanente
 *
 * Esta operación es IRREVERSIBLE.
 */
export async function hardDeleteVideo(
  videoId: string,
  videoData: {
    video_url?: string;
    cover_url?: string;
    title?: string;
    adminId?: string;
  }
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  const { video_url, cover_url, title = 'Sin título', adminId = 'system' } = videoData;

  console.log(`[hardDeleteVideo] Iniciando eliminación completa de: ${title} (${videoId})`);

  // 1. Eliminar portada de Firebase Storage
  if (cover_url && cover_url.includes('firebasestorage.googleapis.com')) {
    try {
      const coverRef = ref(storage, cover_url);
      await deleteObject(coverRef);
      console.log('[hardDeleteVideo] ✅ Portada eliminada de Storage');
    } catch (err: any) {
      const msg = `Storage cover: ${err?.message || err}`;
      errors.push(msg);
      console.warn('[hardDeleteVideo] ⚠️', msg);
    }
  }

  // 2. Eliminar video de Firebase Storage
  if (video_url && video_url.includes('firebasestorage.googleapis.com')) {
    try {
      const videoRef = ref(storage, video_url);
      await deleteObject(videoRef);
      console.log('[hardDeleteVideo] ✅ Video eliminado de Storage');
    } catch (err: any) {
      const msg = `Storage video: ${err?.message || err}`;
      errors.push(msg);
      console.warn('[hardDeleteVideo] ⚠️', msg);
    }
  }

  // 3. Eliminar de Google Drive (si aplica)
  if (video_url && video_url.includes('drive.google.com')) {
    try {
      const driveOk = await deleteVideoFromDrive(video_url);
      if (driveOk) {
        console.log('[hardDeleteVideo] ✅ Video eliminado de Drive');
      } else {
        errors.push('Drive: respuesta no OK del webhook');
      }
    } catch (err: any) {
      const msg = `Drive: ${err?.message || err}`;
      errors.push(msg);
      console.warn('[hardDeleteVideo] ⚠️', msg);
    }
  }

  // 4. Registrar en ban-list (rejected_videos) para evitar que vuelva a cargarse
  try {
    await addDoc(collection(db, 'rejected_videos'), {
      originalId: videoId,
      video_url: video_url || null,
      title,
      rejectedBy: adminId,
      rejectedAt: new Date().toISOString(),
    });
    console.log('[hardDeleteVideo] ✅ Registrado en ban-list de rechazados');
  } catch (err: any) {
    const msg = `Ban-list: ${err?.message || err}`;
    errors.push(msg);
    console.warn('[hardDeleteVideo] ⚠️', msg);
  }

  // 5. Eliminar documento de Firestore ÚLTIMO (punto de no retorno)
  try {
    await deleteDoc(doc(db, 'workout_videos', videoId));
    console.log('[hardDeleteVideo] ✅ Documento eliminado de Firestore');
  } catch (err: any) {
    const msg = `Firestore: ${err?.message || err}`;
    errors.push(msg);
    console.error('[hardDeleteVideo] ❌', msg);
    return { success: false, errors };
  }

  return { success: true, errors };
}

// ─── Approve Video with Audit ─────────────────────────────────────────────────

/**
 * Aprueba un video y registra la entrada de auditoría.
 */
export async function approveVideoWithAudit(
  videoId: string,
  adminId: string,
  adminName?: string
): Promise<void> {
  const auditEntry: AuditEntry = {
    action: 'approved',
    adminId,
    adminName: adminName || adminId,
    timestamp: new Date().toISOString(),
  };

  await updateDoc(doc(db, 'workout_videos', videoId), {
    status: 'approved',
    isApproved: true, // retrocompatibilidad
    auditLog: [auditEntry], // En producción usar arrayUnion
  });
}

// ─── Lyfta Video Importer ─────────────────────────────────────────────────────

export interface LyftaVideoMetadata {
  title: string;
  categoryId: string;
  muscleGroups?: string[];
  difficulty?: string;
  equipment?: string;
  objetivo?: string;
  tipo?: string;
  description?: string;
  tags?: string[];
}

/**
 * Registra en Firestore un video de Lyfta (URL directa de apilyfta.com).
 * El video queda en estado `pending` hasta que el Admin lo apruebe.
 */
export async function importLyftaVideo(
  sourceUrl: string,
  metadata: LyftaVideoMetadata,
  uploadedBy: string
): Promise<string> {
  // Verificar que no esté en la ban-list
  const bannedQ = query(collection(db, 'rejected_videos'), where('video_url', '==', sourceUrl));
  const bannedSnap = await getDocs(bannedQ);
  if (!bannedSnap.empty) {
    throw new Error('Este video fue rechazado previamente y no puede volver a importarse.');
  }

  // Verificar duplicado por URL
  const dupQ = query(collection(db, 'workout_videos'), where('video_url', '==', sourceUrl));
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) {
    throw new Error('Este video ya existe en la biblioteca.');
  }

  const docRef = await addDoc(collection(db, 'workout_videos'), {
    ...metadata,
    video_url: sourceUrl,
    sourceUrl,
    status: 'pending',
    isApproved: false,
    createdAt: new Date().toISOString(),
    createdBy: uploadedBy,
    auditLog: [
      {
        action: 'uploaded',
        adminId: uploadedBy,
        timestamp: new Date().toISOString(),
        notes: 'Importado desde Lyfta',
      } as AuditEntry,
    ],
  });

  return docRef.id;
}

// ─── Sync Status ──────────────────────────────────────────────────────────────

/**
 * Actualiza el estado de un video con trazabilidad.
 */
export async function syncVideoStatus(
  videoId: string,
  status: 'approved' | 'pending',
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, 'workout_videos', videoId), {
    status,
    isApproved: status === 'approved',
    [`auditLog`]: [
      {
        action: status === 'approved' ? 'approved' : 'uploaded',
        adminId,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
