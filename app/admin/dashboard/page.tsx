'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Store, ShoppingBag, IndianRupee, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, AlertCircle, XCircle, TrendingUp, ChevronRight, Activity, Zap
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid
} from 'recharts';
import {
  getDashboardStats,
  getRecentActivity,
  getPlatformHealth,
  getRevenueData,
  getTopShopkeepers
} from '@/lib/api';
import { DashboardStats, PlatformHealth, ActivityItem, RevenueDataPoint, TopShopkeeper } from '@/types/analytics';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [topShops, setTopShops] = useState<TopShopkeeper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, healthRes, actRes, revRes, shopsRes] = await Promise.all([
          getDashboardStats(),
          getPlatformHealth(),
          getRecentActivity(),
          getRevenueData('30d'),
          getTopShopkeepers(),
        ]);
        setStats(statsRes);
        setHealth(healthRes);
        setActivities(actRes);
        setRevenueData(revRes);
        setTopShops(shopsRes.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Loading Dashboard metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats ? formatCurrency(stats.totalRevenue) : '₹0',
      change: `+${stats?.orderGrowthPercent}%`,
      isUp: true,
      subtext: 'vs last month',
      icon: IndianRupee,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-950/20',
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders.toLocaleString('en-IN') ?? '0',
      change: `+${stats?.orderGrowthPercent}%`,
      isUp: true,
      subtext: `${stats?.todaysOrders} orders today`,
      icon: ShoppingBag,
      color: 'from-indigo-500 to-blue-600',
      shadow: 'shadow-indigo-950/20',
    },
    {
      title: 'Total Registered Users',
      value: stats?.totalUsers.toLocaleString('en-IN') ?? '0',
      change: `+${stats?.userGrowthPercent}%`,
      isUp: true,
      subtext: `+${stats?.newUsersToday} joined today`,
      icon: Users,
      color: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-950/20',
    },
    {
      title: 'Active Shopkeepers',
      value: stats?.totalShopkeepers.toLocaleString('en-IN') ?? '0',
      change: `+${stats?.shopkeeperGrowthPercent}%`,
      isUp: true,
      subtext: `+${stats?.newShopkeepersThisWeek} registered this week`,
      icon: Store,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-950/20',
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Platform Realtime Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/60 border border-indigo-500/20 p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Platform Status
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Xerox Mate Print Network Operating Normally
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Currently handling active print requests across registered xerox centers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              <Zap size={16} /> Manage Orders
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 hover:border-[#3d3d52] transition-all duration-200 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-md ${card.shadow}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {card.value}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-[#1f1f2e]">
                <div className="flex items-center gap-1 font-semibold text-emerald-400">
                  <ArrowUpRight size={14} />
                  {card.change}
                </div>
                <span className="text-slate-500">{card.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Live Operational Health Bar */}
      {health && (
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Real-time Operational Metrics</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Updated just now</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Active Users</div>
              <div className="text-lg font-bold text-white mt-1">{health.activeUsers}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Online now</div>
            </div>
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Active Shops</div>
              <div className="text-lg font-bold text-white mt-1">{health.activeShopkeepers}</div>
              <div className="text-[10px] text-indigo-400 mt-0.5">Accepting jobs</div>
            </div>
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Printing / Processing</div>
              <div className="text-lg font-bold text-amber-400 mt-1">{health.ordersProcessing}</div>
              <div className="text-[10px] text-amber-500/80 mt-0.5">In production</div>
            </div>
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Completed Today</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">{health.ordersCompletedToday}</div>
              <div className="text-[10px] text-emerald-500/80 mt-0.5">Delivered / Picked</div>
            </div>
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Pending Queue</div>
              <div className="text-lg font-bold text-blue-400 mt-1">{health.pendingOrders}</div>
              <div className="text-[10px] text-blue-500/80 mt-0.5">Awaiting shop action</div>
            </div>
            <div className="bg-[#181824] p-3.5 rounded-xl border border-[#262636]">
              <div className="text-slate-400 text-xs font-medium">Cancelled Today</div>
              <div className="text-lg font-bold text-rose-400 mt-1">{health.cancelledToday}</div>
              <div className="text-[10px] text-rose-500/80 mt-0.5">Refund processed</div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts & Top Shopkeepers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-400" />
                Revenue & Order Trend (Last 30 Days)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily total revenue collected across platform orders</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Detailed Report <ChevronRight size={14} />
            </Link>
          </div>

          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232333" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181824', borderColor: '#333348', borderRadius: '12px', color: '#fff' }}
                  formatter={(val: unknown) => [formatCurrency(Number(val)), 'Revenue']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Shopkeepers Leaderboard */}
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store size={18} className="text-amber-400" />
              Top Xerox Shops
            </h3>
            <Link href="/admin/shopkeepers" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
              View All
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {topShops.map((shop, idx) => (
              <div
                key={shop.shopkeeperId}
                className="flex items-center justify-between p-3 rounded-xl bg-[#181824] border border-[#242436] hover:border-[#35354d] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                    'bg-[#242436] text-slate-400'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{shop.shopName}</div>
                    <div className="text-xs text-slate-400 truncate">{shop.location} • {shop.completedOrders} orders</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 pl-2">
                  <div className="text-xs font-bold text-emerald-400">{formatCurrency(shop.revenue)}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{shop.completionRate}% completion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed & Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Platform Activity */}
        <div className="lg:col-span-2 bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              Live Activity Audit Feed
            </h3>
            <span className="text-xs text-slate-500">Real-time event stream</span>
          </div>

          <div className="space-y-3">
            {activities.slice(0, 6).map((item) => {
              const getIcon = () => {
                if (item.type.includes('order_delivered')) return <CheckCircle2 size={16} className="text-emerald-400" />;
                if (item.type.includes('order_cancelled')) return <XCircle size={16} className="text-rose-400" />;
                if (item.type.includes('shopkeeper')) return <Store size={16} className="text-amber-400" />;
                if (item.type.includes('payment')) return <IndianRupee size={16} className="text-emerald-400" />;
                return <ShoppingBag size={16} className="text-indigo-400" />;
              };

              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-[#181824] border border-[#242436] hover:border-[#35354d] transition-all gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[#242436] mt-0.5">
                      {getIcon()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white leading-snug">{item.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {formatRelativeTime(item.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-4">Quick Management Actions</h3>
            <div className="space-y-3">
              <Link
                href="/admin/shopkeepers?status=pending"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#181824] border border-[#262638] hover:bg-[#202030] hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Store size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">Review Pending Shops</div>
                    <div className="text-xs text-slate-400">Validate business documents</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-300" />
              </Link>

              <Link
                href="/admin/orders?status=new"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#181824] border border-[#262638] hover:bg-[#202030] hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ShoppingBag size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">Pending Print Orders</div>
                    <div className="text-xs text-slate-400">Check unassigned print jobs</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-300" />
              </Link>

              <Link
                href="/admin/settings"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#181824] border border-[#262638] hover:bg-[#202030] hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <IndianRupee size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">Adjust Print Pricing</div>
                    <div className="text-xs text-slate-400">Update rates & commission fees</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-indigo-300" />
              </Link>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 text-center">
            <p className="text-xs text-indigo-300 font-medium">Platform System Status</p>
            <p className="text-xs text-slate-400 mt-1">All services running. API latency ~24ms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
