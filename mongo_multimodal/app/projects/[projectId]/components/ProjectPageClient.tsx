'use client';

import { ClientProject, ClientProjectData, SearchResult } from '@/types/clientTypes';
import UploadButton from './UploadButton';
import BatchProcessButton from './BatchProcessButton';
import { useState } from 'react';
import SearchView from './SearchView';
import ChatView from './ChatView';
import AgentView from './AgentView';
import DataExplorerView from './DataExplorerView';
import { SearchResultProvider } from './SearchResultContext';
import ProjectHeader from './ProjectHeader';

interface ProjectPageClientProps {
  project: ClientProject;
  data: ClientProjectData[];
  projectId: string;
}

type Mode = 'search' | 'chat' | 'agent' | 'explorer';

interface PaginatedResults {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timeTaken: number;
}

export default function ProjectPageClient({ project, data, projectId }: ProjectPageClientProps) {
  const [mode, setMode] = useState<Mode>('search');
  const [searchResults, setSearchResults] = useState<PaginatedResults | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const renderContent = () => {
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
      case 'agent':
        return <AgentView projectId={projectId} />;
      case 'explorer':
        return (
          <DataExplorerView
            projectId={projectId}
            data={data}
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
                <BatchProcessButton unprocessedItems={data} asIcon projectId={projectId} />
              </div>
            }
          />

          {/* Item Count Row */}
          <div className="flex justify-end items-center mt-2 mb-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {data.length} {data.length === 1 ? 'item' : 'items'} in this project
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setMode('search')}
                className={`${
                  mode === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Search
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`${
                  mode === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Chat
              </button>
              <button
                onClick={() => setMode('agent')}
                className={`${
                  mode === 'agent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Agent
              </button>
              <button
                onClick={() => setMode('explorer')}
                className={`${
                  mode === 'explorer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Data Explorer
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-grow overflow-y-auto pt-6">
              {renderContent()}
        </div>
        </div>
      </div>
    </SearchResultProvider>
  );
}
