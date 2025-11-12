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
    <div className="border border-primary-200 dark:border-primary-800 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow animate-scale-in">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-primary-100/50 dark:hover:bg-primary-900/30 transition-all duration-200 group"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse plan' : 'Expand plan'}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-500/30 transition-colors">
            <List className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <span className="font-semibold text-base text-primary-700 dark:text-primary-300">
            Agent Plan
          </span>
          {currentStep !== undefined && totalSteps !== undefined && (
            <span className="px-2.5 py-1 text-xs font-medium bg-primary-200 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full">
              Step {currentStep} / {totalSteps}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
        ) : (
          <ChevronDown className="w-5 h-5 text-primary-600 dark:text-primary-400 transition-transform group-hover:scale-110" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          {/* Rationale */}
          <div className="p-3 rounded-lg bg-white/50 dark:bg-neutral-900/20 border border-primary-200/50 dark:border-primary-800/50">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {plan.rationale}
            </p>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-3">
              Execution Steps
            </h4>
            <ol className="space-y-2.5">
              {plan.steps.map((step, index) => {
                const isComplete = currentStep !== undefined && index < currentStep;
                const isCurrent = currentStep !== undefined && index === currentStep;

                return (
                  <li
                    key={index}
                    className={`flex items-start gap-3 text-sm transition-all duration-200 ${
                      isComplete
                        ? 'text-success-700 dark:text-success-400'
                        : isCurrent
                        ? 'text-primary-700 dark:text-primary-300 font-medium scale-105'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {isComplete ? (
                      <div className="p-1 rounded-full bg-success-100 dark:bg-success-900/30">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-success-600 dark:text-success-400" />
                      </div>
                    ) : (
                      <span className={`w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold rounded-full ${
                        isCurrent
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {index + 1}
                      </span>
                    )}
                    <span className="pt-0.5">{step}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Tools and Stats */}
          <div className="flex items-center gap-4 pt-3 border-t border-primary-200/50 dark:border-primary-800/50">
            <div className="flex items-center gap-2 text-xs font-medium text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30">
              <Clock className="w-3.5 h-3.5" />
              <span>~{plan.estimatedToolCalls} tool calls</span>
            </div>
            {plan.needsExternalData && (
              <div className="flex items-center gap-2 text-xs font-medium text-accent-orange-700 dark:text-accent-orange-400 px-3 py-1.5 rounded-full bg-accent-orange-100 dark:bg-accent-orange-900/30">
                <span className="w-2 h-2 bg-accent-orange-500 rounded-full animate-pulse" />
                <span>External data required</span>
              </div>
            )}
          </div>

          {/* Tools Section */}
          <div className="space-y-3">
            {/* Available Tools */}
            {availableTools && availableTools.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-3">
                  Tool Selection
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableTools.map((tool, index) => {
                    const isSelected = plan.toolsToUse?.includes(tool);
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 border border-primary-300 dark:border-primary-700 shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500 opacity-50 border border-transparent'
                        }`}
                        title={isSelected ? `Selected for execution` : `Available but not selected`}
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
                <h4 className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-3">
                  Selected Tools
                </h4>
                <div className="flex flex-wrap gap-2">
                  {plan.toolsToUse.map((tool, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/40 text-xs font-medium rounded-lg
                               text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
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
