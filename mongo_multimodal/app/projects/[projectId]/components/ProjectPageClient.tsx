'use client';

import { ClientProject, ClientProjectData, SearchResult } from '@/types/clientTypes';
import UploadButton from './UploadButton';
import BatchProcessButton from './BatchProcessButton';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchView from './SearchView';
import ChatView from './ChatView';
import DataExplorerView from './DataExplorerView';
import { SearchResultProvider } from './SearchResultContext';
import ProjectHeader from './ProjectHeader';
import { AgentCentricLayout } from './AgentCentricLayout';

interface ProjectPageClientProps {
  project: ClientProject;
  data: ClientProjectData[];
  projectId: string;
}

type Mode = 'agent' | 'chat' | 'search' | 'explorer';

interface PaginatedResults {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timeTaken: number;
}

export default function ProjectPageClient({ project, data: initialData, projectId }: ProjectPageClientProps) {
  const searchParams = useSearchParams();
  const legacyMode = searchParams.get('mode') as Mode | null;

  // State for legacy modes (chat, search, explorer)
  const [mode, setMode] = useState<Mode>(legacyMode || 'agent');
  const [searchResults, setSearchResults] = useState<PaginatedResults | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectData, setProjectData] = useState<ClientProjectData[]>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update mode when URL changes
  useEffect(() => {
    if (legacyMode && ['chat', 'search', 'explorer'].includes(legacyMode)) {
      setMode(legacyMode);
    } else {
      setMode('agent');
    }
  }, [legacyMode]);

  // Refresh project data
  const refreshProjectData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/data`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const freshData = await response.json();
        setProjectData(freshData);
      }
    } catch (error) {
      console.error('Error refreshing project data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // If agent mode (default), use new layout
  if (mode === 'agent') {
    return <AgentCentricLayout project={project} projectData={projectData} onDataUpdate={refreshProjectData} />;
  }

  // Legacy tab-based layout for chat/search/explorer modes
  const renderLegacyContent = () => {
    switch (mode) {
      case 'search':
        return (
          <SearchView
            projectId={projectId}
            onSelectResult={() => setMode('chat')}
            onSelectForAgent={() => setMode('agent')}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        );
      case 'chat':
        return <ChatView projectId={projectId} />;
      case 'explorer':
        return (
          <DataExplorerView
            projectId={projectId}
            data={projectData}
            onSelectForChat={() => setMode('chat')}
            onSelectForAgent={() => setMode('agent')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SearchResultProvider>
      <div className="mx-auto px-4 pt-8">
        <div className="flex flex-col h-[calc(100vh-6rem)]">
          {/* Project Header with compact right actions */}
          <ProjectHeader
            project={project}
            rightActions={
              <div className="flex items-center gap-1">
                <UploadButton projectId={projectId} asIcon />
                <BatchProcessButton unprocessedItems={projectData} asIcon />
              </div>
            }
          />

          {/* Item Count Row */}
          <div className="flex justify-end items-center mt-2 mb-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {projectData.length} {projectData.length === 1 ? 'item' : 'items'} in this project
            </div>
          </div>

          {/* Tab Navigation - Legacy modes only */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setMode('agent')}
                className={`${
                  mode === 'agent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Agent (New)
              </button>
              <button
                onClick={() => setMode('search')}
                className={`${
                  mode === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Search (Legacy)
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`${
                  mode === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Chat (Legacy)
              </button>
              <button
                onClick={() => setMode('explorer')}
                className={`${
                  mode === 'explorer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Data Explorer (Legacy)
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-grow overflow-y-auto pt-6">
            {renderLegacyContent()}
          </div>
        </div>
      </div>
    </SearchResultProvider>
  );
}
