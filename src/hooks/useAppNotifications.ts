/**
 * useAppNotifications — Supabase Realtime (purga Firebase)
 * Regla de oro: Supabase = única fuente. Realtime para comunidad y clases.
 */
import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format, addHours, isToday, parseISO } from 'date-fns';
import { sendPushNotification } from '../lib/fcmService';

export function useAppNotifications() {
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;
    const requestPermissions = async () => {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') await LocalNotifications.requestPermissions();
      } catch (e) {
        console.warn('[useAppNotifications] LocalNotifications permissions error:', e);
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!user) return;
    const isWeb = Capacitor.getPlatform() === 'web';

    // 1. Weekly check
    const scheduleWeeklyCheck = async () => {
      const lastNotify = localStorage.getItem('last_weekly_notify');
      const now = new Date();
      if (!lastNotify || now.getTime() - new Date(lastNotify).getTime() > 7 * 24 * 60 * 60 * 1000) {
        const title = '¡Bienvenido de nuevo a GPTE!';
        const body = 'Mantén tu disciplina esta semana. ¡Vamos por más! 🥊';
        if (isWeb) {
          await sendPushNotification(String(user.id), title, body);
          localStorage.setItem('show_weekly_notifications_panel', 'true');
        } else {
          await LocalNotifications.schedule({
            notifications: [{ title, body, id: 1, schedule: { at: new Date(Date.now() + 5000) } }],
          });
        }
        localStorage.setItem('last_weekly_notify', now.toISOString());
      }
    };

    // 2. Hydration reminder (cada 2h)
    const scheduleHydration = async () => {
      if (isWeb) {
        const lastH = localStorage.getItem('last_hydration_notify');
        const now = new Date();
        if (!lastH || now.getTime() - new Date(lastH).getTime() > 2 * 60 * 60 * 1000) {
          sendPushNotification(String(user.id), '¡Hora de Hidratarse! 💧', 'Beber agua mantiene tu energía y mejora tu recuperación.');
          localStorage.setItem('last_hydration_notify', now.toISOString());
        }
      } else {
        const pending = await LocalNotifications.getPending();
        const hasHydration = pending.notifications.some((n) => n.id >= 10 && n.id <= 20);
        if (!hasHydration) {
          await LocalNotifications.schedule({
            notifications: Array.from({ length: 5 }, (_, i) => ({
              title: '¡Hora de Hidratarse! 💧',
              body: 'Beber agua mantiene tu energía y mejora tu recuperación.',
              id: 10 + i,
              schedule: { at: addHours(new Date(), (i + 1) * 2) },
            })),
          });
        }
      }
    };

    // 3. Motivational (si no entrenó hoy) — Supabase
    const checkTrainingAndNotify = async () => {
      const { data: workouts } = await supabase
        .from('user_workouts')
        .select('timestamp')
        .eq('user_id', String(user.id))
        .order('timestamp', { ascending: false })
        .limit(1);

      const hasTrainedToday = workouts?.some((w: { timestamp: string }) => isToday(parseISO(w.timestamp))) ?? false;

      if (!hasTrainedToday) {
        const title = '¡No te detengas! 🔥';
        const body = 'Aún tienes tiempo para entrenar hoy. ¡Tu mejor versión te espera!';
        if (isWeb) {
          const lastMotiv = localStorage.getItem('last_motiv_notif');
          if (!lastMotiv || !isToday(parseISO(lastMotiv))) {
            sendPushNotification(String(user.id), title, body);
            localStorage.setItem('last_motiv_notif', new Date().toISOString());
          }
        } else {
          const scheduleTime = new Date();
          scheduleTime.setHours(18, 0, 0, 0);
          if (scheduleTime < new Date()) scheduleTime.setDate(scheduleTime.getDate() + 1);
          await LocalNotifications.schedule({
            notifications: [{ title, body, id: 30, schedule: { at: scheduleTime } }],
          });
        }
      }
    };

    // 4. Community messages — Supabase Realtime
    const communityChannel = supabase
      .channel('realtime:community_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as { user_id: string; user_name: string; content: string; created_at: string };
          if (msg.user_id !== String(user.id)) {
            const elapsed = new Date().getTime() - new Date(msg.created_at).getTime();
            if (elapsed < 10000 && !isWeb) {
              LocalNotifications.schedule({
                notifications: [{
                  title: 'Nuevo mensaje en la Comunidad',
                  body: `${msg.user_name}: ${msg.content.substring(0, 50)}...`,
                  id: 40,
                  schedule: { at: new Date(Date.now() + 1000) },
                }],
              });
            }
          }
        }
      )
      .subscribe();

    // 5. Class reminders — Supabase
    const checkClassReminders = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: classes } = await supabase
        .from('bookings')
        .select('id, time')
        .eq('user_id', String(user.id))
        .eq('date', today)
        .eq('status', 'active');

      (classes ?? []).forEach((d: { id: string; time: string }) => {
        const [hour, min] = d.time.split(':').map(Number);
        const classDate = new Date();
        classDate.setHours(hour, min, 0, 0);
        const diffHrs = (classDate.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHrs > 1.9 && diffHrs < 2.1) {
          const key = `class_notif_${d.id}`;
          if (!localStorage.getItem(key)) {
            sendPushNotification(String(user.id), '🥊 Clase en 2 horas', `Tu clase de las ${d.time} comienza pronto. ¡Prepárate!`);
            localStorage.setItem(key, 'true');
          }
        }
      });
    };

    scheduleWeeklyCheck();
    scheduleHydration();
    checkTrainingAndNotify();
    checkClassReminders();
    const classInterval = setInterval(checkClassReminders, 10 * 60 * 1000);

    return () => {
      supabase.removeChannel(communityChannel);
      clearInterval(classInterval);
    };
  }, [user]);

  // Daily Challenge — Supabase Realtime
  useEffect(() => {
    if (!user) return;
    const isWeb = Capacitor.getPlatform() === 'web';

    const challengeChannel = supabase
      .channel('realtime:daily_challenge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const row = payload.new as { id: string; title?: string };
          if (row.id === 'daily_challenge') {
            const title = '🎯 Nuevo Reto del Día';
            const body = row.title || '¡Revisa el reto de hoy y supérate!';
            if (isWeb) {
              const lastC = localStorage.getItem('last_challenge_id');
              if (lastC !== String(payload.commit_timestamp)) {
                sendPushNotification(String(user.id), title, body);
                localStorage.setItem('last_challenge_id', String(payload.commit_timestamp));
              }
            } else {
              LocalNotifications.schedule({
                notifications: [{ title, body, id: 50, schedule: { at: new Date(Date.now() + 1000) } }],
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [user]);
}
