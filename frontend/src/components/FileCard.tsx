'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Image, Video, Archive, File, Download, Pencil, Trash2, Share2, MoreVertical, Star } from 'lucide-react';
import { formatBytes, formatDate, getMimeIcon, truncateFilename } from '@/lib/utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { getCachedUrl, setCachedUrl } from '@/lib/fileUrlCache';

interface FileItem {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  is_starred?: boolean;
  created_at: string;
}

interface FileCardProps {
  file: FileItem;
  listView?: boolean;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onRefresh: () => void;
  onPreview: () => void;
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

// (URL caching is handled via shared fileUrlCache module)

export function FileCard({ file, listView = false, onRename, onDelete, onShare, onRefresh, onPreview }: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [starring, setStarring] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');

  useEffect(() => {
    if (!isImage && !isVideo) return;
    const cached = getCachedUrl(file.id);
    if (cached) {
      setPreviewUrl(cached);
      return;
    }
    let cancelled = false;
    api.get(`/files/${file.id}/download`)
      .then((res) => {
        if (!cancelled) {
          setCachedUrl(file.id, res.data.url);
          setPreviewUrl(res.data.url);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [file.id, isImage, isVideo]);

  const IconComp = iconMap[getMimeIcon(file.mime_type)] || File;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await api.get(`/files/${file.id}/download`);
      const { url, file_name } = res.data;
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (starring) return;
    try {
      setStarring(true);
      await api.patch(`/files/${file.id}/star`);
      onRefresh();
    } catch (err) {
      console.error('Star toggle failed:', err);
    } finally {
      setStarring(false);
    }
  };

  const thumbnailEl = (
    <div className={cn(
      'flex-shrink-0 rounded-lg overflow-hidden border border-brand-800/50 relative',
      listView ? 'w-9 h-9' : 'w-10 h-10'
    )}>
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={file.file_name}
          className="w-full h-full object-cover"
          onError={() => setPreviewUrl(null)}
        />
      ) : isVideo && previewUrl ? (
        <>
          <video
            ref={videoRef}
            src={previewUrl}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.currentTime = 0.5;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <Video className="w-3 h-3 text-white drop-shadow" />
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-brand-900/40 flex items-center justify-center">
          <IconComp className={cn(listView ? 'w-4 h-4' : 'w-5 h-5', 'text-brand-400')} />
        </div>
      )}
    </div>
  );

  const actionsEl = (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      <button
        onClick={handleToggleStar}
        disabled={starring}
        aria-label={file.is_starred ? 'Unstar' : 'Star'}
        className={cn(
          'p-2 rounded-lg transition-all',
          file.is_starred
            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20'
            : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-900/20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        )}
      >
        <Star className={cn('w-4 h-4', file.is_starred && 'fill-yellow-400')} />
      </button>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-all
                     opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="File options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-10 w-44 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={() => { handleDownload(); setMenuOpen(false); }}
                disabled={downloading}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => { onRename(file.id, file.file_name); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Rename
              </button>
              <button
                onClick={() => { onShare(file.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <hr className="border-gray-700" />
              <button
                onClick={() => { onDelete(file.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 active:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  /* ── LIST VIEW ── */
  if (listView) {
    return (
      <div
        className="group flex items-center gap-3 px-4 py-2.5 bg-gray-900 hover:bg-gray-800/60 transition-colors cursor-pointer"
        onClick={onPreview}
      >
        {thumbnailEl}
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <p className="text-sm font-medium text-gray-200 truncate flex-1" title={file.file_name}>
            {file.file_name}
          </p>
          <span className="hidden sm:block text-xs text-gray-500 flex-shrink-0">{formatBytes(file.file_size)}</span>
          <span className="hidden md:block text-xs text-gray-500 flex-shrink-0">{formatDate(file.created_at)}</span>
        </div>
        {actionsEl}
      </div>
    );
  }

  /* ── GRID VIEW — gallery tile ── */
  return (
    <div
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-800 cursor-pointer select-none"
      onClick={onPreview}
    >
      {/* Full-bleed thumbnail */}
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={file.file_name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setPreviewUrl(null)}
        />
      ) : isVideo && previewUrl ? (
        <>
          <video
            ref={videoRef}
            src={previewUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.currentTime = 0.5;
            }}
          />
          {/* Video play badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <Video className="w-4 h-4 text-white" />
            </div>
          </div>
        </>
      ) : (
        /* Non-media: full-bleed gradient background with centered icon */
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-950/80 via-gray-900 to-gray-950" />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, #6366f1 0%, transparent 60%)' }} />
          <div className="relative w-16 h-16 rounded-2xl bg-brand-800/30 border border-brand-600/20 flex items-center justify-center shadow-lg">
            <IconComp className="w-8 h-8 text-brand-300" />
          </div>
        </div>
      )}

      {/* Bottom gradient + filename */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-16 pb-3 px-2.5 pointer-events-none">
        <p className="text-[11px] font-semibold text-white truncate leading-tight" title={file.file_name}>
          {truncateFilename(file.file_name, 22)}
        </p>
        <p className="text-[10px] text-white/50 mt-0.5">{formatBytes(file.file_size)}</p>
      </div>

      {/* Action bar — top-right, always visible */}
      <div
        className="absolute top-1.5 right-1.5 flex items-center rounded-xl bg-black/45 backdrop-blur-md border border-white/10 overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Star */}
        <button
          onClick={handleToggleStar}
          disabled={starring}
          aria-label={file.is_starred ? 'Unstar' : 'Star'}
          className="p-1.5 transition-all hover:bg-white/10 active:scale-90 rounded-xl"
        >
          <Star className={cn('w-3.5 h-3.5 drop-shadow', file.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-white/60')} />
        </button>

        {/* 3-dot menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
            aria-label="File options"
          >
            <MoreVertical className="w-3.5 h-3.5 drop-shadow" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 w-44 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => { handleDownload(); setMenuOpen(false); }}
                  disabled={downloading}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={() => { onRename(file.id, file.file_name); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Rename
                </button>
                <button
                  onClick={() => { onShare(file.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 active:bg-gray-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <hr className="border-gray-700" />
                <button
                  onClick={() => { onDelete(file.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 active:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

}
