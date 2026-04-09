import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, differenceInMinutes } from 'date-fns';

export function useClassReminders() {
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    let bookings: any[] = [];
    const q = query(
      collection(db, 'bookings'),
      where('user_id', '==', String(user.id)),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    }, (error) => {
      console.error("Error in class reminders snapshot:", error);
    });

    // Check every minute
    const interval = setInterval(() => {
      const now = new Date();
      
      bookings.forEach(booking => {
        if (!booking.date || !booking.time) return;
        
        try {
          const [year, month, day] = booking.date.split('-').map(Number);
          const [hours, minutes] = booking.time.split(':').map(Number);
          const classDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
          
          const diffMins = differenceInMinutes(classDate, now);
          
          const notifKey = `notified_${booking.id}`;
          
          if (diffMins > 0 && diffMins <= 120 && !localStorage.getItem(notifKey)) {
            new Notification('¡Tu clase está por comenzar!', {
              body: `Tienes una clase programada a las ${booking.time}. ¡Prepárate!`,
              icon: '/favicon.ico'
            });
            localStorage.setItem(notifKey, 'true');
          }
        } catch (e) {
          console.error("Error processing booking for reminder:", e);
        }
      });
    }, 60000); // Check every minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);
}
