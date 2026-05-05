/**
 * videoService.ts - Servicio de video GPTE via Supabase Storage
 * Reemplaza Google Drive. Sin OAuth, URLs directas, gratis hasta 1GB.
 */

import { supabase } from './supabase';

export interface UploadVideoOptions {
    file: File;
    bucket: string;
    path: string;
    onProgress?: (pct: number) => void;
}

export async function uploadVideo({
    file,
    bucket,
    path,
    onProgress,
}: UploadVideoOptions): Promise<string> {
    if (!supabase) {
          throw new Error('Supabase no esta configurado. Agrega VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

  onProgress?.(10);

  const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
              cacheControl: '3600',
              upsert: true,
      });

  if (error) {
        throw new Error('Error al subir video: ' + error.message);
  }

  onProgress?.(90);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  onProgress?.(100);

  return urlData.publicUrl;
}

export async function deleteVideo(publicUrl: string): Promise<boolean> {
    if (!supabase || !publicUrl) return false;

  try {
        const url = new URL(publicUrl);
        const parts = url.pathname.split('/');
        const publicIndex = parts.indexOf('public');
        if (publicIndex === -1) return false;

      const bucket = parts[publicIndex + 1];
        const filePath = parts.slice(publicIndex + 2).join('/');

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
              console.warn('[videoService] Error al eliminar video:', error.message);
              return false;
      }

      return true;
  } catch (err) {
        console.warn('[videoService] deleteVideo error:', err);
        return false;
  }
}

export async function uploadVideoToDriveCompat({
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
    const sanitizedName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return uploadVideo({
          file: video,
          bucket,
          path: sanitizedName,
          onProgress,
    });
}
