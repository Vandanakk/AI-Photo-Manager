import React, { useState } from 'react';
import type { PhotoSummary } from '../types';
import { getPhotoFileUrl } from '../api';
import { formatCategory, getCategoryStyles } from '../utils/formatters';
import { Copy, Image as ImageIcon, Sparkles } from 'lucide-react';

interface PhotoCardProps {
  photo: PhotoSummary;
  onClick: (photo: PhotoSummary) => void;
  relevanceScore?: number;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  onClick,
  relevanceScore,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const categoryStyle = getCategoryStyles(photo.category);

  return (
    <div
      onClick={() => onClick(photo)}
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col select-none"
    >
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden flex items-center justify-center">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        )}

        {imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img
            src={getPhotoFileUrl(photo.id)}
            alt={photo.filename}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {relevanceScore !== undefined && (
          <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{(relevanceScore * 100).toFixed(0)}% match</span>
          </div>
        )}

        {photo.is_duplicate && (
          <div className="absolute top-2.5 right-2.5 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
            <Copy className="w-3 h-3" />
            <span>Duplicate</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      </div>

      <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-100 bg-white">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate" title={photo.filename}>
            {photo.filename}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {photo.width && photo.height && (
              <span className="text-[10px] text-slate-400">
                {photo.width} × {photo.height}
              </span>
            )}
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${categoryStyle.dot}`} />
          {formatCategory(photo.category)}
        </span>
      </div>
    </div>
  );
};
