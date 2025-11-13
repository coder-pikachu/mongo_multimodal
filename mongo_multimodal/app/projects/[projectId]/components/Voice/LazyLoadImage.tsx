'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoadImageProps {
  dataId: string;
  base64?: string;
  mimeType?: string;
  filename: string;
  className?: string;
}

export function LazyLoadImage({
  dataId,
  base64,
  mimeType = 'image/jpeg',
  filename,
  className,
}: LazyLoadImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If base64 is already provided, use it directly
    if (base64) {
      setImageSrc(`data:${mimeType};base64,${base64}`);
      return;
    }

    // Otherwise, fetch the content
    const fetchImage = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`/api/projects/data/${dataId}/content`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        if (data.content?.base64) {
          setImageSrc(`data:${data.metadata.mimeType || mimeType};base64,${data.content.base64}`);
        } else {
          throw new Error('No base64 data');
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [dataId, base64, mimeType]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-neutral-200 dark:bg-neutral-800`}>
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-neutral-200 dark:bg-neutral-800`}>
        <p className="text-xs text-neutral-500">Failed to load</p>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={filename}
      className={className}
    />
  );
}
