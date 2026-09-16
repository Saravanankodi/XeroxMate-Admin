'use client';

import { useState } from 'react';
import {
  Settings, Sliders, DollarSign, ShieldCheck, Bell, Lock, Save, CheckCircle2, Server, HelpCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'pricing' | 'maintenance' | 'security'>('general');
  const [savedMsg, setSavedMsg] = useState(false);

  // Form State
  const [generalConfig, setGeneralConfig] = useState({
    platformName: 'Xerox Mate Admin',
    supportEmail: 'support@xeroxmate.in',
    supportPhone: '+91 98765 43210',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
  });

  const [pricingConfig, setPricingConfig] = useState({
    platformCommissionPercent: 10,
    defaultBwRate: 2.00,
    defaultColorRate: 10.00,
    defaultBindingRate: 30.00,
    minOrderAmount: 20.00,
    deliveryBaseFee: 40.00,
  });

  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    autoCancelTimeoutMinutes: 30,
    pushNotifications: true,
    emailNotifications: true,
    autoApproveVerifiedShops: true,
  });

  const handleSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Save Toast Banner */}
      {savedMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 size={18} /> Platform Settings successfully updated & persisted.
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#12121a] border border-[#2a2a38] rounded-2xl">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#181824]'
          }`}
        >
          <Sliders size={15} /> General Config
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pricing'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#181824]'
          }`}
        >
          <DollarSign size={15} /> Pricing & Commission
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'maintenance'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#181824]'
          }`}
        >
          <Server size={15} /> System & Maintenance
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'security'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-[#181824]'
          }`}
        >
          <Lock size={15} /> Security & Team
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-[#12121a] border border-[#2a2a38] rounded-2xl p-6 shadow-xl space-y-6">
        {/* General Settings Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">General Platform Settings</h3>
              <p className="text-xs text-slate-400 mt-1">Configure global application branding and support contact info</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Platform Name</label>
                <input
                  type="text"
                  value={generalConfig.platformName}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, platformName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Support Email</label>
                <input
                  type="email"
                  value={generalConfig.supportEmail}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Support Helpline Phone</label>
                <input
                  type="text"
                  value={generalConfig.supportPhone}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, supportPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Platform Currency</label>
                <input
                  type="text"
                  disabled
                  value={generalConfig.currency}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Pricing & Commission Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Financial & Print Rate Controls</h3>
              <p className="text-xs text-slate-400 mt-1">Set platform commission share and default printing prices</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              <div className="p-4 rounded-xl bg-[#181824] border border-[#28283a] col-span-full">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Platform Commission Fee (%)
                </label>
                <p className="text-xs text-slate-500 mb-2">Percentage retained by Xerox Mate from each print order transaction.</p>
                <input
                  type="number"
                  value={pricingConfig.platformCommissionPercent}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, platformCommissionPercent: Number(e.target.value) })}
                  className="w-full sm:w-48 px-3 py-2 bg-[#12121a] border border-[#333348] rounded-xl text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default B&W Price (per page)</label>
                <input
                  type="number"
                  step="0.5"
                  value={pricingConfig.defaultBwRate}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, defaultBwRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Color Price (per page)</label>
                <input
                  type="number"
                  step="1"
                  value={pricingConfig.defaultColorRate}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, defaultColorRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Default Spiral Binding Fee</label>
                <input
                  type="number"
                  step="5"
                  value={pricingConfig.defaultBindingRate}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, defaultBindingRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Minimum Order Value</label>
                <input
                  type="number"
                  step="5"
                  value={pricingConfig.minOrderAmount}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, minOrderAmount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-[#181824] border border-[#2c2c3e] rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* System & Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">System Controls & Notifications</h3>
              <p className="text-xs text-slate-400 mt-1">Manage system maintenance status and automated order triggers</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#181824] border border-[#28283a]">
                <div>
                  <div className="text-sm font-semibold text-white">Platform Maintenance Mode</div>
                  <div className="text-xs text-slate-400">Temporarily pause new order placements for system upgrades</div>
                </div>
                <button
                  onClick={() => setSystemConfig({ ...systemConfig, maintenanceMode: !systemConfig.maintenanceMode })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    systemConfig.maintenanceMode ? 'bg-rose-600' : 'bg-[#2a2a3a]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemConfig.maintenanceMode ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Auto Cancel Timeout */}
              <div className="p-4 rounded-xl bg-[#181824] border border-[#28283a]">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unaccepted Order Auto-Cancel Timeout (Minutes)
                </label>
                <p className="text-xs text-slate-500 mb-2">Orders automatically cancel if shopkeeper doesn't accept within this window.</p>
                <input
                  type="number"
                  value={systemConfig.autoCancelTimeoutMinutes}
                  onChange={(e) => setSystemConfig({ ...systemConfig, autoCancelTimeoutMinutes: Number(e.target.value) })}
                  className="w-32 px-3 py-2 bg-[#12121a] border border-[#333348] rounded-xl text-sm text-white font-mono"
                />
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#181824] border border-[#28283a]">
                <div>
                  <div className="text-sm font-semibold text-white">System Push Notifications</div>
                  <div className="text-xs text-slate-400">Send real-time order status updates via push messaging</div>
                </div>
                <button
                  onClick={() => setSystemConfig({ ...systemConfig, pushNotifications: !systemConfig.pushNotifications })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    systemConfig.pushNotifications ? 'bg-indigo-600' : 'bg-[#2a2a3a]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemConfig.pushNotifications ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security & Team Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Security & Admin Personnel</h3>
              <p className="text-xs text-slate-400 mt-1">Manage administrator access credentials and security protocols</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="p-4 rounded-xl bg-[#181824] border border-[#28283a] space-y-3">
                <div className="text-sm font-semibold text-white">Change Admin Master Password</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="px-3.5 py-2 bg-[#12121a] border border-[#333348] rounded-xl text-xs text-white"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="px-3.5 py-2 bg-[#12121a] border border-[#333348] rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Admin Team Members Table */}
              <div className="p-4 rounded-xl bg-[#181824] border border-[#28283a]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Admin Team Members</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#12121a]">
                    <div>
                      <div className="font-semibold text-white">Admin User (Super Admin)</div>
                      <div className="text-slate-500">admin@xeroxmate.in</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">Owner</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#12121a]">
                    <div>
                      <div className="font-semibold text-white">Support Admin</div>
                      <div className="text-slate-500">support@xeroxmate.in</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-500/20 text-slate-300 font-medium">Manager</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button Footer */}
        <div className="pt-6 border-t border-[#2a2a38] flex items-center justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
          >
            <Save size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
