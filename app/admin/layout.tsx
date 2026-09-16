'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/admin/dashboard': {
    title: 'Dashboard Overview',
    description: 'Monitor real-time print orders, revenue growth, and platform health.',
  },
  '/admin/shopkeepers': {
    title: 'Shopkeeper Directory',
    description: 'Manage verified xerox shop partners, onboarding approvals, and store statuses.',
  },
  '/admin/users': {
    title: 'User Management',
    description: 'Track registered users, order statistics, and customer accounts.',
  },
  '/admin/orders': {
    title: 'Order Monitoring',
    description: 'View, filter, and update print job progress and payment statuses.',
  },
  '/admin/analytics': {
    title: 'Analytics & Insights',
    description: 'Deep dive into revenue trends, order volume distribution, and growth performance.',
  },
  '/admin/settings': {
    title: 'Platform Settings',
    description: 'Configure pricing rules, commission rates, and administrative preferences.',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const pageMeta = pageTitles[pathname] || {
    title: 'Admin Portal',
    description: 'Xerox Mate Management Console',
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Desktop Sidebar */}
      <AdminSidebar open={true} />

      {/* Mobile Drawer Sidebar */}
      <AdminSidebar
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        isMobileDrawer={true}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={pageMeta.title}
          description={pageMeta.description}
          onMenuClick={() => setMobileDrawerOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
