import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  FileText, 
  Plane, 
  Users, 
  Dog, 
  Pill, 
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import type { CategoryCount, PhotoSummary } from '../types';
import { getCategories, getPhotos, getPhotoFileUrl } from '../api';
import { formatCategory } from '../utils/formatters';

interface CategoriesPageProps {
  onSelectCategory: (category: string) => void;
}

interface CategoryWithPreviews extends CategoryCount {
  samplePhotos: PhotoSummary[];
}

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  receipt: { icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  document: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  travel: { icon: Plane, color: 'text-amber-600', bg: 'bg-amber-50' },
  people: { icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
  pets: { icon: Dog, color: 'text-purple-600', bg: 'bg-purple-50' },
  prescription: { icon: Pill, color: 'text-teal-600', bg: 'bg-teal-50' },
  other: { icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-100' },
};

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<CategoryWithPreviews[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      const enriched = await Promise.all(
        data.categories.map(async (cat) => {
          try {
            const photoRes = await getPhotos({ category: cat.category, limit: 3 });
            return {
              ...cat,
              samplePhotos: photoRes.photos,
            };
          } catch {
            return {
              ...cat,
              samplePhotos: [],
            };
          }
        })
      );
      setCategories(enriched);
    } catch (err: unknown) {
      console.error('Failed to load categories:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to retrieve category data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Automated Categories</span>
            <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
              {categories.length} Categories
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Zero-shot classification categorizes every photo into domain categories during ingest
          </p>
        </div>

        <button
          onClick={loadCategories}
          disabled={loading}
          className="p-2 bg-white text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs self-start"
          title="Refresh categories"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center max-w-md mx-auto">
          <p className="text-sm font-semibold text-slate-800">Failed to load categories</p>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            const meta = CATEGORY_ICONS[cat.category.toLowerCase()] || CATEGORY_ICONS.other;
            const Icon = meta.icon;

            return (
              <div
                key={cat.category}
                onClick={() => onSelectCategory(cat.category)}
                className="group bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-card hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${meta.bg} ${meta.color} flex items-center justify-center shadow-2xs`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {formatCategory(cat.category)}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {cat.count} {cat.count === 1 ? 'photo' : 'photos'}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 aspect-[3/1] rounded-2xl overflow-hidden bg-slate-50 p-1.5 border border-slate-100">
                    {cat.samplePhotos.length > 0 ? (
                      cat.samplePhotos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-200">
                          <img
                            src={getPhotoFileUrl(photo.id)}
                            alt={photo.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex items-center justify-center text-slate-300 text-xs gap-1 py-4">
                        <ImageIcon className="w-4 h-4" />
                        <span>No previews</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Explore collection</span>
                  <span className="text-brand-600 font-semibold group-hover:underline">View All &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
