'use client';

import type { ChipConfig } from '@/lib/utils';

interface StatusChipProps {
  config: ChipConfig;
  size?: 'sm' | 'md';
  className?: string;
}

export default function StatusChip({ config, size = 'sm', className = '' }: StatusChipProps) {
  const padding = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold border whitespace-nowrap ${padding} ${className}`}
      style={{ color: config.color, backgroundColor: config.bg, borderColor: config.border }}
    >
      {config.label}
    </span>
  );
}
