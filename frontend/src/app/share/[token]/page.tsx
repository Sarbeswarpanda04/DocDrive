'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Loader2, AlertCircle, HardDrive } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import api from '@/lib/api';

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['share', token],
    queryFn: () => api.get(`/share/${token}`).then((r) => r.data),
    retry: false,
  });

  const handleDownload = async () => {
    if (!data?.url) return;
    const a = document.createElement('a');
    a.href = data.url;
    a.download = data.file_name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <HardDrive className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-100">DocDrive</span>
        </div>

        <div className="card text-center space-y-4">
          {isLoading && (
            <div className="py-8 space-y-3">
              <Loader2 className="w-10 h-10 mx-auto text-brand-400 animate-spin" />
              <p className="text-gray-400 text-sm">Loading shared file...</p>
            </div>
          )}

          {error && (
            <div className="py-8 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-gray-200 font-medium">Link Unavailable</p>
              <p className="text-gray-500 text-sm">
                This link has expired, been revoked, or doesn't exist.
              </p>
            </div>
          )}

          {data && !isLoading && (
            <>
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-900/40 border border-brand-800/50 flex items-center justify-center">
                <FileText className="w-8 h-8 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-100 break-all">{data.file_name}</p>
                <p className="text-sm text-gray-500 mt-1">{formatBytes(data.file_size)}</p>
              </div>
              <button onClick={handleDownload} className="btn-primary w-full">
                <Download className="w-4 h-4" />
                Download File
              </button>
              <p className="text-xs text-gray-600">
                Shared via DocDrive · Link expires 5 minutes after clicking download
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
