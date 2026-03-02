'use client';

import { useState } from 'react';
import { FileText, Image, Video, Archive, File, Download, Pencil, Trash2, Share2, MoreVertical } from 'lucide-react';
import { formatBytes, formatDate, getMimeIcon, truncateFilename } from '@/lib/utils';
import api from '@/lib/api';

interface FileItem {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface FileCardProps {
  file: FileItem;
  onRename: (id: string, currentName: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
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

export function FileCard({ file, onRename, onDelete, onShare }: FileCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  return (
    <div className="group relative card hover:border-gray-700 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-900/40 border border-brand-800/50 flex items-center justify-center">
            <IconComp className="w-5 h-5 text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate" title={file.file_name}>
              {truncateFilename(file.file_name)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatBytes(file.file_size)} · {formatDate(file.created_at)}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 w-40 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => { handleDownload(); setMenuOpen(false); }}
                  disabled={downloading}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
                <button
                  onClick={() => { onRename(file.id, file.file_name); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Rename
                </button>
                <button
                  onClick={() => { onShare(file.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <hr className="border-gray-700" />
                <button
                  onClick={() => { onDelete(file.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
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
