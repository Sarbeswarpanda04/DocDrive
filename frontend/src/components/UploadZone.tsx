'use client';

import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export interface UploadZoneHandle {
  open: () => void;
}

interface UploadFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadZoneProps {
  folderId: string | null;
  onUploadComplete: () => void;
}

export const UploadZone = forwardRef<UploadZoneHandle, UploadZoneProps>(function UploadZone(
  { folderId, onUploadComplete },
  ref
) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, status: 'pending' as const })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    maxSize: (parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50')) * 1024 * 1024,
    noClick: false,
  });

  useImperativeHandle(ref, () => ({ open }), [open]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);
        if (folderId) formData.append('folder_id', folderId);

        await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done' } : f))
        );
      } catch (err: any) {
        const message = err.response?.data?.message || 'Upload failed';
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error', error: message } : f))
        );
      }
    }

    setUploading(false);
    onUploadComplete();
  };

  const hasCompleted = files.some((f) => f.status === 'done');
  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'done'));
    if (hasCompleted) onUploadComplete();
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-brand-500 bg-brand-900/20' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/50'
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className={cn('w-10 h-10 mx-auto mb-3', isDragActive ? 'text-brand-400' : 'text-gray-500')} />
        <p className="text-sm font-medium text-gray-300">
          {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">Max 50MB per file</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-900 rounded-lg px-3 py-2.5 border border-gray-800">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 truncate">{f.file.name}</p>
                <p className="text-xs text-gray-500">{formatBytes(f.file.size)}</p>
              </div>

              <div className="flex-shrink-0">
                {f.status === 'pending' && (
                  <button onClick={() => removeFile(i)} className="p-1 text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
                {f.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {f.status === 'error' && (
                  <span className="flex items-center gap-1 text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {f.error}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <button
              onClick={uploadAll}
              disabled={uploading || !files.some((f) => f.status === 'pending')}
              className="btn-primary flex-1"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : 'Upload All'}
            </button>
            {hasCompleted && (
              <button onClick={clearCompleted} className="btn-secondary">
                Clear Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
