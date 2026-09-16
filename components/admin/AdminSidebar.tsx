'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Store, Users, ShoppingBag, BarChart3, Settings,
  ChevronLeft, Printer, LogOut, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/shopkeepers', label: 'Shopkeepers', icon: Store },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export default function AdminSidebar({ open = true, onClose, isMobileDrawer = false }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard' || pathname === '/admin';
    return pathname.startsWith(href);
  };

  const content = (
    <div className="flex flex-col h-full bg-[#111118] border-r border-[#2a2a35]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#2a2a35]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Printer size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-wide leading-tight">XEROXMATE</div>
            <div className="text-[#6b7280] text-[10px] font-medium tracking-widest uppercase leading-tight">Admin Panel</div>
          </div>
        </div>
        {isMobileDrawer && (
          <button onClick={onClose} className="p-1 rounded text-[#6b7280] hover:text-white hover:bg-[#2a2a35] transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={isMobileDrawer ? onClose : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/20'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a24] border border-transparent'
              )}
            >
              <Icon size={17} className={active ? 'text-indigo-400' : 'text-[#6b7280]'} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </Link>
          );
        })}

        <div className="pt-3 mt-2 border-t border-[#2a2a35]" />

        <Link
          href="/admin/settings"
          onClick={isMobileDrawer ? onClose : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
            pathname.startsWith('/admin/settings')
              ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-600/20'
              : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a24] border border-transparent'
          )}
        >
          <Settings size={17} className={pathname.startsWith('/admin/settings') ? 'text-indigo-400' : 'text-[#6b7280]'} />
          Settings
        </Link>
      </nav>

      {/* Admin Profile */}
      <div className="px-3 pb-4 border-t border-[#2a2a35] pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a24] transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">Admin User</div>
            <div className="text-[#6b7280] text-xs truncate">Administrator</div>
          </div>
        </div>
        <button className="flex items-center gap-3 px-3 py-2 mt-1 rounded-lg text-[#6b7280] hover:text-red-400 hover:bg-red-400/5 transition-all duration-150 w-full text-sm">
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </div>
  );

  if (isMobileDrawer) {
    return (
      <>
        {/* Overlay */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
        {/* Drawer */}
        <div className={cn(
          'fixed left-0 top-0 bottom-0 z-40 w-64 transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full'
        )}>
          {content}
        </div>
      </>
    );
  }

  return (
    <div className={cn(
      'hidden lg:flex flex-col w-60 flex-shrink-0 h-screen sticky top-0',
      !open && 'hidden'
    )}>
      {content}
    </div>
  );
}
