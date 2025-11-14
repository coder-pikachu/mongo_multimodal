'use client';

import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  audioLevel?: number;
}

export function AnimatedOrb({ isActive, isSpeaking = false, isMuted = false, audioLevel = 0 }: Props) {
  // Only animate when actually listening (not muted)
  const shouldAnimate = isActive && !isMuted;
  const volumeScale = shouldAnimate ? 1 + (audioLevel * 0.12) : 1;
  return (
    <div className="relative flex items-center justify-center pointer-events-none w-32 h-32">
      {/* Single elegant pulse ring - only when actively listening */}
      {shouldAnimate && (
        <motion.div
          animate={{
            scale: [1, 1.4],
            opacity: [0.2, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-slate-400/30 to-slate-500/30 dark:from-slate-500/20 dark:to-slate-600/20"
        />
      )}

      {/* Main orb - minimal glassmorphism */}
      <motion.div
        animate={{
          scale: shouldAnimate ? volumeScale : (isMuted ? 0.92 : 0.95),
        }}
        transition={{
          scale: { duration: 0.4, ease: 'easeOut' },
        }}
        className={`relative flex items-center justify-center w-24 h-24 rounded-full backdrop-blur-xl transition-all duration-700 ${
          shouldAnimate
            ? 'bg-white/40 dark:bg-slate-800/50 border-2 border-slate-300/60 dark:border-slate-600/60 shadow-xl'
            : isMuted
            ? 'bg-white/20 dark:bg-slate-900/30 border-2 border-orange-400/50 dark:border-orange-500/40 shadow-lg'
            : 'bg-white/20 dark:bg-slate-900/30 border-2 border-slate-300/40 dark:border-slate-700/40 shadow-md'
        }`}
      >
        {/* Inner subtle glow */}
        <motion.div
          animate={{
            opacity: shouldAnimate ? [0.3, 0.5, 0.3] : 0.2,
          }}
          transition={{
            duration: 3,
            repeat: shouldAnimate ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`absolute inset-3 rounded-full ${
            shouldAnimate
              ? 'bg-gradient-to-br from-slate-200/40 to-slate-300/30 dark:from-slate-700/30 dark:to-slate-600/20'
              : 'bg-slate-200/15 dark:bg-slate-800/15'
          }`}
        />

        {/* Clean centered icon */}
        <motion.div
          animate={{
            scale: shouldAnimate && audioLevel > 0.1 ? [1, 1.08, 1] : 1,
          }}
          transition={{
            duration: 1.2,
            repeat: shouldAnimate && audioLevel > 0.1 ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="relative z-10 text-4xl leading-none"
          style={{
            filter: shouldAnimate ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' : 'none',
          }}
        >
          {isMuted ? (
            <span className="text-orange-500 dark:text-orange-400">🔇</span>
          ) : isSpeaking ? (
            <span className="text-slate-700 dark:text-slate-300">💬</span>
          ) : shouldAnimate ? (
            <span className="text-slate-700 dark:text-slate-300">👂</span>
          ) : (
            <span className="text-slate-400 dark:text-slate-600 opacity-60">⏸️</span>
          )}
        </motion.div>

        {/* Minimal audio wave indicator - only when actively listening */}
        {shouldAnimate && !isSpeaking && audioLevel > 0.05 && (
          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-25">
            {[0, 0.12, 0.24].map((delay, i) => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [0.3 + audioLevel * 0.2, 0.7 + audioLevel * 0.4, 0.3 + audioLevel * 0.2],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay,
                }}
                className="w-0.5 h-6 bg-slate-500 dark:bg-slate-400 rounded-full"
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
