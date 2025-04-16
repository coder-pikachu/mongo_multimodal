import { NextRequest, NextResponse } from 'next/server';
import { doVectorImageSearch } from '../../lib/utils';
import { getDb } from '@/lib/mongodb';



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

    const { results } = await doVectorImageSearch(searchType, searchQuery, db);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform vector search' },
      { status: 500 }
    );
  }
}