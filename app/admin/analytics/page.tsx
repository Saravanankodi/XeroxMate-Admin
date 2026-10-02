'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Award, PieChart
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import {
  getGrowthData,
  getRevenueData,
  getOrderStatusDistribution,
  getTopShopkeepers
} from '@/lib/api';
import {
  TimeRange, GrowthDataPoint, RevenueDataPoint, OrderStatusDistribution, TopShopkeeper
} from '@/types/analytics';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>('30d');
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [growthData, setGrowthData] = useState<GrowthDataPoint[]>([]);
  const [statusDist, setStatusDist] = useState<OrderStatusDistribution[]>([]);
  const [topShops, setTopShops] = useState<TopShopkeeper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      try {
        const [revRes, growthRes, distRes, topRes] = await Promise.all([
          getRevenueData(range),
          getGrowthData(range),
          getOrderStatusDistribution(),
          getTopShopkeepers(),
        ]);
        setRevenueData(revRes);
        setGrowthData(growthRes);
        setStatusDist(distRes);
        setTopShops(topRes);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [range]);

  const totalPeriodRevenue = revenueData.reduce((acc, r) => acc + r.revenue, 0);
  const totalPeriodOrders = revenueData.reduce((acc, r) => acc + r.orders, 0);
  const avgOrderValue = totalPeriodOrders > 0 ? Math.round(totalPeriodRevenue / totalPeriodOrders) : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Header & Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="text-indigo-400" size={22} />
            Platform Performance Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time metrics on customer acquisitions, print job fulfillment, and revenue growth</p>
        </div>

        {/* Time Range Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#181824] border border-[#28283a] rounded-xl self-start sm:self-auto">
          {(['7d', '30d', '3m', '6m', '1y'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === r
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-[#222232]'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Computing analytics data for {range}...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Period Revenue</div>
              <div className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(totalPeriodRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">Selected timeframe sum</div>
            </div>

            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders Processed</div>
              <div className="text-2xl font-bold text-white mt-2">{totalPeriodOrders.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-500 mt-1">Print jobs completed</div>
            </div>

            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Order Value (AOV)</div>
              <div className="text-2xl font-bold text-indigo-400 mt-2">{formatCurrency(avgOrderValue)}</div>
              <div className="text-xs text-slate-500 mt-1">Per transaction average</div>
            </div>

            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 shadow-xl">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fulfillment Rate</div>
              <div className="text-2xl font-bold text-amber-400 mt-2">97.4%</div>
              <div className="text-xs text-emerald-400 mt-1">+1.2% success rate</div>
            </div>
          </div>

          {/* Revenue & AOV Chart */}
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-400" />
                  Revenue vs Average Order Value
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Tracking daily gross revenue and customer transaction averages</p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232333" vertical={false} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181824', borderColor: '#333348', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: unknown) => [formatCurrency(Number(val)), 'Amount']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} fill="url(#analyticsRevenue)" name="Total Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid of Volume & Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User & Shopkeeper Acquisition Growth */}
            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-purple-400" />
                    Network Growth & Onboarding
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Cumulative users and shopkeepers over time</p>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#232333" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#181824', borderColor: '#333348', borderRadius: '12px', color: '#fff' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="users" stroke="#a855f7" strokeWidth={2} name="Total Users" dot={false} />
                    <Line type="monotone" dataKey="shopkeepers" stroke="#f59e0b" strokeWidth={2} name="Total Shopkeepers" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                  <PieChart size={18} className="text-emerald-400" />
                  Order Status Breakdown
                </h3>
                <p className="text-xs text-slate-400 mb-4">Percentage distribution of current active and historical print jobs</p>

                <div className="space-y-3">
                  {statusDist.map((item) => (
                    <div key={item.status} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300 capitalize">{item.status.replace('_', ' ')}</span>
                        <span className="text-white">{item.count} orders ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#1e1e2e] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top Shopkeeper Matrix */}
          <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                Shopkeeper Performance Matrix
              </h3>
              <span className="text-xs text-slate-400">Ranked by revenue generated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-[#161622] text-xs uppercase tracking-wider text-slate-400 border-b border-[#2a2a38]">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Shop Name</th>
                    <th className="py-3 px-4">Owner & Location</th>
                    <th className="py-3 px-4">Total Jobs</th>
                    <th className="py-3 px-4">Completed</th>
                    <th className="py-3 px-4">Completion Rate</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f2e]">
                  {topShops.map((shop) => (
                    <tr key={shop.shopkeeperId} className="hover:bg-[#181824] transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-400">#{shop.rank}</td>
                      <td className="py-3 px-4 font-semibold text-white">{shop.shopName}</td>
                      <td className="py-3 px-4 text-xs text-slate-400">{shop.ownerName} ({shop.location})</td>
                      <td className="py-3 px-4 text-xs">{shop.totalOrders}</td>
                      <td className="py-3 px-4 text-xs text-emerald-400 font-semibold">{shop.completedOrders}</td>
                      <td className="py-3 px-4 text-xs font-bold text-indigo-400">{shop.completionRate}%</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(shop.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
