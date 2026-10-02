'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
}

/** Centered confirmation dialog used for destructive financial actions. */
export default function ConfirmModal({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  error = null,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null;

  const confirmClasses =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/50'
      : 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-2xl p-6 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                tone === 'danger' ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              {description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#202030] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {children && <div className="mt-4 space-y-3">{children}</div>}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
