/**
 * Unified Vector Search Service
 * Consolidates all vector search operations with consistent configuration
 */

import { Db, ObjectId } from 'mongodb';
import { generateMultimodalEmbedding } from '../voyageai';
import { generateLLMResponse } from '../claude';

export interface VectorSearchConfig {
  limit: number;
  numCandidates: number;
  similarityThreshold: number;
  exact?: boolean;
}

export interface SearchResult {
  _id: ObjectId;
  type: 'image' | 'document';
  content?: { text?: string; base64?: string };
  metadata: { filename: string; mimeType: string; size: number };
  analysis: { description: string; tags: string[]; insights: string[] };
  createdAt: string;
  score: number;
}

export interface PaginatedSearchResult {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  timeTaken: number;
}

/**
 * Get optimal search configuration based on context
 */
function getSearchConfig(
  searchType: 'paginated' | 'analysis' | 'agent',
  isProjectSpecific: boolean = false
): VectorSearchConfig {
  switch (searchType) {
    case 'paginated':
      return {
        limit: 200, // Fetch more for pagination
        numCandidates: 800, // 4x limit for good recall
        similarityThreshold: 0.3,
        exact: false
      };
    case 'analysis':
      return {
        limit: isProjectSpecific ? 2 : 10,
        numCandidates: isProjectSpecific ? 150 : 300,
        similarityThreshold: 0.2,
        exact: false
      };
    case 'agent':
      return {
        limit: 2,
        numCandidates: 150,
        similarityThreshold: 0.6,
        exact: false
      };
  }
}

/**
 * Unified vector search function
 * Performs MongoDB Atlas vector search with configurable parameters
 */
export async function performVectorSearch(
  db: Db,
  query: string,
  queryType: 'text' | 'image',
  searchConfig: VectorSearchConfig,
  projectId?: string
): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateMultimodalEmbedding(
    {
      text: queryType === 'text' ? query : undefined,
      base64: queryType === 'image' ? query : undefined
    },
    'query'
  );

  // Build aggregation pipeline
  const pipeline: any[] = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        exact: searchConfig.exact || false,
        limit: searchConfig.limit,
        numCandidates: searchConfig.numCandidates,
        ...(projectId && {
          filter: { projectId: new ObjectId(projectId) }
        })
      }
    },
    {
      $project: {
        _id: 1,
        type: 1,
        content: 1,
        metadata: 1,
        analysis: 1,
        createdAt: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    },
    {
      $match: {
        score: { $gte: searchConfig.similarityThreshold }
      }
    },
    {
      $sort: {
        score: -1
      }
    }
  ];

  const results = await db.collection('projectData')
    .aggregate(pipeline)
    .toArray() as SearchResult[];

  return results;
}

/**
 * Paginated vector search with text boosting
 * Used for Search Mode in the UI
 */
export async function paginatedVectorSearch(
  db: Db,
  projectId: string,
  query: string,
  type: 'text' | 'image',
  page: number,
  limit: number
): Promise<PaginatedSearchResult> {
  const startTime = Date.now();
  const config = getSearchConfig('paginated');

  // Generate query embedding
  const queryEmbedding = await generateMultimodalEmbedding(
    { text: type === 'text' ? query : undefined, base64: type === 'image' ? query : undefined },
    'query'
  );

  // Tokenize query for text boosting
  const tokens = (query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3);

  const textBoostExpressions = tokens.map((t) => ({
    $cond: [
      { $regexMatch: { input: '$analysis.description', regex: t, options: 'i' } },
      0.05,
      0,
    ],
  }));

  const facetPipeline: any[] = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        filter: { projectId: new ObjectId(projectId) },
        limit: config.limit,
        numCandidates: config.numCandidates,
      },
    },
    {
      $project: {
        _id: 1,
        type: 1,
        content: 1,
        metadata: 1,
        analysis: 1,
        createdAt: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
    { $match: { score: { $gte: config.similarityThreshold } } },
    ...(tokens.length > 0
      ? [{
          $addFields: {
            textBoost: { $sum: textBoostExpressions },
            finalScore: { $add: ['$score', { $sum: textBoostExpressions }] },
          },
        }]
      : []),
    { $sort: tokens.length > 0 ? { finalScore: -1 } : { score: -1 } },
    {
      $facet: {
        paginated: [
          { $skip: Math.max(0, (page - 1) * limit) },
          { $limit: limit },
        ],
        total: [{ $count: 'total' }],
      },
    },
  ];

  const facetResult = await db.collection('projectData').aggregate(facetPipeline).toArray();
  const facet = facetResult[0] || { paginated: [], total: [] };
  const results: SearchResult[] = facet.paginated;
  const total = facet.total?.[0]?.total || 0;

  const endTime = Date.now();

  return {
    results: results.map(result => ({
      ...result,
      content: result.type === 'image' ? { base64: undefined } : { text: result.content?.text },
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    timeTaken: endTime - startTime,
  };
}

/**
 * Vector search with LLM analysis
 * Used for legacy search mode with AI synthesis
 */
export async function vectorSearchWithAnalysis(
  db: Db,
  query: string,
  queryType: 'text' | 'image',
  projectId?: string,
  provider?: 'claude' | 'openai'
): Promise<{ results: SearchResult[]; analysis: string }> {
  const config = getSearchConfig('analysis', !!projectId);
  const results = await performVectorSearch(db, query, queryType, config, projectId);

  // Fetch project context if available
  let projectContext = null;
  if (projectId) {
    try {
      const project = await db.collection('projects').findOne(
        { _id: new ObjectId(projectId) },
        { projection: { name: 1, description: 1 } }
      );
      if (project) {
        projectContext = {
          name: project.name,
          description: project.description
        };
      }
    } catch (error) {
      console.warn('Failed to fetch project context:', error);
    }
  }

  // Generate LLM analysis
  const selectedProvider = provider || (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';
  const searchResults = results.map(result => ({
    _id: result._id.toString(),
    type: result.type,
    content: result.content,
    metadata: result.metadata,
    analysis: result.analysis,
    createdAt: result.createdAt,
    score: result.score
  }));

  const llmResponse = await generateLLMResponse(selectedProvider, query, searchResults, projectContext);

  return { results, analysis: llmResponse };
}
