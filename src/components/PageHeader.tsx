/**
 * PageHeader.tsx — Encabezado de página consistente y animado.
 * Respeta prefers-reduced-motion.
 */
import { motion, useReducedMotion } from 'motion/react';
import React from 'react';

interface PageHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function PageHeader({ emoji, title, subtitle, right }: PageHeaderProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {emoji && <span className="text-3xl leading-none" aria-hidden>{emoji}</span>}
          <div>
            <h1 className="font-black uppercase italic tracking-tighter text-2xl sm:text-3xl text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
    );
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-6 flex items-start justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        {emoji && (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="text-3xl leading-none"
            aria-hidden
          >
            {emoji}
          </motion.span>
        )}
        <div>
          <h1 className="font-black uppercase italic tracking-tighter text-2xl sm:text-3xl text-slate-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </motion.header>
  );
}
