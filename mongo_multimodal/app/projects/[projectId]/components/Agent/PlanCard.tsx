'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock, List, Search, Link, Eye, BrainCircuit, Brain, Database, Globe, Mail, ClipboardList } from 'lucide-react';
import { AgentPlan } from '@/app/types/clientTypes';

interface PlanCardProps {
  plan: AgentPlan;
  currentStep?: number;
  totalSteps?: number;
  availableTools?: string[];
}

const getToolIcon = (toolName: string) => {
  const iconClass = "w-3.5 h-3.5";
  switch (toolName) {
    case 'planQuery':
      return <ClipboardList className={iconClass} />;
    case 'searchProjectData':
      return <Search className={iconClass} />;
    case 'searchSimilarItems':
      return <Link className={iconClass} />;
    case 'analyzeImage':
      return <Eye className={iconClass} />;
    case 'projectDataAnalysis':
      return <BrainCircuit className={iconClass} />;
    case 'rememberContext':
      return <Brain className={`${iconClass} text-[#13AA52]`} />;
    case 'recallMemory':
      return <Database className={`${iconClass} text-[#13AA52]`} />;
    case 'searchWeb':
      return <Globe className={`${iconClass} text-[#00684A]`} />;
    case 'sendEmail':
      return <Mail className={`${iconClass} text-[#116149]`} />;
    default:
      return <List className={iconClass} />;
  }
};

export function PlanCard({ plan, currentStep, totalSteps, availableTools }: PlanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-[#13AA52] dark:text-[#00ED64]" />
          <span className="font-medium text-sm text-[#00684A] dark:text-[#00ED64]">
            Agent Plan
          </span>
          {currentStep !== undefined && totalSteps !== undefined && (
            <span className="text-xs text-[#13AA52] dark:text-[#00ED64]">
              (Step {currentStep} of {totalSteps})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#13AA52] dark:text-[#00ED64]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#13AA52] dark:text-[#00ED64]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Rationale */}
          <div>
            <p className="text-sm text-[#00684A] dark:text-[#00ED64]">
              {plan.rationale}
            </p>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-semibold text-[#13AA52] dark:text-[#00ED64] mb-2">
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
                        ? 'text-[#00684A] dark:text-[#00ED64] font-medium'
                        : 'text-[#13AA52] dark:text-[#00ED64]/80'
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
          <div className="flex items-center gap-4 pt-2 border-t border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1 text-xs text-[#13AA52] dark:text-[#00ED64]">
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

          {/* Tools Section */}
          <div className="space-y-3">
            {/* Available Tools */}
            {availableTools && availableTools.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#13AA52] dark:text-[#00ED64] mb-2">
                  Available Tools:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableTools.map((tool, index) => {
                    const isSelected = plan.toolsToUse?.includes(tool);
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
                          isSelected
                            ? 'bg-green-200 dark:bg-green-800 text-[#00684A] dark:text-[#00ED64] font-medium border border-green-300 dark:border-green-700'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 opacity-60'
                        }`}
                        title={isSelected ? `Selected for use` : `Available but not selected`}
                      >
                        {getToolIcon(tool)}
                        <span>{tool}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Tools Only (fallback if no availableTools provided) */}
            {!availableTools && plan.toolsToUse && plan.toolsToUse.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[#13AA52] dark:text-[#00ED64] mb-2">
                  Tools to Use:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {plan.toolsToUse.map((tool, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-xs rounded
                               text-[#13AA52] dark:text-[#00ED64]"
                    >
                      {getToolIcon(tool)}
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
