
'use client'
import { useState, useEffect, useCallback } from 'react';
import { Bot, User, Send, ChevronDown, ChevronRight, BrainCircuit, History, MessageSquare, Image as ImageIcon, Loader2, Search, Globe, Eye, ChevronUp, Copy, Check, Brain, Database, Mail, ClipboardList, Link, StopCircle } from 'lucide-react';
import { useSelection } from './SelectionContext';
import { Message, AgentPlan, ConversationReference } from '@/types/clientTypes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { PlanCard } from './Agent/PlanCard';
import { SelectedContextBanner } from './Agent/SelectedContextBanner';
import { StepProgressTracker } from './Agent/StepProgressTracker';
import { ReferencesPanel } from './Agent/ReferencesPanel';
import { ImagePreviewModal } from './ImagePreviewModal';

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
    const [currentSessionId, setCurrentSessionId] = useState<string>('');
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

    // Tool toggles
    const [enableWebSearch, setEnableWebSearch] = useState(false);
    const [enableEmail, setEnableEmail] = useState(false);
    const [enableMemory, setEnableMemory] = useState(true); // Memory enabled by default

    const { selectedItems, agentContext } = useSelection();

    // Manual state management instead of useChat
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [toolCallsMetadata, setToolCallsMetadata] = useState<Map<string, ToolCallMetadata[]>>(new Map());
    const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Calculate available tools based on toggles
    const availableTools = [
        'planQuery',
        'searchProjectData',
        'searchSimilarItems',
        'analyzeImage',
        'projectDataAnalysis',
        ...(enableMemory ? ['rememberContext', 'recallMemory'] : []),
        ...(enableWebSearch ? ['searchWeb'] : []),
        ...(enableEmail ? ['sendEmail'] : [])
    ];

    // Plan and progress tracking
    const [currentPlan, setCurrentPlan] = useState<AgentPlan | null>(null);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [references, setReferences] = useState<ConversationReference[]>([]);
    const [previewDataId, setPreviewDataId] = useState<string | null>(null);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [completedPlans, setCompletedPlans] = useState<Map<string, AgentPlan>>(new Map());
    const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

    // Initialize session ID on client side only to avoid hydration mismatch
    useEffect(() => {
        if (!currentSessionId) {
            setCurrentSessionId(`session_${Date.now()}`);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleCopyResponse = async (messageId: string, content: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Handle citation click to preview image
    const handleCitationClick = async (filename: string) => {
        console.log('[Citation Click] Looking for:', filename);
        console.log('[Citation Click] Available references:', references);

        // Clean up filename - remove extensions and normalize
        const cleanFilename = filename.toLowerCase().replace(/\.(jpg|jpeg|png|pdf|gif)$/i, '');

        // Try to find dataId in references by filename (fuzzy matching)
        const ref = references.find(r => {
            if (!r.title) return false;
            const cleanTitle = r.title.toLowerCase().replace(/\.(jpg|jpeg|png|pdf|gif)$/i, '');
            return cleanTitle.includes(cleanFilename) ||
                   cleanFilename.includes(cleanTitle) ||
                   r.title.toLowerCase().includes(filename.toLowerCase());
        });

        if (ref?.dataId) {
            console.log('[Citation Click] Found in references:', ref.dataId);
            setPreviewDataId(ref.dataId);
            return;
        }

        // If not in references, fetch all project data and search
        console.log('[Citation Click] Not in references, searching project data...');
        try {
            const response = await fetch(`/api/projects/${projectId}/data`);
            if (response.ok) {
                const data = await response.json();
                console.log('[Citation Click] Project data count:', data.length);

                // Find by filename (fuzzy match)
                const item = data.find((d: any) => {
                    const itemFilename = d.metadata?.filename?.toLowerCase() || '';
                    const itemClean = itemFilename.replace(/\.(jpg|jpeg|png|pdf|gif)$/i, '');
                    return itemFilename.includes(filename.toLowerCase()) ||
                           filename.toLowerCase().includes(itemFilename) ||
                           itemClean.includes(cleanFilename) ||
                           cleanFilename.includes(itemClean);
                });

                if (item) {
                    console.log('[Citation Click] Found item:', item._id, item.metadata.filename);
                    setPreviewDataId(item._id);
                } else {
                    console.warn('[Citation Click] No matching file found for:', filename);
                    alert(`Could not find image: ${filename}`);
                }
            }
        } catch (error) {
            console.error('[Citation Click] Error finding image:', error);
            alert('Error loading image preview');
        }
    };

    const handleStop = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsLoading(false);
        }
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

        // Create new AbortController for this request
        const controller = new AbortController();
        setAbortController(controller);

        let assistantMessage: Message | null = null;

        try {
            // Extract data IDs from selected items if available
            const selectedDataIds = selectedItems.length > 0
                ? selectedItems.map(item => item._id)
                : undefined;

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
                    analysisDepth,
                    selectedDataIds, // Pass the selected item IDs
                    // Tool toggles from UI
                    enableWebSearch,
                    enableEmail,
                    enableMemory
                }),
                signal: controller.signal
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            assistantMessage = {
                id: `msg_${Date.now()}_assistant`,
                role: 'assistant',
                content: '',
                createdAt: new Date()
            };

            setMessages(prev => [...prev, assistantMessage!]);

            if (reader) {
                let buffer = '';
                const messageToolCalls: ToolCallMetadata[] = [];
                let currentToolName = '';
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
                                    } catch {
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

                                            // Handle plan tool
                                            if (currentToolName === 'planQuery' && result.result) {
                                                try {
                                                    const planResult = typeof result.result === 'string'
                                                        ? JSON.parse(result.result)
                                                        : result.result;

                                                    if (planResult.plan) {
                                                        setCurrentPlan(planResult.plan);
                                                        setCurrentStep(1); // Start at step 1 after planning
                                                    }
                                                } catch (e) {
                                                    console.error('Failed to parse plan:', e);
                                                }
                                            }

                                            // Increment step counter for each tool call
                                            setCurrentStep(prev => prev + 1);
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

                    // Extract references from tool calls
                    const extractedRefs: ConversationReference[] = [];
                    messageToolCalls.forEach((toolCall, index) => {
                        try {
                            const output = typeof toolCall.output === 'string'
                                ? JSON.parse(toolCall.output)
                                : toolCall.output;

                            // Extract from search results
                            if (toolCall.toolName === 'searchProjectData' && output?.results) {
                                output.results.forEach((result: { id?: string; filename?: string; metadata?: { filename?: string }; score?: number }) => {
                                    if (result.id) {
                                        extractedRefs.push({
                                            type: 'projectData',
                                            dataId: result.id,
                                            title: result.filename || result.metadata?.filename || 'Unknown',
                                            usedInStep: index + 1,
                                            toolCall: toolCall.toolName,
                                            score: result.score
                                        });
                                    }
                                });
                            }

                            // Extract from image analysis
                            if (toolCall.toolName === 'analyzeImage' && output?.dataId) {
                                extractedRefs.push({
                                    type: 'projectData',
                                    dataId: output.dataId,
                                    title: output.filename || 'Unknown',
                                    usedInStep: index + 1,
                                    toolCall: toolCall.toolName,
                                });
                            }

                            // Extract from stored analysis
                            if (toolCall.toolName === 'projectDataAnalysis' && output?.id) {
                                extractedRefs.push({
                                    type: 'projectData',
                                    dataId: output.id,
                                    title: output.filename || 'Unknown',
                                    usedInStep: index + 1,
                                    toolCall: toolCall.toolName,
                                });
                            }

                            // Extract from web search
                            if (toolCall.toolName === 'searchWeb' && output?.url) {
                                extractedRefs.push({
                                    type: 'web',
                                    url: output.url,
                                    title: output.title || 'Web Search Result',
                                    usedInStep: index + 1,
                                    toolCall: toolCall.toolName,
                                });
                            }
                        } catch (e) {
                            console.error('Failed to extract references from tool call:', e);
                        }
                    });

                    // Update references state
                    if (extractedRefs.length > 0) {
                        setReferences(prev => [...prev, ...extractedRefs]);
                    }
                }
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Agent execution stopped by user');
                // Add a system message indicating the stop
                setMessages(prev => [...prev, {
                    id: `msg_${Date.now()}_stopped`,
                    role: 'assistant',
                    content: '_Agent execution stopped by user._',
                    createdAt: new Date()
                }]);
            } else {
                console.error('Error:', error);
            }
        } finally {
            setIsLoading(false);
            setAbortController(null);
            // Save completed plan for this message before resetting
            if (currentPlan && assistantMessage) {
                setCompletedPlans(prev => {
                    const newMap = new Map(prev);
                    newMap.set(assistantMessage.id, currentPlan);
                    return newMap;
                });
            }
            // Reset plan and step tracking after completion
            setCurrentPlan(null);
            setCurrentStep(0);
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

        // Initialize with context if available from selection
    useEffect(() => {
        if (agentContext && selectedItems.length > 0) {
            setInput(agentContext);
            setShowConversations(false);
        }
    }, [agentContext, selectedItems]);

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
        setReferences([]);
        setCurrentPlan(null);
        setCurrentStep(0);
    };

    const renderMessage = (m: Message) => {
        const messageToolCalls = toolCallsMetadata.get(m.id);
        const messagePlan = completedPlans.get(m.id);
        const showPlan = expandedPlans.has(m.id);

        return (
            <div key={m.id} className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                    <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                        <Bot className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                )}
                <div className={`flex flex-col gap-2 max-w-xl ${m.role === 'user' ? 'items-end' : ''}`}>
                    <div
                        className={`relative group px-4 py-2 rounded-lg ${
                            m.role === 'user'
                                ? 'bg-[#13AA52] text-white'
                                : 'bg-white dark:bg-gray-900 border dark:border-gray-800'
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
                                            // Convert children to string if needed
                                            const textContent = typeof children === 'string'
                                                ? children
                                                : (Array.isArray(children)
                                                    ? children.map(c => typeof c === 'string' ? c : '').join('')
                                                    : String(children || ''));

                                            const citationRegex = /\[(?:Source|Image|Analysis): ([^\]]+)\]/g;
                                            const matches = Array.from(textContent.matchAll(citationRegex));

                                            if (matches.length > 0) {
                                                const parts: (string | JSX.Element)[] = [];
                                                let lastIndex = 0;

                                                matches.forEach((match, idx) => {
                                                    // Add text before citation
                                                    if (match.index !== undefined && match.index > lastIndex) {
                                                        parts.push(textContent.substring(lastIndex, match.index));
                                                    }

                                                    // Add citation as clickable badge
                                                    const citationType = match[0].startsWith('[Source') ? 'source' : match[0].startsWith('[Image') ? 'image' : 'analysis';
                                                    const badgeColor = citationType === 'source' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                                       citationType === 'image' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                       'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
                                                    const filename = match[1]; // Extract filename from capture group

                                                    parts.push(
                                                        <button
                                                            key={`citation-${idx}`}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleCitationClick(filename);
                                                            }}
                                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ml-1 ${badgeColor} cursor-pointer hover:opacity-80 transition-opacity`}
                                                            title={`Click to preview ${filename}`}
                                                        >
                                                            {match[0]}
                                                        </button>
                                                    );

                                                    if (match.index !== undefined) {
                                                        lastIndex = match.index + match[0].length;
                                                    }
                                                });

                                                // Add remaining text
                                                if (lastIndex < textContent.length) {
                                                    parts.push(textContent.substring(lastIndex));
                                                }

                                                return <p className="mb-2 last:mb-0">{parts}</p>;
                                            }

                                            return <p className="mb-2 last:mb-0">{children}</p>;
                                        },
                                        ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                        ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                        li: ({children}) => <li className="text-sm">{children}</li>,
                                        code: ({children}) => {
                                            // Also highlight citations in inline code
                                            const text = String(children);
                                            const citationMatch = text.match(/^\[(?:Source|Image|Analysis): ([^\]]+)\]$/);
                                            if (citationMatch) {
                                                const citationType = text.startsWith('[Source') ? 'source' : text.startsWith('[Image') ? 'image' : 'analysis';
                                                const badgeColor = citationType === 'source' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                                   citationType === 'image' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                   'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
                                                const filename = citationMatch[1];
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleCitationClick(filename);
                                                        }}
                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor} cursor-pointer hover:opacity-80 transition-opacity`}
                                                        title={`Click to preview ${filename}`}
                                                    >
                                                        {children}
                                                    </button>
                                                );
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
                        {/* Copy button for assistant messages */}
                        {m.role === 'assistant' && (
                            <button
                                onClick={() => handleCopyResponse(m.id, m.content)}
                                className="absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                title="Copy response"
                            >
                                {copiedMessageId === m.id ? (
                                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                                )}
                            </button>
                        )}
                    </div>

                    {/* Plan viewing button */}
                    {m.role === 'assistant' && messagePlan && (
                        <div className="mt-1">
                            <button
                                onClick={() => {
                                    setExpandedPlans(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(m.id)) {
                                            newSet.delete(m.id);
                                        } else {
                                            newSet.add(m.id);
                                        }
                                        return newSet;
                                    });
                                }}
                                className="flex items-center gap-2 text-xs text-[#13AA52] dark:text-[#00ED64] hover:text-[#00684A] dark:hover:text-[#13AA52] px-3 py-1 bg-green-50 dark:bg-gray-900 rounded"
                            >
                                {showPlan ? (
                                    <ChevronUp className="h-3 w-3" />
                                ) : (
                                    <ChevronDown className="h-3 w-3" />
                                )}
                                View planning
                            </button>

                            {showPlan && (
                                <div className="mt-2 p-3 bg-green-50 dark:bg-gray-900 rounded border border-green-200 dark:border-gray-800">
                                    <h4 className="text-xs font-semibold text-[#00684A] dark:text-[#00ED64] mb-2">Agent Planning</h4>
                                    <div className="text-xs space-y-2">
                                        <div>
                                            <span className="font-medium text-[#13AA52] dark:text-[#00ED64]">Steps:</span>
                                            <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-700 dark:text-gray-300">
                                                {messagePlan.steps.map((step, idx) => (
                                                    <li key={idx}>{step}</li>
                                                ))}
                                            </ol>
                                        </div>
                                        {messagePlan.toolsToUse && messagePlan.toolsToUse.length > 0 && (
                                            <div>
                                                <span className="font-medium text-[#13AA52] dark:text-[#00ED64]">Tools planned:</span>
                                                <span className="ml-2 text-gray-700 dark:text-gray-300">{messagePlan.toolsToUse.join(', ')}</span>
                                            </div>
                                        )}
                                        {messagePlan.estimatedToolCalls && (
                                            <div>
                                                <span className="font-medium text-[#13AA52] dark:text-[#00ED64]">Estimated tool calls:</span>
                                                <span className="ml-2 text-gray-700 dark:text-gray-300">{messagePlan.estimatedToolCalls}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1 bg-gray-50 dark:bg-gray-900 rounded"
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
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-900 rounded p-3 text-xs border dark:border-gray-800">
                                            <div className="flex items-center gap-2 font-semibold mb-2">
                                                {toolCall.toolName === 'planQuery' ? (
                                                    <ClipboardList className="h-3 w-3" />
                                                ) : toolCall.toolName === 'searchProjectData' ? (
                                                    <Search className="h-3 w-3" />
                                                ) : toolCall.toolName === 'searchSimilarItems' ? (
                                                    <Link className="h-3 w-3" />
                                                ) : toolCall.toolName === 'analyzeImage' ? (
                                                    <Eye className="h-3 w-3" />
                                                ) : toolCall.toolName === 'projectDataAnalysis' ? (
                                                    <BrainCircuit className="h-3 w-3" />
                                                ) : toolCall.toolName === 'rememberContext' ? (
                                                    <Brain className="h-3 w-3 text-[#13AA52]" />
                                                ) : toolCall.toolName === 'recallMemory' ? (
                                                    <Database className="h-3 w-3 text-[#13AA52]" />
                                                ) : toolCall.toolName === 'searchWeb' ? (
                                                    <Globe className="h-3 w-3 text-[#00684A]" />
                                                ) : toolCall.toolName === 'sendEmail' ? (
                                                    <Mail className="h-3 w-3 text-[#116149]" />
                                                ) : (
                                                    <MessageSquare className="h-3 w-3" />
                                                )}
                                                {toolCall.toolName}
                                            </div>
                                            <div className="space-y-2">
                                                {toolCall.input && (
                                                    <div>
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">Input:</span>
                                                        <pre className="mt-1 bg-white dark:bg-black p-2 rounded overflow-auto max-h-32 text-xs">
                                                            {JSON.stringify(toolCall.input, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {toolCall.output && (
                                                    <div>
                                                        <span className="font-medium text-gray-600 dark:text-gray-300">Output Summary:</span>
                                                        <div className="mt-1 bg-white dark:bg-black p-2 rounded overflow-auto max-h-32 text-xs">
                                                            {(() => {
                                                                try {
                                                                    const output = typeof toolCall.output === 'string'
                                                                        ? JSON.parse(toolCall.output)
                                                                        : toolCall.output;

                                                                    // Format search results with IDs
                                                                    if (output.results && Array.isArray(output.results)) {
                                                                        return (
                                                                            <div className="space-y-1">
                                                                                <div className="font-semibold text-[#13AA52] dark:text-[#00ED64]">
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
                                                                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-[10px] max-h-20 overflow-auto">
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
        <div className="flex flex-col h-full dark:bg-black">
            <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-6 w-6 text-[#00ED64]" />
                    <span className="font-semibold">Agent Mode</span>
                    {selectedItems.length > 0 && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowConversations(!showConversations)}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-900 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                        <History className="h-4 w-4" />
                        History ({savedConversations.length})
                        {showConversations ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={startNewConversation}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-[#00ED64] dark:bg-[#13AA52] text-gray-900 dark:text-white rounded-md hover:bg-[#13AA52] dark:hover:bg-[#00684A]"
                    >
                        <MessageSquare className="h-4 w-4" />
                        New Chat
                    </button>
                </div>
            </div>

            {showConversations && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
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
                                        className="w-full text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900"
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

            {/* Selected Context Banner */}
            <SelectedContextBanner />

            {/* Agent Plan Card */}
            {currentPlan && (
                <div className="px-4 pt-4">
                    <PlanCard
                        plan={currentPlan}
                        currentStep={currentStep}
                        totalSteps={currentPlan.estimatedToolCalls + 1}
                        availableTools={availableTools}
                    />
                </div>
            )}

            {/* Step Progress Tracker */}
            {isLoading && currentPlan && (
                <div className="px-4 pt-3">
                    <StepProgressTracker
                        currentStep={currentStep}
                        totalSteps={currentPlan.estimatedToolCalls + 1}
                        stepLabels={currentPlan.steps.slice(0, Math.min(currentPlan.steps.length, 5))}
                    />
                </div>
            )}

            <div className="flex-grow p-4 overflow-y-auto min-h-0">
                <div className="space-y-4">
                    {messages.map(renderMessage)}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                        <div className="flex items-start gap-3">
                            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full">
                                <Bot className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Thinking and researching...</span>
                                </div>
                                <button
                                    onClick={handleStop}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                                    title="Stop agent execution"
                                >
                                    (click Stop to cancel)
                                </button>
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

            {/* References Panel */}
            {references.length > 0 && (
                <ReferencesPanel
                    references={references}
                    onPreview={(dataId) => setPreviewDataId(dataId)}
                />
            )}

            {/* Preview Modal */}
            {previewDataId && (
                <ImagePreviewModal
                    dataId={previewDataId}
                    projectId={projectId}
                    onClose={() => setPreviewDataId(null)}
                />
            )}

            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                {/* Tool Toggles - Compact horizontal layout */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mr-1">Tools:</span>

                    {/* Deep Analysis Toggle */}
                    <button
                        type="button"
                        onClick={() => setAnalysisDepth(analysisDepth === 'deep' ? 'general' : 'deep')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            analysisDepth === 'deep'
                                ? 'bg-[#00ED64] text-gray-900 shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={analysisDepth === 'deep' ? 'Deep Analysis: 5 analyses' : 'General Analysis: 3 analyses'}
                    >
                        <Brain className="h-3.5 w-3.5" />
                        <span>Deep ({analysisDepth === 'deep' ? '5' : '3'})</span>
                    </button>

                    {/* Memory Toggle */}
                    <button
                        type="button"
                        onClick={() => setEnableMemory(!enableMemory)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            enableMemory
                                ? 'bg-[#13AA52] text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={enableMemory ? 'Memory: ON - Agent remembers context' : 'Memory: OFF'}
                    >
                        <Database className="h-3.5 w-3.5" />
                        <span>Memory</span>
                    </button>

                    {/* Web Search Toggle */}
                    <button
                        type="button"
                        onClick={() => setEnableWebSearch(!enableWebSearch)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            enableWebSearch
                                ? 'bg-[#00684A] text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={enableWebSearch ? 'Web Search: ON - Can search external sources' : 'Web Search: OFF'}
                    >
                        <Globe className="h-3.5 w-3.5" />
                        <span>Web</span>
                    </button>

                    {/* Email Toggle */}
                    <button
                        type="button"
                        onClick={() => setEnableEmail(!enableEmail)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            enableEmail
                                ? 'bg-[#116149] text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={enableEmail ? 'Email: ON - Can send emails' : 'Email: OFF'}
                    >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Email</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Ask the agent to research a topic..."
                        className="flex-grow p-2 border rounded-md dark:bg-black dark:border-gray-800"
                        disabled={isLoading}
                    />
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={handleStop}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center gap-2 transition-colors"
                            title="Stop agent execution"
                        >
                            <StopCircle className="h-4 w-4" />
                            Stop
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim()}
                            className="px-4 py-2 bg-[#00ED64] hover:bg-[#13AA52] text-gray-900 rounded-md disabled:bg-gray-400 disabled:text-gray-200 flex items-center gap-2"
                        >
                            <Send className="h-4 w-4" />
                            Send
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}