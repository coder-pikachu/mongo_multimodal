import { notFound } from 'next/navigation';
import ProjectPageClient from './components/ProjectPageClient';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ClientProject, ClientProjectData } from '@/types/clientTypes';

// Helper function to serialize ObjectId instances to strings
function serializeObjectIds(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  // If it's an ObjectId, convert to string
  if (obj instanceof ObjectId) {
    return obj.toString();
  }

  // If it's an array, recursively serialize each item
  if (Array.isArray(obj)) {
    return obj.map(serializeObjectIds);
  }

  // If it's an object, recursively serialize each property
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeObjectIds(obj[key]);
      }
    }
    return serialized;
  }

  // Return primitive values as-is
  return obj;
}

async function getProject(projectId: string): Promise<ClientProject | null> {
  try {
    const db = await getDb();
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
    });

    if (!project) {
      return null;
    }

    return {
      _id: project._id.toString(),
      name: project.name,
      description: project.description,
      userId: project.userId?.toString() || '',
      sampleQuestions: project.sampleQuestions || [],
      createdAt: project.createdAt?.toISOString(),
      updatedAt: project.updatedAt?.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

async function getProjectData(projectId: string): Promise<ClientProjectData[]> {
  try {
    const db = await getDb();

    // Get all data items without base64 content for images
    const data = await db.collection('projectData')
      .find({ projectId: new ObjectId(projectId) })
      .project({
        _id: 1,
        projectId: 1,
        type: 1,
        'content.text': 1, // Include text content for documents/chunks
        metadata: 1,
        analysis: 1,
        embedding: 1,
        createdAt: 1,
        updatedAt: 1,
        processedAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Process the data - for documents, we need to fetch full content
    // For images, we keep the content structure but with empty base64
    const processedData = await Promise.all(
      data.map(async (item: any) => {
        // For document/text/web types, fetch the full content
        if (item.type === 'document' || item.type === 'text_chunk' || item.type === 'web_chunk') {
          const fullItem = await db.collection('projectData')
            .findOne(
              { _id: item._id },
              { projection: { 'content.text': 1 } }
            );

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

    return processedData.map((item) => ({
      _id: item._id.toString(),
      projectId: item.projectId.toString(),
      type: item.type,
      content: item.content,
      metadata: serializeObjectIds(item.metadata),
      analysis: item.analysis,
      embedding: item.embedding,
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
      processedAt: item.processedAt?.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching project data:', error);
    return [];
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  const data = await getProjectData(projectId);

  return (
    <ProjectPageClient
      project={project}
      data={data}
      projectId={projectId}
    />
  );
}
