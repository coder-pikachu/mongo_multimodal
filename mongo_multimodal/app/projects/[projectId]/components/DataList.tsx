'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ClientProjectData } from '@/types/clientTypes';
import { Eye, Trash2, MessageSquare, BrainCircuit, Image as ImageIcon, X, Loader2, Wand2, FileText, Globe } from 'lucide-react';
import { useSearchResult } from './SearchResultContext';
import ProcessButton from './ProcessButton';
import { ImagePreviewModal } from './ImagePreviewModal';

interface DataListProps {
  projectId: string;
  data: ClientProjectData[];
  onSelectForChat: () => void;
  onSelectForAgent: () => void;
}

const ITEMS_PER_PAGE = 12;

// Utility to check if an embedding is valid
const hasValidEmbedding = (item: ClientProjectData): boolean => {
  return !!item.embedding &&
         Array.isArray(item.embedding) &&
         item.embedding.length > 0 &&
         item.embedding.every(val => typeof val === 'number');
};

// Utility to get type label for chunks
const getTypeLabel = (item: ClientProjectData): string => {
  if (item.type === 'text_chunk') return 'Text Chunk';
  if (item.type === 'web_chunk') return 'Web Chunk';
  if (item.type === 'image') return 'Image';
  if (item.type === 'document') return 'Document';
  return item.type;
};

// Utility to get chunk indicator
const getChunkIndicator = (item: ClientProjectData): string | null => {
  if ((item.type === 'text_chunk' || item.type === 'web_chunk') && item.metadata?.chunkInfo) {
    const chunkInfo = item.metadata.chunkInfo;
    return `Chunk ${chunkInfo.chunkIndex + 1}/${chunkInfo.totalChunks}`;
  }
  return null;
};

