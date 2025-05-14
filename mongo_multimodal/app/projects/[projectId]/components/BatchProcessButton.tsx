'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ClientProjectData } from '@/types/clientTypes';

// Utility to check if an embedding is valid
const hasValidEmbedding = (item: ClientProjectData): boolean => {
  return !!item.embedding &&
         Array.isArray(item.embedding) &&
         item.embedding.length > 0 &&
         item.embedding.every(val => typeof val === 'number');
};

export default function BatchProcessButton({
  projectId,
  unprocessedItems
}: {
  projectId: string;
  unprocessedItems: ClientProjectData[];
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const filteredItems = unprocessedItems.filter(item => !hasValidEmbedding(item));

  const handleBatchProcess = async () => {
    try {
      setIsProcessing(true);
      const total = filteredItems.length;

      for (let i = 0; i < filteredItems.length; i++) {
        const item = filteredItems[i];
        try {
          await fetch(`/api/projects/data/${item._id}/process`, {
            method: 'POST',
          });
          setProgress(Math.round(((i + 1) / total) * 100));
        } catch (error) {
          console.error(`Error processing item ${item._id}:`, error);
          // Continue with next item even if one fails
        }
      }

      router.refresh();
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleBatchProcess}
      disabled={isProcessing}
      className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 mb-6"
    >
      {isProcessing ? (
        <div className="flex flex-col items-center">
          <div className="flex items-center mb-1">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Processing {filteredItems.length} items...</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        `Generate Embeddings for ${filteredItems.length} Items`
      )}
    </button>
  );
}
