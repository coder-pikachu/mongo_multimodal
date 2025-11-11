/**
 * Memory Service
 * Handles agent memory storage, retrieval, and management
 */

import { Db, ObjectId } from 'mongodb';
import { generateMultimodalEmbedding } from '../voyageai';
import {
  AgentMemory,
  MemoryType,
  StoreMemoryInput,
  RetrieveMemoriesInput,
  MemorySearchResult,
} from '@/types/agent.types';

/**
 * Store a new memory with embedding
 * Includes memory enrichment: merges with similar existing memories if score > 0.8
 */
export async function storeMemory(
  db: Db,
  input: StoreMemoryInput
): Promise<ObjectId | null> {
  try {
    // Generate embedding for the memory content
    const embedding = await generateMultimodalEmbedding({ text: input.content }, 'document');

    // Check for similar existing memories for enrichment
    const existingMemories = await db
      .collection('agentMemories')
      .aggregate([
        {
          $vectorSearch: {
            queryVector: embedding,
            path: 'embedding',
            numCandidates: 10,
            limit: 5,
            index: 'vector_index',
            filter: {
              projectId: new ObjectId(input.projectId),
              type: input.type,
              $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: { $gt: new Date() } },
              ],
            },
          },
        },
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ])
      .toArray();

    // If we found a highly similar memory (score > 0.8), enrich it instead of creating new
    if (existingMemories.length > 0 && existingMemories[0].score > 0.8) {
      const similarMemory = existingMemories[0] as AgentMemory & { score: number };

      // Enrich existing memory
      const enrichedContent = `${similarMemory.content} [ENRICHED: ${input.content}]`;
      const newConfidence = Math.min(
        (similarMemory.metadata.confidence + input.confidence!) / 2,
        0.95
      );

      const result = await db.collection('agentMemories').updateOne(
        { _id: similarMemory._id },
        {
          $set: {
            content: enrichedContent,
            'metadata.confidence': newConfidence,
            updatedAt: new Date(),
          },
          $addToSet: {
            tags: { $each: input.tags || [] },
            relatedMemories: similarMemory._id,
          },
          $inc: { 'metadata.accessCount': 0 },
        }
      );

      console.log('Memory enriched:', similarMemory._id);
      return similarMemory._id;
    }

    // No similar memory found, create new one
    const memory: AgentMemory = {
      projectId: new ObjectId(input.projectId),
      sessionId: input.sessionId,
      userId: input.userId,
      type: input.type,
      content: input.content,
      embedding,
      metadata: {
        source: input.source,
        confidence: input.confidence || 0.8,
        accessCount: 0,
        lastAccessed: new Date(),
      },
      relatedMemories: [],
      createdAt: new Date(),
      expiresAt: input.expiresAt,
      tags: input.tags || [],
    };

    const result = await db.collection('agentMemories').insertOne(memory);
    console.log('Memory stored:', result.insertedId);
    return result.insertedId;
  } catch (error) {
    console.error('Error storing memory:', error);
    return null;
  }
}

/**
 * Retrieve memories using semantic search
 */
export async function retrieveMemories(
  db: Db,
  input: RetrieveMemoriesInput
): Promise<MemorySearchResult[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateMultimodalEmbedding({ text: input.query }, 'query');

    const limit = input.limit || 5;
    const minConfidence = input.minConfidence || 0.5;

    // Build filter
    const filter: any = {
      projectId: new ObjectId(input.projectId),
    };

    if (input.type) {
      filter.type = input.type;
    }

    // Only return non-expired memories
    filter.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ];

    // Perform vector search
    const results = await db
      .collection('agentMemories')
      .aggregate([
        {
          $vectorSearch: {
            queryVector: queryEmbedding,
            path: 'embedding',
            numCandidates: limit * 10,
            limit: limit * 2,
            index: 'vector_index',
            filter,
          },
        },
        {
          $addFields: {
            score: { $meta: 'vectorSearchScore' },
          },
        },
        {
          $match: {
            score: { $gte: minConfidence },
            'metadata.confidence': { $gte: minConfidence },
          },
        },
        {
          $limit: limit,
        },
      ])
      .toArray();

    return results.map((doc) => ({
      memory: doc as AgentMemory,
      score: doc.score,
    }));
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return [];
  }
}

