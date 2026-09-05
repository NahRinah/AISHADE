import React, { useState, useMemo } from 'react';
import {
  X,
  Banknote,
  Smartphone,
  CreditCard,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Loader2,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { CartItem, CustomerInfo, PaymentMethod, PaymentRecord, SaleTransaction } from '../../types';

interface PaymentModalProps {
  items: CartItem[];
  customer: CustomerInfo;
  discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
  onClose: () => void;
  onSuccess: (sale: SaleTransaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  items,
  customer,
  discountPercentage,
  discountAmount,
  discountReason,
  onClose,
  onSuccess,
}) => {
  const { settings, createSale } = usePubStore();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Financial calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
  const appliedDiscount = useMemo(() => {
    if (discountAmount > 0) return discountAmount;
    if (discountPercentage > 0) return Math.round((subtotal * discountPercentage) / 100);
    return 0;
  }, [subtotal, discountAmount, discountPercentage]);

  const taxableSubtotal = Math.max(0, subtotal - appliedDiscount);
  const taxAmount = settings.isVatEnabled ? Math.round((taxableSubtotal * settings.vatRate) / 100) : 0;
  const serviceCharge = settings.isServiceChargeEnabled
    ? Math.round((taxableSubtotal * settings.serviceChargeRate) / 100)
    : 0;
  const grandTotal = Math.round(taxableSubtotal + taxAmount + serviceCharge);

  // Cash state
  const [cashTendered, setCashTendered] = useState<number>(grandTotal);
  const cashChange = Math.max(0, cashTendered - grandTotal);

  // M-Pesa state
  const [mpesaPhone, setMpesaPhone] = useState<string>(customer.phone || '07');
  const [mpesaReference, setMpesaReference] = useState<string>('');
  const [mpesaStkState, setMpesaStkState] = useState<'idle' | 'prompting' | 'confirmed'>('idle');

  // Card state
  const [cardAuthRef, setCardAuthRef] = useState<string>('');

  // Split payment state
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitMpesa, setSplitMpesa] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [splitMpesaRef, setSplitMpesaRef] = useState<string>('');

  const splitTotalAccounted = splitCash + splitMpesa + splitCard;
  const splitRemaining = grandTotal - splitTotalAccounted;

  // Trigger simulated M-Pesa STK Push
  const handleTriggerStkPush = () => {
    if (!mpesaPhone || mpesaPhone.length < 9) {
      setErrorMessage('Please enter a valid Safaricom phone number.');
      return;
    }
    setErrorMessage(null);
    setMpesaStkState('prompting');

    setTimeout(() => {
      // Auto-generate realistic M-Pesa confirmation code: e.g. QHL892X01Z
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let autoRef = 'Q';
      for (let i = 0; i < 9; i++) {
        autoRef += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setMpesaReference(autoRef);
      setMpesaStkState('confirmed');
    }, 2200);
  };

  const handleExecutePayment = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      let payments: PaymentRecord[] = [];

      if (selectedMethod === 'CASH') {
        if (cashTendered < grandTotal) {
          setErrorMessage(`Insufficient cash tendered. Total is ${settings.currency} ${grandTotal.toLocaleString()}.`);
          setIsProcessing(false);
          return;
        }
        payments = [
          {
            method: 'CASH',
            amount: grandTotal,
            tendered: cashTendered,
            change: cashChange,
            timestamp: new Date().toISOString(),
          },
        ];
      } else if (selectedMethod === 'M-PESA') {
        const ref = mpesaReference.trim() || `MP-${Date.now().toString().slice(-6)}`;
        payments = [
          {
            method: 'M-PESA',
            amount: grandTotal,
            reference: ref,
            timestamp: new Date().toISOString(),
          },
        ];
      } else if (selectedMethod === 'CARD') {
        const ref = cardAuthRef.trim() || `CRD-${Date.now().toString().slice(-6)}`;
        payments = [
          {
            method: 'CARD',
            amount: grandTotal,
            reference: ref,
            timestamp: new Date().toISOString(),
          },
        ];
      } else if (selectedMethod === 'SPLIT') {
        if (splitRemaining !== 0) {
          setErrorMessage(
            `Split balance is not reconciled! Remaining: ${settings.currency} ${splitRemaining.toLocaleString()}`
          );
          setIsProcessing(false);
          return;
        }

        if (splitCash > 0) {
          payments.push({
            method: 'CASH',
            amount: splitCash,
            tendered: splitCash,
            change: 0,
            timestamp: new Date().toISOString(),
          });
        }
        if (splitMpesa > 0) {
          payments.push({
            method: 'M-PESA',
            amount: splitMpesa,
            reference: splitMpesaRef.trim() || `MP-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toISOString(),
          });
        }
        if (splitCard > 0) {
          payments.push({
            method: 'CARD',
            amount: splitCard,
            reference: `CRD-${Date.now().toString().slice(-6)}`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const res = await createSale(
        items,
        customer,
        selectedMethod,
        payments,
        discountPercentage,
        appliedDiscount,
        discountReason
      );

      if (res.success && res.sale) {
        onSuccess(res.sale);
      } else {
        setErrorMessage(res.error || 'Payment execution failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while processing payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-white/10 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Banknote className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Checkout</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Complete Transaction</h2>
              <div className="text-[11px] text-white/40 flex items-center gap-2 mt-0.5">
                <span>Customer: <strong className="text-white/80">{customer.name}</strong></span>
                <span>•</span>
                <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/40 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Total Due Banner */}
          <div className="bg-white/[0.02] border border-white/5 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-white/40 font-mono font-semibold">Total Amount Due</span>
              {appliedDiscount > 0 && (
                <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                  Discount applied: -{settings.currency} {appliedDiscount.toLocaleString()}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tracking-tight">
                {settings.currency} {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest font-semibold text-white/40 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote, color: 'hover:border-white/20' },
                { id: 'M-PESA', label: 'M-Pesa', icon: Smartphone, color: 'hover:border-green-500/40' },
                { id: 'CARD', label: 'Bank Card', icon: CreditCard, color: 'hover:border-blue-500/40' },
                { id: 'SPLIT', label: 'Split Pay', icon: Layers, color: 'hover:border-amber-500/40' },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(m.id as PaymentMethod);
                      setErrorMessage(null);
                    }}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-lg shadow-indigo-600/25 font-bold'
                        : `bg-white/[0.03] text-white/50 border-white/5 ${m.color} hover:text-white`
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-white/40'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method Specific Panel */}
          {selectedMethod === 'CASH' && (
            <div className="bg-[#181c28] border border-[#293042] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                <span>Cash Tendered</span>
                <span className="text-zinc-400">Quick Denominations</span>
              </div>

              {/* Quick Cash Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[grandTotal, 500, 1000, 2000, 5000].map((val, idx) => {
                  if (val < grandTotal && val !== grandTotal) return null;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashTendered(val)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                        cashTendered === val
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-[#1f2434] text-zinc-300 border-[#30374c] hover:bg-[#252b3e]'
                      }`}
                    >
                      {val === grandTotal ? 'Exact' : `${val}`}
                    </button>
                  );
                })}
              </div>

              {/* Custom Tendered Input */}
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-400 font-bold">{settings.currency}</span>
                <input
                  type="number"
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  placeholder="Enter cash given"
                  className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg pl-14 pr-3 py-2 text-base font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Prominent Change Due */}
              <div className="p-3 bg-[#131620] border border-[#2b3245] rounded-lg flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">Change Due:</span>
                <span
                  className={`text-xl font-black ${
                    cashChange > 0 ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                >
                  {settings.currency} {cashChange.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {selectedMethod === 'M-PESA' && (
            <div className="bg-[#181c28] border border-[#293042] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="text-zinc-300 font-medium">
                  Pub Till: <strong className="text-amber-300">{settings.mpesaTillNumber}</strong>
                </div>
                <div className="text-zinc-400">
                  Paybill: <strong className="text-zinc-200">{settings.mpesaPaybillNumber}</strong>
                </div>
              </div>

              {/* STK Push Simulation / Fast Prompt */}
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Customer Safaricom Number (STK Push)
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    placeholder="07XXXXXXXX or 01XXXXXXXX"
                    className="flex-1 bg-[#12151f] border border-[#2f364b] rounded-lg px-3 py-2 text-xs font-semibold text-zinc-100 focus:outline-none focus:border-green-500"
                  />
                  <button
                    type="button"
                    onClick={handleTriggerStkPush}
                    disabled={mpesaStkState === 'prompting'}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    {mpesaStkState === 'prompting' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Prompting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>STK Push</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {mpesaStkState === 'confirmed' && (
                <div className="p-2.5 bg-green-950/40 border border-green-700/50 rounded-lg flex items-center gap-2 text-xs text-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span>
                    STK Push confirmed! Reference: <strong>{mpesaReference}</strong>
                  </span>
                </div>
              )}

              {/* Manual M-Pesa Code Input */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Or Enter M-Pesa Confirmation Code (e.g. QHL892X01Z)
                </label>
                <input
                  type="text"
                  value={mpesaReference}
                  onChange={(e) => setMpesaReference(e.target.value.toUpperCase())}
                  placeholder="e.g. QHL892X01Z"
                  className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-100 uppercase tracking-wider focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          )}

          {selectedMethod === 'CARD' && (
            <div className="bg-[#181c28] border border-[#293042] p-4 rounded-xl space-y-3">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                PDQ / Terminal Authorization Code
              </label>
              <input
                type="text"
                value={cardAuthRef}
                onChange={(e) => setCardAuthRef(e.target.value.toUpperCase())}
                placeholder="e.g. AUTH-881920"
                className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-zinc-400">
                Swipe or tap customer Visa / Mastercard on pub terminal, then input auth code.
              </p>
            </div>
          )}

          {selectedMethod === 'SPLIT' && (
            <div className="bg-[#181c28] border border-[#293042] p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total to Split:</span>
                <span className="font-bold text-zinc-200">
                  {settings.currency} {grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Cash Portion</label>
                  <input
                    type="number"
                    value={splitCash || ''}
                    onChange={(e) => setSplitCash(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg p-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">M-Pesa Portion</label>
                  <input
                    type="number"
                    value={splitMpesa || ''}
                    onChange={(e) => setSplitMpesa(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg p-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase mb-1">Card Portion</label>
                  <input
                    type="number"
                    value={splitCard || ''}
                    onChange={(e) => setSplitCard(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg p-2 text-xs font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {splitMpesa > 0 && (
                <input
                  type="text"
                  value={splitMpesaRef}
                  onChange={(e) => setSplitMpesaRef(e.target.value.toUpperCase())}
                  placeholder="M-Pesa Reference code"
                  className="w-full bg-[#12151f] border border-[#2f364b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-200"
                />
              )}

              {/* Balance status */}
              <div
                className={`p-2 rounded-lg flex items-center justify-between text-xs font-bold ${
                  splitRemaining === 0
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                    : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                }`}
              >
                <span>Remaining to balance:</span>
                <span>
                  {settings.currency} {splitRemaining.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-5 sm:p-6 border-t border-white/5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-3.5 rounded-2xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecutePayment}
            disabled={isProcessing || (selectedMethod === 'SPLIT' && splitRemaining !== 0)}
            className="flex-1 py-4 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>
                  Confirm & Print ({settings.currency} {grandTotal.toLocaleString()})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
