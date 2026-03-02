'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

const PAGE_SIZE = 20;

const ACTION_BADGE: Record<string, string> = {
  UPDATE_QUOTA:  'badge-blue',
  DISABLE_USER:  'badge-red',
  ENABLE_USER:   'badge-green',
  UNLOCK_USER:   'badge-yellow',
  DELETE_USER:   'badge-red',
};

const ALL_ACTIONS = ['UPDATE_QUOTA', 'DISABLE_USER', 'ENABLE_USER', 'UNLOCK_USER', 'DELETE_USER'];

export default function AdminLogsPage() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      return api.get(`/admin/logs?${params}`).then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const logs: any[] = data?.logs ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = logs;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            Activity Logs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total entries</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl p-1 flex-shrink-0 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-gray-500 ml-1.5 flex-shrink-0" />
          <button
            onClick={() => { setActionFilter('all'); setPage(0); }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              actionFilter === 'all' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            )}
          >
            All
          </button>
          {ALL_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => { setActionFilter(a); setPage(0); }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                actionFilter === a ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              {a.replace(/_/g, ' ')}
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
            <ClipboardList className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No log entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Admin', 'Action', 'Target User', 'Details', 'Time'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-800/60 flex items-center justify-center text-[10px] font-bold text-purple-300 uppercase flex-shrink-0">
                          {log.admin_name?.[0] ?? 'A'}
                        </div>
                        <span className="text-gray-200 font-medium text-sm whitespace-nowrap">{log.admin_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={ACTION_BADGE[log.action] ?? 'badge-blue'}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {log.target_user_name ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page + 1} of {totalPages} ({total} entries)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3, totalPages - 7)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-xl text-xs font-medium transition-colors',
                    p === page
                      ? 'bg-purple-700 text-white'
                      : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  )}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
