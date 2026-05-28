/**
 * GPTE Drive Service v3.0 — Migrado a Supabase Storage
 * 
 * Regla de oro: Supabase = único backend.
 */

import { supabase } from './supabase';
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

  // 1. Eliminar portada de Firebase Storage (Legacy - Ignorado)
  if (cover_url && cover_url.includes('firebasestorage.googleapis.com')) {
    console.log('[hardDeleteVideo] Cover Firebase legacy ignorado.');
  }

  // 2. Eliminar video de Firebase Storage (Legacy - Ignorado)
  if (video_url && video_url.includes('firebasestorage.googleapis.com')) {
    console.log('[hardDeleteVideo] Video Firebase legacy ignorado.');
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
    console.log('[hardDeleteVideo] ✅ Documento eliminado de Supabase');
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
