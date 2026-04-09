import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, User } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, setDoc, limit } from 'firebase/firestore';
import { ArrowLeft, Send, MessageSquare, Shield, Clock, Camera, User as UserIcon, Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Chat() {
  const user = useStore((state) => state.user);
  const isAdmin = user?.role === 'admin' || user?.email === 'hernandezkevin001998@gmail.com';
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch student list (Admin only)
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'), where('role', '!=', 'admin'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setStudents(users);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch last messages for each student (Admin preview)
  useEffect(() => {
    if (!isAdmin || students.length === 0) return;

    const unsubs = students.map(student => {
      const q = query(
        collection(db, 'chats', String(student.id), 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      return onSnapshot(q, (snap) => {
        if (!snap.empty) {
          setLastMessages(prev => ({
            ...prev,
            [student.id]: snap.docs[0].data()
          }));
        }
      });
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [isAdmin, students]);

  // Messages Subscription
  useEffect(() => {
    if (!user) return;

    // Determine target chat room
    const targetId = isAdmin 
      ? (selectedStudent ? selectedStudent.id : null)
      : user.id;

    if (!targetId) {
      setMessages([]);
      return;
    }
    
    const q = query(
      collection(db, 'chats', String(targetId), 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [user, isAdmin, selectedStudent]);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const targetId = isAdmin 
      ? (selectedStudent ? selectedStudent.id : null)
      : user.id;

    if (!targetId) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'chats', String(targetId), 'messages'), {
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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
      {/* Sidebar: Student List (Admin only) */}
      {isAdmin && (
        <div className={`w-full md:w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col transition-all ${selectedStudent ? "hidden md:flex" : "flex"}`}>
          <div className="p-6 border-b border-slate-800 space-y-4">
            <h2 className="text-xl font-black uppercase italic text-white tracking-tight">Estudiantes</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar estudiante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredStudents.length === 0 ? (
              <div className="py-10 text-center opacity-30">
                <p className="text-xs font-bold uppercase">No hay resultados</p>
              </div>
            ) : (
              filteredStudents.map(s => {
                const lastMsg = lastMessages[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${selectedStudent?.id === s.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-slate-800/50 text-slate-400"}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {s.profile_pic ? (
                        <img src={s.profile_pic} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-black uppercase italic text-sm truncate ${selectedStudent?.id === s.id ? "text-white" : "text-slate-200"}`}>
                        {s.name}
                      </p>
                      <p className="text-[10px] opacity-60 truncate">
                        {lastMsg ? lastMsg.text : 'Sin mensajes'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-30 group-hover:translate-x-1 transition-transform" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-950 relative ${isAdmin && !selectedStudent ? "hidden md:flex" : "flex"}`}>
        {isAdmin && !selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-20">
            <MessageSquare className="w-20 h-20 mb-6" />
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Selecciona un chat</h3>
            <p className="text-sm font-bold uppercase tracking-widest mt-2">Para comenzar a asesorar a tus alumnos</p>
          </div>
        ) : (
          <>
            <header className="px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/5 border-b border-white/10 z-10">
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <button onClick={() => setSelectedStudent(null)} className="md:hidden p-2 bg-white/5 rounded-xl border border-white/10 text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                {!isAdmin && (
                  <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h1 className="text-lg font-black uppercase tracking-tight italic text-white">
                    {isAdmin ? selectedStudent?.name : "Coach GPTE"}
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

            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                  <MessageSquare className="w-16 h-16 mb-4 text-white" />
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
                    {isAdmin ? "Envía un mensaje para iniciar la asesoría" : "Escribe tu primera duda al Coach"}
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
                    <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] shadow-xl border backdrop-blur-md ${isMe ? 'bg-primary text-white border-primary-light/30 rounded-tr-none' : 'bg-white/5 border-white/10 text-white rounded-tl-none'}`}>
                      {!isMe && isAdmin && (
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">Estudiante</p>
                      )}
                      {!isMe && !isAdmin && (
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1.5">Coach</p>
                      )}
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-2 opacity-50">
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-bold">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <div className="p-6 bg-white/5 border-t border-white/10 backdrop-blur-xl">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-950 p-2 rounded-[2rem] border border-white/10 shadow-2xl">
                <button type="button" className="p-3 text-slate-500 hover:text-primary transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-transparent text-sm font-bold placeholder:text-slate-600 outline-none px-2 text-white"
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
          </>
        )}
      </div>
    </div>
  );
}
