import React, { useEffect, useState, useCallback } from 'react';
import { 
  Copy, 
  Layers, 
  PieChart, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import type { DuplicateGroup, DuplicateStats, PhotoSummary } from '../types';
import { getDuplicateGroups, getDuplicateStats, getPhotoFileUrl } from '../api';
import { PhotoModal } from '../components/PhotoModal';

export const DuplicatesPage: React.FC = () => {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoSummary | null>(null);

  const loadDuplicatesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupsData, statsData] = await Promise.all([
        getDuplicateGroups(),
        getDuplicateStats(),
      ]);
      setGroups(groupsData.groups);
      setStats(statsData);
    } catch (err: unknown) {
      console.error('Failed to load duplicate photos:', err);
      const errObj = err as { message?: string };
      setError(errObj.message || 'Unable to retrieve duplicate analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDuplicatesData();
  }, [loadDuplicatesData]);

  const handlePhotoClick = (id: string, filename: string, isDuplicate: boolean) => {
    setSelectedPhoto({
      id,
      filename,
      category: 'other',
      taken_at: null,
      width: null,
      height: null,
      is_duplicate: isDuplicate,
      tags: [],
    });
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Deduplication & Storage Optimization</span>
            {stats && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {stats.duplicate_photos} duplicates found
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated detection combining exact MD5 cryptographic hashes & 64-bit DCT perceptual hashing
          </p>
        </div>

        <button
          onClick={loadDuplicatesData}
          disabled={loading}
          className="p-2 bg-white text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs self-start"
          title="Refresh analysis"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" /> Total Photos
            </span>
            <span className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total_photos}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Scanned across all directories</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Duplicate Copies
            </span>
            <span className="text-2xl font-extrabold text-amber-600 mt-2">{stats.duplicate_photos}</span>
            <span className="text-[11px] text-amber-600/80 mt-0.5">Redundant copies detected</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Unique Originals
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 mt-2">{stats.unique_photos}</span>
            <span className="text-[11px] text-emerald-600/80 mt-0.5">Distinct visual memories</span>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-indigo-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5" /> Storage Redundancy
            </span>
            <span className="text-2xl font-extrabold text-indigo-600 mt-2">{stats.duplicate_percentage}%</span>
            <span className="text-[11px] text-indigo-600/80 mt-0.5">Potential storage to reclaim</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-600" />
          <span>Duplicate Groups ({groups.length})</span>
        </h3>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 bg-white rounded-3xl border border-rose-200 text-center max-w-md mx-auto">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Failed to load duplicate groups</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center max-w-lg mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-900">Zero Duplicates Detected</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              Every photo in your library is currently unique. When redundant images or near-duplicates are uploaded, they will be clustered here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      Group {groupIdx + 1}: {group.original_filename}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {group.duplicate_count} duplicate {group.duplicate_count === 1 ? 'copy' : 'copies'} detected for this original photo
                    </p>
                  </div>
                  <span className="self-start text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    {group.duplicate_count + 1} Total Photos in Cluster
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div
                    onClick={() => handlePhotoClick(group.original_id, group.original_filename, false)}
                    className="group relative bg-slate-50 rounded-2xl border-2 border-brand-500/60 overflow-hidden cursor-pointer shadow-xs hover:shadow-card transition-all"
                  >
                    <div className="aspect-square w-full relative bg-slate-100">
                      <img
                        src={getPhotoFileUrl(group.original_id)}
                        alt={group.original_filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute top-2 left-2 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                        Original
                      </span>
                    </div>
                    <div className="p-2 bg-white border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={group.original_filename}>
                        {group.original_filename}
                      </p>
                      <span className="text-[10px] text-brand-600 font-medium">Keep this photo</span>
                    </div>
                  </div>

                  {group.duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      onClick={() => handlePhotoClick(dup.id, dup.filename, true)}
                      className="group relative bg-slate-50 rounded-2xl border border-amber-200 overflow-hidden cursor-pointer shadow-xs hover:shadow-card transition-all"
                    >
                      <div className="aspect-square w-full relative bg-slate-100">
                        <img
                          src={getPhotoFileUrl(dup.id)}
                          alt={dup.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-90"
                        />
                        <span
                          className={`absolute top-2 left-2 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
                            dup.type === 'exact' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                        >
                          {dup.type === 'exact' ? 'Exact MD5' : 'Near Duplicate'}
                        </span>
                      </div>
                      <div className="p-2 bg-white border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-800 truncate" title={dup.filename}>
                          {dup.filename}
                        </p>
                        <span className="text-[10px] text-amber-600 font-medium">
                          {dup.type === 'exact' ? '100% Identical' : 'pHash Perceptual'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};
