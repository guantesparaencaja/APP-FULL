/**
 * useClassReminders — Supabase Realtime (purga Firebase)
 * Regla de oro: Supabase = fuente única. Realtime via channel.
 */
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import { format, differenceInMinutes } from 'date-fns';

export function useClassReminders() {
  const user = useStore((state) => state.user);

  useEffect(() => {
    if (!user || !('Notification' in window) || Notification.permission !== 'granted') return;

    let bookings: Array<{ id: string; date: string; time: string }> = [];

    // Fetch inicial
    const fetchBookings = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('bookings')
        .select('id, date, time')
        .eq('user_id', String(user.id))
        .eq('status', 'active')
        .gte('date', today);
      bookings = (data ?? []) as typeof bookings;
    };

    fetchBookings();

    // Realtime: actualiza lista al cambiar bookings del usuario
    const channel = supabase
      .channel('realtime:class_reminders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` },
        () => fetchBookings()
      )
      .subscribe();

    // Check cada minuto
    const interval = setInterval(() => {
      const now = new Date();
      bookings.forEach((booking) => {
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
              icon: '/favicon.ico',
            });
            localStorage.setItem(notifKey, 'true');
          }
        } catch (e) {
          console.error('[useClassReminders] Error:', e);
        }
      });
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);
}
