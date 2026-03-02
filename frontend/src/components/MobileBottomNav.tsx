'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HardDrive, Star, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home',     icon: HardDrive },
  { href: '/starred',   label: 'Starred',  icon: Star       },
  { href: '/recent',    label: 'Recent',   icon: Clock      },
  { href: '/settings',  label: 'Settings', icon: Settings   },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-gray-900/95 backdrop-blur-md border-t border-gray-800 safe-bottom">
      <div className="flex items-stretch h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                active
                  ? 'text-brand-400'
                  : 'text-gray-500 hover:text-gray-300 active:text-gray-200'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-colors',
                active ? 'bg-brand-900/50' : ''
              )}>
                <Icon className={cn('w-5 h-5', active && 'drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]')} />
              </div>
              <span className={cn('text-[10px] font-medium leading-none', active ? 'text-brand-400' : 'text-gray-500')}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
