'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SidePanel } from './SidePanel/SidePanel';
import AgentView from './AgentView';
import { ClientProject, ClientProjectData } from '@/app/types/clientTypes';
import { SelectionProvider } from './SelectionContext';

interface AgentCentricLayoutProps {
  project: ClientProject;
  projectData: ClientProjectData[];
  onDataUpdate?: () => void;
}

export function AgentCentricLayout({ project, projectData, onDataUpdate }: AgentCentricLayoutProps) {
  const router = useRouter();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B: Toggle side panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidePanelOpen((prev) => !prev);
      }

      // Cmd/Ctrl + Shift + F: Focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setFocusMode((prev) => !prev);
        if (!focusMode) {
          setSidePanelOpen(false);
        }
      }

      // Escape: Exit focus mode
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        setSidePanelOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // Load panel state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidePanelOpen');
    if (saved !== null) {
      setSidePanelOpen(JSON.parse(saved));
    }
  }, []);

  // Save panel state to localStorage
  useEffect(() => {
    localStorage.setItem('sidePanelOpen', JSON.stringify(sidePanelOpen));
  }, [sidePanelOpen]);

  return (
    <SelectionProvider>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-black">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {/* Back to projects */}
            <button
              onClick={() => router.push('/projects')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors"
              aria-label="Back to projects"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Toggle side panel */}
            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors"
              aria-label="Toggle side panel"
            >
              {sidePanelOpen ? (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>

            {/* Project name */}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {project.name}
            </h1>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Focus mode toggle */}
            <button
              onClick={() => {
                setFocusMode(!focusMode);
                setSidePanelOpen(focusMode);
              }}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${focusMode
                  ? 'bg-blue-100 dark:bg-gray-800 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
                }
              `}
            >
              <Maximize2 className="w-4 h-4 inline mr-1" />
              Focus Mode
            </button>

            {/* Keyboard shortcut hint */}
            <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded">
                B
              </kbd>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Side panel */}
          <div
            className={`
              transition-all duration-300 ease-in-out
              ${sidePanelOpen ? 'w-96' : 'w-0'}
              overflow-hidden
            `}
          >
            {sidePanelOpen && (
              <SidePanel projectId={project._id} projectData={projectData} onDataUpdate={onDataUpdate} />
            )}
          </div>

          {/* Agent interface */}
          <div className="flex-1 overflow-hidden">
            <AgentView projectId={project._id} />
          </div>
        </div>

        {/* Floating "Show Panel" button when panel is closed */}
        {!sidePanelOpen && !focusMode && (
          <button
            onClick={() => setSidePanelOpen(true)}
            className="fixed left-4 bottom-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all z-50"
            aria-label="Show side panel"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </SelectionProvider>
  );
}
