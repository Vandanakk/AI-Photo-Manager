import React from 'react';
import { X, Server, Cpu, Database, Sparkles, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">System & AI Architecture</h3>
              <p className="text-xs text-slate-400">Backend configuration and pipeline details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Connection */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-brand-600" />
              API & Database Services
            </span>
            <div className="text-xs space-y-1 text-slate-700 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">API Host:</span>
                <span className="font-semibold text-slate-800">{API_BASE_URL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Database:</span>
                <span className="font-semibold text-slate-800">PostgreSQL (SQLAlchemy Async)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Task Queue:</span>
                <span className="font-semibold text-slate-800">Redis 7 + Celery Worker</span>
              </div>
            </div>
          </div>

          {/* AI Pipeline */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              AI & Vision Capabilities
            </span>
            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">CLIP Semantic Embeddings</span>
                  <p className="text-[11px] text-slate-500">
                    OpenAI CLIP (ViT-B/32) generates 512-dimensional vector embeddings for natural language search.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Multi-Tier Deduplication</span>
                  <p className="text-[11px] text-slate-500">
                    Exact MD5 hashing for byte-for-byte clones + 64-bit DCT perceptual hashing (pHash/dHash) for resized/re-encoded images.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            PhotoAI Architecture • FastAPI + PostgreSQL + Redis + Celery + React Vite
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
