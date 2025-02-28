'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadButton({ projectId }: { projectId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed for ${file.name}`);
      }

      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 100
      }));

    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: -1 // -1 indicates error
      }));
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      
      // Initialize progress for each file
      const initialProgress = files.reduce((acc, file) => ({
        ...acc,
        [file.name]: 0
      }), {});
      setUploadProgress(initialProgress);

      // Upload files sequentially
      for (const file of files) {
        await uploadFile(file);
      }

      router.refresh();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getOverallProgress = () => {
    const values = Object.values(uploadProgress);
    if (values.length === 0) return 0;
    const total = values.reduce((sum, value) => sum + (value >= 0 ? value : 0), 0);
    return Math.round(total / values.length);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleUpload}
        className="hidden"
        accept="image/jpeg,image/jpg"
        multiple
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isUploading ? `Uploading (${getOverallProgress()}%)` : 'Upload Files'}
      </button>

      {/* Progress indicators */}
      {Object.entries(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="text-sm">
              <div className="flex justify-between mb-1">
                <span className="truncate">{filename}</span>
                <span>{progress === -1 ? 'Error' : `${progress}%`}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${progress === -1 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress === -1 ? 100 : progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
