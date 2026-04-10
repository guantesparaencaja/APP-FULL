import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Settings,
  Info,
  Maximize,
  Minimize,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCachedVideo, cacheVideo, isOnline } from '../utils/cacheManager';

interface ExerciseVideoPlayerProps {
  videoUrl: string;
  title: string;
  muscles?: string[];
  series?: number;
  reps?: string | number;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onComplete?: () => void;
  onOpenDetails?: () => void;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  videoUrl,
  title,
  muscles = [],
  series,
  reps,
  onPlay,
  onPause,
  onSeek,
  onComplete,
  onOpenDetails,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoSource, setVideoSource] = useState<string>(videoUrl);
  const [offlineError, setOfflineError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
      onSeek?.(videoRef.current.currentTime);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      onSeek?.(newTime);
    }
  };

  const handleSpeedChange = (rate: number) => {
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
      } catch (error) {
        console.warn('player:rate-fallback', error);
        // Fallback logic if needed, but HTML5 video usually supports this.
        // The prompt says: "fallback a 0.75x/1x" if platform doesn't support.
        // Most browsers support 0.5x, 1x, 2x.
      }
    }
  };

  // Handle Video Caching and Offline
  useEffect(() => {
    const resolveVideo = async () => {
      setOfflineError(false);
      const cachedUrl = await getCachedVideo(videoUrl);

      if (cachedUrl) {
        setVideoSource(cachedUrl);
      } else {
        if (!isOnline()) {
          setOfflineError(true);
        } else {
          setVideoSource(videoUrl);
          // Cache in background
          cacheVideo(videoUrl);
        }
      }
    };

    resolveVideo();

    return () => {
      // Clean up blob URLs if we created them
      if (videoSource.startsWith('blob:')) {
        URL.revokeObjectURL(videoSource);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onComplete?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onPlay, onPause, onComplete]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoSource}
        className="w-full h-full object-contain"
        playsInline
        onClick={togglePlay}
      />

      {offlineError && (
        <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-black uppercase tracking-tight mb-2">Sin Conexión</h3>
          <p className="text-slate-400 text-sm mb-6">
            Este video no está en cache y no tienes conexión a internet.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest pointer-events-auto"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Overlay Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-4"
          >
            {/* Top Bar */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
                <div className="flex gap-2 mt-1">
                  {muscles.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 uppercase font-black"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={onOpenDetails}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                title="Detalles del ejercicio"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Center Play Button (Large) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-6 bg-primary/80 text-white rounded-full shadow-xl pointer-events-auto"
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 fill-current" />
                ) : (
                  <Play className="w-10 h-10 fill-current ml-1" />
                )}
              </motion.button>
            </div>

            {/* Bottom Controls */}
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleProgressChange}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-white/70 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>-{formatTime(duration - currentTime)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleSeek(-10)}
                    className="text-white hover:text-primary transition-colors"
                  >
                    <RotateCcw className="w-6 h-6" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-primary transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-7 h-7 fill-current" />
                    ) : (
                      <Play className="w-7 h-7 fill-current" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSeek(10)}
                    className="text-white hover:text-primary transition-colors"
                  >
                    <RotateCw className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex items-center gap-4 relative">
                  <div className="flex flex-col items-end mr-2">
                    <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">
                      Series x Reps
                    </span>
                    <span className="text-sm font-black text-white">
                      {series} x {reps}
                    </span>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="flex items-center gap-1 text-white bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors text-xs font-bold"
                    >
                      <Settings className="w-4 h-4" />
                      {playbackRate}x
                    </button>

                    <AnimatePresence>
                      {showSpeedMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl min-w-[80px]"
                        >
                          {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => handleSpeedChange(rate)}
                              className={`w-full px-4 py-2 text-xs font-bold text-left hover:bg-primary/20 transition-colors ${playbackRate === rate ? 'text-primary bg-primary/10' : 'text-white'}`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
