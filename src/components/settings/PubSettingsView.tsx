import React, { useState } from 'react';
import {
  Settings,
  Shield,
  FileText,
  RotateCcw,
  Save,
  CheckCircle2,
  Smartphone,
  Percent,
  Receipt,
  Search,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { PubSettings } from '../../types';

export const PubSettingsView: React.FC = () => {
  const { settings, updateSettings, auditLogs, resetToSeedData, currentUser } = usePubStore();

  const [formState, setFormState] = useState<PubSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'settings' | 'audit'>('settings');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formState);
    setSaveFeedback('Pub configuration settings successfully saved!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all data back to initial Game of Thrones Pub seed records? This will clear recent test transactions.'
      )
    ) {
      resetToSeedData();
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Admin Control</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Tamper Logged
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              System Settings & Security Audit Trail
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Bar financial parameters, tax rates, M-Pesa integration configs, and tamper-evident event logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Pub Settings
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
          </div>

          <button
            onClick={handleResetData}
            className="py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {saveFeedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* TAB 1: SYSTEM SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* General & Financials */}
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Branding</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mt-0.5">
                  <Receipt className="w-4 h-4 text-indigo-400" />
                  <span>Pub Identity & Currency</span>
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Establishment Name</label>
                <input
                  type="text"
                  value={formState.pubName}
                  onChange={(e) => setFormState({ ...formState, pubName: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Currency Code / Symbol</label>
                <input
                  type="text"
                  value={formState.currency}
                  onChange={(e) => setFormState({ ...formState, currency: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Receipt Tagline / Header</label>
                <input
                  type="text"
                  value={formState.receiptHeaderNote}
                  onChange={(e) => setFormState({ ...formState, receiptHeaderNote: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Receipt Footer Note</label>
                <input
                  type="text"
                  value={formState.receiptFooterNote}
                  onChange={(e) => setFormState({ ...formState, receiptFooterNote: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tax & Discount Limits */}
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Fiscal Policy</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mt-0.5">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  <span>Taxes & Authorization Caps</span>
                </h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <input
                    type="checkbox"
                    checked={formState.isVatEnabled}
                    onChange={(e) => setFormState({ ...formState, isVatEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs text-white font-medium">Enable VAT / Sales Tax</span>
                </label>
                {formState.isVatEnabled && (
                  <div className="pl-2">
                    <label className="block text-[11px] font-mono text-white/40 mb-1">VAT Percentage (%)</label>
                    <input
                      type="number"
                      value={formState.vatRate}
                      onChange={(e) => setFormState({ ...formState, vatRate: Number(e.target.value) })}
                      className="w-28 bg-white/[0.03] border border-white/10 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Waiter Discount Cap (%)</label>
                  <input
                    type="number"
                    value={formState.waiterDiscountCap}
                    onChange={(e) => setFormState({ ...formState, waiterDiscountCap: Number(e.target.value) })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">Supervisor Cap (%)</label>
                  <input
                    type="number"
                    value={formState.supervisorDiscountCap}
                    onChange={(e) => setFormState({ ...formState, supervisorDiscountCap: Number(e.target.value) })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">
                  Default Customer Tab Credit Limit ({formState.currency})
                </label>
                <input
                  type="number"
                  value={formState.defaultCreditLimit}
                  onChange={(e) => setFormState({ ...formState, defaultCreditLimit: Number(e.target.value) })}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Payment Integrations */}
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl md:col-span-2">
              <div className="border-b border-white/5 pb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-emerald-400">Mobile Money Gateway</span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2 mt-0.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>M-Pesa Integration (Safaricom Daraja)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">M-Pesa Buy Goods Till Number</label>
                  <input
                    type="text"
                    value={formState.mpesaTillNumber}
                    onChange={(e) => setFormState({ ...formState, mpesaTillNumber: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">M-Pesa Paybill Number</label>
                  <input
                    type="text"
                    value={formState.mpesaPaybillNumber}
                    onChange={(e) => setFormState({ ...formState, mpesaPaybillNumber: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="py-3 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Security Ledger</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Tamper-Evident System Audit Trail
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Every sale, discount authorization, stock deduction, void, and shift reconciliation.
              </p>
            </div>

            <div className="relative w-72">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-white/40 font-mono whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white/90">{log.userName}</td>
                    <td className="py-3 px-4 text-white/60 font-mono text-[11px] max-w-lg truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
