
'use client'

import { useState, useEffect, useRef } from 'react';
import { Bot, User, XCircle, Image as ImageIcon } from 'lucide-react';
import { useSearchResult } from './SearchResultContext';
import { Message } from '@/types/clientTypes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface ChatViewProps {
    projectId: string;
}

export default function ChatView({ projectId }: ChatViewProps) {
    const { selectedResult, setSelectedResult } = useSearchResult();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (selectedResult) {
            const contextMessage: Message = {
                id: `context-${Date.now()}`,
                role: 'assistant',
                content: `Let's talk about "${selectedResult.metadata?.filename}". What would you like to know?`,
                createdAt: new Date(),
            };
            setMessages([contextMessage]);
        }
    }, [selectedResult]);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input,
            createdAt: new Date(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const imageUrl = selectedResult?.type === 'image' && selectedResult.content?.base64
            ? `data:${selectedResult.metadata?.mimeType || 'image/jpeg'};base64,${selectedResult.content.base64}`
            : undefined;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    projectId,
                    data: { imageUrl }
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error('Failed to get a response from the server.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantResponse = '';

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: '',
                createdAt: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                assistantResponse += chunk;

                setMessages(prev => {
                    const updatedMessages = [...prev];
                    updatedMessages[updatedMessages.length - 1].content = assistantResponse;
                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error(error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                createdAt: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {selectedResult && (
                <div className="p-3 bg-blue-50 border-b border-blue-200 dark:bg-blue-900 dark:border-blue-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                        {selectedResult.type === 'image' && <ImageIcon className="h-4 w-4" />}
                        <strong>Context:</strong>
                        <span className="truncate">{selectedResult.metadata?.filename}</span>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedResult(null);
                            setMessages([]);
                        }}
                        className="p-1 text-blue-500 hover:text-blue-700"
                        title="Clear context"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                </div>
            )}
            <div className="flex-grow overflow-y-auto pr-4 p-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">
                            {selectedResult
                                ? 'Ask a question about the selected context.'
                                : 'Start a conversation by typing below.'
                            }
                        </p>
                    </div>
                )}
                <div className="space-y-4">
                    {messages.map((m) => (
                        <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                            {m.role === 'assistant' && (
                                <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                    <Bot className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                </div>
                            )}
                            <div
                                className={`px-4 py-2 rounded-lg max-w-xl ${m.role === 'user'
                                    ? 'bg-blue-500 text-white self-end'
                                    : 'bg-white dark:bg-gray-800 border dark:border-gray-700'
                                    }`}
                            >
                                {m.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                ) : (
                                    <div className="prose prose-slate prose-base dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                // Custom styling for markdown elements
                                                h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                h2: ({children}) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                                                h3: ({children}) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                                                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                                li: ({children}) => <li className="text-sm">{children}</li>,
                                                code: ({children}) => <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{children}</code>,
                                                pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                                                blockquote: ({children}) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 dark:text-gray-400 mb-2">{children}</blockquote>,
                                                table: ({children}) => <table className="border-collapse border border-gray-300 text-xs mb-2">{children}</table>,
                                                th: ({children}) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 dark:bg-gray-700 font-medium">{children}</th>,
                                                td: ({children}) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
                                                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                                em: ({children}) => <em className="italic">{children}</em>,
                                            }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                            {m.role === 'user' && (
                                <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                    <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleFormSubmit} className="flex gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your project..."
                        className="flex-grow p-2 border rounded-md"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400">
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}