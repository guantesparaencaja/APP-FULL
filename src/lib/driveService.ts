/**
 * GPTE Drive Service v4.0 — Google Drive Embed + Supabase Storage
 * 
 * Videos de referencia: Google Drive del admin.
 * Funciones de soporte: Supabase Storage.
 */

import { supabase } from './supabase';
import { AuditEntry } from '../types/workout.types';
import { uploadVideo, deleteVideo } from './videoService';

// ─── Google Drive URL Helpers ─────────────────────────────────────────────────

/**
 * Convierte una URL de Google Drive en una URL embebible (iframe-friendly).
 * 
 * Soporta:
 *   - https://drive.google.com/file/d/{ID}/view?usp=sharing
 *   - https://drive.google.com/open?id={ID}
 *   - https://drive.google.com/uc?id={ID}&export=view
 * 
 * Retorna: https://drive.google.com/file/d/{ID}/preview
 */
export function getDriveEmbedUrl(driveUrl: string): string {
  if (!driveUrl) return '';

  // Extract file ID from various Google Drive URL formats
  let fileId = '';

  // Format 1: /file/d/{ID}/
  const fileDMatch = driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) {
    fileId = fileDMatch[1];
  }

  // Format 2: ?id={ID} or &id={ID}
  if (!fileId) {
    const idMatch = driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  // Format 3: /open?id={ID}
  if (!fileId) {
    const openMatch = driveUrl.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      fileId = openMatch[1];
    }
  }

  // If already a preview URL, return as-is
  if (driveUrl.includes('/preview') && fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  if (!fileId) {
    // Not a Drive URL — return as-is (likely a direct video URL)
    return driveUrl;
  }

  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Extrae el thumbnail de un video de Google Drive.
 */
export function getDriveThumbnail(driveUrl: string): string {
  const embedUrl = getDriveEmbedUrl(driveUrl);
  if (embedUrl.includes('drive.google.com')) {
    const fileIdMatch = embedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w400`;
    }
  }
  return '';
}

/**
 * Detecta si una URL es de Google Drive.
 */
export function isDriveUrl(url: string): boolean {
  return url.includes('drive.google.com') || url.includes('docs.google.com');
}

// ─── Upload Video (Supabase Storage — para uso admin puntual) ─────────────────

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


  // 1. Eliminar portada de Firebase Storage (Legacy - Ignorado)
  if (cover_url && cover_url.includes('firebasestorage.googleapis.com')) {
  }

  // 2. Eliminar video de Firebase Storage (Legacy - Ignorado)
  if (video_url && video_url.includes('firebasestorage.googleapis.com')) {
  }

  // 3. Eliminar de Supabase Storage (si aplica)
  if (video_url && video_url.includes('supabase.co')) {
    try {
      const ok = await deleteVideo(video_url);
      if (ok) {
      } else {
        errors.push('Supabase Storage: no se pudo eliminar');
      }
    } catch (err: any) {
      errors.push(`Supabase: ${err?.message || err}`);
    }
  }

  // 4. Registrar en ban-list
  try {
    const { error } = await supabase.from('rejected_videos').insert({
      original_id: videoId,
      video_url: video_url || null,
      title,
      rejected_by: adminId,
      rejected_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (err: any) {
    errors.push(`Ban-list: ${err?.message || err}`);
  }

  // 5. Eliminar documento de Supabase (punto de no retorno)
  try {
    const { error } = await supabase.from('workout_videos').delete().eq('id', videoId);
    if (error) throw error;
  } catch (err: any) {
    errors.push(`Supabase delete: ${err?.message || err}`);
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

  const { error } = await supabase
    .from('workout_videos')
    .update({
      status: 'approved',
      is_approved: true,
      audit_log: [auditEntry],
    })
    .eq('id', videoId);

  if (error) throw error;
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
  // Check banned
  const { data: bannedData } = await supabase
    .from('rejected_videos')
    .select('id')
    .eq('video_url', sourceUrl);

  if (bannedData && bannedData.length > 0) {
    throw new Error('Este video fue rechazado previamente y no puede volver a importarse.');
  }

  // Check duplicate
  const { data: dupData } = await supabase
    .from('workout_videos')
    .select('id')
    .eq('video_url', sourceUrl);

  if (dupData && dupData.length > 0) {
    throw new Error('Este video ya existe en la biblioteca.');
  }

  const { data, error } = await supabase
    .from('workout_videos')
    .insert({
      ...metadata,
      video_url: sourceUrl,
      source_url: sourceUrl,
      status: 'pending',
      is_approved: false,
      created_at: new Date().toISOString(),
      created_by: uploadedBy,
      audit_log: [
        {
          action: 'uploaded',
          adminId: uploadedBy,
          timestamp: new Date().toISOString(),
          notes: 'Importado desde Lyfta',
        } as AuditEntry,
      ],
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// ─── Sync Status ──────────────────────────────────────────────────────────────

export async function syncVideoStatus(
  videoId: string,
  status: 'approved' | 'pending',
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from('workout_videos')
    .update({
      status,
      is_approved: status === 'approved',
      audit_log: [
        {
          action: status === 'approved' ? 'approved' : 'uploaded',
          adminId,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    .eq('id', videoId);

  if (error) throw error;
}
