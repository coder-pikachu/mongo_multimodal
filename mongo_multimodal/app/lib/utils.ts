import { Db, ObjectId, Document } from 'mongodb';
import { generateLLMResponse } from './claude';
import { generateMultimodalEmbedding } from './voyageai';

// Define the interface for MongoDB result documents
interface SearchResultDocument extends Document {
  _id: ObjectId;
  type: 'image' | 'document';
  content: {
    text?: string;
    base64?: string;
  };
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
    [key: string]: unknown;
  };
  analysis: {
    description: string;
    tags: string[];
    insights: string[];
    [key: string]: unknown;
  };
  createdAt: string;
  score?: number;
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  // Parse the date if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use ISO format for consistency between server and client
  return dateObj.toISOString().split('T')[0];
}

export async function doPaginatedVectorSearch(
  db: Db,
  projectId: string,
  query: string,
  type: 'text' | 'image',
  page: number,
  limit: number
) {
  try {
    const startTime = Date.now();

    const queryEmbedding = await generateMultimodalEmbedding(
      { text: type === 'text' ? query : undefined, base64: type === 'image' ? query : undefined },
      'query'
    );

    const similarityThreshold = 0.3;
    const vectorFetchLimit = Math.max(200, page * limit + 50);

    // Basic tokenization of query for lightweight textual boosting
    const tokens = (query || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(t => t.length >= 3);

    // Prefer description and tags; ignore filenames for relevance
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
          limit: vectorFetchLimit,
          numCandidates: vectorFetchLimit * 4,
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
      { $match: { score: { $gte: similarityThreshold } } },
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
          total: [ { $count: 'total' } ],
        },
      },
    ];

    const facetResult = await db.collection('projectData').aggregate(facetPipeline).toArray();
    const facet = facetResult[0] || { paginated: [], total: [] };
    const results: Array<{
      _id: ObjectId;
      type: 'image' | 'document';
      content?: { text?: string; base64?: string };
      metadata: { filename: string; mimeType: string; size: number };
      analysis: { description: string; tags: string[]; insights: string[] };
      createdAt: string;
      score: number;
    }> = facet.paginated;
    const total = facet.total?.[0]?.total || 0;

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    return {
      results: results.map(result => ({
        _id: result._id,
        type: result.type,
        content: result.type === 'image' ? { base64: undefined } : { text: result.content?.text },
        metadata: result.metadata,
        analysis: result.analysis,
        createdAt: result.createdAt,
        score: result.score,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      timeTaken,
    };
  } catch (error) {
    console.error('Error performing paginated vector search:', error);
    throw error;
  }
}

export async function doVectorImageSearch(type: 'text' | 'image', query: string, db: Db) {
  try {
    console.log('Query:', query, type);

    const queryEmbedding = await generateMultimodalEmbedding(
      { text: type === 'text' ? query : undefined, base64: type === 'image' ? query : undefined },
      'query'
    );

    // Optimized for direct vector search with balanced performance/accuracy
    const searchConfig = {
      exact: false, // Use ANN for better performance with large datasets
      limit: 12,    // Slightly more results for better discovery
      numCandidates: 250, // ~20x limit for optimal recall (MongoDB 2024 best practice)
      similarityThreshold: 0.6 // Standard threshold for discovery
    };

    // Perform vector search using MongoDB Atlas
    const results = await db.collection('projectData')
      .aggregate([
        {
          $vectorSearch: {
            index: 'vector_index',
            "path": "embedding",
            "queryVector": queryEmbedding,
            "exact": searchConfig.exact,
            "limit": searchConfig.limit,
            "numCandidates": searchConfig.numCandidates,
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
      ])
      .toArray();

    console.log('Results:', results);
    return { results };
  } catch (error) {
    console.error('Error performing vector search:', error);
    throw error;
  }
}

export async function doVectorSearchAndAnalyse(
  type: 'text' | 'image',
  query: string,
  db: Db,
  paramsFound?: { projectId: string; },
  provider?: 'claude' | 'openai'
) {
  try {
    console.log('Query:', query);

    const queryEmbedding = await generateMultimodalEmbedding(
      { text: type === 'text' ? query : undefined, base64: type === 'image' ? query : undefined },
      'query'
    );

    // Optimize search parameters based on scope
    const isProjectSpecific = !!paramsFound?.projectId;
    const searchConfig = {
      // Global search: more results for comprehensive analysis
      // Project search: focused results for specific project context
      limit: isProjectSpecific ? 2 : 10,
      // numCandidates: 20-30x limit for optimal recall (MongoDB 2024 best practice)
      numCandidates: isProjectSpecific ? 150 : 300,
      // Slightly higher threshold for better quality
      similarityThreshold: 0.2
    };

    // Perform vector search using MongoDB Atlas
    const results = await db.collection('projectData')
      .aggregate([
        {
          $vectorSearch: {
            "exact": false,
            ...(paramsFound?.projectId ? {
              "filter": {
                projectId: new ObjectId(paramsFound.projectId)
              }
            } : {}),

            "limit": searchConfig.limit,
            "numCandidates": searchConfig.numCandidates,
            "path": "embedding",
            "queryVector": queryEmbedding,

            index: 'vector_index'
          }
        },
        // Filter for scores higher than 0.6
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
        }, {
          $match: {
            score: { $gte: searchConfig.similarityThreshold }
          }
        },
        {
          $sort: {
            score: -1
          }
        }
      ])
      .toArray() as SearchResultDocument[];

    console.log('Results:', results);

    // Fetch project context if this is a project-specific search
    let projectContext = null;
    if (paramsFound?.projectId) {
      try {
        const project = await db.collection('projects').findOne(
          { _id: new ObjectId(paramsFound.projectId) },
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

    // Generate a comprehensive response using the selected LLM
    const selectedProvider = provider || (process.env.LLM_FOR_ANALYSIS as 'claude' | 'openai') || 'claude';

    // Convert MongoDB Documents to proper SearchResult format
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

    // Merge LLM's analysis into each result
    const enrichedResults = results.map(result => ({
      ...result,
      analysis: {
        ...result.analysis,
        description: llmResponse || '',
        tags: result.analysis.tags || [],
        insights: result.analysis.insights || []
      }
    }));

    return { results: enrichedResults, analysis: llmResponse };
  } catch (error) {
    console.error('Error performing vector search and analysis:', error);
    throw error;
  }
}