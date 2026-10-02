'use client';

import type { LucideIcon } from 'lucide-react';

interface FinanceKpiCardProps {
  title: string;
  value: string;
  subtext?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | 'cyan';
}

const tones: Record<NonNullable<FinanceKpiCardProps['tone']>, { bg: string; text: string }> = {
  indigo: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8' },
  emerald: { bg: 'rgba(16,185,129,0.1)', text: '#34d399' },
  amber: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b' },
  rose: { bg: 'rgba(244,63,94,0.1)', text: '#fb7185' },
  purple: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7' },
  blue: { bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
  cyan: { bg: 'rgba(34,211,238,0.1)', text: '#22d3ee' },
};

export default function FinanceKpiCard({
  title,
  value,
  subtext,
  hint,
  icon: Icon,
  tone = 'indigo',
}: FinanceKpiCardProps) {
  const palette = tones[tone];

  return (
    <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider truncate">{title}</div>
        <div className="text-xl sm:text-2xl font-bold text-white mt-1.5 truncate">{value}</div>
        {subtext && <div className="text-[11px] text-slate-500 mt-1 truncate">{subtext}</div>}
        {hint && <div className="text-[11px] font-semibold mt-0.5" style={{ color: palette.text }}>{hint}</div>}
      </div>
      <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: palette.bg, color: palette.text }}>
        <Icon size={18} />
      </div>
    </div>
  );
}
