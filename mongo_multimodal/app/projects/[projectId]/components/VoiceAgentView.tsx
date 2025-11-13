'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ProjectData } from '@/types/models';
import { GenerativeImageGallery } from './Voice/GenerativeImageGallery';
import { VoiceControls } from './Voice/VoiceControls';
import { AnimatedOrb } from './Voice/AnimatedOrb';
import { ImagePreviewModal } from './ImagePreviewModal';
import {
  createBlob,
  decode,
  decodeAudioData,
} from '@/lib/audio-utils';

// Gemini Live types (per official docs)
interface LiveServerMessage {
  serverContent?: {
    modelTurn?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data: string;
          mimeType: string;
        };
      }>;
    };
    // Audio transcriptions (per official docs)
    inputTranscription?: {
      text: string;
    };
    outputTranscription?: {
      text: string;
    };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{
      name: string;
      args: Record<string, any>;
      id: string;
    }>;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  projectId: string;
}

export default function VoiceAgentView({ projectId }: Props) {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Mute/unmute toggle
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [displayedImages, setDisplayedImages] = useState<ProjectData[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<ProjectData | null>(null);

  // Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isRecordingRef = useRef(false); // Use ref for audio processing callback
  const isMutedRef = useRef(false); // Use ref for audio processing callback

  // Refs for secure session
  const sessionTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const tokenExpiryRef = useRef<number | null>(null);

  // Initialize secure voice session
  useEffect(() => {
    const initSession = async () => {
      try {
        setStatus('Connecting securely...');

        // Initialize audio contexts
        try {
          inputContextRef.current = new AudioContext({ sampleRate: 16000 });
          outputContextRef.current = new AudioContext({ sampleRate: 24000 });
          nextStartTimeRef.current = outputContextRef.current.currentTime;

          console.log('Audio contexts initialized', {
            inputState: inputContextRef.current.state,
            outputState: outputContextRef.current.state,
          });
        } catch (audioErr) {
          console.error('Failed to initialize audio contexts:', audioErr);
          throw new Error('Audio initialization failed. Please check browser permissions.');
        }

        // Request session token from secure endpoint
        const sessionResponse = await fetch('/api/voice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });

        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          throw new Error(errorData.error || 'Failed to create voice session');
        }

        const { token, sessionId, expiresIn } = await sessionResponse.json();

        sessionTokenRef.current = token;
        sessionIdRef.current = sessionId;
        tokenExpiryRef.current = Date.now() + expiresIn * 1000;

        console.log('Secure voice session created:', sessionId);
        setStatus('Connected - Click to start');
        setError(null);
      } catch (err) {
        console.error('Failed to initialize secure session:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setStatus('Failed to connect');
      }
    };

    initSession();

    // Cleanup
    return () => {
      // Close stream if active
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel();
        streamReaderRef.current = null;
      }

      if (inputContextRef.current) {
        inputContextRef.current.close();
      }
      if (outputContextRef.current) {
        outputContextRef.current.close();
      }
    };
  }, [projectId]);

  // Execute vector search tool via proxy
  const handleSearchTool = useCallback(async (
    args: { query: string; maxResults?: number },
    toolCallId: string
  ) => {
    try {
      console.log('🔍 Searching project data:', args.query);
      setStatus('Searching images...');

      // Call search API with includeBase64 flag
      const response = await fetch(`/api/projects/${projectId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: args.query,
          mode: 'search',
          limit: args.maxResults || 3,
          page: 1,
          includeBase64: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const { results } = await response.json();
      console.log('Search results:', results.length, 'items');

      // Update generative UI
      setDisplayedImages(results);
      setActiveImageIndex(0);

      // Send tool response back via proxy
      // IMPORTANT: Only send text-based metadata, NOT base64 image data
      // Gemini's function calling API only accepts structured JSON, not binary data
      if (sessionTokenRef.current) {
        await fetch('/api/voice/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            toolResponse: {
              functionResponses: [
                {
                  id: toolCallId,
                  name: 'searchProjectData',
                  response: {
                    results: results.map((r: ProjectData) => ({
                      id: r._id?.toString(),
                      filename: r.metadata?.filename,
                      type: r.type,
                      description: r.analysis?.description || r.metadata?.filename,
                      score: r.score?.toFixed(3),
                      insights: r.analysis?.insights || [],
                      tags: r.analysis?.tags || [],
                    })),
                    count: results.length,
                    message: `Found ${results.length} items matching "${args.query}"`,
                  },
                },
              ],
            },
          }),
        });
      }

      setStatus('Speaking...');
    } catch (err) {
      console.error('Search tool error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');

      // Send error response
      if (sessionTokenRef.current) {
        await fetch('/api/voice/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            toolResponse: {
              functionResponses: [
                {
                  id: toolCallId,
                  name: 'searchProjectData',
                  response: {
                    error: 'Search failed',
                    results: [],
                    count: 0,
                  },
                },
              ],
            },
          }),
        });
      }
    }
  }, [projectId, sessionIdRef, sessionTokenRef]);

  // Execute image analysis tool (server-side analysis)
  const handleAnalyzeImage = useCallback(async (
    args: { dataId: string },
    toolCallId: string
  ) => {
    try {
      console.log('🖼️ Analyzing image server-side:', args.dataId);
      setStatus('Analyzing image...');

      // Call server-side analysis endpoint
      const analysisResponse = await fetch('/api/voice/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionTokenRef.current}`,
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          action: 'analyzeImage',
          dataId: args.dataId,
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
      }

      const analysisData = await analysisResponse.json();

      if (!analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      console.log('✅ Image analysis complete:', analysisData.filename);

      // Send tool response with the analysis text
      if (sessionTokenRef.current) {
        await fetch('/api/voice/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            toolResponse: {
              functionResponses: [
                {
                  id: toolCallId,
                  name: 'analyzeImage',
                  response: {
                    success: true,
                    filename: analysisData.filename,
                    analysis: analysisData.analysis,
                    message: `Visual analysis of "${analysisData.filename}" complete`,
                  },
                },
              ],
            },
          }),
        });
      }

      setStatus('Speaking...');
    } catch (err) {
      console.error('Analyze image tool error:', err);
      setError(err instanceof Error ? err.message : 'Image analysis failed');

      // Send error response
      if (sessionTokenRef.current) {
        await fetch('/api/voice/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            toolResponse: {
              functionResponses: [
                {
                  id: toolCallId,
                  name: 'analyzeImage',
                  response: {
                    success: false,
                    error: err instanceof Error ? err.message : 'Failed to analyze image',
                  },
                },
              ],
            },
          }),
        });
      }
    }
  }, [sessionIdRef, sessionTokenRef]);

  // Handle messages from Gemini
  const handleMessage = useCallback(
    async (message: LiveServerMessage) => {
      console.log('Received message:', message);

      // Handle interruption (per official docs: stop audio and clear queue)
      if (message.serverContent?.interrupted) {
        console.log('Agent was interrupted - stopping audio playback');
        // Stop all playing audio sources
        for (const source of audioSourcesRef.current.values()) {
          source.stop();
          audioSourcesRef.current.delete(source);
        }
        nextStartTimeRef.current = 0;
        setIsSpeaking(false);
        setStatus('Ready');
        return;
      }

      // Handle input audio transcription (user speech text)
      // NOTE: Transcription comes word-by-word, need to append not replace
      if (message.serverContent?.inputTranscription?.text) {
        const newWord = message.serverContent.inputTranscription.text;
        console.log('User transcription word:', newWord);
        // Append to last user message in transcript
        setTranscript((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex >= 0 && prev[lastIndex].role === 'user') {
            const updated = [...prev];
            const currentContent = updated[lastIndex].content;
            // If it's the placeholder "[Speaking...]", replace it with first word
            // Otherwise, append the new word
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: currentContent === '[Speaking...]'
                ? newWord.trim()
                : currentContent + newWord,
            };
            return updated;
          }
          return prev;
        });
      }

      // Handle output audio transcription (model speech text)
      // NOTE: Transcription may come word-by-word, need to append not create new entries
      if (message.serverContent?.outputTranscription?.text) {
        const newText = message.serverContent.outputTranscription.text;
        console.log('Agent transcription:', newText);
        setTranscript((prev) => {
          const lastIndex = prev.length - 1;
          // If last message is from assistant and recent (within 5 seconds), append to it
          if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
            const timeDiff = Date.now() - prev[lastIndex].timestamp.getTime();
            if (timeDiff < 5000) {
              // Within 5 seconds, append to existing message
              const updated = [...prev];
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + ' ' + newText,
              };
              parseImageReferences(updated[lastIndex].content);
              return updated;
            }
          }
          // Otherwise create new entry
          const newEntry = {
            role: 'assistant' as const,
            content: newText,
            timestamp: new Date(),
          };
          parseImageReferences(newText);
          return [...prev, newEntry];
        });
      }

      // Handle audio response (modelTurn parts)
      const parts = message.serverContent?.modelTurn?.parts;
      if (parts) {
        for (const part of parts) {
          // Text transcript (fallback if no outputTranscription)
          if (part.text && !message.serverContent?.outputTranscription) {
            console.log('Transcript from modelTurn:', part.text);
            setTranscript((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: part.text,
                timestamp: new Date(),
              },
            ]);
            parseImageReferences(part.text);
          }

          // Audio data - check if mimeType includes 'audio/pcm' (Gemini returns 'audio/pcm;rate=24000')
          if (part.inlineData?.mimeType?.includes('audio/pcm')) {
            console.log('Playing audio chunk, length:', part.inlineData.data?.length || 0);
            setIsSpeaking(true);
            await playAudioChunk(part.inlineData.data);
          }
        }
      }

      // Handle turn complete
      if (message.serverContent?.turnComplete) {
        console.log('Turn complete');
        setIsSpeaking(false);
        setStatus('Ready');
      }

      // Handle tool calls
      if (message.toolCall?.functionCalls) {
        console.log('🔧 Tool calls detected:', message.toolCall.functionCalls.length);
        for (const funcCall of message.toolCall.functionCalls) {
          console.log('🔧 Executing tool:', funcCall.name, 'with args:', funcCall.args);
          setStatus(`Executing ${funcCall.name}...`);

          if (funcCall.name === 'searchProjectData') {
            await handleSearchTool(funcCall.args as { query: string; maxResults?: number }, funcCall.id);
          } else if (funcCall.name === 'analyzeImage') {
            await handleAnalyzeImage(funcCall.args as { dataId: string }, funcCall.id);
          }
        }
      }
    },
    [handleSearchTool, handleAnalyzeImage]
  );

  // Parse text for image references to highlight correct image
  const parseImageReferences = (text: string) => {
    // Simple heuristics: "first image", "second", "this image", etc.
    const lowerText = text.toLowerCase();
    if (lowerText.includes('first') || lowerText.includes('this')) {
      setActiveImageIndex(0);
    } else if (lowerText.includes('second')) {
      setActiveImageIndex(1);
    } else if (lowerText.includes('third')) {
      setActiveImageIndex(2);
    }
    // Could be enhanced with more sophisticated parsing
  };

  // Play audio chunk with queueing
  const playAudioChunk = async (base64Data: string) => {
    if (!outputContextRef.current) return;

    try {
      const pcmBytes = decode(base64Data);
      const audioBuffer = await decodeAudioData(
        pcmBytes,
        outputContextRef.current,
        24000,
        1
      );

      const source = outputContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputContextRef.current.destination);

      // Calculate start time for smooth queueing
      const startTime = Math.max(
        nextStartTimeRef.current,
        outputContextRef.current.currentTime
      );

      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      // Track source for cleanup
      audioSourcesRef.current.add(source);
      source.addEventListener('ended', () => {
        audioSourcesRef.current.delete(source);
      });
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  // Start recording with secure streaming
  const startRecording = async () => {
    console.log('startRecording called', {
      isRecording,
      hasInputContext: !!inputContextRef.current,
      hasSessionToken: !!sessionTokenRef.current,
    });

    if (isRecording || !inputContextRef.current || !sessionTokenRef.current) {
      console.log('Early return - conditions not met');
      return;
    }

    try {
      setStatus('Requesting microphone access...');

      // Check if token needs refresh (within 2 minutes of expiry)
      if (tokenExpiryRef.current && Date.now() > tokenExpiryRef.current - 120000) {
        console.log('Token expiring soon, refreshing...');
        await refreshToken();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;
      await inputContextRef.current.resume();

      const sourceNode = inputContextRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      // Start SSE stream FIRST and wait for it to connect
      console.log('Establishing SSE stream before audio processing...');
      await startSSEStream();
      console.log('SSE stream established, starting audio transmission');

      // Audio processing: send chunks via POST (only when not muted)
      let chunkCount = 0;
      processor.onaudioprocess = async (e) => {
        // Check recording state and session token
        if (!isRecordingRef.current || !sessionTokenRef.current) {
          return;
        }

        // Skip sending audio when muted (simulates silence for Gemini VAD)
        if (isMutedRef.current) {
          return;
        }

        const pcmData = e.inputBuffer.getChannelData(0);
        const audioBlob = createBlob(pcmData);

        chunkCount++;
        if (chunkCount === 1) {
          console.log('Audio processing started - sending first chunk');
        }
        if (chunkCount % 20 === 0) {
          console.log(`Sent ${chunkCount} audio chunks`);
        }

        try {
          const response = await fetch('/api/voice/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionTokenRef.current}`,
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              audio: audioBlob.data,
              mimeType: audioBlob.mimeType,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Audio POST failed:', response.status, errorText);
          }
        } catch (err) {
          console.error('Failed to send audio:', err);
        }
      };

      sourceNode.connect(processor);
      processor.connect(inputContextRef.current.destination);

      // Set both state and ref
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatus('🎤 Listening...');
      setError(null);

      console.log('Recording started - audio pipeline connected');

      // Add user transcript placeholder
      setTranscript((prev) => [
        ...prev,
        {
          role: 'user',
          content: '[Speaking...]',
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      setStatus('Ready');
      stopRecording();
    }
  };

  // Refresh session token
  const refreshToken = async () => {
    try {
      const sessionResponse = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to refresh token');
      }

      const { token, sessionId, expiresIn } = await sessionResponse.json();

      sessionTokenRef.current = token;
      sessionIdRef.current = sessionId;
      tokenExpiryRef.current = Date.now() + expiresIn * 1000;

      console.log('Token refreshed');
    } catch (err) {
      console.error('Token refresh failed:', err);
      setError('Session expired. Please reload.');
    }
  };

  // Start SSE stream to receive responses
  const startSSEStream = async (): Promise<void> => {
    if (!sessionTokenRef.current) return;

    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('/api/voice/stream', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${sessionTokenRef.current}`,
          },
        });

        console.log('SSE response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('SSE error response:', errorText);
          reject(new Error(`Failed to start SSE stream: ${response.status} ${errorText}`));
          return;
        }

        if (!response.body) {
          reject(new Error('SSE response has no body'));
          return;
        }

        const reader = response.body.getReader();
        streamReaderRef.current = reader;

        const decoder = new TextDecoder();
        let buffer = '';
        let connected = false;

        // Read SSE stream
        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log('SSE stream closed');
                break;
              }

              buffer += decoder.decode(value, { stream: true });

              // Parse SSE events
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);

                  if (data === '[DONE]') {
                    console.log('Stream complete');
                    setIsSpeaking(false);
                    setStatus('Ready');
                    continue;
                  }

                  try {
                    const message: LiveServerMessage = JSON.parse(data);

                    // Resolve promise on first connected message
                    if (!connected && message.connected) {
                      connected = true;
                      console.log('SSE stream connected, resolving promise');
                      resolve();
                    }

                    await handleMessage(message);
                  } catch (err) {
                    console.error('Failed to parse SSE message:', err);
                  }
                }
              }
            }
          } catch (err) {
            console.error('SSE stream error:', err);
            reject(err);
          }
        };

        readStream();
      } catch (err) {
        console.error('Failed to start SSE stream:', err);
        reject(err);
      }
    });
  };

  // Toggle mute/unmute
  const toggleMute = async () => {
    const newMutedState = !isMuted;
    isMutedRef.current = newMutedState;
    setIsMuted(newMutedState);

    if (newMutedState) {
      console.log('🔇 Microphone muted - signaling audio stream end');
      setStatus('🔇 Muted - Agent processing...');

      // Signal to Gemini that audio stream has paused
      // Per official docs: https://ai.google.dev/gemini-api/docs/live-guide
      try {
        if (sessionTokenRef.current) {
          await fetch('/api/voice/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionTokenRef.current}`,
            },
            body: JSON.stringify({
              sessionId: sessionIdRef.current,
              action: 'audioStreamEnd',
            }),
          });
          console.log('Audio stream end signal sent to Gemini');
        }
      } catch (err) {
        console.error('Failed to signal audio stream end:', err);
      }
    } else {
      console.log('🎤 Microphone unmuted - resuming audio transmission');
      setStatus('🎤 Listening...');
    }
  };

  // Stop recording (closes the session completely)
  const stopRecording = async () => {
    if (!isRecording) return;

    console.log('Closing voice session...');

    // Set both state and ref
    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus('Session closed');

    if (scriptProcessorRef.current && sourceNodeRef.current) {
      scriptProcessorRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    scriptProcessorRef.current = null;
    sourceNodeRef.current = null;

    // No explicit endTurn signal needed - Gemini VAD handles turn detection
    console.log('Voice session closed');
  };

  // Reset session
  const resetSession = async () => {
    await stopRecording();
    isRecordingRef.current = false;
    setTranscript([]);
    setDisplayedImages([]);
    setActiveImageIndex(0);
    setError(null);

    // Stop all audio
    for (const source of audioSourcesRef.current.values()) {
      source.stop();
      audioSourcesRef.current.delete(source);
    }
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);

    // Close SSE stream
    if (streamReaderRef.current) {
      await streamReaderRef.current.cancel();
      streamReaderRef.current = null;
    }

    // Clear session tokens
    sessionTokenRef.current = null;
    sessionIdRef.current = null;
    tokenExpiryRef.current = null;

    setStatus('Reconnecting...');
    // Trigger re-initialization by changing a key dependency
    window.location.reload(); // Simple approach for full reset
  };

  return (
    <div className="relative h-full w-full bg-white dark:bg-neutral-950 overflow-hidden">
      {/* 3D Audio Orb Background */}
      <AnimatedOrb isActive={isRecording || isSpeaking} isSpeaking={isSpeaking} />

      {/* Generative UI: Image Gallery */}
      <div className="absolute inset-x-0 top-0 h-2/3 z-10">
        <GenerativeImageGallery
          images={displayedImages}
          activeIndex={activeImageIndex}
          onImageClick={(img) => setPreviewImage(img)}
        />
      </div>

      {/* Transcript */}
      <div className="absolute bottom-32 left-0 right-0 h-48 z-20 bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 p-4 overflow-y-auto">
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-500 dark:text-neutral-500 text-sm">
              Voice transcript will appear here...
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transcript.map((msg, i) => (
              <div key={i} className="mb-2">
                <span
                  className={`font-semibold ${
                    msg.role === 'user' ? 'text-blue-500 dark:text-blue-400' : 'text-primary-600 dark:text-primary-400'
                  }`}
                >
                  {msg.role === 'user' ? 'You' : 'Agent'}:
                </span>
                <span className="text-neutral-900 dark:text-neutral-100 ml-2">{msg.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-30">
        <VoiceControls
          isRecording={isRecording}
          isMuted={isMuted}
          status={status}
          onStart={startRecording}
          onToggleMute={toggleMute}
          onStop={stopRecording}
          onReset={resetSession}
          disabled={!!error}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-red-100 dark:bg-red-900/90 backdrop-blur text-red-900 dark:text-white px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 max-w-md">
          <p className="text-sm font-medium">Error: {error}</p>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          dataId={previewImage._id.toString()}
          projectId={projectId}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
