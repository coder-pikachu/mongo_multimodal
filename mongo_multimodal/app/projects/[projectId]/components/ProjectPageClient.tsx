'use client';

import { ClientProject, ClientProjectData } from '@/types/clientTypes';
import UploadButton from './UploadButton';
import DataList from './DataList';
import ChatInterface from './ChatInterface';

interface ProjectPageClientProps {
  project: ClientProject;
  data: ClientProjectData[];
  projectId: string;
}

export default function ProjectPageClient({ project, data, projectId }: ProjectPageClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-4rem)]">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-8 overflow-y-auto">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>

          <div className="flex justify-between items-center">
            <UploadButton projectId={projectId} />
          </div>

          <DataList projectId={projectId} data={data} />
        </div>

        {/* Right Column (1/3 width) */}
        <div className="h-full pb-24">
          <ChatInterface projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
