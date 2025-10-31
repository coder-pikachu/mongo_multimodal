import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { bulkProcessEmbeddings } from '@/lib/services/projectData.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    const db = await getDb();
    const results = await bulkProcessEmbeddings(db, projectId, ids);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Bulk process error:', error);
    return NextResponse.json({ error: 'Failed to process items' }, { status: 500 });
  }
}


