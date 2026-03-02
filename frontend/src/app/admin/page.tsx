'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, HardDrive, FileText, FolderOpen,
  Lock, Ban, TrendingUp, Activity, Loader2,
  ChevronRight, UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';

export default function AdminOverviewPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => api.get('/admin/analytics').then((r) => r.data.analytics),
    refetchInterval: 30_000,
  });

  const { data: logsData } = useQuery({
    queryKey: ['admin-logs-recent'],
    queryFn: () => api.get('/admin/logs?limit=6').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const storagePercent = analytics?.total_storage_quota > 0
    ? Math.round((analytics.total_storage_used / analytics.total_storage_quota) * 100)
    : 0;

  const statCards = [
    {
      label: 'Total Users',
      value: analytics?.total_users ?? 0,
      icon: Users,
      color: 'bg-blue-700',
      glow: 'shadow-blue-900/40',
      sub: `+${analytics?.new_users_7d ?? 0} this week`,
    },
    {
      label: 'Total Files',
      value: analytics?.total_files ?? 0,
      icon: FileText,
      color: 'bg-emerald-700',
      glow: 'shadow-emerald-900/40',
      sub: `${analytics?.total_folders ?? 0} folders`,
    },
    {
      label: 'Storage Used',
      value: formatBytes(analytics?.total_storage_used ?? 0),
      icon: HardDrive,
      color: storagePercent >= 80 ? 'bg-red-700' : storagePercent >= 60 ? 'bg-yellow-700' : 'bg-purple-700',
      glow: 'shadow-purple-900/40',
      sub: `${storagePercent}% of ${formatBytes(analytics?.total_storage_quota ?? 0)}`,
    },
    {
      label: 'Locked / Disabled',
      value: `${analytics?.locked_accounts ?? 0} / ${analytics?.disabled_accounts ?? 0}`,
      icon: Lock,
      color: 'bg-red-700',
      glow: 'shadow-red-900/40',
      sub: 'accounts need attention',
    },
  ];

  const actionBadgeColor: Record<string, string> = {
    UPDATE_QUOTA: 'badge-blue',
    DISABLE_USER: 'badge-red',
    ENABLE_USER: 'badge-green',
    UNLOCK_USER: 'badge-yellow',
    DELETE_USER: 'badge-red',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">System health &amp; activity at a glance</p>
        </div>
        <Link
          href="/admin/users"
          className="btn-secondary text-xs px-3 py-2 gap-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Manage Users
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ label, value, icon: Icon, color, glow, sub }) => (
          <div key={label} className="card-sm flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${color} ${glow}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-100 leading-tight">{value}</p>
              <p className="text-xs font-medium text-gray-400">{label}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Storage Bar */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-purple-400" />
            Platform Storage
          </h3>
          <span className="text-xs text-gray-500">
            {formatBytes(analytics?.total_storage_used ?? 0)} / {formatBytes(analytics?.total_storage_quota ?? 0)}
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              storagePercent >= 80 ? 'bg-red-500' : storagePercent >= 60 ? 'bg-yellow-500' : 'bg-purple-500'
            }`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-600">{storagePercent}% consumed across all user accounts</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Storage Users Chart */}
        {analytics?.top_users?.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Top Storage Users
              </h3>
              <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={analytics.top_users.slice(0, 8)}
                margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(v) => v.split(' ')[0]}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickFormatter={(v) => formatBytes(v, 0)}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '10px', fontSize: '12px' }}
                  labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
                  formatter={(v: number) => [formatBytes(v), 'Used']}
                />
                <Bar dataKey="storage_used" radius={[4, 4, 0, 0]}>
                  {analytics.top_users.slice(0, 8).map((_: unknown, i: number) => (
                    <Cell key={i} fill={`hsl(${260 + i * 15}, 65%, 58%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent Activity Logs */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Recent Activity
            </h3>
            <Link href="/admin/logs" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {logsData?.logs?.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-6">No activity yet</p>
            )}
            {logsData?.logs?.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-800/60 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 uppercase flex-shrink-0">
                  {log.admin_name?.[0] ?? 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">
                    <span className="font-medium">{log.admin_name}</span>
                    {log.target_user_name && <> â†’ <span className="text-gray-400">{log.target_user_name}</span></>}
                  </p>
                  <p className="text-[10px] text-gray-600">{formatDate(log.timestamp)}</p>
                </div>
                <span className={actionBadgeColor[log.action] ?? 'badge-blue'}>
                  {log.action.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'New Users (7d)',   value: analytics?.new_users_7d ?? 0,       icon: UserPlus,    color: 'text-blue-400'   },
          { label: 'Total Folders',    value: analytics?.total_folders ?? 0,       icon: FolderOpen,  color: 'text-emerald-400'},
          { label: 'Locked Accounts',  value: analytics?.locked_accounts ?? 0,     icon: Lock,        color: 'text-yellow-400' },
          { label: 'Disabled Accounts',value: analytics?.disabled_accounts ?? 0,   icon: Ban,         color: 'text-red-400'    },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-100 leading-tight">{value}</p>
              <p className="text-[11px] text-gray-500 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
