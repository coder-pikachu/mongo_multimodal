import { getDb } from '@/lib/mongodb';
import { doVectorSearchAndAnalyse, doPaginatedVectorSearch } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';

// Define error interface for better type safety
interface SearchError extends Error {
  message: string;
  status?: number;
  code?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
)
{
  try
  {
    const paramsFound = await params;
    const db = await getDb();
    const { query, type = 'text', mode = 'agent', page = 1, limit = 12, includeBase64 = false } = await request.json();

    if ( !query )
    {
      return NextResponse.json( { error: 'Query is required' }, { status: 400 } );
    }

    // "Search" mode for direct, paginated results
    if (mode === 'search') {
      const searchResults = await doPaginatedVectorSearch(db, paramsFound.projectId, query, type, page, limit);

      // Strip base64 from results if not requested (default behavior)
      if (!includeBase64 && searchResults.results) {
        searchResults.results = searchResults.results.map(result => ({
          ...result,
          content: result.content?.base64 ? { ...result.content, base64: undefined } : result.content
        }));
      }

      return NextResponse.json(searchResults);
    }

    // "Agent" mode for analysis and complex responses
    // Generate embedding for the search query and perform vector search
    try {
      const { results, analysis } = await doVectorSearchAndAnalyse( type, query, db, paramsFound );

      return NextResponse.json( {
        results,
        analysis
      } );
    } catch (searchError: unknown) {
      console.error('Vector search or analysis error:', searchError);

      const error = searchError as SearchError;

      // Check if this is a timeout from Claude API (usually manifests as a 429 or 504)
      if (error.message?.includes('timeout') ||
          error.message?.includes('429') ||
          error.message?.includes('504') ||
          error.message?.includes('rate limit')) {

        return NextResponse.json(
          {
            error: 'The analysis is taking longer than expected. Please try again.',
            errorType: 'timeout'
          },
          { status: 529 }
        );
      }

      // Handle other specific errors
      if (error.message?.includes('embedding')) {
        return NextResponse.json(
          {
            error: 'Failed to generate embeddings for your query. Please try a different query.',
            errorType: 'embedding'
          },
          { status: 500 }
        );
      }

      // Generic error
      return NextResponse.json(
        {
          error: 'Failed to perform search or analysis',
          errorType: 'general',
          message: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error( 'Search error:', error );
    const err = error as Error;
    return NextResponse.json(
      {
        error: 'Failed to process search request',
        message: err.message
      },
      { status: 500 }
    );
  }
}
