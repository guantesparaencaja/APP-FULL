import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface ExerciseRatingProps {
  value?: number;
  onChange: (rating: number) => Promise<void>;
}

/** Rating owned by the member: one value from 1 to 5, with no admin actions. */
export function ExerciseRating({ value, onChange }: ExerciseRatingProps) {
  const [saving, setSaving] = useState(false);

  const rate = async (rating: number) => {
    if (saving) return;
    setSaving(true);
    try {
      await onChange(rating);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2" aria-label="Califica este ejercicio de 1 a 5 estrellas">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Qué te pareció?</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrella${star === 1 ? '' : 's'}`}
            disabled={saving}
            onClick={() => rate(star)}
            className="p-0.5 text-amber-400 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star className="h-4 w-4" fill={(value || 0) >= star ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      {value ? <span className="text-[10px] font-bold text-slate-400">{value}/5</span> : null}
    </div>
  );
}
