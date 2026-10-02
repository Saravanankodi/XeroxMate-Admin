'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Search, ArrowUpDown, CheckCircle2, XCircle, ShieldCheck, Eye, Download,
  FileText, Store, User, DollarSign, Clock, Filter, Ban, Wallet,
  ScrollText, ExternalLink, AlertCircle, RotateCcw, History, Info
} from 'lucide-react';
import {
  getPayments, getPaymentById, getFinancialStats, getAuditLogs, getAuditLogsForEntity,
  getShopkeeperBalances, verifyPaymentById, declinePaymentById, refundPaymentById,
  subscribeFinance, toFinanceMessage
} from '@/lib/finance/api';
import { useFinanceSync } from '@/lib/finance/useFinanceSync';
import { exportPaymentsCsv, exportAuditCsv } from '@/lib/finance/export';
import type {
  AuditLogEntry, AuditAction, DeclineReason, Payment, PaymentFilters, PaymentMethod,
  PaymentStatus, PaymentVerificationStatus, FinancialStats, ShopkeeperBalance
} from '@/types/payment';
import { DECLINE_REASONS } from '@/types/payment';
import { getOrderById } from '@/lib/api';
import type { Order } from '@/types/order';
import {
  formatCurrency, formatDate, formatRelativeTime,
  getFinancePaymentStatusConfig, getPaymentVerificationConfig, getPaymentMethodConfig
} from '@/lib/utils';
import FinanceKpiCard from '@/components/admin/finance/FinanceKpiCard';
import StatusChip from '@/components/admin/finance/StatusChip';
import DetailDrawer from '@/components/admin/finance/DetailDrawer';
import { DetailSection, Field } from '@/components/admin/finance/DetailSection';
import ConfirmModal from '@/components/admin/finance/ConfirmModal';

type ViewTab = 'payments' | 'audit';

const PAYMENT_TABS: { key: string; label: string; status: PaymentStatus | '' }[] = [
  { key: 'all', label: 'All Payments', status: '' },
  { key: 'verification', label: 'Pending Verification', status: 'verification_required' },
  { key: 'verified', label: 'Verified', status: 'verified' },
  { key: 'declined', label: 'Declined', status: 'declined' },
  { key: 'refunded', label: 'Refunded', status: 'refunded' },
];

const inputCls =
  'px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500';

