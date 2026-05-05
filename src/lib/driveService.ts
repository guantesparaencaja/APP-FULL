/**
 * GPTE Drive Service v3.0 — Migrado a Supabase Storage
 * 
 * BREAKING: uploadVideoToDrive ahora sube a Supabase Storage (sin OAuth).
 * Todas las demás funciones (hardDelete, approveVideoWithAudit, etc.) se mantienen.
 */

import { db, storage } from './firebase';
import {
  doc, updateDoc, deleteDoc, addDoc, collection, serverTimestamp,
  getDocs, query, where,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { AuditEntry } from '../types/workout.types';
import { uploadVideo, deleteVideo } from './videoService';

// ─── Upload Video (Ahora usa Supabase Storage) ────────────────────────────────

export async function uploadVideoToDrive({
  video,
  name,
  onProgress,
  bucket = 'gpte-videos',
}: {
  video: File;
  name: string;
  onProgress?: (pct: number) => void;
  bucket?: string;
}): Promise<string> {
  const sanitizedName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  return uploadVideo({
    file: video,
    bucket,
    path: sanitizedName,
    onProgress,
  });
}

// ─── Delete Video ─────────────────────────────────────────────────────────────

export async function deleteVideoFromDrive(videoUrl: string): Promise<boolean> {
  if (!videoUrl) return false;

  // Si es URL de Supabase, usar videoService
  if (videoUrl.includes('supabase.co')) {
    return deleteVideo(videoUrl);
  }

  // Legado: URL de Google Drive — ya no se puede borrar sin OAuth, solo log
  console.warn('[driveService] Video de Drive legacy — no se puede eliminar sin OAuth:', videoUrl);
  return false;
}

// ─── Hard Delete (Cascade) ────────────────────────────────────────────────────

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

  console.log(`[hardDeleteVideo] Eliminando: ${title} (${videoId})`);

  // 1. Eliminar portada de Firebase Storage
  if (cover_url && cover_url.includes('firebasestorage.googleapis.com')) {
    try {
      await deleteObject(ref(storage, cover_url));
      console.log('[hardDeleteVideo] ✅ Portada eliminada de Storage');
    } catch (err: any) {
      errors.push(`Storage cover: ${err?.message || err}`);
    }
  }

  // 2. Eliminar video de Firebase Storage (si aplica)
  if (video_url && video_url.includes('firebasestorage.googleapis.com')) {
    try {
      await deleteObject(ref(storage, video_url));
      console.log('[hardDeleteVideo] ✅ Video eliminado de Firebase Storage');
    } catch (err: any) {
      errors.push(`Storage video: ${err?.message || err}`);
    }
  }

  // 3. Eliminar de Supabase Storage (si aplica)
  if (video_url && video_url.includes('supabase.co')) {
    try {
      const ok = await deleteVideo(video_url);
      if (ok) {
        console.log('[hardDeleteVideo] ✅ Video eliminado de Supabase Storage');
      } else {
        errors.push('Supabase Storage: no se pudo eliminar');
      }
    } catch (err: any) {
      errors.push(`Supabase: ${err?.message || err}`);
    }
  }

  // 4. Registrar en ban-list
  try {
    await addDoc(collection(db, 'rejected_videos'), {
      originalId: videoId,
      video_url: video_url || null,
      title,
      rejectedBy: adminId,
      rejectedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    errors.push(`Ban-list: ${err?.message || err}`);
  }

  // 5. Eliminar documento de Firestore (punto de no retorno)
  try {
    await deleteDoc(doc(db, 'workout_videos', videoId));
    console.log('[hardDeleteVideo] ✅ Documento eliminado de Firestore');
  } catch (err: any) {
    errors.push(`Firestore: ${err?.message || err}`);
    return { success: false, errors };
  }

  return { success: true, errors };
}

// ─── Approve Video with Audit ─────────────────────────────────────────────────

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
    isApproved: true,
    auditLog: [auditEntry],
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

export async function importLyftaVideo(
  sourceUrl: string,
  metadata: LyftaVideoMetadata,
  uploadedBy: string
): Promise<string> {
  const bannedQ = query(collection(db, 'rejected_videos'), where('video_url', '==', sourceUrl));
  const bannedSnap = await getDocs(bannedQ);
  if (!bannedSnap.empty) {
    throw new Error('Este video fue rechazado previamente y no puede volver a importarse.');
  }

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

export async function syncVideoStatus(
  videoId: string,
  status: 'approved' | 'pending',
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, 'workout_videos', videoId), {
    status,
    isApproved: status === 'approved',
    auditLog: [
      {
        action: status === 'approved' ? 'approved' : 'uploaded',
        adminId,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
