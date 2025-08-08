'use client';

import { useState } from 'react';
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

  return (
    <div className="relative flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold truncate" title={project.name}>{project.name}</h1>
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Show project description"
        >
          <Info className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightActions}
      </div>

      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-start gap-3">
              {isEditing ? (
                <div className="flex-1">
                  <textarea
                    className="w-full p-2 text-sm rounded border dark:bg-gray-900"
                    rows={4}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
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
                      className="px-3 py-1 text-xs rounded bg-blue-600 text-white"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setDesc(project.description || ''); }}
                      className="px-3 py-1 text-xs rounded border"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">{project.description}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label="Edit description"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowTooltip(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
  );
}