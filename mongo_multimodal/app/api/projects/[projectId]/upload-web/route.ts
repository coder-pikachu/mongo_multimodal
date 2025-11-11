import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { processAndUploadWebContent } from '@/lib/services/chunking.service';
import { normalizeURL, validateURL } from '@/lib/web-scraper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = await getDb();

    // Parse JSON body
    const body = await request.json();
    const { url, sessionId } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    const normalizedUrl = normalizeURL(url);
    if (!validateURL(normalizedUrl)) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Process and upload
    const result = await processAndUploadWebContent(
      db,
      projectId,
      normalizedUrl,
      sessionId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to scrape website' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: normalizedUrl,
      chunkCount: result.totalChunks,
      dataIds: result.insertedIds.map((id) => id.toString()),
      memoriesCreated: result.memoriesCreated || 0,
      message: `Successfully scraped and uploaded ${result.totalChunks} chunks and created ${result.memoriesCreated || 0} memories`,
    });
  } catch (error) {
    console.error('Web upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process web content' },
      { status: 500 }
    );
  }
}
