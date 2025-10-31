import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { performVectorSearch } from '@/lib/services/vectorSearch.service';

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();

    const formData = await req.formData();
    const query = formData.get('query') as string;
    const imageFile = formData.get('image') as File;

    if (!query && !imageFile) {
      return NextResponse.json(
        { error: 'No query or image provided' },
        { status: 400 }
      );
    }

    let searchQuery: string;
    let searchType: 'text' | 'image';

    if (query) {
      searchQuery = query;
      searchType = 'text';
    } else {
      // Convert image to base64
      const buffer = await imageFile.arrayBuffer();
      searchQuery = Buffer.from(buffer).toString('base64');
      searchType = 'image';
    }

    // Global vector search (no project filter)
    const searchConfig = {
      limit: 12,
      numCandidates: 250,
      similarityThreshold: 0.6,
      exact: false
    };

    const results = await performVectorSearch(db, searchQuery, searchType, searchConfig);

    // Exclude base64 content from image results for performance
    const optimizedResults = results.map(result => ({
      ...result,
      _id: result._id.toString(),
      content: result.type === 'image' ? { text: null, base64: null } : result.content
    }));

    return NextResponse.json({ results: optimizedResults });
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    );
  }
}