export default function AdminPaymentsPage() {
  const router = useRouter();

  const [view, setView] = useState<ViewTab>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [balances, setBalances] = useState<ShopkeeperBalance[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [verificationFilter, setVerificationFilter] = useState<PaymentVerificationStatus | ''>('');
  const [shopkeeperFilter, setShopkeeperFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<NonNullable<PaymentFilters['sortBy']>>('paymentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selected, setSelected] = useState<Payment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [entityAudit, setEntityAudit] = useState<{ paymentId: string; logs: AuditLogEntry[] } | null>(null);

  const [modal, setModal] = useState<'verify' | 'decline' | 'refund' | null>(null);
  const [declineReason, setDeclineReason] = useState<DeclineReason>('Payment not received');
  const [declineOther, setDeclineOther] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit view
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState<AuditAction | ''>('');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const openIdRef = useRef<string | null>(null);

  const buildFilters = useCallback(
    (pageSize = 10): PaymentFilters => ({
      search,
      status: statusFilter,
      verificationStatus: verificationFilter,
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
    [search, statusFilter, verificationFilter, shopkeeperFilter, methodFilter, dateFrom, dateTo, minAmount, maxAmount, sortBy, sortDir, page]
  );

  const fetchPayments = useCallback(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true);
        return getPayments(buildFilters());
      })
      .then((res) => {
        setPayments(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        const targetId = openIdRef.current;
        if (targetId) {
          const found = res.data.find((p) => p.id === targetId);
          if (found) {
            setSelected(found);
            openIdRef.current = null;
          }
        }
      })
      .catch((err) => setBanner({ type: 'error', text: toFinanceMessage(err) }))
      .finally(() => setLoading(false));
  }, [buildFilters]);

  const fetchStats = useCallback(() => {
    Promise.all([getFinancialStats(), getShopkeeperBalances()])
      .then(([s, b]) => {
        setStats(s);
        setBalances(b);
      })
      .catch((err) => console.error('Failed to load finance stats', err));
  }, []);

  const fetchAudit = useCallback(() => {
    Promise.resolve()
      .then(() => {
        setAuditLoading(true);
        return getAuditLogs({
          search: auditSearch,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          page: auditPage,
          pageSize: 12,
        });
      })
      .then((res) => {
        setAuditLogs(res.data);
        setAuditTotal(res.total);
        setAuditTotalPages(res.totalPages);
      })
      .catch((err) => setBanner({ type: 'error', text: toFinanceMessage(err) }))
      .finally(() => setAuditLoading(false));
  }, [auditSearch, auditAction, auditDateFrom, auditDateTo, auditPage]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Deep links such as /admin/payments?search=OMX-1049 or /admin/payments?open=PAY-... (used by the orders drawer).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    openIdRef.current = openId;
    Promise.resolve().then(() => {
      const q = params.get('search');
      if (openId) setSearch(openId);
      else if (q) setSearch(q);
    });
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (view === 'audit') fetchAudit();
  }, [view, fetchAudit]);

  // Live updates — every financial change refreshes the dashboard data.
  useFinanceSync(() => {
    fetchPayments();
    fetchStats();
    if (view === 'audit') fetchAudit();
  });

  // Keep the open drawer in sync with the latest store state.
  useEffect(() => {
    if (!selected) return;
    const unsubscribe = subscribeFinance(() => {
      getPaymentById(selected.id).then((p) => {
        if (p) setSelected(p);
      }).catch(() => undefined);
    });
    return unsubscribe;
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    let active = true;
    getOrderById(selected.orderId)
      .then((o) => { if (active) setSelectedOrder(o); })
      .catch(() => { if (active) setSelectedOrder(null); });
    getAuditLogsForEntity({ paymentId: selected.id })
      .then((logs) => { if (active) setEntityAudit({ paymentId: selected.id, logs }); })
      .catch(() => { if (active) setEntityAudit({ paymentId: selected.id, logs: [] }); });
    return () => { active = false; };
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeOrder = selectedOrder && selected && selectedOrder.id === selected.orderId ? selectedOrder : null;
  const entityAuditLogs = entityAudit && selected && entityAudit.paymentId === selected.id ? entityAudit.logs : [];

  const refreshAfterMutation = async (updated: Payment) => {
    setSelected(updated);
    await Promise.all([fetchPayments(), fetchStats()]);
  };

  const runAction = async (action: () => Promise<Payment>, successText: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await action();
      await refreshAfterMutation(updated);
      setBanner({ type: 'success', text: successText });
      setModal(null);
      setActionNote('');
      setDeclineReason('Payment not received');
      setDeclineOther('');
      setTimeout(() => setBanner(null), 4000);
    } catch (err) {
      setActionError(toFinanceMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = () => {
    if (!selected) return;
    runAction(() => verifyPaymentById(selected.id, { note: actionNote || undefined }),
      `${selected.id} verified — amount is now eligible for shopkeeper earnings.`);
  };

  const handleDecline = () => {
    if (!selected) return;
    runAction(
      () => declinePaymentById(selected.id, { reason: declineReason, otherReason: declineOther || undefined, note: actionNote || undefined }),
      `${selected.id} declined — the amount is blocked from payouts.`
    );
  };

  const handleRefund = () => {
    if (!selected) return;
    runAction(() => refundPaymentById(selected.id, { reason: actionNote || undefined }),
      `${selected.id} marked as refunded.`);
  };

  const openPayment = (payment: Payment) => {
    setSelected(payment);
  };

  const exportPayments = async () => {
    try {
      const res = await getPayments({ ...buildFilters(10000), page: 1 });
      exportPaymentsCsv(res.data);
      setBanner({ type: 'success', text: `Exported ${res.data.length} payment records.` });
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      setBanner({ type: 'error', text: toFinanceMessage(err) });
    }
  };

  const exportAudit = async () => {
    try {
      const res = await getAuditLogs({ search: auditSearch, action: auditAction, dateFrom: auditDateFrom, dateTo: auditDateTo, page: 1, pageSize: 10000 });
      exportAuditCsv(res.data);
      setBanner({ type: 'success', text: `Exported ${res.data.length} audit records.` });
      setTimeout(() => setBanner(null), 3000);
    } catch (err) {
      setBanner({ type: 'error', text: toFinanceMessage(err) });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setVerificationFilter('');
    setShopkeeperFilter('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setPage(1);
  };

  const tabStatus = PAYMENT_TABS.find((t) => t.status === statusFilter)?.key ?? 'all';
  const hasActiveFilters =
    Boolean(search || statusFilter || verificationFilter || shopkeeperFilter || methodFilter || dateFrom || dateTo || minAmount || maxAmount);

  const canVerify =
    selected && selected.verificationStatus === 'pending' && selected.paymentStatus !== 'refunded';
  const canDecline = canVerify;
  const canRefund =
    selected && selected.verificationStatus === 'verified' && selected.payoutState === 'eligible';

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

      {/* View switch */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-[#12121a] border border-[#2a2a38] rounded-2xl">
          <button
            onClick={() => setView('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'payments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-[#181824]'
            }`}
          >
            <CreditCard size={15} /> Customer Payments
          </button>
          <button
            onClick={() => setView('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              view === 'audit' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-[#181824]'
            }`}
          >
            <ScrollText size={15} /> Financial Audit Log
          </button>
        </div>

        <button
          onClick={view === 'payments' ? exportPayments : exportAudit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white hover:border-indigo-500/40 text-xs font-semibold transition-all"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {view === 'payments' ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <FinanceKpiCard
              title="Total Customer Payments"
              value={stats ? formatCurrency(stats.totalCustomerPayments) : '—'}
              subtext={`${stats?.totalCustomerPaymentCount ?? 0} recorded transactions`}
              icon={CreditCard}
              tone="indigo"
            />
            <FinanceKpiCard
              title="Verified Payments"
              value={stats ? formatCurrency(stats.verifiedAmount) : '—'}
              subtext={`${stats?.verifiedCount ?? 0} verified • eligible for payouts`}
              icon={ShieldCheck}
              tone="emerald"
            />
            <FinanceKpiCard
              title="Pending Verification"
              value={stats ? formatCurrency(stats.pendingVerificationAmount) : '—'}
              subtext={`${stats?.pendingVerificationCount ?? 0} awaiting admin action`}
              icon={Clock}
              tone="amber"
            />
            <FinanceKpiCard
              title="Declined Payments"
              value={stats ? formatCurrency(stats.declinedAmount) : '—'}
              subtext={`${stats?.declinedCount ?? 0} blocked from payouts`}
              icon={XCircle}
              tone="rose"
            />
            <FinanceKpiCard
              title="Today's Transactions"
              value={stats ? formatCurrency(stats.todaysPaymentsAmount) : '—'}
              subtext={`${stats?.todaysPaymentsCount ?? 0} payments today`}
              hint={stats ? `30-day volume ${formatCurrency(stats.monthlyVolume)}` : undefined}
              icon={DollarSign}
              tone="purple"
            />
          </div>

          {/* Status tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_TABS.map((tab) => (
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
                {tab.key === 'verification' && stats && stats.pendingVerificationCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                    {stats.pendingVerificationCount}
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
                  placeholder="Search payment ID, order ID, transaction ID, UTR, user, shop..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as PaymentStatus | ''); setPage(1); }} className={inputCls}>
                  <option value="">All Payment Statuses</option>
                  <option value="verification_required">Verification Required</option>
                  <option value="verified">Verified</option>
                  <option value="declined">Declined</option>
                  <option value="refunded">Refunded</option>
                  <option value="payout_pending">Payout Pending</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>

                <select value={verificationFilter} onChange={(e) => { setVerificationFilter(e.target.value as PaymentVerificationStatus | ''); setPage(1); }} className={inputCls}>
                  <option value="">All Verifications</option>
                  <option value="pending">Verification Pending</option>
                  <option value="verified">Verified</option>
                  <option value="declined">Declined</option>
                  <option value="not_required">Not Required</option>
                </select>

                <select value={shopkeeperFilter} onChange={(e) => { setShopkeeperFilter(e.target.value); setPage(1); }} className={inputCls}>
                  <option value="">All Shopkeepers</option>
                  {balances.map((b) => (
                    <option key={b.shopkeeperId} value={b.shopkeeperId}>{b.shopName}</option>
                  ))}
                </select>

                <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value as PaymentMethod | ''); setPage(1); }} className={inputCls}>
                  <option value="">All Payment Methods</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="net_banking">Net Banking</option>
                  <option value="wallet">Wallet</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={13} /> Filters
              </span>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={inputCls} aria-label="From date" />
              <span className="text-xs text-slate-500">to</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={inputCls} aria-label="To date" />
              <input type="number" placeholder="Min ₹" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(1); }} className={`${inputCls} w-24`} />
              <input type="number" placeholder="Max ₹" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }} className={`${inputCls} w-24`} />

              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as NonNullable<PaymentFilters['sortBy']>)} className={inputCls}>
                <option value="paymentDate">Sort by Date</option>
                <option value="grossAmount">Sort by Amount</option>
                <option value="paymentStatus">Sort by Status</option>
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

          {/* Payments table (desktop) */}
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                Loading payments...
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CreditCard size={34} className="mx-auto mb-3 opacity-40" />
                No payments match the selected filters.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Payment</th>
                        <th className="py-3.5 px-4 font-semibold">Customer</th>
                        <th className="py-3.5 px-4 font-semibold">Shopkeeper</th>
                        <th className="py-3.5 px-4 font-semibold">Amount</th>
                        <th className="py-3.5 px-4 font-semibold">Method</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Verification</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2e]">
                      {payments.map((p) => {
                        const statusCfg = getFinancePaymentStatusConfig(p.paymentStatus);
                        const verCfg = getPaymentVerificationConfig(p.verificationStatus);
                        const methodCfg = getPaymentMethodConfig(p.paymentMethod);
                        return (
                          <tr
                            key={p.id}
                            onClick={() => openPayment(p)}
                            className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white font-mono text-xs">{p.id}</span>
                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">{p.orderId}</div>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <div className="font-semibold text-slate-200">{p.userName}</div>
                              <div className="text-slate-400">{p.userPhone}</div>
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <div className="font-semibold text-indigo-300">{p.shopName}</div>
                              <div className="text-slate-400">{p.shopkeeperOwner}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-emerald-400 text-sm">{formatCurrency(p.grossAmount)}</div>
                              <div className="text-[10px] text-slate-500">of {formatCurrency(p.orderAmount)}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusChip config={methodCfg} />
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusChip config={statusCfg} />
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusChip config={verCfg} />
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openPayment(p)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
                              >
                                <Eye size={14} /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-[#1f1f2e]">
                  {payments.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPayment(p)}
                      className="w-full text-left p-4 hover:bg-[#181824]/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-white text-xs">{p.id}</span>
                        <StatusChip config={getFinancePaymentStatusConfig(p.paymentStatus)} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-200 truncate">{p.userName}</div>
                          <div className="text-xs text-indigo-300 truncate">{p.shopName}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-emerald-400">{formatCurrency(p.grossAmount)}</div>
                          <div className="text-[10px] text-slate-500">{formatDate(p.paymentDate)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <StatusChip config={getPaymentVerificationConfig(p.verificationStatus)} />
                        <StatusChip config={getPaymentMethodConfig(p.paymentMethod)} />
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
                  <span className="text-white font-semibold">{totalPages}</span> ({total} payments)
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
        /* ── Audit log view ─────────────────────────────────────────── */
        <div className="space-y-4">
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search action ID, payment ID, payout ID, admin, reason..."
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <select value={auditAction} onChange={(e) => { setAuditAction(e.target.value as AuditAction | ''); setAuditPage(1); }} className={inputCls}>
              <option value="">All Actions</option>
              <option value="PAYMENT_RECEIVED">Payment Received</option>
              <option value="PAYMENT_VERIFIED">Payment Verified</option>
              <option value="PAYMENT_DECLINED">Payment Declined</option>
              <option value="REFUND_CREATED">Refund Created</option>
              <option value="PAYOUT_REQUESTED">Payout Requested</option>
              <option value="PAYOUT_APPROVED">Payout Approved</option>
              <option value="PAYOUT_PROCESSING">Payout Processing</option>
              <option value="PAYOUT_COMPLETED">Payout Completed</option>
              <option value="PAYOUT_REJECTED">Payout Rejected</option>
              <option value="PAYOUT_FAILED">Payout Failed</option>
              <option value="COMMISSION_CALCULATED">Commission Calculated</option>
            </select>
            <input type="date" value={auditDateFrom} onChange={(e) => { setAuditDateFrom(e.target.value); setAuditPage(1); }} className={inputCls} aria-label="Audit from date" />
            <input type="date" value={auditDateTo} onChange={(e) => { setAuditDateTo(e.target.value); setAuditPage(1); }} className={inputCls} aria-label="Audit to date" />
          </div>

          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
            {auditLoading ? (
              <div className="p-12 text-center text-slate-400">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ScrollText size={34} className="mx-auto mb-3 opacity-40" />
                No audit entries match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Action</th>
                      <th className="py-3.5 px-4 font-semibold">Entity</th>
                      <th className="py-3.5 px-4 font-semibold">Amount</th>
                      <th className="py-3.5 px-4 font-semibold">Performed By</th>
                      <th className="py-3.5 px-4 font-semibold">Reason / Note</th>
                      <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f2e]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#181824]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-xs text-indigo-300 font-mono">{log.action}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{log.id}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-300">
                          {log.paymentId && <div>{log.paymentId}</div>}
                          {log.payoutRequestId && <div>{log.payoutRequestId}</div>}
                          {log.orderId && <div className="text-slate-500">{log.orderId}</div>}
                          {!log.paymentId && !log.payoutRequestId && !log.orderId && <span className="text-slate-500">—</span>}
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-emerald-400">
                          {log.amount !== undefined ? formatCurrency(log.amount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="text-slate-200 font-medium">{log.adminName}</div>
                          <div className="text-slate-500 font-mono">{log.adminId}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 max-w-xs">
                          {log.reason && <div className="text-amber-300">{log.reason}</div>}
                          {log.note && <div className="truncate">{log.note}</div>}
                          {!log.reason && !log.note && <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                          <div>{formatDate(log.timestamp, true)}</div>
                          <div className="text-[10px] text-slate-600">{formatRelativeTime(log.timestamp)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {auditTotalPages > 1 && (
              <div className="px-5 py-4 border-t border-[#2a2a38] flex items-center justify-between text-xs text-slate-400">
                <div>
                  Page <span className="text-white font-semibold">{auditPage}</span> of{' '}
                  <span className="text-white font-semibold">{auditTotalPages}</span> ({auditTotal} entries)
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => setAuditPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-[#181824] border border-[#2c2c3e] disabled:opacity-40 hover:bg-[#202030] text-white transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={auditPage >= auditTotalPages}
                    onClick={() => setAuditPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-[#181824] border border-[#2c2c3e] disabled:opacity-40 hover:bg-[#202030] text-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payment detail drawer ───────────────────────────────────── */}
      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.id ?? ''}
        subtitle={
          selected
            ? `${selected.orderType} • Paid on ${formatDate(selected.paymentDate, true)} • Invoice ${selected.invoiceNumber}`
            : undefined
        }
        chips={
          selected ? (
            <>
              <StatusChip config={getFinancePaymentStatusConfig(selected.paymentStatus)} size="md" />
              <StatusChip config={getPaymentVerificationConfig(selected.verificationStatus)} size="md" />
            </>
          ) : undefined
        }
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info size={14} />
                {selected.payoutState === 'eligible' && 'Amount is eligible for shopkeeper earnings'}
                {selected.payoutState === 'locked' && 'Amount is reserved by an active payout request'}
                {selected.payoutState === 'released' && 'Amount has been released to the shopkeeper'}
                {selected.payoutState === 'not_eligible' && 'Amount is not eligible for payout'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Close
                </button>
                {canRefund && (
                  <button
                    onClick={() => { setActionNote(''); setActionError(null); setModal('refund'); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-sm font-semibold transition-colors"
                  >
                    <RotateCcw size={15} /> Refund
                  </button>
                )}
                {canDecline && (
                  <button
                    onClick={() => { setActionNote(''); setActionError(null); setDeclineReason('Payment not received'); setDeclineOther(''); setModal('decline'); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
                  >
                    <Ban size={15} /> Decline
                  </button>
                )}
                {canVerify && (
                  <button
                    onClick={() => { setActionNote(''); setActionError(null); setModal('verify'); }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                  >
                    <ShieldCheck size={15} /> Verify
                  </button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <>
            {/* Payment Information */}
            <DetailSection title="Payment Information" icon={<CreditCard size={14} className="text-indigo-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Payment ID" value={selected.id} mono />
                <Field label="Transaction ID" value={selected.transactionId} mono />
                <Field label="UTR / Reference" value={selected.utrNumber} mono />
                <Field label="Gateway Reference" value={selected.gatewayReference} mono />
                <Field label="Invoice Number" value={selected.invoiceNumber} mono />
                <Field label="Payment Method" value={getPaymentMethodConfig(selected.paymentMethod).label} />
                <Field label="Payment Date" value={formatDate(selected.paymentDate, true)} />
                <Field label="Payment Amount" value={<span className="text-emerald-400 font-bold">{formatCurrency(selected.grossAmount)}</span>} />
                <Field label="Payment Status" value={<StatusChip config={getFinancePaymentStatusConfig(selected.paymentStatus)} />} />
                <Field label="Verification Status" value={<StatusChip config={getPaymentVerificationConfig(selected.verificationStatus)} />} />
              </div>
            </DetailSection>

            {/* Customer Information */}
            <DetailSection title="Customer Information" icon={<User size={14} className="text-sky-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Name" value={selected.userName} />
                <Field label="Email" value={selected.userEmail} />
                <Field label="Phone" value={selected.userPhone} />
                <Field label="User ID" value={selected.userId} mono />
              </div>
            </DetailSection>

            {/* Order Information */}
            <DetailSection
              title="Order Information"
              icon={<FileText size={14} className="text-amber-400" />}
              action={
                <button
                  onClick={() => router.push(`/admin/orders?search=${encodeURIComponent(selected.orderId)}`)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Open Order <ExternalLink size={12} />
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Order ID" value={selected.orderId} mono />
                <Field label="Order Type" value={selected.orderType} />
                <Field label="Order Date" value={formatDate(selected.orderDate, true)} />
                <Field label="Order Amount" value={formatCurrency(selected.orderAmount)} />
                <Field
                  label="Order Status"
                  value={activeOrder ? activeOrder.status.replace(/_/g, ' ') : 'Loading...'}
                />
                <Field
                  label="Payment Status"
                  value={activeOrder ? activeOrder.paymentStatus.replace(/_/g, ' ') : 'Loading...'}
                />
              </div>
              {activeOrder && (
                <div className="mt-3 pt-3 border-t border-[#262638] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Documents</span>
                    <span className="text-slate-200 font-medium">
                      {activeOrder.documents.length} file{activeOrder.documents.length > 1 ? 's' : ''} •{' '}
                      {activeOrder.documents.reduce((acc, d) => acc + d.pages, 0)} pages
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Print Specifications</span>
                    <span className="text-slate-200 font-medium text-right">
                      {activeOrder.documents[0]
                        ? `${activeOrder.documents[0].printSpecification.paper}, ${activeOrder.documents[0].printSpecification.printType}, ${activeOrder.documents[0].printSpecification.binding} binding`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Delivery / Pickup</span>
                    <span className="text-slate-200 font-medium capitalize">
                      {activeOrder.deliveryInfo.type === 'delivery'
                        ? `Home Delivery — ${activeOrder.deliveryInfo.address ?? ''}`
                        : `Store Pickup — ${activeOrder.deliveryInfo.shopName ?? selected.shopName}`}
                    </span>
                  </div>
                </div>
              )}
            </DetailSection>

            {/* Shopkeeper Information */}
            <DetailSection title="Shopkeeper Information" icon={<Store size={14} className="text-orange-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Shop Name" value={selected.shopName} />
                <Field label="Shopkeeper" value={selected.shopkeeperOwner} />
                <Field label="Shop Contact" value={selected.shopkeeperPhone} />
                <Field label="Shopkeeper ID" value={selected.shopkeeperId} mono />
              </div>
            </DetailSection>

            {/* Verification Information */}
            <DetailSection title="Verification Information" icon={<ShieldCheck size={14} className="text-emerald-400" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Verified By" value={selected.verifiedBy ?? '—'} />
                <Field label="Verified At" value={selected.verifiedAt ? formatDate(selected.verifiedAt, true) : '—'} />
                <Field label="Decline Reason" value={selected.declineReason ?? '—'} />
                <Field label="Admin Note" value={selected.adminNote ?? '—'} />
              </div>
              <div className="mt-3 pt-3 border-t border-[#262638] space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Verification History</div>
                {selected.history.map((h, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-200 capitalize">{h.action}</span>
                      <span className="text-slate-500"> — {h.reason ?? h.note ?? h.status}</span>
                    </div>
                    <div className="text-right flex-shrink-0 text-slate-500 whitespace-nowrap">
                      <div>{formatDate(h.at, true)}</div>
                      <div className="text-[10px] text-slate-600">{h.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>

            {/* Financial Information */}
            <DetailSection title="Financial Information" icon={<Wallet size={14} className="text-indigo-400" />} className="relative overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <Field label="Gross Amount" value={<span className="text-emerald-400 font-bold">{formatCurrency(selected.grossAmount)}</span>} />
                <Field
                  label="Eligible Shopkeeper Amount"
                  value={
                    <span className="text-emerald-400 font-bold">
                      {selected.verificationStatus === 'verified' ? formatCurrency(selected.eligibleShopkeeperAmount) : 'Not eligible yet'}
                    </span>
                  }
                />
                <Field label="Payout State" value={selected.payoutState.replace(/_/g, ' ')} />
                <Field label="Payout Request" value={selected.payoutRequestId ?? '—'} mono />
                <Field label="Payout ID" value={selected.payoutId ?? '—'} mono />
                <Field
                  label="Order Balance"
                  value={activeOrder ? formatCurrency(activeOrder.balanceDue) : '—'}
                />
              </div>
            </DetailSection>

            {/* Payment audit trail */}
            <DetailSection title="Audit Trail" icon={<History size={14} className="text-slate-400" />}>
              {entityAuditLogs.length === 0 ? (
                <div className="text-xs text-slate-500">No audit entries recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {entityAuditLogs.map((log) => (
                    <div key={log.id} className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-indigo-300">{log.action}</span>
                        <span className="text-slate-500"> — {log.adminName}</span>
                        {log.note && <div className="text-slate-500 truncate">{log.note}</div>}
                        {log.reason && <div className="text-amber-300">{log.reason}</div>}
                      </div>
                      <div className="text-slate-500 whitespace-nowrap flex-shrink-0">{formatDate(log.timestamp, true)}</div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </>
        )}
      </DetailDrawer>

      {/* Verify confirmation */}
      <ConfirmModal
        open={modal === 'verify'}
        onClose={() => setModal(null)}
        title="Verify payment"
        description={
          selected
            ? `Confirm that ${formatCurrency(selected.grossAmount)} received for ${selected.orderId} matches the transaction reference ${selected.transactionId}. The amount will become eligible for shopkeeper earnings.`
            : undefined
        }
        confirmLabel="Verify Payment"
        loading={actionLoading}
        error={actionError}
        onConfirm={handleVerify}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin note (optional)</label>
          <textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            rows={2}
            placeholder="e.g. Verified against company bank statement"
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      </ConfirmModal>

      {/* Decline dialog */}
      <ConfirmModal
        open={modal === 'decline'}
        onClose={() => setModal(null)}
        title="Decline payment"
        description="The payment stays in history forever, but the amount will never become eligible for shopkeeper payouts."
        confirmLabel="Decline Payment"
        tone="danger"
        loading={actionLoading}
        error={actionError}
        onConfirm={handleDecline}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Decline reason</label>
          <select
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value as DeclineReason)}
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {DECLINE_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {declineReason === 'Other' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Describe the reason</label>
            <input
              type="text"
              value={declineOther}
              onChange={(e) => setDeclineOther(e.target.value)}
              placeholder="Enter a custom reason"
              className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin note (optional)</label>
          <textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            rows={2}
            placeholder="Internal note for the audit log"
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      </ConfirmModal>

      {/* Refund dialog */}
      <ConfirmModal
        open={modal === 'refund'}
        onClose={() => setModal(null)}
        title="Refund payment"
        description={
          selected
            ? `${formatCurrency(selected.grossAmount)} will be marked as refunded, removed from shopkeeper eligibility and the linked order will be updated.`
            : undefined
        }
        confirmLabel="Refund Payment"
        tone="danger"
        loading={actionLoading}
        error={actionError}
        onConfirm={handleRefund}
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason (optional)</label>
          <input
            type="text"
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
            className="w-full px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </ConfirmModal>

    </div>
  );
}
