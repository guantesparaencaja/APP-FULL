import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  Target,
  Dumbbell,
  Calendar,
  User,
  Users,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  Shield,
  Bell,
  Apple,
  ShoppingBag,
  LayoutDashboard,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OnboardingModal } from './OnboardingModal';
import { useStore } from '../store/useStore';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationsPanel } from './NotificationsPanel';
const MIN_SWIPE_DISTANCE = 50;
const SWIPE_THRESHOLD_VELOCITY = 0.5;
let lastTouchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

export function Layout() {
  const location = useLocation();
  const user = useStore((state) => state.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [appSettings, setAppSettings] = useState({
    workouts_unlocked: false,
    nutrition_unlocked: false,
    technique_unlocked: false,
    challenge_unlocked: false,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setAppSettings(doc.data() as any);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Check for weekly notification auto-show flag
    const showFlag = localStorage.getItem('show_weekly_notifications_panel');
    if (showFlag === 'true') {
      setIsNotificationsOpen(true);
      localStorage.removeItem('show_weekly_notifications_panel');
    }

    // Listen for unread count
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', String(user.id)),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    });

    return () => unsub();
  }, [user]);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Inicio' },
    { path: '/saberes', icon: Target, label: 'Saberes', id: 'technique' },
    { path: '/workouts', icon: Dumbbell, label: 'Entrenos', id: 'workouts' },
    { path: '/calendar', icon: Calendar, label: 'Calendario' },

    { path: '/meals', icon: Apple, label: 'Comidas' },
    { path: '/store', icon: ShoppingBag, label: 'Tienda' },
    { path: '/chat', icon: MessageSquare, label: 'Coach' },
    { path: '/profile', icon: User, label: 'Perfil' },
  ];

  const isSpecialUser =
    user?.email === 'hernandezkevin001998@gmail.com' ||
    user?.role === 'admin' ||
    user?.plan === 'premium';

  const hasFullAccess = isSpecialUser || (user?.classes_per_month && user.classes_per_month >= 4);

  const visibleNavItems = navItems.filter((item) => {
    // ── REGLA DE ORO: Las secciones se muestran si el ADMIN lo permite globalmente,
    // o si el usuario tiene acceso completo, manteniendo la sincronización universal.
    if (item.id === 'technique')
      return isSpecialUser || appSettings.technique_unlocked || hasFullAccess;
    if (item.id === 'workouts')
      return isSpecialUser || appSettings.workouts_unlocked || hasFullAccess;

    // Always visible basic items
    if (item.path === '/' || item.path === '/calendar' || item.path === '/profile') return true;

    // Other items (Comunidad, Comidas, Coach) show only for Full Access/Special
    return hasFullAccess || isSpecialUser;
  });

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
        when: 'afterChildren',
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { x: -20, opacity: 0 },
    open: { x: 0, opacity: 1 },
  };

  const overlayVariants = {
    closed: { opacity: 0, pointerEvents: 'none' as const },
    open: { opacity: 1, pointerEvents: 'auto' as const },
  };

  // Add Aprobacion for admins (REMOVED - Centralized in Saberes)
  const finalNavItems = [...visibleNavItems];

  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!lastTouchStartX) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const distanceX = lastTouchStartX - touchEndX;
    const distanceY = Math.abs(touchStartY - touchEndY);
    const time = Date.now() - touchStartTime;
    const velocity = Math.abs(distanceX) / time;

    if (distanceY > 30) return; // Si es scroll vertical, ignorar
    if (Math.abs(distanceX) > MIN_SWIPE_DISTANCE && velocity > SWIPE_THRESHOLD_VELOCITY) {
      if (distanceX > 0 && isMenuOpen) {
        setIsMenuOpen(false); // Swipe Izquierda (Cierra)
      } else if (distanceX < 0 && !isMenuOpen) {
        setIsMenuOpen(true); // Swipe Derecha (Abre)
      }
    }
    lastTouchStartX = 0;
  };

  return (
    <div
      className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <OnboardingModal />

      {/* Top Bar — Bell+Hamburger izquierda, Logo derecha */}
      <header className="fixed top-0 left-0 right-0 z-60 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-background-light/70 dark:bg-background-dark/70 border-b border-white/10 dark:border-slate-800/50">
        {/* LEFT: actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-11 h-11 flex items-center justify-center bg-white/10 dark:bg-slate-900/30 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-md transition-all active:bg-primary active:text-white"
            aria-label="Menú"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationsOpen(true)}
            className="w-11 h-11 flex items-center justify-center bg-white/10 dark:bg-slate-900/30 rounded-2xl border border-white/20 dark:border-slate-800/50 shadow-md transition-all active:bg-primary active:text-white relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-300">
                {unreadCount > 9 ? '+9' : unreadCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* RIGHT: branding */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-black italic uppercase tracking-tighter text-lg group-hover:text-primary transition-colors">GPTE</span>
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <Shield className="w-5 h-5 text-white stroke-[2.5px]" />
          </div>
        </Link>
      </header>

      {/* Indicador de swipe — visible cuando el menú está cerrado */}
      <AnimatePresence>
        {!isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-55 flex flex-col items-center gap-1 cursor-pointer"
            onClick={() => setIsMenuOpen(true)}
            title="Abrir menú"
          >
            <div className="w-1.5 h-16 bg-primary/40 rounded-r-full backdrop-blur-sm border-r border-primary/20 flex flex-col items-center justify-center gap-1">
              <div className="w-0.5 h-3 bg-primary/60 rounded-full" />
              <div className="w-0.5 h-3 bg-primary/60 rounded-full" />
              <div className="w-0.5 h-3 bg-primary/60 rounded-full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <main className="flex-1 pt-24 pb-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-70"
            />

            <motion.aside
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-slate-950 z-80 shadow-2xl flex flex-col p-8 border-r border-white/10 dark:border-slate-800/50 rounded-r-[2.5rem]"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                    {user?.profile_pic ? (
                      <img
                        src={user.profile_pic}
                        alt="Perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg tracking-tight truncate max-w-[140px] dark:text-white">
                      {user?.name || 'Usuario'}
                    </h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                      {user?.plan_name || 'Miembro'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3 bg-slate-100 dark:bg-slate-900/50 rounded-2xl hover:scale-110 transition-transform"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {finalNavItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <motion.div key={item.path} variants={itemVariants}>
                      <Link
                        to={item.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={twMerge(
                          'flex items-center justify-between p-4 rounded-3xl transition-all duration-300 group relative overflow-hidden',
                          isActive
                            ? 'bg-primary text-white shadow-xl shadow-primary/30'
                            : 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        )}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div
                            className={twMerge(
                              'w-10 h-10 flex items-center justify-center rounded-xl transition-colors',
                              isActive
                                ? 'bg-white/20'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            )}
                          >
                            <Icon
                              className={clsx(
                                'w-5 h-5',
                                isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'
                              )}
                            />
                          </div>
                          <span className="font-black uppercase italic tracking-tighter text-base">
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight
                          className={clsx(
                            'w-4 h-4 transition-transform group-hover:translate-x-1 relative z-10',
                            isActive ? 'opacity-100' : 'opacity-30'
                          )}
                        />

                        {isActive && (
                          <motion.div
                            layoutId="activeGlow"
                            className="absolute inset-0 bg-linear-to-r from-primary/0 via-white/5 to-white/10"
                          />
                        )}
                      </Link>
                    </motion.div>
                  );
                })}

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/50">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-4">
                    Academia
                  </p>
                </div>
              </nav>

              <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                <a
                  href="https://wa.me/573022028477"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white p-4 rounded-4xl font-black uppercase tracking-widest shadow-lg shadow-[#25D366]/20 transition-all hover:scale-[1.02] active:scale-95 text-xs"
                >
                  <MessageSquare className="w-5 h-5" />
                  Soporte WhatsApp
                </a>
                <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-[0.3em] opacity-50">
                  Academia Guantes Para Encajar
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
