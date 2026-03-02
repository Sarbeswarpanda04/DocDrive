'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import {
  Users, Search, Loader2, Pencil, ToggleLeft, ToggleRight,
  Unlock, Trash2, ChevronRight, UserCheck, UserX, Lock, Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { formatBytes, formatDate, cn } from '@/lib/utils';

type FilterType = 'all' | 'active' | 'locked' | 'disabled';

interface User {
  id: string;
  name: string;
  role: string;
  storage_quota: number;
  storage_used: number;
  account_locked: boolean;
  account_disabled: boolean;
  failed_attempts: number;
  file_count: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [quotaModal, setQuotaModal] = useState<{ id: string; name: string; quota: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [newQuotaGB, setNewQuotaGB] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.users),
    refetchInterval: 30_000,
  });

  const filtered = (users ?? []).filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all'      ? true :
      filter === 'active'   ? !u.account_disabled && !u.account_locked :
      filter === 'locked'   ? u.account_locked :
      filter === 'disabled' ? u.account_disabled : true;
    return matchSearch && matchFilter;
  });

  const handleUpdateQuota = async () => {
    if (!quotaModal || !newQuotaGB) return;
    const bytes = Math.round(parseFloat(newQuotaGB) * 1024 ** 3);
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${quotaModal.id}/quota`, { quota_bytes: bytes });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setQuotaModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update quota');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleDisable = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-disable`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/unlock`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${deleteModal.id}`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setDeleteModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const filterCounts = {
    all:      users?.length ?? 0,
    active:   users?.filter((u) => !u.account_disabled && !u.account_locked).length ?? 0,
    locked:   users?.filter((u) => u.account_locked).length ?? 0,
    disabled: users?.filter((u) => u.account_disabled).length ?? 0,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          User Management
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{users?.length ?? 0} registered users</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            className="input-field pl-9 py-2.5 text-sm"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-gray-500 ml-1.5" />
          {(['all', 'active', 'locked', 'disabled'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                filter === f
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              {f} <span className="opacity-60">({filterCounts[f]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-500">
            <Users className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No users match this filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['User', 'Storage', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((user) => {
                  const pct = user.storage_quota > 0
                    ? Math.round((user.storage_used / user.storage_quota) * 100) : 0;
                  return (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors group">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0',
                            user.account_disabled ? 'bg-gray-700' : 'bg-purple-700'
                          )}>
                            {user.name[0]}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="font-medium text-gray-200 hover:text-purple-300 transition-colors flex items-center gap-1 leading-tight"
                            >
                              {user.name}
                              {user.role === 'admin' && (
                                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-800/60 text-purple-300 border border-purple-700/40 rounded-md">Admin</span>
                              )}
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                        </div>
                      </td>
                      {/* Storage */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">{formatBytes(user.storage_used)}</span>
                            <span className="text-gray-600">{formatBytes(user.storage_quota)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-purple-500')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-gray-600">{pct}% used</p>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {user.account_disabled ? (
                          <span className="badge-red">Disabled</span>
                        ) : user.account_locked ? (
                          <span className="badge-yellow">Locked</span>
                        ) : user.role === 'admin' ? (
                          <span className="badge">Active</span>
                        ) : (
                          <span className="badge-green">Active</span>
                        )}
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(user.created_at)}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Edit quota — always allowed */}
                          <button
                            onClick={() => {
                              setQuotaModal({ id: user.id, name: user.name, quota: user.storage_quota });
                              setNewQuotaGB(`${(user.storage_quota / 1024 ** 3).toFixed(1)}`);
                            }}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                            title="Edit Quota"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {/* Toggle disable — blocked for admins */}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleDisable(user.id)}
                              className={cn('p-1.5 rounded-lg transition-colors',
                                user.account_disabled
                                  ? 'text-green-400 hover:bg-green-900/20'
                                  : 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'
                              )}
                              title={user.account_disabled ? 'Enable Account' : 'Disable Account'}
                            >
                              {user.account_disabled
                                ? <UserCheck className="w-3.5 h-3.5" />
                                : <UserX className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {/* Unlock */}
                          {user.account_locked && (
                            <button
                              onClick={() => handleUnlock(user.id)}
                              className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-900/20 transition-colors"
                              title="Unlock Account"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Delete — blocked for admins */}
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => setDeleteModal({ id: user.id, name: user.name })}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* View details */}
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
                            title="View Details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quota Modal */}
      <Modal open={!!quotaModal} onClose={() => setQuotaModal(null)} title="Edit Storage Quota" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Set quota for <span className="font-semibold text-gray-200">{quotaModal?.name}</span>
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
            <button onClick={() => setQuotaModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleUpdateQuota} disabled={actionLoading || !newQuotaGB} className="btn-primary flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Permanently delete <span className="font-semibold text-red-300">{deleteModal?.name}</span> and all their files?
            This <span className="text-red-400 font-medium">cannot be undone</span>.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={actionLoading} className="btn-danger flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
