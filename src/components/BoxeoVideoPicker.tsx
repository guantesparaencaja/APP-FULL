/**
 * BoxeoVideoPicker — GPTE
 * Selector de videos para el panel admin de "Aprender Boxeo".
 * Permite elegir entre:
 *   1. "Videos de box" — carpeta de Google Drive (solo admin, listada por /api/drive-boxeo).
 *   2. Seccion "Entreno" — tabla workout_videos en Supabase.
 * Los videos JAMAS se suben a Supabase; se guarda la URL directa de Drive.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, Dumbbell, Search, X, Loader2, Check, AlertTriangle, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface PickedVideo {
  name: string;
  url: string;
  drive_file_id?: string;
}

interface BoxeoVideoPickerProps {
  value?: PickedVideo;
  onSelect: (video: PickedVideo) => void;
  onClear: () => void;
}

type SourceTab = 'drive' | 'entreno';

interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
  url: string;
}

interface EntrenoVideo {
  id: string;
  title: string;
  video_url?: string;
  category?: string;
}

const formatBytes = (b: number) => {
  if (!b) return '';
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export function BoxeoVideoPicker({ value, onSelect, onClear }: BoxeoVideoPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SourceTab>('drive');
  const [search, setSearch] = useState('');

  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [entreno, setEntreno] = useState<EntrenoVideo[]>([]);
  const [loading, setLoading] = useState<'drive' | 'entreno' | null>(null);
  const [error, setError] = useState('');

  const loadDrive = async () => {
    setLoading('drive');
    setError('');
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token || '';
      const res = await fetch('/api/drive-boxeo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al listar la carpeta de Drive');
      }
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los videos de Drive');
    } finally {
      setLoading(null);
    }
  };

  const loadEntreno = async () => {
    setLoading('entreno');
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('workout_videos')
        .select('id,title,video_url,category_id')
        .not('video_url', 'is', null)
        .not('video_url', 'eq', '')
        .order('title');
      if (err) throw new Error(err.message);
      setEntreno((data || []) as EntrenoVideo[]);
    } catch (e: any) {
      setError(e?.message || 'No se pudieron cargar los videos de Entreno');
    } finally {
      setLoading(null);
    }
  };

  const openPicker = async () => {
    setOpen(true);
    setTab(driveFiles.length ? 'drive' : 'entreno');
    if (driveFiles.length === 0) loadDrive();
    if (entreno.length === 0) loadEntreno();
  };

  const switchTab = (t: SourceTab) => {
    setTab(t);
    setSearch('');
    if (t === 'drive' && driveFiles.length === 0) loadDrive();
    if (t === 'entreno' && entreno.length === 0) loadEntreno();
  };

  const filteredDrive = driveFiles.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredEntreno = entreno.filter((e) => !search || (e.title || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 flex items-center gap-2 justify-between"
        >
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <Play className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate font-bold text-white">{value.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-slate-500">
              <FolderOpen className="w-4 h-4 shrink-0" />
              Elegir video...
            </span>
          )}
          <ChevronIcon />
        </button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Quitar video"
            className="bg-slate-800/80 text-slate-400 p-3 rounded-xl border border-slate-700 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-900 rounded-t-3xl w-full max-h-[85vh] flex flex-col border border-slate-800"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
                <h3 className="text-lg font-black text-white uppercase">Seleccionar Video</h3>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="p-2 rounded-full hover:bg-slate-800 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 px-5 py-3">
                <button
                  type="button"
                  onClick={() => switchTab('drive')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    tab === 'drive' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" /> Videos de Box
                </button>
                <button
                  type="button"
                  onClick={() => switchTab('entreno')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    tab === 'entreno' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" /> Entreno
                </button>
              </div>

              {/* Search */}
              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={tab === 'drive' ? 'Buscar en Videos de Box...' : 'Buscar en Entreno...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-5 pb-5 hide-scrollbar">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
                    <p className="text-slate-400 text-sm font-bold">{error}</p>
                  </div>
                ) : tab === 'drive' ? (
                  filteredDrive.length === 0 ? (
                    <EmptyState text="No hay videos en esta carpeta de Drive" />
                  ) : (
                    <div className="space-y-2">
                      {filteredDrive.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            onSelect({ name: f.name, url: f.url, drive_file_id: f.id });
                            setOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Play className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{f.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{formatBytes(f.size)}</p>
                          </div>
                          {value?.drive_file_id === f.id && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  filteredEntreno.length === 0 ? (
                    <EmptyState text="No hay videos en la seccion Entreno" />
                  ) : (
                    <div className="space-y-2">
                      {filteredEntreno.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            onSelect({ name: e.title, url: e.video_url || '', drive_file_id: undefined });
                            setOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{e.title}</p>
                            <p className="text-[10px] text-slate-500 font-bold truncate">{e.video_url}</p>
                          </div>
                          {value?.url === e.video_url && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 text-sm font-bold">{text}</p>
    </div>
  );
}