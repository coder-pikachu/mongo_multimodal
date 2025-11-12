'use client';

import { useState, useEffect, useRef } from 'react';
import { Info, X, Pencil } from 'lucide-react';
import { ClientProject } from '@/types/clientTypes';

interface ProjectHeaderProps {
  project: ClientProject;
  rightActions?: React.ReactNode;
}

export default function ProjectHeader({ project, rightActions }: ProjectHeaderProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [desc, setDesc] = useState(project.description || '');
  const [saving, setSaving] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
        setIsEditing(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showTooltip]);

  return (
    <div className="relative flex items-center justify-between py-4">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 truncate" title={project.name}>
          {project.name}
        </h1>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowTooltip(!showTooltip)}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all duration-200"
            aria-label="Show project description"
          >
            <Info className="h-5 w-5" />
          </button>

          {showTooltip && (
            <div
              ref={tooltipRef}
              className="absolute top-full left-0 mt-3 z-50 w-screen max-w-2xl animate-scale-in"
            >
              <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-5 backdrop-blur-sm">
                <div className="flex justify-between items-start gap-4">
                  {isEditing ? (
                    <div className="flex-1">
                      <textarea
                        className="w-full p-3 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        rows={4}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Enter project description..."
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={saving}
                          onClick={async () => {
                            try {
                              setSaving(true);
                              await fetch(`/api/projects/${project._id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ description: desc })
                              });
                              setIsEditing(false);
                              location.reload();
                            } finally { setSaving(false); }
                          }}
                          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 hover:bg-primary-600 text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setIsEditing(false); setDesc(project.description || ''); }}
                          className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm whitespace-pre-wrap leading-relaxed">
                        {project.description}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                        aria-label="Edit description"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowTooltip(false)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
                      aria-label="Close tooltip"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rightActions}
      </div>
    </div>
  );
}