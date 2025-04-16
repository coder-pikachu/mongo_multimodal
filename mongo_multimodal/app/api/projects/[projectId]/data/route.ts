import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

// Define a minimal type for the database items
interface ProjectDataItem {
  _id: ObjectId;
  projectId: ObjectId;
  type: 'image' | 'document';
  content?: {
    text?: string;
    base64?: string;
  };
  metadata: any;
  analysis: any;
  embedding: number[];
  createdAt?: Date;
  updatedAt?: Date;
  processedAt?: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const paramsFound = await params;
    const db = await getDb();

    // First, get all data items without base64 content for images
    const data = await db
      .collection('projectData')
      .find({ projectId: new ObjectId(paramsFound.projectId) })
      .project({
        _id: 1,
        projectId: 1,
        type: 1,
        'content.text': 1, // Include text content for documents
        metadata: 1,
        analysis: 1,
        embedding: 1,
        createdAt: 1,
        updatedAt: 1,
        processedAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray() as ProjectDataItem[];

    // Process the data - for documents, we need to fetch full content
    // For images, we keep the content structure but with empty base64
    const processedData = await Promise.all(
      data.map(async (item) => {
        // For document type, fetch the full content
        if (item.type === 'document') {
          const fullItem = await db
            .collection('projectData')
            .findOne(
              { _id: item._id },
              { projection: { 'content.text': 1 } }
            ) as ProjectDataItem | null;

          return {
            ...item,
            content: fullItem?.content || { text: '' }
          };
        }

        // For images, initialize with empty content structure
        return {
          ...item,
          content: { base64: undefined }
        };
      })
    );

    // Serialize MongoDB objects to plain objects
    const serializedData = processedData.map(item => ({
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
