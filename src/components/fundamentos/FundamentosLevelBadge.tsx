import React from 'react';
import { FundamentosLevel } from '../../types/fundamentos.types';

interface Props {
  level: FundamentosLevel;
  className?: string;
}

export function FundamentosLevelBadge({ level, className = '' }: Props) {
  const styles = {
    Principiante: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Intermedio: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    Avanzado: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border animate-pulse ${styles[level]} ${className}`}>
      {level}
    </span>
  );
}
