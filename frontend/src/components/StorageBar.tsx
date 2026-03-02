'use client';

import { formatBytes, storagePercent, storageColor } from '@/lib/utils';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StorageBarProps {
  used: number;
  quota: number;
  showDetails?: boolean;
}

export function StorageBar({ used, quota, showDetails = true }: StorageBarProps) {
  const percent = storagePercent(used, quota);
  const barColor = storageColor(percent);

  return (
    <div className="w-full space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-gray-400">
            <HardDrive className="w-4 h-4" />
            Storage
          </span>
          <span className={cn('font-medium', percent >= 90 ? 'text-red-400' : 'text-gray-300')}>
            {formatBytes(used)} / {formatBytes(quota)}
          </span>
        </div>
      )}

      <div className="relative h-2 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{percent}% used</span>
          <span>{formatBytes(quota - used)} available</span>
        </div>
      )}

      {percent >= 90 && (
        <p className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          {percent >= 100 ? 'Storage full — delete files to upload more' : 'Storage almost full'}
        </p>
      )}
    </div>
  );
}
