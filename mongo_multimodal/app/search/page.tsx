'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Loader2, Image as ImageIcon, FileText, Calendar, TrendingUp, Eye, X, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';

interface SearchResult {
  _id: string;
  projectId: string;
  projectName: string;
  type: 'image' | 'document';
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
  };
  content: {
    text: string | null;
    base64: string | null;
  };
  analysis: {
    description: string;
    tags: string[];
    insights: string[];
  };
  createdAt: string;
  score: number;
}

interface FormData {
  query: string;
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; filename: string } | null>(null);
  const { register, handleSubmit } = useForm<FormData>();

  // Keyboard support for closing modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && enlargedImage) {
        setEnlargedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedImage]);

  const onSubmit = async (data: FormData) => {
    // Validate that either query or image is provided
    if (!data.query.trim() && !imageFile) {
      setError('Please enter a search query or upload an image');
      return;
    }

    setIsSearching(true);
    setError(null);
    setLoadedImages({});
    setLoadingImages({});
    try {
      let response;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        response = await fetch('/api/vector-search', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: data.query }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Search failed');
      }

      const searchResults = await response.json();
      setResults(searchResults.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'Failed to perform search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadImage = async (resultId: string) => {
    if (loadedImages[resultId] || loadingImages[resultId]) return;

    setLoadingImages(prev => ({ ...prev, [resultId]: true }));
    try {
      const response = await fetch(`/api/projects/data/${resultId}/content`);
      if (!response.ok) throw new Error('Failed to load image');

      const data = await response.json();
      if (data.content?.base64) {
        const result = results.find(r => r._id === resultId);
        const mimeType = result?.metadata.mimeType || 'image/jpeg';
        setLoadedImages(prev => ({
          ...prev,
          [resultId]: `data:${mimeType};base64,${data.content.base64}`
        }));
      }
    } catch (error) {
      console.error('Error loading image:', error);
      setError('Failed to load image');
    } finally {
      setLoadingImages(prev => ({ ...prev, [resultId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">

          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Search across all your projects using text or images
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-8">
            {/* Text Search */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Search by text
              </label>
              <div className="relative">
                <input
                  {...register('query')}
                  type="text"
                  placeholder="What are you looking for?"
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent placeholder-zinc-400 dark:placeholder-zinc-500 transition-all"
                />
                <Search className="absolute left-4 top-4 h-6 w-6 text-zinc-400 dark:text-zinc-500" />
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-zinc-200 dark:border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                  OR
                </span>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                Search by image
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                    <ImageIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {imageFile ? imageFile.name : 'Choose an image file'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {imageFile && (
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSearching}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {isSearching ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Search className="h-5 w-5" />
                  Search
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Search Error</h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!error && results.length === 0 && !isSearching && (
          <div className="max-w-3xl mx-auto text-center py-20">
            <div className="inline-flex items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6">
              <Search className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Ready to explore
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              Enter a search query or upload an image to find content across all your projects
            </p>
          </div>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </h2>
            </div>

            <div className="grid gap-6">
              {results.map((result) => (
                <div
                  key={result._id}
                  className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-6">
                      {/* Image/Document Icon Section */}
                      <div className="flex-shrink-0">
                        {result.type === 'image' ? (
                          <div className="relative">
                            {loadedImages[result._id] ? (
                              <div className="relative group cursor-pointer"
                                onClick={() => setEnlargedImage({
                                  src: loadedImages[result._id],
                                  filename: result.metadata.filename
                                })}
                              >
                                <Image
                                  src={loadedImages[result._id]}
                                  alt={result.metadata.filename}
                                  width={180}
                                  height={180}
                                  className="rounded-lg object-cover ring-2 ring-zinc-200 dark:ring-zinc-700 transition-all group-hover:ring-blue-500 dark:group-hover:ring-blue-400"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-lg flex items-center justify-center">
                                  <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-[180px] h-[180px] bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-800 rounded-lg flex items-center justify-center">
                                <button
                                  onClick={() => loadImage(result._id)}
                                  disabled={loadingImages[result._id]}
                                  className="flex flex-col items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                  {loadingImages[result._id] ? (
                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                                  ) : (
                                    <Eye className="h-8 w-8 text-blue-500" />
                                  )}
                                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                    {loadingImages[result._id] ? 'Loading...' : 'Load Image'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-[180px] h-[180px] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center">
                            <FileText className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        {/* Metadata Header */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <Link
                            href={`/projects/${result.projectId}`}
                            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {result.projectName || 'Unknown Project'}
                          </Link>
                          <span className="text-zinc-300 dark:text-zinc-600">•</span>
                          <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(result.createdAt), 'PPP')}
                          </div>
                          <span className="text-zinc-300 dark:text-zinc-600">•</span>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300">
                            <TrendingUp className="h-3 w-3" />
                            {(result.score * 100).toFixed(1)}% match
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                          {result.type === 'image' ? (
                            <ImageIcon className="h-5 w-5 text-zinc-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-zinc-500" />
                          )}
                          {result.metadata.filename}
                        </h3>

                        {/* Description */}
                        <p className="text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
                          {result.analysis.description}
                        </p>

                        {/* Tags */}
                        {result.analysis.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {result.analysis.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full border border-zinc-200 dark:border-zinc-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Lightbox Modal */}
        {enlargedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setEnlargedImage(null)}
          >
            <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
              {/* Close Button */}
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Image Container */}
              <div
                className="relative max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.filename}
                  className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                />

                {/* Image Info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  <p className="text-white font-medium text-lg">{enlargedImage.filename}</p>
                  <p className="text-zinc-300 text-sm mt-1">Click outside or press ESC to close</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
