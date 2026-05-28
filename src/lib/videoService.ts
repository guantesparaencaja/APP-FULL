/**
 * videoService.ts — Servicio de video GPTE via Supabase Storage
 * Reemplaza Google Drive. Sin OAuth, URLs directas, gratis hasta 1GB.
 */

import { supabase } from './supabase';

export interface UploadVideoOptions {
  file: File;
  bucket: string;
  path: string;
  onProgress?: (pct: number) => void;
}

/**
 * Sube un video a Supabase Storage y devuelve la URL pública directa.
 * Compatible con la firma de uploadVideoToDrive para facilitar la migración.
 */
export async function uploadVideo({
  file,
  bucket,
  path,
  onProgress,
}: UploadVideoOptions): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  if (!supabase || !supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('Supabase no está configurado en las variables de entorno de Vercel. Por favor, agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en la configuración de Vercel.');
  }

  // Simular progreso al 10% para dar feedback inmediato
  onProgress?.(10);

  let uploadResult;
  try {
    uploadResult = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
  } catch (fetchErr: any) {
    throw new Error('Failed to fetch. Por favor, asegúrate de haber configurado VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel, y de que el bucket \'gpte-videos\' existe y es público en Supabase Storage.');
  }

  const { data, error } = uploadResult;

  if (error) {
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error('Failed to fetch. Asegúrate de que el bucket \'gpte-videos\' existe y tiene políticas públicas de subida en Supabase.');
    }
    throw new Error('Error al subir video: ' + error.message);
  }

  onProgress?.(90);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  onProgress?.(100);

  return urlData.publicUrl;
}

/**
 * Elimina un video de Supabase Storage dado su URL pública.
 */
export async function deleteVideo(publicUrl: string): Promise<boolean> {
  if (!supabase || !publicUrl) return false;

  try {
    // Extraer bucket y path de la URL pública de Supabase
    // Formato: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
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

/**
 * Wrapper de compatibilidad: misma firma que uploadVideoToDrive.
 * Permite migrar gradualmente sin cambiar todos los call sites.
 */
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
    path: `${sanitizedName}`,
    onProgress,
  });
}
