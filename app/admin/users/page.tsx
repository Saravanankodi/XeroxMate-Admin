'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  ArrowUpDown,
  MapPin,
  Eye,
  DollarSign,
  X,
  ShieldAlert,
  UserCheck,
  AlertCircle,
  Mail,
  Phone,
  MapPinned,
  CreditCard,
  CheckCircle2,
} from 'lucide-react';

import {
  getUsers,
  getUserOrders,
  updateUserStatus,
} from '@/lib/api';

import { User, UserStatus } from '@/types/user';
import { Order } from '@/types/order';

import {
  formatCurrency,
  formatDate,
  getUserStatusConfig,
  getOrderStatusConfig,
} from '@/lib/utils';

import ConfirmModal from '@/components/admin/finance/ConfirmModal';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [sortBy, setSortBy] =
    useState<keyof User>('createdAt');

  const [sortDir, setSortDir] =
    useState<'asc' | 'desc'>('desc');

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [userOrders, setUserOrders] =
    useState<Order[]>([]);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [statusMsg, setStatusMsg] =
    useState<string | null>(null);

  const [confirmBlock, setConfirmBlock] =
    useState(false);

  /*
   * ---------------------------------------
   * FETCH USERS
   * ---------------------------------------
   */

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const result = await getUsers();

      setUsers(result);
    } catch (error) {
      console.error(
        'Failed to fetch users:',
        error
      );

      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /*
   * ---------------------------------------
   * FILTER + SORT
   * ---------------------------------------
   */

  const filteredUsers = users
    .filter((user) => {
      const searchValue =
        search.trim().toLowerCase();

      if (!searchValue) {
        return true;
      }

      return (
        user.name
          .toLowerCase()
          .includes(searchValue) ||
        user.email
          .toLowerCase()
          .includes(searchValue) ||
        user.phone
          .toLowerCase()
          .includes(searchValue) ||
        user.id
          .toLowerCase()
          .includes(searchValue)
      );
    })
    .filter((user) => {
      if (!statusFilter) {
        return true;
      }

      return user.accountStatus === statusFilter;
    })
    .sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (
        typeof aValue === 'number' &&
        typeof bValue === 'number'
      ) {
        return sortDir === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }

      return sortDir === 'asc'
        ? String(aValue ?? '').localeCompare(
            String(bValue ?? '')
          )
        : String(bValue ?? '').localeCompare(
            String(aValue ?? '')
          );
    });

  /*
   * ---------------------------------------
   * OPEN USER
   * ---------------------------------------
   */

  const openUser = async (user: User) => {
    setSelectedUser(user);

    setLoadingOrders(true);

    try {
      const orders =
        await getUserOrders(user.id);

      setUserOrders(orders);
    } catch (error) {
      console.error(
        'Failed to load user orders:',
        error
      );

      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  /*
   * ---------------------------------------
   * UPDATE USER STATUS
   * ---------------------------------------
   */

  const handleStatusChange = async (
    newStatus: UserStatus
  ) => {
    if (!selectedUser) {
      return;
    }

    const userId = selectedUser.id;

    try {
      await updateUserStatus(
        userId,
        newStatus
      );

      const updatedUser: User = {
        ...selectedUser,
        accountStatus: newStatus,
        updatedAt: new Date().toISOString(),
      };

      setSelectedUser(updatedUser);

      setUsers((previousUsers) =>
        previousUsers.map((user) =>
          user.id === userId
            ? updatedUser
            : user
        )
      );

      setStatusMsg(
        `User status updated to ${newStatus.toUpperCase()}`
      );

      setTimeout(() => {
        setStatusMsg(null);
      }, 3000);
    } catch (error) {
      console.error(
        'Failed to update user status:',
        error
      );

      setStatusMsg(
        'Failed to update user status.'
      );
    }
  };

  /*
   * ---------------------------------------
   * METRICS
   * ---------------------------------------
   */

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) =>
      user.accountStatus === 'active'
  ).length;

  const blockedUsers = users.filter(
    (user) =>
      user.accountStatus === 'blocked'
  ).length;

  const totalSpent = users.reduce(
    (total, user) =>
      total + user.totalSpent,
    0
  );

  /*
   * ---------------------------------------
   * UI
   * ---------------------------------------
   */

  return (
    <div className="space-y-6 pb-8">

      {/* =========================
          METRICS
      ========================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Total Registered Customers
            </div>

            <div className="text-2xl font-bold text-white mt-1">
              {totalUsers}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Active Customers
            </div>

            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {activeUsers}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Total Customer Spend
            </div>

            <div className="text-2xl font-bold text-indigo-400 mt-1">
              {formatCurrency(totalSpent)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a38] rounded-xl p-4 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Blocked Accounts
            </div>

            <div className="text-2xl font-bold text-rose-400 mt-1">
              {blockedUsers}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400">
            <ShieldAlert size={20} />
          </div>
        </div>

      </div>

      {/* =========================
          SEARCH
      ========================== */}

      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row gap-3 sm:items-center justify-between">

        <div className="relative flex-1">

          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search users by name, email, phone, or ID..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full pl-10 pr-4 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

        </div>

        <div className="flex flex-wrap items-center gap-3">

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">
              All Statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="blocked">
              Blocked
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as keyof User
              )
            }
            className="px-3 py-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="createdAt">
              Sort by Date Joined
            </option>

            <option value="name">
              Sort by Name
            </option>

            <option value="totalSpent">
              Sort by Total Spent
            </option>

            <option value="totalOrders">
              Sort by Total Orders
            </option>
          </select>

          <button
            onClick={() =>
              setSortDir((previous) =>
                previous === 'asc'
                  ? 'desc'
                  : 'asc'
              )
            }
            className="p-2 bg-[#181824] border border-[#2c2c3e] rounded-xl text-slate-300 hover:text-white transition-colors"
            title="Toggle sort direction"
          >
            <ArrowUpDown size={16} />
          </button>

        </div>
      </div>

      {/* =========================
          USERS TABLE
      ========================== */}

      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-xl overflow-hidden">

        {loading ? (

          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">

            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />

            Loading customers...

          </div>

        ) : loadError ? (

          <div className="p-12 text-center">

            <AlertCircle
              size={34}
              className="mx-auto mb-3 text-rose-400 opacity-70"
            />

            <div className="text-slate-300 font-semibold">
              Unable to load customers
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Please try again.
            </div>

            <button
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 rounded-xl bg-[#181824] border border-[#2c2c3e] text-slate-300 hover:text-white text-xs font-semibold transition-colors"
            >
              Retry
            </button>

          </div>

        ) : filteredUsers.length === 0 ? (

          <div className="p-12 text-center">

            <div className="text-slate-300 font-semibold">
              No customers found.
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Try changing your search or filters.
            </div>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm text-slate-300">

              <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">

                <tr>

                  <th className="py-3.5 px-4 font-semibold">
                    Customer
                  </th>

                  <th className="py-3.5 px-4 font-semibold">
                    Contact
                  </th>

                  <th className="py-3.5 px-4 font-semibold">
                    Location
                  </th>

                  <th className="py-3.5 px-4 font-semibold">
                    Registration
                  </th>

                  <th className="py-3.5 px-4 font-semibold">
                    Status
                  </th>

                  <th className="py-3.5 px-4 font-semibold">
                    Joined
                  </th>

                  <th className="py-3.5 px-4 font-semibold text-right">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-[#1f1f2e]">

                {filteredUsers.map((user) => {

                  const statusConfig =
                    getUserStatusConfig(
                      user.accountStatus
                    );

                  return (

                    <tr
                      key={user.id}
                      className="hover:bg-[#181824]/60 transition-colors cursor-pointer"
                      onClick={() =>
                        openUser(user)
                      }
                    >

                      {/* CUSTOMER */}

                      <td className="py-3.5 px-4">

                        <div className="flex items-center gap-3">

                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {user.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <div className="font-semibold text-white">
                              {user.name}
                            </div>

                            <div className="text-xs text-slate-400">
                              ID: {user.id}
                            </div>

                          </div>

                        </div>

                      </td>

                      {/* CONTACT */}

                      <td className="py-3.5 px-4 text-xs">

                        <div className="text-slate-200">
                          {user.email}
                        </div>

                        <div className="text-slate-400">
                          {user.phone}
                        </div>

                      </td>

                      {/* LOCATION */}

                      <td className="py-3.5 px-4 text-xs text-slate-300">

                        <div className="flex items-center gap-1">

                          <MapPin
                            size={13}
                            className="text-slate-500"
                          />

                          <span>
                            {user.location ||
                              'Not provided'}
                          </span>

                        </div>

                      </td>

                      {/* REGISTRATION */}

                      <td className="py-3.5 px-4">

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">

                          <CheckCircle2 size={12} />

                          {user.registrationStatus}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="py-3.5 px-4">

                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            color:
                              statusConfig.color,
                            backgroundColor:
                              statusConfig.bg,
                            borderColor:
                              statusConfig.border,
                          }}
                        >
                          {statusConfig.label}
                        </span>

                      </td>

                      {/* DATE */}

                      <td className="py-3.5 px-4 text-xs text-slate-400">

                        {formatDate(
                          user.createdAt
                        )}

                      </td>

                      {/* ACTION */}

                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >

                        <button
                          onClick={() =>
                            openUser(user)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#242436] hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition-all"
                        >
                          <Eye size={14} />

                          Profile
                        </button>

                      </td>

                    </tr>

                  );
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =========================
          CUSTOMER DRAWER
      ========================== */}

      {selectedUser && (

        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">

          <div
            className="fixed inset-0"
            onClick={() =>
              setSelectedUser(null)
            }
          />

          <div className="relative w-full max-w-xl bg-[#12121a] border-l border-[#2a2a38] h-full overflow-y-auto z-10 shadow-2xl p-6">

            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-[#2a2a38] pb-5">

              <div className="flex items-center gap-4">

                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">

                  {selectedUser.name
                    .charAt(0)
                    .toUpperCase()}

                </div>

                <div>

                  <h2 className="text-xl font-bold text-white">
                    {selectedUser.name}
                  </h2>

                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedUser.email}
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5">
                    ID: {selectedUser.id}
                  </p>

                  <span
                    className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    style={{
                      color:
                        getUserStatusConfig(
                          selectedUser.accountStatus
                        ).color,
                      backgroundColor:
                        getUserStatusConfig(
                          selectedUser.accountStatus
                        ).bg,
                      borderColor:
                        getUserStatusConfig(
                          selectedUser.accountStatus
                        ).border,
                    }}
                  >
                    {selectedUser.accountStatus.toUpperCase()}
                  </span>

                </div>

              </div>

              <button
                onClick={() =>
                  setSelectedUser(null)
                }
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#202030] transition-colors"
              >
                <X size={20} />
              </button>

            </div>

            {/* STATUS MESSAGE */}

            {statusMsg && (

              <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                {statusMsg}
              </div>

            )}

            {/* ACCOUNT INFORMATION */}

            <div className="mt-5 p-4 rounded-xl bg-[#181824] border border-[#28283a]">

              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Account Information
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                <div>
                  <div className="text-slate-500 mb-1">
                    User ID
                  </div>

                  <div className="text-white font-mono break-all">
                    {selectedUser.id}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">
                    Registration
                  </div>

                  <div className="text-white">
                    {selectedUser.registrationStatus}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">
                    Email
                  </div>

                  <div className="text-white flex items-center gap-1.5 break-all">
                    <Mail
                      size={12}
                      className="text-indigo-400 shrink-0"
                    />

                    {selectedUser.email}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">
                    Phone
                  </div>

                  <div className="text-white flex items-center gap-1.5">
                    <Phone
                      size={12}
                      className="text-indigo-400 shrink-0"
                    />

                    {selectedUser.phone}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">
                    Payout Method
                  </div>

                  <div className="text-white flex items-center gap-1.5">
                    <CreditCard
                      size={12}
                      className="text-indigo-400"
                    />

                    {selectedUser.payoutMethod ||
                      'Not configured'}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 mb-1">
                    UPI ID
                  </div>

                  <div className="text-white">
                    {selectedUser.upiId ||
                      'Not configured'}
                  </div>
                </div>

              </div>

            </div>

            {/* ADDRESS */}

            <div className="mt-4 p-4 rounded-xl bg-[#181824] border border-[#28283a]">

              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Addresses
              </div>

              {selectedUser.addresses.length === 0 ? (

                <div className="text-xs text-slate-500">
                  No address saved.
                </div>

              ) : (

                <div className="space-y-3">

                  {selectedUser.addresses.map(
                    (address) => (

                      <div
                        key={address.id}
                        className="p-3 rounded-xl bg-[#12121a] border border-[#242436]"
                      >

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <MapPinned
                              size={14}
                              className="text-indigo-400"
                            />

                            <span className="font-semibold text-white">
                              {address.label ||
                                'Address'}
                            </span>

                          </div>

                        </div>

                        <div className="mt-2 text-xs text-slate-300 leading-5">

                          {address.name}
                          <br />

                          {address.house}
                          {address.street &&
                            `, ${address.street}`}

                          <br />

                          {address.area}
                          {address.city &&
                            `, ${address.city}`}

                          <br />

                          {address.pincode}

                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          Phone: {address.phone}
                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

            {/* STATUS CONTROL */}

            <div className="mt-4 p-4 rounded-xl bg-[#181824] border border-[#28283a] space-y-3">

              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Account Access Control
              </div>

              <div className="flex flex-wrap gap-2">

                {selectedUser.accountStatus !==
                  'active' && (

                  <button
                    onClick={() =>
                      handleStatusChange(
                        'active'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    Activate User
                  </button>

                )}

                {selectedUser.accountStatus !==
                  'inactive' && (
                  <button
                    onClick={() =>
                      handleStatusChange(
                        'inactive'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/40 text-xs font-medium transition-colors"
                  >
                    Mark Inactive
                  </button>
                )}

                {selectedUser.accountStatus !==
                  'blocked' && (

                  <button
                    onClick={() =>
                      setConfirmBlock(true)
                    }
                    className="px-3 py-1.5 rounded-lg bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50 text-xs font-medium transition-colors"
                  >
                    Block User
                  </button>

                )}

              </div>

            </div>

            {/* ORDER METRICS */}

            <div className="mt-6">

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Customer Order Metrics
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs text-slate-400">
                    Lifetime Spend
                  </div>

                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {formatCurrency(
                      selectedUser.totalSpent
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs text-slate-400">
                    Total Orders
                  </div>

                  <div className="text-lg font-bold text-white mt-1">
                    {selectedUser.totalOrders}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs text-slate-400">
                    Completed
                  </div>

                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {selectedUser.completedOrders}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs text-slate-400">
                    Active
                  </div>

                  <div className="text-lg font-bold text-amber-400 mt-1">
                    {selectedUser.activeOrders}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#181824] border border-[#242436]">
                  <div className="text-xs text-slate-400">
                    Cancelled
                  </div>

                  <div className="text-lg font-bold text-rose-400 mt-1">
                    {selectedUser.cancelledOrders}
                  </div>
                </div>

              </div>

            </div>

            {/* ORDERS */}

            <div className="mt-6">

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Recent Order History
              </h4>

              {loadingOrders ? (

                <div className="p-4 text-center text-xs text-slate-500">
                  Loading orders...
                </div>

              ) : userOrders.length === 0 ? (

                <div className="p-4 text-center text-xs text-slate-500 bg-[#181824] rounded-xl border border-[#242436]">
                  No print orders found.
                </div>

              ) : (

                <div className="space-y-2 max-h-72 overflow-y-auto">

                  {userOrders.map(
                    (order) => (

                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#181824] border border-[#242436]"
                      >

                        <div>

                          <div className="font-semibold text-white text-xs">
                            {order.id}
                          </div>

                          <div className="text-slate-400 text-[11px] mt-1">
                            Shop:{' '}
                            {order.shopkeeperName}
                          </div>

                        </div>

                        <div className="flex items-center gap-3">

                          <span className="font-bold text-emerald-400 text-xs">
                            {formatCurrency(
                              order.totalAmount
                            )}
                          </span>

                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                            style={getOrderStatusConfig(
                              order.status
                            )}
                          >
                            {order.status}
                          </span>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

            {/* FOOTER */}

            <div className="mt-6 pt-4 border-t border-[#2a2a38] text-xs text-slate-500 text-center">
              Customer since{' '}
              {formatDate(
                selectedUser.createdAt
              )}
            </div>

          </div>

        </div>

      )}

      {/* BLOCK CONFIRM */}

      <ConfirmModal
        open={
          confirmBlock &&
          selectedUser !== null
        }
        onClose={() =>
          setConfirmBlock(false)
        }
        title="Block this user account?"
        description={`${selectedUser?.name ?? 'This user'} will no longer be able to place or manage print orders. You can reactivate the account later.`}
        confirmLabel="Block Account"
        tone="danger"
        onConfirm={async () => {
          setConfirmBlock(false);

          await handleStatusChange(
            'blocked'
          );
        }}
      />

    </div>
  );
}
