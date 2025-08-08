import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateMultimodalEmbedding } from '@/lib/voyageai';

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

    // Fetch items
    const objectIds = ids
      .filter((id: string) => ObjectId.isValid(id))
      .map((id: string) => new ObjectId(id));

    const items = await db.collection('projectData')
      .find({ _id: { $in: objectIds }, projectId: new ObjectId(projectId) })
      .toArray();

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of items) {
      try {
        const content = item?.content || {};
        if (!content.base64 && !content.text) {
          results.push({ id: item._id.toString(), success: false, error: 'No content to embed' });
          continue;
        }

        const embedding = await generateMultimodalEmbedding({
          text: (content as { text?: string }).text,
          base64: (content as { base64?: string }).base64,
        });

        await db.collection('projectData').updateOne(
          { _id: item._id },
          { $set: { embedding, processedAt: new Date(), updatedAt: new Date() } }
        );

        results.push({ id: item._id.toString(), success: true });
      } catch (e: any) {
        results.push({ id: item._id.toString(), success: false, error: e?.message || 'Embedding failed' });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Bulk process error:', error);
    return NextResponse.json({ error: 'Failed to process items' }, { status: 500 });
  }
}


