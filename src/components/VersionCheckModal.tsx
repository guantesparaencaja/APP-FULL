import React from 'react';
import { Download, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VersionCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  newVersion: string;
  downloadUrl?: string;
}

export function VersionCheckModal({
  isOpen,
  onClose,
  newVersion,
  downloadUrl,
}: VersionCheckModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center border border-primary/20 mx-auto mb-6">
            <Download className="w-10 h-10 text-primary" />
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">
            Nueva Versión
          </h3>
          <p className="text-sm text-slate-500 font-bold mb-6 uppercase tracking-widest">
            Versión {newVersion} disponible
          </p>

          <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            Hay una actualización disponible con mejoras y nuevas funciones. ¡Descárgala ahora para
            mantener tu app al día!
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (downloadUrl) {
                  window.open(downloadUrl, '_blank');
                } else {
                  alert('El enlace de descarga no está disponible. Contacta a soporte.');
                }
              }}
              className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Descargar Ahora
            </button>

            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Más Tarde
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-center gap-2 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Recomendado</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
