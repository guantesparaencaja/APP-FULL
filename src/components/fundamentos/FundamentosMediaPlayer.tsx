import React, { useEffect, useRef, useState } from 'react';
import { Gauge, Play } from 'lucide-react';
import { FundamentosVideo } from '../../types/fundamentos.types';

interface Props {
  video: FundamentosVideo;
  className?: string;
}

const SPEEDS = [0.5, 1];

function isDirectVideoSource(url: string) {
  return /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(url) || /drive\.google\.com\/uc\?/i.test(url);
}

export function FundamentosMediaPlayer({ video, className = '' }: Props) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const directSource = isDirectVideoSource(video.videoUrl);

  useEffect(() => {
    if (mediaRef.current) mediaRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  if (!directSource) {
    return (
      <div className={`relative h-full w-full bg-black ${className}`}>
        <iframe
          src={video.videoUrl}
          title={video.title}
          className="h-full w-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
        <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/75 px-3 py-2 text-[11px] text-slate-300">
          Para activar cámara lenta, convierte este enlace a MP4 o WebM directo.
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full bg-black ${className}`}>
      <video
        ref={mediaRef}
        src={video.videoUrl}
        className="h-full w-full object-contain"
        controls
        playsInline
        preload="metadata"
        poster={video.thumbnailUrl}
      >
        Tu navegador no puede reproducir este video.
      </video>
      <div className="absolute bottom-14 left-3 flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1 backdrop-blur-md">
        <Gauge className="ml-2 h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => setPlaybackRate(speed)}
            aria-label={`Velocidad ${speed === 0.5 ? 'lenta' : 'normal'}`}
            aria-pressed={playbackRate === speed}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition-colors ${
              playbackRate === speed ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            {speed === 0.5 ? 'Lenta 0.5×' : 'Normal 1×'}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 p-2 text-primary">
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </div>
    </div>
  );
}
