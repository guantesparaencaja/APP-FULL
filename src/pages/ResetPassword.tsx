import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResetLink, setIsResetLink] = useState(false);
  const [resetLinkReady, setResetLinkReady] = useState(false);

  // Check if this is a Supabase reset link (has #access_token in hash)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setIsResetLink(true);
      setResetLinkReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      if (isResetLink) {
        // Supabase reset link: the token is already in the URL hash,
        // updateUser will use it automatically
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);
      } else {
        // Forced password change (must_change_password flag)
        if (!user) {
          setError('No hay sesión activa. Inicia sesión primero.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw new Error(error.message);

        // Clear must_change_password flag
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);

        // Mark any pending reset requests as completed
        await supabase
          .from('password_reset_requests')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('status', 'pending');

        // Update local user state
        setUser({ ...user, must_change_password: false } as any);
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2500);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased">
      <div className="flex items-center bg-transparent p-4 z-10">
        <div
          className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-8 h-8" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center pt-8 pb-4 px-6 flex-1"
      >
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20 shadow-inner">
          <ShieldAlert className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="text-slate-100 tracking-tight text-2xl font-bold text-center mb-2">
          {isResetLink ? 'Restablecer Contraseña' : 'Cambiar Contraseña Obligatorio'}
        </h1>
        <p className="text-slate-400 text-sm text-center max-w-xs mb-8">
          {isResetLink
            ? 'Ingresa tu nueva contraseña para completar el proceso de recuperación.'
            : 'Debes cambiar tu contraseña temporal antes de continuar. Ingresa una nueva contraseña segura.'}
        </p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-bold text-lg">Contraseña actualizada</p>
            <p className="text-slate-400 text-sm">Redirigiendo al inicio...</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
            {error && (
              <p className="text-red-400 text-sm text-center font-bold bg-red-500/10 rounded-xl py-2 px-4">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800/30 border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 pr-10 text-slate-100 transition-all"
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800/30 border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 pr-10 text-slate-100 transition-all"
                  placeholder="Repite tu nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.97 }}
              className="mt-4 w-full bg-primary text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 neon-glow disabled:opacity-60 btn-press"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>GUARDAR NUEVA CONTRASEÑA</span>
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
