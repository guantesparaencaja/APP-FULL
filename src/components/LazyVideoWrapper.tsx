import React, { useState, useEffect, useRef } from 'react';
import { Video } from 'lucide-react';

interface LazyVideoWrapperProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  className?: string;
}

export const LazyVideoWrapper: React.FC<LazyVideoWrapperProps> = ({ src, className, controls = true, ...props }) => {
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Load slightly before it comes into view
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className || ''} min-h-[200px] w-full bg-slate-900/10 rounded-lg flex items-center justify-center overflow-hidden`}>
      {!isVisible ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 animate-pulse">
          <Video className="w-10 h-10 mb-2 opacity-50" />
          <span className="text-xs font-bold uppercase tracking-widest">Cargando...</span>
        </div>
      ) : (
        <video 
          src={src} 
          controls={controls} 
          className="w-full h-full object-contain absolute inset-0" 
          {...props}
        />
      )}
    </div>
  );
};
