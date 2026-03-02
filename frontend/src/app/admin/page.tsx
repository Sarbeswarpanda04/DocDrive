'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Modal } from '@/components/Modal';
import {
  Users, HardDrive, Lock, Ban, Activity, Loader2,
  ToggleLeft, ToggleRight, Unlock, Pencil
} from 'lucide-react';
import api from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';

type Tab = 'overview' | 'users' | 'logs';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [quotaModal, setQuotaModal] = useState<{ id: string; name: string; quota: number } | null>(null);
  const [newQuotaGB, setNewQuotaGB] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics').then((r) => r.data.analytics),
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.users),
    enabled: tab === 'users',
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => api.get('/admin/logs').then((r) => r.data),
    enabled: tab === 'logs',
  });

  const handleUpdateQuota = async () => {
    if (!quotaModal || !newQuotaGB) return;
    const bytes = Math.round(parseFloat(newQuotaGB) * 1024 * 1024 * 1024);
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${quotaModal.id}/quota`, { quota_bytes: bytes });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      setQuotaModal(null);
      setNewQuotaGB('');
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/unlock`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {(['overview', 'users', 'logs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize
              ${tab === t ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={analytics?.total_users ?? 0} icon={Users} color="bg-brand-600" />
                <StatCard label="Total Storage" value={formatBytes(analytics?.total_storage_used ?? 0)} icon={HardDrive} color="bg-emerald-600" />
                <StatCard label="Locked Accounts" value={analytics?.locked_accounts ?? 0} icon={Lock} color="bg-yellow-600" />
                <StatCard label="Disabled Accounts" value={analytics?.disabled_accounts ?? 0} icon={Ban} color="bg-red-600" />
              </div>

              {/* Storage Chart */}
              {analytics?.top_users?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-400" />
                    Top Storage Users
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.top_users.slice(0, 10)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => formatBytes(v, 0)} />
                      <Tooltip
                        contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        formatter={(v: number) => [formatBytes(v), 'Used']}
                      />
                      <Bar dataKey="storage_used" radius={[4, 4, 0, 0]}>
                        {analytics.top_users.slice(0, 10).map((_: any, i: number) => (
                          <Cell key={i} fill={`hsl(${220 + i * 10}, 70%, 55%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card overflow-hidden p-0">
          {usersLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['User', 'Storage', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users?.map((user: any) => {
                  const percent = user.storage_quota > 0
                    ? Math.round((user.storage_used / user.storage_quota) * 100) : 0;

                  return (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                            {user.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-200">{user.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(user.created_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">{formatBytes(user.storage_used)}</span>
                            <span className="text-gray-500">{formatBytes(user.storage_quota)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-brand-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600">{percent}% used</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {user.account_disabled && <span className="badge-red">Disabled</span>}
                          {user.account_locked && <span className="badge-yellow">Locked</span>}
                          {!user.account_disabled && !user.account_locked && (
                            <span className="badge-green">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setQuotaModal({ id: user.id, name: user.name, quota: user.storage_quota });
                              setNewQuotaGB(`${(user.storage_quota / (1024 ** 3)).toFixed(1)}`);
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-brand-400 hover:bg-brand-900/20 transition-colors"
                            title="Edit Quota"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleDisable(user.id)}
                            className={`p-1.5 rounded-md transition-colors ${
                              user.account_disabled
                                ? 'text-green-400 hover:bg-green-900/20'
                                : 'text-red-400 hover:bg-red-900/20'
                            }`}
                            title={user.account_disabled ? 'Enable' : 'Disable'}
                          >
                            {user.account_disabled
                              ? <ToggleRight className="w-3.5 h-3.5" />
                              : <ToggleLeft className="w-3.5 h-3.5" />}
                          </button>
                          {user.account_locked && (
                            <button
                              onClick={() => handleUnlock(user.id)}
                              className="p-1.5 rounded-md text-yellow-400 hover:bg-yellow-900/20 transition-colors"
                              title="Unlock"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Logs */}
      {tab === 'logs' && (
        <div className="card overflow-hidden p-0">
          {logsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-gray-600 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Admin', 'Action', 'Target', 'Time'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logsData?.logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-300 font-medium">{log.admin_name}</td>
                    <td className="px-4 py-3">
                      <span className="badge-blue">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{log.target_user_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Quota Edit Modal */}
      <Modal open={!!quotaModal} onClose={() => setQuotaModal(null)} title="Edit Storage Quota" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Set storage quota for <span className="text-gray-200 font-medium">{quotaModal?.name}</span>
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
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setQuotaModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleUpdateQuota} disabled={actionLoading} className="btn-primary flex-1">
              {actionLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save Quota'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
