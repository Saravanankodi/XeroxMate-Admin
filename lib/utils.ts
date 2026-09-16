import { type ClassValue, clsx } from 'clsx';
import { OrderStatus, PaymentStatus, DeliveryType } from '@/types/order';
import { UserStatus } from '@/types/user';
import { ShopkeeperStatus, VerificationStatus } from '@/types/shopkeeper';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateString: string, includeTime = false): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
  };
  return date.toLocaleDateString('en-IN', options);
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateString);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function getOrderStatusConfig(status: OrderStatus): { label: string; color: string; bg: string; border: string } {
  const configs: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
    new:              { label: 'New',               color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
    accepted:         { label: 'Accepted',          color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
    printing:         { label: 'Printing',          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    finishing:        { label: 'Finishing',         color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)' },
    ready_for_pickup: { label: 'Ready for Pickup',  color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.3)' },
    out_for_delivery: { label: 'Out for Delivery',  color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
    delivered:        { label: 'Delivered',         color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    cancelled:        { label: 'Cancelled',         color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  };
  return configs[status];
}

export function getUserStatusConfig(status: UserStatus): { label: string; color: string; bg: string; border: string } {
  const configs: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
    active:   { label: 'Active',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    inactive: { label: 'Inactive', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
    blocked:  { label: 'Blocked',  color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  };
  return configs[status];
}

export function getShopkeeperStatusConfig(status: ShopkeeperStatus): { label: string; color: string; bg: string; border: string } {
  const configs: Record<ShopkeeperStatus, { label: string; color: string; bg: string; border: string }> = {
    active:    { label: 'Active',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    suspended: { label: 'Suspended', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    inactive:  { label: 'Inactive',  color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
  };
  return configs[status];
}

export function getVerificationStatusConfig(status: VerificationStatus): { label: string; color: string; bg: string; border: string } {
  const configs: Record<VerificationStatus, { label: string; color: string; bg: string; border: string }> = {
    verified:   { label: 'Verified',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    unverified: { label: 'Unverified', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
  };
  return configs[status];
}

export function getPaymentStatusConfig(status: PaymentStatus): { label: string; color: string; bg: string; border: string } {
  const configs: Record<PaymentStatus, { label: string; color: string; bg: string; border: string }> = {
    paid:            { label: 'Paid',          color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
    partially_paid:  { label: 'Partial',       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    unpaid:          { label: 'Unpaid',        color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    refunded:        { label: 'Refunded',      color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
  };
  return configs[status];
}

export function getDeliveryTypeConfig(type: DeliveryType): { label: string; color: string; bg: string; border: string } {
  const configs: Record<DeliveryType, { label: string; color: string; bg: string; border: string }> = {
    pickup:   { label: 'Pickup',   color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
    delivery: { label: 'Delivery', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.3)' },
  };
  return configs[type];
}

export const ORDER_TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'printing', label: 'Printing' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export function getOrderStatusStep(status: OrderStatus): number {
  const steps: OrderStatus[] = ['new', 'accepted', 'printing', 'finishing', 'ready_for_pickup', 'out_for_delivery', 'delivered'];
  return steps.indexOf(status);
}

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
