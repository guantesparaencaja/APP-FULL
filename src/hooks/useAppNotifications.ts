import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  limit,
  orderBy,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, addHours, isToday, parseISO, subHours } from 'date-fns';
import { sendPushNotification } from '../lib/fcmService';

export function useAppNotifications() {
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    const requestPermissions = async () => {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } catch (e) {
        console.warn('LocalNotifications permissions error:', e);
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if (!user) return;

    const isWeb = Capacitor.getPlatform() === 'web';

    // 1. Every 7 days notification (Startup/Weekly)
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
            notifications: [
              {
                title,
                body,
                id: 1,
                schedule: { at: new Date(Date.now() + 5000) },
              },
            ],
          });
        }
        localStorage.setItem('last_weekly_notify', now.toISOString());
      }
    };

    // 2. Hydration Reminders (Every 2 hours)
    const scheduleHydration = async () => {
      if (isWeb) {
        const lastHydration = localStorage.getItem('last_hydration_notify');
        const now = new Date();
        if (
          !lastHydration ||
          now.getTime() - new Date(lastHydration).getTime() > 2 * 60 * 60 * 1000
        ) {
          sendPushNotification(
            String(user.id),
            '¡Hora de Hidratarse! 💧',
            'Beber agua mantiene tu energía y mejora tu recuperación.'
          );
          localStorage.setItem('last_hydration_notify', now.toISOString());
        }
      } else {
        const pending = await LocalNotifications.getPending();
        const hasHydration = pending.notifications.some((n) => n.id >= 10 && n.id <= 20);

        if (!hasHydration) {
          const notifications = [];
          for (let i = 0; i < 5; i++) {
            notifications.push({
              title: '¡Hora de Hidratarse! 💧',
              body: 'Beber agua mantiene tu energía y mejora tu recuperación.',
              id: 10 + i,
              schedule: { at: addHours(new Date(), (i + 1) * 2) },
            });
          }
          await LocalNotifications.schedule({ notifications });
        }
      }
    };

    // 3. Motivational Reminder (If not trained)
    const checkTrainingAndNotify = async () => {
      const q = query(
        collection(db, 'user_workouts'),
        where('user_id', '==', String(user.id)),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      const hasTrainedToday = snapshot.docs.some((doc) => isToday(parseISO(doc.data().timestamp)));

      if (!hasTrainedToday) {
        let scheduleTime = new Date();
        scheduleTime.setHours(18, 0, 0, 0);
        if (scheduleTime < new Date()) {
          scheduleTime.setDate(scheduleTime.getDate() + 1);
        }

        const title = '¡No te detengas! 🔥';
        const body = 'Aún tienes tiempo para entrenar hoy. ¡Tu mejor versión te espera!';

        if (isWeb) {
          const lastMotiv = localStorage.getItem('last_motiv_notif');
          if (!lastMotiv || !isToday(parseISO(lastMotiv))) {
            sendPushNotification(String(user.id), title, body);
            localStorage.setItem('last_motiv_notif', new Date().toISOString());
          }
        } else {
          await LocalNotifications.schedule({
            notifications: [{ title, body, id: 30, schedule: { at: scheduleTime } }],
          });
        }
      }
    };

    // 4. Community Activity Listener (Fixed collection name and multiplatform)
    const unsubCommunity = onSnapshot(
      query(collection(db, 'messages'), orderBy('created_at', 'desc'), limit(1)),
      (snapshot) => {
        if (!snapshot.empty) {
          const msg = snapshot.docs[0].data();
          if (
            msg.user_id !== String(user.id) &&
            (!msg.created_at || new Date().getTime() - msg.created_at.toMillis() < 10000)
          ) {
            if (!isWeb) {
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: 'Nuevo mensaje en la Comunidad',
                    body: `${msg.user_name}: ${msg.content.substring(0, 50)}...`,
                    id: 40,
                    schedule: { at: new Date(Date.now() + 1000) },
                  },
                ],
              });
            }
          }
        }
      }
    );

    // 5. CLASS REMINDERS (New)
    const checkClassReminders = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'bookings'),
        where('user_id', '==', String(user.id)),
        where('date', '==', today),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        const [hour, min] = data.time.split(':').map(Number);
        const classDate = new Date();
        classDate.setHours(hour, min, 0, 0);

        const diffMs = classDate.getTime() - Date.now();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs > 1.9 && diffHrs < 2.1) {
          const key = `class_notif_${d.id}`;
          if (!localStorage.getItem(key)) {
            const title = '🥊 Clase en 2 horas';
            const body = `Tu clase de las ${data.time} comienza pronto. ¡Prepárate!`;
            sendPushNotification(String(user.id), title, body);
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
      unsubCommunity();
      clearInterval(classInterval);
    };
  }, [user]);

  // Daily Challenge Logic
  useEffect(() => {
    if (!user) return;
    const isWeb = Capacitor.getPlatform() === 'web';

    const unsubChallenge = onSnapshot(doc(db, 'settings', 'daily_challenge'), (snapshot) => {
      if (snapshot.exists()) {
        const challenge = snapshot.data();
        const title = '🎯 Nuevo Reto del Día';
        const body = challenge.title || '¡Revisa el reto de hoy y supérate!';

        if (isWeb) {
          const lastC = localStorage.getItem('last_challenge_id');
          if (lastC !== snapshot.id) {
            sendPushNotification(String(user.id), title, body);
            localStorage.setItem('last_challenge_id', snapshot.id);
          }
        } else {
          LocalNotifications.schedule({
            notifications: [
              {
                title,
                body,
                id: 50,
                schedule: { at: new Date(Date.now() + 1000) },
              },
            ],
          });
        }
      }
    });

    return () => unsubChallenge();
  }, [user]);
}
