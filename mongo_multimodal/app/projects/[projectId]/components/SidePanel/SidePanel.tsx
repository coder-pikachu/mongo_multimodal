'use client';

import { useState } from 'react';
import { SidePanelHeader, SidePanelMode } from './SidePanelHeader';
import { SelectionTray } from './SelectionTray';
import { SearchPanel } from './SearchPanel';
import { BrowsePanel } from './BrowsePanel';
import { UploadPanel } from './UploadPanel';
import { ClientProjectData } from '@/types/clientTypes';

interface SidePanelProps {
  projectId: string;
  projectData: ClientProjectData[];
  onDataUpdate?: () => void;
}

export function SidePanel({ projectId, projectData, onDataUpdate }: SidePanelProps) {
  const [currentMode, setCurrentMode] = useState<SidePanelMode>('search');

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800">
      {/* Header with mode tabs */}
      <SidePanelHeader currentMode={currentMode} onModeChange={setCurrentMode} />

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {currentMode === 'search' && (
          <SearchPanel projectId={projectId} />
        )}

        {currentMode === 'browse' && (
          <BrowsePanel projectId={projectId} projectData={projectData} onDataUpdate={onDataUpdate} />
        )}

        {currentMode === 'upload' && (
          <UploadPanel
            projectId={projectId}
            onUploadComplete={onDataUpdate}
          />
        )}
      </div>

      {/* Selection tray at bottom */}
      <SelectionTray />
    </div>
  );
}
