import React from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'motion/react';
import { twMerge } from 'tailwind-merge';

// Import local assets (they were copied to src/assets/avatars/)
import maleStrong from '../assets/avatars/male_strong.png';
import maleNormal from '../assets/avatars/male_normal.png';
import maleThin from '../assets/avatars/male_thin.png';
import femaleStrong from '../assets/avatars/female_strong.png';
import femaleNormal from '../assets/avatars/female_normal.png';
import femaleThin from '../assets/avatars/female_thin.png';

interface AvatarProps {
  attendedCount?: number;
  missedRecently?: boolean;
  level?: 'thin' | 'normal' | 'strong';
  gender?: 'male' | 'female';
}

export function EvolvingAvatar({
  attendedCount = 0,
  missedRecently = false,
  level: forcedLevel,
  gender: forcedGender,
}: AvatarProps) {
  const user = useStore((state) => state.user);

  if (!user && !forcedGender) return null;

  const gender = forcedGender || user?.gender || 'male';
  const planClasses = user?.classes_per_month || 0;

  // Logic:
  // 1. If plan has < 4 classes, evolution is locked to normal.
  // 2. If missed class recently (admin marks attended=false), it goes thin.
  // 3. If attended >= 4 classes this month, it goes strong.

  let level: 'thin' | 'normal' | 'strong' = forcedLevel || 'normal';

  if (!forcedLevel && planClasses >= 4) {
    if (missedRecently) {
      level = 'thin';
    } else if (attendedCount >= 4) {
      level = 'strong';
    }
  }

  const avatarMap = {
    male: {
      strong: maleStrong,
      normal: maleNormal,
      thin: maleThin,
    },
    female: {
      strong: femaleStrong,
      normal: femaleNormal,
      thin: femaleThin,
    },
  };

  const currentImg = avatarMap[gender][level];
  const isStrong = level === 'strong';
  const isThin = level === 'thin';

  return (
    <div className="relative w-full max-w-[340px] aspect-square mx-auto flex items-center justify-center p-4">
      {/* 🔴 Dynamic Aura Base (Rotating & Pulsing) */}
      <motion.div
        animate={{
          scale: isStrong ? [1.1, 1.3, 1.1] : [1, 1.1, 1],
          rotate: [0, 180, 360],
          opacity: isStrong ? [0.4, 0.7, 0.4] : [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: isStrong ? 6 : 12,
          repeat: Infinity,
          ease: 'linear',
        }}
        className={twMerge(
          'absolute inset-0 rounded-full blur-[100px] -z-10',
          isStrong
            ? 'bg-gradient-to-tr from-yellow-500 via-orange-600 to-red-500'
            : isThin
              ? 'bg-slate-400'
              : 'bg-primary'
        )}
      />

      {/* 🥊 Elite Glow Ring */}
      {isStrong && (
        <motion.div
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 border-[2px] border-yellow-500/30 rounded-full blur-md -z-5"
        />
      )}

      {/* 🚶 Character Container with Advanced Movement */}
      <motion.div
        key={`${gender}-${level}`}
        initial={{ opacity: 0, scale: 0.8, filter: 'brightness(0)' }}
        animate={{
          opacity: 1,
          scale: [1, 1.02, 1],
          y: [-10, 10, -10],
          rotate: [-1, 1, -1],
          filter: isStrong ? 'brightness(1.1) contrast(1.1)' : 'brightness(1) contrast(1)',
        }}
        transition={{
          opacity: { duration: 1 },
          scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 2 },
        }}
        className="relative w-[90%] h-[90%] flex items-center justify-center"
      >
        <img
          src={currentImg}
          alt={`Avatar GPTE ${gender} ${level}`}
          className={twMerge(
            'w-full h-full object-contain drop-shadow-[0_45px_65px_rgba(0,0,0,0.7)] transition-all duration-700',
            isStrong ? 'drop-shadow-[0_0_90px_rgba(255,191,0,0.5)]' : '',
            isThin ? 'grayscale-[0.3] contrast-[0.9]' : ''
          )}
        />

        {/* Dynamic Shadow on floor (Responsive to character height) */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.35, 0.25],
            filter: 'blur(25px)',
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 h-14 bg-black/50 rounded-full -z-20"
        />
      </motion.div>

      {/* 🏆 Level Indicator Badge (Premium Design) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <div className="relative group">
          {/* Badge Background */}
          <div className="flex items-center gap-4 bg-slate-900/90 border border-white/10 px-8 py-3.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">
            {/* Pulsing Light Stroke */}
            <motion.div
              animate={{ x: [-200, 200] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
            />

            <div
              className={twMerge(
                'w-2.5 h-2.5 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]',
                isStrong
                  ? 'bg-yellow-400 shadow-yellow-400/60 animate-pulse'
                  : isThin
                    ? 'bg-slate-500'
                    : 'bg-primary shadow-primary/50'
              )}
            />

            <span
              className={twMerge(
                'text-[13px] font-black uppercase tracking-[0.3em] italic',
                isStrong ? 'text-yellow-400' : 'text-white'
              )}
            >
              {isStrong ? 'Guerrero Elite' : isThin ? 'Modo Recuperación' : 'Aspirante GPTE'}
            </span>
          </div>

          {/* Level Progress Bar below the text */}
          <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isStrong ? '100%' : isThin ? '30%' : '60%' }}
              className={twMerge(
                'h-full rounded-full transition-all duration-1000',
                isStrong
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : isThin
                    ? 'bg-slate-600'
                    : 'bg-primary'
              )}
            />
          </div>
        </div>

        {/* Dynamic Motivational Text */}
        <motion.span
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3"
        >
          {isStrong
            ? 'La disciplina vence al talento'
            : isThin
              ? 'El descanso es parte del éxito'
              : 'Enfócate en la técnica'}
        </motion.span>
      </motion.div>
    </div>
  );
}
