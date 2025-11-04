'use client';

import { Search, FolderOpen, Upload } from 'lucide-react';

export type SidePanelMode = 'search' | 'browse' | 'upload';

interface SidePanelHeaderProps {
  currentMode: SidePanelMode;
  onModeChange: (mode: SidePanelMode) => void;
}

const modes = [
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'browse' as const, label: 'Browse', icon: FolderOpen },
  { id: 'upload' as const, label: 'Upload', icon: Upload },
];

export function SidePanelHeader({ currentMode, onModeChange }: SidePanelHeaderProps) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              flex-1 px-4 py-3 flex items-center justify-center gap-2
              transition-colors text-sm font-medium
              ${isActive
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
