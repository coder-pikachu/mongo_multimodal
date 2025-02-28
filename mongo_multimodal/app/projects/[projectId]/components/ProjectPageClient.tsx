'use client';

import { ClientProject, ClientProjectData } from '@/types/clientTypes';
import UploadButton from './UploadButton';
import DataList from './DataList';
import ChatInterface from './ChatInterface';
import { Info } from 'lucide-react';

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

            {/* Project Info Card */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">About This Project</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    This project uses MongoDB&apos;s vector search capabilities to analyze and search across your documents and images.
                    Upload content using the button below, then use the Research Assistant to ask questions about your content.
                  </p>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="font-medium">Search capabilities:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Semantic search across text documents</li>
                      <li>Image content analysis and search</li>
                      <li>Multimodal queries combining text and images</li>
                      <li>Contextual understanding of complex topics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <UploadButton projectId={projectId} />
            <div className="text-sm text-gray-500">
              {data.length} {data.length === 1 ? 'item' : 'items'} in this project
            </div>
          </div>

          <DataList projectId={projectId} data={data} />
        </div>

        {/* Right Column (1/3 width) */}
        <div className="h-full py--16">
          <ChatInterface projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
