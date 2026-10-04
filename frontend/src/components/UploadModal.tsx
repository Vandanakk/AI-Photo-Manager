import React, { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';
import { uploadBatchPhotos, uploadPhoto } from '../api';
import { formatBytes } from '../utils/formatters';
import type { UploadResult } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

type UploadStep = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<UploadStep>('idle');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validImages = newFiles.filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...validImages]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartUpload = async () => {
    if (files.length === 0) return;

    setStep('uploading');
    setUploadPercent(0);
    setErrorMessage(null);

    try {
      let uploadResults: UploadResult[] = [];
      if (files.length === 1) {
        const res = await uploadPhoto(files[0], (progress) => {
          setUploadPercent(progress);
        });
        uploadResults = [res];
      } else {
        const res = await uploadBatchPhotos(files, (progress) => {
          setUploadPercent(progress);
        });
        uploadResults = res.results;
      }

      setResults(uploadResults);

      // Transition to indeterminate "Processing with AI..." state (Celery background worker)
      setStep('processing');

      // Allow background worker a moment to process Celery tasks
      setTimeout(() => {
        setStep('completed');
        onUploadSuccess();
      }, 2000);

    } catch (err: unknown) {
      console.error('Upload error:', err);
      setStep('error');
      const errObj = err as { response?: { data?: { detail?: string } }; message?: string };
      setErrorMessage(
        errObj.response?.data?.detail || errObj.message || 'An unexpected error occurred during upload.'
      );
    }
  };

  const handleReset = () => {
    setFiles([]);
    setStep('idle');
    setUploadPercent(0);
    setErrorMessage(null);
    setResults([]);
  };

  const handleClose = () => {
    if (step === 'uploading' || step === 'processing') return;
    handleReset();
    onClose();
  };

  const duplicateCount = results.filter((r) => r.is_duplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />

      <div className="relative z-10 w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Upload Photos</h3>
              <p className="text-xs text-slate-400">Add photos to your intelligent AI library</p>
            </div>
          </div>
          {step !== 'uploading' && step !== 'processing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6">
          {step === 'idle' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/50 scale-[1.01]'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to choose photos or drag & drop here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports JPEG, PNG, WebP, HEIC (Max 50MB per photo)
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                    <span>Selected Files ({files.length})</span>
                    <button
                      onClick={() => setFiles([])}
                      className="text-rose-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate font-medium text-slate-700 max-w-[280px]">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'uploading' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <UploadCloud className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Uploading photos...</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transferring {files.length} file{files.length > 1 ? 's' : ''} to server
                </p>
              </div>

              <div className="w-64 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-brand-600 h-full rounded-full transition-all duration-200"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{uploadPercent}%</span>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Processing with AI...</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Celery background worker is computing OpenAI CLIP text-image vector embeddings, perceptual hashes, and classifying categories.
                </p>
              </div>

              <div className="w-64 bg-slate-100 h-2 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500 to-transparent w-full animate-pulse" />
              </div>
            </div>
          )}

          {step === 'completed' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Upload & AI Processing Queued</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Successfully ingested {results.length} photo{results.length > 1 ? 's' : ''}.
                  {duplicateCount > 0 && (
                    <span className="block mt-1 font-semibold text-amber-600">
                      {duplicateCount} duplicate photo{duplicateCount > 1 ? 's' : ''} detected!
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Upload Failed</h4>
                <p className="text-xs text-rose-600 mt-1 max-w-xs">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          {step === 'idle' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartUpload}
                disabled={files.length === 0}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-all ${
                  files.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20 active:scale-[0.98]'
                }`}
              >
                Upload {files.length > 0 ? `${files.length} Photo${files.length > 1 ? 's' : ''}` : ''}
              </button>
            </>
          )}

          {step === 'completed' && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Upload More
              </button>
              <button
                onClick={handleClose}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
              >
                Done
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <button
                onClick={handleReset}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
