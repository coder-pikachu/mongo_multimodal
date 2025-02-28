import { Project, ProjectData } from '@/types/models';
import { ClientProject, ClientProjectData } from '@/types/clientTypes';
import ProjectPageClient from './components/ProjectPageClient';

async function getProject(projectId: string): Promise<Project | null> {
  const baseUrl = process.env.VERCEL_URL
    ? `http://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.error('Error fetching project:', response.statusText);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

async function getProjectData(projectId: string): Promise<ProjectData[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `http://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Error fetching project data:', response.statusText);
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching project data:', error);
    return [];
  }
}

export default async function ProjectPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const [project, data] = await Promise.all([
    getProject(projectId),
    getProjectData(projectId)
  ]);

  if (!project) {
    return <div>Project not found</div>;
  }

  // Convert server types to client types
  const clientProject: ClientProject = {
    ...project,
    _id: project._id.toString(),
    userId: project.userId?.toString() || ''
  };

  const clientData: ClientProjectData[] = data.map(item => ({
    ...item,
    _id: item._id.toString(),
    projectId: item.projectId?.toString() || ''
  }));

  return <ProjectPageClient project={clientProject} data={clientData} projectId={projectId} />;
}
