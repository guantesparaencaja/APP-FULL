import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { sendPushNotification } from '../lib/fcmService';

export function NotificationManager() {
  const user = useStore(s => s.user);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    const checkNotifications = async () => {
      const now = Date.now();
      const storageKey = `last_notif_checks_${user.id}`;
      const savedData = localStorage.getItem(storageKey);
      const checks = savedData ? JSON.parse(savedData) : {
        hydration: 0,
        motivation: 0,
        weekly: 0,
        classes: {}
      };

      // 1. HYDRATION (Every 2 hours)
      if (now - checks.hydration > 2 * 60 * 60 * 1000) {
        await sendPushNotification(
          String(user.id),
          '💧 ¡Hidratación!',
          'Es momento de beber agua para mantener tu rendimiento al máximo.'
        );
        checks.hydration = now;
      }

      // 2. MOTIVATION (Once a day if no training)
      const todayStr = new Date().toISOString().split('T')[0];
      const lastMotivationDate = new Date(checks.motivation).toISOString().split('T')[0];
      
      if (todayStr !== lastMotivationDate) {
        // Check if user has a booking today
        const q = query(
          collection(db, 'bookings'), 
          where('user_id', '==', String(user.id)),
          where('date', '==', todayStr),
          where('status', '==', 'active')
        );
        const snap = await getDocs(q);
        
        if (snap.empty) {
          const quotes = [
            "¡El único entrenamiento malo es el que no sucedió! 🥊",
            "La disciplina es el puente entre tus metas y tus logros. 💪",
            "No te detengas hasta que estés orgulloso. 🔥",
            "El boxeo no se trata de qué tan fuerte golpeas, sino de cuánto puedes recibir y seguir adelante."
          ];
          const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
          await sendPushNotification(
            String(user.id),
            '🔥 ¡No te rindas!',
            randomQuote
          );
        }
        checks.motivation = now;
      }

      // 3. CLASS REMINDER (2 hours before)
      const bookingsQ = query(
        collection(db, 'bookings'),
        where('user_id', '==', String(user.id)),
        where('date', '==', todayStr),
        where('status', '==', 'active')
      );
      const bookingsSnap = await getDocs(bookingsQ);
      
      bookingsSnap.forEach(doc => {
        const data = doc.data();
        if (!data.time || typeof data.time !== 'string') return; // ✅ guard undefined
        // ✅ El tiempo puede ser "09:00" o "09:00 - 11:00" (formato admin)
        const startTimePart = data.time.split(' - ')[0].trim();
        const timeParts = startTimePart.split(':');
        if (timeParts.length < 2) return;
        const hour = Number(timeParts[0]);
        const minute = Number(timeParts[1]);
        if (isNaN(hour) || isNaN(minute)) return;
        const classTime = new Date();
        classTime.setHours(hour, minute, 0, 0);
        
        const diffMs = classTime.getTime() - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Notify if exactly ~2 hours before (within 10 min window)
        if (diffHours > 1.8 && diffHours < 2.1 && !checks.classes[doc.id]) {
          sendPushNotification(
            String(user.id),
            '🥊 ¡Tu clase comienza pronto!',
            `Te recordamos que tu clase de las ${data.time} comienza en 2 horas.`
          );
          checks.classes[doc.id] = true;
        }
      });

      // 4. WEEKLY CHECK (Every 7 days - show in-app panel)
      if (now - checks.weekly > 7 * 24 * 60 * 60 * 1000) {
        // Set a flag to show the notification panel on next home visit
        localStorage.setItem(`show_weekly_panel_${user.id}`, 'true');
        checks.weekly = now;
      }

      localStorage.setItem(storageKey, JSON.stringify(checks));
    };

    // Run every 5 minutes
    const interval = setInterval(checkNotifications, 5 * 60 * 1000);
    checkNotifications(); // Initial check

    return () => clearInterval(interval);
  }, [user]);

  return null; // Side-effect only component
}