export default function DataList({ projectId, data, onSelectForChat, onSelectForAgent }: DataListProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [previewDataId, setPreviewDataId] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState<string | null>(null);
  const [displayedItems, setDisplayedItems] = useState<ClientProjectData[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { setSelectedResult } = useSearchResult();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Initialize with first page
  useEffect(() => {
    setDisplayedItems(data.slice(0, ITEMS_PER_PAGE));
  }, [data]);

  // Load more items
  const loadMore = useCallback(() => {
    if (isLoadingMore || displayedItems.length >= data.length) return;

    setIsLoadingMore(true);

    // Simulate async loading
    setTimeout(() => {
    const nextPage = page + 1;
    const start = (nextPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
      const newItems = data.slice(start, end);

      setDisplayedItems(prev => [...prev, ...newItems]);
    setPage(nextPage);
      setIsLoadingMore(false);
    }, 300);
  }, [page, data, displayedItems.length, isLoadingMore]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    // TODO: Implement delete functionality
    console.log('Delete items:', selectedItems);
  };

  const handlePreview = (item: ClientProjectData) => {
    setPreviewDataId(item._id);
  };

  const handleSelectForChat = (item: ClientProjectData) => {
    setSelectedResult(item);
    onSelectForChat();
  };

  const handleSelectForAgent = (item: ClientProjectData) => {
    setSelectedResult(item);
    onSelectForAgent();
  };

  const handleAnalyze = async (item: ClientProjectData) => {
    if (item.type !== 'image') return;
    try {
      setLoadingImage(item._id);
      const resp = await fetch(`/api/projects/data/${item._id}/analyze`, { method: 'POST' });
      if (!resp.ok) throw new Error('Analyze failed');
      // Refresh analysis in UI
      const { analysis } = await resp.json();
      item.analysis = {
        description: analysis?.description || item.analysis.description,
        tags: analysis?.tags || item.analysis.tags,
        insights: analysis?.insights || item.analysis.insights,
      } as any;
    } catch (e: unknown) {
      console.error('Analyze error:', e);
    } finally {
      setLoadingImage(null);
    }
  };

  const hasMore = displayedItems.length < data.length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Showing {displayedItems.length} of {data.length} items</span>
        {selectedItems.length > 0 && (
              <button
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white rounded-md flex items-center gap-2 hover:bg-red-600"
            >
            <Trash2 className="h-3 w-3" />
            Delete ({selectedItems.length})
            </button>
          )}
        </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayedItems.map(item => (
          <div
            key={item._id}
            className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-2 flex-grow">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item._id)}
                  onChange={() => handleSelectItem(item._id)}
                  className="mt-1"
                />
                <div className="flex-grow min-w-0">
                  <p className="font-medium truncate" title={item.metadata.filename}>
                    {item.metadata.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">{getTypeLabel(item)}</p>
                    {getChunkIndicator(item) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {getChunkIndicator(item)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {(item.metadata.size / 1024).toFixed(2)} KB
                  </p>
                  {item.type === 'web_chunk' && item.metadata?.chunkInfo?.sourceUrl && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 truncate mt-1">
                      {item.metadata.chunkInfo.sourceUrl}
                    </p>
                  )}
                  {hasValidEmbedding(item) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mt-2">
                      Embedded
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-2">
                      No Embedding
                    </span>
                  )}
                </div>
              </div>
                <button
                  onClick={() => handlePreview(item)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded ml-2"
                title="Preview"
                disabled={loadingImage === item._id}
                >
                <Eye className={`h-4 w-4 ${loadingImage === item._id ? 'animate-pulse' : ''}`} />
                </button>
              </div>

            {/* Preview thumbnail for images */}
            {item.type === 'image' && (
              <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded p-2 flex items-center justify-center h-24">
                <ImageIcon className="h-10 w-10 text-gray-400" />
              </div>
            )}

            {/* Preview for documents */}
            {item.type === 'document' && (
              <div className="mb-3 bg-gray-50 dark:bg-gray-700 rounded p-2 h-24 overflow-hidden">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.content.text?.slice(0, 100)}...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectForChat(item)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
                  title="Ask questions in Chat"
                >
                  <MessageSquare className="h-3 w-3" />
                  Chat
                </button>
                  {item.type === 'image' && (!item.analysis?.description || item.analysis.description.trim().length === 0) && (
                    <button
                      onClick={() => handleAnalyze(item)}
                      disabled={loadingImage === item._id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-100 dark:hover:bg-amber-800"
                      title="Analyze image to generate tags & description"
                    >
                      {loadingImage === item._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Analyze
                    </button>
                  )}
                  <button
                  onClick={() => handleSelectForAgent(item)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-800"
                  title="Research with Agent"
                >
                  <BrainCircuit className="h-3 w-3" />
                  Agent
                  </button>
                </div>
                {!hasValidEmbedding(item) && (
                  <ProcessButton itemId={item._id} />
                )}
              </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex justify-center py-4"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more items...</span>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewDataId && (
        <ImagePreviewModal
          dataId={previewDataId}
          projectId={projectId}
          onClose={() => setPreviewDataId(null)}
          allItems={displayedItems}
        />
      )}

      {/* OLD MODAL TO REMOVE - KEEPING TEMPORARILY */}
      {false && previewDataId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setPreviewDataId(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-lg">Placeholder</h3>
                <p className="text-sm text-gray-500">
                  {previewItem.type} • {(previewItem.metadata.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-auto p-4">
              {previewItem.type === 'image' && previewItem.content.base64 ? (
                <img
                  src={`data:${previewItem.metadata.mimeType};base64,${previewItem.content.base64}`}
                  alt={previewItem.metadata.filename}
                  className="max-w-full h-auto rounded mx-auto"
                />
              ) : previewItem.type === 'document' ? (
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{previewItem.content.text}</pre>
                </div>
              ) : (
                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm">
                  {JSON.stringify(previewItem.content, null, 2)}
                </pre>
              )}

              {/* Analysis Info */}
              {previewItem.analysis && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded">
                  <h4 className="font-semibold mb-2">Analysis</h4>
                  {previewItem.analysis.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {previewItem.analysis.description}
                    </p>
                  )}
                  {previewItem.analysis.tags && previewItem.analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {previewItem.analysis.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {previewItem.analysis.insights && previewItem.analysis.insights.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Insights:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                        {previewItem.analysis.insights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                onClick={() => {
                  handleSelectForChat(previewItem);
                  setPreviewItem(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <MessageSquare className="h-4 w-4" />
                Ask Questions in Chat
              </button>
              <button
                onClick={() => {
                  handleSelectForAgent(previewItem);
                  setPreviewItem(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                <BrainCircuit className="h-4 w-4" />
                Research with Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
