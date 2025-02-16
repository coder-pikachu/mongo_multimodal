import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateMultimodalEmbedding } from '@/lib/voyageai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDb();
    const id = new ObjectId(params.id);

    // Get the project data
    const data = await db.collection('projectData').findOne({ _id: id });
    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    // Generate embedding
    const embedding = await generateMultimodalEmbedding(data.content);

    // Update the document with the embedding
    await db.collection('projectData').updateOne(
      { _id: id },
      {
        $set: {
          embedding,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process data' },
      { status: 500 }
    );
  }
}
