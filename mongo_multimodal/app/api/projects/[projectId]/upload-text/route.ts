import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { processAndUploadTextFile } from '@/lib/services/chunking.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = await getDb();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const validMimeTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'application/x-json',
    ];

    if (!validMimeTypes.includes(file.type) && !file.name.match(/\.(txt|csv|json)$/i)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Supported: .txt, .csv, .json',
        },
        { status: 400 }
      );
    }

    // Validate file size (20MB limit)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 400 }
      );
    }

    // Process and upload
    const result = await processAndUploadTextFile(
      db,
      projectId,
      file,
      sessionId || undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      chunkCount: result.totalChunks,
      dataIds: result.insertedIds.map((id) => id.toString()),
      memoriesCreated: result.memoriesCreated || 0,
      message: `Successfully uploaded ${result.totalChunks} chunks and created ${result.memoriesCreated || 0} memories`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
