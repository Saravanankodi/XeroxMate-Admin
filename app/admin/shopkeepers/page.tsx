'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  Store, Search, ArrowUpDown, CheckCircle2, Clock,
  MapPin, Phone, Mail, Eye, ShieldCheck, Star, DollarSign, X, AlertCircle
} from 'lucide-react';
import { getShopkeepers, getShopkeeperOrders } from '@/lib/api';
import { Shopkeeper, ShopkeeperStatus } from '@/types/shopkeeper';
import { Order } from '@/types/order';
import {
  formatCurrency,
  formatDate,
  getShopkeeperStatusConfig,
  getVerificationStatusConfig,
  getOrderStatusConfig
} from '@/lib/utils';
import ConfirmModal from '@/components/admin/finance/ConfirmModal';

export default function ShopkeepersPage() {
  const [shopkeepers, setShopkeepers] = useState<Shopkeeper[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof Shopkeeper>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selected Shopkeeper Drawer
  const [selectedShopkeeper, setSelectedShopkeeper] = useState<Shopkeeper | null>(null);
  const [shopOrders, setShopOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionStatusMsg, setActionStatusMsg] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const openIdRef = useRef<string | null>(null);

  const fetchShopkeepers = useCallback(() => {
    Promise.resolve()
      .then(() => {
        setLoading(true);
        setLoadError(false);
        return getShopkeepers({
          search,
          status: statusFilter,
          sortBy,
          sortDir,
          page,
          pageSize: 10,
        });
      })
      .then((res) => {
        setShopkeepers(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        const targetId = openIdRef.current;
        if (targetId) {
          const found = res.data.find((s) => s.id === targetId);
          if (found) {
            setSelectedShopkeeper(found);
            openIdRef.current = null;
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch shopkeepers:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    fetchShopkeepers();
  }, [fetchShopkeepers]);

  // Deep links such as /admin/shopkeepers?search=<query> or /admin/shopkeepers?open=<id> (used by GlobalSearch).
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

  // When drawer opens, load shopkeeper's orders
  useEffect(() => {
    if (selectedShopkeeper) {
      Promise.resolve()
        .then(() => {
          setLoadingOrders(true);
          return getShopkeeperOrders(selectedShopkeeper.id);
        })
        .then((orders) => setShopOrders(orders))
        .catch(console.error)
        .finally(() => setLoadingOrders(false));
    }
  }, [selectedShopkeeper]);

  const handleStatusUpdate = (newStatus: ShopkeeperStatus) => {
    if (!selectedShopkeeper) return;
    const updated = { ...selectedShopkeeper, status: newStatus };
    setSelectedShopkeeper(updated);
    setShopkeepers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActionStatusMsg(`Shopkeeper status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setActionStatusMsg(null), 3000);
  };

  const handleVerificationUpdate = (verified: boolean) => {
    if (!selectedShopkeeper) return;
    const newVer: Shopkeeper['verificationStatus'] = verified ? 'verified' : 'unverified';
    const updated = { ...selectedShopkeeper, verificationStatus: newVer };
    setSelectedShopkeeper(updated);
    setShopkeepers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActionStatusMsg(`Shopkeeper verification updated to ${newVer.toUpperCase()}`);
    setTimeout(() => setActionStatusMsg(null), 3000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Partners</div>
            <div className="text-2xl font-bold text-white mt-1">{total}</div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Store size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Shops</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {shopkeepers.filter((s) => s.status === 'active').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {shopkeepers.filter((s) => s.status === 'pending' || s.verificationStatus === 'pending').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Partner Revenue</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatCurrency(shopkeepers.reduce((acc, s) => acc + s.revenue, 0))}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by shop name, owner, phone, email, or location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Shop Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as keyof Shopkeeper)}
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="createdAt">Sort by Date Joined</option>
            <option value="shopName">Sort by Shop Name</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="totalOrders">Sort by Total Orders</option>
            <option value="rating">Sort by Rating</option>
          </select>

          <button
            onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="p-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Toggle sort direction"
          >
            <ArrowUpDown size={16} />
          </button>
        </div>
      </div>

      {/* Shopkeepers Table */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            Loading shopkeepers...
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <AlertCircle size={34} className="mx-auto mb-3 text-rose-400 opacity-70" />
            <div className="text-slate-300 font-semibold">Unable to load data</div>
            <div className="text-xs text-slate-500 mt-1">Please try again.</div>
            <button
              onClick={() => {
                setLoadError(false);
                fetchShopkeepers();
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Retry
            </button>
          </div>
        ) : shopkeepers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-300 font-semibold">No shopkeepers found.</div>
            <div className="text-xs text-slate-500 mt-1">Try changing your search or filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Shop & Owner</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Info</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Verification</th>
                  <th className="py-3.5 px-4 font-semibold">Orders & Revenue</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {shopkeepers.map((shop) => {
                  const statusCfg = getShopkeeperStatusConfig(shop.status);
                  const verCfg = getVerificationStatusConfig(shop.verificationStatus);

                  return (
                    <tr
                      key={shop.id}
                      className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedShopkeeper(shop)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {shop.shopName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white hover:text-indigo-400 transition-colors">{shop.shopName}</div>
                            <div className="text-xs text-slate-400">{shop.ownerName} • ID: {shop.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-200">{shop.phone}</div>
                        <div className="text-slate-400">{shop.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-slate-500" />
                          <span>{shop.location}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            color: statusCfg.color,
                            backgroundColor: statusCfg.bg,
                            borderColor: statusCfg.border,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            color: verCfg.color,
                            backgroundColor: verCfg.bg,
                            borderColor: verCfg.border,
                          }}
                        >
                          {shop.verificationStatus === 'verified' && <ShieldCheck size={12} />}
                          {verCfg.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-emerald-400">{formatCurrency(shop.revenue)}</div>
                        <div className="text-slate-400">{shop.completedOrders} orders • {shop.rating ?? '4.8'} ★</div>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedShopkeeper(shop)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[#2a2a38] flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing Page <span className="text-white font-semibold">{page}</span> of{' '}
              <span className="text-white font-semibold">{totalPages}</span> ({total} items)
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

      {/* Shopkeeper Details Modal Drawer */}
      {selectedShopkeeper && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => setSelectedShopkeeper(null)}
          />
          <div className="relative w-full max-w-2xl bg-[#12121a] border-l border-[#2a2a38] h-full overflow-y-auto z-10 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-[#2a2a38] pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">
                    {selectedShopkeeper.shopName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedShopkeeper.shopName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Owner: {selectedShopkeeper.ownerName} • ID: {selectedShopkeeper.id}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={getShopkeeperStatusConfig(selectedShopkeeper.status)}
                      >
                        {selectedShopkeeper.status.toUpperCase()}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        style={getVerificationStatusConfig(selectedShopkeeper.verificationStatus)}
                      >
                        {selectedShopkeeper.verificationStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedShopkeeper(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#202030] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {actionStatusMsg && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  {actionStatusMsg}
                </div>
              )}

              {/* Status Update Action Controls */}
              <div className="mt-5 p-4 rounded-xl bg-[#181824] border border-[#28283a] space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Admin Status Controls</div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedShopkeeper.status !== 'active' && (
                    <button
                      onClick={() => handleStatusUpdate('active')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                    >
                      Approve & Activate
                    </button>
                  )}
                  {selectedShopkeeper.status !== 'suspended' && (
                    <button
                      onClick={() => setConfirmSuspend(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50 text-xs font-medium transition-colors"
                    >
                      Suspend Shop
                    </button>
                  )}
                  {selectedShopkeeper.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => handleVerificationUpdate(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                    >
                      Mark Docs Verified
                    </button>
                  )}
                </div>
              </div>

              {/* Shopkeeper Details Sections */}
              <div className="mt-6 space-y-6">
                {/* Contact & Location Info */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Store Contact & Location</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <Phone size={16} className="text-indigo-400" />
                      <div>
                        <div className="text-slate-400">Phone Number</div>
                        <div className="text-white font-medium">{selectedShopkeeper.phone}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <Mail size={16} className="text-indigo-400" />
                      <div>
                        <div className="text-slate-400">Email Address</div>
                        <div className="text-white font-medium">{selectedShopkeeper.email}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3 sm:col-span-2">
                      <MapPin size={16} className="text-amber-400" />
                      <div>
                        <div className="text-slate-400">Full Address</div>
                        <div className="text-white font-medium">{selectedShopkeeper.address}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <MapPin size={16} className="text-indigo-400" />
                      <div>
                        <div className="text-slate-400">Location / City</div>
                        <div className="text-white font-medium">{selectedShopkeeper.location}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <Store size={16} className="text-indigo-400" />
                      <div>
                        <div className="text-slate-400">Owner</div>
                        <div className="text-white font-medium">{selectedShopkeeper.ownerName}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Store Hours (existing fields previously not displayed) */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Store Hours</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <Clock size={16} className="text-emerald-400" />
                      <div>
                        <div className="text-slate-400">Opening Time</div>
                        <div className="text-white font-medium">{selectedShopkeeper.openingTime}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436] flex items-center gap-3">
                      <Clock size={16} className="text-amber-400" />
                      <div>
                        <div className="text-slate-400">Closing Time</div>
                        <div className="text-white font-medium">{selectedShopkeeper.closingTime}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-slate-400 mb-1">Working Days</div>
                      <div className="text-white font-medium">{selectedShopkeeper.workingDays.join(', ')}</div>
                    </div>
                  </div>
                </div>

                {/* Operations & Earnings Stats */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Performance Overview</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Total Revenue</div>
                      <div className="text-base font-bold text-emerald-400 mt-1">{formatCurrency(selectedShopkeeper.revenue)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Completed Orders</div>
                      <div className="text-base font-bold text-white mt-1">{selectedShopkeeper.completedOrders}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Active Jobs</div>
                      <div className="text-base font-bold text-amber-400 mt-1">{selectedShopkeeper.activeOrders}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Rating</div>
                      <div className="text-base font-bold text-yellow-400 mt-1 flex items-center justify-center gap-1">
                        <Star size={14} fill="currentColor" /> {selectedShopkeeper.rating ?? 4.8}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Total Orders</div>
                      <div className="text-base font-bold text-white mt-1">{selectedShopkeeper.totalOrders}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Cancelled Orders</div>
                      <div className="text-base font-bold text-rose-400 mt-1">{selectedShopkeeper.cancelledOrders}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Avg. Order Value</div>
                      <div className="text-base font-bold text-indigo-400 mt-1">{formatCurrency(selectedShopkeeper.averageOrderValue)}</div>
                    </div>
                  </div>
                </div>

                {/* Associated Orders */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recent Orders Handled</h4>
                  {loadingOrders ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading orders...</div>
                  ) : shopOrders.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No orders associated with this shopkeeper.</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {shopOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#242436] text-xs"
                        >
                          <div>
                            <span className="font-semibold text-white">{ord.id}</span>
                            <span className="text-slate-400 ml-2">Customer: {ord.userName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-emerald-400">{formatCurrency(ord.totalAmount)}</span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                              style={getOrderStatusConfig(ord.status)}
                            >
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2a2a38] text-xs text-slate-500 text-center">
              Joined Xerox Mate Platform on {formatDate(selectedShopkeeper.createdAt)}
            </div>
          </div>
        </div>
      )}

      {/* Destructive action confirmation (§18) */}
      <ConfirmModal
        open={confirmSuspend && selectedShopkeeper !== null}
        onClose={() => setConfirmSuspend(false)}
        title="Suspend this shop?"
        description={`${selectedShopkeeper?.shopName ?? 'This shop'} will stop receiving new orders until it is reactivated.`}
        confirmLabel="Suspend Shop"
        tone="danger"
        onConfirm={() => {
          setConfirmSuspend(false);
          handleStatusUpdate('suspended');
        }}
      />
    </div>
  );
}
