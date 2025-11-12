'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { CheckSquare, Square, FileText, Image as ImageIcon, Eye, Loader2, Brain, Sparkles } from 'lucide-react';
import { ClientProjectData } from '@/app/types/clientTypes';
import { useSelection } from '../SelectionContext';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface BrowsePanelProps {
  projectId: string;
  projectData: ClientProjectData[];
  onDataUpdate?: () => void;
}

export function BrowsePanel({ projectId, projectData, onDataUpdate }: BrowsePanelProps) {
  const [showUnanalyzedOnly, setShowUnanalyzedOnly] = useState(false);
  const [showUnembeddedOnly, setShowUnembeddedOnly] = useState(false);
  const [previewDataId, setPreviewDataId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20); // Initial number of items to display
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set());
  const [analyzingItems, setAnalyzingItems] = useState<Set<string>>(new Set());
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [isBulkEmbedding, setIsBulkEmbedding] = useState(false);

  const { toggleItem, isSelected, selectedItems, clearSelection } = useSelection();
  const observer = useRef<IntersectionObserver | null>(null);

  // Filter data based on toggles
  const filteredData = useMemo(() => {
    let filtered = [...projectData];

    if (showUnanalyzedOnly) {
      filtered = filtered.filter((item) => !item.analysis || !item.analysis.description);
    }

    if (showUnembeddedOnly) {
      filtered = filtered.filter((item) => !item.embedding || item.embedding.length === 0);
    }

    return filtered;
  }, [projectData, showUnanalyzedOnly, showUnembeddedOnly]);

  // Items to actually display (paginated)
  const displayedData = useMemo(() => {
    return filteredData.slice(0, displayCount);
  }, [filteredData, displayCount]);

  const hasMore = displayedData.length < filteredData.length;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      // Simulate a small delay for smooth UX
      setTimeout(() => {
        setDisplayCount(prev => prev + 20);
        setIsLoadingMore(false);
      }, 100);
    }
  }, [hasMore, isLoadingMore]);

  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, loadMore]);

  const handleSelectAll = () => {
    filteredData.forEach((item) => {
      if (!isSelected(item._id)) {
        toggleItem(item);
      }
    });
  };

  const handleDeselectAll = () => {
    filteredData.forEach((item) => {
      if (isSelected(item._id)) {
        toggleItem(item);
      }
    });
  };

  const selectedCount = filteredData.filter((item) => isSelected(item._id)).length;
  const allSelected = selectedCount === filteredData.length && filteredData.length > 0;

  const handleAnalyze = async (itemId: string) => {
    setAnalyzingItems(prev => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/projects/data/${itemId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze');
      }

      // Refresh the data
      if (onDataUpdate) {
        onDataUpdate();
      }
    } catch (error) {
      console.error('Error analyzing item:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze item');
    } finally {
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleEmbed = async (itemId: string) => {
    setProcessingItems(prev => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/projects/data/${itemId}/process`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate embedding');
      }

      // Refresh the data
      if (onDataUpdate) {
        onDataUpdate();
      }
    } catch (error) {
      console.error('Error processing item:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate embedding');
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleBulkAnalyze = async () => {
    const selectedIds = Array.from(selectedItems).map(item => item._id);
    if (selectedIds.length === 0) {
      alert('Please select at least one item to analyze');
      return;
    }

    setIsBulkAnalyzing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/data/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk analyze');
      }

      // Refresh the data
      if (onDataUpdate) {
        onDataUpdate();
      }

      clearSelection();
    } catch (error) {
      console.error('Error bulk analyzing:', error);
      alert(error instanceof Error ? error.message : 'Failed to bulk analyze items');
    } finally {
      setIsBulkAnalyzing(false);
    }
  };

  const handleBulkEmbed = async () => {
    const selectedIds = Array.from(selectedItems).map(item => item._id);
    if (selectedIds.length === 0) {
      alert('Please select at least one item to embed');
      return;
    }

    setIsBulkEmbedding(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/data/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk embed');
      }

      // Refresh the data
      if (onDataUpdate) {
        onDataUpdate();
      }

      clearSelection();
    } catch (error) {
      console.error('Error bulk embedding:', error);
      alert(error instanceof Error ? error.message : 'Failed to bulk embed items');
    } finally {
      setIsBulkEmbedding(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Browse Data
        </h3>

        {/* Filters */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnanalyzedOnly}
              onChange={(e) => setShowUnanalyzedOnly(e.target.checked)}
              className="rounded border-gray-300 text-[#00ED64] focus:ring-[#00ED64]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Unanalyzed only
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnembeddedOnly}
              onChange={(e) => setShowUnembeddedOnly(e.target.checked)}
              className="rounded border-gray-300 text-[#00ED64] focus:ring-[#00ED64]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Unembedded only
            </span>
          </label>
        </div>

        {/* Stats and Select All */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {selectedCount} of {filteredData.length} selected
              </span>
              {displayedData.length < filteredData.length && (
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {displayedData.length} loaded
                </span>
              )}
            </div>
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              className="text-xs text-[#13AA52] dark:text-[#00ED64] hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        )}

        {/* Bulk Action Buttons */}
        {selectedCount > 0 && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleBulkAnalyze}
              disabled={isBulkAnalyzing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                       bg-green-100 dark:bg-green-900/30 text-[#00684A] dark:text-[#00ED64]
                       rounded-md hover:bg-green-200 dark:hover:bg-green-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={`Analyze ${selectedCount} selected items`}
            >
              {isBulkAnalyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Brain className="w-3.5 h-3.5" />
              )}
              {isBulkAnalyzing ? 'Analyzing...' : `Analyze ${selectedCount}`}
            </button>
            <button
              onClick={handleBulkEmbed}
              disabled={isBulkEmbedding}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium
                       bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400
                       rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={`Embed ${selectedCount} selected items`}
            >
              {isBulkEmbedding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {isBulkEmbedding ? 'Embedding...' : `Embed ${selectedCount}`}
            </button>
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
        {displayedData.map((item, index) => {
          const selected = isSelected(item._id);
          const hasAnalysis = item.analysis && item.analysis.description;
          const hasEmbedding = item.embedding && item.embedding.length > 0;
          const isLastItem = index === displayedData.length - 1;

          return (
            <div
              key={item._id}
              ref={isLastItem ? lastItemRef : null}
              className={`
                p-3 border rounded-md transition-colors
                ${selected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
                }
              `}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox */}
                <div className="mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => toggleItem(item)}>
                  {selected ? (
                    <CheckSquare className="w-4 h-4 text-[#00ED64] dark:text-[#00ED64]" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleItem(item)}>
                  {/* Header */}
                  <div className="flex items-start gap-2 mb-1">
                    {/* Type Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {item.type === 'image' ? (
                        <ImageIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>

                    {/* Filename */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.metadata?.filename || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(item.metadata?.size || 0) > 0
                          ? `${Math.round((item.metadata?.size || 0) / 1024)} KB`
                          : 'Unknown size'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {!hasAnalysis && (
                      <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300
                                     text-xs rounded">
                        Unanalyzed
                      </span>
                    )}
                    {!hasEmbedding && (
                      <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300
                                     text-xs rounded">
                        Unembedded
                      </span>
                    )}
                    {hasAnalysis && hasEmbedding && (
                      <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300
                                     text-xs rounded">
                        Ready
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {hasAnalysis && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                      {item.analysis.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.analysis?.tags && item.analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.analysis.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded
                                   text-gray-600 dark:text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.analysis.tags.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{item.analysis.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                    {!hasAnalysis && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAnalyze(item._id);
                        }}
                        disabled={analyzingItems.has(item._id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30
                                 text-[#00684A] dark:text-[#00ED64] rounded hover:bg-green-200 dark:hover:bg-green-900/50
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Analyze with AI"
                      >
                        {analyzingItems.has(item._id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Brain className="w-3 h-3" />
                        )}
                        {analyzingItems.has(item._id) ? 'Analyzing...' : 'Analyze'}
                      </button>
                    )}

                    {!hasEmbedding && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmbed(item._id);
                        }}
                        disabled={processingItems.has(item._id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30
                                 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Generate embedding"
                      >
                        {processingItems.has(item._id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {processingItems.has(item._id) ? 'Embedding...' : 'Embed'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons Column */}
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {/* Preview Button */}
                  {item.type === 'image' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDataId(item._id);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      title="Preview image"
                    >
                      <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewDataId && (
        <ImagePreviewModal
          dataId={previewDataId}
          projectId={projectId}
          onClose={() => setPreviewDataId(null)}
          allItems={displayedData}
        />
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#00ED64]" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading more...</span>
        </div>
      )}

      {/* End of Results Message */}
      {displayedData.length > 0 && !hasMore && !isLoadingMore && (
        <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
          All {filteredData.length} items loaded
        </div>
      )}

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          {projectData.length === 0 ? (
            <>No data in this project yet. Upload some files to get started.</>
          ) : (
            <>No items match the current filters.</>
          )}
        </div>
      )}
    </div>
  );
}
