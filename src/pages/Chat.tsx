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
} from 'firebase/firestore';
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  // Cargar lista de estudiantes si es admin
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('role', '!=', 'admin'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }) as User);
      setStudents(all);
    });
    return () => unsub();
  }, [isAdmin]);

  // Messages Subscription
  useEffect(() => {
    if (!user) return;
    
    // Admin habla con el estudiante seleccionado; estudiante habla con su propia sala
    const chatId = isAdmin ? (selectedStudentId || 'admin_support') : String(user.id);
    
    if (!chatId) return;

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [user, selectedStudentId, isAdmin]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setIsSending(true);
    try {
      const chatId = isAdmin ? (selectedStudentId || 'admin_support') : String(user.id);
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: newMessage,
        sender_id: user.id,
        sender_name: user.name,
        role: user.role,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-10rem)] bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl"
    >
      <header className="px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/5 border-b border-white/10 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight italic text-white">
              {isAdmin && selectedStudentId ? students.find(s => s.id === selectedStudentId)?.name : 'Coach GPTE'}
            </h1>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">En línea</p>
            </div>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
          <Shield className="w-5 h-5 text-primary" />
        </div>
      </header>

      {/* Admin: selector de estudiante */}
      {isAdmin && (
        <div className="px-4 py-2 bg-slate-900/60 border-b border-white/5 flex items-center gap-3">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedStudentId || ''}
            onChange={e => { setSelectedStudentId(e.target.value); setMessages([]); }}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-primary transition-all font-bold"
          >
            <option value="" disabled>Selecciona un estudiante</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
            <MessageSquare className="w-16 h-16 mb-4 text-white" />
            <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Inicia la conversación
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === user.id;
          return (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-6 py-4 rounded-4xl shadow-xl border backdrop-blur-md ${isMe ? 'bg-primary text-white border-primary-light/30 rounded-tr-none' : 'bg-white/5 border-white/10 text-white rounded-tl-none'}`}
              >
                <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-end gap-1.5 mt-2 opacity-50">
                  <Clock className="w-3 h-3" />
                  <span className="text-[9px] font-bold">
                    {msg.createdAt?.toDate
                      ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '...'}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <div className="p-6 bg-white/5 border-t border-white/10 backdrop-blur-xl">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-950 p-2 rounded-4xl border border-white/10 shadow-2xl">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent text-sm font-bold placeholder:text-slate-600 outline-none px-4 text-white"
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
