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
      <span
        className={`${s.box} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-cyan-300/50 bg-gradient-to-br from-slate-950 via-[#241044] to-[#071d3f] shadow-[0_0_22px_rgba(34,211,238,0.28)]`}
        aria-hidden="true"
      >
        <svg className={`${s.icon} relative z-10`} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4 54 12v17c0 14-8.8 24.8-22 31C18.8 53.8 10 43 10 29V12L32 4Z" fill="#120b29" stroke="#22D3EE" strokeWidth="2.5" />
          <path d="M22 22h8v-6h6v6h7v7h-7v5h9v7H36v8h-8v-8h-9v-7h9v-5h-6v-7Z" fill="#F8FAFC" />
          <path d="M36 16h7v6h-7zM45 24h6v7h-6z" fill="#A855F7" />
          <path d="M15 14 32 8l17 6" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-400/10 to-transparent" />
      </span>
      {showName && <span className={`${s.text} font-black italic uppercase tracking-[-0.08em] text-white`}>GPTE</span>}
    </span>
  );
}
