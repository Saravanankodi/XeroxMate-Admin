'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Wallet, Search, ArrowUpDown, Download, Filter, Eye, CheckCircle2, XCircle, Clock,
  Store, FileText, History, Info, AlertCircle, IndianRupee, Ban, ScrollText,
  Activity, CreditCard, TrendingUp, Award
} from 'lucide-react';
import {
  getPayoutRequests, getPayoutRequestById, getPayoutContributingPayments,
  getShopkeeperBalances, getFinancialStats, getCommissionRate,
  createPayoutRequest, holdPayoutById, approvePayoutById, processPayoutById,
  completePayoutById, rejectPayoutById, failPayoutById, cancelPayoutById,
  addPayoutNoteById, getAuditLogsForEntity, subscribeFinance, toFinanceMessage
} from '@/lib/finance/api';
import { useFinanceSync } from '@/lib/finance/useFinanceSync';
import { MIN_PAYOUT_AMOUNT } from '@/lib/finance/store';
import { exportPayoutsCsv, exportBalancesCsv } from '@/lib/finance/export';
import type {
  AuditLogEntry, FinancialStats, Payment, PayoutFilters, PayoutMethod,
  PayoutRequest, PayoutStatus, ShopkeeperBalance
} from '@/types/payment';
import {
  formatCurrency, formatDate, formatRelativeTime,
  getPayoutStatusConfig, getPayoutMethodLabel, getFinancePaymentStatusConfig
} from '@/lib/utils';
import FinanceKpiCard from '@/components/admin/finance/FinanceKpiCard';
import StatusChip from '@/components/admin/finance/StatusChip';
import DetailDrawer from '@/components/admin/finance/DetailDrawer';
import { DetailSection, Field } from '@/components/admin/finance/DetailSection';
import ConfirmModal from '@/components/admin/finance/ConfirmModal';
import PayoutTracker from '@/components/admin/finance/PayoutTracker';

type ViewTab = 'payouts' | 'balances';
type PayoutAction = 'hold' | 'approve' | 'reject' | 'cancel' | 'process' | 'complete' | 'fail' | 'note';
type ModalKind = PayoutAction | 'new' | null;

const PAYOUT_TABS: { key: string; label: string; status: PayoutStatus | '' }[] = [
  { key: 'all', label: 'All Requests', status: '' },
  { key: 'requested', label: 'Requested', status: 'requested' },
  { key: 'under_review', label: 'Under Review', status: 'under_review' },
  { key: 'approved', label: 'Approved', status: 'approved' },
  { key: 'processing', label: 'Processing', status: 'processing' },
  { key: 'completed', label: 'Completed', status: 'completed' },
  { key: 'rejected', label: 'Rejected', status: 'rejected' },
];

const ACTIONS_BY_STATUS: Record<PayoutStatus, PayoutAction[]> = {
  requested: ['approve', 'hold', 'reject', 'cancel'],
  under_review: ['approve', 'reject', 'cancel'],
  approved: ['process', 'hold', 'reject', 'fail'],
  processing: ['complete', 'fail'],
  completed: ['note'],
  rejected: ['note'],
  cancelled: ['note'],
  failed: ['note'],
};

interface ActionMeta {
  title: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  icon: LucideIcon;
  description: (r: PayoutRequest, rate: number) => string;
}

const ACTION_META: Record<PayoutAction, ActionMeta> = {
  approve: {
    title: 'Approve payout request',
    confirmLabel: 'Approve Payout',
    tone: 'primary',
    icon: CheckCircle2,
    description: (r, rate) =>
      `${formatCurrency(r.requestedAmount)} will be approved for ${r.shopName} at the current ${rate}% platform commission. The amount stays reserved until the transfer completes.`,
  },
  hold: {
    title: 'Place payout under review',
    confirmLabel: 'Hold for Review',
    tone: 'primary',
    icon: Clock,
    description: (r) =>
      `${r.id} moves to Under Review. The reserved amount stays on hold until it is approved, rejected or cancelled.`,
  },
  reject: {
    title: 'Reject payout request',
    confirmLabel: 'Reject Payout',
    tone: 'danger',
    icon: XCircle,
    description: (r) =>
      `Rejecting ${r.id} closes the request and returns ${formatCurrency(r.requestedAmount)} to the available balance of ${r.shopName}.`,
  },
  cancel: {
    title: 'Cancel payout request',
    confirmLabel: 'Cancel Request',
    tone: 'danger',
    icon: Ban,
    description: (r) =>
      `Recorded as cancelled by the shopkeeper. ${formatCurrency(r.requestedAmount)} returns to the available balance of ${r.shopName}.`,
  },
  process: {
    title: 'Start payout transfer',
    confirmLabel: 'Start Transfer',
    tone: 'primary',
    icon: Activity,
    description: (r) =>
      `Marks ${r.id} as Processing. Funds of ${formatCurrency(r.requestedAmount)} are being transferred to the registered account.`,
  },
  complete: {
    title: 'Complete payout',
    confirmLabel: 'Mark Completed',
    tone: 'primary',
    icon: CheckCircle2,
    description: (r) =>
      `Confirms the transfer of ${formatCurrency(r.requestedAmount)} to ${r.shopName} and releases the reserved payments.`,
  },
  fail: {
    title: 'Mark payout as failed',
    confirmLabel: 'Mark Failed',
    tone: 'danger',
    icon: AlertCircle,
    description: (r) =>
      `The transfer of ${formatCurrency(r.requestedAmount)} failed. The reserved amount returns to the available balance.`,
  },
  note: {
    title: 'Add internal note',
    confirmLabel: 'Save Note',
    tone: 'primary',
    icon: ScrollText,
    description: (r) =>
      `Adds an internal note to ${r.id}. The note is recorded in the financial audit trail.`,
  },
};

