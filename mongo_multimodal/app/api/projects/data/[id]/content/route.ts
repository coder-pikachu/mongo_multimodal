import { getDb } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { getItemContent } from '@/lib/services/projectData.service';

/**
 * GET /api/projects/data/[id]/content
 * Fetch content data for a specific item (used for lazy loading image content)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await getItemContent(db, id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching item content:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch item content';
    const status = message === 'Invalid ID format' ? 400 : message === 'Item not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}