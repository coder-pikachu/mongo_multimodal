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
  unprocessedItems,
  asIcon = false
}: {
  projectId: string;
  unprocessedItems: ClientProjectData[];
  asIcon?: boolean;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const filteredItems = unprocessedItems.filter(item => !hasValidEmbedding(item));

  const handleBatchProcess = async () => {
    try {
      setIsProcessing(true);
      const ids = filteredItems.map(i => i._id);
      if (ids.length === 0) return;
      const resp = await fetch(`/api/projects/${filteredItems[0].projectId}/data/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!resp.ok) {
        throw new Error('Bulk processing failed');
      }
      setProgress(100);

      router.refresh();
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  if (filteredItems.length === 0) return null;

  return (
    <button
      onClick={handleBatchProcess}
      disabled={isProcessing}
      className={asIcon ? 'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' : 'w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 mb-6'}
      title={asIcon ? `Generate embeddings for ${filteredItems.length} items` : undefined}
    >
      {asIcon ? (
        isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5a1 1 0 10-2 0v4.382l-2.447 2.447a1 1 0 101.414 1.414l2.74-2.74A1 1 0 0112 12V7z" />
          </svg>
        )
      ) : (
        isProcessing ? (
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
        )
      )}
    </button>
  );
}
