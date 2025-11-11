'use client';

import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { useSelection } from '../SelectionContext';

export function SelectedContextBanner() {
  const { selectedItems, removeItem, clearSelection } = useSelection();

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#00684A] dark:text-[#00ED64]">
          Context: {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
        </span>
        <button
          onClick={clearSelection}
          className="text-xs text-[#13AA52] dark:text-[#00ED64] hover:text-[#00684A] dark:hover:text-[#13AA52]"
        >
          Clear all
        </button>
      </div>

      {/* Horizontal scrollable chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-green-300 dark:scrollbar-thumb-green-700">
        {selectedItems.map((item) => {
          const isImage = item.type === 'image';

          return (
            <div
              key={item._id}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800
                       border border-green-200 dark:border-green-700 rounded-md
                       flex-shrink-0 group hover:border-green-400 dark:hover:border-green-500
                       transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {isImage ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[#13AA52] dark:text-[#00ED64]" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[#13AA52] dark:text-[#00ED64]" />
                )}
              </div>

              {/* Filename */}
              <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                {item.metadata?.filename || 'Unknown'}
              </span>

              {/* Remove button */}
              <button
                onClick={() => removeItem(item._id)}
                className="flex-shrink-0 p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                         opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Remove from context"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
