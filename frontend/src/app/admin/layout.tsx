'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { Loader2, Shield, LayoutDashboard, Users, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/admin',       label: 'Overview', icon: LayoutDashboard, exact: true  },
  { href: '/admin/users', label: 'Users',    icon: Users                         },
  { href: '/admin/logs',  label: 'Logs',     icon: ClipboardList                 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-purple-700 flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-100">Admin Panel</span>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav — admin-specific */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 flex">
          {mobileNavItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors',
                  active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]')} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

