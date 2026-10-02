'use client';

import type { ReactNode } from 'react';

interface DetailSectionProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Grouped card used inside the payment / payout detail drawers. */
export function DetailSection({ title, icon, action, children, className = '' }: DetailSectionProps) {
  return (
    <div className={`p-4 rounded-xl bg-[#181824] border border-[#242436] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[#262638] pb-2.5 mb-3">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
}

export function Field({ label, value, mono = false, className = '' }: FieldProps) {
  return (
    <div className={`flex items-start justify-between gap-3 py-1 ${className}`}>
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-slate-200 font-medium text-right break-words ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
