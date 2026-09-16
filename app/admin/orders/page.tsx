'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Filter, ArrowUpDown, CheckCircle2, Clock, Truck, Store,
  User, DollarSign, FileText, Printer, ChevronRight, Eye, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { getOrders } from '@/lib/api';
import { Order, OrderStatus, PaymentStatus, DeliveryType } from '@/types/order';
import {
  formatCurrency,
  formatDate,
  formatFileSize,
  getOrderStatusConfig,
  getPaymentStatusConfig,
  getDeliveryTypeConfig,
  ORDER_TIMELINE_STEPS,
  getOrderStatusStep
} from '@/lib/utils';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selected Order Drawer Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusActionMsg, setStatusActionMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getOrders({
        search,
        status: statusFilter as OrderStatus | '',
        paymentStatus: paymentFilter as PaymentStatus | '',
        deliveryType: deliveryFilter as DeliveryType | '',
        sortBy,
        sortDir,
        page,
        pageSize: 10,
      });
      setOrders(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, paymentFilter, deliveryFilter, sortBy, sortDir, page]);

  const handleUpdateOrderStatus = (newStatus: OrderStatus) => {
    if (!selectedOrder) return;
    const updated = {
      ...selectedOrder,
      status: newStatus,
      timestamps: { ...selectedOrder.timestamps, [newStatus]: new Date().toISOString() },
    };
    setSelectedOrder(updated);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setStatusActionMsg(`Order status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setStatusActionMsg(null), 3000);
  };

  const handleUpdatePaymentStatus = (newPayStatus: PaymentStatus) => {
    if (!selectedOrder) return;
    const updated = { ...selectedOrder, paymentStatus: newPayStatus };
    setSelectedOrder(updated);
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setStatusActionMsg(`Payment status updated to ${newPayStatus.toUpperCase()}`);
    setTimeout(() => setStatusActionMsg(null), 3000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Print Jobs</div>
            <div className="text-2xl font-bold text-white mt-1">{total}</div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active In-Progress</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {orders.filter((o) => ['new', 'accepted', 'printing', 'finishing', 'ready_for_pickup', 'out_for_delivery'].includes(o.status)).length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Printer size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Completed / Delivered</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {orders.filter((o) => o.status === 'delivered').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Filtered Volume</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatCurrency(orders.reduce((acc, o) => acc + o.totalAmount, 0))}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, shopkeeper, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Order Statuses</option>
              <option value="new">New</option>
              <option value="accepted">Accepted</option>
              <option value="printing">Printing</option>
              <option value="finishing">Finishing</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="refunded">Refunded</option>
            </select>

            {/* Delivery Type Filter */}
            <select
              value={deliveryFilter}
              onChange={(e) => { setDeliveryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Delivery Types</option>
              <option value="pickup">Store Pickup</option>
              <option value="delivery">Home Delivery</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="totalAmount">Sort by Amount</option>
            </select>

            <button
              onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="p-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-slate-300 hover:text-white transition-colors"
            >
              <ArrowUpDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading Orders list...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No print orders match the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Order ID</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Shopkeeper</th>
                  <th className="py-3.5 px-4 font-semibold">Print Specifications</th>
                  <th className="py-3.5 px-4 font-semibold">Delivery Type</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-4 font-semibold">Payment</th>
                  <th className="py-3.5 px-4 font-semibold">Order Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {orders.map((ord) => {
                  const statusCfg = getOrderStatusConfig(ord.status);
                  const payCfg = getPaymentStatusConfig(ord.paymentStatus);
                  const delCfg = getDeliveryTypeConfig(ord.deliveryInfo.type);

                  const firstDoc = ord.documents[0];
                  const docSummary = firstDoc
                    ? `${ord.documents.length} doc${ord.documents.length > 1 ? 's' : ''} • ${firstDoc.printSpecification.paper}, ${firstDoc.printSpecification.printType}`
                    : 'No documents';

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(ord)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white font-mono">{ord.id}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(ord.createdAt, true)}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-200">{ord.userName}</div>
                        <div className="text-slate-400">{ord.userPhone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-indigo-300">{ord.shopkeeperName}</div>
                        <div className="text-slate-400">{ord.shopkeeperLocation}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText size={14} className="text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{docSummary}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border"
                          style={{ color: delCfg.color, backgroundColor: delCfg.bg, borderColor: delCfg.border }}
                        >
                          {delCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400 text-sm">
                        {formatCurrency(ord.totalAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border"
                          style={{ color: payCfg.color, backgroundColor: payCfg.bg, borderColor: payCfg.border }}
                        >
                          {payCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{ color: statusCfg.color, backgroundColor: statusCfg.bg, borderColor: statusCfg.border }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOrder(ord)}
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
        )}

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[#2a2a38] flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing Page <span className="text-white font-semibold">{page}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span> ({total} orders)
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

      {/* Order Detail Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-3xl bg-[#12121a] border-l border-[#2a2a38] h-full overflow-y-auto z-10 shadow-2xl p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#2a2a38] pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white font-mono">{selectedOrder.id}</h2>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold border"
                      style={getOrderStatusConfig(selectedOrder.status)}
                    >
                      {getOrderStatusConfig(selectedOrder.status).label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Placed on {formatDate(selectedOrder.createdAt, true)}</p>
                </div>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#202030] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {statusActionMsg && (
                <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  {statusActionMsg}
                </div>
              )}

              {/* Status Timeline Progression */}
              <div className="mt-6 p-4 rounded-xl bg-[#181824] border border-[#262638]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Order Status Progression</h4>
                <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
                  {ORDER_TIMELINE_STEPS.map((step, idx) => {
                    const currentIdx = getOrderStatusStep(selectedOrder.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <button
                        key={step.key}
                        onClick={() => handleUpdateOrderStatus(step.key)}
                        className={`flex flex-col items-center flex-1 min-w-[70px] text-center p-2 rounded-lg transition-all ${
                          isCurrent ? 'bg-indigo-600/20 border border-indigo-500 text-indigo-300 font-bold' :
                          isPassed ? 'text-emerald-400 hover:bg-[#202030]' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={`Click to set status to ${step.label}`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 font-bold ${
                          isPassed ? 'bg-emerald-500 text-black' : 'bg-[#2a2a3a] text-slate-400'
                        }`}>
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        <span className="text-[10px] leading-tight truncate w-full">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin Override Action Bar */}
              <div className="mt-4 p-3 rounded-xl bg-[#161622] border border-[#242436] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-300 font-medium">Quick Admin Overrides:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedOrder.paymentStatus}
                    onChange={(e) => handleUpdatePaymentStatus(e.target.value as PaymentStatus)}
                    className="px-2.5 py-1 bg-[#1f1f2e] border border-[#333348] rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="paid">Payment: Paid</option>
                    <option value="partially_paid">Payment: Partial</option>
                    <option value="unpaid">Payment: Unpaid</option>
                    <option value="refunded">Payment: Refunded</option>
                  </select>

                  <button
                    onClick={() => handleUpdateOrderStatus('cancelled')}
                    className="px-2.5 py-1 bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/40 rounded-lg transition-colors font-semibold"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>

              {/* Customer & Shopkeeper Info */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <User size={14} className="text-indigo-400" /> Customer Information
                  </div>
                  <div className="text-sm font-semibold text-white">{selectedOrder.userName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{selectedOrder.userPhone}</div>
                  <div className="text-xs text-slate-400">{selectedOrder.userEmail}</div>
                  <div className="text-xs text-slate-300 mt-2 bg-[#202030] p-2 rounded-lg">{selectedOrder.userAddress}</div>
                </div>

                <div className="p-4 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Store size={14} className="text-amber-400" /> Assigned Shopkeeper
                  </div>
                  <div className="text-sm font-semibold text-white">{selectedOrder.shopkeeperName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Owner: {selectedOrder.shopkeeperOwner}</div>
                  <div className="text-xs text-slate-400">{selectedOrder.shopkeeperPhone}</div>
                  <div className="text-xs text-slate-300 mt-2 bg-[#202030] p-2 rounded-lg">{selectedOrder.shopkeeperLocation}</div>
                </div>
              </div>

              {/* Print Document Specifications */}
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Documents & Print Configurations</h4>
                <div className="space-y-3">
                  {selectedOrder.documents.map((doc) => (
                    <div key={doc.id} className="p-4 rounded-xl bg-[#181824] border border-[#242436] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#262638] pb-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-400" />
                          <span className="font-semibold text-white text-sm">{doc.fileName}</span>
                          <span className="text-xs text-slate-400">({formatFileSize(doc.fileSizeBytes)})</span>
                        </div>
                        <div className="text-xs font-bold text-emerald-400">{formatCurrency(doc.subtotal)}</div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-slate-400">Paper:</span> <span className="text-white font-medium">{doc.printSpecification.paper}</span></div>
                        <div><span className="text-slate-400">Type:</span> <span className="text-white font-medium">{doc.printSpecification.printType}</span></div>
                        <div><span className="text-slate-400">Sides:</span> <span className="text-white font-medium">{doc.printSpecification.sides}</span></div>
                        <div><span className="text-slate-400">Copies:</span> <span className="text-white font-medium">{doc.printSpecification.copies}</span></div>
                        <div><span className="text-slate-400">Pages:</span> <span className="text-white font-medium">{doc.printSpecification.pages}</span></div>
                        <div><span className="text-slate-400">Binding:</span> <span className="text-white font-medium">{doc.printSpecification.binding}</span></div>
                        <div className="col-span-2"><span className="text-slate-400">Extras:</span> <span className="text-indigo-300 font-medium">{doc.printSpecification.extras.join(', ')}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Statement */}
              <div className="mt-6 p-4 rounded-xl bg-[#161622] border border-[#262638] space-y-2 text-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Billing Breakdown</h4>
                <div className="flex justify-between text-slate-300">
                  <span>Printing Subtotal</span>
                  <span>{formatCurrency(selectedOrder.printingSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                </div>
                {selectedOrder.additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Additional Charges</span>
                    <span>{formatCurrency(selectedOrder.additionalCharges)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="border-t border-[#2a2a38] pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Total Order Amount</span>
                  <span className="text-emerald-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2a2a38] text-xs text-slate-500 text-center">
              Order ID: {selectedOrder.id} • Managed via Xerox Mate Admin System
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
