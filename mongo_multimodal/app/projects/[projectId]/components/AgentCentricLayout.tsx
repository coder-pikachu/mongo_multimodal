'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, ArrowLeft, Mic, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SidePanel } from './SidePanel/SidePanel';
import AgentView from './AgentView';
import VoiceAgentView from './VoiceAgentView';
import { ClientProject, ClientProjectData } from '@/types/clientTypes';
import { SelectionProvider } from './SelectionContext';
import ProjectHeader from './ProjectHeader';

interface AgentCentricLayoutProps {
  project: ClientProject;
  projectData: ClientProjectData[];
  onDataUpdate?: () => void;
}

export function AgentCentricLayout({ project, projectData, onDataUpdate }: AgentCentricLayoutProps) {
  const router = useRouter();
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [mode, setMode] = useState<'text' | 'voice'>('text');

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

      // V key: Toggle voice mode
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        // Only toggle if not typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          setMode((prev) => (prev === 'text' ? 'voice' : 'text'));
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
    const savedMode = localStorage.getItem('agentMode');
    if (savedMode === 'voice' || savedMode === 'text') {
      setMode(savedMode);
    }
  }, []);

  // Save panel state to localStorage
  useEffect(() => {
    localStorage.setItem('sidePanelOpen', JSON.stringify(sidePanelOpen));
  }, [sidePanelOpen]);

  // Save mode to localStorage
  useEffect(() => {
    localStorage.setItem('agentMode', mode);
  }, [mode]);

  return (
    <SelectionProvider>
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-black">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
          {/* Back to projects */}
          <button
            onClick={() => router.push('/projects')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors shrink-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Toggle side panel */}
          <button
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md transition-colors shrink-0"
            aria-label="Toggle side panel"
          >
            {sidePanelOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Project Header with Info button and description */}
          <div className="flex-1 min-w-0">
            <ProjectHeader
              project={project}
              rightActions={
                <div className="flex items-center gap-2">
                  {/* Mode toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                    <button
                      onClick={() => setMode('text')}
                      className={`
                        px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5
                        ${mode === 'text'
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Text
                    </button>
                    <button
                      onClick={() => setMode('voice')}
                      className={`
                        px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5
                        ${mode === 'voice'
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <Mic className="w-4 h-4" />
                      Voice
                    </button>
                  </div>

                  {/* Focus mode toggle */}
                  <button
                    onClick={() => {
                      setFocusMode(!focusMode);
                      setSidePanelOpen(focusMode);
                    }}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${focusMode
                        ? 'bg-green-100 dark:bg-gray-800 text-[#13AA52] dark:text-[#00ED64]'
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
                      {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded">
                      B
                    </kbd>
                    <span className="mx-1">·</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded">
                      V
                    </kbd>
                    <span className="text-xs">for voice</span>
                  </div>
                </div>
              }
            />
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
            {mode === 'voice' ? (
              <VoiceAgentView projectId={project._id} />
            ) : (
              <AgentView projectId={project._id} />
            )}
          </div>
        </div>

        {/* Floating "Show Panel" button when panel is closed */}
        {!sidePanelOpen && !focusMode && (
          <button
            onClick={() => setSidePanelOpen(true)}
            className="fixed left-4 bottom-4 p-3 bg-[#00ED64] hover:bg-[#13AA52] text-gray-900 rounded-full shadow-lg transition-all z-50"
            aria-label="Show side panel"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </SelectionProvider>
  );
}
