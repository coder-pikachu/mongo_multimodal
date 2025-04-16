'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Upload, Loader2, MessageSquare, ZoomIn, X, SlidersHorizontal, BarChart2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface VectorSearchResult {
  _id: string;
  metadata: {
    filename: string;
    mimeType: string;
    size?: number;
  };
  content: {
    base64: string;
  };
  analysis: {
    description: string;
    tags: string[];
  };
  score: number;
  createdAt: string;
}

// Prebaked questions for different types of images
const PREBAKED_QUESTIONS: { [key: string]: string[] } = {
  default: [
    "What objects or items can you identify in this image?",
    "What is the main subject or focus of this image?",
    "What colors are predominantly used in this image?",
    "Can you describe the composition and layout of this image?",
  ],
  document: [
    "What type of document is this?",
    "What are the key points discussed in this document?",
    "Are there any important dates or numbers mentioned?",
    "Can you summarize the main content of this document?",
  ],
  diagram: [
    "What does this diagram represent?",
    "What are the main components shown in this diagram?",
    "How are the different elements connected or related?",
    "What is the purpose or function of this diagram?",
  ],
  chart: [
    "What type of data is being visualized?",
    "What are the key trends or patterns shown?",
    "What is the time period covered in this chart?",
    "What conclusions can be drawn from this visualization?",
  ],
};

export default function VectorSearchPage() {
  const [results, setResults] = useState<VectorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<VectorSearchResult | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<VectorSearchResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0.6);
  const [maxResults, setMaxResults] = useState(10);
  const { register, handleSubmit, watch } = useForm();
  const imageFile = watch('image');

  const onSubmit = async (data: any) => {
    if (!data.query?.trim() && !data.image?.[0]) return;

    setIsSearching(true);
    try {
      const formData = new FormData();
      if (data.query) {
        formData.append('query', data.query);
      }
      if (data.image?.[0]) {
        formData.append('image', data.image[0]);
      }

      const response = await fetch('/api/vector-search', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Search failed');

      const searchResults = await response.json();
      setResults(searchResults.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedImage || !question.trim()) return;

    setIsAsking(true);
    try {
      const response = await fetch('/api/ask-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage.content.base64,
          question: question,
        }),
      });

      if (!response.ok) throw new Error('Failed to get answer');

      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error('Question error:', error);
    } finally {
      setIsAsking(false);
    }
  };

  // Determine which set of prebaked questions to use based on the image type
  const getPrebakeQuestions = (result: VectorSearchResult) => {
    const tags = result.analysis.tags.map(tag => tag.toLowerCase());
    if (tags.includes('document')) return PREBAKED_QUESTIONS.document;
    if (tags.includes('diagram')) return PREBAKED_QUESTIONS.diagram;
    if (tags.includes('chart') || tags.includes('graph')) return PREBAKED_QUESTIONS.chart;
    return PREBAKED_QUESTIONS.default;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    if (score >= 0.7) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    if (score >= 0.5) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              Vector Image Search
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Powered by MongoDB Atlas Vector Search with multimodal embeddings
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6 mb-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    {...register('query')}
                    type="text"
                    placeholder="Search images by description..."
                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 top-3.5 h-5 w-5 text-zinc-400" />
                </div>
                <span className="text-zinc-500 dark:text-zinc-400 flex items-center">OR</span>
                <div className="relative">
                  <input
                    {...register('image')}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer px-6 py-3 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    {imageFile?.[0]?.name || 'Upload Image'}
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Search
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Search Filters
                </button>
                {results.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <BarChart2 className="h-4 w-4" />
                    Found {results.length} results
                  </div>
                )}
              </div>

              {showFilters && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Minimum Similarity Score
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={minScore}
                      onChange={(e) => setMinScore(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {(minScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Maximum Results
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {results.map((result, index) => (
                <div
                  key={result._id}
                  className={`bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedImage?._id === result._id
                      ? 'border-blue-500 shadow-blue-100 dark:shadow-blue-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedImage(result)}
                >
                  <div className="aspect-square relative mb-4 group">
                    <Image
                      src={`data:${result.metadata.mimeType};base64,${result.content.base64}`}
                      alt={result.metadata.filename}
                      fill
                      className="rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomedImage(result);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="h-4 w-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between text-white text-sm">
                        <span className="bg-black/50 px-2 py-1 rounded-full">
                          Rank #{index + 1}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${getScoreColor(result.score)}`}>
                          {(result.score * 100).toFixed(1)}% Match
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {format(new Date(result.createdAt), 'PPP')}
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {formatFileSize(result.metadata.size)}
                      </span>
                    </div>

                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{result.analysis.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {result.analysis.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedImage && (
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 sticky top-4">
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-semibold">Image Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Filename</span>
                      <p className="font-medium">{selectedImage.metadata.filename}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Size</span>
                      <p className="font-medium">{formatFileSize(selectedImage.metadata.size)}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Upload Date</span>
                      <p className="font-medium">{format(new Date(selectedImage.createdAt), 'PPP')}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Match Score</span>
                      <p className="font-medium">{(selectedImage.score * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
                  <h3 className="text-lg font-semibold mb-4">Ask about this image</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Suggested Questions
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {getPrebakeQuestions(selectedImage).map((q, index) => (
                          <button
                            key={index}
                            onClick={() => setQuestion(q)}
                            className="text-left px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-700/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about this image..."
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <button
                      onClick={handleAskQuestion}
                      disabled={isAsking || !question.trim()}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isAsking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="h-5 w-5" />
                          Ask Question
                        </>
                      )}
                    </button>
                    {answer && (
                      <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg">
                        <p className="text-zinc-700 dark:text-zinc-300">{answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl aspect-square">
            <Image
              src={`data:${zoomedImage.metadata.mimeType};base64,${zoomedImage.content.base64}`}
              alt={zoomedImage.metadata.filename}
              fill
              className="rounded-lg object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}