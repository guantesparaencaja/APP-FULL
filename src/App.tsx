/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initializePushNotifications } from './lib/pushNotifications';
import { VersionCheckModal } from './components/VersionCheckModal';
import { Capacitor } from '@capacitor/core';
import { initSyncQueue, syncQueue } from './utils/syncQueue';

const APP_VERSION = '1.0.1';

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
    const isPublicPath = ['/profile', '/plans', '/payments', '/payment-review'].includes(pathname);

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
    } else if (user.plan_status === 'active') {
      // Allowed to access everything
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

  useEffect(() => {
    // 1. Version Check Listener
    const unsubConfig = onSnapshot(doc(db, 'settings', 'app_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const serverVersion = data.version || '1.0.0';
        const downloadUrl = data.url || '';

        if (serverVersion !== APP_VERSION) {
          setNewVersionInfo({ version: serverVersion, url: downloadUrl });
          setShowVersionModal(true);
        } else {
          setShowVersionModal(false);
        }
      }
    });

    return () => unsubConfig();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);

      const listener = (e: MediaQueryListEvent) => {
        if (useStore.getState().theme === 'system') {
          root.classList.remove('light', 'dark');
          root.classList.add(e.matches ? 'dark' : 'light');
        }
      };
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
      return () =>
        window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    // La lógica real de auth comienza aquí

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous user snapshot listener if it exists
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubUser = onSnapshot(
          userRef,
          async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              const adminEmails = ['hernandezkevin001998@gmail.com'];

              // Handle role synchronization
              const isAdminEmail = firebaseUser.email && adminEmails.includes(firebaseUser.email);
              if (isAdminEmail && data.role !== 'admin') {
                await updateDoc(userRef, { role: 'admin' });
              } else if (
                !isAdminEmail &&
                data.role === 'admin' &&
                firebaseUser.email !== 'hernandezkevin001998@gmail.com'
              ) {
                await updateDoc(userRef, { role: 'student' });
              }

              const userData = { id: firebaseUser.uid, ...data } as any;
              const currentUser = useStore.getState().user;

              // ✅ BLOQUE B FIX: Merge profundo para preservar campos del admin
              // Si Firestore no tiene un campo (undefined) pero el estado local sí lo tiene,
              // conservamos el valor local. Esto evita que height, weight, dominant_hand
              // se pierdan en actualizaciones parciales de Firestore.
              const mergedUser = currentUser
                ? {
                  ...currentUser,   // base: estado actual
                  ...userData,      // Firestore sobreescribe (es la fuente de verdad)
                  // Para campos críticos: solo sobreescribir si Firestore tiene un valor real
                  height: userData.height ?? currentUser.height,
                  weight: userData.weight ?? currentUser.weight,
                  dominant_hand: userData.dominant_hand ?? currentUser.dominant_hand,
                  age: userData.age ?? currentUser.age,
                  gender: userData.gender ?? currentUser.gender,
                  profile_pic: userData.profile_pic ?? currentUser.profile_pic,
                }
                : userData;

              // Only update if data actually changed to avoid infinite re-renders
              if (!currentUser || JSON.stringify(mergedUser) !== JSON.stringify(currentUser)) {
                setUser(mergedUser);
              }
              initializePushNotifications(firebaseUser.uid);
            } else {
              const adminEmails = ['hernandezkevin001998@gmail.com'];
              const userData = {
                name: firebaseUser.displayName || 'Usuario',
                email: firebaseUser.email,
                role:
                  firebaseUser.email && adminEmails.includes(firebaseUser.email)
                    ? 'admin'
                    : 'student',
                is_new_user: true,
              };
              await setDoc(userRef, userData);
              setUser({ id: firebaseUser.uid, ...userData } as any);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Error syncing user data:', error);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, [setUser]);

  // ✅ Banner de permiso de notificaciones (una sola vez)
  useEffect(() => {
    if (!useStore.getState().user) return;
    const alreadyAsked = localStorage.getItem('gpte_notif_asked');
    if (alreadyAsked) return;
    // Mostrar banner si el permiso aún no fue otorgado
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
    if (permission === 'default' || Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => setShowNotifBanner(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (currentTheme: string) => {
      root.classList.remove('light', 'dark');
      if (currentTheme === 'system') {
        // Automatic feature: Check if it's night time (>19:00 or <06:00)
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

    // Listen for OS-level theme changes (only relevant when theme === 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // ✅ Capacitor: sync on resume — los onSnapshot se reconectan automáticamente
  // SyncQueue también intenta enviar acciones pendientes cuando la app vuelve al frente
  useEffect(() => {
    // Inicializar motor offline en web (listeners onLine/offLine)
    initSyncQueue();

    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle: any = null;
    const setupListener = async () => {
      const { App: CapApp } = await import('@capacitor/app');
      listenerHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // Los listeners de Firestore (onSnapshot) se reconectan solos.
          console.log('[GPTE] App activa — reconectando Firestore + vaciando cola offline...');
          syncQueue.attemptSync();
        }
      });
    };
    setupListener().catch(console.error);
    return () => {
      if (listenerHandle) listenerHandle.remove().catch(console.error);
    };
  }, []);

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
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saberes"
                element={
                  <ProtectedRoute>
                    <Saberes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saberes/fundamentos"
                element={
                  <ProtectedRoute>
                    <FundamentosBoxeo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saberes/fundamentos/:videoId"
                element={
                  <ProtectedRoute>
                    <FundamentosVideoPlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workouts"
                element={
                  <ProtectedRoute>
                    <Workouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calentamiento"
                element={
                  <ProtectedRoute>
                    <Calentamiento />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/meals"
                element={
                  <ProtectedRoute>
                    <Meals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <ProtectedRoute>
                    <Plans />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute>
                    <Payments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-review"
                element={
                  <ProtectedRoute>
                    <PaymentReview />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/timer"
                element={
                  <ProtectedRoute>
                    <Timer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/aprobacion"
                element={
                  <ProtectedRoute>
                    <Saberes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipes"
                element={
                  <ProtectedRoute>
                    <Recipes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/store"
                element={
                  <ProtectedRoute>
                    <Store />
                  </ProtectedRoute>
                }
              />
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
