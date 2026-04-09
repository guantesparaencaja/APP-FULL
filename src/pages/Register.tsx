import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { UserPlus, Mail, Lock, User, Scale, Hand, Target, ArrowLeft, ArrowRight, Ruler, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { sendEmail } from '../lib/email';

export function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    weight: '',
    height: '',
    age: '',
    dominant_hand: 'Derecha',
    boxing_goal: 'Desarrollar habilidades de autodefensa y confianza',
    fitness_goal: 'Recomposición corporal y pérdida de grasa',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigate(-1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      if (step === 1 && formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      setError('');
      handleNext();
      return;
    }
    
    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden.');
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userData = {
        name: formData.name,
        email: formData.email,
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        age: parseInt(formData.age),
        dominant_hand: formData.dominant_hand,
        boxing_goal: formData.boxing_goal,
        fitness_goal: formData.fitness_goal,
        goal: formData.fitness_goal,
        role: 'student',
        streak: 0,
        lives: 3,
        license_level: 1,
        profile_pic: null,
        is_new_user: false,
        tutorial_completed: false
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // ✅ Correo de bienvenida via colección 'mail' (Firebase Trigger Email)
      try {
        await sendEmail(
          formData.email,
          '\u00a1Bienvenido a Guantes Para Encajar! \U0001f94a',
          `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><style>
            body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;margin:0;padding:0;}
            .container{max-width:520px;margin:40px auto;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);}
            .header{background:linear-gradient(135deg,#0077ff,#0040cc);padding:32px 32px 24px;text-align:center;}
            .header h1{margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;color:#fff;}
            .header p{margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);}
            .body{padding:32px;}
            .body h2{font-size:20px;font-weight:800;margin:0 0 12px;color:#fff;}
            .body p{font-size:14px;line-height:1.7;color:#94a3b8;margin:0 0 16px;}
            .step{display:flex;align-items:flex-start;gap:12px;margin:12px 0;padding:12px;background:rgba(0,119,255,0.08);border-radius:12px;border:1px solid rgba(0,119,255,0.15);}
            .step-num{width:28px;height:28px;background:#0077ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#fff;flex-shrink:0;}
            .step-text{font-size:13px;color:#cbd5e1;}
            .footer{padding:20px 32px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;font-size:11px;color:#475569;}
            .footer a{color:#0077ff;text-decoration:none;}
          </style></head>
          <body>
          <div class="container">
            <div class="header">
              <h1>\U0001f94a Guantes Para Encajar</h1>
              <p>Tu academia de boxeo personalizada</p>
            </div>
            <div class="body">
              <h2>\u00a1Hola, ${formData.name}!</h2>
              <p>Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte en la familia GPTE.</p>
              
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-text"><b>Elige tu plan</b> — Selecciona el plan que mejor se adapte a tus objetivos en la secci\u00f3n Planes.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-text"><b>Confirma tu pago</b> — Sube tu comprobante de pago para activar tu acceso.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-text"><b>Reserva tu clase</b> — Ve al Calendario y reserva tu primera clase con el instructor.</div>
              </div>
              
              <p style="margin-top:20px;">Si tienes alguna duda, esc\u00edbenos por WhatsApp: <br><b style="color:#25D366;">+57 302 202 8477</b></p>
            </div>
            <div class="footer">
              Guantes Para Encajar | <a href="mailto:guantesparaencajar@gmail.com">guantesparaencajar@gmail.com</a>
              <br>Medell\u00edn, Colombia
            </div>
          </div>
          </body></html>
          `
        );
      } catch (emailErr) {
        console.warn('Correo de bienvenida no enviado (no cr\u00edtico):', emailErr);
      }

      setUser({ id: user.uid, ...userData } as any);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'Error al registrar usuario. Intenta de nuevo.';
      if (err.message === 'Las contraseñas no coinciden.') errorMsg = err.message;
      else if (err.code === 'auth/email-already-in-use') errorMsg = 'El correo ya está registrado.';
      else if (err.code === 'auth/weak-password') errorMsg = 'La contraseña es muy corta (mínimo 6 caracteres).';
      else if (err.code === 'auth/invalid-email') errorMsg = 'El formato del correo es inválido.';
      else if (err.code === 'auth/network-request-failed') errorMsg = 'Error de conexión. Revisa tu internet.';
      setError(errorMsg);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased pb-12">
      <div className="flex items-center bg-transparent p-4 justify-between z-10">
        <div className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={handleBack}>
          <ArrowLeft className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center pr-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Paso {step} de 3</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-4 pb-4 px-6">
        <h1 className="text-slate-100 tracking-tight text-3xl font-bold leading-tight text-center">
          {step === 1 && <span>Únete a GUANTES</span>}
          {step === 2 && <span>Tu Perfil Físico</span>}
          {step === 3 && <span>Tus Objetivos</span>}
        </h1>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 px-6 pt-4 pb-12 flex-1">
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <div style={{ display: step === 1 ? 'flex' : 'none' }} className="flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="Tu nombre" 
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="tu@email.com" 
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 pr-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="••••••••" 
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 pr-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="••••••••" 
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button type="button" onClick={handleNext} className="mt-6 w-full bg-primary text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 neon-glow">
              <span>SIGUIENTE</span>
              <ArrowRight className="w-5 h-5" />
            </button>
        </div>

        <div style={{ display: step === 2 ? 'flex' : 'none' }} className="flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Edad</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="number" 
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="Ej: 25" 
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Peso Actual (kg)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Scale className="w-5 h-5" />
                </div>
                <input 
                  type="number" 
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="Ej: 75" 
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Altura (cm)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Ruler className="w-5 h-5" />
                </div>
                <input 
                  type="number" 
                  value={formData.height}
                  onChange={(e) => setFormData({...formData, height: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                  placeholder="Ej: 175" 
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Mano Dominante</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Hand className="w-5 h-5" />
                </div>
                <select 
                  value={formData.dominant_hand}
                  onChange={(e) => setFormData({...formData, dominant_hand: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 transition-all"
                >
                  <option value="Derecha">Derecha</option>
                  <option value="Izquierda">Izquierda</option>
                  <option value="Ambidiestra">Ambidiestra</option>
                </select>
              </div>
            </div>
            
            <button type="button" onClick={handleNext} className="mt-6 w-full bg-primary text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 neon-glow">
              <span>SIGUIENTE</span>
              <ArrowRight className="w-5 h-5" />
            </button>
        </div>

        <div style={{ display: step === 3 ? 'flex' : 'none' }} className="flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Objetivo en Boxeo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Target className="w-5 h-5" />
                </div>
                <select 
                  value={formData.boxing_goal}
                  onChange={(e) => setFormData({...formData, boxing_goal: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 transition-all"
                >
                  <option value="Desarrollar habilidades de autodefensa y confianza">Desarrollar habilidades de autodefensa y confianza</option>
                  <option value="Entrenamiento recreativo y fitness deportivo">Entrenamiento recreativo y fitness deportivo</option>
                  <option value="Entrenamiento técnico competitivo">Entrenamiento técnico competitivo</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Objetivo Físico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Target className="w-5 h-5" />
                </div>
                <select 
                  value={formData.fitness_goal}
                  onChange={(e) => setFormData({...formData, fitness_goal: e.target.value})}
                  className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 transition-all"
                >
                  <option value="Recomposición corporal y pérdida de grasa">Recomposición corporal y pérdida de grasa</option>
                  <option value="Aumento de masa muscular hipertrófica">Aumento de masa muscular hipertrófica</option>
                  <option value="Acondicionamiento físico general y mantenimiento">Acondicionamiento físico general y mantenimiento</option>
                </select>
              </div>
            </div>

            <button type="submit" className="mt-6 w-full bg-primary text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 neon-glow">
              <span>FINALIZAR REGISTRO</span>
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
      </form>
    </div>
  );
}
