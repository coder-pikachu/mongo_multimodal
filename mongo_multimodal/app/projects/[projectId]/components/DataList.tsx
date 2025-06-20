'use client';

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ClientProjectData } from '@/types/clientTypes';
import { formatDate } from '@/lib/clientUtils';
import { Loader2, Eye, ImageIcon, FileText, RefreshCw, Check } from 'lucide-react';
import BatchProcessButton from './BatchProcessButton';
import { useRouter } from 'next/navigation';

interface DataListProps {
  data: ClientProjectData[];
  projectId: string;
}

// A type that extends ClientProjectData with potentially null base64
interface StrippedProjectData extends Omit<ClientProjectData, 'content'> {
  content: {
    base64?: string | null;
    text?: string;
  };
}

const ITEMS_PER_PAGE = 6;

// Utility to check if an embedding is valid
const hasValidEmbedding = (item: ClientProjectData | StrippedProjectData): boolean => {
  return !!item.embedding &&
         Array.isArray(item.embedding) &&
         item.embedding.length > 0 &&
         item.embedding.every(val => typeof val === 'number');
};

// Preview modal component
function ImagePreviewModal({ item, onClose }: { item: ClientProjectData | StrippedProjectData; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        if (item.content.base64) {
          // Use already loaded base64 if available
          setImageData(item.content.base64);
        } else {
          // Fetch image data
          const response = await fetch(`/api/projects/data/${item._id}/content`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
          }

          const data = await response.json();
          setImageData(data.content.base64);
        }
      } catch (error) {
        console.error('Error loading image:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white p-4 rounded-lg max-w-3xl max-h-[90vh] w-full overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{item.metadata.filename}</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            &times;
          </button>
        </div>

        {isLoading ? (
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : imageData ? (
          <div className="relative w-full h-96">
            <Image
              src={`data:${item.metadata.mimeType};base64,${imageData}`}
              alt={item.metadata.filename}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Unable to load image</p>
          </div>
        )}

        {item.analysis.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">{item.analysis.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataSkeleton() {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
      <div className="h-48 mb-4 bg-gray-200 rounded-lg" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function DataList({ data, projectId }: DataListProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [displayedData, setDisplayedData] = useState<StrippedProjectData[]>([]);
  const [previewItem, setPreviewItem] = useState<ClientProjectData | StrippedProjectData | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Strip base64 content from data for initial load to improve performance
  useEffect(() => {
    const strippedData: StrippedProjectData[] = data.map(item => {
      return {
        ...item,
        content: {
          ...item.content,
          base64: item.type === 'image' ? null : item.content.base64
        }
      };
    });

    setDisplayedData(strippedData.slice(0, ITEMS_PER_PAGE));
    setHasMore(strippedData.length > ITEMS_PER_PAGE);
  }, [data]);

  const loadMore = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const nextPage = page + 1;
    const start = (nextPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    // Get next batch of data, but strip image content
    const newItems: StrippedProjectData[] = data.slice(start, end).map(item => ({
      ...item,
      content: {
        ...item.content,
        base64: item.type === 'image' ? null : item.content.base64
      }
    }));

    setDisplayedData(prev => [...prev, ...newItems]);
    setPage(nextPage);
    setHasMore(end < data.length);
    setIsLoading(false);
  }, [page, data]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    const unprocessedIds = data
      .filter(item => !hasValidEmbedding(item))
      .map(item => item._id.toString());
    setSelectedItems(prev =>
      prev.length === unprocessedIds.length ? [] : unprocessedIds
    );
  };

  const handleProcessSingle = async (itemId: string) => {
    try {
      setProcessingItemId(itemId);
      const response = await fetch(`/api/projects/data/${itemId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      router.refresh();
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setProcessingItemId(null);
    }
  };

  const handleProcess = async () => {
    if (selectedItems.length === 0) return;

    try {
      setIsProcessing(true);

      // For each selected item call process
      for (const itemId of selectedItems) {
        let successCount = 0;
        setIsProcessing(true);

        const response = await fetch(`/api/projects/data/${itemId}/process`, {
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
      router.refresh();
    } catch (error) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setSelectedItems([]);
    }
  };

  const handlePreview = (item: StrippedProjectData) => {
    // Convert StrippedProjectData to ClientProjectData format for the modal
    const modalItem: ClientProjectData = {
      ...item,
      content: {
        ...item.content,
        base64: item.content.base64 || undefined
      }
    };
    setPreviewItem(modalItem);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No files uploaded yet. Upload your first file to get started!</p>
      </div>
    );
  }

  // Get unprocessed items using the proper embedding check
  const unprocessedItems = data.filter(item => !hasValidEmbedding(item));

  return (
    <div className="space-y-6">
      {unprocessedItems.length > 0 && (
        <div className="flex flex-col space-y-4">
          <BatchProcessButton
            projectId={projectId}
            unprocessedItems={unprocessedItems}
          />

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
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        {displayedData.map((item) => (
          <div
            key={item._id.toString()}
            className="bg-white p-4 rounded-lg border border-gray-200 transition-shadow hover:shadow-lg"
          >
            {item.type === 'image' ? (
              <div className="relative h-48 mb-4 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                <ImageIcon className="h-16 w-16 text-gray-400 mb-2" />
                <button
                  onClick={() => handlePreview(item)}
                  className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview</span>
                </button>
              </div>
            ) : item.type === 'document' && (
              <div className="h-48 mb-4 overflow-hidden bg-gray-50 rounded-lg flex flex-col items-center justify-center p-4">
                <FileText className="h-12 w-12 text-gray-400 mb-3" />
                <div className="w-full overflow-hidden">
                  <pre className="text-xs text-gray-600 overflow-hidden">
                    {item.content.text?.slice(0, 150)}...
                  </pre>
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">{item.metadata.filename}</p>
              <p>Type: {item.metadata.mimeType}</p>
              <p>Size: {(item.metadata.size / 1024).toFixed(2)} KB</p>
              <p>Uploaded: {formatDate(item.createdAt)}</p>
              <p className="mt-1 flex items-center">
                <span className="mr-2">Status:</span>
                {hasValidEmbedding(item) ? (
                  <span className="flex items-center text-green-600">
                    <Check size={16} className="mr-1" />
                    Processed
                  </span>
                ) : (
                  <span className="flex items-center text-amber-600">
                    Unprocessed
                  </span>
                )}
              </p>
            </div>

            {item.analysis.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 line-clamp-2">{item.analysis.description}</p>
                {item.analysis.tags && item.analysis.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.analysis.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.analysis.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{item.analysis.tags.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {!hasValidEmbedding(item) && (
              <div className="mt-4 p-4 bg-gray-50 flex justify-between items-center rounded-lg">
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
                <button
                  onClick={() => handleProcessSingle(item._id.toString())}
                  disabled={processingItemId === item._id.toString()}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  {processingItemId === item._id.toString() ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Process</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Loading skeletons */}
        {isLoading && (
          <>
            <DataSkeleton />
            <DataSkeleton />
            <DataSkeleton />
          </>
        )}
      </div>

      {/* Infinite scroll observer */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="w-full h-20 flex items-center justify-center"
        >
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* Image preview modal */}
      {previewItem && (
        <ImagePreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
