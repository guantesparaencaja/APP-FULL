const fs = require('fs');
const file = 'C:/Users/styve/Downloads/Guantes-Para-Encajarte-main/src/pages/Calendar.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add adminTab state
code = code.replace(
  'const [showMyBookings, setShowMyBookings] = useState(false);',
  'const [showMyBookings, setShowMyBookings] = useState(false);\n  const [adminTab, setAdminTab] = useState("calendario");'
);

// Add import
if (!code.includes('Users')) {
  code = code.replace(/import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, Globe, XCircle, Plus, Trash2, AlertCircle, ShieldCheck, CreditCard, Upload, User, Star, CheckCircle2, Info } from 'lucide-react';/, "import { Calendar as CalendarIcon, Clock, ArrowLeft, CheckCircle, ChevronLeft, ChevronRight, Globe, XCircle, Plus, Trash2, AlertCircle, ShieldCheck, CreditCard, Upload, User, Star, CheckCircle2, Info, Users } from 'lucide-react';");
}

const startRenderStr = "{user?.role === 'admin' ? (";
const endRenderStr = "{/* Rating Modal */}";

const newRenderCode = `
      {user?.role === 'admin' && (
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 mb-6">
          <button 
            onClick={() => setAdminTab('calendario')}
            className={\`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \${adminTab === 'calendario' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}\`}
          >
            Calendario Mensual
          </button>
          <button 
            onClick={() => setAdminTab('disponibilidad')}
            className={\`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \${adminTab === 'disponibilidad' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500'}\`}
          >
            Disponibilidad Semanal
          </button>
        </div>
      )}

      {user?.role === 'admin' && adminTab === 'disponibilidad' ? (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Disponibilidad Semanal</h2>
            <button 
              onClick={() => setShowAddAvailability(!showAddAvailability)}
              className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Disponibilidad
            </button>
          </div>
          <p className="text-slate-400 mb-6">Esta es la disponibilidad que verán los estudiantes para reservar (Clases de 2 horas).</p>
          
          {showAddAvailability && (
            <form onSubmit={handleAddAvailability} className="bg-slate-800 p-4 rounded-xl border border-slate-700 mb-6 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">{editingAvailabilityId ? 'Editar Horario' : 'Agregar Horario'}</h3>
                <button type="button" onClick={() => {
                  setShowAddAvailability(false);
                  setEditingAvailabilityId(null);
                  setNewAvailability({
                    day_of_week: 'Lunes',
                    start_time: '08:00',
                    end_time: '10:00',
                    title: 'Clase Personalizada',
                    description: 'Entrenamiento enfocado en técnica y cardio.',
                    rules: 'Qué llevar: Guantes, vendas, hidratación. Máximo para cancelar clase ya pagada es de 3 horas. Si desea colocar una ubicación diferente, informar con dos días de anterioridad.',
                    max_students: 4
                  });
                }} className="text-slate-400 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select 
                  value={newAvailability.day_of_week}
                  onChange={e => setNewAvailability({...newAvailability, day_of_week: e.target.value})}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="time" value={newAvailability.start_time} onChange={e => setNewAvailability({...newAvailability, start_time: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" required />
                  <input type="time" value={newAvailability.end_time} onChange={e => setNewAvailability({...newAvailability, end_time: e.target.value})} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" required />
                </div>
              </div>
              <input type="text" placeholder="Título de la clase" value={newAvailability.title} onChange={e => setNewAvailability({...newAvailability, title: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" required />
              <textarea placeholder="Descripción" value={newAvailability.description} onChange={e => setNewAvailability({...newAvailability, description: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none h-20" required />
              <textarea placeholder="Reglas (Qué llevar, cancelación, etc)" value={newAvailability.rules} onChange={e => setNewAvailability({...newAvailability, rules: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none h-20" required />
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-400">Máximo de estudiantes (0 = sin límite):</label>
                <input type="number" min="0" value={newAvailability.max_students ?? 4} onChange={e => setNewAvailability({...newAvailability, max_students: parseInt(e.target.value) || 0})} className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <button type="submit" className="bg-primary text-white font-bold py-2 rounded-lg mt-2">{editingAvailabilityId ? 'Guardar Cambios' : 'Guardar Disponibilidad'}</button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => {
              const dayAvailabilities = availabilities.filter(a => a && a.day_of_week === day).sort((a, b) => (a?.start_time || '').localeCompare(b?.start_time || ''));
              return (
                <div key={day} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                  <h3 className="font-bold text-primary text-center mb-4 border-b border-slate-700 pb-2">{day}</h3>
                  <div className="flex flex-col gap-2">
                    {dayAvailabilities.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center">Sin horarios</p>
                    ) : (
                      dayAvailabilities.map(avail => (
                        <div key={avail.id} className="bg-slate-900/50 p-2 rounded border border-slate-700 group relative cursor-pointer" onClick={() => handleEditAvailabilityClick(avail)}>
                          <p className="text-slate-300 text-xs font-bold text-center">{avail.start_time} - {avail.end_time}</p>
                          <p className="text-[10px] text-slate-400 text-center truncate mt-1">{avail.title}</p>
                          <p className="text-[9px] text-primary text-center mt-1">
                            {avail.max_students ? \`Máx: \${avail.max_students}\` : 'Sin límite'}
                          </p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteAvailability(avail.id); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (user?.role === 'admin' && adminTab === 'calendario') || (!showMyBookings && user?.role === 'student') ? (
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-primary/10 to-transparent">
            <h2 className="text-xl font-black uppercase italic mb-1">Calendario de Clases</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-primary" /> Colombia
              </div>
            </div>
          </div>

        <div className="p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 italic">Selecciona fecha y hora</h3>
          
          <div className="flex flex-col gap-6">
            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  disabled={!canGoPrev}
                  className={\`p-2 rounded-xl transition-colors \${canGoPrev ? 'hover:bg-slate-800 text-primary' : 'opacity-20 cursor-not-allowed text-slate-600'}\`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="text-sm font-black uppercase tracking-widest italic">{format(currentMonth, 'MMMM yyyy', { locale: es }).replace(/^\\w/, c => c.toUpperCase())}</p>
                <button
                  onClick={nextMonth}
                  disabled={!canGoNext}
                  className={\`p-2 rounded-xl transition-colors \${canGoNext ? 'hover:bg-slate-800 text-primary' : 'opacity-20 cursor-not-allowed text-slate-600'}\`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day, i) => (
                  <p key={i} className="text-slate-600 text-[10px] font-black flex h-8 w-full items-center justify-center uppercase">{day}</p>
                ))}
               <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isPast = day < new Date(new Date().setHours(0,0,0,0));
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayName = daysOfWeekMap[day.getDay().toString()];

                  const dayBookings = allBookings.filter(b => b.date === dateStr && (b.status === 'active' || b.status === 'pending_payment' || b.status === 'waitlist'));
                  const hasAvail = daysWithClasses.has(dayName);

                  const isBlocked = day.getDay() === 2 || day.getDay() === 6;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if ((isPast && !( user?.role === 'admin' )) || !isCurrentMonth) return;
                        if (isBlocked && !(user?.role === 'admin')) return;
                        setSelectedDate(day);
                        setSelectedTime(null);
                      }}
                      disabled={!isCurrentMonth}
                      className={\`min-h-[52px] w-full text-xs font-bold rounded-xl transition-all flex flex-col items-center pt-1.5 pb-1 px-0.5 relative
                        \${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                        \${isPast && isCurrentMonth && !(user?.role === 'admin') ? 'opacity-25 cursor-not-allowed text-slate-600' : ''}
                        \${!isPast && isCurrentMonth && !isBlocked ? 'hover:bg-primary/10 text-slate-300 cursor-pointer' : ''}
                        \${isBlocked && isCurrentMonth ? 'opacity-40 cursor-not-allowed' : ''}
                        \${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-105 z-10' : ''}
                        \${isSameDay(day, new Date()) && !isSelected && isCurrentMonth ? 'border border-primary/50 text-primary' : ''}
                      \`}
                    >
                      <span className="text-xs font-black leading-none">{format(day, 'd')}</span>

                      {isBlocked && isCurrentMonth && (
                        <span className="text-[6px] leading-none mt-0.5 font-black uppercase text-center text-slate-500 truncate w-full px-0.5">
                          {day.getDay() === 2 ? '⛪' : '🕊️'}
                        </span>
                      )}

                      {!isBlocked && isCurrentMonth && dayBookings.length > 0 && (
                        <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full px-0.5">
                          {dayBookings.slice(0, 2).map((b, bi) => (
                            <span
                              key={bi}
                              className={\`text-[7px] leading-none font-black rounded px-1 py-0.5 w-full text-center truncate \${
                                isSelected ? 'bg-white/20 text-white' :
                                b.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                                b.status === 'pending_payment' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }\`}
                            >
                              {(b.user_name || b.user_email || '').split(' ')[0]}
                            </span>
                          ))}
                          {dayBookings.length > 2 && (
                            <span className={\`text-[7px] font-black \${isSelected ? 'text-white/70' : 'text-slate-500'}\`}>+\${dayBookings.length - 2}</span>
                          )}
                        </div>
                      )}

                      {!isBlocked && isCurrentMonth && hasAvail && dayBookings.length === 0 && !isSelected && !isPast && (
                        <div className="w-1 h-1 bg-primary/50 rounded-full mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 border-t border-slate-800/50 pt-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500/60 rounded-sm" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Reservado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500/60 rounded-sm" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px]">⛪🕊️</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sin clases</span>
                </div>
              </div>

              {user?.role === 'admin' ? (() => {
                const selDateStr = format(selectedDate, 'yyyy-MM-dd');
                const selBookings = allBookings.filter(b => b.date === selDateStr).sort((a, b) => (b?.created_at || '').localeCompare(a?.created_at || ''));
                
                return (
                  <div className="mt-6 bg-slate-900/50 rounded-3xl border border-slate-800 p-6 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-black uppercase italic text-primary tracking-tight">Reservas del {format(selectedDate, 'd MMM', { locale: es })}</h2>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-950 px-3 py-1 rounded-full">{selBookings.length} Reservas</span>
                    </div>
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {selBookings.length === 0 ? (
                        <div className="text-center py-8">
                          <CalendarIcon className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-slate-500 font-bold italic uppercase tracking-widest text-xs">No hay reservas para este día</p>
                        </div>
                      ) : (
                        selBookings.map(booking => (
                          <div key={booking.id} className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 hover:border-primary/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                                  <User className="w-5 h-5 text-slate-600 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-white uppercase italic tracking-tight">{booking.user_name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{booking.user_email}</p>
                                </div>
                              </div>
                              <span className={\`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                \${booking.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                  booking.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                  booking.status === 'waitlist' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                  'bg-slate-800 text-slate-500 border-slate-700'}
                              \`}>
                                {booking.status === 'active' ? 'Confirmada' : 
                                 booking.status === 'pending_payment' ? 'Pendiente' : 
                                 booking.status === 'waitlist' ? 'Espera' : 'Cancelada'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-800/50">
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary" /> {booking.date}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Clock className="w-3.5 h-3.5 text-primary" /> {booking.time}
                              </div>
                            </div>
        
                            <div className="flex gap-2">
                              {booking.status === 'pending_payment' && (
                                <button 
                                  onClick={() => {
                                    setAdminConfirmPaymentId(booking.id);
                                    setShowAdminConfirmModal(true);
                                  }}
                                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                  Confirmar Pago
                                </button>
                              )}
                              <button 
                                onClick={() => handleCancelBooking(booking.id, booking.date, booking.time)}
                                className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })() : (() => {
                const selDateStr = format(selectedDate, 'yyyy-MM-dd');
                const selDayName = daysOfWeekMap[selectedDate.getDay().toString()];
                const selBookings = allBookings.filter(b => b.date === selDateStr && (b.status === 'active' || b.status === 'pending_payment' || b.status === 'waitlist'));
                const selSlots = availabilities.filter(a => a.day_of_week === selDayName).sort((a, b) => a.start_time.localeCompare(b.start_time));
                const isSelBlocked = selectedDate.getDay() === 2 || selectedDate.getDay() === 6;

                return (
                  <div className="mt-4 bg-slate-900/80 rounded-2xl border border-slate-800 p-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">
                      {format(selectedDate, 'EEEE d \\' de \\' MMMM', { locale: es })}
                    </p>

                    {isSelBlocked ? (
                      <div className="text-center py-3">
                        <p className="text-2xl mb-1">{selectedDate.getDay() === 2 ? '⛪' : '🕊️'}</p>
                        <p className="text-sm font-black text-slate-400">
                          {selectedDate.getDay() === 2 ? 'Martes — Iglesia' : 'Sábado — Día de Reposo'}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">No hay clases este día</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-300">
                            {selBookings.length} {selBookings.length === 1 ? 'persona' : 'personas'} han reservado clases este día
                          </span>
                        </div>

                        {selSlots.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">No hay horarios definidos para este día de la semana.</p>
                        ) : availableSlotsWithCounts.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-4">No hay clases disponibles para este día.</p>
                        ) : (
                          availableSlotsWithCounts.map((slot) => (
                            <div key={slot.id} className="flex flex-col gap-2 mb-4">
                              <button
                                onClick={() => setSelectedTime(slot)}
                                className={\`flex flex-col p-4 rounded-xl text-sm border transition-all text-left
                                  \${selectedTime?.id === slot.id 
                                    ? 'bg-slate-700 border-primary' 
                                    : 'bg-transparent border-primary/30 hover:border-primary hover:bg-primary/5'
                                  }
                                \`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className={\`font-bold text-lg \${selectedTime?.id === slot.id ? 'text-white' : 'text-primary'}\`}>
                                    {slot.start_time} - {slot.end_time}
                                  </span>
                                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">120 min</span>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                  <h4 className={\`font-bold \${selectedTime?.id === slot.id ? 'text-white' : 'text-slate-200'}\`}>{slot.title}</h4>
                                  {slot.max_students && (
                                    <div className="flex items-center gap-2">
                                      <span className={\`text-xs font-bold \${slot.spotsLeft !== null && slot.spotsLeft <= 1 ? 'text-red-500' : 'text-emerald-500'}\`}>
                                        {slot.activeBookingsCount}/{slot.max_students}
                                      </span>
                                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                          className={\`h-full rounded-full \${slot.spotsLeft !== null && slot.spotsLeft <= 1 ? 'bg-red-500' : 'bg-emerald-500'}\`}
                                          style={{ width: \`\${Math.min(100, (slot.activeBookingsCount / slot.max_students) * 100)}%\` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mb-2">{slot.description}</p>
                                <p className="text-[10px] text-slate-500 italic border-t border-slate-700 pt-2 mt-1">{slot.rules}</p>
                              </button>
                              {selectedTime?.id === slot.id && (
                                <button 
                                  onClick={() => handleBook(slot.spotsLeft !== null && slot.spotsLeft <= 0)}
                                  className={\`w-full text-white rounded-lg py-3 text-sm font-bold shadow-lg transition-all \${
                                    slot.spotsLeft !== null && slot.spotsLeft <= 0 
                                      ? 'bg-amber-500 hover:bg-amber-600' 
                                      : 'bg-primary hover:bg-primary/90 neon-glow'
                                  }\`}
                                >
                                  {slot.spotsLeft !== null && slot.spotsLeft <= 0 ? 'Unirse a Lista de Espera' : 'Confirmar Reserva'}
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      ) : ( // Mis Reservas (Student)
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black uppercase italic text-primary">Mis Reservas</h2>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {bookings.filter(b => b.status !== 'cancelled').length} Activas
            </span>
          </div>
          
          {bookings.length === 0 ? (
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-12 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <p className="text-slate-400 font-bold">No tienes reservas aún</p>
              <button 
                onClick={() => setShowMyBookings(false)}
                className="mt-4 text-primary text-xs font-black uppercase tracking-widest"
              >
                Comenzar a entrenar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookings.sort((a, b) => (b?.date || '').localeCompare(a?.date || '')).map((booking) => (
                <div 
                  key={booking.id} 
                  className={\`bg-slate-900/80 border rounded-3xl p-5 transition-all
                    \${booking.status === 'cancelled' ? 'opacity-50 border-slate-800' : 'border-slate-800 hover:border-primary/30'}
                  \`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={\`p-3 rounded-2xl \${booking.status === 'cancelled' ? 'bg-slate-800' : 'bg-primary/20 text-primary'}\`}>
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 italic">{booking.date}</p>
                        <p className="text-lg font-black uppercase italic">{booking.time}</p>
                      </div>
                    </div>
                    <span className={\`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                      \${booking.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        booking.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        'bg-slate-800 text-slate-500 border-slate-700'}
                    \`}>
                      {booking.status === 'active' ? 'Confirmada' : 
                       booking.status === 'pending_payment' ? 'Pendiente Pago' : 
                       booking.status === 'waitlist' ? 'Lista Espera' :
                       'Cancelada'}
                    </span>
                  </div>

                  {booking.status !== 'cancelled' && (
                    <div className="flex flex-col gap-3">
                      {booking.status === 'pending_payment' && (
                        <button
                          onClick={() => navigate('/payments', { state: { bookingId: booking.id } })}
                          className="w-full py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20"
                        >
                          Subir Comprobante de Pago
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={generateGoogleCalendarUrl(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 hover:border-primary/30 transition-all"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" /> Google
                        </a>
                        <button
                          onClick={() => generateICS(booking)}
                          className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 hover:border-primary/30 transition-all"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" /> ICS
                        </button>
                      </div>

                      <button
                        onClick={() => handleCancelBooking(booking.id, booking.date, booking.time)}
                        className="w-full py-3 text-red-500/50 hover:text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors"
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
`;

const startIndex = code.indexOf(startRenderStr);
const endIndex = code.indexOf(endRenderStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Error finding strings startRenderStr=' + startIndex + ' endRenderStr=' + endIndex);
  process.exit(1);
}

code = code.substring(0, startIndex) + newRenderCode + '\n      ' + code.substring(endIndex);

fs.writeFileSync(file, code);
console.log('Success!');
