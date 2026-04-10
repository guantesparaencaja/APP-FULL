import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, MessageCircle, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export function PaymentReview() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[3rem] p-10 max-w-md w-full border-white/20 dark:border-slate-800/50 shadow-2xl"
      >
        <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-amber-500/20 shadow-inner">
          <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
        </div>

        <h1 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-4">
          Pago en <span className="text-primary">Revisión</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-8">
          Tu comprobante de pago está siendo verificado por nuestro equipo. Este proceso suele
          tardar menos de 24 horas.
        </p>

        <div className="space-y-4">
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="https://wa.me/573022028477"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-emerald-500 text-white font-black uppercase italic py-5 rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all tracking-widest text-sm"
          >
            <MessageCircle className="w-5 h-5" />
            Contactar Soporte
          </motion.a>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/profile')}
            className="w-full flex items-center justify-center gap-3 bg-white/10 dark:bg-slate-900/10 backdrop-blur-xl text-slate-900 dark:text-white font-black uppercase italic py-5 rounded-2xl border border-white/20 dark:border-slate-800/50 transition-all tracking-widest text-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Ir a mi Perfil
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 text-red-500 font-black uppercase italic py-4 transition-all tracking-widest text-xs opacity-60 hover:opacity-100"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </motion.button>
        </div>
      </motion.div>

      <div className="mt-12 flex items-center gap-3">
        <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">
          Guantes Boxing Club • Decisao
        </p>
      </div>
    </div>
  );
}
