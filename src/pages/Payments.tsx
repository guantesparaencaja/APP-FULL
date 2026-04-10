import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  QrCode,
  Copy,
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useStore((state) => state.user);
  const [bookingId, setBookingId] = useState<string | null>(location.state?.bookingId || null);
  const [planId, setPlanId] = useState<string | null>(location.state?.planId || null);
  const [planName, setPlanName] = useState<string | null>(location.state?.planName || null);
  const [classesPerMonth, setClassesPerMonth] = useState<number | null>(
    location.state?.classesPerMonth || null
  );
  const [booking, setBooking] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubBooking: (() => void) | undefined;
    let unsubPending: (() => void) | undefined;

    if (bookingId) {
      const docRef = doc(db, 'bookings', bookingId);
      unsubBooking = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setBooking({ id: docSnap.id, ...docSnap.data() });
          }
        },
        (err) => {
          console.error('Error syncing booking:', err);
        }
      );
    } else if (planId) {
      // Viene desde Plans con planId — no necesita buscar bookings
      // El formulario de pago se muestra directamente con el plan seleccionado
    } else if (user?.id) {
      // Fetch pending bookings for the user
      const q = query(
        collection(db, 'bookings'),
        where('user_id', '==', user.id),
        where('status', '==', 'pending_payment')
      );
      unsubPending = onSnapshot(
        q,
        (snapshot) => {
          const pending = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setPendingBookings(pending);
          if (pending.length === 1) {
            setBookingId(pending[0].id);
          }
        },
        (err) => {
          console.error('Error syncing pending bookings:', err);
        }
      );
    }

    return () => {
      if (unsubBooking) unsubBooking();
      if (unsubPending) unsubPending();
    };
  }, [bookingId, planId, user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Validation
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Solo se permiten imágenes JPG, PNG, WEBP o PDF.');
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande (máximo 10MB).');
        return;
      }

      // Revoke previous URL if any
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setFile(selectedFile);
      setError(null);
    }
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // We could add a temporary state for "Copied!" feedback
  };

  const handleUpload = async () => {
    if (!file || (!bookingId && !planId) || !user) return;

    setUploading(true);
    setError(null);

    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `pagos/${user.id}/comprobante_${Date.now()}.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (err: any) => {
          console.error(err);
          setError(
            `Error al subir: ${err.code || err.message}. Verifica tu conexión e inténtalo de nuevo.`
          );
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (planId) {
            // Create a plan payment request
            await addDoc(collection(db, 'payments'), {
              user_id: user.id,
              user_name: user.name,
              plan_id: planId,
              plan_name: planName,
              classes_per_month: classesPerMonth || user.classes_per_month || 0,
              amount: 0, // Should probably get this from plan data
              payment_proof_url: downloadURL,
              status: 'submitted',
              created_at: new Date().toISOString(),
            });

            // Update user status
            await updateDoc(doc(db, 'users', user.id), {
              plan_status: 'pending_verification',
            });
          } else if (bookingId) {
            // Update booking with payment info
            await updateDoc(doc(db, 'bookings', bookingId), {
              payment_proof_url: downloadURL,
              payment_status: 'submitted',
              payment_submitted_at: new Date().toISOString(),
            });
            // ✅ Crear ticket de pago unificado para clase individual
            await addDoc(collection(db, 'payments'), {
              user_id: user.id,
              user_name: user.name,
              booking_id: bookingId,
              plan_name: `Clase Individual del ${booking?.date || 'día'}`,
              plan_id: 'single_class',
              classes_per_month: 1,
              payment_proof_url: downloadURL,
              status: 'submitted',
              created_at: new Date().toISOString(),
              type: 'single_class',
            });
          }

          // Create a notification for admin
          await addDoc(collection(db, 'notifications'), {
            user_id: 'admin',
            type: 'payment_submitted',
            message: `Nuevo comprobante de pago de ${user.name} para ${planId ? 'el plan ' + planName : 'la clase del ' + booking?.date}`,
            booking_id: bookingId || null,
            plan_id: planId || null,
            created_at: new Date().toISOString(),
            read: false,
          });

          setSuccess(true);
          setUploading(false);

          setTimeout(() => {
            navigate(planId ? '/payment-review' : '/calendar');
          }, 3000);
        }
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display p-4 pb-32">
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-primary p-2 hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>
        <h1 className="text-2xl font-black uppercase tracking-tight italic">Confirmar Pago</h1>
        <div className="w-12"></div>
      </header>

      <div className="max-w-md mx-auto w-full">
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/40">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-emerald-500 uppercase">¡Enviado con éxito!</h2>
            <p className="text-slate-400 font-medium">
              Tu comprobante ha sido recibido. El profesor confirmará tu {planId ? 'plan' : 'clase'}{' '}
              en breve.
              {bookingId && 'Si no hay respuesta en 3 horas, se confirmará automáticamente.'}
            </p>
            <p className="text-xs text-slate-500 mt-4">
              Redirigiendo al {planId ? 'perfil' : 'calendario'}...
            </p>
          </div>
        ) : !bookingId && pendingBookings.length > 0 ? (
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase italic mb-4">
              Selecciona una Reserva
            </h2>
            <div className="space-y-3">
              {pendingBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBookingId(b.id)}
                  className="w-full bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-left hover:border-primary transition-all"
                >
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                    Clase del {b.date}
                  </p>
                  <p className="text-sm font-black text-white uppercase italic">{b.time}</p>
                </button>
              ))}
            </div>
          </div>
        ) : !bookingId && !planId ? (
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-8 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white uppercase italic">
              No hay reservas pendientes
            </h2>
            <p className="text-slate-400 text-sm">
              Primero debes reservar una clase en el calendario.
            </p>
            <button
              onClick={() => navigate('/calendar')}
              className="mt-4 bg-primary text-white font-bold py-3 px-8 rounded-xl"
            >
              Ir al Calendario
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700 p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                  {planId ? 'Plan Seleccionado' : 'Reserva Seleccionada'}
                </p>
                <p className="text-sm font-black text-white uppercase italic">
                  {planId
                    ? planName
                    : booking
                      ? `${booking.date} • ${booking.time}`
                      : 'Cargando...'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 mb-2 shadow-xl border border-slate-200">
                <img
                  src="/qr-nequi.jpg"
                  alt="QR Nequi y Bre.b"
                  className="w-56 h-56 object-contain rounded-2xl shadow-xl border border-slate-200"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback a imagen de firebase si la local no existe temporalmente
                    (e.target as HTMLImageElement).src =
                      'https://firebasestorage.googleapis.com/v0/b/gpte007.firebasestorage.app/o/qr-pago.jpg?alt=media';
                  }}
                />

                <div className="w-full space-y-3">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mb-1">
                      Beneficiario
                    </p>
                    <p className="text-xl font-black text-slate-900 uppercase italic tracking-tight">
                      Kevin Hernandez
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mb-0.5">
                          Número Nequi
                        </p>
                        <p className="text-lg font-black text-slate-900 tracking-wider">
                          3022028477
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard('3022028477')}
                        className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest mb-0.5">
                          Clave Bre.b
                        </p>
                        <p className="text-lg font-black text-slate-900 tracking-wider">
                          1036681812
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard('1036681812')}
                        className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-90"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest italic">
                  Instrucciones de Pago
                </label>
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 text-sm space-y-3">
                  <p className="flex items-center gap-3 text-slate-300 font-bold">
                    <span className="w-6 h-6 bg-primary/20 text-primary rounded-lg flex items-center justify-center text-[10px] font-black italic">
                      1
                    </span>
                    Escanea el QR o copia el número Nequi.
                  </p>
                  <p className="flex items-center gap-3 text-slate-300 font-bold">
                    <span className="w-6 h-6 bg-primary/20 text-primary rounded-lg flex items-center justify-center text-[10px] font-black italic">
                      2
                    </span>
                    Realiza la transferencia por el valor del plan/clase.
                  </p>
                  <p className="flex items-center gap-3 text-slate-300 font-bold">
                    <span className="w-6 h-6 bg-primary/20 text-primary rounded-lg flex items-center justify-center text-[10px] font-black italic">
                      3
                    </span>
                    Sube el comprobante aquí abajo para validar.
                  </p>
                </div>
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="payment-file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="payment-file"
                  className={`w-full aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden relative
                    ${file ? 'border-primary bg-primary/5' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800'}
                  `}
                >
                  {file ? (
                    <>
                      {file.type === 'application/pdf' ? (
                        <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/30">
                              <span className="font-black text-xl">PDF</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{file.name}</span>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={previewUrl || ''}
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-cover opacity-40"
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <ImageIcon className="w-10 h-10 text-primary" />
                        <span className="text-sm font-bold text-white">{file.name}</span>
                        <span className="text-[10px] text-primary uppercase font-black">
                          Click para cambiar
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-500" />
                      <span className="text-sm font-bold text-slate-400">
                        Seleccionar Comprobante
                      </span>
                      <span className="text-[10px] text-slate-600 uppercase font-black">
                        JPG, PNG, WEBP, PDF (Máx 10MB)
                      </span>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl
                  ${
                    !file || uploading
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'
                  }
                `}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Subiendo ({Math.round(progress)}%)
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Confirmar Envío
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
