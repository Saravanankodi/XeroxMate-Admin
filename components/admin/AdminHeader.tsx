'use client';

import { useState } from 'react';
import { Menu, Bell, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationDropdown from './NotificationDropdown';
import { logoutAdmin } from '@/lib/firebase/logout';

interface AdminHeaderProps {
  title: string;
  description?: string;
  onMenuClick: () => void;
}

export default function AdminHeader({ title, description, onMenuClick }: AdminHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-4 px-4 sm:px-6 h-16 bg-[#0a0a0f]/95 backdrop-blur border-b border-[#2a2a35]">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1a1a24] transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-semibold text-base sm:text-lg leading-tight truncate">{title}</h1>
          {description && (
            <p className="text-[#6b7280] text-xs truncate hidden sm:block">{description}</p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg bg-[#1a1a24] border border-[#2a2a35] text-[#6b7280] hover:text-white hover:border-[#3a3a45] transition-all text-sm"
          >
            <Search size={15} />
            <span className="hidden sm:block text-xs">Search...</span>
            <kbd className="hidden md:block text-[10px] bg-[#2a2a35] px-1.5 py-0.5 rounded text-[#6b7280]">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="relative p-2 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#1a1a24] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>
            {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#1a1a24] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <ChevronDown size={14} className="text-[#6b7280] hidden sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#18181f] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[#2a2a35]">
                  <div className="text-white text-sm font-medium">Admin User</div>
                  <div className="text-[#6b7280] text-xs">admin@xeroxmate.in</div>
                </div>
                <div className="p-1">
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#2a2a35] text-sm transition-colors">
                    <User size={14} /> My Profile
                  </button>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#2a2a35] text-sm transition-colors">
                    <Settings size={14} /> Settings
                  </button>
                  <div className="border-t border-[#2a2a35] my-1" />
                  <button onClick={logoutAdmin} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-400/10 text-sm transition-colors">
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
