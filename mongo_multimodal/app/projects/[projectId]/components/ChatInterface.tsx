'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

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

interface ChatInterfaceProps {
  projectId: string;
  sampleQuestions?: string[];
}

export default function ChatInterface({ projectId, sampleQuestions = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const MAX_RETRIES = 3;

  // Reset zoom and position when modal opens
  useEffect(() => {
    if (enlargedImage) {
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [enlargedImage]);

  // Handle zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setImageScale(prev => {
      const newScale = direction === 'in' ? prev * 1.2 : prev / 1.2;
      return Math.max(0.5, Math.min(5, newScale)); // Limit zoom between 0.5x and 5x
    });
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 'in' : 'out');
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (imageScale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  // Handle drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageScale > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset image
  const resetImage = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to your Research Assistant!\n\n',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

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
    setRetryCount(0);
    setIsRetrying(false);

    await performSearch(currentInput);
  };

  const performSearch = async (query: string, isRetry = false) => {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      if (isRetry && !isRetrying) {
        setIsRetrying(true);
        const thinkingMessage: Message = {
          id: `thinking-${Date.now().toString()}`,
          role: 'assistant',
          content: 'I\'m still thinking about your question. This might take a moment for complex analyses...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, thinkingMessage]);
      }

      const response = await fetch(`${baseUrl}/api/projects/${projectId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, type: 'text' })
      });

      if (response.status === 529) {
        if (retryCount < MAX_RETRIES) {
          console.log(`Search timed out, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          setRetryCount(prev => prev + 1);

          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          return performSearch(query, true);
        } else {
          throw new Error('Search timed out after multiple retries');
        }
      }

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const { results, analysis }: { results: SearchResult[]; analysis: string } = await response.json();

      if (isRetrying) {
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('thinking-')));
      }

      if (!results || results.length === 0) {
        const noResultsMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I couldn\'t find any relevant information in the project. Try rephrasing your query, being more specific, or uploading more content related to your question.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, noResultsMessage]);
        return;
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: analysis || results[0]?.analysis?.description || 'I found some relevant items but couldn\'t generate a detailed analysis.',
        timestamp: new Date(),
        references: results.map(result => {
          const size = result.metadata.size;
          const formattedSize = size < 1024
            ? `${size} B`
            : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;

          const date = new Date(result.createdAt);
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

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

      if (isRetrying) {
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('thinking-')));
      }

      let errorMessage: Message;

      if (error instanceof Error && error.message.includes('timed out')) {
        errorMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, the analysis is taking longer than expected. This can happen with complex queries or large images. Please try again with a more specific question or a smaller image.',
          timestamp: new Date()
        };
      } else {
        errorMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while searching. This might be due to temporary service issues. Please try again in a moment.',
          timestamp: new Date()
        };
      }

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(90vh-2rem)] sticky top-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-600">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Research Assistant</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Ask questions about your documents and images</p>

        {/* Sample Questions */}
        {sampleQuestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Quick start questions:</p>
            <div className="flex flex-wrap gap-2">
              {sampleQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors cursor-pointer truncate max-w-[200px]"
                  title={question}
                  disabled={isLoading}
                >
                  {question.length > 30 ? `${question.substring(0, 30)}...` : question}
                </button>
              ))}
            </div>
          </div>
        )}
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
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                    components={{
                      // Custom styling for markdown elements with theme support
                      h1: ({children}) => (
                        <h1 className="text-xl font-bold mb-3 mt-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600 pb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({children}) => (
                        <h2 className="text-lg font-semibold mb-3 mt-4 text-gray-900 dark:text-gray-100">
                          {children}
                        </h2>
                      ),
                      h3: ({children}) => (
                        <h3 className="text-base font-medium mb-2 mt-3 text-gray-900 dark:text-gray-100">
                          {children}
                        </h3>
                      ),
                      h4: ({children}) => (
                        <h4 className="text-sm font-medium mb-2 mt-2 text-gray-900 dark:text-gray-100">
                          {children}
                        </h4>
                      ),
                      p: ({children}) => (
                        <p className="mb-3 text-gray-800 dark:text-gray-200 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({children}) => (
                        <ul className="list-disc list-inside mb-3 text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                          {children}
                        </ul>
                      ),
                      ol: ({children}) => (
                        <ol className="list-decimal list-inside mb-3 text-gray-800 dark:text-gray-200 space-y-1 ml-4">
                          {children}
                        </ol>
                      ),
                      li: ({children}) => (
                        <li className="text-gray-800 dark:text-gray-200 mb-1">
                          {children}
                        </li>
                      ),
                      strong: ({children}) => (
                        <strong className="font-semibold text-gray-900 dark:text-white">
                          {children}
                        </strong>
                      ),
                      em: ({children}) => (
                        <em className="italic text-gray-700 dark:text-gray-300">
                          {children}
                        </em>
                      ),
                      code: ({children}) => (
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm text-blue-600 dark:text-blue-300 font-mono border border-gray-200 dark:border-gray-600">
                          {children}
                        </code>
                      ),
                      pre: ({children}) => (
                        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-200 dark:border-gray-600 text-sm">
                          {children}
                        </pre>
                      ),
                      blockquote: ({children}) => (
                        <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic text-gray-700 dark:text-gray-300 mb-4 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-r">
                          {children}
                        </blockquote>
                      ),
                      a: ({href, children}) => (
                        <a href={href} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline font-medium" target="_blank" rel="noopener noreferrer">
                          {children}
                        </a>
                      ),
                      table: ({children}) => (
                        <div className="overflow-x-auto mb-4">
                          <table className="min-w-full border border-gray-200 dark:border-gray-600 rounded-lg">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({children}) => (
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          {children}
                        </thead>
                      ),
                      tbody: ({children}) => (
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                          {children}
                        </tbody>
                      ),
                      th: ({children}) => (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                          {children}
                        </th>
                      ),
                      td: () => (
                        <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">
                        </td>
                      ),
                      hr: () => (
                        <hr className="my-6 border-gray-200 dark:border-gray-600" />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              )}

              {message.references && message.references.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Referenced Items:</p>
                  {message.references.map((ref, idx) => (
                    <div key={idx} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
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
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full whitespace-nowrap">
                          {(ref.score * 100).toFixed(0)}% match
                        </span>
                      </div>

                      {ref.type === 'image' ? (
                        <div className="space-y-3">
                          <div
                            className="relative h-48 bg-gray-200 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => setEnlargedImage({
                              src: `data:image/jpeg;base64,${ref.content}`,
                              title: ref.title
                            })}
                          >
                            <Image
                              src={`data:image/jpeg;base64,${ref.content}`}
                              alt={ref.title}
                              fill
                              className="object-contain hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all flex items-center justify-center">
                              <span className="text-white text-sm opacity-0 hover:opacity-100 bg-black bg-opacity-50 px-2 py-1 rounded">
                                Click to enlarge
                              </span>
                            </div>
                          </div>
                          {/* {ref.preview && (
                            <p className="text-sm text-gray-300">{ref.preview}</p>
                          )} */}
                          {/* {ref.analysis.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ref.analysis.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )} */}
                          {/* {ref.analysis.insights.length > 0 && (
                            <div className="text-sm text-gray-300">
                              <p className="font-medium mb-1">Insights:</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {ref.analysis.insights.map((insight, i) => (
                                  <li key={i}>{insight}</li>
                                ))}
                              </ul>
                            </div>
                          )} */}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{ref.preview}</p>
                          {ref.analysis.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ref.analysis.tags.map((tag, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
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

              <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <p className="text-sm text-gray-700 dark:text-gray-300">Searching and analyzing...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask questions about your documents and images..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-600 flex-shrink-0">
              <h3 className="text-white text-lg font-medium truncate mr-4">{enlargedImage.title}</h3>
              <div className="flex items-center space-x-2">
                {/* Zoom Controls */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleZoom('out'); }}
                  className="text-white hover:text-gray-300 text-xl font-bold px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="text-white text-sm min-w-[60px] text-center bg-gray-800 px-2 py-1 rounded border border-gray-600">
                  {Math.round(imageScale * 100)}%
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleZoom('in'); }}
                  className="text-white hover:text-gray-300 text-xl font-bold px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); resetImage(); }}
                  className="text-white hover:text-gray-300 text-sm px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600"
                  title="Reset Zoom"
                >
                  Reset
                </button>
                <button
                  onClick={() => setEnlargedImage(null)}
                  className="text-white hover:text-red-400 text-2xl font-bold px-3 py-1 bg-red-900 hover:bg-red-800 rounded border border-red-700"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div
              className="flex-1 overflow-hidden relative bg-gray-800 min-h-0"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: isDragging ? 'grabbing' : imageScale > 1 ? 'grab' : 'default' }}
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                }}
              >
                <Image
                  src={enlargedImage.src}
                  alt={enlargedImage.title}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="p-2 bg-gray-900 border-t border-gray-600 text-center flex-shrink-0">
              <p className="text-white text-xs opacity-75">
                Mouse wheel to zoom • Drag to pan when zoomed • Click outside to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
