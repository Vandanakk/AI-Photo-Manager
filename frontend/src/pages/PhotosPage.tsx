import React, { useEffect, useState, useCallback } from 'react';
import type { PhotoSummary } from '../types';
import { getPhotos } from '../api';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoModal } from '../components/PhotoModal';
import { RefreshCw, Filter, Layers } from 'lucide-react';

interface PhotosPageProps {
  onOpenUpload: () => void;
  selectedCategoryFilter?: string | null;
  onClearCategoryFilter?: () => void;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Photos' },
  { id: 'receipt', label: 'Receipts' },
  { id: 'document', label: 'Documents' },
  { id: 'travel', label: 'Travel' },
  { id: 'people', label: 'People' },
  { id: 'pets', label: 'Pets' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'other', label: 'Other' },
];

export const PhotosPage: React.FC<PhotosPageProps> = ({
  onOpenUpload,
  selectedCategoryFilter,
  onClearCategoryFilter,
}) => {
  const [photos, setPhotos] = useState<PhotoSummary[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategoryFilter || 'all');
  const [includeDuplicates, setIncludeDuplicates] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSummary | null>(null);

  useEffect(() => {
    if (selectedCategoryFilter) {
      setActiveCategory(selectedCategoryFilter);
    }
  }, [selectedCategoryFilter]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPhotos({
        category: activeCategory === 'all' ? undefined : activeCategory,
        include_duplicates: includeDuplicates,
        limit: 100,
      });
      setPhotos(data.photos);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Error fetching photos:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to connect to PhotoAI server.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, includeDuplicates]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    if (categoryId === 'all' && onClearCategoryFilter) {
      onClearCategoryFilter();
    }
  };

  const handleSelectDuplicateOf = async (parentPhotoId: string) => {
    const found = photos.find((p) => p.id === parentPhotoId);
    if (found) {
      setSelectedPhoto(found);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>All Library Photos</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {total} {total === 1 ? 'photo' : 'photos'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Indexed and processed with automated AI classification & deduplication
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIncludeDuplicates(!includeDuplicates)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              includeDuplicates
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Show Duplicates</span>
          </button>

          <button
            onClick={loadPhotos}
            disabled={loading}
            className="p-2 bg-white text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
            title="Refresh library"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-xs shadow-brand-500/20'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <PhotoGrid
        photos={photos}
        loading={loading}
        error={error}
        onRetry={loadPhotos}
        onClickPhoto={(photo) => setSelectedPhoto(photo)}
        onUploadClick={onOpenUpload}
        emptyTitle={activeCategory !== 'all' ? `No photos in "${activeCategory}"` : 'No photos yet'}
        emptySubtitle={
          activeCategory !== 'all'
            ? 'Try choosing another category filter or upload new photos.'
            : 'Get started by uploading photos to test semantic search and duplicate grouping.'
        }
      />

      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onSelectDuplicateOf={handleSelectDuplicateOf}
      />
    </div>
  );
};
