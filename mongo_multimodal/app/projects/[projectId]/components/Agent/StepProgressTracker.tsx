'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface StepProgressTrackerProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function StepProgressTracker({
  currentStep,
  totalSteps,
  stepLabels,
}: StepProgressTrackerProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Progress
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#00ED64] h-2 rounded-full transition-all duration-500 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            {/* Animated shimmer effect */}
            {currentStep < totalSteps && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Step dots */}
      {stepLabels && stepLabels.length > 0 && (
        <div className="flex items-center justify-between mt-3">
          {stepLabels.map((label, index) => {
            const stepNumber = index + 1;
            const isComplete = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isPending = stepNumber > currentStep;

            return (
              <div key={index} className="flex flex-col items-center gap-1 flex-1">
                {/* Dot/Icon */}
                <div className="relative">
                  {isComplete && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                  {isCurrent && (
                    <div className="relative">
                      <Loader2 className="w-5 h-5 text-[#00ED64] dark:text-[#00ED64] animate-spin" />
                    </div>
                  )}
                  {isPending && (
                    <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-xs text-center leading-tight ${
                    isComplete
                      ? 'text-green-600 dark:text-green-400'
                      : isCurrent
                      ? 'text-[#00ED64] dark:text-[#00ED64] font-medium'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
