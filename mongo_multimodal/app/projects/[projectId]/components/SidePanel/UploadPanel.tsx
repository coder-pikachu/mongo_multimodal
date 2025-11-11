'use client';

import { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle, Globe, Tabs } from 'lucide-react';

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
  chunkCount?: number;
  memoriesCreated?: number;
}

interface WebUpload {
  id: string;
  url: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  chunkCount?: number;
  memoriesCreated?: number;
}

export function UploadPanel({ projectId, onUploadComplete }: UploadPanelProps) {
  const [tab, setTab] = useState<'files' | 'web'>('files');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [webUploads, setWebUploads] = useState<WebUpload[]>([]);
  const [webUrl, setWebUrl] = useState('');
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

  const isTextFile = (file: File): boolean => {
    const textExtensions = /\.(txt|csv|json)$/i;
    const textMimeTypes = ['text/plain', 'text/csv', 'application/json', 'text/x-csv', 'application/vnd.ms-excel'];
    return textExtensions.test(file.name) || textMimeTypes.includes(file.type);
  };

  const isPDFFile = (file: File): boolean => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  };

  const processPDFFile = async (uploadFile: UploadFile) => {
    try {
      // Dynamic import to avoid SSR issues
      const { validatePDFFile, extractPDFData, convertPDFToImages } = await import('@/lib/pdf-to-image');

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 10 } : f
        )
      );

      // Validate PDF file
      validatePDFFile(uploadFile.file);

      // Extract PDF data
      const pdfData = await extractPDFData(uploadFile.file);

      // Convert PDF to images
      const images = await convertPDFToImages(pdfData, {
        imageFormat: 'jpeg',
        jpegQuality: 0.85,
        maxSizeBytes: 2 * 1024 * 1024 // 2MB per image
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, progress: 30 } : f
        )
      );

      // Upload each page as a separate image
      const totalPages = images.length;
      for (let i = 0; i < images.length; i++) {
        // Convert data URL to blob
        const response = await fetch(images[i].dataUrl);
        const blob = await response.blob();

        // Create a file from the blob
        const pageFile = new File([blob], `${uploadFile.file.name.replace('.pdf', '')}_page_${i + 1}.jpg`, {
          type: 'image/jpeg'
        });

        // Upload the page
        const formData = new FormData();
        formData.append('file', pageFile);

        const uploadResponse = await fetch(`/api/projects/${projectId}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload page ${i + 1}`);
        }

        // Update progress
        const progress = 30 + ((i + 1) / totalPages) * 70;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: Math.round(progress) } : f
          )
        );
      }

      // Success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'success' as const,
                progress: 100,
              }
            : f
        )
      );

      onUploadComplete?.();
    } catch (error) {
      console.error('PDF processing error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'PDF processing failed',
              }
            : f
        )
      );
    }
  };

  const uploadFile_ = async (uploadFile: UploadFile) => {
    // Handle PDF files separately (convert to images on client side)
    if (isPDFFile(uploadFile.file)) {
      await processPDFFile(uploadFile);
      return;
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', uploadFile.file);

      // Determine endpoint based on file type
      const endpoint = isTextFile(uploadFile.file)
        ? `/api/projects/${projectId}/upload-text`
        : `/api/projects/${projectId}/upload`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      // Success - show chunk count and memories created for text files
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'success' as const,
                progress: 100,
                chunkCount: data.chunkCount,
                memoriesCreated: data.memoriesCreated
              }
            : f
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

  const uploadWebLink = async () => {
    if (!webUrl.trim()) return;

    const id = `web-${Date.now()}-${Math.random()}`;
    const webUpload: WebUpload = {
      id,
      url: webUrl,
      status: 'uploading'
    };

    setWebUploads((prev) => [...prev, webUpload]);

    try {
      const response = await fetch(`/api/projects/${projectId}/upload-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webUrl })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scrape website');
      }

      const data = await response.json();

      setWebUploads((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                status: 'success' as const,
                chunkCount: data.chunkCount,
                memoriesCreated: data.memoriesCreated
              }
            : w
        )
      );

      setWebUrl('');
      onUploadComplete?.();
    } catch (error) {
      setWebUploads((prev) =>
        prev.map((w) =>
          w.id === id
            ? {
                ...w,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : w
        )
      );
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeWebUpload = (id: string) => {
    setWebUploads((prev) => prev.filter((w) => w.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
    setWebUploads((prev) => prev.filter((w) => w.status !== 'success'));
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
        return <Loader2 className="w-4 h-4 animate-spin text-[#00ED64]" />;
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
  const webPendingCount = webUploads.filter((w) => w.status === 'uploading' || w.status === 'pending').length;
  const webSuccessCount = webUploads.filter((w) => w.status === 'success').length;

  return (
    <div className="p-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('files')}
          className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'files'
              ? 'border-[#00ED64] text-[#00ED64]'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Files
          </div>
        </button>
        <button
          onClick={() => setTab('web')}
          className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'web'
              ? 'border-[#00ED64] text-[#00ED64]'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Web Links
          </div>
        </button>
      </div>

      {/* Files Tab */}
      {tab === 'files' && (
        <>
          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
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
              Images (JPEG, PNG), PDFs, Text (.txt, .csv, .json) - max 20MB
            </p>

            <input
              id="file-input"
              type="file"
              multiple
              accept="image/jpeg,image/png,application/pdf,.txt,.csv,.json,text/plain,text/csv,application/json"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        </>
      )}

      {/* Web Tab */}
      {tab === 'web' && (
        <>
          {/* Web Link Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Website URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         placeholder-gray-500 dark:placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') uploadWebLink();
                }}
              />
              <button
                onClick={uploadWebLink}
                disabled={!webUrl.trim() || webPendingCount > 0}
                className="px-4 py-2 bg-[#00ED64] text-gray-900 rounded-lg hover:bg-[#13AA52]
                         disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {webPendingCount > 0 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scrape'}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter a website URL to scrape and analyze its content
            </p>
          </div>
        </>
      )}

      {/* Stats */}
      {(files.length > 0 || webUploads.length > 0) && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {tab === 'files' && pendingCount > 0 && (
              <span className="text-gray-600 dark:text-gray-400">
                Uploading: {pendingCount}
              </span>
            )}
            {tab === 'files' && successCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                Completed: {successCount}
              </span>
            )}
            {tab === 'web' && webPendingCount > 0 && (
              <span className="text-gray-600 dark:text-gray-400">
                Scraping: {webPendingCount}
              </span>
            )}
            {tab === 'web' && webSuccessCount > 0 && (
              <span className="text-green-600 dark:text-green-400">
                Completed: {webSuccessCount}
              </span>
            )}
          </div>
          {(successCount > 0 || webSuccessCount > 0) && (
            <button
              onClick={clearCompleted}
              className="text-[#13AA52] dark:text-[#00ED64] hover:underline"
            >
              Clear completed
            </button>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
        {tab === 'files' && files.map((uploadFile) => {
          const isImage = uploadFile.file.type.startsWith('image/');
          const isText = isTextFile(uploadFile.file);

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
                      {uploadFile.chunkCount !== undefined && (
                        <p className="text-xs text-[#13AA52] dark:text-[#00ED64] mt-0.5">
                          {uploadFile.chunkCount} chunk{uploadFile.chunkCount !== 1 ? 's' : ''}
                          {uploadFile.memoriesCreated !== undefined && ` • ${uploadFile.memoriesCreated} memories`}
                        </p>
                      )}
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
                        className="bg-[#00ED64] h-1.5 rounded-full transition-all duration-300"
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
        {tab === 'web' && webUploads.map((webUpload) => (
          <div
            key={webUpload.id}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-md
                     bg-white dark:bg-gray-800"
          >
            <div className="flex items-start gap-2">
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                <Globe className="w-4 h-4 text-gray-500" />
              </div>

              {/* URL Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {webUpload.url}
                    </p>
                    {webUpload.chunkCount !== undefined && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {webUpload.chunkCount} chunk{webUpload.chunkCount !== 1 ? 's' : ''}
                        {webUpload.memoriesCreated !== undefined && ` • ${webUpload.memoriesCreated} memories`}
                      </p>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {webUpload.status === 'uploading' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : webUpload.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Progress bar for scraping */}
                {webUpload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: '50%' }}  // Indeterminate progress
                    />
                  </div>
                )}

                {/* Error message */}
                {webUpload.status === 'error' && webUpload.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {webUpload.error}
                  </p>
                )}
              </div>

              {/* Remove button */}
              {(webUpload.status === 'success' || webUpload.status === 'error') && (
                <button
                  onClick={() => removeWebUpload(webUpload.id)}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tab === 'files' && files.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No files uploaded yet
        </div>
      )}
      {tab === 'web' && webUploads.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No websites scraped yet
        </div>
      )}

      {/* Info */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> Files and web content are automatically chunked, analyzed, and processed after upload.
          Memories are automatically extracted and stored. Use the Agent to explore your uploaded data.
        </p>
      </div>
    </div>
  );
}
