/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.tsx — Migrado a Supabase Auth.
 * Firebase completamente eliminado de este archivo.
 */

import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Saberes } from './pages/Saberes';
import { Workouts } from './pages/Workouts';
import { Calentamiento } from './pages/Calentamiento';
import { Calendar } from './pages/Calendar';
import { Profile } from './pages/Profile';
import { Store } from './pages/Store';
import { FundamentosBoxeo } from './pages/fundamentos/FundamentosBoxeo';
import { FundamentosVideoPlayer } from './pages/fundamentos/FundamentosVideoPlayer';
import { Meals } from './pages/Meals';
import { Plans } from './pages/Plans';
import { Payments } from './pages/Payments';
import { PaymentReview } from './pages/PaymentReview';
import { Timer } from './pages/Timer';
import { Chat } from './pages/Chat';
import { Recipes } from './pages/Recipes';
import { useClassReminders } from './hooks/useClassReminders';
import { useAppNotifications } from './hooks/useAppNotifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { VersionCheckModal } from './components/VersionCheckModal';
import { Capacitor } from '@capacitor/core';

// ── Supabase Auth (reemplaza Firebase) ──────────────────────────────────────
import { supabase } from './lib/supabase';
import { getProfile } from './lib/db';

const APP_VERSION = '1.0.1';

const ADMIN_EMAILS = [
  'hernandezkevin001998@gmail.com',
  'guantesparaencajar@gmail.com',
];

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const user = useStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      navigate('/');
      return;
    }

    if (user.role === 'admin') return;

    // Navigation Guards for students
    if (!user.plan_id || user.plan_status === 'none' || !user.plan_status) {
      if (pathname !== '/plans' && pathname !== '/profile') {
        navigate('/plans');
      }
    } else if (user.plan_status === 'pending_payment') {
      if (pathname !== '/payments' && pathname !== '/profile' && pathname !== '/plans') {
        navigate('/payments');
      }
    } else if (user.plan_status === 'pending_verification') {
      if (pathname !== '/payment-review' && pathname !== '/profile') {
        navigate('/payment-review');
      }
    }
  }, [user, navigate, pathname, allowedRoles]);

  return <>{children}</>;
}

