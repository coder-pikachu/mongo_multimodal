'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ProjectData } from '@/types/models';
import { Eye } from 'lucide-react';
import { LazyLoadImage } from './LazyLoadImage';

interface Props {
  images: ProjectData[];
  activeIndex: number;
  onImageClick: (image: ProjectData) => void;
}

export function GenerativeImageGallery({
  images,
  activeIndex,
  onImageClick,
}: Props) {
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);

  // Progressive reveal animation - images fade in one by one
  useEffect(() => {
    // Reset visible indices when images change
    setVisibleIndices([]);

    images.forEach((_, i) => {
      setTimeout(() => {
        setVisibleIndices((prev) => [...prev, i]);
      }, i * 300); // Stagger by 300ms for smooth sequential reveal
    });

    // Cleanup timeout on unmount
    return () => {
      setVisibleIndices([]);
    };
  }, [images]);

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500 dark:text-neutral-500 text-sm">
          Images will appear here as the agent references them...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 h-full auto-rows-min overflow-y-auto">
      <AnimatePresence>
        {images.map((img, i) => {
          const isActive = activeIndex === i;
          const isVisible = visibleIndices.includes(i);

          return (
            <motion.div
              key={img._id?.toString() || i}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                scale: isVisible ? 1 : 0.8,
                y: isVisible ? 0 : 20,
              }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className={`relative rounded-lg overflow-hidden cursor-pointer border-4 transition-all group ${
                isActive
                  ? 'border-primary-500 shadow-lg shadow-primary-500/50 ring-2 ring-primary-400/50'
                  : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
              onClick={() => onImageClick(img)}
            >
              {/* Image */}
              <div className="relative h-48 bg-neutral-200 dark:bg-neutral-900">
                <LazyLoadImage
                  dataId={img._id?.toString() || ''}
                  base64={img.content?.base64}
                  mimeType={img.metadata?.mimeType}
                  filename={img.metadata?.filename || 'Project image'}
                  className="w-full h-full object-cover"
                />

                {/* Preview overlay on hover */}
                <div className="absolute inset-0 bg-neutral-900/0 dark:bg-black/0 group-hover:bg-neutral-900/40 dark:group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Active indicator pulse */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 border-4 border-primary-400 pointer-events-none rounded-lg"
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.98, 1, 0.98],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-900 via-neutral-900/80 dark:from-black dark:via-black/80 to-transparent p-3 pt-6">
                <p className="text-sm text-white font-medium line-clamp-2 mb-1">
                  {img.analysis?.description ||
                    img.metadata?.filename ||
                    'Untitled'}
                </p>
                <div className="flex items-center justify-between">
                  {img.score !== undefined && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      <span className="text-xs text-primary-300 font-medium">
                        {(img.score * 100).toFixed(0)}% match
                      </span>
                    </div>
                  )}
                  {img.analysis?.tags && img.analysis.tags.length > 0 && (
                    <span className="text-xs text-neutral-400 truncate max-w-[120px]">
                      {img.analysis.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Active badge */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                >
                  ACTIVE
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
