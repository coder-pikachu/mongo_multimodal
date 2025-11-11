/**
 * Search Agent
 * Specialized agent for information retrieval and search operations
 */

import { Agent } from './base.agent';
import { AgentInput, AgentOutput } from '@/types/agent.types';
import { doPaginatedVectorSearch } from '@/lib/utils';
import { searchWeb, isPerplexityEnabled } from '@/lib/services/perplexity.service';
import { ObjectId } from 'mongodb';

export class SearchAgent extends Agent {
  constructor() {
    super('search');
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    this.log('Executing search task', { task: input.task });
    this.status = 'executing';

    try {
      const db = this.getDb();
      const context = this.getContext();

      // Parse the task to determine search type
      const task = input.task.toLowerCase();

      if (task.includes('web') || task.includes('external') || task.includes('internet')) {
        // Web search
        return await this.performWebSearch(input);
      } else if (task.includes('similar') || task.includes('related')) {
        // Similar items search
        return await this.findSimilarItems(input);
      } else {
        // Default: project data search
        return await this.searchProjectData(input);
      }
    } catch (error) {
      this.log('Search error', error);
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Search failed'
      );
    }
  }

  /**
   * Search within project data
   */
  private async searchProjectData(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    // Extract query from task or data
    const query = input.data?.query || input.task;
    const maxResults = input.data?.maxResults || 10;

    this.log('Searching project data', { query, maxResults });

    try {
      const results = await doPaginatedVectorSearch(
        db,
        context.projectId,
        query,
        'text',
        1,
        maxResults
      );

      if (!results.results || results.results.length === 0) {
        return this.createSuccessOutput({
          found: 0,
          results: [],
          message: 'No results found for the query',
        });
      }

      // Format results
      const formattedResults = results.results.map((r: any) => ({
        id: r._id.toString(),
        filename: r.metadata?.filename || 'Unknown',
        type: r.type,
        score: r.score,
        description: r.analysis?.description || 'No description',
        tags: r.analysis?.tags || [],
      }));

      return this.createSuccessOutput({
        found: results.total,
        showing: formattedResults.length,
        results: formattedResults,
        query,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Project search failed'
      );
    }
  }

  /**
   * Find similar items based on a reference item
   */
  private async findSimilarItems(input: AgentInput): Promise<AgentOutput> {
    const db = this.getDb();
    const context = this.getContext();

    const dataId = input.data?.dataId || input.data?.referenceId;
    const maxResults = input.data?.maxResults || 5;

    if (!dataId) {
      return this.createErrorOutput('No reference dataId provided for similarity search');
    }

    this.log('Finding similar items', { dataId, maxResults });

    try {
      // Get the reference item's embedding
      const item = await db.collection('projectData').findOne(
        { _id: new ObjectId(dataId) },
        { projection: { embedding: 1, metadata: 1 } }
      );

      if (!item || !item.embedding) {
        return this.createErrorOutput('Reference item not found or has no embedding');
      }

      // Search using the item's embedding
      const results = await db.collection('projectData')
        .aggregate([
          {
            $vectorSearch: {
              queryVector: item.embedding,
              path: 'embedding',
              numCandidates: maxResults * 5,
              limit: maxResults + 1,
              index: 'vector_index',
              filter: { projectId: new ObjectId(context.projectId) },
            },
          },
          {
            $match: {
              _id: { $ne: new ObjectId(dataId) }, // Exclude reference item
            },
          },
          {
            $project: {
              _id: 1,
              type: 1,
              metadata: 1,
              analysis: 1,
              score: { $meta: 'vectorSearchScore' },
            },
          },
        ])
        .toArray();

      const formattedResults = results.map((r) => ({
        id: r._id.toString(),
        filename: r.metadata?.filename || 'Unknown',
        type: r.type,
        score: r.score,
        description: r.analysis?.description || 'No description',
        tags: r.analysis?.tags || [],
      }));

      return this.createSuccessOutput({
        referenceItem: item.metadata?.filename || dataId,
        found: formattedResults.length,
        results: formattedResults,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Similarity search failed'
      );
    }
  }

  /**
   * Perform web search using Perplexity
   */
  private async performWebSearch(input: AgentInput): Promise<AgentOutput> {
    if (!isPerplexityEnabled()) {
      return this.createErrorOutput('Web search is not enabled');
    }

    const query = input.data?.query || input.task;

    this.log('Performing web search', { query });

    try {
      const result = await searchWeb(query);

      return this.createSuccessOutput({
        answer: result.answer,
        citations: result.citations,
        source: 'web',
        query,
      });
    } catch (error) {
      return this.createErrorOutput(
        error instanceof Error ? error.message : 'Web search failed'
      );
    }
  }

  /**
   * Optimize search query
   */
  private optimizeQuery(query: string): string {
    // Simple query optimization - can be enhanced with NLP
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
}

