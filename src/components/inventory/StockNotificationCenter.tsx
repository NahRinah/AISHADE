import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Bell,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  ArrowUpRight,
  PackageCheck,
  Sliders,
  Sparkles,
  RefreshCw,
  Clock,
  Filter,
  CheckCheck,
  Mail,
} from 'lucide-react';
import { StockAlert } from './stockAlertTypes';
import { Product } from '../../types';
import { playStockAlertChime } from './stockAlertAudio';

interface StockNotificationCenterProps {
  alerts: StockAlert[];
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onAcknowledgeAll: () => void;
  onSnooze: (alertId: string, minutes: number) => void;
  onRestock: (productId: string, suggestedQuantity: number) => void;
  onOpenThresholdModal: (productId?: string) => void;
  onOpenRestockEmail?: (productId?: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSimulateStockDrop: (productId: string, dropQty: number) => void;
}

export const StockNotificationCenter: React.FC<StockNotificationCenterProps> = ({
  alerts,
  products,
  isOpen,
  onClose,
  onAcknowledge,
  onAcknowledgeAll,
  onSnooze,
  onRestock,
  onOpenThresholdModal,
  onOpenRestockEmail,
  soundEnabled,
  onToggleSound,
  onSimulateStockDrop,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'out_of_stock' | 'acknowledged'>('all');
  const [testProductId, setTestProductId] = useState<string>(products[0]?.id || '');
  const [testDropAmount, setTestDropAmount] = useState<number>(5);

  if (!isOpen) return null;

  const activeAlerts = alerts.filter((a) => {
    if (a.snoozedUntil && a.snoozedUntil > Date.now()) return false;
    if (filter === 'all') return !a.acknowledged;
    if (filter === 'critical') return !a.acknowledged && a.severity === 'critical';
    if (filter === 'warning') return !a.acknowledged && a.severity === 'warning';
    if (filter === 'out_of_stock') return !a.acknowledged && a.severity === 'out_of_stock';
    if (filter === 'acknowledged') return a.acknowledged;
    return true;
  });

  const criticalCount = alerts.filter((a) => !a.acknowledged && a.severity === 'critical').length;
  const oosCount = alerts.filter((a) => !a.acknowledged && a.severity === 'out_of_stock').length;
  const warningCount = alerts.filter((a) => !a.acknowledged && a.severity === 'warning').length;
  const totalDeficitUnits = alerts
    .filter((a) => !a.acknowledged)
    .reduce((acc, a) => acc + Math.max(0, a.deficit), 0);

  const handleTestChime = () => {
    playStockAlertChime('warning');
  };

  const handleRunSimulation = () => {
    if (!testProductId) return;
    onSimulateStockDrop(testProductId, testDropAmount);
  };

  return (
    <div
      id="stock-notification-center-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="stock-notification-center-modal"
        className="bg-[#121214] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="p-6 sm:p-7 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-amber-400">
                  Real-Time Watchdog
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {alerts.filter((a) => !a.acknowledged).length} Active Breaches
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Stock Warning Notification Center
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Real-time alerts triggered when beverage or spirit levels fall below configured thresholds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Generate Restock Email */}
            {onOpenRestockEmail && (
              <button
                onClick={() => {
                  onOpenRestockEmail();
                  onClose();
                }}
                className="py-2 px-3.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-500/5 cursor-pointer"
                title="Auto-generate restock request email for all low-stock items"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Auto-Generate Restock Email</span>
              </button>
            )}

            {/* Audio Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20'
                  : 'bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/5'
              }`}
              title={soundEnabled ? 'Alert chime is ON. Click to mute.' : 'Alert chime is MUTED. Click to enable.'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline font-mono">{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
            </button>

            {/* Test Chime */}
            {soundEnabled && (
              <button
                onClick={handleTestChime}
                className="py-2 px-3 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-xs font-mono transition-colors cursor-pointer"
                title="Play test audio chime"
              >
                Test Chime
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="p-6 sm:p-7 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02]">
          <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Below Threshold</span>
            <div className="text-xl font-mono font-bold text-amber-300 mt-1">
              {warningCount + criticalCount + oosCount} items
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-0.5">Under defined minStock</div>
          </div>

          <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400">Critical / OOS</span>
            <div className="text-xl font-mono font-bold text-rose-400 mt-1">
              {criticalCount + oosCount} items
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-0.5">Need immediate restock</div>
          </div>

          <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">Total Deficit Gap</span>
            <div className="text-xl font-mono font-bold text-indigo-300 mt-1">
              -{totalDeficitUnits} units
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-0.5">Required to replenish</div>
          </div>

          <div className="bg-[#18181b] border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Threshold Rules</span>
            <button
              onClick={() => onOpenThresholdModal()}
              className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Thresholds</span>
            </button>
          </div>
        </div>

        {/* Live Simulation & Test Banner */}
        <div className="px-6 py-3.5 bg-indigo-500/[0.04] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-white">Live Alert Simulator:</span>
            <span className="text-xs text-white/40 hidden md:inline">
              Simulate high beverage consumption to trigger threshold warning in real time
            </span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={testProductId}
              onChange={(e) => setTestProductId(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
            >
              {products
                .filter((p) => p.trackInventory)
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#18181b]">
                    {p.name} (Stock: {p.stockQuantity} • Min: {p.minStock})
                  </option>
                ))}
            </select>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-white/40 font-mono">Drop:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={testDropAmount}
                onChange={(e) => setTestDropAmount(Number(e.target.value))}
                className="w-14 bg-white/[0.04] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono"
              />
            </div>

            <button
              onClick={handleRunSimulation}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer font-mono"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Trigger Test Drop</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs & Bulk Actions */}
        <div className="px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              All Active ({alerts.filter((a) => !a.acknowledged).length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === 'critical'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === 'warning'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Low Stock ({warningCount})
            </button>
            <button
              onClick={() => setFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === 'out_of_stock'
                  ? 'bg-zinc-700 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Out of Stock ({oosCount})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === 'acknowledged'
                  ? 'bg-white/20 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              Acknowledged ({alerts.filter((a) => a.acknowledged).length})
            </button>
          </div>

          {alerts.filter((a) => !a.acknowledged).length > 0 && (
            <button
              onClick={onAcknowledgeAll}
              className="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Acknowledge All</span>
            </button>
          )}
        </div>

        {/* Alerts List */}
        <div className="p-6 sm:p-7 flex-1 overflow-y-auto space-y-3 max-h-[500px]">
          {activeAlerts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Active Threshold Warnings</h3>
              <p className="text-xs text-white/40 max-w-md mx-auto">
                All tracked cellar and beverage stocks are currently above their defined minimum threshold. Any new stock
                drop will trigger an instant alert here.
              </p>
              <button
                onClick={handleRunSimulation}
                className="py-2 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Trigger Test Stock Drop
              </button>
            </div>
          ) : (
            activeAlerts.map((alert) => {
              const isCrit = alert.severity === 'critical' || alert.severity === 'out_of_stock';
              const fillPct = Math.min(100, Math.round((alert.currentStock / Math.max(1, alert.threshold)) * 100));
              const recommendedOrder = Math.max(12, (alert.reorderLevel || alert.threshold * 2) - alert.currentStock);

              return (
                <div
                  key={alert.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                    alert.acknowledged
                      ? 'bg-white/[0.01] border-white/5 opacity-60'
                      : isCrit
                      ? 'bg-rose-500/[0.03] border-rose-500/30 hover:border-rose-500/50'
                      : 'bg-amber-500/[0.03] border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
                          isCrit
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isCrit ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              alert.severity === 'out_of_stock'
                                ? 'bg-zinc-800 text-rose-300 border-rose-500/30'
                                : alert.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {alert.severity === 'out_of_stock'
                              ? 'OUT OF STOCK'
                              : alert.severity === 'critical'
                              ? 'CRITICAL DEFICIT'
                              : 'LOW STOCK WARNING'}
                          </span>
                          <span className="text-xs font-bold text-white/90">{alert.productName}</span>
                          <span className="text-[10px] text-white/40 font-mono">
                            {alert.category} • SKU: {alert.sku}
                          </span>
                        </div>

                        <div className="text-xs text-white/60 flex items-center gap-3 font-mono">
                          <span>
                            Stock: <strong className={isCrit ? 'text-rose-400' : 'text-amber-400'}>{alert.currentStock} {alert.unit}s</strong>
                          </span>
                          <span>•</span>
                          <span>Defined Threshold: <strong>{alert.threshold} {alert.unit}s</strong></span>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">Deficit: -{alert.deficit} {alert.unit}s</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-64 sm:w-80 bg-white/5 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${
                              isCrit ? 'bg-rose-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          onRestock(alert.productId, recommendedOrder);
                          onClose();
                        }}
                        className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Quick Restock (+{recommendedOrder})</span>
                      </button>

                      {onOpenRestockEmail && (
                        <button
                          onClick={() => {
                            onOpenRestockEmail(alert.productId);
                            onClose();
                          }}
                          className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Generate restock order email for this beverage"
                        >
                          <Mail className="w-3.5 h-3.5 text-amber-400" />
                          <span>Email PO</span>
                        </button>
                      )}

                      <button
                        onClick={() => onOpenThresholdModal(alert.productId)}
                        className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Edit threshold rule for this product"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Adjust Threshold</span>
                      </button>

                      {!alert.acknowledged ? (
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Mark alert as acknowledged"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Acknowledge</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged
                        </span>
                      )}

                      <button
                        onClick={() => onSnooze(alert.id, 15)}
                        className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Snooze alert for 15 minutes"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/5 bg-white/[0.01] flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono">Listening for stock updates from POS, wastage & counts</span>
          </div>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-white font-semibold transition-colors cursor-pointer"
          >
            Close Center
          </button>
        </div>
      </div>
    </div>
  );
};
