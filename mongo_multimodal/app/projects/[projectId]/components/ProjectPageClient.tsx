'use client';

import { ClientProject, ClientProjectData } from '@/types/clientTypes';
import UploadButton from './UploadButton';
import DataList from './DataList';
import ChatInterface from './ChatInterface';
import { Info, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

interface ProjectPageClientProps {
  project: ClientProject;
  data: ClientProjectData[];
  projectId: string;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="bg-blue-50/50 border border-blue-200/50 rounded-lg p-4">
        <div className="space-y-4">
          <div className="h-4 bg-blue-100 rounded w-3/4" />
          <div className="h-4 bg-blue-100 rounded w-1/2" />
          <div className="h-4 bg-blue-100 rounded w-2/3" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="h-48 mb-4 bg-gray-200 rounded-lg" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectPageClient({ project, data, projectId }: ProjectPageClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-10rem)]">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-8 overflow-y-auto">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>

            {/* Sample Questions */}
            {project.sampleQuestions && project.sampleQuestions.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Try asking:</h3>
                <div className="space-y-2">
                  {project.sampleQuestions.map((question, index) => (
                    <div key={index} className="text-sm text-blue-700 italic">
                      "{question}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Info Card */}
            {/* <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">About This Project</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    This project uses MongoDB&apos;s vector search capabilities to analyze and search across your documents and images.
                    Upload content using the button below, then use the Research Assistant to ask questions about your content.
                  </p>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="font-medium">Supported file types:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Images: JPEG, JPG</li>
                      <li>Documents: PDF (up to 20MB) - automatically converted to images</li>
                    </ul>
                  </div>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="font-medium">Search capabilities:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Semantic search across text documents</li>
                      <li>Image content analysis and search</li>
                      <li>PDF document analysis (page by page)</li>
                      <li>Multimodal queries combining text and images</li>
                      <li>Contextual understanding of complex topics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div> */}
          </div>

          <div className="flex justify-between items-center">
            <UploadButton projectId={projectId} />
            <div className="text-sm text-gray-500">
              {data.length} {data.length === 1 ? 'item' : 'items'} in this project
            </div>
          </div>

          <Suspense fallback={<LoadingSkeleton />}>
            <DataList projectId={projectId} data={data} />
          </Suspense>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="h-full lg:col-span-2">
          <ChatInterface
            projectId={projectId}
            sampleQuestions={project.sampleQuestions || []}
          />
        </div>
      </div>
    </div>
  );
}
