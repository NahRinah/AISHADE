import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, QrCode, Share2, Copy } from 'lucide-react';
import { SaleTransaction } from '../../types';
import { usePubStore } from '../../services/store';

interface ReceiptModalProps {
  sale: SaleTransaction;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, onNewSale }) => {
  const { settings } = usePubStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Print window
    window.print();
  };

  const handleCopyText = () => {
    const text = `
${settings.pubName.toUpperCase()}
RECEIPT #${sale.id}
Date: ${new Date(sale.createdAt).toLocaleString()}
Waiter: ${sale.waiterName}
Customer: ${sale.customer.name}
--------------------------------
${sale.items.map((i) => `${i.quantity}x ${i.name} @ ${i.unitPrice} = ${i.subtotal}`).join('\n')}
--------------------------------
SUBTOTAL: ${settings.currency} ${sale.subtotal.toLocaleString()}
${sale.discountAmount > 0 ? `DISCOUNT: -${settings.currency} ${sale.discountAmount.toLocaleString()}\n` : ''}
TOTAL: ${settings.currency} ${sale.total.toLocaleString()}
PAYMENT: ${sale.paymentMethod}
${sale.payments.map((p) => `${p.method}: ${settings.currency} ${p.amount}${p.reference ? ` (Ref: ${p.reference})` : ''}`).join('\n')}
--------------------------------
${settings.receiptFooter}
    `.trim();

    navigator.clipboard.writeText(text);
    alert('Receipt summary copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#151822] border border-[#2c3245] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top bar */}
        <div className="p-3.5 bg-[#10121b] border-b border-[#222736] flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span className="uppercase tracking-wider">Sale Finalized & Audited</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-[#1e2330] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-950 flex justify-center">
          <div
            ref={receiptRef}
            className="w-full bg-white text-zinc-950 p-5 rounded-lg shadow font-mono text-xs border border-zinc-300 leading-tight print:border-none print:shadow-none print:m-0"
          >
            {/* Pub Brand Header */}
            <div className="text-center border-b border-dashed border-zinc-400 pb-3 mb-3">
              <h1 className="text-base font-black tracking-wider uppercase">{settings.pubName}</h1>
              <p className="text-[10px] text-zinc-600 uppercase font-sans mt-0.5">{settings.tagline}</p>
              <p className="text-[10px] text-zinc-600 mt-1">Nairobi, Kenya • Tel: +254 700 000 000</p>
              <div className="mt-2 inline-block bg-zinc-950 text-white font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-widest">
                TAX INVOICE / RECEIPT
              </div>
            </div>

            {/* Metadata Info */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-2 mb-2">
              <div className="flex justify-between">
                <span className="text-zinc-600">RECEIPT NO:</span>
                <span className="font-bold">{sale.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">DATE/TIME:</span>
                <span>{new Date(sale.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">WAITER:</span>
                <span className="font-semibold">{sale.waiterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">CUSTOMER:</span>
                <span>{sale.customer.name}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-[11px] mb-3">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-700">
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center">QTY</th>
                  <th className="py-1 text-right">PRICE</th>
                  <th className="py-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1 font-semibold pr-1">{item.name}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-1 text-right font-bold">{item.subtotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Totals */}
            <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[11px] mb-3">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>
                  {settings.currency} {sale.subtotal.toLocaleString()}
                </span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>DISCOUNT ({sale.discountPercentage}%):</span>
                  <span>
                    -{settings.currency} {sale.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>VAT ({settings.vatRate}%):</span>
                  <span>
                    {settings.currency} {sale.taxAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t-2 border-zinc-950 pt-1.5 mt-1">
                <span>TOTAL DUE:</span>
                <span>
                  {settings.currency} {sale.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-zinc-100 p-2 rounded border border-zinc-200 text-[10px] space-y-1 mb-3">
              <div className="font-bold uppercase text-zinc-800 flex justify-between">
                <span>PAYMENT METHOD:</span>
                <span>{sale.paymentMethod}</span>
              </div>
              {sale.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-zinc-600">
                  <span>
                    {p.method}
                    {p.reference ? ` [${p.reference}]` : ''}
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {settings.currency} {p.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {sale.payments.some((p) => p.change && p.change > 0) && (
                <div className="flex justify-between font-bold text-zinc-900 pt-1 border-t border-zinc-200">
                  <span>CHANGE TENDERED:</span>
                  <span>
                    {settings.currency}{' '}
                    {sale.payments.reduce((acc, p) => acc + (p.change || 0), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* QR Simulation & Footer */}
            <div className="text-center pt-2 border-t border-dashed border-zinc-400 space-y-2">
              <div className="flex justify-center items-center gap-1.5 text-zinc-500 text-[9px]">
                <QrCode className="w-4 h-4 text-zinc-800" />
                <span>SCAN RECEIPT TO VERIFY</span>
              </div>
              <p className="text-[10px] italic text-zinc-600">{settings.receiptFooter}</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3.5 bg-[#10121b] border-t border-[#222736] flex items-center justify-between gap-2">
          <button
            onClick={handleCopyText}
            className="p-2 rounded-xl bg-[#1b1f2c] hover:bg-[#222838] text-zinc-300 border border-[#2a3142] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy Receipt Text"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-[#232838] hover:bg-[#2b3246] text-zinc-100 border border-[#333b4e] text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onNewSale();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow"
          >
            Next Sale
          </button>
        </div>
      </div>
    </div>
  );
};
