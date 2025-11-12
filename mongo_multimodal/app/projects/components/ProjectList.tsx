import Link from 'next/link';
import { Project } from '@/types/models';

async function getProjects(): Promise<Project[]> {
  // Use absolute URL for server components
  const baseUrl = process.env.VERCEL_URL
    ? `${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    console.log('Fetching projects...' + baseUrl);
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Required for server components to make renpquests
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
      <div className="text-center py-12">
        <p className="text-neutral-500 dark:text-neutral-400 text-lg">
          No projects found. Create your first project to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {projects.map((project, index) => (
        <Link
          key={project._id.toString()}
          href={`/projects/${project._id}`}
          className="group block animate-scale-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="h-full p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {project.name}
              </h3>
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <svg
                className="w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
