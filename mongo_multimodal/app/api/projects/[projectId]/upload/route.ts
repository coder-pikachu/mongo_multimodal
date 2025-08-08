import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const db = await getDb();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    const projectData = {
      projectId: new ObjectId(projectId),
      type: file.type.startsWith('image/') ? 'image' : 'document',
      content: {
        base64: file.type.startsWith('image/') ? base64 : undefined,
        text: !file.type.startsWith('image/') ? await file.text() : undefined,
      },
      metadata: {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      },
      analysis: {
        description: '',
        tags: [],
        insights: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('projectData').insertOne(projectData);

    // TODO: Trigger background job for embedding generation and analysis

    return NextResponse.json({ id: result.insertedId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
