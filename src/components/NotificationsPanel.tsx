import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, CheckCircle2, Info, AlertCircle, Trash2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'community';
  read: boolean;
  created_at: any;
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const user = useStore((s) => s.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', String(user.id)),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification));
    });

    return () => unsub();
  }, [user, isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const markAllAsRead = async () => {
    notifications.filter((n) => !n.read).forEach((n) => markAsRead(n.id));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 dark:border-slate-800"
        >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                  Notificaciones
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                  Tu actividad reciente
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                title="Marcar todas como leídas"
              >
                Leído
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:scale-110 transition-transform"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 opacity-30">
                <Bell className="w-16 h-16" />
                <p className="font-black uppercase tracking-[0.2em] text-xs text-center">
                  No tienes notificaciones aún
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`p-5 rounded-3xl border transition-all relative group ${
                    n.read
                      ? 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800'
                      : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
                  }`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="flex gap-4">
                    <div
                      className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        n.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : n.type === 'error'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : n.type === 'community'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                      }`}
                    >
                      {n.type === 'success' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : n.type === 'error' ? (
                        <AlertCircle className="w-6 h-6" />
                      ) : n.type === 'community' ? (
                        <MessageSquare className="w-6 h-6" />
                      ) : (
                        <Info className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white truncate pr-4">
                          {n.title}
                        </h4>
                        {!n.read && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-3">
                        {n.message}
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                        {n.created_at?.toMillis
                          ? format(n.created_at.toMillis(), "d 'de' MMMM, HH:mm", { locale: es })
                          : 'Recién'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/50">
            <p className="text-[10px] text-center font-black text-slate-400 uppercase tracking-[0.3em]">
              Academia Guantes Para Encajar
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
