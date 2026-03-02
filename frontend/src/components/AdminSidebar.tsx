'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, ClipboardList,
  HardDrive, ChevronRight, LogOut, Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { href: '/admin',       label: 'Overview',       icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users',           icon: Users            },
  { href: '/admin/logs',  label: 'Activity Logs',   icon: ClipboardList    },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-gray-900 border-r border-gray-800 flex-shrink-0 sticky top-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-900/40">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-100 leading-tight">Admin Panel</p>
          <p className="text-xs text-purple-400 leading-tight">DocDrive</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {adminNavItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-800/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}

        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Navigation</span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <HardDrive className="w-4 h-4 flex-shrink-0" />
          Back to My Files
        </Link>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
            {user?.name?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-purple-400">Administrator</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
