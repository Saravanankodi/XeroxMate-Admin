'use client';

import { useState, useEffect } from 'react';
import {
  Users, Search, ArrowUpDown, CheckCircle2, XCircle, Clock, MapPin, Phone, Mail,
  Eye, ShoppingBag, DollarSign, X, ShieldAlert, UserCheck
} from 'lucide-react';
import { getUsers, getUserOrders } from '@/lib/api';
import { User, UserStatus } from '@/types/user';
import { Order } from '@/types/order';
import { formatCurrency, formatDate, getUserStatusConfig, getOrderStatusConfig } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<keyof User>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selected User Drawer State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers({
        search,
        status: statusFilter,
        sortBy,
        sortDir,
        page,
        pageSize: 10,
      });
      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, sortBy, sortDir, page]);

  useEffect(() => {
    if (selectedUser) {
      setLoadingOrders(true);
      getUserOrders(selectedUser.id)
        .then(setUserOrders)
        .catch(console.error)
        .finally(() => setLoadingOrders(false));
    }
  }, [selectedUser]);

  const handleStatusChange = (newStatus: UserStatus) => {
    if (!selectedUser) return;
    const updated = { ...selectedUser, status: newStatus };
    setSelectedUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setStatusMsg(`User status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Registered Customers</div>
            <div className="text-2xl font-bold text-white mt-1">{total}</div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Customers</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {users.filter((u) => u.status === 'active').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Customer Spend</div>
            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatCurrency(users.reduce((acc, u) => acc + u.totalSpent, 0))}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Blocked Accounts</div>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {users.filter((u) => u.status === 'blocked').length}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as keyof User)}
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="createdAt">Sort by Date Joined</option>
            <option value="name">Sort by Name</option>
            <option value="totalSpent">Sort by Total Spent</option>
            <option value="totalOrders">Sort by Total Orders</option>
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

      {/* Users Table */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading User accounts...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No users found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User Profile</th>
                  <th className="py-3.5 px-4 font-semibold">Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Total Spent</th>
                  <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f2e]">
                {users.map((user) => {
                  const statusCfg = getUserStatusConfig(user.status);
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white hover:text-indigo-400 transition-colors">{user.name}</div>
                            <div className="text-xs text-slate-400">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-200">{user.email}</div>
                        <div className="text-slate-400">{user.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={13} className="text-slate-500" />
                          <span>{user.location}</span>
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

                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-400">
                        {formatCurrency(user.totalSpent)}
                        <div className="text-[10px] text-slate-400 font-normal">{user.totalOrders} print orders</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
                        >
                          <Eye size={14} /> Profile
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
              <span className="text-white font-semibold">{totalPages}</span> ({total} users)
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

      {/* User Details Modal Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-xl bg-[#12121a] border-l border-[#2a2a38] h-full overflow-y-auto z-10 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between border-b border-[#2a2a38] pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedUser.email} • ID: {selectedUser.id}</p>
                    <span
                      className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                      style={getUserStatusConfig(selectedUser.status)}
                    >
                      {selectedUser.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#202030] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {statusMsg && (
                <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  {statusMsg}
                </div>
              )}

              {/* Status Controls */}
              <div className="mt-5 p-4 rounded-xl bg-[#181824] border border-[#28283a] space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Account Access Control</div>
                <div className="flex flex-wrap gap-2">
                  {selectedUser.status !== 'active' && (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                    >
                      Activate User
                    </button>
                  )}
                  {selectedUser.status !== 'blocked' && (
                    <button
                      onClick={() => handleStatusChange('blocked')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50 text-xs font-medium transition-colors"
                    >
                      Block User Account
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Customer Spend & Order Metrics</h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Total Lifetime Spend</div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(selectedUser.totalSpent)}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                      <div className="text-xs text-slate-400">Total Print Jobs Placed</div>
                      <div className="text-lg font-bold text-white mt-1">{selectedUser.totalOrders}</div>
                    </div>
                  </div>
                </div>

                {/* Orders History */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Recent Order History</h4>
                  {loadingOrders ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading user orders...</div>
                  ) : userOrders.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No print orders found for this user.</div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {userOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#242436] text-xs"
                        >
                          <div>
                            <div className="font-semibold text-white">{ord.id}</div>
                            <div className="text-slate-400 text-[11px]">Shop: {ord.shopkeeperName}</div>
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
              Customer since {formatDate(selectedUser.createdAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
