/**
 * Voice Streaming Proxy API
 * Securely proxies audio streaming between client and Gemini Live API
 * Uses Server-Sent Events (SSE) for real-time communication
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity } from '@google/genai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { verifyVoiceSessionToken, extractTokenFromHeader } from '@/lib/jwt';
import { voiceStreamLimiter } from '@/lib/rate-limiter';
import { getDb } from '@/lib/mongodb';
import { recordToolCall, endVoiceSession } from '@/lib/services/voice-usage.service';
import { ObjectId } from 'mongodb';
import { compressImage } from '@/lib/image-utils';

// Store active sessions and their message queues (in-memory, use Redis for production)
const activeSessions = new Map<string, any>();
const messageQueues = new Map<string, any[]>();
const sseControllers = new Map<string, ReadableStreamDefaultController>();

/**
 * GET /api/voice/stream
 * Establishes Server-Sent Events (SSE) stream for receiving Gemini responses
 */
export async function GET(request: NextRequest) {
  let sessionId: string | undefined;

  try {
    console.log('[Voice Stream GET] Starting SSE stream setup');

    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[Voice Stream GET] No token provided');
      return NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      );
    }

    const payload = await verifyVoiceSessionToken(token);
    sessionId = payload.sessionId;
    const projectId = payload.projectId;
    console.log('[Voice Stream GET] Verified session:', sessionId, 'projectId:', projectId);

    // 2. Fetch project context
    let projectContext = '';
    let projectName = '';
    if (projectId) {
      try {
        const db = await getDb();
        const project = await db.collection('projects').findOne(
          { _id: new ObjectId(projectId) },
          { projection: { name: 1, description: 1 } }
        );
        if (project) {
          projectName = project.name;
          projectContext = `\n\nPROJECT CONTEXT:\n- Project Name: ${project.name}\n- Project Description: ${project.description || 'No description provided'}\n\nWhen formulating search queries, consider this project context to find the most relevant information in the multimodal embedding space. Craft your queries to align with the project domain and content type.`;
          console.log('[Voice Stream GET] Project context loaded:', project.name);
        }
      } catch (error) {
        console.warn('[Voice Stream GET] Failed to fetch project context:', error);
      }
    }

    // 3. Get or create Gemini session
    let session = activeSessions.get(sessionId);

    if (!session) {
      console.log('[Voice Stream GET] Creating new Gemini session');

      // Initialize Gemini client
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('[Voice Stream GET] GEMINI_API_KEY not configured');
        throw new Error('GEMINI_API_KEY not configured');
      }

      const client = new GoogleGenAI({ apiKey });
      console.log('[Voice Stream GET] Gemini client created, connecting...');

      // Create new session with callbacks and system instruction
      session = await client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log(`[Voice Stream] Gemini connection opened: ${sessionId}`);
          },
          onmessage: (message: any) => {
            console.log('[Voice Stream] ✅ Gemini message received!');
            console.log('[Voice Stream] Message keys:', Object.keys(message).join(', '));

            // Log more details about the message
            if (message.serverContent) {
              console.log('[Voice Stream] serverContent keys:', Object.keys(message.serverContent).join(', '));
              if (message.serverContent.modelTurn) {
                console.log('[Voice Stream] 🎤 Model is responding (modelTurn detected)');
              }
              if (message.serverContent.interrupted) {
                console.log('[Voice Stream] ⚠️ Interrupted:', message.serverContent.interrupted);
              }
              if (message.serverContent.turnComplete) {
                console.log('[Voice Stream] ✓ Turn complete:', message.serverContent.turnComplete);
              }
            }
            if (message.toolCall) {
              console.log('[Voice Stream] 🔧 Tool call detected:', JSON.stringify(message.toolCall, null, 2).substring(0, 300));
            }

            // Send message to SSE controller if connected
            const controller = sseControllers.get(sessionId);
            if (controller) {
              try {
                const encoder = new TextEncoder();
                const data = `data: ${JSON.stringify(message)}\n\n`;
                controller.enqueue(encoder.encode(data));
              } catch (error) {
                console.error('[Voice Stream] Error sending message:', error);
              }
            } else {
              // Queue message if no active SSE stream
              console.log('[Voice Stream] ⚠️ No SSE controller, queueing message');
              const queue = messageQueues.get(sessionId) || [];
              queue.push(message);
              messageQueues.set(sessionId, queue);
            }
          },
          onerror: (error: any) => {
            console.error(`[Voice Stream] ❌ Gemini error: ${sessionId}`, error);
          },
          onclose: (event: any) => {
            console.log(`[Voice Stream] 🔌 Gemini connection closed: ${sessionId}`, event);
          },
        },
        config: {
          // Per Gemini Live API docs: Only ONE modality allowed per session
          responseModalities: [Modality.AUDIO],

          // Enable audio transcription (per official docs page 4 & 5)
          inputAudioTranscription: {},   // Transcribe user speech to text
          outputAudioTranscription: {},  // Transcribe model audio to text

          // Voice Activity Detection config (per official docs page 14)
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,  // Enable automatic VAD
              startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_MEDIUM,  // More sensitive
              endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_MEDIUM,  // More sensitive
              silenceDurationMs: 800,  // Reduced from 1500ms for faster response
              prefixPaddingMs: 300,     // Include 300ms before speech starts
            }
          },

          systemInstruction: {
            parts: [{
              text: `You are a friendly AI voice assistant with access to ${projectName || 'this project'}.${projectContext}

**CRITICAL: MANDATORY TOOL USAGE**

For ANY question about images, documents, locations, or content in the project:

1. **YOU MUST CALL searchProjectData IMMEDIATELY** - This is NON-NEGOTIABLE
   - Never answer without searching first
   - The query should match the user's question
   - Request 3-5 results for sufficient context

2. **ONLY USE INFORMATION FROM TOOL RESULTS** - This is MANDATORY
   - ❌ NEVER use general knowledge or make assumptions
   - ❌ NEVER guess based on typical scenarios ("spare tires are usually in the trunk")
   - ✅ ONLY speak about what searchProjectData actually returns
   - ✅ IF tools return nothing, say "I don't have that information in this project"

3. **If user asks to see/analyze a specific image by ID**
   - Call analyzeImage with the dataId
   - Describe what you actually see in the returned analysis

**AFTER receiving tool results, speak naturally:**
- Acknowledge briefly: "Let me check..." or "Looking at that now..."
- Synthesize the results conversationally
- Don't mention "tools", "searching", "database", or "function calls"
- Speak as if you're reviewing the information yourself
- Reference page numbers and specific details from the results

**WORKFLOW EXAMPLES:**

❌ **WRONG (answering without tools):**
User: "Where is the spare tire?"
Agent: "Let me check... Spare tires are typically in the trunk."
**Problem:** Agent guessed without calling searchProjectData!

✅ **CORRECT (mandatory tool execution):**
User: "Where is the spare tire?"
→ [Agent MUST call searchProjectData("spare tire location")]
→ [Tool returns: Vehicle_Manual_page_110.jpg - "Spare tire storage under cargo floor"]
→ Agent speaks: "Let me check that... I can see on page 110 that the spare tire is located under the cargo floor in the trunk."

❌ **WRONG (vague without searching):**
User: "What's in the manual?"
Agent: "You have maintenance information and diagrams."
**Problem:** Too vague, didn't search first!

✅ **CORRECT (search then be specific):**
User: "What's in the manual?"
→ [Agent calls searchProjectData("manual content", maxResults: 5)]
→ [Tool returns: 5 specific images with descriptions]
→ Agent speaks: "Let me check... Your manual has sections on spare tire storage on page 110, engine oil specifications on page 23, and tire pressure diagrams on page 45."

**REMEMBER:**
- 🔴 NEVER answer content questions without calling searchProjectData first
- 🔴 NEVER use general knowledge - ONLY use actual tool results
- 🟢 ALWAYS call tools BEFORE responding
- 🟢 ALWAYS examine what the tool actually returned
- 🟢 Be specific with page numbers and details from the search results

Be warm, helpful, and conversational - but ALWAYS ground your responses in actual tool data!`
            }]
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Orus' },
            },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'searchProjectData',
                  description: 'Search through the user\'s visual and textual knowledge base. Use this tool whenever the user asks about their images, documents, or any content in their project.',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'Search query based on user\'s question',
                      },
                      maxResults: {
                        type: 'number',
                        description: 'Maximum number of results (1-10)',
                        default: 3,
                      },
                    },
                    required: ['query'],
                  },
                },
                {
                  name: 'analyzeImage',
                  description: 'Analyze a specific image by its ID. This tool fetches the actual image data and returns a detailed visual analysis. Use this after searchProjectData to deeply examine specific images.',
                  parameters: {
                    type: 'object',
                    properties: {
                      dataId: {
                        type: 'string',
                        description: 'The ID of the image to analyze (from searchProjectData results)',
                      },
                    },
                    required: ['dataId'],
                  },
                },
              ],
            },
          ],
        },
      } as any);

      activeSessions.set(sessionId, session);
      messageQueues.set(sessionId, []);

      // Auto-cleanup after 15 minutes
      setTimeout(() => {
        const s = activeSessions.get(sessionId || '');
        if (s && sessionId) {
          s.close().catch(console.error);
          activeSessions.delete(sessionId);
          messageQueues.delete(sessionId);
          sseControllers.delete(sessionId);
        }
      }, 15 * 60 * 1000);

      console.log(`[Voice Stream GET] Gemini session created successfully:`, sessionId);
    } else {
      console.log('[Voice Stream GET] Reusing existing Gemini session');
    }

    // 3. Create SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        console.log(`[Voice Stream] SSE stream started for session: ${sessionId}`);

        // Register controller for this session
        sseControllers.set(sessionId, controller);

        // Send initial connection event
        controller.enqueue(encoder.encode('data: {"connected": true}\n\n'));

        // Send any queued messages
        const queue = messageQueues.get(sessionId) || [];
        for (const message of queue) {
          try {
            const data = `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('[Voice Stream] Error sending queued message:', error);
          }
        }
        messageQueues.set(sessionId, []); // Clear queue

        // Keep-alive ping every 15 seconds
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'));
          } catch (e) {
            clearInterval(keepAliveInterval);
          }
        }, 15000);

        // Cleanup on abort
        const abortHandler = () => {
          console.log(`[Voice Stream] SSE stream closed for session: ${sessionId}`);
          clearInterval(keepAliveInterval);
          sseControllers.delete(sessionId);
        };

        // Listen for client disconnect
        request.signal.addEventListener('abort', abortHandler);
      },

      cancel() {
        console.log(`[Voice Stream] SSE stream cancelled for session: ${sessionId}`);
        sseControllers.delete(sessionId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[Voice Stream] GET Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to start SSE stream',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let sessionId: string | undefined;

  try {
    console.log('[Voice Stream POST] Received audio stream request');

    // 1. Verify JWT token
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      console.log('[Voice Stream POST] No token provided');
      return NextResponse.json(
        { error: 'Unauthorized - Token required' },
        { status: 401 }
      );
    }

    const payload = await verifyVoiceSessionToken(token);
    sessionId = payload.sessionId;
    console.log('[Voice Stream POST] Verified session:', sessionId);

    // 2. Check rate limit (100 chunks per minute per session)
    const rateLimit = await voiceStreamLimiter.check(sessionId);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many audio chunks. Please slow down.',
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { audio, mimeType, action = 'stream' } = body;

    console.log('[Voice Stream POST] Request body:', {
      hasAudio: !!audio,
      audioLength: audio?.data?.length || audio?.length || 0,
      mimeType,
      action
    });

    // 4. Get existing Gemini session first (needed for all actions)
    const session = activeSessions.get(sessionId);

    if (!session && action !== 'close') {
      return NextResponse.json(
        { error: 'Session not found. Please establish SSE connection first.' },
        { status: 404 }
      );
    }

    // 5. Handle audio stream end signal (when user mutes)
    if (action === 'audioStreamEnd') {
      console.log('[Voice Stream POST] Audio stream end signal received');

      // Signal to Gemini that audio stream has paused
      // Per official docs: https://ai.google.dev/gemini-api/docs/live-guide
      try {
        await session.sendRealtimeInput({ audioStreamEnd: true });
        console.log('[Voice Stream POST] Audio stream end signal sent to Gemini');
      } catch (error) {
        console.error('[Voice Stream POST] Failed to send audio stream end:', error);
      }

      return NextResponse.json({
        success: true,
        message: 'Audio stream end signal sent to Gemini'
      });
    }

    // 5b. Handle legacy end of turn signal (deprecated)
    if (action === 'endTurn') {
      console.log('[Voice Stream POST] End of turn signal received (using audioStreamEnd instead)');

      try {
        await session.sendRealtimeInput({ audioStreamEnd: true });
        console.log('[Voice Stream POST] Audio stream end signal sent to Gemini');
      } catch (error) {
        console.error('[Voice Stream POST] Failed to send audio stream end:', error);
      }

      return NextResponse.json({
        success: true,
        message: 'Audio stream ended'
      });
    }

    // 6. Handle session close
    if (action === 'close') {
      if (session) {
        await session.close();
        activeSessions.delete(sessionId);

        // End usage tracking
        try {
          const db = await getDb();
          await endVoiceSession(db, sessionId, { status: 'completed' });
        } catch (error) {
          console.error('[Voice Stream] Failed to end usage tracking:', error);
        }
      }

      return NextResponse.json({ success: true, message: 'Session closed' });
    }

    // 7. Handle tool responses (BEFORE audio validation)
    if (body.toolResponse) {
      console.log('[Voice Stream POST] Tool response received');
      await session.sendToolResponse(body.toolResponse);

      // Track tool call
      try {
        const db = await getDb();
        await recordToolCall(db, sessionId, {
          tool: body.toolResponse.functionResponses[0]?.name || 'unknown',
          durationMs: body.toolCallDuration || 0,
        });
      } catch (error) {
        console.error('[Voice Stream] Failed to record tool call:', error);
      }

      return NextResponse.json({ success: true, message: 'Tool response sent' });
    }

    // 7b. Handle image analysis (server-side) - VOICE OPTIMIZED for speed
    if (action === 'analyzeImage' && body.dataId) {
      console.log('[Voice Stream POST] Analyzing image server-side (VOICE MODE):', body.dataId);

      try {
        const db = await getDb();

        // Fetch the image
        const projectData = await db.collection('projectData').findOne({
          _id: new ObjectId(body.dataId),
          type: 'image'
        });

        if (!projectData || !projectData.content?.base64) {
          throw new Error('Image not found');
        }

        console.log('[Voice Stream POST] Image found:', projectData.metadata?.filename);

        // AGGRESSIVE compression for voice mode (smaller = faster responses)
        const compressed = await compressImage(
          projectData.content.base64,
          projectData.metadata?.mimeType || 'image/jpeg',
          768,  // Smaller max width (vs 1568 standard)
          70    // Lower quality (vs 85 standard)
        );

        console.log('[Voice Stream POST] Image compressed for voice:', {
          originalKB: compressed.originalSizeKB,
          compressedKB: compressed.sizeKB,
          compressionRatio: `${Math.round((1 - compressed.sizeKB / compressed.originalSizeKB) * 100)}%`
        });

        // Get user query context from request if available
        const userQuery = body.userQuery || body.query || '';

        // Use fastest available model with STRUCTURED OUTPUT
        const selectedProvider = (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

        // Minimal prompt for speed with structured JSON response
        const prompt = `Analyze "${projectData.metadata?.filename || 'this image'}"${userQuery ? ` focusing on: ${userQuery}` : ''}.

Return ONLY valid JSON (no markdown, no extra text):
{
  "summary": "1-2 sentence overview of what you see",
  "keyPoints": ["specific detail 1", "specific detail 2", "specific detail 3"],
  "textContent": "any visible text/numbers/labels in the image",
  "pageNumber": "page number if visible, or null"
}`;

        const result = await generateText({
          model: selectedProvider === 'claude'
            ? anthropic('claude-haiku-4-5-20251001')
            : openai('gpt-4o-mini'),  // Use mini for speed
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image',
                  image: new URL(`data:${projectData.metadata?.mimeType || 'image/jpeg'};base64,${compressed.base64}`),
                },
              ],
            },
          ],
          maxOutputTokens: 500,  // Limit output for speed
        });

        const rawText = result.text.trim();
        console.log('[Voice Stream POST] Analysis complete, length:', rawText.length);

        // Parse structured JSON response
        let structured;
        try {
          // Remove markdown code blocks if present
          const jsonText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          structured = JSON.parse(jsonText);
        } catch (parseError) {
          console.warn('[Voice Stream POST] Failed to parse JSON, using fallback:', parseError);
          structured = {
            summary: rawText.substring(0, 200),
            keyPoints: [],
            textContent: '',
            pageNumber: null
          };
        }

        // Build conversational response for voice
        let voiceResponse = structured.summary || 'I analyzed the image.';

        if (structured.keyPoints && structured.keyPoints.length > 0) {
          voiceResponse += ' ' + structured.keyPoints.slice(0, 3).join('. ');
        }

        if (structured.textContent) {
          voiceResponse += ` The image contains: ${structured.textContent}.`;
        }

        if (structured.pageNumber) {
          voiceResponse += ` This is from page ${structured.pageNumber}.`;
        }

        return NextResponse.json({
          success: true,
          filename: projectData.metadata?.filename,
          analysis: voiceResponse,  // Conversational for Gemini to speak
          structured,  // Structured data for client
          compressionStats: {
            originalKB: compressed.originalSizeKB,
            compressedKB: compressed.sizeKB,
            savedKB: compressed.originalSizeKB - compressed.sizeKB
          }
        });
      } catch (error) {
        console.error('[Voice Stream POST] Failed to analyze image:', error);
        return NextResponse.json(
          { error: 'Failed to analyze image', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // 8. Validate audio data for streaming action
    if (!audio && action !== 'close' && action !== 'endTurn' && action !== 'audioStreamEnd') {
      console.log('[Voice Stream POST] No audio data provided');
      return NextResponse.json(
        { error: 'Bad Request - audio data required' },
        { status: 400 }
      );
    }

    // 9. Send audio to Gemini (responses will be streamed via GET SSE)
    console.log('[Voice Stream POST] Sending audio to Gemini...');

    // According to official docs: https://ai.google.dev/gemini-api/docs/live
    // Audio must be sent with the 'audio' parameter, not 'media'
    const audioData = {
      data: audio.data || audio, // Base64 encoded PCM data
      mimeType: mimeType || audio.mimeType || 'audio/pcm;rate=16000',
    };

    await session.sendRealtimeInput({ audio: audioData });
    console.log('[Voice Stream POST] Audio sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Audio sent successfully'
    });
  } catch (error) {
    console.error('[Voice Stream] Error:', error);

    // Clean up session on error
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session && typeof session.close === 'function') {
        try {
          await session.close();
        } catch (closeErr) {
          console.error('[Voice Stream] Error closing session:', closeErr);
        }
        activeSessions.delete(sessionId);
        messageQueues.delete(sessionId);
        sseControllers.delete(sessionId);
      }

      // Mark session as error
      try {
        const db = await getDb();
        await endVoiceSession(db, sessionId, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (usageError) {
        console.error('[Voice Stream] Failed to mark error in usage:', usageError);
      }
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Streaming failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Cleanup handler for expired sessions
 * Run periodically as a cron job or on server start
 */
export async function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    // Add timestamp tracking to sessions
    if (session.lastActivity && now - session.lastActivity > 15 * 60 * 1000) {
      await session.close().catch(console.error);
      activeSessions.delete(sessionId);
      console.log(`[Voice Stream] Cleaned up expired session: ${sessionId}`);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
}
