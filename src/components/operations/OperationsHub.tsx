import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  Banknote,
  Smartphone,
  ChevronDown,
  TrendingUp,
  Users,
  Award,
  BarChart2,
  FileText,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { usePubStore } from '../../services/store';
import { ApprovalRequest, SaleTransaction } from '../../types';
import { ReceiptModal } from '../pos/ReceiptModal';

export const OperationsHub: React.FC = () => {
  const {
    approvals,
    resolveApproval,
    sales,
    voidSale,
    refundSale,
    tabs,
    products,
    settings,
    currentUser,
  } = usePubStore();

  const [activeSubTab, setActiveSubTab] = useState<'approvals' | 'sales' | 'monitor' | 'analytics'>('approvals');
  const [salesSearch, setSalesSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // 30-day conversion trend data generator
  const conversionTrendData = Array.from({ length: 30 }, (_, i) => {
    const dayAgo = 29 - i;
    const date = new Date();
    date.setDate(date.getDate() - dayAgo);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const footTraffic = Math.floor(120 + Math.sin(i * 0.4) * 35 + Math.random() * 25);
    const salesCount = Math.floor(footTraffic * (0.65 + Math.random() * 0.2));
    const rate = Math.round((salesCount / footTraffic) * 100);
    return {
      date: dateStr,
      visitors: footTraffic,
      sales: salesCount,
      conversionRate: rate,
    };
  });

  // Staff shift efficiency data
  const staffEfficiencyData = [
    { name: 'Alex Mwangi', shifts: 22, avgSpeedMin: 2.1, accuracyPct: 98.4, efficiencyScore: 94 },
    { name: 'Sarah Ochieng', shifts: 24, avgSpeedMin: 1.8, accuracyPct: 99.1, efficiencyScore: 97 },
    { name: 'David Kiprono', shifts: 19, avgSpeedMin: 2.5, accuracyPct: 95.8, efficiencyScore: 89 },
    { name: 'Grace Wanjiru', shifts: 20, avgSpeedMin: 2.0, accuracyPct: 98.0, efficiencyScore: 92 },
    { name: 'Brian Juma', shifts: 18, avgSpeedMin: 2.3, accuracyPct: 96.5, efficiencyScore: 90 },
  ];

  // Void modal state
  const [saleToVoid, setSaleToVoid] = useState<SaleTransaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidFeedback, setVoidFeedback] = useState<string | null>(null);

  // Refund modal state
  const [saleToRefund, setSaleToRefund] = useState<SaleTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundFeedback, setRefundFeedback] = useState<string | null>(null);

  // Receipt inspection modal
  const [inspectedSale, setInspectedSale] = useState<SaleTransaction | null>(null);

  const pendingApprovals = approvals.filter((a) => a.status === 'PENDING');

  // Operational metrics for live pub monitor
  const activeTabsCount = tabs.filter((t) => t.status === 'OPEN').length;
  const activeTabsValue = tabs.filter((t) => t.status === 'OPEN').reduce((sum, t) => sum + t.runningTotal, 0);
  const todaySalesPaid = sales.filter((s) => s.status === 'PAID');
  const totalRevenueToday = todaySalesPaid.reduce((sum, s) => sum + s.total, 0);
  const mpesaRevenueToday = todaySalesPaid
    .flatMap((s) => s.payments)
    .filter((p) => p.method === 'M-PESA')
    .reduce((sum, p) => sum + p.amount, 0);
  const cashRevenueToday = todaySalesPaid
    .flatMap((s) => s.payments)
    .filter((p) => p.method === 'CASH')
    .reduce((sum, p) => sum + p.amount, 0);

  const [isDaysEndModalOpen, setIsDaysEndModalOpen] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  const voidedSalesToday = sales.filter((s) => s.status === 'VOIDED');
  const totalVoidsAmount = voidedSalesToday.reduce((sum, s) => sum + s.total, 0);
  const refundedSalesToday = sales.filter((s) => s.refundAmount && s.refundAmount > 0);
  const totalRefundsAmount = refundedSalesToday.reduce((sum, s) => sum + (s.refundAmount || 0), 0);
  const cardRevenueToday = todaySalesPaid
    .flatMap((s) => s.payments)
    .filter((p) => p.method === 'CARD')
    .reduce((sum, p) => sum + p.amount, 0);

  const startingFloat = 10000;
  const cashInDrawer = startingFloat + cashRevenueToday;

  const daysEndLogText = `========================================
${settings.pubName.toUpperCase()} - DAY'S END FINANCIAL SUMMARY
Nairobi, Kenya • Est. 2019
Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}
Operator: ${currentUser.name} (${currentUser.role})
========================================
FINANCIAL TOTALS:
- Total Paid Sales: ${settings.currency} ${totalRevenueToday.toLocaleString()} (${todaySalesPaid.length} orders)
- Cash-in-Drawer: ${settings.currency} ${cashInDrawer.toLocaleString()} (Float: ${startingFloat.toLocaleString()} + Cash: ${cashRevenueToday.toLocaleString()})
- M-Pesa Revenue: ${settings.currency} ${mpesaRevenueToday.toLocaleString()}
- Card Payments: ${settings.currency} ${cardRevenueToday.toLocaleString()}
- Open Tabs Total: ${settings.currency} ${activeTabsValue.toLocaleString()} (${activeTabsCount} open tabs)

AUDIT & EXCEPTIONS:
- Voids Recorded: ${voidedSalesToday.length} voids (${settings.currency} ${totalVoidsAmount.toLocaleString()})
- Refunds Processed: ${refundedSalesToday.length} refunds (${settings.currency} ${totalRefundsAmount.toLocaleString()})
========================================
End of Day Log Generated Successfully via Bento POS.
========================================`;

  const handleCopyLog = () => {
    navigator.clipboard.writeText(daysEndLogText);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 3000);
  };

  const handleDownloadLog = () => {
    const element = document.createElement('a');
    const file = new Blob([daysEndLogText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Days_End_Summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredSales = sales.filter((s) => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    if (!matchesStatus) return false;
    if (!salesSearch.trim()) return true;

    const q = salesSearch.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      s.waiterName.toLowerCase().includes(q) ||
      s.customer.name.toLowerCase().includes(q)
    );
  });

  const handleConfirmVoid = async () => {
    if (!saleToVoid || !voidReason.trim()) return;
    const res = await voidSale(saleToVoid.id, voidReason.trim());
    if (res.success) {
      setVoidFeedback(`Transaction #${saleToVoid.id} successfully voided and inventory reversed.`);
      setSaleToVoid(null);
      setVoidReason('');
      setTimeout(() => setVoidFeedback(null), 3000);
    } else {
      setVoidFeedback(res.error || 'Failed to void transaction.');
    }
  };

  const handleConfirmRefund = async () => {
    if (!saleToRefund || refundAmount <= 0 || !refundReason.trim()) return;
    const res = await refundSale(saleToRefund.id, refundAmount, refundReason.trim());
    if (res.success) {
      setRefundFeedback(`Refund of ${settings.currency} ${refundAmount.toLocaleString()} recorded.`);
      setSaleToRefund(null);
      setRefundAmount(0);
      setRefundReason('');
      setTimeout(() => setRefundFeedback(null), 3000);
    } else {
      setRefundFeedback(res.error || 'Failed to refund transaction.');
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header Banner */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Supervisor Hub</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Audit Trail
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Operations & Approvals
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Supervisor sign-offs, live transaction audit, refunds & inventory reversals.
            </p>
          </div>
        </div>

        {/* Day's End Summary Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDaysEndModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/5"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Day's End Summary & Export</span>
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSubTab('approvals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'approvals'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            Pending Approvals ({pendingApprovals.length})
          </button>
          <button
            onClick={() => setActiveSubTab('sales')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'sales'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            Sales Ledger & Voids
          </button>
          <button
            onClick={() => setActiveSubTab('monitor')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'monitor'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            Live Floor Monitor
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            Shift & Conversion Analytics
          </button>
        </div>
      </div>

      {voidFeedback && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center gap-2.5 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{voidFeedback}</span>
        </div>
      )}

      {refundFeedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{refundFeedback}</span>
        </div>
      )}

      {/* SUBTAB 1: APPROVALS QUEUE */}
      {activeSubTab === 'approvals' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Queue</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Pending Authorization Queue ({pendingApprovals.length})
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Waiters exceeding discount limits, high-value wastage, or credit limit overrides.
              </p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="py-14 text-center text-white/40 text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400/60" />
              <p className="font-bold text-white">All caught up!</p>
              <p>No operational actions awaiting supervisor or manager approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((appr) => (
                <div
                  key={appr.id}
                  className="bg-[#181c28] border border-[#282f42] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {appr.type}
                      </span>
                      <span className="text-xs font-bold text-zinc-100">{appr.details.description}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Requested by: <strong className="text-zinc-200">{appr.requestedByName}</strong> (
                      {appr.requesterRole}) •{' '}
                      {new Date(appr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {appr.details.reason && (
                      <div className="text-[11px] text-amber-300/90 italic">
                        Reason: &quot;{appr.details.reason}&quot;
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resolveApproval(appr.id, 'REJECTED', 'Declined by supervisor')}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-bold transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => resolveApproval(appr.id, 'APPROVED', 'Authorized')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow"
                    >
                      Approve Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SALES LEDGER & VOIDS */}
      {activeSubTab === 'sales' && (
        <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232838] pb-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                placeholder="Search transaction ID, waiter..."
                className="w-full bg-[#10121a] border border-[#2a3043] rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-1">
              {['ALL', 'PAID', 'VOIDED', 'REFUNDED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                    statusFilter === st
                      ? 'bg-amber-400 text-zinc-950 border-amber-400'
                      : 'bg-[#181c28] text-zinc-400 border-[#282e40] hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Sales Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232838] text-zinc-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Waiter</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2330]">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#181c28]">
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-100">{s.id}</td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{s.waiterName}</td>
                    <td className="py-2.5 px-3 text-zinc-300">{s.customer.name}</td>
                    <td className="py-2.5 px-3 text-zinc-400">
                      {s.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                      {settings.currency} {s.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          s.status === 'PAID'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
                            : s.status === 'VOIDED'
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                            : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setInspectedSale(s)}
                        className="px-2 py-1 bg-[#202534] hover:bg-[#282f42] text-zinc-200 rounded text-[11px] font-bold transition-colors"
                        title="View Receipt"
                      >
                        View
                      </button>

                      {s.status === 'PAID' && (
                        <>
                          <button
                            onClick={() => {
                              setSaleToVoid(s);
                              setVoidReason('');
                            }}
                            className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded text-[11px] font-bold transition-colors"
                          >
                            Void
                          </button>
                          <button
                            onClick={() => {
                              setSaleToRefund(s);
                              setRefundAmount(s.total);
                              setRefundReason('');
                            }}
                            className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 rounded text-[11px] font-bold transition-colors"
                          >
                            Refund
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: LIVE PUB MONITOR */}
      {activeSubTab === 'monitor' && (
        <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#232838] pb-3">
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">
              Live Bar Operations Pulse
            </h2>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Real-time Pub Activity
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-[#181c28] border border-[#272e42] p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Total Today Sales</span>
              <div className="text-xl font-black text-amber-300 mt-1">
                {settings.currency} {totalRevenueToday.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#181c28] border border-[#272e42] p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-green-400">M-Pesa Revenue</span>
              <div className="text-xl font-black text-green-400 mt-1">
                {settings.currency} {mpesaRevenueToday.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#181c28] border border-[#272e42] p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Cash Revenue</span>
              <div className="text-xl font-black text-emerald-400 mt-1">
                {settings.currency} {cashRevenueToday.toLocaleString()}
              </div>
            </div>

            <div className="bg-[#181c28] border border-[#272e42] p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-400">Open Customer Tabs</span>
              <div className="text-xl font-black text-zinc-100 mt-1">
                {activeTabsCount} tabs ({settings.currency} {activeTabsValue.toLocaleString()})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: SHIFT & CONVERSION ANALYTICS (RECHARTS) */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Analytics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#121214] border border-white/5 p-5 rounded-[2rem] shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Avg Sales Conversion</span>
              <div className="text-2xl font-mono font-bold text-white mt-1">76.4%</div>
              <p className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +4.2% vs last month
              </p>
            </div>
            <div className="bg-[#121214] border border-white/5 p-5 rounded-[2rem] shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Avg Shift Efficiency</span>
              <div className="text-2xl font-mono font-bold text-white mt-1">92.4%</div>
              <p className="text-[11px] text-white/40 mt-1">Based on speed & order accuracy</p>
            </div>
            <div className="bg-[#121214] border border-white/5 p-5 rounded-[2rem] shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">30-Day Foot Traffic</span>
              <div className="text-2xl font-mono font-bold text-white mt-1">4,380</div>
              <p className="text-[11px] text-white/40 mt-1">Total patron visits logged</p>
            </div>
            <div className="bg-[#121214] border border-white/5 p-5 rounded-[2rem] shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">Top Performing Staff</span>
              <div className="text-xl font-bold text-white mt-1 truncate">Sarah Ochieng</div>
              <p className="text-[11px] text-indigo-400 mt-1 font-mono">97% Shift Efficiency</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Conversion Rates Over 30 Days */}
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Trend Analysis</span>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Sales Conversion Rate (Last 30 Days)</h3>
                </div>
                <div className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-mono font-bold">
                  Conversion %
                </div>
              </div>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={conversionTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} domain={[50, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Conversion Rate']}
                    />
                    <Area type="monotone" dataKey="conversionRate" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#conversionGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Staff Shift Efficiency Bar Chart */}
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-400">Team Performance</span>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Staff Shift Efficiency Score (%)</h3>
                </div>
                <div className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-mono font-bold">
                  Score %
                </div>
              </div>
              <div className="h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffEfficiencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} domain={[70, 100]} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`${val}%`, 'Efficiency Score']}
                    />
                    <Bar dataKey="efficiencyScore" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Staff Performance Table */}
          <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-tight">Shift Operations & Speed Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                    <th className="py-2.5 px-3">Staff Operator</th>
                    <th className="py-2.5 px-3 text-center">Shifts Logged</th>
                    <th className="py-2.5 px-3 text-center">Avg Service Speed</th>
                    <th className="py-2.5 px-3 text-center">Order Accuracy</th>
                    <th className="py-2.5 px-3 text-center">Efficiency Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffEfficiencyData.map((staff, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {staff.name.charAt(0)}
                        </div>
                        {staff.name}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-white/80">{staff.shifts} shifts</td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-400">{staff.avgSpeedMin} min / order</td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-400">{staff.accuracyPct}%</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {staff.efficiencyScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {saleToVoid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161924] border border-[#2c3245] rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>Void Sale #{saleToVoid.id}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Voiding this sale will reverse deducted drinks back into inventory and deduct{' '}
              {settings.currency} {saleToVoid.total.toLocaleString()} from reports.
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason for Void *</label>
              <textarea
                rows={2}
                required
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g. Wrong drinks rung up by waiter / Customer cancelled before pouring"
                className="w-full bg-[#10121a] border border-[#2b3144] rounded-lg p-2 text-xs text-zinc-100"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToVoid(null)}
                className="flex-1 py-2 rounded-xl bg-[#1c202d] text-zinc-300 text-xs font-bold border border-[#2c3244]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={!voidReason.trim()}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-black"
              >
                Confirm Void & Reverse Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {saleToRefund && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161924] border border-[#2c3245] rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl">
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Refund Sale #{saleToRefund.id}</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Refund Amount ({settings.currency})
              </label>
              <input
                type="number"
                max={saleToRefund.total}
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full bg-[#10121a] border border-[#2b3144] rounded-lg p-2 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason for Refund *</label>
              <textarea
                rows={2}
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Corked wine bottle returned / Overcharged on card"
                className="w-full bg-[#10121a] border border-[#2b3144] rounded-lg p-2 text-xs text-zinc-100"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToRefund(null)}
                className="flex-1 py-2 rounded-xl bg-[#1c202d] text-zinc-300 text-xs font-bold border border-[#2c3244]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refundAmount <= 0 || !refundReason.trim()}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 text-xs font-black"
              >
                Execute Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Sale Receipt */}
      {inspectedSale && (
        <ReceiptModal
          sale={inspectedSale}
          onClose={() => setInspectedSale(null)}
          onNewSale={() => setInspectedSale(null)}
        />
      )}

      {/* Day's End Summary Modal */}
      {isDaysEndModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Day's End Financial Summary</h3>
                  <p className="text-xs text-white/40">Complete audit log of sales, voids, cash-in-drawer & payment reconciliation.</p>
                </div>
              </div>
              <button
                onClick={() => setIsDaysEndModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Totals Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-white/45">Total Paid Sales</span>
                <div className="text-lg font-mono font-bold text-amber-300 mt-1">
                  {settings.currency} {totalRevenueToday.toLocaleString()}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">{todaySalesPaid.length} orders completed</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Cash-in-Drawer</span>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                  {settings.currency} {cashInDrawer.toLocaleString()}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">Float ({startingFloat.toLocaleString()}) + Cash</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-400">Total Voids</span>
                <div className="text-lg font-mono font-bold text-rose-400 mt-1">
                  {settings.currency} {totalVoidsAmount.toLocaleString()}
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">{voidedSalesToday.length} voids recorded</p>
              </div>
            </div>

            {/* Text Log Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/70 block">Exportable Text Log Preview:</label>
              <textarea
                readOnly
                rows={10}
                value={daysEndLogText}
                className="w-full bg-[#0a0a0c] border border-white/10 rounded-2xl p-4 text-xs font-mono text-white/80 focus:outline-none resize-none shadow-inner"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDaysEndModalOpen(false)}
                className="py-2.5 px-5 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/70 text-xs font-bold border border-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLog}
                  className="py-2.5 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-white text-xs font-bold border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLog ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-white/70" />}
                  <span>{copiedLog ? 'Copied to Clipboard!' : 'Copy Log Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadLog}
                  className="py-2.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .TXT Log</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
