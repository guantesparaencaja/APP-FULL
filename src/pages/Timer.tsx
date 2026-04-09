import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, RefreshCw, Volume2, VolumeX, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Phase = 'IDLE' | 'PREPARE' | 'WORK' | 'REST' | 'FINISHED';

export function Timer() {
  const [config, setConfig] = useState({
    rounds: 3,
    roundLength: 180, // seconds
    restLength: 60, // seconds
    prepareLength: 10, // seconds
  });

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(config.roundLength);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio synthesis for voice
  const speak = (text: string, energetic: boolean = false) => {
    if (!soundEnabled || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = energetic ? 1.25 : 1.1;
    utterance.pitch = energetic ? 1.3 : 1.0;
    
    // Attempt to use a more energetic/dynamic voice if available
    const voices = window.speechSynthesis.getVoices();
    const esVoices = voices.filter(v => v.lang.startsWith('es-'));
    if (esVoices.length > 0) {
      // Try to pick a premium or non-default voice for variety if possible
      utterance.voice = esVoices.find(v => v.name.includes('Premium') || v.name.includes('Google')) || esVoices[0];
    }

    window.speechSynthesis.speak(utterance);
  };

  const playBeep = (type: 'high' | 'low') => {
    if (!soundEnabled) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(type === 'high' ? 880 : 440, ctx.currentTime);
    
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  };

  // Ensure voices are loaded
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (phase === 'IDLE') {
      setTimeLeft(config.roundLength);
      setCurrentRound(1);
    }
  }, [config, phase]);

  useEffect(() => {
    if (phase === 'IDLE' || phase === 'FINISHED') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handlePhaseTransition();
          return 0;
        }
        
        // Announce 10 seconds remaining
        if (prev === 11 && phase === 'WORK') {
          speak('10 segundos', true);
        } else if (prev > 15 && prev % 30 === 0 && phase === 'WORK') {
          // Motivational phrases every 30 seconds
          const frases = [
            "¡Tú puedes!",
            "¡No te rindas, falta poco!",
            "¡Gánale a tu mente!",
            "¡No se vale perder!",
            "¡No pain, no gain!",
            "¡Just do it!",
            "¡Con toda la fuerza!",
            "¡Sigue adelante!",
            "¡Un esfuerzo más!"
          ];
          const aleatoria = frases[Math.floor(Math.random() * frases.length)];
          speak(aleatoria, true);
        }
        
        // 3-2-1 Beeps
        if (prev > 1 && prev <= 4) {
          playBeep('low');
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentRound, config]); // Re-run effect when phase changes to get new closures

  const handlePhaseTransition = () => {
    if (phase === 'PREPARE') {
      setPhase('WORK');
      setTimeLeft(config.roundLength);
      playBeep('high');
      speak(`Round ${currentRound}. A pelear!`);
    } else if (phase === 'WORK') {
      if (currentRound >= config.rounds) {
        setPhase('FINISHED');
        setTimeLeft(0);
        speak('Entrenamiento completado. ¡Buen trabajo!');
      } else {
        setPhase('REST');
        setTimeLeft(config.restLength);
        playBeep('low');
        speak('Descanso');
      }
    } else if (phase === 'REST') {
      setCurrentRound((prev) => prev + 1);
      setPhase('WORK');
      setTimeLeft(config.roundLength);
      playBeep('high');
      speak(`Round ${currentRound + 1}.`);
    }
  };

  const toggleTimer = () => {
    if (phase === 'IDLE') {
      setShowConfig(false);
      setPhase('PREPARE');
      setTimeLeft(config.prepareLength);
      speak('Prepárate');
    } else if (phase === 'FINISHED') {
      setPhase('IDLE');
      setShowConfig(true);
    } else {
      // Stop/Reset
      setPhase('IDLE');
      setShowConfig(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'PREPARE': return 'text-yellow-500';
      case 'WORK': return 'text-emerald-500';
      case 'REST': return 'text-blue-500';
      case 'FINISHED': return 'text-primary';
      default: return 'text-white';
    }
  };

  const adjustConfig = (key: keyof typeof config, amount: number) => {
    setConfig(prev => ({
      ...prev,
      [key]: Math.max(1, prev[key] + amount)
    }));
  };

  return (
    <div className="flex flex-col min-h-full items-center justify-center -mt-10">
      <div className="w-full max-w-md">
        
        {/* Superior controls */}
        <div className="flex justify-between items-center mb-8 px-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-3 rounded-full transition-colors ${showConfig ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Timer Display */}
        <div className="relative mb-12 flex flex-col items-center">
          <motion.div 
            animate={{ scale: phase === 'WORK' ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 1, repeat: Infinity }}
            className={`text-8xl md:text-9xl font-black tracking-tighter tabular-nums ${getPhaseColor()} transition-colors duration-500 font-mono drop-shadow-[0_0_30px_rgba(0,0,0,0.3)]`}
          >
            {formatTime(timeLeft)}
          </motion.div>
          
          <div className="flex flex-col items-center mt-4">
            <h2 className={`text-2xl font-black uppercase tracking-[0.2em] ${getPhaseColor()}`}>
              {phase === 'IDLE' ? 'LISTO' : 
               phase === 'PREPARE' ? 'PREPÁRATE' : 
               phase === 'WORK' ? 'TRABAJO' : 
               phase === 'REST' ? 'DESCANSO' : 'TERMINADO'}
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest mt-2">
              Round {currentRound} / {config.rounds}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-6 mb-12">
          <button
            onClick={toggleTimer}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              phase === 'IDLE' || phase === 'FINISHED'
                ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30' 
                : 'bg-red-500 hover:bg-red-400 shadow-red-500/30'
            }`}
          >
            {phase === 'IDLE' || phase === 'FINISHED' ? (
              <Play className="w-12 h-12 text-white ml-2 fill-current" />
            ) : (
              <Square className="w-10 h-10 text-white fill-current" />
            )}
          </button>
          
          {phase !== 'IDLE' && (
            <button
              onClick={() => {
                setPhase('IDLE');
                setShowConfig(true);
              }}
              className="w-28 h-28 rounded-full bg-slate-800 flex items-center justify-center shadow-xl hover:bg-slate-700 transition-all text-slate-300"
            >
              <RefreshCw className="w-10 h-10" />
            </button>
          )}
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && phase === 'IDLE' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                
                {/* Rounds */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase tracking-widest text-xs">Total Rounds</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => adjustConfig('rounds', -1)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-black text-xl">{config.rounds}</span>
                    <button onClick={() => adjustConfig('rounds', 1)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Round Time */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase tracking-widest text-xs">Tiempo de Round</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => adjustConfig('roundLength', -10)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-black text-xl">{formatTime(config.roundLength)}</span>
                    <button onClick={() => adjustConfig('roundLength', 10)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Rest Time */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase tracking-widest text-xs">Tiempo de Descanso</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => adjustConfig('restLength', -5)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-16 text-center font-black text-xl">{formatTime(config.restLength)}</span>
                    <button onClick={() => adjustConfig('restLength', 5)} className="p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
