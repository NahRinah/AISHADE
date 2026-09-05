import React from 'react';
import { AlertTriangle, ShieldAlert, ArrowDownRight, Sparkles, Mail } from 'lucide-react';
import { Product } from '../../types';

interface RestockNowBadgeProps {
  product: Product;
  onClick?: (productId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const RestockNowBadge: React.FC<RestockNowBadgeProps> = ({
  product,
  onClick,
  size = 'md',
  showDetails = true,
}) => {
  if (!product.trackInventory) return null;

  const current = product.stockQuantity;
  const threshold = product.minStock;

  // Only render if reaching or below the threshold
  if (current > threshold) return null;

  const isOutOfStock = current === 0;
  const isCritical = current <= Math.floor(threshold / 2);
  const deficit = Math.max(0, threshold - current);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(product.id);
    }
  };

  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      title={
        isClickable
          ? `Click to generate restock order email for ${product.name} (Current: ${current}, Min: ${threshold}, Deficit: ${deficit})`
          : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-black uppercase tracking-wider transition-all ${
        isClickable
          ? 'cursor-pointer hover:scale-105 active:scale-95 shadow-md'
          : 'cursor-default'
      } ${
        isOutOfStock
          ? 'bg-rose-500 text-white border border-rose-400/50 shadow-rose-500/30 shadow-lg animate-pulse'
          : isCritical
          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/20'
      } ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[9px]'
          : size === 'lg'
          ? 'px-3.5 py-1.5 text-xs'
          : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      {/* Animated Ping Beacon */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOutOfStock ? 'bg-white' : isCritical ? 'bg-rose-400' : 'bg-amber-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isOutOfStock ? 'bg-white' : isCritical ? 'bg-rose-500' : 'bg-amber-500'
          }`}
        />
      </span>

      {/* Alert Icon */}
      {isOutOfStock ? (
        <ShieldAlert className="w-3 h-3 shrink-0 text-white" />
      ) : (
        <AlertTriangle className="w-3 h-3 shrink-0" />
      )}

      {/* Main Label */}
      <span className="font-extrabold whitespace-nowrap">RESTOCK NOW</span>

      {/* Additional Deficit context if enabled */}
      {showDetails && (
        <span
          className={`text-[9px] font-bold px-1 rounded ${
            isOutOfStock
              ? 'bg-black/30 text-white'
              : isCritical
              ? 'bg-rose-500/30 text-rose-200'
              : 'bg-amber-500/30 text-amber-200'
          }`}
        >
          {isOutOfStock ? '0 UNITS' : `-${deficit} ${product.unit}`}
        </span>
      )}

      {/* Mail Icon Cue when clickable */}
      {isClickable && <Mail className="w-2.5 h-2.5 opacity-70 ml-0.5" />}
    </button>
  );
};
