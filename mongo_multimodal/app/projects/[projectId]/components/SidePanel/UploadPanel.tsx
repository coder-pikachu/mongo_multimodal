'use client';

import { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface UploadPanelProps {
  projectId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function UploadPanel({ projectId, onUploadComplete }: UploadPanelProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // Start uploading immediately
    newFiles.forEach((uploadFile) => uploadFile_(uploadFile));
  };

  const uploadFile_ = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('files', uploadFile.file);

      const response = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'success' as const, progress: 100 } : f
        )
      );

      // Notify parent
      onUploadComplete?.();
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const pendingCount = files.filter((f) => f.status === 'uploading' || f.status === 'pending').length;
  const successCount = files.filter((f) => f.status === 'success').length;

  return (
    <div className="p-4 space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Images (JPEG, PNG) or PDFs (max 20MB)
        </p>

        <input
          id="file-input"
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <span className="text-gray-600 dark:text-gray-400">
                Uploading: {pendingCount}
              </span>
            )}
            {successCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                Completed: {successCount}
              </span>
            )}
          </div>
          {successCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear completed
            </button>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {files.map((uploadFile) => {
          const isImage = uploadFile.file.type.startsWith('image/');

          return (
            <div
              key={uploadFile.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-md
                       bg-white dark:bg-gray-800"
            >
              <div className="flex items-start gap-2">
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {isImage ? (
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(uploadFile.file.size / 1024)} KB
                      </p>
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(uploadFile.status)}
                    </div>
                  </div>

                  {/* Progress bar for uploading */}
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: '50%' }}  // Indeterminate progress
                      />
                    </div>
                  )}

                  {/* Error message */}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {uploadFile.error}
                    </p>
                  )}
                </div>

                {/* Remove button */}
                {(uploadFile.status === 'success' || uploadFile.status === 'error') && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                             rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {files.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No files uploaded yet
        </div>
      )}

      {/* Info */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> Files are automatically analyzed and processed after upload.
          Use the Agent to explore your uploaded data.
        </p>
      </div>
    </div>
  );
}
