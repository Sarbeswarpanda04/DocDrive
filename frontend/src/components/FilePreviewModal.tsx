'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, Download, Star,
  FileText, Image, Video, Archive, File, Loader2,
} from 'lucide-react';
import { formatBytes, formatDate, getMimeIcon } from '@/lib/utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface FileItem {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_starred?: boolean;
  created_at: string;
}

interface FilePreviewModalProps {
  files: FileItem[];
  initialIndex: number;
  onClose: () => void;
  onRefresh: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  archive: Archive,
  'file-text': FileText,
  table: FileText,
  'audio-lines': FileText,
  file: File,
};

export function FilePreviewModal({ files, initialIndex, onClose, onRefresh }: FilePreviewModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starring, setStarring] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  // touch swipe
  const touchStartX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const file = files[index];
  const isImage = file?.mime_type.startsWith('image/');
  const isPDF = file?.mime_type === 'application/pdf';

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : files.length - 1)), [files.length]);
  const next = useCallback(() => setIndex((i) => (i < files.length - 1 ? i + 1 : 0)), [files.length]);

  // Fetch thumbnail URLs for all image files upfront
  useEffect(() => {
    files.forEach((f) => {
      if (!f.mime_type.startsWith('image/')) return;
      api.get(`/files/${f.id}/download`)
        .then((res) => setThumbnailUrls((prev) => ({ ...prev, [f.id]: res.data.url })))
        .catch(() => {});
    });
  }, [files]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const el = thumbRefs.current[index];
    if (el && stripRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [index]);

  // Fetch signed URL whenever file changes
  useEffect(() => {
    if (!file) return;
    setUrl(null);
    setLoading(true);
    let cancelled = false;
    api.get(`/files/${file.id}/download`)
      .then((res) => { if (!cancelled) { setUrl(res.data.url); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [file?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  const handleDownload = async () => {
    if (!url) return;
    try {
      setDownloading(true);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  const handleStar = async () => {
    if (starring) return;
    setStarring(true);
    try {
      await api.patch(`/files/${file.id}/star`);
      onRefresh();
    } finally {
      setStarring(false);
    }
  };

  const IconComp = iconMap[getMimeIcon(file?.mime_type ?? '')] || File;

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx < -50) next();
        else if (dx > 50) prev();
        touchStartX.current = null;
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 z-10 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 mx-3 text-center">
          <p className="text-sm font-medium text-gray-200 truncate">{file.file_name}</p>
          <p className="text-xs text-gray-500">{formatBytes(file.file_size)} · {formatDate(file.created_at)}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleStar}
            disabled={starring}
            className={cn(
              'p-2 rounded-full transition-colors',
              file.is_starred ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400 hover:bg-white/10'
            )}
          >
            <Star className={cn('w-5 h-5', file.is_starred && 'fill-yellow-400')} />
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !url}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main preview area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Prev / Next — hidden on mobile (swipe instead) */}
        {files.length > 1 && (
          <>
            <button
              onClick={prev}
              className="hidden sm:flex absolute left-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="hidden sm:flex absolute right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {loading && (
          <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
        )}

        {!loading && isImage && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={file.file_name}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        )}

        {!loading && isPDF && url && (
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={file.file_name}
          />
        )}

        {!loading && !isImage && !isPDF && (
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-24 h-24 rounded-3xl bg-brand-900/40 border border-brand-800/50 flex items-center justify-center">
              <IconComp className="w-12 h-12 text-brand-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{file.file_name}</p>
              <p className="text-gray-400 text-sm mt-1">{formatBytes(file.file_size)}</p>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading || !url}
              className="btn-primary mt-2"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download
            </button>
          </div>
        )}
      </div>

      {/* Bottom thumbnail strip */}
      {files.length > 1 && (
        <div
          ref={stripRef}
          className="flex gap-2 px-3 py-2.5 overflow-x-auto flex-shrink-0 bg-black/40 no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          {files.map((f, i) => {
            const isImg = f.mime_type.startsWith('image/');
            const thumbUrl = thumbnailUrls[f.id];
            const ThumbIcon = iconMap[getMimeIcon(f.mime_type)] || File;
            return (
              <button
                key={f.id}
                ref={(el) => { thumbRefs.current[i] = el; }}
                onClick={() => setIndex(i)}
                className={cn(
                  'flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200',
                  i === index
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-105'
                    : 'opacity-50 hover:opacity-80'
                )}
              >
                {isImg && thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt={f.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <ThumbIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
