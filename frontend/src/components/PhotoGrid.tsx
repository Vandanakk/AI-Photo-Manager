import React from 'react';
import type { PhotoSummary } from '../types';
import { PhotoCard } from './PhotoCard';
import { Images, AlertCircle, RefreshCw } from 'lucide-react';

interface PhotoGridProps {
  photos: PhotoSummary[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClickPhoto: (photo: PhotoSummary) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  onUploadClick?: () => void;
  relevanceMap?: Record<string, number>;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  loading,
  error,
  onRetry,
  onClickPhoto,
  emptyTitle = 'No photos yet',
  emptySubtitle = 'Upload your first photo or image collection to start exploring AI categorization and search.',
  onUploadClick,
  relevanceMap,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 animate-pulse flex flex-col"
          >
            <div className="aspect-square bg-slate-200" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-slate-200 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center px-4 bg-white rounded-3xl border border-rose-100 max-w-md mx-auto my-8 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Failed to load photos</h3>
        <p className="text-xs text-slate-500 mb-6">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center px-4 bg-white rounded-3xl border border-dashed border-slate-200 my-8 shadow-xs max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 border border-slate-100">
          <Images className="w-8 h-8 opacity-70" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">{emptyTitle}</h3>
        <p className="text-xs text-slate-500 max-w-xs mb-6 leading-relaxed">{emptySubtitle}</p>
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            Upload Photos
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onClick={onClickPhoto}
          relevanceScore={relevanceMap ? relevanceMap[photo.id] : undefined}
        />
      ))}
    </div>
  );
};