/**
 * Update memory access statistics
 */
export async function updateMemoryAccess(
  db: Db,
  memoryId: string
): Promise<boolean> {
  try {
    const result = await db.collection('agentMemories').updateOne(
      { _id: new ObjectId(memoryId) },
      {
        $inc: { 'metadata.accessCount': 1 },
        $set: { 'metadata.lastAccessed': new Date() },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating memory access:', error);
    return false;
  }
}

/**
 * Prune low-value memories
 * Removes memories with low confidence and low access count
 */
export async function pruneMemories(
  db: Db,
  projectId: string,
  options?: {
    minAccessCount?: number;
    minConfidence?: number;
    olderThanDays?: number;
  }
): Promise<number> {
  try {
    const minAccessCount = options?.minAccessCount || 1;
    const minConfidence = options?.minConfidence || 0.3;
    const olderThanDays = options?.olderThanDays || 90;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.collection('agentMemories').deleteMany({
      projectId: new ObjectId(projectId),
      createdAt: { $lt: cutoffDate },
      'metadata.accessCount': { $lt: minAccessCount },
      'metadata.confidence': { $lt: minConfidence },
    });

    console.log(`Pruned ${result.deletedCount} low-value memories`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error pruning memories:', error);
    return 0;
  }
}

/**
 * Get memory context string for agent prompts
 * Retrieves relevant memories and formats them for injection into system prompts
 */
export async function getMemoryContext(
  db: Db,
  projectId: string,
  sessionId: string,
  query?: string
): Promise<string> {
  try {
    let memories: MemorySearchResult[] = [];

    if (query) {
      // Semantic search if query provided
      memories = await retrieveMemories(db, {
        projectId,
        query,
        limit: 5,
        minConfidence: 0.6,
      });
    } else {
      // Get recent memories for this session
      const recentMemories = await db
        .collection('agentMemories')
        .find({
          projectId: new ObjectId(projectId),
          sessionId,
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      memories = recentMemories.map((m) => ({
        memory: m as AgentMemory,
        score: 1.0,
      }));
    }

    if (memories.length === 0) {
      return '';
    }

    // Format memories for context
    const contextParts = memories.map((m, idx) => {
      const mem = m.memory;
      return `${idx + 1}. [${mem.type.toUpperCase()}] ${mem.content} (confidence: ${mem.metadata.confidence.toFixed(2)}, accessed: ${mem.metadata.accessCount} times)`;
    });

    return `## Relevant Memories\n\nFrom past interactions:\n${contextParts.join('\n')}\n\nUse these memories to provide better context-aware responses.`;
  } catch (error) {
    console.error('Error getting memory context:', error);
    return '';
  }
}

/**
 * Link related memories
 */
export async function linkMemories(
  db: Db,
  memoryId: string,
  relatedMemoryIds: string[]
): Promise<boolean> {
  try {
    const relatedIds = relatedMemoryIds.map((id) => new ObjectId(id));

    const result = await db.collection('agentMemories').updateOne(
      { _id: new ObjectId(memoryId) },
      {
        $addToSet: { relatedMemories: { $each: relatedIds } },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error linking memories:', error);
    return false;
  }
}

/**
 * Get memories by type
 */
export async function getMemoriesByType(
  db: Db,
  projectId: string,
  type: MemoryType,
  limit: number = 10
): Promise<AgentMemory[]> {
  try {
    const memories = await db
      .collection('agentMemories')
      .find({
        projectId: new ObjectId(projectId),
        type,
      })
      .sort({ 'metadata.accessCount': -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return memories as AgentMemory[];
  } catch (error) {
    console.error('Error getting memories by type:', error);
    return [];
  }
}

/**
 * Extract and store memories from conversation
 * Analyzes conversation content and automatically extracts important information
 */
export async function extractMemoriesFromConversation(
  db: Db,
  projectId: string,
  sessionId: string,
  userQuery: string,
  agentResponse: string,
  toolResults?: any[]
): Promise<ObjectId[]> {
  try {
    const memoryIds: ObjectId[] = [];

    // Extract facts from tool results
    if (toolResults && toolResults.length > 0) {
      for (const toolResult of toolResults) {
        if (toolResult.tool === 'searchProjectData' && toolResult.output) {
          try {
            const output = JSON.parse(toolResult.output);
            if (output.results && output.results.length > 0) {
              const fact = `User searched for "${toolResult.input.query}" and found ${output.results.length} relevant results in the project data.`;
              const memoryId = await storeMemory(db, {
                projectId,
                sessionId,
                type: 'fact',
                content: fact,
                source: 'searchProjectData',
                confidence: 0.9,
                tags: ['search', 'data-access'],
              });
              if (memoryId) memoryIds.push(memoryId);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Store user query pattern as insight
    if (userQuery.length > 10 && userQuery.length < 500) {
      const memoryId = await storeMemory(db, {
        projectId,
        sessionId,
        type: 'pattern',
        content: `User asked: "${userQuery}"`,
        source: 'conversation',
        confidence: 0.7,
        tags: ['query-pattern'],
      });
      if (memoryId) memoryIds.push(memoryId);
    }

    console.log(`Extracted ${memoryIds.length} memories from conversation`);
    return memoryIds;
  } catch (error) {
    console.error('Error extracting memories from conversation:', error);
    return [];
  }
}

/**
 * Check if memory service is enabled
 */
export function isMemoryEnabled(): boolean {
  return process.env.AGENT_MEMORY_ENABLED !== 'false';
}

/**
 * Extract and store memories from individual chunk with enrichment
 * Checks for similar existing memories and merges if found
 */
export async function extractMemoriesFromChunk(
  db: Db,
  projectId: string,
  sessionId: string,
  chunkContent: string,
  metadata: any,
  userId?: string
): Promise<ObjectId[]> {
  try {
    const memoryIds: ObjectId[] = [];

    if (!chunkContent || chunkContent.length < 10) {
      return memoryIds;
    }

    // Extract key fact from chunk
    const factSnippet = chunkContent.substring(0, 300).trim();

    // Search for similar existing memories
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = await generateMultimodalEmbedding({ text: factSnippet }, 'query');
    } catch (error) {
      console.warn('Could not generate embedding for memory search:', error);
      // Continue without similarity search
    }

    if (queryEmbedding.length > 0) {
      // Search for similar memories
      const similarMemories = await db
        .collection('agentMemories')
        .aggregate([
          {
            $vectorSearch: {
              queryVector: queryEmbedding,
              path: 'embedding',
              numCandidates: 10,
              limit: 5,
              index: 'vector_index',
              filter: {
                projectId: new ObjectId(projectId),
                type: 'fact'
              }
            }
          },
          {
            $addFields: {
              score: { $meta: 'vectorSearchScore' }
            }
          },
          {
            $match: {
              score: { $gte: 0.8 }
            }
          }
        ])
        .toArray();

      // If similar memory found, enrich it instead of creating new
      if (similarMemories.length > 0) {
        const existingMemory = similarMemories[0] as any;
        const updatedContent = `${existingMemory.content}\n[Reinforced] ${factSnippet}`;

        // Increase confidence for reinforced facts
        const newConfidence = Math.min(
          0.95,
          (existingMemory.metadata.confidence || 0.8) + 0.05
        );

        await db.collection('agentMemories').updateOne(
          { _id: existingMemory._id },
          {
            $set: {
              content: updatedContent,
              'metadata.confidence': newConfidence,
              'metadata.lastAccessed': new Date(),
              updatedAt: new Date()
            },
            $inc: { 'metadata.accessCount': 1 }
          }
        );

        // Link as related memories
        await db.collection('agentMemories').updateOne(
          { _id: existingMemory._id },
          {
            $addToSet: { relatedMemories: new ObjectId(sessionId) }
          }
        );

        memoryIds.push(existingMemory._id);
        return memoryIds;
      }
    }

    // No similar memory found, create new one
    const newMemory = await storeMemory(db, {
      projectId,
      sessionId,
      userId,
      type: 'fact',
      content: factSnippet,
      source: metadata?.sourceType || 'chunk-extraction',
      confidence: 0.85,
      tags: [
        'chunk-extracted',
        'auto-enriched',
        metadata?.chunkType || 'text'
      ],
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });

    if (newMemory) {
      memoryIds.push(newMemory);
    }

    return memoryIds;
  } catch (error) {
    console.error('Error in extractMemoriesFromChunk:', error);
    return [];
  }
}

