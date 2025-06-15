import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';

// Configure worker
if (typeof window !== 'undefined') {
  // Use local worker file from public directory
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export interface ConvertOptions {
  scale?: number;
  imageFormat?: 'png' | 'jpeg';
  jpegQuality?: number;
  maxSizeBytes?: number;
}

export interface ConvertedImage {
  dataUrl: string;
  pageNumber: number;
  sizeBytes: number;
}

/**
 * Converts a PDF file to an array of images (one per page)
 * @param pdfData - The PDF file as ArrayBuffer
 * @param options - Conversion options
 * @returns Array of converted images with metadata
 */
export async function convertPDFToImages(
  pdfData: ArrayBuffer,
  options: ConvertOptions = {}
): Promise<ConvertedImage[]> {
  const {
    scale = 2.0, // Start with higher quality
    imageFormat = 'jpeg',
    jpegQuality = 0.85,
    maxSizeBytes = 2 * 1024 * 1024 // 2MB
  } = options;

  // Load PDF document
  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({
    data: pdfData,
    useSystemFonts: true,
  }).promise;

  const images: ConvertedImage[] = [];

  // Convert each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Try different scales to meet size requirement
    let currentScale = scale;
    let imageData: string | null = null;
    let imageSizeBytes = 0;
    
    while (currentScale > 0.5) {
      const viewport = page.getViewport({ scale: currentScale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to image
      if (imageFormat === 'jpeg') {
        // Try different quality settings for JPEG
        let quality = jpegQuality;
        while (quality > 0.3) {
          imageData = canvas.toDataURL('image/jpeg', quality);
          imageSizeBytes = Math.round((imageData.length - 'data:image/jpeg;base64,'.length) * 0.75);
          
          if (imageSizeBytes <= maxSizeBytes) {
            break;
          }
          quality -= 0.1;
        }
      } else {
        imageData = canvas.toDataURL('image/png');
        imageSizeBytes = Math.round((imageData.length - 'data:image/png;base64,'.length) * 0.75);
      }

      // Check if size is acceptable
      if (imageSizeBytes <= maxSizeBytes) {
        break;
      }

      // Reduce scale for next attempt
      currentScale -= 0.25;
    }

    if (!imageData) {
      throw new Error(`Could not convert page ${pageNum} to meet size requirements`);
    }

    images.push({
      dataUrl: imageData,
      pageNumber: pageNum,
      sizeBytes: imageSizeBytes
    });
  }

  return images;
}

/**
 * Validates a PDF file
 * @param file - The PDF file to validate
 * @returns true if valid, throws error if not
 */
export function validatePDFFile(file: File): boolean {
  // Check file type
  if (file.type !== 'application/pdf') {
    throw new Error('File must be a PDF');
  }

  // Check file size (20MB limit)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    throw new Error('PDF file size must be less than 20MB');
  }

  return true;
}

/**
 * Extracts file data for processing
 * @param file - The PDF file
 * @returns ArrayBuffer of file data
 */
export async function extractPDFData(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}