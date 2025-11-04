'use client';

import { X, Send } from 'lucide-react';
import { useSelection } from '../SelectionContext';
import Image from 'next/image';

export function SelectionTray() {
  const { selectedItems, removeItem, clearSelection, feedToAgent } = useSelection();

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedItems.length} selected
        </span>
        <button
          onClick={clearSelection}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Clear all
        </button>
      </div>

      {/* Selected items chips */}
      <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto">
        {selectedItems.map((item) => (
          <div
            key={item._id}
            className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-xs group"
          >
            {/* Thumbnail if image */}
            {item.type === 'image' && item.content?.base64 && (
              <div className="w-5 h-5 relative rounded overflow-hidden flex-shrink-0">
                <Image
                  src={`data:${item.metadata?.mimeType || 'image/jpeg'};base64,${item.content.base64.substring(0, 1000)}`}
                  alt={item.metadata?.filename || 'Selected item'}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Filename */}
            <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
              {item.metadata?.filename || 'Unknown'}
            </span>

            {/* Remove button */}
            <button
              onClick={() => removeItem(item._id)}
              className="ml-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove from selection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Feed to Agent button */}
      <button
        onClick={() => {
          feedToAgent();
          // Optional: Show a toast/notification that context was sent
        }}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        title={`Send ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} to Agent as context`}
      >
        <Send className="w-4 h-4" />
        Feed to Agent ({selectedItems.length})
      </button>
    </div>
  );
}
