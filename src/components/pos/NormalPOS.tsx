import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  CreditCard,
  Layers,
  Sparkles,
  AlertTriangle,
  Check,
  ChevronRight,
  ShieldAlert,
  Percent,
  Beer,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { Product, ProductCategory, CartItem, CustomerInfo, SaleTransaction, ProductVariant } from '../../types';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { VoiceOrderMicrophone } from '../voice/VoiceOrderMicrophone';

export const NormalPOS: React.FC = () => {
  const {
    products,
    settings,
    currentUser,
    createApprovalRequest,
    posCart: cart,
    setPosCart: setCart,
    addToPosCart,
    updatePosCartQuantity,
    removeFromPosCart,
    clearPosCart,
  } = usePubStore();

  // Search and category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Customer state
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: 'Walk-in Customer',
    type: 'walk-in',
  });
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);

  // Discount state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Variant selector modal
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);

  // Payment & receipt modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);

  // Categories list
  const categories: Array<{ id: string; label: string }> = [
    { id: 'ALL', label: 'All Items' },
    { id: 'BEER', label: 'Beer' },
    { id: 'WHISKY', label: 'Whisky' },
    { id: 'VODKA', label: 'Vodka' },
    { id: 'GIN', label: 'Gin' },
    { id: 'RUM', label: 'Rum' },
    { id: 'COCKTAILS', label: 'Cocktails' },
    { id: 'SOFT DRINKS', label: 'Soft Drinks' },
    { id: 'WATER', label: 'Water' },
    { id: 'ENERGY DRINKS', label: 'Energy Drinks' },
  ];

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: Product, variant?: ProductVariant) => {
    addToPosCart(product, 1, variant);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    updatePosCartQuantity(index, delta);
  };

  const removeCartItem = (index: number) => {
    removeFromPosCart(index);
  };

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm('Clear all items in current order?')) return;
    clearPosCart();
    setDiscountPercent(0);
    setDiscountReason('');
  };

  // Cart Totals
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);
  const discountAmount = useMemo(() => {
    return Math.round((subtotal * discountPercent) / 100);
  }, [subtotal, discountPercent]);

  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = settings.isVatEnabled ? Math.round((taxableSubtotal * settings.vatRate) / 100) : 0;
  const serviceCharge = settings.isServiceChargeEnabled
    ? Math.round((taxableSubtotal * settings.serviceChargeRate) / 100)
    : 0;
  const grandTotal = Math.round(taxableSubtotal + taxAmount + serviceCharge);

  // Handle discount authorization
  const handleApplyDiscount = () => {
    setDiscountError(null);
    let allowedCap = settings.waiterDiscountCap; // 5%
    if (currentUser.role === 'supervisor') allowedCap = settings.supervisorDiscountCap; // 15%
    if (currentUser.role === 'manager' || currentUser.role === 'admin') allowedCap = 100;

    if (discountPercent > allowedCap) {
      // Trigger approval request workflow!
      createApprovalRequest(
        'DISCOUNT',
        {
          description: `Discount request of ${discountPercent}% on bill totaling ${settings.currency} ${subtotal.toLocaleString()}`,
          requestedValue: discountPercent,
          amount: Math.round((subtotal * discountPercent) / 100),
          reason: discountReason || 'VIP request exceeding waiter authority',
        },
        `cart-${Date.now()}`
      );
      setDiscountError(
        `Discount exceeds your ${allowedCap}% limit. Approval request sent to Supervisor/Manager. Reduced to ${allowedCap}% temporarily.`
      );
      setDiscountPercent(allowedCap);
      return;
    }

    setShowDiscountModal(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Categories & Product Catalog (7 or 8 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Microphone Voice Command Bar */}
          <VoiceOrderMicrophone defaultTarget="POS" />

          {/* Search & Category Pills Bento Container */}
          <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-4 sm:p-5 space-y-3 shadow-xl">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-indigo-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search drinks, SKU, or scan barcode (e.g. Tusker, Heineken, 6161...)"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#e0e0e4] placeholder-white/30 focus:outline-none focus:border-indigo-500/60 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-xs text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Categories Scroll */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-500/40 font-bold'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-h-[calc(100vh-270px)] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const isLow = prod.stockQuantity <= prod.minStock && prod.trackInventory;
              const hasVariants = prod.variants && prod.variants.length > 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    if (hasVariants) {
                      setSelectedProductForVariant(prod);
                    } else {
                      addToCart(prod);
                    }
                  }}
                  className="group bg-[#121214] hover:bg-[#161619] border border-white/5 hover:border-indigo-500/40 rounded-[2rem] p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all select-none shadow-xl hover:shadow-indigo-500/5 active:scale-[0.98]"
                >
                  <div>
                    {/* Top Tag & Stock */}
                    <div className="flex items-center justify-between gap-1 mb-2 text-[10px]">
                      <span className="font-mono text-white/40 uppercase font-semibold">{prod.category}</span>
                      {prod.trackInventory ? (
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-full text-[9px] border ${
                            isLow
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-white/5 text-white/50 border-white/10'
                          }`}
                        >
                          {prod.stockQuantity} {prod.unit}s
                        </span>
                      ) : (
                        <span className="text-white/30 font-medium font-mono text-[9px]">ON DEMAND</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-sm sm:text-base font-mono font-bold text-amber-400">
                        {settings.currency} {prod.sellingPrice.toLocaleString()}
                      </span>
                    </div>
                    {hasVariants ? (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                        Sizes
                      </span>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-white/5 group-hover:bg-indigo-600 group-hover:text-white text-white/60 flex items-center justify-center transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Cart Panel (5 or 4 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl flex flex-col justify-between h-full min-h-[600px] sticky top-24">
            {/* Customer Box */}
            <div className="border-b border-white/5 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">{customer.name}</span>
                    <span className="text-[10px] text-white/40 block uppercase font-mono">
                      {customer.type} {customer.phone ? `• ${customer.phone}` : ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  {isEditingCustomer ? 'Done' : 'Change'}
                </button>
              </div>

              {/* Edit Customer Input Drawer */}
              {isEditingCustomer && (
                <div className="mt-3 p-3 bg-white/[0.02] rounded-2xl border border-white/5 space-y-2.5">
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Customer Name (e.g. John Smith)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30"
                  />
                  <input
                    type="tel"
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="Phone number (optional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30"
                  />
                  <div className="flex gap-1.5">
                    {['walk-in', 'regular', 'vip'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCustomer({ ...customer, type: t as any })}
                        className={`flex-1 py-1.5 text-[10px] uppercase font-mono font-bold rounded-xl border transition-all ${
                          customer.type === t
                            ? 'bg-indigo-600 text-white border-indigo-500/40 shadow-sm'
                            : 'bg-white/5 text-white/50 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[300px]">
              {cart.length === 0 ? (
                <div className="py-16 text-center text-white/30 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto text-white/20">
                    <Beer className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium">Order cart is empty.</p>
                  <p className="text-[11px] text-white/20">Select Drinks from Catalog </p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#e0e0e4] truncate">{item.name}</div>
                      <div className="text-[11px] text-white/40 font-mono mt-0.5">
                        {settings.currency} {item.unitPrice.toLocaleString()} each
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => updateCartQuantity(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-indigo-400 text-xs">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className="font-mono font-bold text-amber-400">
                        {settings.currency} {item.subtotal.toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeCartItem(idx)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Order Actions */}
            <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
              {/* Financial Lines */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-white/50">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-white/90">
                    {settings.currency} {subtotal.toLocaleString()}
                  </span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">
                      -{settings.currency} {discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                {settings.isVatEnabled && (
                  <div className="flex justify-between text-white/50">
                    <span>VAT ({settings.vatRate}%):</span>
                    <span className="font-mono text-white/90">
                      {settings.currency} {taxAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-mono font-bold text-amber-400 border-t border-white/5 pt-2 mt-2">
                  <span>Total Due:</span>
                  <span>
                    {settings.currency} {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Utility actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(true)}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-white/80 border border-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{discountPercent > 0 ? `Discount (${discountPercent}%)` : 'Discount'}</span>
                </button>

                <button
                  type="button"
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-2xl bg-white/5 hover:bg-rose-500/10 disabled:opacity-30 text-xs font-semibold text-rose-400 border border-white/5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* PAY BUTTON */}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
                className="w-full py-4 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-white" />
                <span>Pay {settings.currency} {grandTotal.toLocaleString()}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Serving / Size</span>
              <h3 className="font-bold text-base text-white">{selectedProductForVariant.name}</h3>
            </div>
            <div className="space-y-2 pt-1">
              {selectedProductForVariant.variants?.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    addToCart(selectedProductForVariant, v);
                    setSelectedProductForVariant(null);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-indigo-500/30 flex items-center justify-between text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  <span>{v.name}</span>
                  <span className="font-mono font-bold text-amber-400">
                    {settings.currency} {v.sellingPrice.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedProductForVariant(null)}
              className="w-full py-2.5 text-xs font-semibold text-white/40 hover:text-white mt-1 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Discount Modal with Role Authorization Validation */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Discretionary</span>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-400" />
                <span>Apply Order Discount</span>
              </h3>
            </div>
            <p className="text-xs text-white/50">
              Role allowance for {currentUser.name}:{' '}
              <strong className="text-amber-400 font-mono">
                {currentUser.role === 'waiter' ? '5%' : currentUser.role === 'supervisor' ? '15%' : '100%'}
              </strong>
            </p>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`py-2.5 rounded-2xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-lg shadow-indigo-600/25'
                      : 'bg-white/5 text-white/70 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-widest font-mono font-semibold text-white/40">Reason / Justification</label>
              <input
                type="text"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="e.g. VIP patron, Birthday, Manager discretion"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {discountError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{discountError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          items={cart}
          customer={customer}
          discountPercentage={discountPercent}
          discountAmount={discountAmount}
          discountReason={discountReason}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(sale) => {
            setShowPaymentModal(false);
            setCart([]);
            setDiscountPercent(0);
            setDiscountReason('');
            setCompletedSale(sale);
          }}
        />
      )}

      {/* Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
