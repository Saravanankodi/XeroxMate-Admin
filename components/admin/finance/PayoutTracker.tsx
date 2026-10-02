'use client';

import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import type { PayoutRequest } from '@/types/payment';
import { PAYOUT_TIMELINE_STEPS, getPayoutStepIndex, formatDate } from '@/lib/utils';

/** Live payout processing tracker — REQUESTED → … → COMPLETED. */
export default function PayoutTracker({ request }: { request: PayoutRequest }) {
  const stepIndex = getPayoutStepIndex(request.status);
  const terminal = ['rejected', 'failed', 'cancelled'].includes(request.status);
  const terminalEntry = terminal ? request.timeline[request.timeline.length - 1] : undefined;

  return (
    <div className="p-4 rounded-xl bg-[#181824] border border-[#242436]">
      <div className="flex items-center justify-between border-b border-[#262638] pb-2.5 mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payout Processing Tracker</h4>
        <span className="text-[10px] text-slate-500 font-mono">{request.payoutId ?? request.id}</span>
      </div>

      <div className="flex items-start justify-between gap-1.5 overflow-x-auto pb-1">
        {PAYOUT_TIMELINE_STEPS.map((step, idx) => {
          const entry = request.timeline.filter((t) => t.status === step.key).pop();
          const isDone = stepIndex > idx;
          const isCurrent = stepIndex === idx && !terminal;

          return (
            <div key={step.key} className="flex-1 min-w-[80px] text-center">
              <div
                className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold border ${
                  isDone
                    ? 'bg-emerald-500 text-black border-emerald-400'
                    : isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-400 animate-pulse'
                      : 'bg-[#242436] text-slate-500 border-[#33334a]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={15} />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                ) : (
                  <Circle size={13} />
                )}
              </div>
              <div
                className={`text-[10px] mt-1.5 font-semibold leading-tight ${
                  isDone ? 'text-emerald-400' : isCurrent ? 'text-indigo-300' : 'text-slate-500'
                }`}
              >
                {step.label}
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5">
                {entry ? formatDate(entry.at, true) : '—'}
              </div>
            </div>
          );
        })}
      </div>

      {terminal && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <XCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-300 capitalize">{request.status}</span>
            <span className="text-slate-400">
              {' '}— {request.rejectReason ?? terminalEntry?.note ?? 'No further processing will occur.'}
            </span>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {terminalEntry ? `${formatDate(terminalEntry.at, true)} • ${terminalEntry.by}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Full stage history */}
      <div className="mt-4 space-y-2">
        {request.timeline.map((t, i) => (
          <div key={`${t.status}-${i}`} className="flex items-start justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-slate-200 capitalize">{t.status.replace(/_/g, ' ')}</span>
              <span className="text-slate-500"> — {t.note ?? 'Status updated'}</span>
              {t.reference && <span className="text-indigo-300 font-mono"> • Ref: {t.reference}</span>}
            </div>
            <div className="text-right flex-shrink-0 text-slate-500 whitespace-nowrap">
              <div>{formatDate(t.at, true)}</div>
              <div className="text-[10px] text-slate-600">{t.by}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
