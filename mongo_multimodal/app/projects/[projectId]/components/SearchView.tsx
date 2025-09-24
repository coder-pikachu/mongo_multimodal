
'use client'
import { useState } from "react";
import { SearchResult } from "@/types/clientTypes";
import { Search, Eye, MessageSquare, Clock, Target, BrainCircuit, X, Loader2 } from "lucide-react";
import { useEffect } from 'react';
import { useSearchResult } from "./SearchResultContext";

interface SearchViewProps {
    projectId: string;
    onSelectResult: () => void;
    onSelectForAgent: () => void;
    searchResults: PaginatedResults | null;
    setSearchResults: (results: PaginatedResults | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

interface PaginatedResults {
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    timeTaken: number;
}

export default function SearchView({
    projectId,
    onSelectResult,
    onSelectForAgent,
    searchResults,
    setSearchResults,
    searchQuery,
    setSearchQuery
}: SearchViewProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { selectedResult, setSelectedResult } = useSearchResult();
    const [previewItem, setPreviewItem] = useState<SearchResult | null>(null);
    const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

    // Thumbnail component that fetches image on-demand
    function ImageThumbnail({ id, mime }: { id: string; mime: string }) {
        const [src, setSrc] = useState<string | null>(null);
        const [isLoadingThumb, setIsLoadingThumb] = useState(false);
        const [thumbError, setThumbError] = useState<string | null>(null);

        const loadThumbnail = async () => {
            if (src || isLoadingThumb) return;
            setThumbError(null);
            setIsLoadingThumb(true);
            try {
                const resp = await fetch(`/api/projects/data/${id}/content`);
                if (!resp.ok) throw new Error('Failed to load thumbnail');
                const data = await resp.json();
                if (data?.content?.base64) {
                    setSrc(`data:${mime};base64,${data.content.base64}`);
                } else {
                    throw new Error('No image data');
                }
            } catch (e: unknown) {
                const err = e as Error;
                setThumbError(err.message);
            } finally {
                setIsLoadingThumb(false);
            }
        };

        return (
            <div className="mt-2">
                {src ? (
                    <img src={src} alt="thumbnail" className="max-w-xs max-h-32 object-contain rounded border" />
                ) : (
                    <div className="h-24 w-36 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                        <button
                            onClick={loadThumbnail}
                            className="px-2 py-1 text-xs bg-white dark:bg-gray-800 border rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-1"
                            disabled={isLoadingThumb}
                            title="Load thumbnail"
                        >
                            {isLoadingThumb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                            {isLoadingThumb ? 'Loading…' : 'Load thumbnail'}
                        </button>
                    </div>
                )}
                {thumbError && (
                    <p className="text-xs text-red-500 mt-1">{thumbError}</p>
                )}
            </div>
        );
    }

    const handleSearch = async (page = 1) => {
        if (!searchQuery) return;

        setIsLoading(true);
        setError(null);
        setSelectedResult(null); // Clear selected result on new search

        try {
            const response = await fetch(`/api/projects/${projectId}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, mode: 'search', page, limit: 10 }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong');
            }

            const data: PaginatedResults = await response.json();
            setSearchResults(data);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= (searchResults?.totalPages || 0)) {
            handleSearch(newPage);
        }
    }

    const handleResultSelect = (result: SearchResult) => {
        setSelectedResult(result);
    };

    const handlePreview = async (result: SearchResult) => {
        // For images, ensure base64 content is loaded before opening the modal
        if (result.type === 'image' && !result.content?.base64) {
            setLoadingPreviewId(result._id);
            try {
                const resp = await fetch(`/api/projects/data/${result._id}/content`);
                if (resp.ok) {
                    const data = await resp.json();
                    const enriched: SearchResult = {
                        ...result,
                        content: { ...result.content, base64: data?.content?.base64 },
                    } as SearchResult;
                    setPreviewItem(enriched);
                } else {
                    setPreviewItem(result);
                }
            } catch {
                setPreviewItem(result);
            } finally {
                setLoadingPreviewId(null);
            }
        } else {
            setPreviewItem(result);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Input */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder="Search your project data..."
                    className="flex-grow p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    onClick={() => handleSearch()}
                    disabled={isLoading || !searchQuery}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 flex items-center shadow-sm hover:bg-blue-600"
                >
                    <Search className="h-5 w-5 mr-2" />
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* Search Stats */}
            {searchResults && (
                <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            Found {searchResults.total} results
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {searchResults.timeTaken}ms
                        </span>
                    </div>
                    <span>
                        Page {searchResults.page} of {searchResults.totalPages}
                    </span>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Search Results */}
            {searchResults && (
                <div className="space-y-4">
                    {searchResults.results.map((result, _index) => (
                        <div
                            key={result._id}
                            className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                                selectedResult?._id === result._id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white dark:bg-gray-800'
                            }`}
                        >
                            {/* Result Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full">
                                        {result.type}
                                    </span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {result.metadata?.filename || 'Unknown file'}
                                    </span>
                                     <span className="flex items-center gap-1 text-xs text-gray-500">
                                        <Target className="h-3 w-3" />
                                         {(Math.round((result.score ?? 0) * 10000) / 100).toFixed(2)}% match
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePreview(result)}
                                        className="p-1 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50"
                                        title="Preview"
                                        disabled={loadingPreviewId === result._id}
                                    >
                                        {loadingPreviewId === result._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleResultSelect(result)}
                                        className={`p-1 rounded ${
                                            selectedResult?._id === result._id
                                                ? 'text-green-600 bg-green-100'
                                                : 'text-gray-500 hover:text-green-500 hover:bg-green-50'
                                        }`}
                                        title="Ask questions about this result"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedResult(result);
                                            onSelectForAgent();
                                        }}
                                        className="p-1 text-gray-500 hover:text-purple-500 hover:bg-purple-50 rounded"
                                        title="Research with agent"
                                    >
                                        <BrainCircuit className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Result Content Preview */}
                            <div className="space-y-2">
                                {result.analysis?.description && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                        {result.analysis.description}
                                    </p>
                                )}

                                {result.analysis?.tags && result.analysis.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {result.analysis.tags.slice(0, 5).map((tag, tagIndex) => (
                                            <span
                                                key={tagIndex}
                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {result.analysis.tags.length > 5 && (
                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded">
                                                +{result.analysis.tags.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Image thumbnail loads on demand to avoid excessive /content calls */}
                                {result.type === 'image' && (
                                    <ImageThumbnail id={result._id} mime={result.metadata?.mimeType || 'image/jpeg'} />
                                )}

                                {/* Text preview for document type */}
                                {result.type === 'document' && result.content?.text && (
                                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                                        <p className="line-clamp-2 text-gray-600 dark:text-gray-400">
                                            {result.content.text.substring(0, 200)}...
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button
                            onClick={() => handlePageChange(searchResults.page - 1)}
                            disabled={searchResults.page <= 1}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2">
                            Page {searchResults.page} of {searchResults.totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(searchResults.page + 1)}
                            disabled={searchResults.page >= searchResults.totalPages}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Selected Result Notice */}
            {selectedResult && (
                <div className="fixed bottom-4 right-4 flex items-center gap-4 p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg shadow-lg">
                    <div>
                        <p className="text-sm font-medium">
                            Selected: {selectedResult.metadata?.filename}
                        </p>
                        <p className="text-xs text-green-600">
                            Ready to discuss in Chat mode.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            onSelectResult();
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600"
                    >
                        Go to Chat
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            {previewItem && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={() => setPreviewItem(null)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="font-bold text-lg">{previewItem.metadata?.filename || 'Preview'}</h3>
                                <p className="text-sm text-gray-500">{previewItem.type}</p>
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
                            {previewItem.type === 'image' && previewItem.content?.base64 ? (
                                <img
                                    src={`data:${previewItem.metadata?.mimeType};base64,${previewItem.content.base64}`}
                                    alt={previewItem.metadata?.filename || 'image'}
                                    className="max-w-full h-auto rounded mx-auto"
                                />
                            ) : previewItem.type === 'document' ? (
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded">
                                    <pre className="whitespace-pre-wrap text-sm font-mono">{previewItem.content?.text}</pre>
                                </div>
                            ) : (
                                <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm">
                                    {JSON.stringify(previewItem.content, null, 2)}
                                </pre>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                            <button
                                onClick={() => {
                                    setSelectedResult(previewItem);
                                    onSelectResult();
                                    setPreviewItem(null);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Ask Questions in Chat
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedResult(previewItem);
                                    onSelectForAgent();
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