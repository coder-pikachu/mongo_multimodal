import sharp from 'sharp';

/**
 * Compress and resize an image to reduce token usage
 * @param base64 - Base64 encoded image string
 * @param mimeType - MIME type of the image
 * @param maxWidth - Maximum width (default 1568px as per Anthropic docs)
 * @param quality - JPEG quality (default 85)
 * @returns Compressed base64 image
 */
export async function compressImage(
  base64: string,
  mimeType: string,
  maxWidth: number = 1568,
  quality: number = 85
): Promise<{ base64: string; sizeKB: number; originalSizeKB: number }> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');
    const originalSizeKB = Math.round(buffer.length / 1024);

    // Process image with sharp
    let sharpInstance = sharp(buffer);

    // Get metadata to check dimensions
    const metadata = await sharpInstance.metadata();

    // Resize if width exceeds maxWidth, maintaining aspect ratio
    if (metadata.width && metadata.width > maxWidth) {
      sharpInstance = sharpInstance.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Convert to JPEG with specified quality for better compression
    // (unless it's already a highly compressed format)
    if (mimeType !== 'image/webp') {
      sharpInstance = sharpInstance.jpeg({ quality });
    }

    // Get compressed buffer
    const compressedBuffer = await sharpInstance.toBuffer();
    const compressedBase64 = compressedBuffer.toString('base64');
    const sizeKB = Math.round(compressedBuffer.length / 1024);

    return {
      base64: compressedBase64,
      sizeKB,
      originalSizeKB
    };
  } catch (error) {
    console.error('Image compression error:', error);
    // Return original if compression fails
    return {
      base64,
      sizeKB: Math.round(Buffer.from(base64, 'base64').length / 1024),
      originalSizeKB: Math.round(Buffer.from(base64, 'base64').length / 1024)
    };
  }
}

/**
 * Estimate token count for an image
 * Based on Anthropic's formula: tokens = (width * height) / 750
 * For base64, we use: tokens = base64.length / 4 (rough estimate)
 */
export function estimateImageTokens(base64: string): number {
  return Math.round(base64.length / 4);
}