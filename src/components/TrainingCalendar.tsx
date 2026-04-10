import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TrainingCalendarProps {
  workoutDates: Date[];
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ workoutDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black uppercase tracking-tight text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-black text-slate-500 uppercase tracking-widest py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Padding for start of month (Monday start) */}
        {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((day) => {
          const hasWorkout = workoutDates.some((wd) => isSameDay(wd, day));
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toString()}
              className={`
                aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all relative
                ${hasWorkout ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-800/50 text-slate-400'}
                ${isCurrentDay && !hasWorkout ? 'border-2 border-primary/50' : ''}
              `}
            >
              {format(day, 'd')}
              {hasWorkout && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-primary rounded-sm" />
          <span>Entrenado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-800/50 rounded-sm" />
          <span>Sin Actividad</span>
        </div>
      </div>
    </div>
  );
};
