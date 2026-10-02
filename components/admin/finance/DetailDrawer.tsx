'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  chips?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

/** Right-hand slide-over used by the payment and payout detail views. */
export default function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  chips,
  children,
  footer,
  maxWidth = 'max-w-3xl',
}: DetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-[#12121a] border-l border-[#2a2a38] h-full overflow-y-auto z-10 shadow-2xl p-5 sm:p-8 flex flex-col`}
      >
        <div className="flex items-start justify-between border-b border-[#2a2a38] pb-5 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-mono truncate">{title}</h2>
              {chips}
            </div>
            {subtitle && <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#202030] transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 pt-5 space-y-5">{children}</div>

        {footer && (
          <div className="sticky bottom-0 -mx-5 sm:-mx-8 px-5 sm:px-8 pt-4 pb-1 mt-4 bg-[#12121a] border-t border-[#2a2a38]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
