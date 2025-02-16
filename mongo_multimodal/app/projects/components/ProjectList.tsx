import Link from 'next/link';
import { Project } from '@/types/models';

async function getProjects(): Promise<Project[]> {
  // Use absolute URL for server components
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Required for server components to make requests
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

export default async function ProjectList() {
  const projects = await getProjects();

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No projects found. Create your first project to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Link
          key={project._id.toString()}
          href={`/projects/${project._id}`}
          className="block p-6 rounded-lg border border-gray-500 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
          <p className="text-gray-600 mb-4">{project.description}</p>
          <div className="text-sm text-gray-500">
            Created {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </Link>
      ))}
    </div>
  );
}
