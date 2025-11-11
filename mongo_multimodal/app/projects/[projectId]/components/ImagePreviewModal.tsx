'use client'

import { useEffect, useState, useRef } from 'react';
import { X, Download, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { ClientProjectData } from '@/types/clientTypes';

interface ImagePreviewModalProps {
  dataId: string | null;
  projectId: string;
  onClose: () => void;
  allItems?: ClientProjectData[]; // For navigation between items
}

export function ImagePreviewModal({ dataId, projectId, onClose, allItems }: ImagePreviewModalProps) {
  const [item, setItem] = useState<ClientProjectData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dataId) {
      setItem(null);
      return;
    }

    // Reset zoom when switching images
    setZoom(1);

    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      setItem(null); // Clear previous item when fetching new one

      // Scroll to top immediately when starting to load
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      try {
        const response = await fetch(`/api/projects/data/${dataId}/content`);
        if (!response.ok) throw new Error('Failed to fetch item');
        const data = await response.json();
        setItem(data);

        // Scroll to top again after content loads
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
        }, 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [dataId]);

  const handleDownload = () => {
    if (!item || !item.content.base64) return;
    const link = document.createElement('a');
    link.href = `data:${item.metadata.mimeType};base64,${item.content.base64}`;
    link.download = item.metadata.filename;
    link.click();
  };

  // Close on Escape key and handle keyboard navigation
  useEffect(() => {
    const handleNavigation = (direction: 'prev' | 'next') => {
      if (!allItems || !dataId) return;
      const currentIndex = allItems.findIndex(i => i._id === dataId);
      if (currentIndex === -1) return;

      const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < allItems.length) {
        const newItem = allItems[newIndex];
        // Trigger parent to update dataId
        window.dispatchEvent(new CustomEvent('preview-navigate', { detail: newItem._id }));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && allItems) handleNavigation('prev');
      if (e.key === 'ArrowRight' && allItems) handleNavigation('next');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataId, allItems, onClose]);

  // Early return if no dataId
  if (!dataId) return null;

  const currentIndex = allItems?.findIndex(i => i._id === dataId) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < (allItems?.length ?? 0) - 1;

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (!allItems || !dataId) return;
    const currentIndex = allItems.findIndex(i => i._id === dataId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < allItems.length) {
      const newItem = allItems[newIndex];
      // Trigger parent to update dataId
      window.dispatchEvent(new CustomEvent('preview-navigate', { detail: newItem._id }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-7xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>

        {/* Loading/Error State */}
        {(loading || error || !item) ? (
          <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center p-8" style={{ minHeight: '400px' }}>
            {loading && (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Loading image...</span>
              </div>
            )}
            {error && (
              <div className="text-red-400 text-center">
                <p className="font-semibold text-lg mb-2">Error loading image</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            )}
            {!loading && !error && !item && (
              <div className="text-white">Loading...</div>
            )}
          </div>
        ) : item ? (
          <>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10 flex items-center justify-between">
              <div className="text-white">
                <h3 className="font-semibold truncate max-w-md">{item.metadata.filename}</h3>
                <p className="text-sm text-gray-300">
                  {(item.metadata.size / 1024).toFixed(1)} KB • {item.metadata.mimeType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                {item.type === 'image' && (
                  <>
                    <button
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-white text-sm min-w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </>
                )}
                {/* Download button */}
                <button
                  onClick={handleDownload}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                  disabled={!item.content.base64}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                  title="Close (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Navigation arrows */}
            {allItems && allItems.length > 1 && (
              <>
                {hasPrev && (
                  <button
                    onClick={() => handleNavigation('prev')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
                    title="Previous (←)"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={() => handleNavigation('next')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
                    title="Next (→)"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}
              </>
            )}

            {/* Content */}
            <div className="bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
              <div
                ref={scrollContainerRef}
                className="overflow-auto max-h-[80vh] w-full flex items-start justify-center p-4 pt-20 pb-20"
              >
                {item.type === 'image' && item.content.base64 ? (
                  <img
                    src={`data:${item.metadata.mimeType};base64,${item.content.base64}`}
                    alt={item.metadata.filename}
                    className="max-w-full h-auto transition-transform"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                  />
                ) : (
                  <div className="text-white p-8 text-center">
                    <p className="mb-2">Document preview not available</p>
                    <p className="text-sm text-gray-400">
                      {item.analysis?.description || 'No analysis available'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with metadata */}
            {item.analysis && (item.analysis.description || (item.analysis.tags && item.analysis.tags.length > 0)) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 z-10">
                <div className="text-white text-sm space-y-2">
                  {item.analysis.description && (
                    <div>
                      <span className="font-semibold">Description: </span>
                      <span className="text-gray-300">{item.analysis.description}</span>
                    </div>
                  )}
                  {item.analysis.tags && item.analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.analysis.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-500/30 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
