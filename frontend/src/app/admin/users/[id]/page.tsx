'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, HardDrive, FileText, FolderOpen, Lock, Ban,
  Loader2, UserCheck, UserX, Unlock, Trash2, Pencil, Calendar,
} from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import api from '@/lib/api';
import { formatBytes, formatDate, cn } from '@/lib/utils';

const MIME_LABELS: Record<string, string> = {
  'image/': 'Image',
  'video/': 'Video',
  'audio/': 'Audio',
  'application/pdf': 'PDF',
  'text/': 'Document',
};

function guessType(mime: string) {
  for (const [prefix, label] of Object.entries(MIME_LABELS)) {
    if (mime.startsWith(prefix)) return label;
  }
  return 'File';
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quotaModal, setQuotaModal] = useState(false);
  const [newQuotaGB, setNewQuotaGB] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => api.get(`/admin/users/${id}`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const user = data?.user;
  const recentFiles: any[] = data?.recent_files ?? [];

  const pct = user?.storage_quota > 0
    ? Math.round((user.storage_used / user.storage_quota) * 100) : 0;

  const handleQuota = async () => {
    if (!newQuotaGB) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${id}/quota`, { quota_bytes: Math.round(parseFloat(newQuotaGB) * 1024 ** 3) });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setQuotaModal(false);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDisable = async () => {
    try {
      await api.patch(`/admin/users/${id}/toggle-disable`);
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const handleUnlock = async () => {
    try {
      await api.patch(`/admin/users/${id}/unlock`);
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${user?.name} and all their data? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      router.push('/admin/users');
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-red-400">User not found</p>
        <button onClick={() => router.back()} className="btn-secondary text-sm">Go back</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* Profile Card */}
      <div className="card flex flex-col sm:flex-row gap-5">
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white uppercase flex-shrink-0',
          user.account_disabled ? 'bg-gray-700' : 'bg-purple-700'
        )}>
          {user.name[0]}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-100">{user.name}</h1>
            {user.role === 'admin' && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-800/60 text-purple-300 border border-purple-700/40 rounded-md">Admin</span>
            )}
            {user.account_disabled && <span className="badge-red">Disabled</span>}
            {user.account_locked && <span className="badge-yellow">Locked</span>}
            {!user.account_disabled && !user.account_locked && <span className="badge-green">Active</span>}
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(user.created_at)}
          </p>
          <p className="text-xs text-gray-600">ID: {user.id}</p>
        </div>
        {/* Actions */}
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => { setQuotaModal(true); setNewQuotaGB(`${(user.storage_quota / 1024 ** 3).toFixed(1)}`); }}
            className="btn-secondary text-xs px-3 py-2 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Quota
          </button>
          {user.account_locked && (
            <button onClick={handleUnlock} className="btn-secondary text-xs px-3 py-2 gap-1.5 text-yellow-400">
              <Unlock className="w-3.5 h-3.5" /> Unlock
            </button>
          )}
          {user.role !== 'admin' && (
            <button
              onClick={handleToggleDisable}
              className={cn('btn-secondary text-xs px-3 py-2 gap-1.5',
                user.account_disabled ? 'text-green-400' : 'text-red-400'
              )}
            >
              {user.account_disabled
                ? <><UserCheck className="w-3.5 h-3.5" /> Enable</>
                : <><UserX className="w-3.5 h-3.5" /> Disable</>}
            </button>
          )}
          {user.role !== 'admin' && (
            <button
              onClick={handleDelete}
              className="btn-secondary text-xs px-3 py-2 gap-1.5 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Storage Used',   value: formatBytes(user.storage_used),  icon: HardDrive,  color: 'text-purple-400' },
          { label: 'Quota',          value: formatBytes(user.storage_quota),  icon: HardDrive,  color: 'text-blue-400'   },
          { label: 'Files',          value: user.file_count,                  icon: FileText,   color: 'text-emerald-400'},
          { label: 'Folders',        value: user.folder_count,                icon: FolderOpen, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card-sm flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-100 leading-tight truncate">{value}</p>
              <p className="text-[11px] text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Gauge */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" /> Storage Usage
          </h3>
          <span className="text-xs text-gray-500">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700',
              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-purple-500'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-600">
          {formatBytes(user.storage_used)} used of {formatBytes(user.storage_quota)}
        </p>
        {user.failed_attempts > 0 && (
          <p className="text-xs text-yellow-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> {user.failed_attempts} failed login attempt{user.failed_attempts !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Recent Files */}
      <div className="card space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" /> Recent Files
        </h3>
        {recentFiles.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No files uploaded yet</p>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {recentFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-300 truncate">{f.file_name}</p>
                  <p className="text-[11px] text-gray-600">{guessType(f.mime_type)} · {formatBytes(f.file_size)}</p>
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">{formatDate(f.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quota Modal */}
      <Modal open={quotaModal} onClose={() => setQuotaModal(false)} title="Edit Storage Quota" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Updating quota for <span className="font-semibold text-gray-200">{user.name}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Quota (GB)</label>
            <input
              className="input-field"
              type="number"
              value={newQuotaGB}
              onChange={(e) => setNewQuotaGB(e.target.value)}
              placeholder="e.g. 5"
              min="0.1"
              step="0.5"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setQuotaModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleQuota} disabled={actionLoading || !newQuotaGB} className="btn-primary flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
