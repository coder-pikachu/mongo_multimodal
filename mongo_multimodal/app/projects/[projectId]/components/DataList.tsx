'use client';

import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { ClientProjectData } from '@/types/clientTypes';

import { formatDate } from '@/lib/clientUtils';


interface DataListProps {
  data: ClientProjectData[];
  projectId: string;
}

export default function DataList({ data }: DataListProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const unprocessedIds = data
      .filter(item => !item.embedding)
      .map(item => item._id.toString());
    setSelectedItems(prev =>
      prev.length === unprocessedIds.length ? [] : unprocessedIds
    );
  };

  const handleProcess = async () => {
    if (selectedItems.length === 0) return;

    try {
      setIsProcessing(true);
      const baseUrl = process.env.VERCEL_URL
        ? `http://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      // For each selected item call process
      for (const itemId of selectedItems) {
        let successCount = 0;
        setIsProcessing(true);

        const response = await fetch(`${baseUrl}/api/projects/data/${itemId}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ itemIds: selectedItems })
        });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setProgress(Math.round((successCount++ / selectedItems.length) * 100));

      }


      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setSelectedItems([]);
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No files uploaded yet. Upload your first file to get started!</p>
      </div>
    );
  }

  const unprocessedItems = data.filter(item => !item.embedding);

  return (
    <div className="space-y-6">
      {unprocessedItems.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedItems.length === unprocessedItems.length
                  ? 'Deselect All'
                  : 'Select All Unprocessed'}
              </button>
              <span className="text-sm text-gray-500">
                {selectedItems.length} items selected
              </span>
            </div>
            <button
              onClick={handleProcess}
              disabled={isProcessing || selectedItems.length === 0}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
              ) : (
                `Process ${selectedItems.length} Items`
              )}
            </button>
          </div>
          {isProcessing && (
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((item) => (
        <div
          key={item._id.toString()}
          className="bg-white p-4 rounded-lg border border-gray-200"
        >
          {item.type === 'image' && item.content.base64 && (
            <div className="relative h-48 mb-4">
              <Image
                src={`data:${item.metadata.mimeType};base64,${item.content.base64}`}
                alt={item.metadata.filename}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          )}

          {item.type === 'document' && (
            <div className="h-48 mb-4 overflow-hidden">
              <pre className="text-sm text-gray-600">
                {item.content.text?.slice(0, 200)}...
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">{item.metadata.filename}</p>
            <p>Type: {item.metadata.mimeType}</p>
            <p>Size: {(item.metadata.size / 1024).toFixed(2)} KB</p>
            <p>Uploaded: {formatDate(item.createdAt)}</p>
          </div>

          {item.analysis.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">{item.analysis.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.analysis.tags.map((tag: unknown, index: unknown) => (
                  <span
                    key={index as number}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    {tag as ReactNode}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!item.embedding && (
            <div className="p-4 bg-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item._id.toString())}
                  onChange={() => handleSelectItem(item._id.toString())}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-500">Not processed</span>
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
