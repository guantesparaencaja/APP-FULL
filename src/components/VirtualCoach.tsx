import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, Rewind, FastForward, CheckCircle2, Clock, Volume2, VolumeX } from 'lucide-react';
import { getYouTubeEmbedUrl } from '../services/geminiService';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest: number;
  description?: string;
  youtube_search_term?: string;
  video_url?: string;
  muscle_group?: string;
}

interface VirtualCoachProps {
  exercises: Exercise[];
  onClose: () => void;
}

export function VirtualCoach({ exercises, onClose }: VirtualCoachProps) {
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef<HTMLIFrameElement>(null);
  const currentEx = exercises[currentExIndex];

  // Motivational messages
  const messages = [
    "¡Vamos, tú puedes!",
    "Mantén la postura correcta.",
    "Respira profundo, controla el movimiento.",
    "¡Un esfuerzo más!",
    "Concéntrate en el músculo que estás trabajando."
  ];
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  useEffect(() => {
    let interval: any;
    if (isResting && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isResting && timeLeft === 0) {
      setIsResting(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      if (!isMuted) audio.play().catch(e => console.log(e));
    }
    return () => clearInterval(interval);
  }, [isResting, timeLeft, isMuted]);

  useEffect(() => {
    // Change motivational message every 10 seconds
    const msgInterval = setInterval(() => {
      setCurrentMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, 10000);
    return () => clearInterval(msgInterval);
  }, []);

  const handleNextSet = () => {
    if (currentSet < currentEx.sets) {
      setCurrentSet(prev => prev + 1);
      setTimeLeft(currentEx.rest || 60);
      setIsResting(true);
    } else {
      handleNextExercise();
    }
  };

  const handleNextExercise = () => {
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex(prev => prev + 1);
      setCurrentSet(1);
      setTimeLeft(currentEx.rest || 60);
      setIsResting(true);
    } else {
      alert("¡Entrenamiento Completado! 🎉");
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((currentExIndex * 100) + ((currentSet / currentEx.sets) * 100)) / exercises.length;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-display text-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div>
          <h2 className="font-bold text-lg text-primary">Entrenador Virtual</h2>
          <p className="text-xs text-slate-400">Ejercicio {currentExIndex + 1} de {exercises.length}</p>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800 w-full">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col pb-20">
        {/* Video Area */}
        <div className="relative aspect-video bg-slate-900 w-full shrink-0">
          {(() => {
            const videoSrc = currentEx.video_url;
            const isGif = videoSrc?.toLowerCase().endsWith('.gif');
            return videoSrc ? (
              isGif ? (
                <img 
                  src={videoSrc} 
                  alt={currentEx.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const fallback = document.createElement('div');
                      fallback.className = 'absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center';
                      fallback.innerHTML = '<p class="text-sm font-bold mb-2">Animación no disponible</p><p class="text-xs">El enlace original ha expirado. Por favor, haz clic en "Regenerar Mi Rutina".</p>';
                      target.parentElement.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <video 
                  ref={(el) => {
                    if (el) el.playbackRate = playbackRate;
                  }}
                  src={videoSrc} 
                  className="w-full h-full object-cover"
                  controls={false}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const fallback = document.createElement('div');
                      fallback.className = 'absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 text-center';
                      fallback.innerHTML = '<p class="text-sm font-bold mb-2">Video no disponible</p><p class="text-xs">El enlace original ha expirado. Por favor, haz clic en "Regenerar Mi Rutina".</p>';
                      target.parentElement.appendChild(fallback);
                    }
                  }}
                />
              )
            ) : currentEx.youtube_search_term ? (
              <iframe 
                ref={videoRef}
                src={`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(currentEx.youtube_search_term)}&autoplay=1&mute=${isMuted ? 1 : 0}`} 
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <p>Video no disponible</p>
              </div>
            );
          })()}
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-white hover:text-primary">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex gap-4">
              <button className="text-white hover:text-primary text-xs font-bold px-2" onClick={() => setPlaybackRate(0.5)}>0.5x</button>
              <button className="text-white hover:text-primary text-xs font-bold px-2" onClick={() => setPlaybackRate(1)}>1x</button>
            </div>
          </div>
        </div>

        {/* Exercise Info */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{currentEx.name}</h1>
              <p className="text-sm text-primary font-bold uppercase tracking-wider">
                {currentEx.muscle_group || 'Ejercicio'} • Serie {currentSet} de {currentEx.sets}
              </p>
            </div>
            <div className="bg-slate-800 px-4 py-2 rounded-xl text-center border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Objetivo</p>
              <p className="text-xl font-bold text-white">{currentEx.reps} Reps</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 mb-6 flex-1">{currentEx.description || 'Sigue el video para realizar la técnica correcta.'}</p>

          {/* Virtual Coach Message */}
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <p className="text-sm font-bold text-primary italic">"{currentMessage}"</p>
          </div>

          {/* Action Area */}
          <div className="mt-auto pt-4 shrink-0">
            {isResting ? (
              <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700 animate-in zoom-in-95">
                <Clock className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-slate-400 font-bold uppercase mb-1">Tiempo de Descanso</p>
                <p className="text-5xl font-bold text-white mb-4 font-mono">{formatTime(timeLeft)}</p>
                <button 
                  onClick={() => setTimeLeft(0)}
                  className="text-xs font-bold text-slate-400 hover:text-white underline"
                >
                  Saltar descanso
                </button>
              </div>
            ) : (
              <button 
                onClick={handleNextSet}
                className="w-full bg-primary text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all text-lg"
              >
                <CheckCircle2 className="w-6 h-6" />
                {currentSet === currentEx.sets ? 'Completar Ejercicio' : 'Completar Serie'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
