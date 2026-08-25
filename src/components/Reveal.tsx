/**
 * Reveal.tsx — Envuelve contenido para revelarlo con scroll (whileInView).
 * Uso: <Reveal delay={0.1}><div>...</div></Reveal>
 */
import { motion } from 'motion/react';
import React from 'react';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** Dirección de entrada */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function Reveal({ children, delay = 0, className, direction = 'up' }: RevealProps) {
  const offset = 24;
  const variants = {
    hidden: {
      opacity: 0,
      ...(direction === 'up' && { y: offset }),
      ...(direction === 'down' && { y: -offset }),
      ...(direction === 'left' && { x: offset }),
      ...(direction === 'right' && { x: -offset }),
    },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const, delay },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}