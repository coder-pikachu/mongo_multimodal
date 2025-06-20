import { getDb } from '@/lib/mongodb';
import { doVectorSearchAndAnalyse } from '@/lib/utils';
import { NextResponse } from 'next/server';


export async function POST( request: Request )
{
  try
  {
    const db = await getDb();
    const { query, type = 'text' } = await request.json();

    if ( !query )
    {
      return NextResponse.json( { error: 'Query is required' }, { status: 400 } );
    }



    // Generate embedding for the search query
    const { results, analysis: claudeResponse } = await doVectorSearchAndAnalyse( type, query, db );

    return NextResponse.json( {
      results,
      analysis: claudeResponse
    } );
  } catch ( error )
  {
    console.error( 'Search error:', error );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
