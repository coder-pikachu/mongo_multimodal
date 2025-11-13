'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, RotateCcw, Square } from 'lucide-react';

interface Props {
  isRecording: boolean;
  isMuted: boolean;
  status: string;
  onStart: () => void;
  onToggleMute: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function VoiceControls({
  isRecording,
  isMuted,
  status,
  onStart,
  onToggleMute,
  onStop,
  onReset,
  disabled = false,
}: Props) {
  console.log('VoiceControls rendering', { isRecording, isMuted, status, disabled });

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-2 rounded-full bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur border border-neutral-200 dark:border-neutral-800"
      >
        <p className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">{status}</p>
      </motion.div>

      {/* Control buttons */}
      <div className="flex items-center gap-4">
        {/* Reset button */}
        <motion.button
          onClick={onReset}
          disabled={isRecording || disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
          title="Reset session"
        >
          <RotateCcw className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
        </motion.button>

        {/* Main microphone button - Start session or Toggle mute */}
        <motion.button
          onClick={() => {
            console.log('Microphone button clicked', { isRecording, isMuted, disabled });
            if (isRecording) {
              onToggleMute();
            } else {
              onStart();
            }
          }}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? isMuted
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/50'
                : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/50'
              : 'bg-neutral-700 hover:bg-neutral-600 shadow-neutral-700/50'
          }`}
          title={
            isRecording
              ? isMuted
                ? 'Unmute microphone'
                : 'Mute microphone'
              : 'Start voice chat'
          }
        >
          {isRecording ? (
            <>
              {isMuted ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <>
                  <Mic className="w-8 h-8 text-white" />
                  {/* Pulse effect when unmuted */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary-400"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </>
              )}
            </>
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </motion.button>

        {/* Stop button */}
        <motion.button
          onClick={onStop}
          disabled={!isRecording || disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center border border-red-500 dark:border-red-600 hover:border-red-400 dark:hover:border-red-500 shadow-lg shadow-red-600/50"
          title="Stop session"
        >
          <Square className="w-5 h-5 text-white" fill="currentColor" />
        </motion.button>
      </div>

      {/* Hint text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-neutral-500 dark:text-neutral-500 text-xs text-center max-w-xs"
      >
        {isRecording ? (
          isMuted ? (
            <>
              <span className="text-amber-500 dark:text-amber-400 font-medium">🔇 MUTED</span>
              <br />
              Click microphone to unmute • Agent will respond when you mute
            </>
          ) : (
            <>
              <span className="text-primary-500 dark:text-primary-400 font-medium">🎤 LISTENING</span>
              <br />
              Click microphone to mute • Speak naturally and pause for agent response
            </>
          )
        ) : (
          <>
            Click the microphone to start a voice conversation
            <br />
            Ask about your images and documents
          </>
        )}
      </motion.div>
    </div>
  );
}
