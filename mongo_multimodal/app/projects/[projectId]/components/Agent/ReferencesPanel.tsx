'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Image as ImageIcon, Globe, Mail } from 'lucide-react';
import { ConversationReference } from '@/types/clientTypes';

interface ReferencesPanelProps {
  references: ConversationReference[];
  onPreview?: (dataId: string) => void;
}

export function ReferencesPanel({ references, onPreview }: ReferencesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (references.length === 0) {
    return null;
  }

  // Group references by type
  const groupedRefs = references.reduce((acc, ref) => {
    if (!acc[ref.type]) {
      acc[ref.type] = [];
    }
    acc[ref.type].push(ref);
    return acc;
  }, {} as Record<string, ConversationReference[]>);

  const getIcon = (type: string) => {
    switch (type) {
      case 'projectData':
        return FileText;
      case 'web':
        return Globe;
      case 'email':
        return Mail;
      default:
        return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'projectData':
        return 'Project Data';
      case 'web':
        return 'Web Sources';
      case 'email':
        return 'Emails';
      default:
        return type;
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sources Referenced
          </span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-600 dark:text-gray-400">
            {references.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(groupedRefs).map(([type, refs]) => {
            const Icon = getIcon(type);
            const label = getTypeLabel(type);

            return (
              <div key={type}>
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {label} ({refs.length})
                </h4>
                <div className="space-y-2">
                  {refs.map((ref, index) => (
                    <div
                      key={index}
                      className={`
                        p-2 border border-gray-200 dark:border-gray-700 rounded-md
                        bg-white dark:bg-gray-800 text-sm
                        ${onPreview && ref.dataId ? 'cursor-pointer hover:border-green-300 dark:hover:border-green-600' : ''}
                      `}
                      onClick={() => {
                        if (onPreview && ref.dataId) {
                          onPreview(ref.dataId);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {ref.title}
                          </p>

                          {/* Details */}
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>Step {ref.usedInStep}</span>
                            <span>•</span>
                            <span className="truncate">{ref.toolCall}</span>
                            {ref.score !== undefined && (
                              <>
                                <span>•</span>
                                <span>{(ref.score * 100).toFixed(0)}% match</span>
                              </>
                            )}
                          </div>

                          {/* URL for web sources */}
                          {ref.url && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#13AA52] dark:text-[#00ED64] hover:underline truncate block mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ref.url}
                            </a>
                          )}
                        </div>

                        {/* Icon indicator */}
                        {ref.type === 'projectData' && (
                          <ImageIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
