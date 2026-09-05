import React, { useState, useMemo } from 'react';
import {
  Zap,
  Plus,
  Minus,
  Trash2,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { Product, CartItem, SaleTransaction } from '../../types';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';

export const QuickSale: React.FC = () => {
  const { products, settings, createSale } = usePubStore();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [activePaymentSale, setActivePaymentSale] = useState<SaleTransaction | null>(null);
  const [showFullPaymentModal, setShowFullPaymentModal] = useState(false);
  const [fastPayFeedback, setFastPayFeedback] = useState<string | null>(null);

  // Top fast-selling pub drinks
  const fastProducts = useMemo(() => {
    return products.filter((p) => p.active && (p.quickSaleEligible || p.category === 'BEER' || p.category === 'SOFT DRINKS'));
  }, [products]);

  const cartItems: CartItem[] = useMemo(() => {
    return (Object.entries(cart) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => {
        const p = products.find((prod) => prod.id === prodId)!;
        return {
          productId: p.id,
          name: p.name,
          category: p.category,
          unit: p.unit,
          unitPrice: p.sellingPrice,
          costPrice: p.costPrice,
          quantity: qty,
          discount: 0,
          subtotal: p.sellingPrice * qty,
        };
      });
  }, [cart, products]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  const totalItemsCount = useMemo(() => {
    return (Object.values(cart) as number[]).reduce((sum: number, q: number) => sum + q, 0);
  }, [cart]);

  const updateQuantity = (prodId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[prodId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[prodId];
        return copy;
      }
      return { ...prev, [prodId]: next };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Instant 1-Click Fast Cash Sale (under 5 seconds!)
  const handleInstantFastPay = async (method: 'CASH' | 'M-PESA') => {
    if (cartItems.length === 0) return;

    setFastPayFeedback(`Processing ${method} sale...`);
    const payments = [
      {
        method,
        amount: totalAmount,
        tendered: totalAmount,
        change: 0,
        reference: method === 'M-PESA' ? `QHL${Math.floor(Math.random() * 899999 + 100000)}` : undefined,
        timestamp: new Date().toISOString(),
      },
    ];

    const res = await createSale(
      cartItems,
      { name: 'Walk-in Rush Customer', type: 'walk-in' },
      method,
      payments
    );

    if (res.success && res.sale) {
      setCart({});
      setFastPayFeedback(null);
      setActivePaymentSale(res.sale);
    } else {
      setFastPayFeedback(res.error || 'Sale failed.');
      setTimeout(() => setFastPayFeedback(null), 3000);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Rush Hour Mode Bento Header */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">Speed Engine</span>
              <span className="text-[10px] uppercase font-mono font-bold bg-white/5 text-emerald-400 px-2.5 py-0.5 rounded-full border border-white/10">
                Sub-10s Rush Mode
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Rush Hour Quick Sale
            </h1>
            <p className="text-xs text-white/40">
              High-throughput touch grid with instant one-tap settlement for peak bar shifts.
            </p>
          </div>
        </div>

        {/* Quick Cart Summary in Bento Header */}
        {totalItemsCount > 0 && (
          <div className="flex items-center gap-4 bg-white/[0.03] px-5 py-3 rounded-2xl border border-white/5">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold font-mono">
                {totalItemsCount} items staged
              </div>
              <div className="text-lg font-mono font-bold text-amber-400">
                {settings.currency} {totalAmount.toLocaleString()}
              </div>
            </div>
            <button
              onClick={clearCart}
              className="text-white/40 hover:text-rose-400 p-1.5 rounded-xl hover:bg-white/5 transition-all"
              title="Clear Quick Cart"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid & Quick Checkout Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Giant Bento Touch Tiles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {fastProducts.map((prod) => {
              const count = cart[prod.id] || 0;
              const isLowStock = prod.stockQuantity <= prod.minStock;

              return (
                <div
                  key={prod.id}
                  className={`relative bg-[#121214] border rounded-[2rem] p-5 flex flex-col justify-between transition-all select-none group ${
                    count > 0
                      ? 'border-indigo-500/60 shadow-xl shadow-indigo-600/15 bg-[#17171d]'
                      : 'border-white/5 hover:border-white/20 hover:bg-[#161619]'
                  }`}
                >
                  {/* Stock tag & category */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono tracking-wider font-semibold text-white/40 uppercase">
                      {prod.category}
                    </span>
                    {prod.trackInventory && (
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isLowStock
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        {prod.stockQuantity} left
                      </span>
                    )}
                  </div>

                  {/* Product Title & Price */}
                  <div className="cursor-pointer my-2" onClick={() => updateQuantity(prod.id, 1)}>
                    <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                      {prod.name}
                    </h3>
                    <div className="text-base font-mono font-bold text-amber-400 mt-1">
                      {settings.currency} {prod.sellingPrice.toLocaleString()}
                    </div>
                  </div>

                  {/* Touch Quantity Stepper */}
                  <div className="mt-4 flex items-center justify-between bg-white/[0.03] rounded-2xl p-1.5 border border-white/5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, -1)}
                      disabled={count === 0}
                      className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white flex items-center justify-center font-black transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`text-sm font-mono font-bold px-2 ${
                        count > 0 ? 'text-indigo-400' : 'text-white/20'
                      }`}
                    >
                      {count}
                    </span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(prod.id, 1)}
                      className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Instant Pay Bento Panel */}
        <div className="space-y-4">
          <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-400">Order Slip</span>
                  <h2 className="text-lg font-bold text-white tracking-tight">Active Staging</h2>
                </div>
                {totalItemsCount > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 rounded-xl border border-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              {cartItems.length === 0 ? (
                <div className="py-16 text-center text-white/30 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-white/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium">Tap any drink tile to add to rush sale.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between bg-white/[0.02] p-3 rounded-2xl border border-white/5 text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-[#e0e0e4]">{item.name}</div>
                        <div className="text-[11px] text-white/40 font-mono mt-0.5">
                          {item.quantity} × {settings.currency} {item.unitPrice.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-amber-400">
                          {settings.currency} {item.subtotal.toLocaleString()}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, -item.quantity)}
                          className="text-white/30 hover:text-rose-400 p-1 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total & 1-Tap Payment Buttons */}
            <div className="border-t border-white/5 pt-5 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-bold text-white/40 font-mono">Rush Total:</span>
                <span className="text-3xl font-mono font-bold text-amber-400 tracking-tight">
                  {settings.currency} {totalAmount.toLocaleString()}
                </span>
              </div>

              {fastPayFeedback && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center text-xs text-amber-300 font-semibold animate-pulse">
                  {fastPayFeedback}
                </div>
              )}

              {/* 1-Tap Fast Pay Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleInstantFastPay('CASH')}
                  disabled={totalItemsCount === 0}
                  className="py-3.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>1-Tap Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInstantFastPay('M-PESA')}
                  disabled={totalItemsCount === 0}
                  className="py-3.5 px-3 rounded-2xl bg-green-600 hover:bg-green-500 disabled:opacity-30 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20 active:scale-95 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>1-Tap M-Pesa</span>
                </button>
              </div>

              {/* Full Payment Modal Trigger (for split, card, change calc) */}
              <button
                type="button"
                onClick={() => setShowFullPaymentModal(true)}
                disabled={totalItemsCount === 0}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/25 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Custom / Split Pay ({settings.currency} {totalAmount.toLocaleString()})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showFullPaymentModal && (
        <PaymentModal
          items={cartItems}
          customer={{ name: 'Walk-in Rush Customer', type: 'walk-in' }}
          discountPercentage={0}
          discountAmount={0}
          onClose={() => setShowFullPaymentModal(false)}
          onSuccess={(sale) => {
            setShowFullPaymentModal(false);
            setCart({});
            setActivePaymentSale(sale);
          }}
        />
      )}

      {/* Receipt Modal */}
      {activePaymentSale && (
        <ReceiptModal
          sale={activePaymentSale}
          onClose={() => setActivePaymentSale(null)}
          onNewSale={() => setActivePaymentSale(null)}
        />
      )}
    </div>
  );
};
