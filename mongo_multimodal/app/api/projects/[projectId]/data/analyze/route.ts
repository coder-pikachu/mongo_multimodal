import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { bulkAnalyzeImages } from '@/lib/services/projectData.service';

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
    const validIds = await bulkAnalyzeImages(db, projectId, ids);

    return NextResponse.json({ ids: validIds });
  } catch (error) {
    console.error('Bulk analyze error:', error);
    return NextResponse.json({ error: 'Failed to start bulk analyze' }, { status: 500 });
  }
}


