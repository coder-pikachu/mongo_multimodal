import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { getDb } from '@/lib/mongodb';
import { doPaginatedVectorSearch } from '@/lib/utils';
import { compressImage, estimateImageTokens } from '@/lib/image-utils';
import { z } from 'zod';
import { ObjectId } from 'mongodb';

export const maxDuration = 60;



// Tool to search for information within a project (returns at most 2 highly-relevant hits)
async function searchProjectData(projectId: string, query: string) {
  try {
    const db = await getDb();
    // Keep results tight so the agent can iterate quickly with multiple calls
    const results = await doPaginatedVectorSearch(db, projectId, query, 'text', 1, 2);
    if (!results.results || results.results.length === 0) {
      return "No results found for your query.";
    }

    // Return a simplified summary without embeddings, focusing on top results
    const summaryResults = results.results.map((r: {
      _id: { toString: () => string },
      metadata?: { filename?: string, size?: number },
      type: string,
      score: number,
      analysis?: { description?: string, tags?: string[] }
    }) => ({
      id: r._id.toString(),
      filename: r.metadata?.filename || 'Unknown',
      type: r.type,
      score: r.score,
      description: r.analysis?.description || 'No description available',
      tags: r.analysis?.tags || [],
      size: r.metadata?.size || 0
    }));

    return JSON.stringify({
      total: results.total,
      showing: Math.min(2, summaryResults.length),
      results: summaryResults.slice(0, 2)
    });
  } catch (error) {
    console.error('Search error:', error);
    return "Search failed. Please try again.";
  }
}

// Tool to analyze a single image
async function analyzeImage(projectId: string, dataId: string, userQuery: string = '', projectContext: { name?: string, description?: string } = {}) {
  try {
    const db = await getDb();

    // Fetch the specific data item
    let projectData = await db.collection('projectData').findOne({
      _id: new ObjectId(dataId),
      projectId: new ObjectId(projectId),
      type: 'image'
    });

    if (!projectData) {
      projectData = await db.collection('projectData').findOne({
        _id: new ObjectId(dataId),
        type: 'image'
      });
    }

    if (!projectData || !projectData.content?.base64) {
      return JSON.stringify({
        error: 'Image not found or invalid',
        suggestion: `Try searching for "${dataId}" or similar filenames in the project data`,
        dataId: dataId
      });
    }

    // Compress the image before analysis
    const compressed = await compressImage(
      projectData.content.base64,
      projectData.metadata?.mimeType || 'image/jpeg'
    );

    const estimatedTokens = estimateImageTokens(compressed.base64);

    // Build context-aware analysis prompt
    let analysisPrompt = `Analyze this image "${projectData.metadata?.filename || 'Unknown'}"`;

    if (projectContext.name || projectContext.description) {
      analysisPrompt += `\n\n**Project Context:**`;
      if (projectContext.name) analysisPrompt += `\n- Project: ${projectContext.name}`;
      if (projectContext.description) analysisPrompt += `\n- Description: ${projectContext.description}`;
    }

    if (userQuery.trim()) {
      analysisPrompt += `\n\n**User Query Context:** "${userQuery}"`;
      analysisPrompt += `\nFocus your analysis specifically on elements that relate to this query.`;
    }

    analysisPrompt += `\n\n**Analysis Instructions:**
- Extract key insights directly relevant to the user's query and project context
- Focus on actionable information, data points, and important findings
- Identify specific technical details, measurements, or specifications if visible
- Highlight any issues, recommendations, or notable observations
- Be concise and avoid describing basic visual elements
- If the image contains text, extract and summarize key information`;
  const selectedProvider = (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

    // Create a message with the image for Claude to analyze
    const analysisResult = await streamText({
      model: selectedProvider === 'claude' ? anthropic('claude-haiku-4-5-20251001') : openai('gpt-5-nano-2025-08-07'),
      maxOutputTokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: analysisPrompt
            },
            {
              type: 'image' as const,
              image: new URL(`data:${projectData.metadata?.mimeType || 'image/jpeg'};base64,${compressed.base64}`)
            }
          ]
        }
      ]
    });

    // Get the complete response
    let fullResponse = '';
    const reader = analysisResult.toTextStreamResponse().body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value);
      }
    }

    return JSON.stringify({
      dataId: dataId,
      filename: projectData.metadata?.filename,
      originalSizeKB: compressed.originalSizeKB,
      compressedSizeKB: compressed.sizeKB,
      estimatedTokens,
      analysis: fullResponse || 'Analysis failed',
      existingAnalysis: projectData.analysis
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    return JSON.stringify({ error: 'Failed to analyze image' });
  }
}

