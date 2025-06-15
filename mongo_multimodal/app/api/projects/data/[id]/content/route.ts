import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';

/**
 * GET /api/projects/data/[id]/content
 * Fetch content data for a specific item (used for lazy loading image content)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Find the item by ID
    const item = await db.collection('projectData').findOne({
      _id: new ObjectId(id)
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Return just the content portion of the item
    return NextResponse.json({
      content: item.content
    });
  } catch (error) {
    console.error('Error fetching item content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item content' },
      { status: 500 }
    );
  }
}