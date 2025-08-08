import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    const objectIds = ids.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id));

    // For each id, call the per-item analyze route logic by updating analysis placeholder
    // Clients will trigger the per-item analyze route; here we just return the list for client-side iteration
    const items = await db.collection('projectData')
      .find({ _id: { $in: objectIds }, projectId: new ObjectId(projectId), type: 'image' })
      .project({ _id: 1 })
      .toArray();

    return NextResponse.json({ ids: items.map(i => i._id.toString()) });
  } catch (error) {
    console.error('Bulk analyze error:', error);
    return NextResponse.json({ error: 'Failed to start bulk analyze' }, { status: 500 });
  }
}


