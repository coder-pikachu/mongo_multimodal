import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { processItemEmbedding } from '@/lib/services/projectData.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await processItemEmbedding(db, id);

    if (!result.success) {
      const status = result.error === 'Data not found' ? 404 : 500;
      return NextResponse.json(
        { error: result.error || 'Failed to process data' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      embeddingGenerated: result.embeddingGenerated
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
