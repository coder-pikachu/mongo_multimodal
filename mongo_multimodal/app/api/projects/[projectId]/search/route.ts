

import { generateClaudeResponse } from '@/lib/claude';
import { getDb } from '@/lib/mongodb';
import { doVectorSearchAndAnalyse } from '@/lib/utils';
import { generateMultimodalEmbedding } from '@/lib/voyageai';
import { Db, ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; }; }
)
{
  try
  {
    const paramsFound = await params;
    const db = await getDb();
    const { query, type = 'text' } = await request.json();

    if ( !query )
    {
      return NextResponse.json( { error: 'Query is required' }, { status: 400 } );
    }

    // Generate embedding for the search query
    const { results, claudeResponse } = await doVectorSearchAndAnalyse( type, query, db, paramsFound );

    return NextResponse.json( {
      results,
      analysis: claudeResponse
    } );
  } catch ( error )
  {
    console.error( 'Search error:', error );
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}



