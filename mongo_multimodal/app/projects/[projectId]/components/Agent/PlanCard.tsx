'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, List } from 'lucide-react';
import { AgentPlan } from '@/app/types/clientTypes';

interface PlanCardProps {
  plan: AgentPlan;
  currentStep?: number;
  totalSteps?: number;
}

export function PlanCard({ plan, currentStep, totalSteps }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
            Agent Plan
          </span>
          {currentStep !== undefined && totalSteps !== undefined && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              (Step {currentStep} of {totalSteps})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Rationale */}
          <div>
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {plan.rationale}
            </p>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
              Steps:
            </h4>
            <ol className="space-y-2">
              {plan.steps.map((step, index) => {
                const isComplete = currentStep !== undefined && index < currentStep;
                const isCurrent = currentStep !== undefined && index === currentStep;

                return (
                  <li
                    key={index}
                    className={`flex items-start gap-2 text-sm ${
                      isComplete
                        ? 'text-green-700 dark:text-green-400'
                        : isCurrent
                        ? 'text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                        {index + 1}.
                      </span>
                    )}
                    <span>{step}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Tools and Stats */}
          <div className="flex items-center gap-4 pt-2 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
              <Clock className="w-3 h-3" />
              <span>~{plan.estimatedToolCalls} tool calls</span>
            </div>
            {plan.needsExternalData && (
              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Needs external data</span>
              </div>
            )}
          </div>

          {/* Tools to use */}
          {plan.toolsToUse && plan.toolsToUse.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Tools:
              </h4>
              <div className="flex flex-wrap gap-1">
                {plan.toolsToUse.map((tool, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-xs rounded
                             text-blue-800 dark:text-blue-200"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
