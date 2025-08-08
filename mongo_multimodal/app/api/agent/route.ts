import { anthropic } from '@ai-sdk/anthropic';
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

    // Create a message with the image for Claude to analyze
    const analysisResult = await streamText({
      model: anthropic('claude-3-5-sonnet-20240620'),
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


// Simple tool function for web search using BraveSearch API
async function searchWeb(query: string) {
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    return "Web search not available - API key not configured";
  }

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.append('q', query);
    url.searchParams.append('count', '3');
    url.searchParams.append('result_filter', 'web');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
      },
    });

    const data = await response.json();
    return JSON.stringify(data.web?.results?.slice(0, 3) || []);
  } catch (error) {
    console.error('Web search error:', error);
    return "Web search failed";
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

    // Get project information for context
    const db = await getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });

    const projectContext = {
      name: project?.name,
      description: project?.description
    };

    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20240620'),
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

### 3. 🌐 searchWeb
- Search the internet for additional context and information
- Use to supplement project data with external knowledge
- Helpful for research, comparisons, and best practices

### 4. 📄 projectDataAnalysis
- Fetch the stored analysis for a specific project item by id
- Returns description, tags, insights, facets, and metadata (no base64) for precise reasoning

## Research Methodology
Choose your strategy based on query complexity. Start with 1-2 single-word probes (e.g., key ingredient names) rather than long phrases, then iterate:

- **Simple queries (low fidelity needed)**: Make a small number of targeted tool calls (1-3). Prefer concise searches and return the answer directly.
- **Complex queries (richer reasoning)**: Plan iteratively. Make multiple focused tool calls with narrower sub-queries. Synthesize only at the end.

General approach:
1. If the user mentions specific items/IDs, target those first.
2. Decompose ambiguous queries into concrete sub-queries and call tools multiple times.
3. Prefer multiple small, precise searches over one broad search. Ignore filenames for relevance—use the content and analysis.
4. Keep each tool call scoped; for project search, return only top 1-2 items per call to avoid context bloat.
5. Decide dynamically whether to deepen with more calls or conclude when sufficient evidence is found.

## Response Format
Keep responses concise and solution-focused:

- Lead with the answer.
- Use short bullets; bold only key data points.
- Do not narrate the process or apologize.
- If evidence is insufficient, say so briefly and make 1-2 next-step searches.

## Analysis Standards
- Solve the user's problem directly.
- Extract only the information that answers the question; avoid generic descriptions.
- Avoid speculation; if data is missing, say so and iterate.
- Cite the specific items you used (filenames/IDs/links) when relevant.

## Error Handling
When a tool fails:
1. **Try immediately** with different parameters or search terms multiple times
2. **Search for related data** that might contain the answer, be creative with the search terms
3. **Be direct** about what you found vs. what you couldn't find
4. **Don't give generic advice** - either solve it or clearly state limitations

Remember: You're here to **solve the user's specific query**, not provide educational content about what might be possible.`,
      messages: messages.slice(-10),
      maxRetries: 2,
      stopWhen: stepCountIs(analysisDepth === 'deep' ? 8 : 5),
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
        searchWeb: tool({
          description: 'Search the web for additional information',
          inputSchema: z.object({
            query: z.string().describe('The web search query'),
          }),
          execute: async ({ query }) => {
            console.log('Tool call: searchWeb with query:', query);
            return await searchWeb(query);
          },
        }),
      },
      onFinish: async ({ text }) => {
        // Save the assistant's response
        await saveConversation(projectId, sessionId, {
          role: 'assistant',
          content: text,
        });
      },
    });

    // Return the streaming response
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Agent API Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}