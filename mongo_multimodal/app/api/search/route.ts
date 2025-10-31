import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { performVectorSearch } from '@/lib/services/vectorSearch.service';
import { ObjectId } from 'mongodb';

/**
 * Global search endpoint
 * Searches across all projects and enriches results with project information
 */
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Perform global vector search (no project filter)
    const searchConfig = {
      limit: 12,
      numCandidates: 250,
      similarityThreshold: 0.6,
      exact: false
    };

    const results = await performVectorSearch(db, query.trim(), 'text', searchConfig);

    // Enrich results with project information
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        try {
          // Get the full projectData document to find projectId
          const projectData = await db.collection('projectData').findOne(
            { _id: result._id },
            { projection: { projectId: 1 } }
          );

          let projectId = '';
          let projectName = 'Unknown Project';

          if (projectData?.projectId) {
            projectId = projectData.projectId.toString();

            // Fetch project name
            const project = await db.collection('projects').findOne(
              { _id: new ObjectId(projectData.projectId) },
              { projection: { name: 1 } }
            );

            if (project?.name) {
              projectName = project.name;
            }
          }

          // Return enriched result with project info (exclude base64 for performance)
          return {
            _id: result._id.toString(),
            projectId,
            projectName,
            type: result.type,
            content: result.type === 'image' ? { text: null, base64: null } : result.content,
            metadata: result.metadata,
            analysis: result.analysis,
            createdAt: result.createdAt,
            score: result.score
          };
        } catch (err) {
          console.error('Error enriching result:', err);
          // Return result with default project info if enrichment fails (exclude base64 for performance)
          return {
            _id: result._id.toString(),
            projectId: '',
            projectName: 'Unknown Project',
            type: result.type,
            content: result.type === 'image' ? { text: null, base64: null } : result.content,
            metadata: result.metadata,
            analysis: result.analysis,
            createdAt: result.createdAt,
            score: result.score
          };
        }
      })
    );

    return NextResponse.json({ results: enrichedResults });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
