/**
 * VideoUploader.tsx — Componente reutilizable de subida de video GPTE
 * 
 * Features:
 * - Drag & drop o click para seleccionar
 * - Preview del video antes de confirmar
 * - Barra de progreso durante la subida
 * - Modal de confirmación
 * - Validación de duración máxima
 * - Callback onUploaded(url) al completar
 */

import React, { useRef, useState } from 'react';
import { Upload, X, Check, Loader2, Video, AlertTriangle } from 'lucide-react';
import { uploadVideo } from '../lib/videoService';

interface VideoUploaderProps {
  /** Se llama con la URL pública cuando el video fue subido exitosamente */
  onUploaded: (url: string) => void;
  /** Bucket de Supabase Storage donde guardar el video */
  bucket: string;
  /** Prefijo del path dentro del bucket (ej: "combo-refs/combo123") */
  pathPrefix: string;
  /** Duración máxima en segundos (default: 300 = 5 min) */
  maxDurationSec?: number;
  /** Texto del botón/label (default: "Subir Video") */
  label?: string;
  /** Si true, muestra el botón compacto en lugar del área drag&drop */
  compact?: boolean;
}

export function VideoUploader({
  onUploaded,
  bucket,
  pathPrefix,
  maxDurationSec = 300,
  label = 'Subir Video',
  compact = false,
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    setError(null);

    if (!file.type.startsWith('video/')) {
      setError('Solo se permiten archivos de video (mp4, mov, webm).');
      return;
    }

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > maxDurationSec) {
        setError(`El video supera el límite de ${Math.floor(maxDurationSec / 60)} minutos.`);
        return;
      }
      // Mostrar preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setSelectedFile(file);
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const fileName = `${pathPrefix}_${Date.now()}.mp4`;
      const url = await uploadVideo({
        file: selectedFile,
        bucket,
        path: fileName,
        onProgress: setProgress,
      });
      onUploaded(url);
      handleCancel();
    } catch (err: any) {
      setError(err.message || 'Error al subir. Inténtalo de nuevo.');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return (
    <>
      {/* Trigger button / drop zone */}
      {!previewUrl && (
        compact ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-xl font-bold text-sm hover:bg-primary/30 transition-all"
          >
            <Upload className="w-4 h-4" />
            {label}
          </button>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all
              ${dragOver
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : 'border-slate-600 hover:border-primary/60 hover:bg-slate-800/50'}
            `}
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Video className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-white text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-1">
                Arrastra o haz clic · MP4, MOV, WEBM · Máx {Math.floor(maxDurationSec / 60)} min
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <Upload className="w-3 h-3" />
              Seleccionar archivo
            </div>
          </div>
        )
      )}

      {/* Error inline */}
      {error && !previewUrl && (
        <div className="flex items-center gap-2 mt-2 p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Modal de Preview + Confirmación */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-base">Vista Previa del Video</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Revisa el video antes de subirlo
                </p>
              </div>
              {!uploading && (
                <button onClick={handleCancel} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>

            {/* Video Preview */}
            <div className="bg-black">
              <video
                src={previewUrl}
                controls
                autoPlay
                playsInline
                className="w-full max-h-72 object-contain"
              />
            </div>

            {/* Info del archivo */}
            {selectedFile && (
              <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="px-5 py-3 border-b border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-bold">Subiendo...</span>
                  <span className="font-black text-primary">{progress}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-orange-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error en upload */}
            {error && (
              <div className="px-5 py-3 flex items-center gap-2 text-red-400 text-sm border-b border-red-900/50 bg-red-950/30">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="p-4 flex gap-3">
              <button
                onClick={handleCancel}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                {uploading ? 'Cancelar' : 'Elegir otro'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={uploading}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar y Subir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
