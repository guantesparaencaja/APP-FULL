import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'h-9 w-9', icon: 'h-6 w-6', text: 'text-base' },
  md: { box: 'h-12 w-12', icon: 'h-8 w-8', text: 'text-xl' },
  lg: { box: 'h-20 w-20', icon: 'h-14 w-14', text: 'text-4xl' },
};

/** Marca GPTE: escudo, impacto y guante estilizado en SVG, sin imágenes externas. */
export function BrandMark({ size = 'md', showName = false, className = '' }: BrandMarkProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img className={`${s.box} shrink-0 rounded-xl object-contain shadow-[0_0_22px_rgba(34,211,238,0.28)]`} src="/gpte-logo-elegido.png" alt="" aria-hidden="true" />
      {showName && <span className={`${s.text} font-black italic uppercase tracking-[-0.08em] text-white`}>GPTE</span>}
    </span>
  );
}
