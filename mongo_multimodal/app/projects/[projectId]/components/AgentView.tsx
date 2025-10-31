
'use client'
import { useState, useEffect, useCallback } from 'react';
import { Bot, User, Send, ChevronDown, ChevronRight, BrainCircuit, History, MessageSquare, Image as ImageIcon, Loader2, Search, Globe, Eye, ChevronUp } from 'lucide-react';
import { useSearchResult } from './SearchResultContext';
import { Message } from '@/types/clientTypes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

interface ToolCallMetadata {
    toolName: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown> | string;
    timestamp: Date;
}

interface AgentViewProps {
    projectId: string;
}

export default function AgentView({ projectId }: AgentViewProps) {
    const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`);
    const [savedConversations, setSavedConversations] = useState<Array<{
        _id: string;
        sessionId: string;
        messageCount: number;
        lastMessage: Date;
        firstMessage?: string;
    }>>([]);
    const [conversationsLoading, setConversationsLoading] = useState(false);
    const [showConversations, setShowConversations] = useState(false);
    const [analysisDepth, setAnalysisDepth] = useState<'general' | 'deep'>('general');
    const { selectedResult } = useSearchResult();

    // Manual state management instead of useChat
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toolCallsMetadata, setToolCallsMetadata] = useState<Map<string, ToolCallMetadata[]>>(new Map());
    const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: input,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    projectId,
                    sessionId: currentSessionId,
                    analysisDepth
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            const assistantMessage: Message = {
                id: `msg_${Date.now()}_assistant`,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (reader) {
                let buffer = '';
                const messageToolCalls: ToolCallMetadata[] = [];
                let currentToolName = '';
                let currentToolCallId = '';
                let currentToolInput: Record<string, unknown> | undefined = undefined;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.trim() || line.trim() === '0:""') continue;

                        console.log('[Agent Stream] Received line:', line.substring(0, 100));

                        try {
                            // Parse data stream format: "type:payload"
                            const colonIndex = line.indexOf(':');
                            if (colonIndex === -1) continue;

                            const type = line.substring(0, colonIndex);
                            const payload = line.substring(colonIndex + 1);
                            console.log('[Agent Stream] Type:', type, 'Payload preview:', payload.substring(0, 50));

                            switch (type) {
                                case '0': // Text chunk
                                    try {
                                        const text = JSON.parse(payload);
                                        if (text) {
                                            assistantMessage.content += text;
                                            setMessages(prev => prev.map(m =>
                                                m.id === assistantMessage.id
                                                    ? { ...m, content: assistantMessage.content }
                                                    : m
                                            ));
                                        }
                                    } catch (e) {
                                        // If not JSON, treat as plain text
                                        if (payload) {
                                            assistantMessage.content += payload;
                                            setMessages(prev => prev.map(m =>
                                                m.id === assistantMessage.id
                                                    ? { ...m, content: assistantMessage.content }
                                                    : m
                                            ));
                                        }
                                    }
                                    break;

                                case '9': // Tool call
                                    try {
                                        const toolCall = JSON.parse(payload);
                                        currentToolName = toolCall.toolName;
                                        currentToolCallId = toolCall.toolCallId;
                                        currentToolInput = toolCall.args;
                                        // Tool calls are displayed in the expandable section below
                                        // No need to add indicators to message content
                                    } catch (e) {
                                        console.error('Failed to parse tool call:', e);
                                    }
                                    break;

                                case 'a': // Tool result
                                    try {
                                        const result = JSON.parse(payload);

                                        // Store tool call metadata
                                        if (currentToolName) {
                                            messageToolCalls.push({
                                                toolName: currentToolName,
                                                input: currentToolInput,
                                                output: result.result,
                                                timestamp: new Date()
                                            });
                                        }

                                        // Reset current tool
                                        currentToolName = '';
                                        currentToolInput = undefined;
                                    } catch (e) {
                                        console.error('Failed to parse tool result:', e);
                                    }
                                    break;

                                case 'e': // Error
                                    console.error('Stream error:', payload);
                                    break;
                            }
                        } catch (e) {
                            console.error('Parse error:', e, 'Line:', line);
                        }
                    }
                }

                // Store tool calls metadata
                if (messageToolCalls.length > 0) {
                    setToolCallsMetadata(prev => {
                        const newMap = new Map(prev);
                        newMap.set(assistantMessage.id, messageToolCalls);
                        return newMap;
                    });
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadConversations = useCallback(async () => {
        try {
            setConversationsLoading(true);
            const response = await fetch(`/api/projects/${projectId}/conversations`);
            if (!response.ok) throw new Error("Failed to fetch conversations");
            const data = await response.json();
            setSavedConversations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setConversationsLoading(false);
        }
    }, [projectId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

        // Initialize with context if available
    useEffect(() => {
        if (selectedResult) {
            // Include the data ID if available for direct access
            const dataId = '_id' in selectedResult ? (selectedResult as { _id: string })._id :
                         'id' in selectedResult ? (selectedResult as { id: string }).id : null;

            let contextMessage = `I want to research about "${selectedResult.metadata?.filename}".`;

            // Add the data ID for direct access
            if (dataId) {
                contextMessage += ` The data ID is: ${dataId}.`;
            }

            // Add description if available
            if (selectedResult.analysis?.description) {
                contextMessage += ` This file contains: ${selectedResult.analysis.description}`;
            } else {
                contextMessage += ' Please help me understand this content.';
            }

            setInput(contextMessage);
            setShowConversations(false);
        }
    }, [selectedResult]);

    const loadConversation = async (sessionId: string) => {
        try {
            const response = await fetch(`/api/projects/${projectId}/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            });
            if (!response.ok) throw new Error("Failed to load conversation");
            const data = await response.json();
            const loadedMessages = (data as Array<{ _id: string; message: { role: 'user'|'assistant'; content: string }; timestamp: string }>).map((item) => ({
                id: item._id,
                role: item.message.role,
                content: item.message.content,
                createdAt: new Date(item.timestamp)
            }));
            setMessages(loadedMessages);
            setCurrentSessionId(sessionId);
            setShowConversations(false);
        } catch (err) {
            console.error(err);
        }
    };

    const startNewConversation = () => {
        const newSessionId = `session_${Date.now()}`;
        setCurrentSessionId(newSessionId);
        setMessages([]);
        setShowConversations(false);
    };

    const renderMessage = (m: Message) => {
        const messageToolCalls = toolCallsMetadata.get(m.id);

        return (
            <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                    <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                        <Bot className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                )}
                <div className={`flex flex-col gap-2 max-w-xl ${m.role === 'user' ? 'items-end' : ''}`}>
                    <div
                        className={`px-4 py-2 rounded-lg ${
                            m.role === 'user'
                                ? 'bg-blue-500 text-white'
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
                                        p: ({children}) => {
                                            // Highlight citations in paragraphs
                                            if (typeof children === 'string') {
                                                const citationRegex = /\[(?:Source|Image|Analysis): ([^\]]+)\]/g;
                                                const parts = [];
                                                let lastIndex = 0;
                                                let match;

                                                while ((match = citationRegex.exec(children)) !== null) {
                                                    // Add text before citation
                                                    if (match.index > lastIndex) {
                                                        parts.push(children.substring(lastIndex, match.index));
                                                    }
                                                    // Add citation as badge
                                                    const citationType = match[0].startsWith('[Source') ? 'source' : match[0].startsWith('[Image') ? 'image' : 'analysis';
                                                    const badgeColor = citationType === 'source' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                                       citationType === 'image' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                       'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
                                                    parts.push(
                                                        <span key={match.index} className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ml-1 ${badgeColor}`}>
                                                            {match[0]}
                                                        </span>
                                                    );
                                                    lastIndex = match.index + match[0].length;
                                                }

                                                // Add remaining text
                                                if (lastIndex < children.length) {
                                                    parts.push(children.substring(lastIndex));
                                                }

                                                if (parts.length > 1) {
                                                    return <p className="mb-2 last:mb-0">{parts}</p>;
                                                }
                                            }
                                            return <p className="mb-2 last:mb-0">{children}</p>;
                                        },
                                        ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                        li: ({children}) => <li className="text-sm">{children}</li>,
                                        code: ({children}) => {
                                            // Also highlight citations in inline code
                                            const text = String(children);
                                            if (text.match(/^\[(?:Source|Image|Analysis):/)) {
                                                const citationType = text.startsWith('[Source') ? 'source' : text.startsWith('[Image') ? 'image' : 'analysis';
                                                const badgeColor = citationType === 'source' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                                   citationType === 'image' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                   'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
                                                return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor}`}>{children}</span>;
                                            }
                                            return <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs">{children}</code>;
                                        },
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

                    {/* Tool call metadata */}
                    {m.role === 'assistant' && messageToolCalls && messageToolCalls.length > 0 && (
                        <div className="mt-1">
                            <button
                                onClick={() => {
                                    setExpandedToolCalls(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(m.id)) {
                                            newSet.delete(m.id);
                                        } else {
                                            newSet.add(m.id);
                                        }
                                        return newSet;
                                    });
                                }}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded"
                            >
                                {expandedToolCalls.has(m.id) ? (
                                    <ChevronUp className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                                View tool calls ({messageToolCalls.length})
                            </button>

                            {expandedToolCalls.has(m.id) && (
                                <div className="mt-2 space-y-2">
                                    {messageToolCalls.map((toolCall, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded p-3 text-xs border dark:border-gray-700">
                                            <div className="flex items-center gap-2 font-semibold mb-2">
                                                {toolCall.toolName === 'searchProjectData' ? (
                                                    <Search className="h-3 w-3" />
                                                ) : toolCall.toolName === 'analyzeImage' ? (
                                                    <Eye className="h-3 w-3" />
                                                ) : toolCall.toolName === 'projectDataAnalysis' ? (
                                                    <BrainCircuit className="h-3 w-3" />
                                                ) : (
                                                    <Globe className="h-3 w-3" />
                                                )}
                                                {toolCall.toolName}
                                            </div>
                                            <div className="space-y-2">
                                                {toolCall.input && (
                                                    <div>
                                                        <span className="font-medium text-gray-600">Input:</span>
                                                        <pre className="mt-1 bg-white dark:bg-gray-900 p-2 rounded overflow-auto max-h-32 text-xs">
                                                            {JSON.stringify(toolCall.input, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {toolCall.output && (
                                                    <div>
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">Output Summary:</span>
                                                        <div className="mt-1 bg-white dark:bg-gray-900 p-2 rounded overflow-auto max-h-32 text-xs">
                                                            {(() => {
                                                                try {
                                                                    const output = typeof toolCall.output === 'string'
                                                                        ? JSON.parse(toolCall.output)
                                                                        : toolCall.output;

                                                                    // Format search results with IDs
                                                                    if (output.results && Array.isArray(output.results)) {
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                                                                    Found {output.total || output.results.length} results:
                                                                                </div>
                                                                                {output.results.slice(0, 3).map((r: { id?: string, filename?: string, metadata?: { filename?: string }, score: number }, i: number) => (
                                                                                    <div key={i} className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                                                                                        <div className="font-medium">{i + 1}. {r.filename || r.metadata?.filename || 'Unknown'}</div>
                                                                                        <div className="text-gray-600 dark:text-gray-400">Score: {r.score?.toFixed(2)}</div>
                                                                                        {r.id && <div className="text-gray-500 dark:text-gray-500 text-[10px]">ID: {r.id.substring(0, 12)}...</div>}
                                                                                    </div>
                                                                                ))}
                                                                                {output.results.length > 3 && <div className="text-gray-500 dark:text-gray-400">...and {output.results.length - 3} more</div>}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    // Format image analysis with dataId and filename
                                                                    if (output.dataId && output.analysis) {
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <div className="font-semibold text-green-600 dark:text-green-400">
                                                                                    Analyzed: {output.filename || 'Unknown'}
                                                                                </div>
                                                                                <div className="text-gray-500 dark:text-gray-500 text-[10px]">ID: {output.dataId.substring(0, 12)}...</div>
                                                                                <div className="text-gray-600 dark:text-gray-400">Size: {output.compressedSizeKB}KB | Tokens: ~{output.estimatedTokens}</div>
                                                                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px] max-h-20 overflow-auto">
                                                                                    {String(output.analysis).substring(0, 200)}...
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    // Format stored analysis
                                                                    if (output.id && output.analysis) {
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <div className="font-semibold text-purple-600 dark:text-purple-400">
                                                                                    Fetched: {output.filename || 'Unknown'}
                                                                                </div>
                                                                                <div className="text-gray-500 dark:text-gray-500 text-[10px]">ID: {output.id.substring(0, 12)}...</div>
                                                                                {output.analysis.description && (
                                                                                    <div className="text-gray-600 dark:text-gray-400">{output.analysis.description.substring(0, 100)}...</div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    }

                                                                    // Fallback to JSON
                                                                    return <pre>{JSON.stringify(output, null, 2)}</pre>;
                                                                } catch {
                                                                    return <pre>{String(toolCall.output)}</pre>;
                                                                }
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {m.role === 'user' && (
                    <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-blue-500" />
                    <span className="font-semibold">Agent Mode</span>
                    {selectedResult && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            Context: {selectedResult.metadata?.filename}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowConversations(!showConversations)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                        <History className="h-4 w-4" />
                        History ({savedConversations.length})
                        {showConversations ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={startNewConversation}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        <MessageSquare className="h-4 w-4" />
                        New Chat
                    </button>
                </div>
            </div>

            {showConversations && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-2">Past Conversations</h3>
                    {conversationsLoading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                        </div>
                    ) : savedConversations.length === 0 ? (
                        <p className="text-gray-500 text-sm">No conversations yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {savedConversations.map(session => (
                                <li key={session._id}>
                                    <button
                                        onClick={() => loadConversation(session._id)}
                                        className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <p className="font-medium truncate">{session.firstMessage || 'Untitled conversation'}</p>
                                        <p className="text-sm text-gray-500">
                                            {session.messageCount} messages •
                                            {new Date(session.lastMessage).toLocaleDateString()}
                                        </p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map(renderMessage)}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                        <div className="flex items-start gap-3">
                            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                <Bot className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Thinking and researching...</span>
                            </div>
                        </div>
                    )}
                </div>
                {messages.length === 0 && !showConversations && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <BrainCircuit className="h-12 w-12 text-gray-400 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Agent Mode</h2>
                        <p className="text-gray-500 mt-2">
                            Ask complex questions that require research. The agent can search project data and the web.
                        </p>
                        <div className="mt-4 space-y-2 text-sm text-gray-400">
                            <p>Try asking:</p>
                            <ul className="space-y-1">
                                <li>&ldquo;Compare this image with similar patterns in the project&rdquo;</li>
                                <li>&ldquo;Research best practices for this type of data&rdquo;</li>
                                <li>&ldquo;Find related information and summarize the findings&rdquo;</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Analysis Depth:</label>
                        <button
                            type="button"
                            onClick={() => setAnalysisDepth('general')}
                            className={`px-3 py-1 text-sm rounded-md ${
                                analysisDepth === 'general'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                                                        General (up to 3 analyses)
                        </button>
                        <button
                            type="button"
                            onClick={() => setAnalysisDepth('deep')}
                            className={`px-3 py-1 text-sm rounded-md ${
                                analysisDepth === 'deep'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                            Deep (up to 5 analyses)
                        </button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask the agent to research a topic..."
                        className="flex-grow p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-400 flex items-center gap-2"
                    >
                        <Send className="h-4 w-4" />
                        {isLoading ? 'Researching...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}