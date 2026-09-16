'use client';

import { useEffect, useRef } from 'react';
import { UserPlus, Store, ShoppingBag, CheckCircle, XCircle, AlertCircle, CreditCard, ShieldOff } from 'lucide-react';
import { ActivityItem } from '@/types/analytics';
import { formatRelativeTime } from '@/lib/utils';

const mockNotifications: ActivityItem[] = [
  { id: 'N-001', type: 'user_registered', title: 'New user registered', subtitle: 'Dhinesh Prabu joined XEROXMATE', timestamp: '2026-09-12T08:00:00Z', entityId: 'USR-035', entityType: 'user' },
  { id: 'N-002', type: 'order_placed', title: 'New order placed', subtitle: 'OMX-1033 — Murugan Vel', timestamp: '2026-09-12T17:50:00Z', entityId: 'OMX-1033', entityType: 'order' },
  { id: 'N-003', type: 'shopkeeper_registered', title: 'New shopkeeper pending', subtitle: 'Nandu Xerox — awaiting approval', timestamp: '2026-09-05T13:00:00Z', entityId: 'SHOP-014', entityType: 'shopkeeper' },
  { id: 'N-004', type: 'order_cancelled', title: 'Order cancelled', subtitle: 'OMX-1043 was cancelled', timestamp: '2026-09-10T18:25:00Z', entityId: 'OMX-1043', entityType: 'order' },
  { id: 'N-005', type: 'shopkeeper_suspended', title: 'Shopkeeper suspended', subtitle: 'FastPrint Solutions — high cancellation rate', timestamp: '2026-09-01T10:00:00Z', entityId: 'SHOP-011', entityType: 'shopkeeper' },
];

const iconMap: Record<ActivityItem['type'], { icon: typeof UserPlus; color: string; bg: string }> = {
  user_registered:       { icon: UserPlus,    color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  shopkeeper_registered: { icon: Store,       color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  order_placed:          { icon: ShoppingBag, color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  order_accepted:        { icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  order_delivered:       { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  order_cancelled:       { icon: XCircle,     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  payment_received:      { icon: CreditCard,  color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  shopkeeper_suspended:  { icon: ShieldOff,   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 bg-[#18181f] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a35]">
        <span className="text-white text-sm font-medium">Notifications</span>
        <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-medium">3 new</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {mockNotifications.map((notif, i) => {
          const cfg = iconMap[notif.type];
          const Icon = cfg.icon;
          return (
            <button key={notif.id} className="flex items-start gap-3 w-full px-4 py-3 hover:bg-[#2a2a35] transition-colors text-left border-b border-[#1a1a24] last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{notif.title}</span>
                  {i < 3 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                </div>
                <div className="text-[#9ca3af] text-xs truncate">{notif.subtitle}</div>
                <div className="text-[#6b7280] text-[10px] mt-0.5">{formatRelativeTime(notif.timestamp)}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-[#2a2a35]">
        <button className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors">Mark all as read</button>
      </div>
    </div>
  );
}
