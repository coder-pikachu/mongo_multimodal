'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadIcon } from 'lucide-react';

export default function UploadButton({ projectId, asIcon = false }: { projectId: string; asIcon?: boolean }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState<string>('');
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

  const processPDFFile = async (file: File) => {
    try {
      // Dynamic import to avoid SSR issues
      const { validatePDFFile, extractPDFData, convertPDFToImages } = await import('@/lib/pdf-to-image');

      // Validate PDF file
      validatePDFFile(file);

      setPdfProcessingStatus(`Processing ${file.name}...`);
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 10
      }));

      // Extract PDF data
      const pdfData = await extractPDFData(file);

      // Convert PDF to images
      setPdfProcessingStatus(`Converting ${file.name} pages to images...`);
      const images = await convertPDFToImages(pdfData, {
        imageFormat: 'jpeg',
        jpegQuality: 0.85,
        maxSizeBytes: 2 * 1024 * 1024 // 2MB per image
      });

      setUploadProgress(prev => ({
        ...prev,
        [file.name]: 30
      }));

      // Upload each page as a separate image
      const totalPages = images.length;
      for (let i = 0; i < images.length; i++) {
        const pageNum = i + 1;
        setPdfProcessingStatus(`Uploading page ${pageNum} of ${totalPages} from ${file.name}...`);

        // Convert data URL to blob
        const response = await fetch(images[i].dataUrl);
        const blob = await response.blob();

        // Create a file from the blob
        const pageFile = new File([blob], `${file.name.replace('.pdf', '')}_page_${pageNum}.jpg`, {
          type: 'image/jpeg'
        });

        // Upload the page
        await uploadFile(pageFile);

        // Update progress
        const progress = 30 + ((i + 1) / totalPages) * 70;
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: Math.round(progress)
        }));
      }

      setPdfProcessingStatus('');

    } catch (error) {
      console.error(`PDF processing error for ${file.name}:`, error);
      setPdfProcessingStatus('');
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: -1
      }));
      throw error;
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
        if (file.type === 'application/pdf') {
          await processPDFFile(file);
        } else {
          await uploadFile(file);
        }
      }

      router.refresh();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress({});
      setPdfProcessingStatus('');
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
    <div className={asIcon ? '' : 'space-y-4'}>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleUpload}
        className="hidden"
        accept="image/jpeg,image/jpg,application/pdf"
        multiple
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={asIcon ? 'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400'}
        title={asIcon ? (isUploading ? `Uploading (${getOverallProgress()}%)` : 'Upload Files') : undefined}
      >
        {asIcon ? (
          <UploadIcon className="w-4 h-4" />
        ) : (
          isUploading ? `Uploading (${getOverallProgress()}%)` : 'Upload Files'
        )}
      </button>

      {/* PDF Processing Status */}
      {pdfProcessingStatus && (
        <div className="text-sm text-blue-600 mt-2">
          {pdfProcessingStatus}
        </div>
      )}

      {/* Progress indicators */}
      {!asIcon && Object.entries(uploadProgress).length > 0 && (
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
