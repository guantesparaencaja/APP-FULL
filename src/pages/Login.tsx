import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { LogIn, Mail, Lock, ArrowLeft, UserPlus, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { Modal } from '../components/Modal';
export function Login() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loginType, setLoginType] = useState<'Email' | 'Phone'>('Email');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotVerifyInput, setForgotVerifyInput] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1=email, 2=confirmación doble
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [promptEmail, setPromptEmail] = useState('');
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    // Handle Email Link Sign-in
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let emailForLink = window.localStorage.getItem('emailForSignIn');
      if (!emailForLink) {
        setShowEmailPrompt(true);
        return;
      }
      handleEmailLinkSignIn(emailForLink);
    }
  }, [navigate, setUser]);

  const handleEmailLinkSignIn = async (emailForLink: string) => {
    try {
      const result = await signInWithEmailLink(auth, emailForLink, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setUser({ id: result.user.uid, ...userDoc.data() } as any);
        navigate('/');
      } else {
        // Create basic profile
        const userData = {
          name: result.user.displayName || 'Usuario',
          email: emailForLink,
          role: 'student',
          streak: 0,
          lives: 3,
          license_level: 1,
          is_new_user: true
        };
        await setDoc(userRef, userData);
        setUser({ id: result.user.uid, ...userData } as any);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al iniciar sesión con el enlace: ' + err.message);
    }
  };

  const handleSendSignInLink = async () => {
    if (!email) {
      setError('Ingresa tu correo primero');
      return;
    }
    
    // URL de producción corregida para el link de login
    const productionUrl = 'https://guantes-entrenamiento-de-boxeo-167463849607.us-west1.run.app/login';
    
    const actionCodeSettings = {
      url: productionUrl,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setInfo('¡Enlace enviado! Revisa tu correo para entrar sin contraseña.');
      setError('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-continue-uri') {
        setError('Error: El dominio de producción no está autorizado en Firebase. Por favor, contacta al administrador.');
      } else {
        setError('Error al enviar enlace: ' + err.message);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (loginType === 'Phone') {
        setError('El inicio de sesión por teléfono no está disponible por ahora.');
        return;
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        setUser({ id: userCredential.user.uid, ...userDoc.data() } as any);
        navigate('/');
      } else {
        // Create basic profile if it doesn't exist in Firestore
        const userData = {
          name: 'Usuario',
          email: email,
          role: 'student',
          weight: 0,
          height: 0,
          dominant_hand: 'Derecha',
          boxing_goal: 'Aprender a defenderme',
          fitness_goal: 'Mantener peso',
          goal: 'Mantener peso',
          streak: 0,
          lives: 3,
          license_level: 1,
          profile_pic: null,
          is_new_user: true,
          tutorial_completed: false
        };
        await setDoc(userRef, userData);
        setUser({ id: userCredential.user.uid, ...userData } as any);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  const handleSocialLogin = async () => {
    try {
      let user;
      
      if (Capacitor.isNativePlatform()) {
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        const result = await signInWithCredential(auth, credential);
        user = result.user;
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        user = result.user;
      }
      
      if (!user) return;
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      let userData;
      if (!userDoc.exists()) {
        // Create new user profile
        userData = {
          name: user.displayName || 'Usuario',
          email: user.email,
          role: 'student',
          weight: 0,
          height: 0,
          dominant_hand: 'Derecha',
          boxing_goal: 'Aprender a defenderme',
          fitness_goal: 'Mantener peso',
          goal: 'Mantener peso',
          streak: 0,
          lives: 3,
          license_level: 1,
          profile_pic: user.photoURL || null,
          is_new_user: true,
          tutorial_completed: false
        };
        await setDoc(userRef, userData);
      } else {
        userData = userDoc.data();
      }
      
      setUser({ id: user.uid, ...userData } as any);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError('Error al conectar con Google: ' + err.message);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Paso 1: Verificar que reingresó su correo correctamente
      if (forgotStep === 1) {
        if (!forgotInput) { setError('Ingresa tu correo.'); return; }
        setError('');
        setForgotStep(2);
        return;
      }
      // Paso 2: Usuario confirmó el correo — enviamos el reset
      if (forgotVerifyInput.toLowerCase().trim() !== forgotInput.toLowerCase().trim()) {
        setError('Los correos no coinciden. Vuelve a intentarlo.');
        return;
      }
      await sendPasswordResetEmail(auth, forgotInput);
      setForgotSent(true);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al enviar el correo de recuperación');
    }
  };

  if (showForgot) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 p-6 pb-12">
        <div className="flex items-center mb-8">
          <div className="text-primary flex size-10 items-center justify-center cursor-pointer" onClick={() => { setShowForgot(false); setForgotStep(1); setForgotInput(''); setForgotVerifyInput(''); setForgotSent(false); setError(''); }}>
            <ArrowLeft className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold ml-2">Recuperar Contraseña</h1>
        </div>

        {!forgotSent ? (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-5">
            {/* Indicador de pasos */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex size-7 items-center justify-center rounded-full text-xs font-black ${forgotStep >= 1 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
              <div className={`h-0.5 flex-1 ${forgotStep === 2 ? 'bg-primary' : 'bg-slate-700'}`} />
              <div className={`flex size-7 items-center justify-center rounded-full text-xs font-black ${forgotStep === 2 ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
            </div>

            {error && <p className="text-red-400 text-sm text-center font-bold bg-red-500/10 rounded-xl py-2 px-4">{error}</p>}

            {forgotStep === 1 && (
              <>
                <p className="text-slate-400 text-sm">Ingresa el correo electrónico de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Tu Correo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-10 pr-4 text-slate-100 placeholder-slate-500 outline-none transition-all"
                      placeholder="tu@correo.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 transition-all">
                  Siguiente →
                </button>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Verificación de seguridad</p>
                  <p className="text-slate-400 text-sm">Para confirmar que eres tú, ingresa tu correo nuevamente:</p>
                  <p className="text-slate-300 text-sm font-bold mt-2 bg-slate-900/50 rounded-lg px-3 py-2">{forgotInput}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Confirma tu Correo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={forgotVerifyInput}
                      onChange={(e) => setForgotVerifyInput(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-10 pr-4 text-slate-100 placeholder-slate-500 outline-none transition-all"
                      placeholder="Repite tu correo"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 transition-all">
                  Enviar enlace de recuperación
                </button>
                <button type="button" onClick={() => { setForgotStep(1); setForgotVerifyInput(''); setError(''); }} className="text-sm text-slate-400 hover:text-primary transition-colors text-center">
                  ← Cambiar correo
                </button>
              </>
            )}
          </form>
        ) : (
          <div className="text-center flex flex-col items-center justify-center flex-1 gap-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black">¡Correo Enviado!</h2>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Hemos enviado un enlace seguro a <span className="text-white font-bold">{forgotInput}</span>. Ábrelo desde tu correo para crear una nueva contraseña.
            </p>
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-left w-full max-w-xs">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">¿No lo ves?</p>
              <p className="text-slate-400 text-xs">Revisa la carpeta de <strong className="text-slate-300">Spam</strong> o <strong className="text-slate-300">Correo no deseado</strong>. El enlace expira en 1 hora.</p>
            </div>
            <button onClick={() => { setShowForgot(false); setForgotStep(1); setForgotInput(''); setForgotVerifyInput(''); setForgotSent(false); }} className="mt-4 text-primary font-bold hover:underline">
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased pb-12">
      <div className="flex items-center bg-transparent p-4 justify-between z-10">
        <div className="text-primary flex size-12 shrink-0 items-center justify-center cursor-pointer" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center pr-12">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Academia Tech</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-8 pb-4 px-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 neon-border neon-glow">
          <span className="text-primary text-5xl">🥊</span>
        </div>
        <h1 className="text-slate-100 tracking-tight text-4xl font-bold leading-tight text-center">GPTE</h1>
        <p className="text-slate-400 text-base font-normal leading-normal mt-2 text-center">Guantes para encajarte🥊</p>
      </div>

      <div className="px-6 py-4">
        <div className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-800/50 p-1 border border-slate-700">
          <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 has-[:checked]:bg-primary has-[:checked]:text-white text-slate-400 text-sm font-medium transition-all">
            <span className="truncate">Email</span>
            <input type="radio" name="login-type" value="Email" checked={loginType === 'Email'} onChange={() => setLoginType('Email')} className="hidden" />
          </label>
          <label className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 has-[:checked]:bg-primary has-[:checked]:text-white text-slate-400 text-sm font-medium transition-all">
            <span className="truncate">Teléfono</span>
            <input type="radio" name="login-type" value="Phone" checked={loginType === 'Phone'} onChange={() => setLoginType('Phone')} className="hidden" />
          </label>
        </div>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4 px-6 pt-4 flex-1">
        {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
        {info && <p className="text-emerald-500 text-sm text-center font-bold">{info}</p>}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Identificador</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Mail className="w-5 h-5" />
            </div>
            {loginType === 'Email' ? (
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                placeholder="Ingresa tu email" 
                required
              />
            ) : (
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
                placeholder="Ingresa tu número celular" 
                required
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-primary ml-1">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Lock className="w-5 h-5" />
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 pl-10 text-slate-100 placeholder-slate-500 transition-all" 
              placeholder="••••••••" 
              required
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-2">
          <button type="button" onClick={() => navigate('/register')} className="text-sm font-bold text-primary hover:text-primary/80 transition-colors">Crear cuenta nueva</button>
          <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-medium text-slate-400 hover:text-primary transition-colors">¿Olvidaste tu contraseña?</button>
        </div>

        <button type="submit" className="mt-4 w-full bg-primary text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 neon-glow">
          <span>ENTRAR</span>
          <LogIn className="w-5 h-5" />
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background-light dark:bg-background-dark px-2 text-slate-500">O continúa con</span>
          </div>
        </div>

        <button 
          type="button" 
          onClick={handleSocialLogin} 
          className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg shadow-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          <span>ENTRAR CON GOOGLE</span>
        </button>
      </form>

      {/* Email Prompt Modal for Link Sign-in */}
      <Modal
        isOpen={showEmailPrompt}
        onClose={() => setShowEmailPrompt(false)}
        title="Confirmar Email"
      >
        <div className="flex flex-col gap-4 p-4">
          <p className="text-slate-300 text-sm">Por favor, ingresa tu correo para confirmar el inicio de sesión:</p>
          <input 
            type="email" 
            value={promptEmail}
            onChange={(e) => setPromptEmail(e.target.value)}
            className="w-full bg-slate-800/30 border-slate-700 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg py-3 px-4 text-slate-100" 
            placeholder="tu@email.com" 
            required
          />
          <button
            onClick={() => {
              if (promptEmail) {
                setShowEmailPrompt(false);
                handleEmailLinkSignIn(promptEmail);
              }
            }}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Confirmar e Iniciar Sesión
          </button>
        </div>
      </Modal>
    </div>
  );
}
