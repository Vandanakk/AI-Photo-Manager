import React, { useState } from 'react';
import { Search, UploadCloud, X } from 'lucide-react';
import type { NavigationTab } from '../types';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenUpload: () => void;
  onSearch: (query: string) => void;
  initialSearchQuery?: string;
}

const TAB_TITLES: Record<NavigationTab, { title: string; subtitle: string }> = {
  photos: {
    title: 'Photos Library',
    subtitle: 'Browse, manage, and inspect all indexed photos and AI metadata',
  },
  search: {
    title: 'AI Semantic Search',
    subtitle: 'Find photos using natural language concepts via OpenAI CLIP embeddings',
  },
  people: {
    title: 'People & Faces',
    subtitle: 'Detected face clusters and facial recognition tagging',
  },
  duplicates: {
    title: 'Duplicate Detection',
    subtitle: 'Exact MD5 and perceptual DCT hash (pHash) duplicate groups',
  },
  categories: {
    title: 'Smart Categories',
    subtitle: 'Automated AI classification for receipts, documents, travel, pets, and more',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenUpload,
  onSearch,
  initialSearchQuery = '',
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
    }
  };

  const handleClear = () => {
    setSearchInput('');
  };

  const currentMeta = TAB_TITLES[currentTab] || TAB_TITLES.photos;

  return (
    <header className="h-16 px-8 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{currentMeta.title}</h2>
        <p className="text-xs text-slate-500 hidden sm:block">{currentMeta.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search e.g. receipt, sunset, dog..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-transparent focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  );
};
