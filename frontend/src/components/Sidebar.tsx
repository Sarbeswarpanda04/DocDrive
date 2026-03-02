'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDrive, Settings, Shield, LogOut, ChevronRight, Star, Clock } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { StorageBar } from './StorageBar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'My Files', icon: HardDrive },
  { href: '/starred',   label: 'Starred',  icon: Star       },
  { href: '/recent',    label: 'Recent',   icon: Clock      },
  { href: '/settings',  label: 'Settings', icon: Settings   },
];

const adminNav = [{ href: '/admin', label: 'Admin Panel', icon: Shield }];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    /* Desktop only — mobile uses MobileBottomNav */
    <aside className="hidden md:flex flex-col w-64 h-screen bg-gray-900 border-r border-gray-800 flex-shrink-0 sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <HardDrive className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-bold text-gray-100">DocDrive</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-brand-900/50 text-brand-300 border border-brand-800/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {pathname.startsWith(href) && <ChevronRight className="w-3 h-3 ml-auto" />}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Admin</span>
            </div>
            {adminNav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-800/50'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Storage & User */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-4">
        {user && (
          <StorageBar used={user.storage_used} quota={user.storage_quota} />
        )}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 active:bg-red-900/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