const REJECT_REASONS = [
  'Amount does not match verified earnings',
  'Suspicious payout activity',
  'Shop KYC documents missing',
  'Invalid payout account details',
  'Duplicate payout request',
  'Other',
];

const FAIL_REASONS = [
  'Bank transfer rejected by beneficiary bank',
  'Account closed or frozen',
  'Incorrect account details',
  'Transfer limit exceeded',
  'Other',
];

const METHOD_OPTIONS: PayoutMethod[] = ['bank_transfer', 'upi', 'wallet'];

const inputCls =
  'px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500';

const actionBtnCls: Record<PayoutAction, string> = {
  approve: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  process: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  complete: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  hold: 'bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25',
  reject: 'bg-rose-600 hover:bg-rose-500 text-white',
  fail: 'bg-rose-600 hover:bg-rose-500 text-white',
  cancel: 'bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white',
  note: 'bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white',
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export default function AdminPayoutsPage() {
  const [view, setView] = useState<ViewTab>('payouts');
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [balances, setBalances] = useState<ShopkeeperBalance[]>([]);
  const [commissionRate, setCommissionRate] = useState(10);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | ''>('');
  const [shopkeeperFilter, setShopkeeperFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<PayoutMethod | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<PayoutFilters['sortBy']>>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selected, setSelected] = useState<PayoutRequest | null>(null);
  const [contributing, setContributing] = useState<{ requestId: string; payments: Payment[] } | null>(null);
  const [entityAudit, setEntityAudit] = useState<{ requestId: string; logs: AuditLogEntry[] } | null>(null);

  const [modal, setModal] = useState<ModalKind>(null);
  const [actionNote, setActionNote] = useState('');
  const [reason, setReason] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [reference, setReference] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newShopId, setNewShopId] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState<PayoutMethod>('bank_transfer');
  const [newAccount, setNewAccount] = useState('');

  const buildFilters = useCallback(
    (pageSize = 10): PayoutFilters => ({
      search,
      status: statusFilter,
      shopkeeperId: shopkeeperFilter,
      method: methodFilter,
      dateFrom,
      dateTo,
      minAmount: minAmount === '' ? null : Number(minAmount),
      maxAmount: maxAmount === '' ? null : Number(maxAmount),
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [search, statusFilter, shopkeeperFilter, methodFilter, dateFrom, dateTo, minAmount, maxAmount, sortBy, sortDir, page]
  );

  const fetchRequests = useCallback(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return getPayoutRequests(buildFilters());
      })
      .then((res) => {
        setRequests(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((err) => setBanner({ type: 'error', text: toFinanceMessage(err) }))
      .finally(() => setLoading(false));
  }, [buildFilters]);

  const fetchOverview = useCallback(() => {
    Promise.all([getFinancialStats(), getShopkeeperBalances(), getCommissionRate()])
      .then(([s, b, r]) => {
        setStats(s);
        setBalances(b);
        setCommissionRate(r);
      })
      .catch((err) => console.error('Failed to load payout overview', err));
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Live updates — every financial change refreshes this screen.
  useFinanceSync(() => {
    fetchRequests();
    fetchOverview();
  });

  // Keep the open drawer in sync with the latest store state.
  useEffect(() => {
    if (!selected) return;
    const requestId = selected.id;
    const unsubscribe = subscribeFinance(() => {
      getPayoutRequestById(requestId)
        .then((r) => {
          if (r) setSelected(r);
        })
        .catch(() => undefined);
    });
    return unsubscribe;
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const requestId = selected.id;
    getPayoutContributingPayments(selected)
      .then((p) => {
        if (active) setContributing({ requestId, payments: p });
      })
      .catch(() => {
        if (active) setContributing({ requestId, payments: [] });
      });
    getAuditLogsForEntity({ payoutRequestId: requestId })
      .then((logs) => {
        if (active) setEntityAudit({ requestId, logs });
      })
      .catch(() => {
        if (active) setEntityAudit({ requestId, logs: [] });
      });
    return () => {
      active = false;
    };
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAfterMutation = (updated: PayoutRequest) => {
    setSelected(updated);
    fetchRequests();
    fetchOverview();
  };

  const resetActionFields = () => {
    setActionNote('');
    setReason('');
    setReasonOther('');
    setReference('');
  };

  const runAction = (action: () => Promise<PayoutRequest>, successText: string) => {
    setActionLoading(true);
    setActionError(null);
    action()
      .then((updated) => {
        refreshAfterMutation(updated);
        setBanner({ type: 'success', text: successText });
        setModal(null);
        resetActionFields();
        window.setTimeout(() => setBanner(null), 4000);
      })
      .catch((err) => setActionError(toFinanceMessage(err)))
      .finally(() => setActionLoading(false));
  };

  const handleConfirm = () => {
    if (!selected || !modal || modal === 'new') return;
    const requestId = selected.id;

    if (modal === 'note') {
      if (!actionNote.trim()) {
        setActionError('Note cannot be empty.');
        return;
      }
      runAction(() => addPayoutNoteById(requestId, actionNote.trim()), `Note added to ${requestId}.`);
      return;
    }

    if (modal === 'reject' || modal === 'fail') {
      const resolved = reason === 'Other' ? reasonOther.trim() : reason;
      if (!resolved) {
        setActionError('Please select a reason to continue.');
        return;
      }
      if (modal === 'reject') {
        runAction(
          () => rejectPayoutById(requestId, { reason: resolved, note: actionNote || undefined }),
          `${requestId} rejected — reserved amount returned to the balance.`
        );
      } else {
        runAction(
          () => failPayoutById(requestId, { reason: resolved, note: actionNote || undefined }),
          `${requestId} marked as failed — reserved amount returned to the balance.`
        );
      }
      return;
    }

    switch (modal) {
      case 'approve':
        runAction(
          () => approvePayoutById(requestId, { note: actionNote || undefined }),
          `${requestId} approved — commission applied and funds reserved.`
        );
        break;
      case 'hold':
        runAction(
          () => holdPayoutById(requestId, { note: actionNote || undefined }),
          `${requestId} moved to Under Review.`
        );
        break;
      case 'cancel':
        runAction(
          () => cancelPayoutById(requestId, { reason: actionNote || undefined }),
          `${requestId} cancelled — reserved amount returned to the balance.`
        );
        break;
      case 'process':
        runAction(
          () => processPayoutById(requestId, { note: actionNote || undefined }),
          `${requestId} marked as Processing — bank transfer initiated.`
        );
        break;
      case 'complete':
        runAction(
          () =>
            completePayoutById(requestId, {
              reference: reference.trim() || undefined,
              note: actionNote || undefined,
            }),
          `${requestId} completed — payout settled successfully.`
        );
        break;
      default:
        break;
    }
  };

  const openAction = (action: PayoutAction) => {
    resetActionFields();
    setActionError(null);
    setModal(action);
  };

  const openNewRequest = (shopkeeperId = '', amount = '') => {
    setNewShopId(shopkeeperId);
    setNewAmount(amount);
    setNewMethod('bank_transfer');
    setNewAccount('');
    setActionError(null);
    setModal('new');
  };

  const handleCreateRequest = () => {
    const amount = Number(newAmount);
    const shop = balances.find((b) => b.shopkeeperId === newShopId);
    if (!shop) {
      setActionError('Select a shopkeeper to continue.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError('Enter a valid payout amount.');
      return;
    }
    if (amount < MIN_PAYOUT_AMOUNT) {
      setActionError(`Minimum payout amount is ${formatCurrency(MIN_PAYOUT_AMOUNT)}.`);
      return;
    }
    if (amount > shop.availableBalance) {
      setActionError(`Amount exceeds the available balance of ${formatCurrency(shop.availableBalance)}.`);
      return;
    }

    setActionLoading(true);
    setActionError(null);
    createPayoutRequest({
      shopkeeperId: shop.shopkeeperId,
      requestedAmount: amount,
      payoutMethod: newMethod,
      accountDetails: newAccount.trim(),
    })
      .then((req) => {
        setModal(null);
        setBanner({ type: 'success', text: `${req.id} created for ${req.shopName}.` });
        setView('payouts');
        setPage(1);
        fetchRequests();
        fetchOverview();
        window.setTimeout(() => setBanner(null), 4000);
      })
      .catch((err) => setActionError(toFinanceMessage(err)))
      .finally(() => setActionLoading(false));
  };

  const exportCurrent = () => {
    if (view === 'balances') {
      exportBalancesCsv(balances);
      setBanner({ type: 'success', text: `Exported ${balances.length} shopkeeper balances.` });
      window.setTimeout(() => setBanner(null), 3000);
      return;
    }
    getPayoutRequests({ ...buildFilters(10000), page: 1 })
      .then((res) => {
        exportPayoutsCsv(res.data);
        setBanner({ type: 'success', text: `Exported ${res.data.length} payout requests.` });
        window.setTimeout(() => setBanner(null), 3000);
      })
      .catch((err) => setBanner({ type: 'error', text: toFinanceMessage(err) }));
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setShopkeeperFilter('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  };

  const tabStatus =
    statusFilter === '' ? 'all' : PAYOUT_TABS.find((t) => t.status === statusFilter)?.key ?? 'none';
  const hasActiveFilters =
    Boolean(search || statusFilter || shopkeeperFilter || methodFilter || dateFrom || dateTo || minAmount || maxAmount);

  const openableBalances = balances.filter((b) => !b.openRequestId && b.availableBalance >= MIN_PAYOUT_AMOUNT);

  const balanceTotals = balances.reduce(
    (acc, b) => ({
      earnings: round2(acc.earnings + b.verifiedEarnings),
      locked: round2(acc.locked + b.lockedAmount),
      available: round2(acc.available + b.availableBalance),
      paidOut: round2(acc.paidOut + b.paidOutAmount),
    }),
    { earnings: 0, locked: 0, available: 0, paidOut: 0 }
  );

  const activeContributing =
    contributing && selected && contributing.requestId === selected.id ? contributing.payments : [];
  const activeAudit = entityAudit && selected && entityAudit.requestId === selected.id ? entityAudit.logs : [];
  const selectedBalance = selected ? balances.find((b) => b.shopkeeperId === selected.shopkeeperId) : undefined;
  const availableActions = selected ? ACTIONS_BY_STATUS[selected.status] : [];
  const commissionApplicable = selected
    ? ['approved', 'processing', 'completed'].includes(selected.status)
    : false;

  const previewCommission = (amount: number) => {
    const commission = round2((amount * commissionRate) / 100);
    return { commission, net: round2(amount - commission) };
  };

  const footerHint = (): string => {
    if (!selected) return '';
    switch (selected.status) {
      case 'requested':
        return 'Awaiting admin review — the amount is reserved from the available balance.';
      case 'under_review':
        return 'Under review — the amount stays reserved until a decision is made.';
      case 'approved':
        return 'Commission applied and funds reserved — ready to transfer.';
      case 'processing':
        return 'Bank transfer in progress with the finance team.';
      case 'completed':
        return `Settled on ${formatDate(selected.completedAt ?? selected.updatedAt, true)}${
          selected.transactionReference ? ` • Ref ${selected.transactionReference}` : ''
        }`;
      case 'rejected':
      case 'cancelled':
      case 'failed':
        return 'Closed — the reserved amount has returned to the available balance.';
      default:
        return '';
    }
  };

  const newShopPreview = balances.find((b) => b.shopkeeperId === newShopId);

  const actionModal = modal && modal !== 'new' ? ACTION_META[modal] : null;
  const modalReasons = modal === 'reject' ? REJECT_REASONS : modal === 'fail' ? FAIL_REASONS : [];

  return (
    <div className="space-y-6 pb-8">
      {/* Banner */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fadeIn ${
            banner.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {banner.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          {banner.text}
        </div>
      )}

      {/* View switch + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#12121a] border border-[#2a2a38] rounded-2xl">
          <button
            onClick={() => setView('payouts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'payouts' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-[#181824]'
            }`}
          >
            <Wallet size={15} /> Payout Requests
          </button>
          <button
            onClick={() => setView('balances')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'balances' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-[#181824]'
            }`}
          >
            <Store size={15} /> Shopkeeper Balances
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openNewRequest()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
          >
            <IndianRupee size={14} /> New Payout Request
          </button>
          <button
            onClick={exportCurrent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white hover:border-indigo-500/40 text-xs font-semibold transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {view === 'payouts' ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <FinanceKpiCard
              title="Paid Out"
              value={stats ? formatCurrency(stats.completedPayoutAmount) : '—'}
              subtext={`${stats?.completedPayoutCount ?? 0} completed payouts`}
              icon={Wallet}
              tone="emerald"
            />
            <FinanceKpiCard
              title="Awaiting Decision"
              value={stats ? formatCurrency(stats.pendingPayoutAmount) : '—'}
              subtext={`${stats?.pendingPayoutCount ?? 0} requested or in review`}
              icon={Clock}
              tone="amber"
            />
            <FinanceKpiCard
              title="In Progress"
              value={stats ? formatCurrency(stats.processingPayoutAmount) : '—'}
              subtext={`${stats?.processingPayoutCount ?? 0} approved or processing`}
              icon={Activity}
              tone="purple"
            />
            <FinanceKpiCard
              title="Shopkeeper Payable"
              value={stats ? formatCurrency(stats.shopkeeperPayable) : '—'}
              subtext="Available across all shops"
              hint={`${openableBalances.length} shops can request`}
              icon={TrendingUp}
              tone="indigo"
            />
            <FinanceKpiCard
              title="Platform Commission"
              value={stats ? formatCurrency(stats.totalCommission) : '—'}
              subtext={`Collected at ${commissionRate}% rate`}
              icon={Award}
              tone="cyan"
            />
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {PAYOUT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.status);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  tabStatus === tab.key
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300'
                    : 'bg-[#12121a] border-[#2a2a38] text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
                {tab.key === 'requested' && stats && stats.pendingPayoutCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                    {stats.pendingPayoutCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search request ID, payout ID, shop, shopkeeper, reference..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as PayoutStatus | '');
                    setPage(1);
                  }}
                  className={inputCls}
                >
                  <option value="">All Statuses</option>
                  <option value="requested">Requested</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={shopkeeperFilter}
                  onChange={(e) => {
                    setShopkeeperFilter(e.target.value);
                    setPage(1);
                  }}
                  className={inputCls}
                >
                  <option value="">All Shopkeepers</option>
                  {balances.map((b) => (
                    <option key={b.shopkeeperId} value={b.shopkeeperId}>
                      {b.shopName}
                    </option>
                  ))}
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value as PayoutMethod | '');
                    setPage(1);
                  }}
                  className={inputCls}
                >
                  <option value="">All Payout Methods</option>
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {getPayoutMethodLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={13} /> Filters
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
                aria-label="From date"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className={inputCls}
                aria-label="To date"
              />
              <input
                type="number"
                placeholder="Min ₹"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} w-24`}
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setPage(1);
                }}
                className={`${inputCls} w-24`}
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as NonNullable<PayoutFilters['sortBy']>)}
                className={inputCls}
              >
                <option value="createdAt">Sort by Date</option>
                <option value="requestedAmount">Sort by Amount</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-slate-300 hover:text-white transition-colors"
                title="Toggle sort direction"
              >
                <ArrowUpDown size={15} />
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/25"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Payout requests table */}
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                Loading payout requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Wallet size={34} className="mx-auto mb-3 opacity-40" />
                No payout requests match the selected filters.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Request</th>
                        <th className="py-3.5 px-4 font-semibold">Shopkeeper</th>
                        <th className="py-3.5 px-4 font-semibold">Amount</th>
                        <th className="py-3.5 px-4 font-semibold">Method</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Requested</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]">
                      {requests.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelected(r)}
                          className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white font-mono text-xs">{r.id}</span>
                            {r.payoutId && <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{r.payoutId}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-semibold text-indigo-300">{r.shopName}</div>
                            <div className="text-slate-400">{r.shopkeeperName}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-emerald-400 text-sm">{formatCurrency(r.requestedAmount)}</div>
                            {r.netPayout !== undefined && (
                              <div className="text-[10px] text-slate-500">net {formatCurrency(r.netPayout)}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">{getPayoutMethodLabel(r.payoutMethod)}</td>
                          <td className="py-3.5 px-4">
                            <StatusChip config={getPayoutStatusConfig(r.status)} />
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                            <div>{formatDate(r.createdAt, true)}</div>
                            <div className="text-[10px] text-slate-600">{formatRelativeTime(r.createdAt)}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelected(r)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
                            >
                              <Eye size={14} /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[#1f1f2e]">
                  {requests.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="w-full text-left p-4 hover:bg-[#181824]/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-white text-xs">{r.id}</span>
                        <StatusChip config={getPayoutStatusConfig(r.status)} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">{r.shopName}</div>
                          <div className="text-xs text-slate-400 truncate">{getPayoutMethodLabel(r.payoutMethod)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-emerald-400">{formatCurrency(r.requestedAmount)}</div>
                          <div className="text-[10px] text-slate-500">{formatDate(r.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-[#2a2a38] flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page <span className="text-white font-semibold">{page}</span> of{' '}
                  <span className="text-white font-semibold">{totalPages}</span> ({total} requests)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-[#181824] border border-[#2c2c3e] disabled:opacity-40 hover:bg-[#202030] text-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-[#181824] border border-[#2c2c3e] disabled:opacity-40 hover:bg-[#202030] text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Shopkeeper balances view ─────────────────────────────────── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinanceKpiCard
              title="Verified Earnings"
              value={formatCurrency(balanceTotals.earnings)}
              subtext={`${balances.length} shops on the platform`}
              icon={IndianRupee}
              tone="emerald"
            />
            <FinanceKpiCard
              title="Currently Locked"
              value={formatCurrency(balanceTotals.locked)}
              subtext="Reserved by open payout requests"
              icon={Clock}
              tone="amber"
            />
            <FinanceKpiCard
              title="Available Balance"
              value={formatCurrency(balanceTotals.available)}
              subtext="Ready for new payout requests"
              icon={Wallet}
              tone="indigo"
            />
            <FinanceKpiCard
              title="Paid Out Lifetime"
              value={formatCurrency(balanceTotals.paidOut)}
              subtext="Settled to shopkeeper accounts"
              icon={Award}
              tone="cyan"
            />
          </div>

          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a38] flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shopkeeper Ledger</div>
              <div className="text-[11px] text-slate-500">
                Minimum request {formatCurrency(MIN_PAYOUT_AMOUNT)} • {openableBalances.length} shops eligible
              </div>
            </div>

            {balances.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Store size={34} className="mx-auto mb-3 opacity-40" />
                No shopkeeper balances available yet.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Shopkeeper</th>
                        <th className="py-3.5 px-4 font-semibold">Verified Earnings</th>
                        <th className="py-3.5 px-4 font-semibold">Locked</th>
                        <th className="py-3.5 px-4 font-semibold">Paid Out</th>
                        <th className="py-3.5 px-4 font-semibold">Available</th>
                        <th className="py-3.5 px-4 font-semibold">Payments</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]">
                      {balances.map((b) => (
                        <tr key={b.shopkeeperId} className="hover:bg-[#181824]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-indigo-300 text-xs">{b.shopName}</div>
                            <div className="text-[11px] text-slate-400">
                              {b.shopkeeperOwner} • {b.shopkeeperId}
                            </div>
                            {b.openRequestId && (
                              <div className="text-[10px] text-amber-300 mt-0.5 font-mono">
                                open request {b.openRequestId}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">{formatCurrency(b.verifiedEarnings)}</td>
                          <td className="py-3.5 px-4 text-xs text-amber-300">{formatCurrency(b.lockedAmount)}</td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">{formatCurrency(b.paidOutAmount)}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-emerald-400 text-sm">{formatCurrency(b.availableBalance)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">{b.verifiedPaymentCount}</td>
                          <td className="py-3.5 px-4 text-right">
                            {b.openRequestId ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] text-slate-500 text-xs font-medium">
                                <Clock size={13} /> In progress
                              </span>
                            ) : b.availableBalance >= MIN_PAYOUT_AMOUNT ? (
                              <button
                                onClick={() => openNewRequest(b.shopkeeperId, String(b.availableBalance))}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
                              >
                                <IndianRupee size={13} /> Request payout
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] text-slate-600 text-xs font-medium">
                                Below minimum
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[#1f1f2e]">
                  {balances.map((b) => (
                    <div key={b.shopkeeperId} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">{b.shopName}</div>
                          <div className="text-xs text-slate-400 truncate">{b.shopkeeperOwner}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-emerald-400">{formatCurrency(b.availableBalance)}</div>
                          <div className="text-[10px] text-slate-500">available</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <div className="text-slate-500">Earned</div>
                          <div className="text-slate-200 font-semibold">{formatCurrency(b.verifiedEarnings)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Locked</div>
                          <div className="text-amber-300 font-semibold">{formatCurrency(b.lockedAmount)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Paid Out</div>
                          <div className="text-slate-200 font-semibold">{formatCurrency(b.paidOutAmount)}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        {b.openRequestId ? (
                          <div className="text-[11px] text-amber-300 font-mono">open request {b.openRequestId}</div>
                        ) : b.availableBalance >= MIN_PAYOUT_AMOUNT ? (
                          <button
                            onClick={() => openNewRequest(b.shopkeeperId, String(b.availableBalance))}
                            className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
                          >
                            <IndianRupee size={13} /> Request payout
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-600">Balance below {formatCurrency(MIN_PAYOUT_AMOUNT)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Payout detail drawer ───────────────────────────────────── */}
      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.id ?? ''}
        subtitle={
          selected
            ? `${selected.shopName} • ${selected.shopkeeperName} • Requested ${formatDate(selected.createdAt, true)}`
            : undefined
        }
        chips={
          selected ? (
            <>
              <StatusChip config={getPayoutStatusConfig(selected.status)} size="md" />
              <span
                className="inline-flex items-center gap-1 rounded-full font-semibold border px-3 py-1 text-sm bg-sky-500/10 text-sky-300 border-sky-500/30 whitespace-nowrap"
              >
                {getPayoutMethodLabel(selected.payoutMethod)}
              </span>
            </>
          ) : undefined
        }
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-slate-500">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>{footerHint()}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Close
                </button>
                {availableActions.map((a) => {
                  const meta = ACTION_META[a];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={a}
                      onClick={() => openAction(a)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${actionBtnCls[a]}`}
                    >
                      <Icon size={15} /> {meta.confirmLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <>
            <PayoutTracker request={selected} />

            {/* Request details */}
            <DetailSection title="Request Details" icon={<FileText size={14} className="text-indigo-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Request ID" value={selected.id} mono />
                <Field label="Payout ID" value={selected.payoutId ?? '—'} mono />
                <Field label="Status" value={<StatusChip config={getPayoutStatusConfig(selected.status)} />} />
                <Field label="Payout Method" value={getPayoutMethodLabel(selected.payoutMethod)} />
                <Field label="Account Details" value={selected.accountDetails || '—'} mono />
                <Field label="Requested At" value={formatDate(selected.createdAt, true)} />
                <Field label="Last Updated" value={formatDate(selected.updatedAt, true)} />
                <Field label="Reject Reason" value={selected.rejectReason ?? '—'} />
                <Field label="Admin Note" value={selected.adminNote ?? '—'} />
                <Field
                  label="Payment IDs Locked"
                  value={selected.paymentIds.length > 0 ? String(selected.paymentIds.length) : '—'}
                />
              </div>
            </DetailSection>

            {/* Financial breakdown */}
            <DetailSection title="Financial Breakdown" icon={<Wallet size={14} className="text-emerald-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field
                  label="Requested Amount"
                  value={<span className="text-emerald-400 font-bold">{formatCurrency(selected.requestedAmount)}</span>}
                />
                <Field label="Eligible Balance at Request" value={formatCurrency(selected.eligibleBalanceAtRequest)} />
                <Field label="Commission Rate" value={`${selected.commissionRate ?? commissionRate}%`} />
                <Field
                  label="Platform Commission"
                  value={
                    selected.internalCommission !== undefined
                      ? formatCurrency(selected.internalCommission)
                      : commissionApplicable
                        ? 'Applied on approval'
                        : 'Not applied yet'
                  }
                />
                <Field
                  label="Net Payout"
                  value={
                    selected.netPayout !== undefined ? (
                      <span className="text-emerald-400 font-bold">{formatCurrency(selected.netPayout)}</span>
                    ) : (
                      'Calculated on approval'
                    )
                  }
                />
                <Field label="Transaction Reference" value={selected.transactionReference ?? '—'} mono />
                <Field label="Completed At" value={selected.completedAt ? formatDate(selected.completedAt, true) : '—'} />
                <Field label="Paid Out" value={selected.status === 'completed' ? 'Yes' : 'No'} />
              </div>
              {!commissionApplicable && (
                <div className="mt-3 pt-3 border-t border-[#262638]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Commission Preview at {commissionRate}%
                  </div>
                  <div className="grid grid-cols-2 gap-x-6">
                    <Field
                      label="Commission"
                      value={<span className="text-amber-300">{formatCurrency(previewCommission(selected.requestedAmount).commission)}</span>}
                    />
                    <Field
                      label="Shopkeeper Gets"
                      value={<span className="text-emerald-400 font-bold">{formatCurrency(previewCommission(selected.requestedAmount).net)}</span>}
                    />
                  </div>
                </div>
              )}
            </DetailSection>

            {/* Shopkeeper snapshot */}
            <DetailSection
              title="Shopkeeper Snapshot"
              icon={<Store size={14} className="text-orange-400" />}
              action={
                <button
                  onClick={() => {
                    setSelected(null);
                    setView('balances');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Open Ledger
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Shop Name" value={selected.shopName} />
                <Field label="Shopkeeper" value={selected.shopkeeperName} />
                <Field label="Contact" value={selected.shopkeeperPhone} />
                <Field label="Shopkeeper ID" value={selected.shopkeeperId} mono />
                <Field label="Verified Earnings" value={selectedBalance ? formatCurrency(selectedBalance.verifiedEarnings) : '—'} />
                <Field
                  label="Locked Amount"
                  value={selectedBalance ? <span className="text-amber-300">{formatCurrency(selectedBalance.lockedAmount)}</span> : '—'}
                />
                <Field
                  label="Available Balance"
                  value={selectedBalance ? <span className="text-emerald-400 font-bold">{formatCurrency(selectedBalance.availableBalance)}</span> : '—'}
                />
                <Field label="Paid Out Lifetime" value={selectedBalance ? formatCurrency(selectedBalance.paidOutAmount) : '—'} />
              </div>
            </DetailSection>

            {/* Contributing payments */}
            <DetailSection title="Contributing Payments" icon={<CreditCard size={14} className="text-sky-400" />}>
              {activeContributing.length === 0 ? (
                <div className="text-xs text-slate-500">
                  No verified payments linked to this request yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeContributing.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-slate-200">{p.id}</span>
                        <span className="text-slate-500"> • {p.orderId}</span>
                        <div className="text-[10px] text-slate-600">{formatDate(p.paymentDate, true)}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusChip config={getFinancePaymentStatusConfig(p.paymentStatus)} />
                        <span className="font-bold text-emerald-400">{formatCurrency(p.grossAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            {/* Audit trail */}
            <DetailSection title="Audit Trail" icon={<History size={14} className="text-slate-400" />}>
              {activeAudit.length === 0 ? (
                <div className="text-xs text-slate-500">No audit entries recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {activeAudit.map((log) => (
                    <div key={log.id} className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-indigo-300">{log.action}</span>
                        <span className="text-slate-500"> — {log.adminName}</span>
                        {log.previousStatus && log.newStatus && (
                          <div className="text-[10px] text-slate-600 font-mono">
                            {log.previousStatus} → {log.newStatus}
                          </div>
                        )}
                        {log.note && <div className="text-slate-500 truncate">{log.note}</div>}
                        {log.reason && <div className="text-amber-300">{log.reason}</div>}
                      </div>
                      <div className="text-slate-500 whitespace-nowrap flex-shrink-0">
                        {formatDate(log.timestamp, true)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </>
        )}
      </DetailDrawer>

      {/* ── Payout action confirmation ─────────────────────────────── */}
      {actionModal && selected && (
        <ConfirmModal
          open
          onClose={() => setModal(null)}
          title={actionModal.title}
          description={actionModal.description(selected, commissionRate)}
          confirmLabel={actionModal.confirmLabel}
          tone={actionModal.tone}
          loading={actionLoading}
          error={actionError}
          onConfirm={handleConfirm}
        >
          {modalReasons.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select a reason</option>
                {modalReasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          {modalReasons.length > 0 && reason === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Describe the reason</label>
              <input
                type="text"
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                placeholder="Enter a custom reason"
                className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {modal === 'complete' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bank transaction reference (optional)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. NEFT-9F2K-8831"
                className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {modal === 'note'
                ? 'Note (required)'
                : modal === 'cancel' || modal === 'reject' || modal === 'fail'
                  ? 'Internal note (optional)'
                  : 'Admin note (optional)'}
            </label>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={2}
              placeholder="Recorded in the financial audit trail"
              className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </ConfirmModal>
      )}

      {/* ── New payout request ─────────────────────────────────────── */}
      <ConfirmModal
        open={modal === 'new'}
        onClose={() => setModal(null)}
        title="New payout request"
        description="Creates a payout request against the selected shopkeeper available balance. The requested amount is reserved immediately."
        confirmLabel="Create Request"
        loading={actionLoading}
        error={actionError}
        onConfirm={handleCreateRequest}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Shopkeeper</label>
          <select
            value={newShopId}
            onChange={(e) => setNewShopId(e.target.value)}
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Select a shopkeeper</option>
            {balances.map((b) => (
              <option key={b.shopkeeperId} value={b.shopkeeperId}>
                {b.shopName} — {formatCurrency(b.availableBalance)} available
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount</label>
          <input
            type="number"
            min={MIN_PAYOUT_AMOUNT}
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder={`Minimum ${MIN_PAYOUT_AMOUNT}`}
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Minimum {formatCurrency(MIN_PAYOUT_AMOUNT)}</span>
            <span className="text-slate-400">
              Available{' '}
              <span className="text-emerald-400 font-semibold">
                {newShopPreview ? formatCurrency(newShopPreview.availableBalance) : '—'}
              </span>
            </span>
          </div>
        </div>

        {newShopPreview && Number(newAmount) > 0 && (
          <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Commission at {commissionRate}%</span>
              <span className="text-amber-300 font-semibold">
                {formatCurrency(previewCommission(Number(newAmount)).commission)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Shopkeeper receives</span>
              <span className="text-emerald-400 font-bold">
                {formatCurrency(previewCommission(Number(newAmount)).net)}
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payout Method</label>
          <select
            value={newMethod}
            onChange={(e) => setNewMethod(e.target.value as PayoutMethod)}
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {getPayoutMethodLabel(m)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Details</label>
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            placeholder="Bank account number or UPI ID"
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </ConfirmModal>
    </div>
  );
}
