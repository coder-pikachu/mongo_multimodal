import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText, tool, stepCountIs } from 'ai';
import { getDb } from '@/lib/mongodb';
import { doPaginatedVectorSearch } from '@/lib/utils';
import { compressImage, estimateImageTokens } from '@/lib/image-utils';
import { searchWeb, isPerplexityEnabled } from '@/lib/services/perplexity.service';
import { sendEmail, isEmailEnabled, createEmailConfirmationPrompt } from '@/lib/services/email.service';
import { extractReferencesFromToolResults, updateConversationWithReferences } from '@/lib/services/references.service';
import { storeMemory, retrieveMemories, updateMemoryAccess, getMemoryContext, isMemoryEnabled } from '@/lib/services/memory.service';
import { AgentPlan, ToolExecution } from '@/types/models';
import { MemoryType } from '@/types/agent.types';
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

// Tool: Search similar items based on a specific dataId
async function searchSimilarItems(projectId: string, dataId: string, maxResults: number = 3) {
  try {
    const db = await getDb();

    // Get the item's embedding
    const item = await db.collection('projectData').findOne(
      { _id: new ObjectId(dataId) },
      { projection: { embedding: 1, metadata: 1 } }
    );

    if (!item || !item.embedding) {
      return JSON.stringify({ error: 'Item not found or has no embedding' });
    }

    // Search using the item's embedding
    const results = await db.collection('projectData')
      .aggregate([
        {
          $vectorSearch: {
            queryVector: item.embedding,
            path: 'embedding',
            numCandidates: maxResults * 5,
            limit: maxResults + 1, // +1 to exclude the original item
            index: 'vector_index',
            filter: projectId ? { projectId: new ObjectId(projectId) } : undefined
          }
        },
        {
          $match: {
            _id: { $ne: new ObjectId(dataId) } // Exclude the original item
          }
        },
        {
          $project: {
            _id: 1,
            type: 1,
            metadata: 1,
            analysis: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ])
      .toArray();

    const summaryResults = results.map((r) => ({
      id: r._id.toString(),
      filename: r.metadata?.filename || 'Unknown',
      type: r.type,
      score: r.score,
      description: r.analysis?.description || 'No description available',
      tags: r.analysis?.tags || []
    }));

    return JSON.stringify({
      originalItem: item.metadata?.filename || dataId,
      similarItems: summaryResults
    });
  } catch (error) {
    console.error('Search similar items error:', error);
    return JSON.stringify({ error: 'Failed to find similar items' });
  }
}

// Save conversation to MongoDB with plan and references
async function saveConversation(
  projectId: string,
  sessionId: string,
  message: { role: string; content: string },
  plan?: AgentPlan,
  toolExecutions?: ToolExecution[]
) {
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

    const doc: any = {
      projectId,
      sessionId,
      message: cleanMessage,
      timestamp: new Date(),
      contentCleaned: cleanMessage.content !== message.content
    };

    // Add plan if provided
    if (plan) {
      doc.plan = plan;
    }

    // Add tool executions if provided
    if (toolExecutions && toolExecutions.length > 0) {
      doc.toolExecutions = toolExecutions;

      // Extract and add references
      const references = extractReferencesFromToolResults(toolExecutions, projectId);
      if (references.length > 0) {
        doc.references = references;
      }
    }

    const result = await db.collection('conversations').insertOne(doc);

    console.log('Agent: saveConversation - saved message with ID:', result.insertedId);

    // If there are references and this is an assistant message, update project data
    if (doc.references && message.role === 'assistant') {
      const userQuery = cleanMessage.content.substring(0, 200); // First 200 chars as context
      await updateConversationWithReferences(
        db,
        result.insertedId.toString(),
        doc.references,
        sessionId,
        userQuery
      );
    }

    return result.insertedId;
  } catch (error) {
    console.error('Agent: Error saving conversation:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      projectId,
      sessionId = `session_${Date.now()}`,
      analysisDepth = 'general',
      selectedDataIds,
      // Tool toggles from UI (default based on feature availability)
      enableWebSearch = false,
      enableEmail = false,
      enableMemory = true
    } = await req.json();

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
    console.log('Agent: Selected data IDs:', selectedDataIds);

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

    // Track tool executions and plan
    let currentPlan: AgentPlan | undefined;
    const toolExecutions: ToolExecution[] = [];
    let stepCounter = 0;

    const result = await streamText({
      model: selectedProvider === 'claude' ? anthropic('claude-haiku-4-5-20251001') : openai('gpt-5-nano-2025-08-07'),
      maxOutputTokens: 8192,
      system: `You are Claude, an expert AI research assistant specializing in multimodal data analysis and research.

## Project Context
${project ? `**Project**: ${project.name}
**Description**: ${project.description}

You are working within this specific project context. All searches and analyses must align to the project description.` : 'You are working with a multimodal data project stored in MongoDB.'}

${selectedDataIds && selectedDataIds.length > 0 ? `## 🎯 User-Selected Items (PRIORITY CONTEXT)
**The user has pre-selected ${selectedDataIds.length} item(s) for analysis:**
${selectedDataIds.map((id: string, idx: number) => `${idx + 1}. Data ID: ${id}`).join('\n')}

**IMPORTANT**: These IDs are ready for immediate use with the \`analyzeImage\` tool. You can directly call:
- \`analyzeImage(dataId: "${selectedDataIds[0]}", ...)\` to analyze the first selected item
${selectedDataIds.length > 1 ? `- \`analyzeImage(dataId: "${selectedDataIds[1]}", ...)\` to analyze the second selected item` : ''}
${selectedDataIds.length > 2 ? `- And so on for the other selected items` : ''}

**DO NOT search for these items by filename** - use the provided data IDs directly! This saves tool calls and ensures accuracy.` : ''}

## Your Capabilities
You have access to ${(() => {
  let count = 5; // Base tools: planQuery, searchProjectData, searchSimilarItems, analyzeImage, projectDataAnalysis
  if (enableMemory && isMemoryEnabled()) count += 2; // rememberContext, recallMemory
  if (enableWebSearch && isPerplexityEnabled()) count += 1; // searchWeb
  if (enableEmail && isEmailEnabled()) count += 1; // sendEmail
  return count === 5 ? 'five' : count === 6 ? 'six' : count === 7 ? 'seven' : count === 8 ? 'eight' : 'nine';
})()} powerful tools:

### Core Research Tools

### 1. 📋 planQuery (USE THIS FIRST!)
- **MANDATORY FIRST STEP**: Create a plan BEFORE using any other tools
- Decompose the user query into logical steps
- Estimate tool calls needed and verify step budget
- Identify which tools to use and in what order
- Note if external data (web search) is needed
- **You MUST call this tool first to show your strategy to the user**

### 2. 🔍 searchProjectData
- Search through project documents, images, text chunks, and web content using semantic vector search
- Returns relevant content with similarity scores
- Accepts maxResults parameter (default: 2, max: 10)
- Use for finding information related to user queries
- Supports: Images, Documents, Text Chunks (from .txt/.csv/.json files), Web Chunks (from scraped websites)

### 3. 🔗 searchSimilarItems
- Find items similar to a specific data item by ID
- Uses vector similarity to discover related content
- Useful for exploring connections and related materials

### 4. 🖼️ analyzeImage
- Extract key insights and data from individual images with full context awareness
- Uses project context and user query to focus analysis on relevant elements
- Automatically compresses images for optimal processing
- Can analyze up to ${maxAnalyses} images per query (${analysisDepth} analysis mode)
- Provides targeted analysis based on what the user is specifically asking about

### 5. 📄 projectDataAnalysis
- Fetch the stored analysis for a specific project item by id
- Returns description, tags, insights, facets, and metadata (no base64) for precise reasoning

${enableMemory && isMemoryEnabled() ? `### Memory Tools

### 6. 🧠 rememberContext
- Store important information, facts, preferences, or insights for future reference
- Use when you learn something valuable about the user, project, or data patterns
- Types: fact (objective information), preference (user choices), pattern (recurring themes), insight (analytical conclusions)
- Memories are searchable and persist across conversations

### 7. 💭 recallMemory
- Search and retrieve relevant memories from past conversations
- Use semantic search to find related information you've learned before
- Helps provide context-aware responses based on conversation history
- Query by content, filter by memory type` : ''}

${enableWebSearch && isPerplexityEnabled() ? `### External Tools

### ${enableMemory && isMemoryEnabled() ? '8' : '6'}. 🌐 searchWeb
- Search the web using Perplexity AI for external information and real-time data
- Returns answers with citations from reliable sources
- Use when:
  - User explicitly requests external/web information
  - Project data doesn't contain sufficient information for the query
  - You need current events, latest updates, or information beyond the project scope
  - Comparing project data with external benchmarks or standards
- Returns structured answers with source citations` : ''}

${enableEmail && isEmailEnabled() ? `### ${(enableWebSearch && isPerplexityEnabled()) && (enableMemory && isMemoryEnabled()) ? '9' : (enableMemory && isMemoryEnabled()) || (enableWebSearch && isPerplexityEnabled()) ? '7' : '6'}. 📧 sendEmail
- Send emails with analysis results or summaries
- Requires explicit user confirmation before sending
- Use when user requests to share or send information via email` : ''}

## CRITICAL: Data Source Constraints
**Primary Rule: Use project data as your main source via your tools.**${enableWebSearch && isPerplexityEnabled() ? `
**Secondary Rule: When web search is enabled and you cannot find sufficient information in project data, you MAY use the searchWeb tool to supplement your answer. Always prioritize project data first.**` : `
**YOU MUST ONLY USE INFORMATION FROM THE PROJECT DATA. Do not use external knowledge.**`}

The project includes:
- **Images** (JPEG, PNG) - Analyzed with context-awareness
- **Documents** (PDFs converted to pages) - Treated as images
- **Text Chunks** (uploaded .txt, .csv, .json files) - Automatically chunked for context
- **Web Chunks** (scraped websites) - Automatically chunked for context

Constraint Rules:
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

**Planning Phase (MANDATORY FIRST STEP):**
1. **Call planQuery tool FIRST** - This creates a visible plan for the user showing:
   - Decomposition of the query into logical steps
   - Which tools you'll use and in what order
   - Estimated number of tool calls needed
   - Whether external data sources are required
   - Rationale for your approach
2. **After planning**, execute the plan step by step
3. **Monitor progress**: Track your steps and adjust if needed
4. **Reserve final step**: Always keep your last step for synthesis

**Execution Strategy:**
- ${analysisDepth === 'deep' ? '**Deep Mode**: Use planQuery (step 1) + 10 tool steps + synthesis (step 12). Aim for 2-3 searches + 3-4 analyses' : '**General Mode**: Use planQuery (step 1) + 5 tool steps + synthesis (step 7). Aim for 1-2 searches + 1-2 analyses'}
- Follow your plan but adapt if results require different approach
- Start with broad searches, then narrow down if needed
- If running low on steps, synthesize what you have rather than making more tool calls
- **Better to answer well with limited data than to gather data without answering**

## Research Methodology
Choose your strategy based on query complexity. Start with 1-2 single-word probes (e.g., key ingredient names) rather than long phrases, then iterate:

- **Simple queries (low fidelity needed)**: Create a simple 2-3 step plan, make targeted tool calls (1-3), return answer.
- **Complex queries (richer reasoning)**: Create detailed plan with 4-6 steps, make multiple focused tool calls with narrower sub-queries, synthesize at end.

General approach:
1. **PLAN FIRST (MANDATORY)**: Call planQuery tool to create and share your strategy with the user
2. **Execute plan**: Follow the steps you outlined in your plan
3. If the user mentions specific items/IDs, target those first
4. Decompose ambiguous queries into concrete sub-queries (as shown in your plan)
5. Prefer focused searches that answer the question directly over exhaustive exploration
6. Keep each tool call scoped; for project search, default to 2 results (adjust maxResults if needed)
7. **If tools return no results**, try 1-2 alternative search terms${enableWebSearch && isPerplexityEnabled() ? `, then use searchWeb if project data is truly insufficient` : `, then conclude if step budget is tight`}
8. **Monitor your step usage**: After each tool call, consider if you should gather more data or synthesize now
9. **Adapt if needed**: If your plan isn't working, it's okay to adjust - just note the change in your synthesis${enableWebSearch && isPerplexityEnabled() ? `
10. **Web search fallback**: If project searches fail to find relevant information, use searchWeb to supplement your answer with external data` : ``}

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
2. **Search for related data** that might contain the answer, be creative with the search terms${enableWebSearch && isPerplexityEnabled() ? `
3. **Use searchWeb**: If project data truly doesn't contain the information, use the searchWeb tool to find external answers
4. **Be direct** about what you found vs. what you couldn't find - cite which sources (project vs web) provided the information
5. **State limitations clearly**: "I searched the project for [X, Y, Z] but found no relevant data. However, web search revealed..."` : `
3. **Be direct** about what you found vs. what you couldn't find in the project data
4. **State limitations clearly**: "I searched the project for [X, Y, Z] but no relevant data was found"
5. **Don't provide general knowledge** - if it's not in the project, say so`}

## CRITICAL: Final Response Requirement
After using tools (search, analyze, etc.), you MUST provide a comprehensive synthesized answer that:
1. **Directly answers** the user's question using ONLY information gathered from tools${enableWebSearch && isPerplexityEnabled() ? ` (project data AND web search results)` : ``}
2. **Integrates findings** from all tool calls into a coherent response
3. **Uses proper markdown formatting** with headers, bullets, and emphasis
4. **Cites specific sources** (filenames, data points${enableWebSearch && isPerplexityEnabled() ? `, web citations` : ``}) from your tool results
5. **Clearly states** if information wasn't found: ${enableWebSearch && isPerplexityEnabled() ? `"I couldn't find data about [X] in this project, but web search found..."` : `"I couldn't find data about [X] in this project"`}

Never end your response immediately after tool calls. Always synthesize and present your findings to the user.`,
      messages: messages.slice(-10),
      maxRetries: 2,
      // Step budget: includes tool calls + final synthesis step
      // General: 4 tool calls + 1 synthesis = 5 steps
      // Deep: 7 tool calls + 1 synthesis = 8 steps
      stopWhen: stepCountIs(analysisDepth === 'deep' ? 12 : 7),
      tools: {
        planQuery: tool({
          description: 'Create a detailed plan for answering the user query. MUST be called first before any other tools.',
          inputSchema: z.object({
            steps: z.array(z.string()).describe('List of logical steps to answer the query'),
            toolsToUse: z.array(z.string()).describe('Tools you plan to use (e.g., ["searchProjectData", "analyzeImage"])'),
            estimatedToolCalls: z.number().describe('Estimated number of tool calls needed'),
            rationale: z.string().describe('Brief explanation of your approach'),
            needsExternalData: z.boolean().describe('Whether web search or external data is needed')
          }),
          execute: async ({ steps, toolsToUse, estimatedToolCalls, rationale, needsExternalData }) => {
            stepCounter++;
            const startTime = Date.now();

            console.log('Tool call: planQuery');
            console.log('Steps:', steps);
            console.log('Tools to use:', toolsToUse);
            console.log('Estimated calls:', estimatedToolCalls);

            const plan: AgentPlan = {
              steps,
              toolsToUse,
              estimatedToolCalls,
              rationale,
              needsExternalData
            };

            currentPlan = plan;

            // Record this tool execution
            toolExecutions.push({
              step: stepCounter,
              tool: 'planQuery',
              input: { steps, toolsToUse, estimatedToolCalls, rationale, needsExternalData },
              output: plan,
              duration: Date.now() - startTime,
              timestamp: new Date()
            });

            return JSON.stringify({
              success: true,
              plan,
              message: `Plan created with ${steps.length} steps. Estimated ${estimatedToolCalls} tool calls. ${needsExternalData ? 'External data will be needed.' : 'Will use project data only.'}`
            });
          },
        }),
        searchProjectData: tool({
          description: 'Search for information within the current project documents and images. Returns top results with similarity scores.',
          inputSchema: z.object({
            query: z.string().describe('The search query'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 2, max: 10)'),
            useAnalysis: z.boolean().optional().describe('If true, prioritize items with analysis.description and consider tags when summarizing')
          }),
          execute: async ({ query, maxResults = 2, useAnalysis }) => {
            stepCounter++;
            const startTime = Date.now();

            console.log('Tool call: searchProjectData with query:', query, 'maxResults:', maxResults, 'useAnalysis:', useAnalysis);

            // Clamp maxResults to reasonable limits
            const limit = Math.min(Math.max(maxResults, 1), 10);

            const raw = await searchProjectData(projectId, query);

            let result = raw;
            if (useAnalysis) {
              try {
                const parsed: { results?: Array<{ description?: string }> } = JSON.parse(raw as unknown as string);
                // Move analyzed items to the top
                parsed.results = (parsed.results || []).sort((a, b) => {
                  const aHas = !!a.description && a.description !== 'No description available';
                  const bHas = !!b.description && b.description !== 'No description available';
                  return Number(bHas) - Number(aHas);
                });
                result = JSON.stringify(parsed);
              } catch {
                result = raw;
              }
            }

            toolExecutions.push({
              step: stepCounter,
              tool: 'searchProjectData',
              input: { query, maxResults: limit, useAnalysis },
              output: result,
              duration: Date.now() - startTime,
              timestamp: new Date()
            });

            return result;
          },
        }),
        searchSimilarItems: tool({
          description: 'Find items similar to a specific data item using vector similarity. Useful for exploring related content.',
          inputSchema: z.object({
            dataId: z.string().describe('The ID of the item to find similar items for'),
            maxResults: z.number().optional().describe('Maximum number of similar items to return (default: 3, max: 10)')
          }),
          execute: async ({ dataId, maxResults = 3 }) => {
            stepCounter++;
            const startTime = Date.now();

            console.log('Tool call: searchSimilarItems with dataId:', dataId, 'maxResults:', maxResults);

            const limit = Math.min(Math.max(maxResults, 1), 10);
            const result = await searchSimilarItems(projectId, dataId, limit);

            toolExecutions.push({
              step: stepCounter,
              tool: 'searchSimilarItems',
              input: { dataId, maxResults: limit },
              output: result,
              duration: Date.now() - startTime,
              timestamp: new Date()
            });

            return result;
          },
        }),
        analyzeImage: tool({
          description: 'Extract key insights and actionable data from a single image. Focus on content relevant to the user query, not visual descriptions.',
          inputSchema: z.object({
            dataId: z.string().describe('The ID of the image to analyze'),
          }),
          execute: async ({ dataId }) => {
            stepCounter++;
            const startTime = Date.now();

            console.log('Tool call: analyzeImage with dataId:', dataId);

            const result = await analyzeImage(projectId, dataId, userQuery, projectContext);

            toolExecutions.push({
              step: stepCounter,
              tool: 'analyzeImage',
              input: { dataId },
              output: result,
              duration: Date.now() - startTime,
              timestamp: new Date()
            });

            return result;
          },
        }),
        projectDataAnalysis: tool({
          description: 'Fetch stored analysis for a specific projectData item (no base64 returned).',
          inputSchema: z.object({
            dataId: z.string().describe('The ID of the projectData item'),
          }),
          execute: async ({ dataId }) => {
            stepCounter++;
            const startTime = Date.now();

            console.log('Tool call: projectDataAnalysis with dataId:', dataId);

            const result = await getProjectDataAnalysis(projectId, dataId);

            toolExecutions.push({
              step: stepCounter,
              tool: 'projectDataAnalysis',
              input: { dataId },
              output: result,
              duration: Date.now() - startTime,
              timestamp: new Date()
            });

            return result;
          },
        }),
        ...(enableWebSearch && isPerplexityEnabled() ? {
          searchWeb: tool({
            description: 'Search the web using Perplexity AI for external information and real-time data. Returns answers with citations from reliable sources. Use when user requests web info, project data is insufficient, or you need current events/benchmarks.',
            inputSchema: z.object({
              query: z.string().describe('The web search query'),
            }),
            execute: async ({ query }) => {
              stepCounter++;
              const startTime = Date.now();

              console.log('Tool call: searchWeb with query:', query);

              try {
                const webResult = await searchWeb(query);

                const result = JSON.stringify({
                  answer: webResult.answer,
                  citations: webResult.citations,
                  source: 'web'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'searchWeb',
                  input: { query },
                  output: result,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return result;
              } catch (error) {
                const errorResult = JSON.stringify({
                  error: error instanceof Error ? error.message : 'Web search failed'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'searchWeb',
                  input: { query },
                  output: errorResult,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return errorResult;
              }
            },
          })
        } : {}),
        ...(enableEmail && isEmailEnabled() ? {
          sendEmail: tool({
            description: 'Send an email with analysis results or summaries. Use when user requests to share or send information via email. Note: Email sending requires explicit confirmation.',
            inputSchema: z.object({
              to: z.string().describe('Email address to send to'),
              subject: z.string().describe('Email subject'),
              body: z.string().describe('Email body content (markdown supported)'),
            }),
            execute: async ({ to, subject, body }) => {
              stepCounter++;
              const startTime = Date.now();

              console.log('Tool call: sendEmail to:', to);

              try {
                const emailResult = await sendEmail({
                  to,
                  subject,
                  body,
                  projectName: projectContext.name,
                  projectDescription: projectContext.description
                });

                const result = JSON.stringify({
                  success: emailResult.success,
                  messageId: emailResult.messageId,
                  error: emailResult.error,
                  note: emailResult.success
                    ? 'Email sent successfully'
                    : 'Email sending failed - user confirmation may be needed'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'sendEmail',
                  input: { to, subject, body: body.substring(0, 200) + '...' }, // Truncate body in log
                  output: result,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return result;
              } catch (error) {
                const errorResult = JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Email sending failed'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'sendEmail',
                  input: { to, subject },
                  output: errorResult,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return errorResult;
              }
            },
          })
        } : {}),
        ...(enableMemory && isMemoryEnabled() ? {
          rememberContext: tool({
            description: 'Store important information, facts, preferences, or insights for future reference. Use when you learn something valuable that should be remembered.',
            inputSchema: z.object({
              content: z.string().describe('The information to remember'),
              type: z.enum(['fact', 'preference', 'pattern', 'insight']).describe('Type of memory'),
              tags: z.array(z.string()).optional().describe('Tags to categorize this memory'),
            }),
            execute: async ({ content, type, tags }) => {
              stepCounter++;
              const startTime = Date.now();

              console.log('Tool call: rememberContext with type:', type);

              try {
                const db = await getDb();
                const memoryId = await storeMemory(db, {
                  projectId,
                  sessionId,
                  type: type as MemoryType,
                  content,
                  source: 'agent',
                  confidence: 0.9,
                  tags: tags || [],
                });

                const result = JSON.stringify({
                  success: !!memoryId,
                  memoryId: memoryId?.toString(),
                  message: memoryId
                    ? 'Memory stored successfully'
                    : 'Failed to store memory',
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'rememberContext',
                  input: { content: content.substring(0, 200), type, tags },
                  output: result,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return result;
              } catch (error) {
                const errorResult = JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to store memory'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'rememberContext',
                  input: { content: content.substring(0, 200), type },
                  output: errorResult,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return errorResult;
              }
            },
          }),
          recallMemory: tool({
            description: 'Search and retrieve relevant memories from past conversations. Use to find previously learned information.',
            inputSchema: z.object({
              query: z.string().describe('What to search for in memories'),
              limit: z.number().optional().describe('Maximum number of memories to retrieve (default: 5)'),
              type: z.enum(['fact', 'preference', 'pattern', 'insight']).optional().describe('Filter by memory type'),
            }),
            execute: async ({ query, limit, type }) => {
              stepCounter++;
              const startTime = Date.now();

              console.log('Tool call: recallMemory with query:', query);

              try {
                const db = await getDb();
                const memories = await retrieveMemories(db, {
                  projectId,
                  query,
                  limit: limit || 5,
                  type: type as MemoryType | undefined,
                  minConfidence: 0.6,
                });

                // Update access count for retrieved memories
                for (const mem of memories) {
                  if (mem.memory._id) {
                    await updateMemoryAccess(db, mem.memory._id.toString());
                  }
                }

                const result = JSON.stringify({
                  found: memories.length,
                  memories: memories.map(m => ({
                    content: m.memory.content,
                    type: m.memory.type,
                    confidence: m.memory.metadata.confidence,
                    score: m.score,
                    tags: m.memory.tags,
                    source: m.memory.metadata.source,
                  })),
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'recallMemory',
                  input: { query, limit, type },
                  output: result,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return result;
              } catch (error) {
                const errorResult = JSON.stringify({
                  found: 0,
                  memories: [],
                  error: error instanceof Error ? error.message : 'Failed to recall memories'
                });

                toolExecutions.push({
                  step: stepCounter,
                  tool: 'recallMemory',
                  input: { query, limit, type },
                  output: errorResult,
                  duration: Date.now() - startTime,
                  timestamp: new Date()
                });

                return errorResult;
              }
            },
          })
        } : {}),
      },
      onFinish: async ({ text }) => {
        console.log('Agent: onFinish called with text length:', text?.length || 0);
        console.log('Agent: Final text preview:', text?.substring(0, 200));
        console.log('Agent: Total tool executions:', toolExecutions.length);

        // Save the assistant's response with plan and tool executions
        await saveConversation(
          projectId,
          sessionId,
          {
            role: 'assistant',
            content: text,
          },
          currentPlan,
          toolExecutions
        );
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