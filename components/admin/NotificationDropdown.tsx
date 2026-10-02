'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  UserPlus, Store, ShoppingBag, CheckCircle, CheckCircle2, XCircle, AlertCircle,
  CreditCard, ShieldOff, Wallet, Clock, Activity, RotateCcw
} from 'lucide-react';
import { ActivityItem } from '@/types/analytics';
import type { FinanceNotification, FinanceNotificationType } from '@/types/payment';
import { formatRelativeTime } from '@/lib/utils';
import { getFinanceNotifications, markFinanceNotificationsRead, subscribeFinance } from '@/lib/finance/api';

interface IconCfg {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const mockNotifications: ActivityItem[] = [
  { id: 'N-001', type: 'user_registered', title: 'New user registered', subtitle: 'Dhinesh Prabu joined XEROXMATE', timestamp: '2026-09-12T08:00:00Z', entityId: 'USR-035', entityType: 'user' },
  { id: 'N-002', type: 'order_placed', title: 'New order placed', subtitle: 'OMX-1033 — Murugan Vel', timestamp: '2026-09-12T17:50:00Z', entityId: 'OMX-1033', entityType: 'order' },
  { id: 'N-003', type: 'shopkeeper_registered', title: 'New shopkeeper pending', subtitle: 'Nandu Xerox — awaiting approval', timestamp: '2026-09-05T13:00:00Z', entityId: 'SHOP-014', entityType: 'shopkeeper' },
  { id: 'N-004', type: 'order_cancelled', title: 'Order cancelled', subtitle: 'OMX-1043 was cancelled', timestamp: '2026-09-10T18:25:00Z', entityId: 'OMX-1043', entityType: 'order' },
  { id: 'N-005', type: 'shopkeeper_suspended', title: 'Shopkeeper suspended', subtitle: 'FastPrint Solutions — high cancellation rate', timestamp: '2026-09-01T10:00:00Z', entityId: 'SHOP-011', entityType: 'shopkeeper' },
];

const mockCfg: Record<ActivityItem['type'], IconCfg> = {
  user_registered:       { icon: UserPlus,    color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  shopkeeper_registered: { icon: Store,       color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  order_placed:          { icon: ShoppingBag, color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  order_accepted:        { icon: CheckCircle, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  order_delivered:       { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  order_cancelled:       { icon: XCircle,     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  payment_received:      { icon: CreditCard,  color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  shopkeeper_suspended:  { icon: ShieldOff,   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const financeCfg: Record<FinanceNotificationType, IconCfg> = {
  payment_received:             { icon: CreditCard,   color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  payment_verification_required:{ icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  payment_verified:             { icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  payment_declined:             { icon: XCircle,      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  payment_refunded:             { icon: RotateCcw,    color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  payout_requested:             { icon: Wallet,       color: '#818cf8', bg: 'rgba(99,102,241,0.12)' },
  payout_approved:              { icon: CheckCircle2, color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  payout_processing:            { icon: Activity,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  payout_completed:             { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  payout_rejected:              { icon: XCircle,      color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  payout_failed:                { icon: AlertCircle,  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

interface DisplayItem {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  cfg: IconCfg;
  unread: boolean;
  href?: string;
}

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [financeNotifs, setFinanceNotifs] = useState<FinanceNotification[]>([]);
  const [mockRead, setMockRead] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const load = () => {
      getFinanceNotifications('admin')
        .then(setFinanceNotifs)
        .catch(() => undefined);
    };
    load();
    return subscribeFinance(load);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const markAllRead = () => {
    if (marking) return;
    setMarking(true);
    markFinanceNotificationsRead()
      .then(() => {
        setFinanceNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
        setMockRead(true);
      })
      .catch(() => undefined)
      .finally(() => setMarking(false));
  };

  const financeItems: DisplayItem[] = financeNotifs.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.subtitle,
    timestamp: n.timestamp,
    cfg: financeCfg[n.type],
    unread: !n.read,
    href: n.entityType === 'payment' ? '/admin/payments' : '/admin/payouts',
  }));

  const mockItems: DisplayItem[] = mockNotifications.map((notif, i) => ({
    id: notif.id,
    title: notif.title,
    subtitle: notif.subtitle,
    timestamp: notif.timestamp,
    cfg: mockCfg[notif.type],
    unread: !mockRead && i < 3,
  }));

  const items = [...financeItems, ...mockItems].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const unreadCount = items.filter((it) => it.unread).length;

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 bg-[#18181f] border border-[#2a2a35] rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a35]">
        <span className="text-white text-sm font-medium">Notifications</span>
        {unreadCount > 0 && (
          <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-medium">
            {unreadCount} new
          </span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.map((notif) => {
          const Icon = notif.cfg.icon;
          return (
            <button
              key={notif.id}
              onClick={() => {
                if (notif.href) {
                  router.push(notif.href);
                  onClose();
                }
              }}
              className={`flex items-start gap-3 w-full px-4 py-3 transition-colors text-left border-b border-[#1a1a24] last:border-0 ${
                notif.href ? 'hover:bg-[#2a2a35]' : 'cursor-default'
              }`}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: notif.cfg.bg }}>
                <Icon size={14} style={{ color: notif.cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-medium">{notif.title}</span>
                  {notif.unread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                </div>
                <div className="text-[#9ca3af] text-xs truncate">{notif.subtitle}</div>
                <div className="text-[#6b7280] text-[10px] mt-0.5">{formatRelativeTime(notif.timestamp)}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-[#2a2a35]">
        <button
          onClick={markAllRead}
          disabled={marking || unreadCount === 0}
          className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {marking ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>
    </div>
  );
}
