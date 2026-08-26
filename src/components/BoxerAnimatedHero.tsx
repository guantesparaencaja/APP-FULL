import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface Props {
  src?: string;
  alt?: string;
  height?: string;
}

export function BoxerAnimatedHero({ src = '/boxer-character.png', alt = 'Boxeador', height = '320px' }: Props) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl" style={{ height }}>
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-slate-900 to-indigo-900/30" />

      <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/15 rounded-full blur-3xl" />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '1000px',
        }}
      >
        <motion.div
          animate={{
            rotateY: mousePos.x * 0.5,
            rotateX: -mousePos.y * 0.5,
            y: [0, -8, 0],
          }}
          transition={{
            y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            rotateY: { duration: 0.1 },
            rotateX: { duration: 0.1 },
          }}
          style={{
            transformStyle: 'preserve-3d',
            width: '70%',
            height: '90%',
          }}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(239,68,68,0.3)]"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.2))',
            }}
          />
        </motion.div>
      </motion.div>

      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-red-400/40 rounded-full"
          initial={{
            x: `${15 + i * 14}%`,
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: [100, -20],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}

      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-slate-950/80 to-transparent" />
    </div>
  );
}
