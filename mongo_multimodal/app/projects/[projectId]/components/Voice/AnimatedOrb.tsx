'use client';

import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  isSpeaking?: boolean;
}

export function AnimatedOrb({ isActive, isSpeaking = false }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Main orb */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.1, 1] : 1,
          opacity: isActive ? 0.4 : 0.2,
        }}
        transition={{
          scale: {
            duration: isSpeaking ? 1 : 2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          },
          opacity: {
            duration: 0.5,
          },
        }}
        className={`w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl ${
          isActive
            ? 'bg-gradient-to-r from-primary-500 via-blue-500 to-purple-500'
            : 'bg-gradient-to-r from-neutral-300 to-neutral-400 dark:from-neutral-700 dark:to-neutral-800'
        }`}
      />

      {/* Secondary ring for speaking state */}
      {isSpeaking && (
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          className="absolute w-80 h-80 md:w-[30rem] md:h-[30rem] rounded-full blur-2xl bg-gradient-to-r from-primary-400 to-blue-400"
        />
      )}

      {/* Outer glow */}
      {isActive && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-96 h-96 md:w-[40rem] md:h-[40rem] rounded-full blur-3xl bg-gradient-to-r from-primary-600/30 to-blue-600/30"
        />
      )}

      {/* Center dot indicator */}
      {isActive && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: isSpeaking ? 0.5 : 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-4 h-4 rounded-full bg-primary-400 shadow-lg shadow-primary-500/50"
        />
      )}
    </div>
  );
}
