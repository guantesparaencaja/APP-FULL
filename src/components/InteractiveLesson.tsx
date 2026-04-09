import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, CheckCircle2, ChevronRight, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

interface LessonStep {
  title: string;
  description: string;
  duration: number; // in seconds
  type: 'video' | 'practice' | 'quiz';
  video_url?: string;
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
  };
}

interface InteractiveLessonProps {
  title: string;
  level: number;
  steps: LessonStep[];
  onClose: () => void;
  onComplete: () => void;
}

export function InteractiveLesson({ title, level, steps, onClose, onComplete }: InteractiveLessonProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<'correct' | 'incorrect' | null>(null);
  
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (currentStep.type === 'practice') {
      setTimeLeft(currentStep.duration);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
    setQuizAnswer(null);
    setQuizResult(null);
  }, [currentStepIndex, currentStep]);

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      if (!isMuted) audio.play().catch(e => console.log(e));
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isMuted]);

  const handleNext = () => {
    if (currentStep.type === 'quiz' && quizResult !== 'correct') {
      alert("Debes responder correctamente para avanzar.");
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleQuizAnswer = (index: number) => {
    setQuizAnswer(index);
    if (currentStep.quiz && index === currentStep.quiz.correctAnswer) {
      setQuizResult('correct');
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'); // Success sound
      if (!isMuted) audio.play().catch(e => console.log(e));
    } else {
      setQuizResult('incorrect');
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3'); // Error sound
      if (!isMuted) audio.play().catch(e => console.log(e));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((currentStepIndex) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col font-display text-white">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div>
          <h2 className="font-bold text-lg text-primary">{title}</h2>
          <p className="text-xs text-slate-400">Nivel {level} • Paso {currentStepIndex + 1} de {steps.length}</p>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-slate-400 hover:text-primary">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800 w-full">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex flex-col p-6">
        <div className="mb-6">
          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block ${
            currentStep.type === 'video' ? 'bg-blue-500/20 text-blue-400' :
            currentStep.type === 'practice' ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            {currentStep.type === 'video' ? 'Teoría / Demostración' :
             currentStep.type === 'practice' ? 'Práctica' : 'Quiz de Conocimiento'}
          </span>
          <h1 className="text-3xl font-bold text-white mb-2">{currentStep.title}</h1>
          <p className="text-slate-300">{currentStep.description}</p>
        </div>

        {currentStep.type === 'video' && currentStep.video_url && (
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 mb-6">
            <video 
              src={currentStep.video_url} 
              controls 
              autoPlay 
              muted={isMuted}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {currentStep.type === 'practice' && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className={`w-48 h-48 rounded-full flex items-center justify-center border-4 shadow-[0_0_40px_rgba(0,119,255,0.2)] transition-colors duration-500 ${
              isActive ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-800'
            }`}>
              <span className="text-6xl font-mono font-bold text-white">
                {formatTime(timeLeft)}
              </span>
            </div>
            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setIsActive(!isActive)}
                className="bg-slate-800 text-white p-4 rounded-full hover:bg-slate-700 transition-colors"
              >
                {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
            </div>
          </div>
        )}

        {currentStep.type === 'quiz' && currentStep.quiz && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold mb-6">{currentStep.quiz.question}</h3>
              <div className="space-y-3">
                {currentStep.quiz.options.map((option, idx) => {
                  const isSelected = quizAnswer === idx;
                  const isCorrect = idx === currentStep.quiz?.correctAnswer;
                  
                  let btnClass = "w-full text-left p-4 rounded-xl border font-medium transition-all ";
                  
                  if (quizResult && isCorrect) {
                    btnClass += "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                  } else if (quizResult && isSelected && !isCorrect) {
                    btnClass += "bg-red-500/20 border-red-500 text-red-400";
                  } else if (isSelected) {
                    btnClass += "bg-primary/20 border-primary text-white";
                  } else {
                    btnClass += "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500";
                  }

                  return (
                    <button 
                      key={idx}
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={quizResult === 'correct'}
                      className={btnClass}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              
              {quizResult === 'incorrect' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  Respuesta incorrecta. Intenta de nuevo.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto pt-6">
          <button 
            onClick={handleNext}
            disabled={currentStep.type === 'practice' && timeLeft > 0 || (currentStep.type === 'quiz' && quizResult !== 'correct')}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStepIndex === steps.length - 1 ? (
              <>Completar Lección <CheckCircle2 className="w-5 h-5" /></>
            ) : (
              <>Siguiente Paso <ChevronRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
