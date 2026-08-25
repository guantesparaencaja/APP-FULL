/**
 * animations.ts — Variantes de animación reutilizables (Framer Motion).
 * Usa estas variantes en todas las secciones para mantener una
 * identidad de movimiento consistente en toda la app.
 */
import type { Variants, Transition } from 'motion/react';

export const spring: Transition = { type: 'spring', stiffness: 260, damping: 24 };
export const springSoft: Transition = { type: 'spring', stiffness: 180, damping: 22 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: spring },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export const press = {
  whileHover: { scale: 1.04 },
  whileTap: { scale: 0.94 },
};

export const liftCard = {
  whileHover: { y: -6, scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: spring,
};

/** Variante de entrada de página (usada en el Layout para cada ruta). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};