import { Suspense } from 'react';
import ProjectList from './components/ProjectList';
import CreateProjectButton from './components/CreateProjectButton';

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <CreateProjectButton />
      </div>
      <Suspense fallback={<div>Loading projects...</div>}>
        <ProjectList />
      </Suspense>
    </div>
  );
}
