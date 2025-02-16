'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BatchProcessButton({
  projectId,
  unprocessedItems
}: {
  projectId: string;
  unprocessedItems: { _id: string }[];
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const handleBatchProcess = async () => {
    try {
      setIsProcessing(true);
      const total = unprocessedItems.length;

      for (let i = 0; i < unprocessedItems.length; i++) {
        const item = unprocessedItems[i];
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

  if (unprocessedItems.length === 0) {
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
          <span>Processing {unprocessedItems.length} items...</span>
          <div className="w-full bg-blue-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        `Generate Embeddings for ${unprocessedItems.length} Items`
      )}
    </button>
  );
}
