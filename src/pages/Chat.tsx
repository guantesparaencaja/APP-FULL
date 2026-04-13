import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, User } from '../store/useStore';
import { db } from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Shield,
  Clock,
  Users,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Helper: format timestamp as "Lun 14 Abr • 03:45 PM" ───────────────────
function formatMessageDate(ts: any): string {
  if (!ts) return '...';
  let date: Date;
  if (ts?.toDate) {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }
  if (isNaN(date.getTime())) return '...';

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayName = dayNames[date.getDay()];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;

  return `${dayName} ${day} ${month} • ${h12}:${minutes} ${ampm}`;
}

// ── Helper: group messages by date ────────────────────────────────────────
function getDateLabel(ts: any): string {
  if (!ts) return '';
  let date: Date;
  if (ts?.toDate) date = ts.toDate();
  else if (ts instanceof Date) date = ts;
  else date = new Date(ts);
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

export function Chat() {
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com';

  // ── Load students list (admin only) ─────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('role', '!=', 'admin'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as User);
      setStudents(all);
    });
    return () => unsub();
  }, [isAdmin]);

  // ── Messages subscription — solo últimos 7 días ──────────────────────────
  useEffect(() => {
    if (!user) return;
    const chatId = isAdmin ? (selectedStudentId || 'admin_support') : String(user.id);
    if (!chatId) return;

    // Filtrar mensajes de los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('createdAt', '>=', sevenDaysAgoTimestamp),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [user, selectedStudentId, isAdmin]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const chatId = isAdmin ? (selectedStudentId || 'admin_support') : String(user.id);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage.trim(),
        sender_id: user.id,
        sender_name: user.name,
        role: user.role,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // ── Group messages by day label ──────────────────────────────────────────
  const grouped: { label: string; msgs: any[] }[] = [];
  let lastLabel = '';
  messages.forEach((msg) => {
    const label = getDateLabel(msg.createdAt);
    if (label !== lastLabel) {
      grouped.push({ label, msgs: [] });
      lastLabel = label;
    }
    grouped[grouped.length - 1]?.msgs.push(msg);
  });

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-10rem)] bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl"
    >
      {/* ── Header ── */}
      <header className="px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/5 border-b border-white/10 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight italic text-white">
              {isAdmin && selectedStudentId
                ? students.find(s => s.id === selectedStudentId)?.name
                : 'Coach GPTE'}
            </h1>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">En línea</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 7-day notice badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 rounded-xl border border-white/5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Últimos 7 días
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        </div>
      </header>

      {/* ── Admin: student selector ── */}
      {isAdmin && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-white/5 flex items-center gap-3 shrink-0">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedStudentId || ''}
            onChange={e => { setSelectedStudentId(e.target.value || null); setMessages([]); }}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary transition-all font-bold"
          >
            <option value="" disabled>Selecciona un estudiante</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 flex flex-col custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
            <MessageSquare className="w-16 h-16 mb-4 text-white" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Inicia la conversación
            </p>
            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">
              Los mensajes se conservan 7 días
            </p>
          </div>
        )}

        {grouped.map((group, gi) => (
          <div key={gi} className="space-y-3">
            {/* Date separator */}
            {group.label && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            )}

            {/* Messages in this group */}
            {group.msgs.map((msg, idx) => {
              const isMe = msg.sender_id === user.id;
              return (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender name (other person only) */}
                  {!isMe && (
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-2">
                      {msg.sender_name || 'Coach'}
                    </span>
                  )}

                  <div
                    className={`max-w-[85%] px-4 sm:px-5 py-3 sm:py-4 rounded-4xl shadow-xl border backdrop-blur-md ${
                      isMe
                        ? 'bg-primary text-white border-primary/30 rounded-tr-lg'
                        : 'bg-white/5 border-white/10 text-white rounded-tl-lg'
                    }`}
                  >
                    <p className="text-sm font-medium leading-relaxed">{msg.text}</p>

                    {/* Timestamp: full date + time */}
                    <div className="flex items-center justify-end gap-1 mt-1.5 opacity-50">
                      <Clock className="w-2.5 h-2.5" />
                      <span className="text-[9px] font-bold">
                        {formatMessageDate(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* ── Input area ── */}
      <div className="p-4 sm:p-6 bg-white/5 border-t border-white/10 backdrop-blur-xl shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-3 bg-slate-950 p-2 rounded-4xl border border-white/10 shadow-2xl"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent text-sm font-bold placeholder:text-slate-600 outline-none px-4 text-white"
            maxLength={500}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={!newMessage.trim() || isSending}
            className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 disabled:opacity-50 disabled:grayscale transition-all"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
