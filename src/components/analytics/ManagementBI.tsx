import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Download,
  ShieldAlert,
  Percent,
  Layers,
  Sparkles,
  ArrowUpRight,
  Beer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { usePubStore } from '../../services/store';

export const ManagementBI: React.FC = () => {
  const { sales, products, settings, currentUser } = usePubStore();

  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Authorization check: Waiters do not have executive BI access
  if (currentUser.role === 'waiter') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-[#151822] border border-[#272d3e] rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-base font-bold text-zinc-100 uppercase">Restricted Access</h2>
        <p className="text-xs text-zinc-400">
          Executive financial reporting, gross margins, and COGS calculations are restricted to Manager and Admin
          credentials. Switch User.
        </p>
      </div>
    );
  }

  // Filter sales based on time range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (s.status !== 'PAID') return false;
      const d = new Date(s.createdAt);
      if (timeRange === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= monthAgo;
      }
      return true;
    });
  }, [sales, timeRange]);

  // Financial KPIs
  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((sum, s) => {
      const saleCost = s.items.reduce((cSum, it) => cSum + it.costPrice * it.quantity, 0);
      return sum + saleCost;
    }, 0);
  }, [filteredSales]);

  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const totalTransactions = filteredSales.length;
  const avgBasketSize = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  // Hourly curve data
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let i = 12; i <= 23; i++) hoursMap[i] = 0;
    for (let i = 0; i <= 3; i++) hoursMap[i] = 0;

    filteredSales.forEach((s) => {
      const h = new Date(s.createdAt).getHours();
      if (hoursMap[h] !== undefined) {
        hoursMap[h] += s.total;
      }
    });

    return Object.entries(hoursMap).map(([hour, rev]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      revenue: rev,
    }));
  }, [filteredSales]);

  // Category sales breakdown
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        catMap[it.category] = (catMap[it.category] || 0) + it.subtotal;
      });
    });

    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308'];
    return Object.entries(catMap).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [filteredSales]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const methodMap: Record<string, number> = { 'M-PESA': 0, CASH: 0, CARD: 0 };
    filteredSales.forEach((s) => {
      s.payments.forEach((p) => {
        methodMap[p.method] = (methodMap[p.method] || 0) + p.amount;
      });
    });

    return [
      { name: 'M-Pesa', value: methodMap['M-PESA'], color: '#22c55e' },
      { name: 'Cash', value: methodMap['CASH'], color: '#f59e0b' },
      { name: 'Card', value: methodMap['CARD'], color: '#3b82f6' },
    ].filter((p) => p.value > 0);
  }, [filteredSales]);

  // Top 10 Best Sellers
  const topProducts = useMemo(() => {
    const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        if (!prodMap[it.productId]) {
          prodMap[it.productId] = { name: it.name, quantity: 0, revenue: 0 };
        }
        prodMap[it.productId].quantity += it.quantity;
        prodMap[it.productId].revenue += it.subtotal;
      });
    });

    return Object.values(prodMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredSales]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Sale ID', 'Date Time', 'Waiter', 'Customer', 'Items Count', 'Total', 'Payment Method'];
    const rows = filteredSales.map((s) => [
      s.id,
      new Date(s.createdAt).toISOString(),
      s.waiterName,
      s.customer.name,
      s.items.reduce((sum, it) => sum + it.quantity, 0),
      s.total,
      s.paymentMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GoT_Pub_Sales_${timeRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Business Intelligence</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Executive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Management Intelligence & Analytics
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              COGS breakdown, Gross Margin %, rush-hour curves, and M-Pesa vs Cash payment reconciliation.
            </p>
          </div>
        </div>

        {/* Time Filters & Export */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
            {(['today', 'week', 'month', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold uppercase transition-all cursor-pointer ${
                  timeRange === r
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white text-xs font-semibold border border-white/10 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Total Revenue</span>
          <div className="text-2xl font-mono font-bold text-amber-400 mt-2">
            {settings.currency} {totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-white/40 font-mono mt-1 block">{totalTransactions} paid tickets</span>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Cost of Goods (COGS)</span>
          <div className="text-2xl font-mono font-bold text-white/80 mt-2">
            {settings.currency} {Math.round(totalCOGS).toLocaleString()}
          </div>
          <span className="text-[10px] text-white/40 font-mono mt-1 block">Bar wholesale cost</span>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Gross Profit</span>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-2">
            {settings.currency} {Math.round(grossProfit).toLocaleString()}
          </div>
          <span className="text-[10px] text-white/40 font-mono mt-1 block">Net markup generated</span>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Gross Margin %</span>
          <div className="text-2xl font-mono font-bold text-indigo-400 mt-2">{grossMarginPercent}%</div>
          <span className="text-[10px] text-white/40 font-mono mt-1 block">Pub target: &gt; 55%</span>
        </div>

        <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
          <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">Avg Spend / Ticket</span>
          <div className="text-2xl font-mono font-bold text-white mt-2">
            {settings.currency} {avgBasketSize.toLocaleString()}
          </div>
          <span className="text-[10px] text-white/40 font-mono mt-1 block">Per customer order</span>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hourly Sales Curve / Rush Hour Peak Detection (8 cols) */}
        <div className="lg:col-span-8 bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Traffic Peak</span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Hourly Rush Hour Revenue Curve
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">Peak customer ordering pattern across 24 hours</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232838" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181c28', borderColor: '#2c3347', borderRadius: '8px' }}
                  formatter={(val: any) => [`${settings.currency} ${Number(val).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution (4 cols) */}
        <div className="lg:col-span-4 bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Tender Share</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Payment Channels Breakdown
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">M-Pesa vs Cash vs Card</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#181c28', borderColor: '#2c3347', borderRadius: '8px' }}
                  formatter={(val: any) => [`${settings.currency} ${Number(val).toLocaleString()}`, 'Total']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2 pt-1">
            {paymentMethodData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-white/80 font-medium">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {settings.currency} {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Best Sellers & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Top 8 Selling Products Table (7 cols) */}
        <div className="lg:col-span-7 bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Velocity</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Top Selling Pub Drinks
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">Ranked by revenue contribution</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-3">Drink</th>
                  <th className="py-2.5 px-3 text-center">Volume Sold</th>
                  <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      <span className="text-indigo-400 font-mono mr-2">#{idx + 1}</span>
                      {p.name}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-white/80">{p.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                      {settings.currency} {p.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Share (5 cols) */}
        <div className="lg:col-span-5 bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="border-b border-white/5 pb-4">
            <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Mix Breakdown</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Sales by Drink Category
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">Beer vs Spirits vs Cocktails vs Wine</p>
          </div>

          <div className="space-y-3 pt-1">
            {categoryData.map((cat) => {
              const pct = totalRevenue > 0 ? Math.round((cat.value / totalRevenue) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-white/90">{cat.name}</span>
                    <span className="text-amber-400 font-mono font-bold">
                      {settings.currency} {cat.value.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
