'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface SearchResult {
  _id: string;
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

interface ReferenceItem {
  id: string;
  type: 'image' | 'document';
  title: string;
  preview: string;
  content: string;
  mimeType: string;
  size: number;
  analysis: {
    description: string;
    tags: string[];
    insights: string[];
  };
  score: number;
  formattedSize: string;
  formattedDate: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  references?: ReferenceItem[];
}

interface AnalysisResult {
  type: 'text';
  text: string;
}



interface ChatInterfaceProps {
  projectId: string;
}

export default function ChatInterface({ projectId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput(''); // Clear input immediately after submission
    setIsLoading(true);

    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/projects/${projectId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: currentInput, type: 'text' })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const { results, analysis }: { results: SearchResult[], analysis: AnalysisResult[] } = await response.json();

      if (!results || results.length === 0) {
        const noResultsMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I couldn\'t find any relevant information in the project. Try rephrasing your query or uploading more content.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, noResultsMessage]);
        return;
      }

      // Create message with Claude's analysis and search results
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis[0]?.text || 'I found some relevant items but couldn\'t generate a detailed analysis.',
        timestamp: new Date(),
        references: results.map(result => {
          // Format file size
          const size = result.metadata.size;
          const formattedSize = size < 1024
            ? `${size} B`
            : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;

          // Format date
          const date = new Date(result.createdAt);
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          // Create reference item
          const referenceItem: ReferenceItem = {
            id: result._id,
            type: result.type,
            title: result.metadata.filename,
            preview: result.type === 'document'
              ? (result.content.text?.slice(0, 200) + '...') || 'No text content'
              : result.analysis.description || 'Image',
            content: result.content.base64 || '',
            mimeType: result.metadata.mimeType,
            size: result.metadata.size,
            analysis: result.analysis,
            score: result.score,
            formattedSize,
            formattedDate
          };

          return referenceItem;

        })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while searching.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] sticky top-20 bg-gray-700 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-600">
        <h2 className="text-lg font-semibold text-white">Research Assistant</h2>
        <p className="text-sm text-gray-300">Ask questions about your documents and images</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-600'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>

              {message.references && message.references.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500">Referenced Items:</p>
                  {message.references.map((ref, idx) => (
                    <div key={idx} className="p-4 bg-gray-800 rounded-lg border border-gray-600 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium text-sm truncate">{ref.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {ref.type.charAt(0).toUpperCase() + ref.type.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{ref.formattedSize}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{ref.formattedDate}</span>
                          </div>
                        </div>
                        <span className="text-xs bg-blue-900/50 text-blue-200 px-2 py-1 rounded-full whitespace-nowrap">
                          {(ref.score * 100).toFixed(0)}% match
                        </span>
                      </div>

                      {ref.type === 'image' ? (
                        <div className="space-y-3">
                          <div className="relative h-48 bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                            <Image
                              src={`data:image/jpeg;base64,${ref.content}`}
                              alt={ref.title}
                              fill
                              className="object-contain"
                            />
                          </div>
                          {ref.preview && (
                            <p className="text-sm text-gray-300">{ref.preview}</p>
                          )}
                          {ref.analysis.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ref.analysis.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {ref.analysis.insights.length > 0 && (
                            <div className="text-sm text-gray-300">
                              <p className="font-medium mb-1">Insights:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {ref.analysis.insights.map((insight, i) => (
                                  <li key={i}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-700">{ref.preview}</p>
                          {ref.analysis.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ref.analysis.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs mt-2 text-gray-400">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <p className="text-sm text-gray-300">Searching and analyzing...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask questions about your documents and images..."
            className="flex-1 px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-800 text-gray-100 placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