export default function App() {
  const theme = useStore((state) => state.theme);
  const setUser = useStore((state) => state.setUser);
  const [loading, setLoading] = useState(true);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [newVersionInfo, setNewVersionInfo] = useState({ version: '', url: '' });
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  useClassReminders();
  useAppNotifications();

  // ── Supabase Auth Listener (reemplaza onAuthStateChanged de Firebase) ──────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const supabaseUser = session.user;
          const isAdmin = supabaseUser.email && ADMIN_EMAILS.includes(supabaseUser.email);

          try {
            // Obtener perfil desde Supabase
            let profile = await getProfile(supabaseUser.id);

            if (!profile) {
              // Crear perfil si no existe
              const { error } = await supabase.from('profiles').insert({
                id: supabaseUser.id,
                email: supabaseUser.email ?? '',
                name: supabaseUser.user_metadata?.full_name || 'Usuario',
                role: isAdmin ? 'admin' : 'student',
                lives: 3, streak: 0, license_level: 1,
                is_new_user: true, tutorial_completed: false,
                plan_status: 'none', classes_remaining: 0, xp: 0,
              });
              if (!error) profile = await getProfile(supabaseUser.id);
            } else if (isAdmin && profile.role !== 'admin') {
              // Sincronizar rol admin
              await supabase.from('profiles').update({ role: 'admin' }).eq('id', supabaseUser.id);
              profile = { ...profile, role: 'admin' };
            }

            const currentUser = useStore.getState().user;
            const newUserData = {
              id: supabaseUser.id,
              email: supabaseUser.email ?? '',
              name: profile?.name || 'Usuario',
              role: profile?.role || (isAdmin ? 'admin' : 'student'),
              lives: profile?.lives ?? 3,
              streak: profile?.streak ?? 0,
              license_level: profile?.license_level ?? 1,
              weight: profile?.weight ?? 0,
              dominant_hand: profile?.dominant_hand ?? 'Derecha',
              goal: profile?.goal ?? '',
              age: profile?.age,
              height: profile?.height,
              is_new_user: profile?.is_new_user ?? true,
              tutorial_completed: profile?.tutorial_completed ?? false,
              fitness_goal: profile?.fitness_goal as any,
              profile_pic: profile?.profile_pic,
              before_pic: profile?.before_pic,
              after_pic: profile?.after_pic,
              plan: profile?.plan,
              plan_id: profile?.plan_id,
              plan_name: profile?.plan_name,
              plan_status: profile?.plan_status as any ?? 'none',
              plan_start_date: profile?.plan_start_date,
              classes_per_month: profile?.classes_per_month ?? 0,
              classes_remaining: profile?.classes_remaining ?? 0,
              gender: profile?.gender as any,
              last_workout: profile?.last_workout,
              xp: profile?.xp ?? 0,
              created_at: profile?.created_at,
            };

            // Deep merge para no perder campos locales
            const mergedUser = currentUser
              ? {
                ...currentUser,
                ...newUserData,
                height: newUserData.height ?? currentUser.height,
                weight: newUserData.weight ?? currentUser.weight,
                dominant_hand: newUserData.dominant_hand ?? currentUser.dominant_hand,
                age: newUserData.age ?? currentUser.age,
                gender: newUserData.gender ?? currentUser.gender,
                profile_pic: newUserData.profile_pic ?? currentUser.profile_pic,
              }
              : newUserData;

            if (!currentUser || JSON.stringify(mergedUser) !== JSON.stringify(currentUser)) {
              setUser(mergedUser);
            }
          } catch (err) {
            console.error('[App] Error cargando perfil:', err);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  // ── Suscripción realtime al perfil del usuario actual ────────────────────
  useEffect(() => {
    const currentUser = useStore.getState().user;
    if (!currentUser?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` },
        (payload) => {
          const updated = payload.new as any;
          const current = useStore.getState().user;
          if (current) {
            setUser({
              ...current,
              ...updated,
              id: current.id,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [useStore.getState().user?.id, setUser]);

  // ── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (currentTheme: string) => {
      root.classList.remove('light', 'dark');
      if (currentTheme === 'system') {
        const hour = new Date().getHours();
        const isNight = hour >= 19 || hour < 6;
        const systemTheme =
          window.matchMedia('(prefers-color-scheme: dark)').matches || isNight ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(currentTheme);
      }
    };

    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // ── Offline ──────────────────────────────────────────────────────────────
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Notification banner ──────────────────────────────────────────────────
  useEffect(() => {
    if (!useStore.getState().user) return;
    const alreadyAsked = localStorage.getItem('gpte_notif_asked');
    if (alreadyAsked) return;
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    if (permission === 'default' || Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => setShowNotifBanner(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500 text-yellow-950 py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold sticky top-0 z-100 shadow-lg"
          >
            <WifiOff className="w-4 h-4" />
            <span>Sin conexión — tus acciones se guardarán cuando vuelvas</span>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<Layout />}>
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/saberes" element={<ProtectedRoute><Saberes /></ProtectedRoute>} />
              <Route path="/saberes/fundamentos" element={<ProtectedRoute><FundamentosBoxeo /></ProtectedRoute>} />
              <Route path="/saberes/fundamentos/:videoId" element={<ProtectedRoute><FundamentosVideoPlayer /></ProtectedRoute>} />
              <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
              <Route path="/calentamiento" element={<ProtectedRoute><Calentamiento /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/meals" element={<ProtectedRoute><Meals /></ProtectedRoute>} />
              <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/payment-review" element={<ProtectedRoute><PaymentReview /></ProtectedRoute>} />
              <Route path="/timer" element={<ProtectedRoute><Timer /></ProtectedRoute>} />
              <Route path="/aprobacion" element={<ProtectedRoute><Saberes /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
              <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>

      <VersionCheckModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        newVersion={newVersionInfo.version}
        downloadUrl={newVersionInfo.url}
      />

      {/* 🔔 Banner de permiso de notificaciones */}
      <AnimatePresence>
        {showNotifBanner && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="fixed bottom-24 left-4 right-4 z-200 bg-slate-900 border border-primary/30 rounded-3xl p-5 shadow-2xl shadow-black/50 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-white uppercase tracking-tight mb-1">
                ¡Activa las notificaciones!
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Recibe alertas de tus clases, pagos aprobados y mensajes del instructor.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    localStorage.setItem('gpte_notif_asked', '1');
                    setShowNotifBanner(false);
                    if (typeof Notification !== 'undefined') {
                      await Notification.requestPermission();
                    }
                  }}
                  className="flex-1 bg-primary text-white font-black text-xs uppercase tracking-widest py-2.5 rounded-xl hover:bg-primary/90 transition-all"
                >
                  Activar
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('gpte_notif_asked', '1');
                    setShowNotifBanner(false);
                  }}
                  className="px-4 py-2.5 bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
