import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Search as SearchIcon, 
  ArrowRight, 
  X, 
  Info,
  Loader2 
} from 'lucide-react';
import type { PhotoSummary, SearchResultItem } from '../types';
import { searchPhotos, getSearchSuggestions } from '../api';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoModal } from '../components/PhotoModal';

interface SearchPageProps {
  initialQuery?: string;
  onOpenUpload: () => void;
}

const SAMPLE_PROMPTS = [
  'receipt with total price',
  'food and coffee cup',
  'mountain landscape with trees',
  'cute puppy or dog',
  'printed document or certificate',
  'person smiling portrait',
  'fast vehicle or car',
];

export const SearchPage: React.FC<SearchPageProps> = ({
  initialQuery = '',
  onOpenUpload,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [activeSearch, setActiveSearch] = useState<string>(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSummary | null>(null);

  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setActiveSearch(searchQuery);
    setHasSearched(true);
    setShowSuggestions(false);

    try {
      const data = await searchPhotos(searchQuery.trim(), 40);
      setResults(data.results);
    } catch (err: unknown) {
      console.error('Search failed:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Failed to complete semantic search.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery, executeSearch]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await getSearchSuggestions(query.trim());
        setSuggestions(data.suggestions);
      } catch {
        // silently ignore suggestion errors
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
    executeSearch(prompt);
  };

  const convertedPhotos: PhotoSummary[] = results.map((r) => ({
    id: r.photo_id,
    filename: r.filename,
    category: r.category,
    taken_at: r.taken_at,
    width: null,
    height: null,
    is_duplicate: false,
    tags: r.tags,
  }));

  const relevanceMap: Record<string, number> = {};
  results.forEach((r) => {
    relevanceMap[r.photo_id] = r.score;
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-brand-200 text-xs font-semibold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-brand-300" />
            <span>OpenAI CLIP Multimodal Neural Search</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Search Photos Using Natural Language
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Describe what you are looking for in plain English. CLIP translates your description into 512-dim vector embeddings and finds the closest matching visuals.
          </p>

          <form onSubmit={handleSubmit} className="relative mt-6 text-left">
            <div className="relative flex items-center shadow-2xl rounded-2xl bg-white text-slate-900 overflow-hidden border-2 border-brand-400/40 focus-within:border-brand-400">
              <SearchIcon className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="e.g. 'receipt from restaurant' or 'sunset over mountains'"
                className="w-full px-4 py-3.5 text-sm sm:text-base outline-none bg-transparent placeholder-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                  }}
                  className="p-1.5 mr-2 text-slate-400 hover:text-slate-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="mr-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-30">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Suggested Queries
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      executeSearch(s);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SearchIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Try asking:</span>
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePromptClick(prompt)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition-colors border border-white/10"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasSearched && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Results for:</span>
                <span className="text-brand-600 font-semibold">"{activeSearch}"</span>
                <span className="text-xs font-medium text-slate-400">({results.length} found)</span>
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Ranked by cosine similarity of text & photo vectors</span>
            </div>
          </div>

          <PhotoGrid
            photos={convertedPhotos}
            loading={loading}
            error={error}
            onRetry={() => executeSearch(activeSearch)}
            onClickPhoto={(photo) => setSelectedPhoto(photo)}
            onUploadClick={onOpenUpload}
            emptyTitle={`No visual matches for "${activeSearch}"`}
            emptySubtitle="Try broader search terms like 'food', 'document', 'nature', or upload more diverse photos."
            relevanceMap={relevanceMap}
          />
        </div>
      )}

      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};