// Tool: fetch stored analysis for a specific projectData item
async function getProjectDataAnalysis(projectId: string, dataId: string) {
  try {
    const db = await getDb();
    // Prefer scoped to project, but fall back to global by id
    let doc = await db.collection('projectData').findOne({
      _id: new ObjectId(dataId),
      projectId: new ObjectId(projectId)
    }, { projection: { content: 0 } });

    if (!doc) {
      doc = await db.collection('projectData').findOne({ _id: new ObjectId(dataId) }, { projection: { content: 0 } });
    }

    if (!doc) {
      return JSON.stringify({ error: 'Item not found', dataId });
    }

    const payload = {
      id: doc._id?.toString?.() || String(doc._id),
      type: doc.type,
      filename: doc.metadata?.filename,
      metadata: {
        mimeType: doc.metadata?.mimeType,
        size: doc.metadata?.size,
      },
      analysis: doc.analysis || { description: '', tags: [], insights: [], facets: {} },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return JSON.stringify(payload);
  } catch (error) {
    console.error('getProjectDataAnalysis error:', error);
    return JSON.stringify({ error: 'Failed to fetch analysis' });
  }
}

// Save conversation to MongoDB
async function saveConversation(projectId: string, sessionId: string, message: { role: string, content: string }) {
  try {
    const db = await getDb();
    console.log('Agent: saveConversation - got DB connection');

    // Clean the message to remove any image data before saving
    const cleanMessage = { ...message };

    if (typeof cleanMessage.content === 'string') {
      // Replace base64 image data with placeholder
      cleanMessage.content = cleanMessage.content.replace(
        /data:image\/[^;]+;base64,[A-Za-z0-9+/]+=*/g,
        '[IMAGE_DATA_REMOVED]'
      );

      // Also check for raw base64 strings that might be from tool results
      if (cleanMessage.content.includes('"base64":') || cleanMessage.content.includes('base64:')) {
        // Replace large base64 strings in JSON-like content
        cleanMessage.content = cleanMessage.content.replace(
          /"base64"\s*:\s*"[A-Za-z0-9+/]{100,}={0,2}"/g,
          '"base64":"[IMAGE_DATA_REMOVED]"'
        );
        cleanMessage.content = cleanMessage.content.replace(
          /base64:\s*[A-Za-z0-9+/]{100,}={0,2}/g,
          'base64: [IMAGE_DATA_REMOVED]'
        );
      }
    }

    await db.collection('conversations').insertOne({
      projectId,
      sessionId,
      message: cleanMessage,
      timestamp: new Date(),
      // Add a flag if content was cleaned
      contentCleaned: cleanMessage.content !== message.content
    });

    console.log('Agent: saveConversation - saved message');
  } catch (error) {
    console.error('Agent: Error saving conversation:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { messages, projectId, sessionId = `session_${Date.now()}`, analysisDepth = 'general' } = await req.json();

    if (!projectId) {
      return new Response("Project ID is required", { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const maxAnalyses = analysisDepth === 'deep' ? 5 : 3;

    // Extract user query from the last message
    const userQuery = typeof lastMessage.content === 'string'
      ? lastMessage.content
      : (Array.isArray(lastMessage.content)
          ? (lastMessage.content as Array<{ type: string; text?: string }>).find((c) => c.type === 'text')?.text || ''
          : '');

    // Save the user message
    await saveConversation(projectId, sessionId, {
      role: 'user',
      content: lastMessage.content,
    });

    console.log('Agent: Starting streamText with tools');
    console.log('Agent: User query:', userQuery);
    console.log('Agent: Analysis depth:', analysisDepth);

    // Get project information for context
    const db = await getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });

    const projectContext = {
      name: project?.name,
      description: project?.description
    };
    const selectedProvider = (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

    const result = await streamText({
      model: selectedProvider === 'claude' ? anthropic('claude-haiku-4-5-20251001') : openai('gpt-5-nano-2025-08-07'),
      maxOutputTokens: 8192,
      system: `You are Claude, an expert AI research assistant specializing in multimodal data analysis and research.

## Project Context
${project ? `**Project**: ${project.name}
**Description**: ${project.description}

You are working within this specific project context. All searches and analyses must align to the project description.` : 'You are working with a multimodal data project stored in MongoDB.'}

## Your Capabilities
You have access to three powerful research tools:

### 1. 🔍 searchProjectData
- Search through project documents and images using semantic vector search
- Returns relevant content with similarity scores
- Use for finding information related to user queries

### 2. 🖼️ analyzeImage
- Extract key insights and data from individual images with full context awareness
- Uses project context and user query to focus analysis on relevant elements
- Automatically compresses images for optimal processing
- Can analyze up to ${maxAnalyses} images per query (${analysisDepth} analysis mode)
- Provides targeted analysis based on what the user is specifically asking about

### 3. 📄 projectDataAnalysis
- Fetch the stored analysis for a specific project item by id
- Returns description, tags, insights, facets, and metadata (no base64) for precise reasoning

## CRITICAL: Data Source Constraints
**YOU MUST ONLY USE INFORMATION FROM THE PROJECT DATA VIA YOUR TOOLS.**

- ❌ **NEVER** use external knowledge, assumptions, or general information
- ❌ **NEVER** make up data points, statistics, or facts not present in tool results
- ❌ **NEVER** provide answers based on training data or common knowledge
- ✅ **ONLY** use information explicitly returned by searchProjectData, analyzeImage, or projectDataAnalysis
- ✅ **IF** no relevant data is found in the project, explicitly state: "I couldn't find information about [topic] in this project's data"
- ✅ **IF** the search returns no results, say so clearly and ask the user to rephrase or check if the data exists

## CRITICAL: Citation Format (MANDATORY)
**YOU MUST CITE ALL SOURCES IN YOUR RESPONSES.**

Every piece of information you present MUST include an inline citation showing where it came from:

**Citation Formats:**
- **For search results**: \`[Source: filename.ext, Score: 0.XX]\`
- **For image analyses**: \`[Image: filename.ext]\`
- **For stored analyses**: \`[Analysis: filename.ext]\`

**End-of-Response Source List:**
After your analysis, include a "**## Sources Referenced**" section listing all files/images you consulted with their IDs:
- filename.ext (ID: abc123...)
- another-file.png (ID: def456...)

**Example Response:**
"The Q3 revenue chart shows 15% growth \`[Source: q3-revenue.png, Score: 0.92]\`. The breakdown \`[Image: detailed-breakdown.png]\` indicates the primary driver was the enterprise segment."

**## Sources Referenced**
- q3-revenue.png (ID: 67890abc...)
- detailed-breakdown.png (ID: 12345def...)

**IMPORTANT**: Citations must be inline with the information. Every claim needs a source.

## Step Budget & Planning Strategy
**YOU HAVE A LIMITED NUMBER OF STEPS. PLAN CAREFULLY.**

**Your Step Budget:**
- ${analysisDepth === 'deep' ? '**Deep Mode**: 12 total steps (11 for tools + 1 MANDATORY for synthesis)' : '**General Mode**: 7 total steps (6 for tools + 1 MANDATORY for synthesis)'}
- Each tool call consumes 1 step
- Your FINAL step MUST be a comprehensive text response synthesizing all findings
- **CRITICAL**: If you use all steps on tools, you CANNOT provide an answer!

**Planning Phase (Do This BEFORE Any Tool Calls):**
1. **Analyze the question**: What specific information is needed?
2. **Plan your tools**: Which tools will give you the answer most efficiently?
3. **Count your steps**: How many tool calls do you need? Do you have enough steps?
4. **Prioritize**: What's the minimum information needed for a good answer?

**Execution Strategy:**
- ${analysisDepth === 'deep' ? '**Deep Mode**: Aim for 2-3 searches + 3-4 image analyses, always leaving step 8 for synthesis' : '**General Mode**: Aim for 1-2 searches + 1-2 image analyses, always leaving step 5-7 for synthesis'}
- Start with broad searches, then narrow down if needed
- If running low on steps, synthesize what you have rather than making more tool calls
- **Better to answer well with limited data than to gather data without answering**

## Research Methodology
Choose your strategy based on query complexity. Start with 1-2 single-word probes (e.g., key ingredient names) rather than long phrases, then iterate:

- **Simple queries (low fidelity needed)**: Make a small number of targeted tool calls (1-3). Prefer concise searches and return the answer directly.
- **Complex queries (richer reasoning)**: Plan iteratively. Make multiple focused tool calls with narrower sub-queries. Synthesize only at the end.

General approach:
1. **PLAN FIRST**: Before any tool calls, mentally plan which tools you'll use and verify you have enough steps
2. **ALWAYS** start by using tools to search the project data - never answer without calling tools first
3. If the user mentions specific items/IDs, target those first
4. Decompose ambiguous queries into concrete sub-queries, but **be mindful of step budget**
5. Prefer focused searches that answer the question directly over exhaustive exploration
6. Keep each tool call scoped; for project search, return only top 1-2 items per call
7. **If tools return no results**, try 1-2 alternative search terms, then conclude if step budget is tight
8. **Monitor your step usage**: After each tool call, consider if you should gather more data or synthesize now

## Response Format
Keep responses concise, solution-focused, and beautifully formatted in Markdown:

- Lead with the answer (or clear statement that data wasn't found)
- Use short bullets and bold only key data points
- Include fenced code blocks (\`\`\`lang) for structured snippets (e.g., JSON, steps, or formulas)
- Tables are welcome for comparisons; use blockquotes for callouts
- If evidence is insufficient, say so explicitly: "I searched for [X] but found no matching data in this project"

## Analysis Standards
- **Ground every statement** in tool results - cite specific filenames, IDs, or data points
- Extract only the information that answers the question; avoid generic descriptions
- **Never speculate** beyond what tool results explicitly show
- If data is missing or ambiguous, state this clearly: "The project data shows [X] but doesn't include information about [Y]"
- Distinguish between what you found vs. what's missing

## Error Handling
When a tool fails or returns no results:
1. **Try immediately** with different parameters or search terms (2-3 attempts)
2. **Search for related data** that might contain the answer, be creative with the search terms
3. **Be direct** about what you found vs. what you couldn't find in the project data
4. **State limitations clearly**: "I searched the project for [X, Y, Z] but no relevant data was found"
5. **Don't provide general knowledge** - if it's not in the project, say so

## CRITICAL: Final Response Requirement
After using tools (search, analyze, etc.), you MUST provide a comprehensive synthesized answer that:
1. **Directly answers** the user's question using ONLY information gathered from tools
2. **Integrates findings** from all tool calls into a coherent response
3. **Uses proper markdown formatting** with headers, bullets, and emphasis
4. **Cites specific sources** (filenames, data points) from your tool results
5. **Clearly states** if information wasn't found: "I couldn't find data about [X] in this project"

Never end your response immediately after tool calls. Always synthesize and present your findings to the user.`,
      messages: messages.slice(-10),
      maxRetries: 2,
      // Step budget: includes tool calls + final synthesis step
      // General: 4 tool calls + 1 synthesis = 5 steps
      // Deep: 7 tool calls + 1 synthesis = 8 steps
      stopWhen: stepCountIs(analysisDepth === 'deep' ? 12 : 7),
      tools: {
        searchProjectData: tool({
          description: 'Search for information within the current project documents and images',
          inputSchema: z.object({
            query: z.string().describe('The search query'),
            useAnalysis: z.boolean().optional().describe('If true, prioritize items with analysis.description and consider tags when summarizing')
          }),
          execute: async ({ query, useAnalysis }) => {
            console.log('Tool call: searchProjectData with query:', query, 'useAnalysis:', useAnalysis);
            const raw = await searchProjectData(projectId, query);
            if (!useAnalysis) return raw;
            try {
              const parsed: { results?: Array<{ description?: string }> } = JSON.parse(raw as unknown as string);
              // Move analyzed items to the top
              parsed.results = (parsed.results || []).sort((a, b) => {
                const aHas = !!a.description && a.description !== 'No description available';
                const bHas = !!b.description && b.description !== 'No description available';
                return Number(bHas) - Number(aHas);
              });
              return JSON.stringify(parsed);
            } catch {
              return raw;
            }
          },
        }),
        analyzeImage: tool({
          description: 'Extract key insights and actionable data from a single image. Focus on content relevant to the user query, not visual descriptions.',
          inputSchema: z.object({
            dataId: z.string().describe('The ID of the image to analyze'),
          }),
          execute: async ({ dataId }) => {
            console.log('Tool call: analyzeImage with dataId:', dataId);
            return await analyzeImage(projectId, dataId, userQuery, projectContext);
          },
        }),
        projectDataAnalysis: tool({
          description: 'Fetch stored analysis for a specific projectData item (no base64 returned).',
          inputSchema: z.object({
            dataId: z.string().describe('The ID of the projectData item'),
          }),
          execute: async ({ dataId }) => {
            console.log('Tool call: projectDataAnalysis with dataId:', dataId);
            return await getProjectDataAnalysis(projectId, dataId);
          },
        }),
      },
      onFinish: async ({ text }) => {
        console.log('Agent: onFinish called with text length:', text?.length || 0);
        console.log('Agent: Final text preview:', text?.substring(0, 200));
        // Save the assistant's response
        await saveConversation(projectId, sessionId, {
          role: 'assistant',
          content: text,
        });
      },
    });

    // Manually create data stream with tool support
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.fullStream) {
            // Format based on chunk type
            let output = '';

            if (chunk.type === 'text-delta' && chunk.text) {
              // Text chunks: type 0
              output = `0:${JSON.stringify(chunk.text)}\n`;
            } else if (chunk.type === 'tool-call') {
              // Tool calls: type 9
              output = `9:${JSON.stringify({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                args: chunk.input
              })}\n`;
            } else if (chunk.type === 'tool-result') {
              // Tool results: type a
              const result = 'output' in chunk ? chunk.output : '';
              output = `a:${JSON.stringify({
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                result: result
              })}\n`;
            }

            if (output) {
              controller.enqueue(encoder.encode(output));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1'
      }
    });
  } catch (error) {
    console.error('Agent API Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}