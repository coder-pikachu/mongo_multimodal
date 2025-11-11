import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { processItemEmbedding } from '@/lib/services/projectData.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await params; // params is provided but not directly used
    const db = await getDb();
    const body = await request.json();
    const { chunkIds } = body;

    if (!Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json(
        { error: 'chunkIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Process each chunk
    const results: Array<{
      chunkId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const chunkId of chunkIds) {
      const result = await processItemEmbedding(db, chunkId);
      results.push({
        chunkId,
        success: result.success,
        error: result.error,
      });
    }

    // Count successes
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      processedCount: chunkIds.length,
      successCount,
      failCount,
      results,
      message: `Processed ${successCount}/${chunkIds.length} chunks`,
    });
  } catch (error) {
    console.error('Process chunks error:', error);
    return NextResponse.json(
      { error: 'Failed to process chunks' },
      { status: 500 }
    );
  }
}
