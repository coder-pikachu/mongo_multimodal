import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateMultimodalEmbedding } from '@/lib/voyageai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idString } = await params;
    const db = await getDb();
    const id = new ObjectId(idString);

    // Get the project data
    const data = await db.collection('projectData').findOne({ _id: id });
    if (!data) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    // Generate embedding - add console log to debug
    console.log(`Generating embedding for item ${id}`, {
      type: data.type,
      contentType: data.content ? (typeof data.content) : 'no content'
    });

    const embedding = await generateMultimodalEmbedding(data.content);

    console.log(`Embedding generated with length: ${embedding ? embedding.length : 'null or undefined'}`, {
      embeddingType: embedding ? typeof embedding : 'null or undefined',
      isArray: Array.isArray(embedding)
    });

    // Update the document with the embedding
    const updateResult = await db.collection('projectData').updateOne(
      { _id: id },
      {
        $set: {
          embedding,
          processedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`Update result for ${id}:`, {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount
    });

    return NextResponse.json({
      success: true,
      embeddingGenerated: !!embedding && Array.isArray(embedding) && embedding.length > 0
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
