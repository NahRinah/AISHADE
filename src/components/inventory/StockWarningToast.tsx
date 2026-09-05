import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ArrowUpRight, Volume2, VolumeX, ShieldAlert, PackageCheck, Mail } from 'lucide-react';
import { StockAlert } from './stockAlertTypes';

interface StockWarningToastProps {
  alert: StockAlert | null;
  onDismiss: () => void;
  onRestock: (productId: string, quantity: number) => void;
  onAdjustThreshold: (productId: string) => void;
  onOpenRestockEmail?: (productId: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  currency: string;
}

export const StockWarningToast: React.FC<StockWarningToastProps> = ({
  alert,
  onDismiss,
  onRestock,
  onAdjustThreshold,
  onOpenRestockEmail,
  soundEnabled,
  toggleSound,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!alert) return;
    setProgress(100);
    const interval = 100;
    const totalTime = 7000;
    const step = (interval / totalTime) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCritical = alert.severity === 'critical' || alert.severity === 'out_of_stock';
  const severityLabel =
    alert.severity === 'out_of_stock'
      ? 'Out of Stock'
      : alert.severity === 'critical'
      ? 'Critical Deficit'
      : 'Stock Warning';

  const recommendedOrder = Math.max(12, (alert.reorderLevel || alert.threshold * 2) - alert.currentStock);

  return (
    <div
      id="inventory-stock-warning-toast"
      className="fixed top-20 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div
        className={`relative overflow-hidden rounded-[2rem] border shadow-2xl backdrop-blur-xl transition-all ${
          isCritical
            ? 'bg-[#181114]/95 border-rose-500/40 shadow-rose-950/40'
            : 'bg-[#161412]/95 border-amber-500/40 shadow-amber-950/40'
        }`}
      >
        {/* Top Progress Bar */}
        <div className="w-full h-1 bg-white/10">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isCritical ? 'bg-rose-500' : 'bg-amber-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isCritical
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {isCritical ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {severityLabel}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">Real-Time Trigger</span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight mt-0.5">{alert.productName}</h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
              </button>
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Telemetry Metric Box */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase text-white/40">Stock on Shelf</div>
              <div className={`font-mono font-bold text-base ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                {alert.currentStock} {alert.unit}s
              </div>
            </div>

            <div className="text-center px-2">
              <div className="text-[10px] font-mono uppercase text-white/40">Defined Threshold</div>
              <div className="font-mono font-bold text-base text-white/90">
                {alert.threshold} {alert.unit}s
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-white/40">Deficit Gap</div>
              <div className="font-mono font-bold text-base text-rose-400">
                -{alert.deficit} {alert.unit}s
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <button
              onClick={() => {
                onRestock(alert.productId, recommendedOrder);
                onDismiss();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Intake Restock (+{recommendedOrder})</span>
            </button>

            {onOpenRestockEmail && (
              <button
                onClick={() => {
                  onOpenRestockEmail(alert.productId);
                  onDismiss();
                }}
                className="py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Auto-generate restock request email template for distributor"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Restock Email</span>
              </button>
            )}

            <button
              onClick={() => {
                onAdjustThreshold(alert.productId);
                onDismiss();
              }}
              className="py-2 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Edit safety threshold"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
