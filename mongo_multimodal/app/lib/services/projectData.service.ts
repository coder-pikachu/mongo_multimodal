/**
 * Shared service layer for projectData operations
 * Eliminates duplication across API routes
 */

import { Db, ObjectId } from 'mongodb';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { generateMultimodalEmbedding } from '../voyageai';

export interface AnalysisResult {
  description: string;
  tags: string[];
  insights: string[];
  facets: Record<string, unknown>;
}

export interface ProcessResult {
  success: boolean;
  error?: string;
  embeddingGenerated?: boolean;
}

/**
 * Get the selected LLM provider from environment
 */
function getSelectedProvider(): 'claude' | 'openai' {
  return (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';
}

/**
 * Get the appropriate model based on provider
 */
function getModel(provider: 'claude' | 'openai') {
  if (provider === 'claude') {
    return anthropic('claude-haiku-4-5-20251001');
  }
  return openai('gpt-5-nano-2025-08-07');
}

/**
 * Analyze a single image using AI
 * @param db - MongoDB database instance
 * @param itemId - ID of the projectData item to analyze
 * @returns Analysis result with description, tags, insights, and facets
 */
export async function analyzeImageItem(
  db: Db,
  itemId: string
): Promise<AnalysisResult> {
  const item = await db.collection('projectData').findOne({ _id: new ObjectId(itemId) });

  if (!item || item.type !== 'image' || !item.content?.base64) {
    throw new Error('Image not found or invalid');
  }

  const provider = getSelectedProvider();
  const model = getModel(provider);

  // Analyze with AI for structured output
  const result = await streamText({
    model,
    maxOutputTokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this image and return strict JSON with keys: description (string, concise), tags (string[] up to 10), insights (string[] up to 10), facets (object of string -> string|string[]).`
          },
          {
            type: 'image' as const,
            image: new URL(`data:${item.metadata?.mimeType || 'image/jpeg'};base64,${item.content.base64}`)
          }
        ]
      }
    ]
  });

  let full = '';
  const reader = result.toTextStreamResponse().body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value);
    }
  }

  // Try to parse JSON
  let parsed: AnalysisResult | null = null;
  try {
    parsed = JSON.parse(full.trim());
  } catch {
    // Fallback: wrap as description
    parsed = { description: full.trim(), tags: [], insights: [], facets: {} };
  }

  if (!parsed) {
    parsed = { description: '', tags: [], insights: [], facets: {} };
  }

  // Update the database
  await db.collection('projectData').updateOne(
    { _id: new ObjectId(itemId) },
    {
      $set: {
        'analysis.description': parsed.description || '',
        'analysis.tags': parsed.tags || [],
        'analysis.insights': parsed.insights || [],
        'analysis.facets': parsed.facets || {},
        updatedAt: new Date()
      }
    }
  );

  return parsed;
}

/**
 * Process a single item to generate embeddings
 * @param db - MongoDB database instance
 * @param itemId - ID of the projectData item to process
 * @returns Process result with success status
 */
export async function processItemEmbedding(
  db: Db,
  itemId: string
): Promise<ProcessResult> {
  try {
    const data = await db.collection('projectData').findOne({ _id: new ObjectId(itemId) });

    if (!data) {
      return { success: false, error: 'Data not found' };
    }

    const content = data?.content || {};
    if (!content.base64 && !content.text) {
      return { success: false, error: 'No content to embed' };
    }

    // Generate embedding
    const embedding = await generateMultimodalEmbedding({
      text: content.text,
      base64: content.base64,
    });

    // Update the document with the embedding
    await db.collection('projectData').updateOne(
      { _id: new ObjectId(itemId) },
      {
        $set: {
          embedding,
          processedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return {
      success: true,
      embeddingGenerated: !!(embedding && Array.isArray(embedding) && embedding.length > 0)
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Bulk analyze multiple images
 * @param db - MongoDB database instance
 * @param projectId - Project ID to filter items
 * @param itemIds - Array of item IDs to analyze
 * @returns Array of item IDs that were successfully queued for analysis
 */
export async function bulkAnalyzeImages(
  db: Db,
  projectId: string,
  itemIds: string[]
): Promise<string[]> {
  const objectIds = itemIds
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  const items = await db.collection('projectData')
    .find({ _id: { $in: objectIds }, projectId: new ObjectId(projectId), type: 'image' })
    .project({ _id: 1 })
    .toArray();

  return items.map(i => i._id.toString());
}

/**
 * Bulk process multiple items to generate embeddings
 * @param db - MongoDB database instance
 * @param projectId - Project ID to filter items
 * @param itemIds - Array of item IDs to process
 * @returns Array of results for each item
 */
export async function bulkProcessEmbeddings(
  db: Db,
  projectId: string,
  itemIds: string[]
): Promise<Array<{ id: string; success: boolean; error?: string }>> {
  const objectIds = itemIds
    .filter((id: string) => ObjectId.isValid(id))
    .map((id: string) => new ObjectId(id));

  const items = await db.collection('projectData')
    .find({ _id: { $in: objectIds }, projectId: new ObjectId(projectId) })
    .toArray();

  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const item of items) {
    const result = await processItemEmbedding(db, item._id.toString());
    results.push({
      id: item._id.toString(),
      success: result.success,
      error: result.error
    });
  }

  return results;
}

/**
 * Get content for a specific item (used for lazy loading)
 * @param db - MongoDB database instance
 * @param itemId - ID of the item
 * @returns Content object (text or base64)
 */
export async function getItemContent(
  db: Db,
  itemId: string
): Promise<any> {
  if (!ObjectId.isValid(itemId)) {
    throw new Error('Invalid ID format');
  }

  const item = await db.collection('projectData').findOne({
    _id: new ObjectId(itemId)
  });

  if (!item) {
    throw new Error('Item not found');
  }

  // Return the full item with all properties for the preview modal
  return {
    _id: item._id.toString(),
    projectId: item.projectId?.toString() || '',
    type: item.type,
    content: item.content,
    metadata: item.metadata,
    analysis: item.analysis,
    embedding: item.embedding,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}
