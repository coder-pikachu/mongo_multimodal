'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Loader2 } from 'lucide-react';
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

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    if (!data.query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: data.query }),
      });

      if (!response.ok) throw new Error('Search failed');

      const searchResults = await response.json();
      console.log(searchResults);
      setResults(searchResults.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Global Search</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                {...register('query')}
                name="query"
                type="text"
                placeholder="Search across all projects..."
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent placeholder-zinc-500 dark:placeholder-zinc-400"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          {

          }
          {results.map((result) => (
            <div
              key={result._id}
              className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700"
            >
              <div className="flex items-start gap-4">
                {result.type === 'image' && result.content.base64 && (
                  <div className="flex-shrink-0">
                    <Image
                      src={`data:${result.metadata.mimeType};base64,${result.content.base64}`}
                      alt={result.metadata.filename}
                      width={100}
                      height={100}
                      className="rounded-md object-cover ring-1 ring-zinc-900/5 dark:ring-white/10"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/projects/${result.projectId}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {result.projectName}
                    </Link>
                    <span className="text-zinc-400 dark:text-zinc-500">•</span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {format(new Date(result.createdAt), 'PPP')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    {result.metadata.filename}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-300 mb-2">{result.analysis.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {result.analysis.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
