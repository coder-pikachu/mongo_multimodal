/**
 * Memory Agent
 * Specialized agent for memory management and context retrieval
 */

import { Agent } from './base.agent';
import { AgentInput, AgentOutput } from '@/types/agent.types';
import {
  storeMemory,
  retrieveMemories,
  getMemoryContext,
  getMemoriesByType,
  linkMemories,
} from '@/lib/services/memory.service';
import { MemoryType } from '@/types/agent.types';

export class MemoryAgent extends Agent {
  constructor() {
    super('memory');
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log('Executing memory task', { task: input.task });
    this.status = 'executing';

    try {
      const task = input.task.toLowerCase();

      if (task.includes('store') || task.includes('save') || task.includes('remember')) {
        return await this.storeMemoryTask(input);
      } else if (task.includes('retrieve') || task.includes('recall') || task.includes('search')) {
        return await this.retrieveMemoryTask(input);
      } else if (task.includes('context') || task.includes('summary')) {
        return await this.getContextTask(input);
      } else if (task.includes('link') || task.includes('relate')) {
        return await this.linkMemoriesTask(input);
      } else {
        // Default: retrieve memories
        return await this.retrieveMemoryTask(input);
      }
    } catch (error) {
      this.log('Memory error', error);
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Memory operation failed'
      );
    }
  }

  /**
   * Store a new memory
   */
  private async storeMemoryTask(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const content = input.data?.content;
    const type = input.data?.type as MemoryType || 'fact';
    const tags = input.data?.tags || [];
    const confidence = input.data?.confidence || 0.8;

    if (!content) {
      return this.createErrorOutput('No content provided for memory storage');
    }

    this.log('Storing memory', { type, content: content.substring(0, 50) });

    try {
      const memoryId = await storeMemory(db, {
        projectId: context.projectId,
        sessionId: context.sessionId,
        type,
        content,
        source: 'memory-agent',
        confidence,
        tags,
      });

      if (!memoryId) {
        return this.createErrorOutput('Failed to store memory');
      }

      return this.createSuccessOutput({
        success: true,
        memoryId: memoryId.toString(),
        type,
        message: 'Memory stored successfully',
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Memory storage failed'
      );
    }
  }

  /**
   * Retrieve memories based on query
   */
  private async retrieveMemoryTask(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const query = input.data?.query || input.task;
    const limit = input.data?.limit || 5;
    const type = input.data?.type as MemoryType | undefined;
    const minConfidence = input.data?.minConfidence || 0.6;

    this.log('Retrieving memories', { query: query.substring(0, 50), limit, type });

    try {
      const memories = await retrieveMemories(db, {
        projectId: context.projectId,
        query,
        limit,
        type,
        minConfidence,
      });

      const formattedMemories = memories.map(m => ({
        id: m.memory._id?.toString(),
        content: m.memory.content,
        type: m.memory.type,
        confidence: m.memory.metadata.confidence,
        score: m.score,
        tags: m.memory.tags,
        source: m.memory.metadata.source,
        accessCount: m.memory.metadata.accessCount,
        createdAt: m.memory.createdAt,
      }));

      return this.createSuccessOutput({
        found: memories.length,
        memories: formattedMemories,
        query,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Memory retrieval failed'
      );
    }
  }

  /**
   * Get memory context for prompt injection
   */
  private async getContextTask(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const query = input.data?.query;

    this.log('Getting memory context', { query: query?.substring(0, 50) });

    try {
      const memoryContext = await getMemoryContext(
        db,
        context.projectId,
        context.sessionId,
        query
      );

      return this.createSuccessOutput({
        context: memoryContext,
        hasMemories: memoryContext.length > 0,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Failed to get memory context'
      );
    }
  }

  /**
   * Link related memories
   */
  private async linkMemoriesTask(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();

    const memoryId = input.data?.memoryId;
    const relatedIds = input.data?.relatedIds || [];

    if (!memoryId || relatedIds.length === 0) {
      return this.createErrorOutput('memoryId and relatedIds required for linking');
    }

    this.log('Linking memories', { memoryId, relatedCount: relatedIds.length });

    try {
      const success = await linkMemories(db, memoryId, relatedIds);

      if (!success) {
        return this.createErrorOutput('Failed to link memories');
      }

      return this.createSuccessOutput({
        success: true,
        message: `Linked ${relatedIds.length} related memories`,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Memory linking failed'
      );
    }
  }

  /**
   * Get memories by type
   */
  async getMemoriesByTypeTask(memoryType: MemoryType, limit: number = 10): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    this.log('Getting memories by type', { type: memoryType, limit });

    try {
      const memories = await getMemoriesByType(db, context.projectId, memoryType, limit);

      return this.createSuccessOutput({
        type: memoryType,
        found: memories.length,
        memories: memories.map(m => ({
          id: m._id?.toString(),
          content: m.content,
          confidence: m.metadata.confidence,
          accessCount: m.metadata.accessCount,
          tags: m.tags,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Failed to get memories by type'
      );
    }
  }

  /**
   * Analyze memory patterns
   */
  async analyzeMemoryPatterns(): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    this.log('Analyzing memory patterns');

    try {
      // Get all memory types
      const facts = await getMemoriesByType(db, context.projectId, 'fact', 50);
      const preferences = await getMemoriesByType(db, context.projectId, 'preference', 50);
      const patterns = await getMemoriesByType(db, context.projectId, 'pattern', 50);
      const insights = await getMemoriesByType(db, context.projectId, 'insight', 50);

      // Analyze patterns
      const analysis = {
        totalMemories: facts.length + preferences.length + patterns.length + insights.length,
        byType: {
          facts: facts.length,
          preferences: preferences.length,
          patterns: patterns.length,
          insights: insights.length,
        },
        mostAccessed: this.getMostAccessedMemories([...facts, ...preferences, ...patterns, ...insights]),
        commonTags: this.getCommonTags([...facts, ...preferences, ...patterns, ...insights]),
      };

      return this.createSuccessOutput(analysis);
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Failed to analyze memory patterns'
      );
    }
  }

  /**
   * Get most accessed memories
   */
  private getMostAccessedMemories(memories: any[]): any[] {
    return memories
      .sort((a, b) => b.metadata.accessCount - a.metadata.accessCount)
      .slice(0, 5)
      .map(m => ({
        content: m.content.substring(0, 100),
        accessCount: m.metadata.accessCount,
        type: m.type,
      }));
  }

  /**
   * Get common tags across memories
   */
  private getCommonTags(memories: any[]): { tag: string; count: number }[] {
    const tagCounts = new Map<string, number>();

    memories.forEach(m => {
      m.tags.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

