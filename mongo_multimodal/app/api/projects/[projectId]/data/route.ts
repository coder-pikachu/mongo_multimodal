import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const paramsFound = await params;
    const db = await getDb();
    const data = await db
      .collection('projectData')
      .find({ projectId: new ObjectId(paramsFound.projectId) })
      .project({
        _id: 1,
        projectId: 1,
        type: 1,
        content: 1,
        base64: 1,
        text: 1,
        metadata: 1,
        analysis: 1,
        description: 1,
        tags: 1,
        insights: 1,
        //embedding: 1,
        createdAt: 1,
        updatedAt: 1,
        processedAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Serialize MongoDB objects to plain objects
    const serializedData = data.map(item => ({
      ...item,
      _id: item._id.toString(),
      projectId: item.projectId.toString(),
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
      processedAt: item.processedAt?.toISOString()
    }));

    return NextResponse.json(serializedData);
  } catch (error) {
    console.error('Error fetching project data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
