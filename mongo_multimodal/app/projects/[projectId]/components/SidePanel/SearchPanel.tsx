'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, Target, Clock, Loader2, CheckSquare, Square, Eye } from 'lucide-react';
import { SearchResult } from '@/app/types/clientTypes';
import { useSelection } from '../SelectionContext';
import { ImagePreviewModal } from '../ImagePreviewModal';

interface SearchPanelProps {
  projectId: string;
}

interface PaginatedResults {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timeTaken: number;
}

export function SearchPanel({ projectId }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDataId, setPreviewDataId] = useState<string | null>(null);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const { toggleItem, isSelected } = useSelection();
  const observer = useRef<IntersectionObserver | null>(null);

  const handleSearch = async (page = 1, isNewSearch = true) => {
    if (!searchQuery.trim()) return;

    // If it's a new search and query changed, reset everything
    if (isNewSearch && searchQuery !== lastSearchQuery) {
      setAllResults([]);
      setCurrentPage(1);
      page = 1;
      setLastSearchQuery(searchQuery);
    }

    if (isNewSearch) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          mode: 'search',
          page,
          limit: 20
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data: PaginatedResults = await response.json();

      if (isNewSearch) {
        setAllResults(data.results);
      } else {
        setAllResults(prev => [...prev, ...data.results]);
      }

      setTotalResults(data.total);
      setTotalPages(data.totalPages);
      setTimeTaken(data.timeTaken);
      setCurrentPage(data.page);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && currentPage < totalPages) {
      handleSearch(currentPage + 1, false);
    }
  }, [currentPage, totalPages, isLoadingMore, searchQuery]);

  const lastResultRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && currentPage < totalPages) {
        loadMore();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoadingMore, currentPage, totalPages, loadMore]);

  const handleSelectAll = () => {
    allResults.forEach((result) => {
      if (!isSelected(result._id)) {
        toggleItem(result);
      }
    });
  };

  const handleDeselectAll = () => {
    allResults.forEach((result) => {
      if (isSelected(result._id)) {
        toggleItem(result);
      }
    });
  };

  const selectedCount = allResults.filter((r) => isSelected(r._id)).length;
  const allSelected = selectedCount === allResults.length && allResults.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Search Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Search project data..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     focus:ring-2 focus:ring-[#00ED64] focus:border-[#00ED64]
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !searchQuery.trim()}
            className="px-3 py-2 bg-[#00ED64] hover:bg-[#13AA52] text-gray-900 rounded-md disabled:bg-gray-400
                     disabled:cursor-not-allowed transition-colors"
            aria-label="Search"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Press Enter to search
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                      text-red-700 dark:text-red-400 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Search Stats */}
      {allResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400
                        bg-gray-50 dark:bg-gray-900 p-2 rounded-md">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {totalResults}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeTaken}ms
              </span>
            </div>
            <span className="text-xs">
              {allResults.length} loaded
            </span>
          </div>

          {/* Select All / Deselect All */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {selectedCount} of {allResults.length} selected
            </span>
            <button
              onClick={allSelected ? handleDeselectAll : handleSelectAll}
              className="text-xs text-[#13AA52] dark:text-[#00ED64] hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {allResults.length > 0 && (
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
          {allResults.map((result, index) => {
            const selected = isSelected(result._id);
            const isLastResult = index === allResults.length - 1;

            return (
              <div
                key={result._id}
                ref={isLastResult ? lastResultRef : null}
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
                  <div className="mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => toggleItem(result)}>
                    {selected ? (
                      <CheckSquare className="w-4 h-4 text-[#00ED64] dark:text-[#00ED64]" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleItem(result)}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded
                                       text-gray-700 dark:text-gray-300 flex-shrink-0">
                          {result.type}
                        </span>
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {result.metadata?.filename || 'Unknown'}
                        </span>
                      </div>
                      <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <Target className="h-2.5 w-2.5" />
                        {(Math.round((result.score ?? 0) * 10000) / 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Description */}
                    {result.analysis?.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                        {result.analysis.description}
                      </p>
                    )}

                    {/* Tags */}
                    {result.analysis?.tags && result.analysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.analysis.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded
                                     text-gray-600 dark:text-gray-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {result.analysis.tags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{result.analysis.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preview Button */}
                  {result.type === 'image' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDataId(result._id);
                      }}
                      className="mt-0.5 flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Preview image"
                    >
                      <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDataId && (
        <ImagePreviewModal
          dataId={previewDataId}
          projectId={projectId}
          onClose={() => setPreviewDataId(null)}
          allItems={allResults}
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
      {allResults.length > 0 && currentPage >= totalPages && !isLoadingMore && (
        <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
          All {totalResults} results loaded
        </div>
      )}

      {/* Empty State */}
      {!isLoading && allResults.length === 0 && lastSearchQuery && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No results found for "{lastSearchQuery}"
        </div>
      )}

      {/* Initial State */}
      {!lastSearchQuery && !isLoading && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          Enter a search query to find data in your project
        </div>
      )}
    </div>
  );
}
