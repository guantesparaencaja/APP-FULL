/**
 * GPTE Drive Service v3.0 - Migrado a Supabase Storage
 * uploadVideoToDrive ahora usa Supabase Storage (sin OAuth).
 */

import { db, storage } from './firebase';
import {
    doc, updateDoc, deleteDoc, addDoc, collection,
    getDocs, query, where,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { AuditEntry } from '../types/workout.types';
import { uploadVideo, deleteVideo } from './videoService';

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

export async function deleteVideoFromDrive(videoUrl: string): Promise<boolean> {
    if (!videoUrl) return false;
    if (videoUrl.includes('supabase.co')) {
          return deleteVideo(videoUrl);
    }
    console.warn('[driveService] Video de Drive legacy - no se puede eliminar sin OAuth:', videoUrl);
    return false;
}

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
    const { video_url, cover_url, title = 'Sin titulo', adminId = 'system' } = videoData;

  if (cover_url && cover_url.includes('firebasestorage.googleapis.com')) {
        try { await deleteObject(ref(storage, cover_url)); } catch (err: any) { errors.push(`Storage cover: ${err?.message}`); }
  }

  if (video_url && video_url.includes('firebasestorage.googleapis.com')) {
        try { await deleteObject(ref(storage, video_url)); } catch (err: any) { errors.push(`Storage video: ${err?.message}`); }
  }

  if (video_url && video_url.includes('supabase.co')) {
        try {
                const ok = await deleteVideo(video_url);
                if (!ok) errors.push('Supabase Storage: no se pudo eliminar');
        } catch (err: any) { errors.push(`Supabase: ${err?.message}`); }
  }

  try {
        await addDoc(collection(db, 'rejected_videos'), {
                originalId: videoId, video_url: video_url || null, title,
                rejectedBy: adminId, rejectedAt: new Date().toISOString(),
        });
  } catch (err: any) { errors.push(`Ban-list: ${err?.message}`); }

  try {
        await deleteDoc(doc(db, 'workout_videos', videoId));
  } catch (err: any) {
        errors.push(`Firestore: ${err?.message}`);
        return { success: false, errors };
  }

  return { success: true, errors };
}

export async function approveVideoWithAudit(videoId: string, adminId: string, adminName?: string): Promise<void> {
    const auditEntry: AuditEntry = { action: 'approved', adminId, adminName: adminName || adminId, timestamp: new Date().toISOString() };
    await updateDoc(doc(db, 'workout_videos', videoId), { status: 'approved', isApproved: true, auditLog: [auditEntry] });
}

export interface LyftaVideoMetadata {
    title: string; categoryId: string; muscleGroups?: string[]; difficulty?: string;
    equipment?: string; objetivo?: string; tipo?: string; description?: string; tags?: string[];
}

export async function importLyftaVideo(sourceUrl: string, metadata: LyftaVideoMetadata, uploadedBy: string): Promise<string> {
    const bannedSnap = await getDocs(query(collection(db, 'rejected_videos'), where('video_url', '==', sourceUrl)));
    if (!bannedSnap.empty) throw new Error('Este video fue rechazado previamente.');
    const dupSnap = await getDocs(query(collection(db, 'workout_videos'), where('video_url', '==', sourceUrl)));
    if (!dupSnap.empty) throw new Error('Este video ya existe en la biblioteca.');
    const docRef = await addDoc(collection(db, 'workout_videos'), {
          ...metadata, video_url: sourceUrl, sourceUrl, status: 'pending', isApproved: false,
          createdAt: new Date().toISOString(), createdBy: uploadedBy,
          auditLog: [{ action: 'uploaded', adminId: uploadedBy, timestamp: new Date().toISOString(), notes: 'Importado desde Lyfta' }],
    });
    return docRef.id;
}

export async function syncVideoStatus(videoId: string, status: 'approved' | 'pending', adminId: string): Promise<void> {
    await updateDoc(doc(db, 'workout_videos', videoId), {
          status, isApproved: status === 'approved',
          auditLog: [{ action: status === 'approved' ? 'approved' : 'uploaded', adminId, timestamp: new Date().toISOString() }],
    });
}
