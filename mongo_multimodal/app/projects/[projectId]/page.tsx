import { notFound } from 'next/navigation';
import ProjectPageClient from './components/ProjectPageClient';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { ClientProject, ClientProjectData } from '@/types/clientTypes';

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
    // Use absolute URL for server components
    const baseUrl = process.env.VERCEL_URL
      ? `${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    console.log(`Fetching project data from ${baseUrl}/api/projects/${projectId}/data`);

    const response = await fetch(`${baseUrl}/api/projects/${projectId}/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Important: Don't cache this request to always get fresh data
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching project data:', error);
    return [];
  }
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = (await params).projectId;
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
