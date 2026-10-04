import React, { useEffect, useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  Maximize2, 
  HardDrive, 
  Hash, 
  Tag, 
  Sparkles,
  ExternalLink,
  Layers,
  AlertTriangle
} from 'lucide-react';
import type { PhotoDetail, PhotoSummary } from '../types';
import { getPhotoById, getPhotoFileUrl } from '../api';
import { formatBytes, formatDate, formatCategory, getCategoryStyles } from '../utils/formatters';

interface PhotoModalProps {
  photo: PhotoSummary | null;
  onClose: () => void;
  onSelectDuplicateOf?: (photoId: string) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  onClose,
  onSelectDuplicateOf,
}) => {
  const [detail, setDetail] = useState<PhotoDetail | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  useEffect(() => {
    if (!photo) return;
    let isMounted = true;

    getPhotoById(photo.id)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load photo detail:', err);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [photo, onClose]);

  if (!photo) return null;

  const imageUrl = getPhotoFileUrl(photo.id);
  const categoryStyle = getCategoryStyles(detail?.category || photo.category);
  const confidencePercent = detail?.category_confidence
    ? Math.round(detail.category_confidence * 100)
    : 0;

  const handleCopyHash = () => {
    if (detail?.md5_hash) {
      navigator.clipboard.writeText(detail.md5_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
      <div 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative z-10 w-full max-w-6xl h-[88vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200/80">
        <div className="flex-1 bg-slate-950 flex items-center justify-center relative p-4 overflow-hidden select-none">
          <img
            src={imageUrl}
            alt={photo.filename}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
          />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${categoryStyle.bg}/90 ${categoryStyle.text} ${categoryStyle.border}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${categoryStyle.dot}`} />
              {formatCategory(detail?.category || photo.category)}
            </span>
            {detail?.is_duplicate && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Layers className="w-3 h-3" /> Duplicate
              </span>
            )}
          </div>

          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl backdrop-blur-md transition-colors"
            title="Open original image in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="w-full md:w-96 bg-white border-l border-slate-100 flex flex-col h-full overflow-y-auto">
          <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate" title={photo.filename}>
                {photo.filename}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Photo Information & AI Metadata</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  AI Classification
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {confidencePercent}% confidence
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">
                  {formatCategory(detail?.category || photo.category)}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${confidencePercent || 60}%` }}
                />
              </div>
            </div>

            {detail?.is_duplicate && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Detected as Duplicate</p>
                  {detail.duplicate_of ? (
                    <p className="text-[11px] text-amber-700">
                      Identified as redundant copy of parent photo{' '}
                      <button
                        onClick={() => onSelectDuplicateOf?.(detail.duplicate_of!)}
                        className="underline font-mono font-medium hover:text-amber-950"
                      >
                        {detail.duplicate_of.slice(0, 8)}...
                      </button>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-700">Matches another photo in your library.</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                File Properties
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <Maximize2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Dimensions</span>
                    <span className="block text-xs font-semibold text-slate-800 truncate">
                      {detail?.width && detail?.height ? `${detail.width} × ${detail.height}` : 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">Size</span>
                    <span className="block text-xs font-semibold text-slate-800 truncate">
                      {formatBytes(detail?.file_size)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-slate-400 uppercase font-medium">Date Taken / Indexed</span>
                  <span className="block text-xs font-semibold text-slate-800 truncate">
                    {formatDate(detail?.taken_at)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-[10px] text-slate-400 uppercase font-medium">MD5 Checksum</span>
                    <span className="block text-xs font-mono text-slate-700 truncate" title={detail?.md5_hash || 'Pending'}>
                      {detail?.md5_hash ? `${detail.md5_hash.slice(0, 16)}...` : 'Pending'}
                    </span>
                  </div>
                </div>
                {detail?.md5_hash && (
                  <button
                    onClick={handleCopyHash}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                    title="Copy full MD5"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {detail?.tags && detail.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.map((t, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <a
              href={imageUrl}
              download={photo.filename}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
