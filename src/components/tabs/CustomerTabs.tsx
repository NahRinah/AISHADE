import React, { useState } from 'react';
import {
  Bookmark,
  Plus,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Search,
  Beer,
  Trash2,
  Layers,
  Printer,
  X,
  Copy,
  Check,
  Download,
  Share2,
  QrCode,
  FileText,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { CustomerTab, CartItem, SaleTransaction, PubSettings } from '../../types';
import { PaymentModal } from '../pos/PaymentModal';
import { ReceiptModal } from '../pos/ReceiptModal';
import { VoiceOrderMicrophone } from '../voice/VoiceOrderMicrophone';

/**
 * Generates a cleanly formatted HTML version of a tab designed for 80mm thermal printers or PDF printouts.
 */
export const generateTabReceiptHtml = (tab: CustomerTab, settings: PubSettings): string => {
  const dateOpened = new Date(tab.createdAt).toLocaleString();
  const datePrinted = new Date().toLocaleString();
  const remainingCredit = Math.max(0, tab.creditLimit - tab.runningTotal);
  const vatAmount =
    settings.isVatEnabled && settings.vatRate > 0
      ? Math.round((tab.runningTotal * settings.vatRate) / (100 + settings.vatRate))
      : 0;
  const netSubtotal = tab.runningTotal - vatAmount;
  const totalItemsCount = tab.items.reduce((sum, item) => sum + item.quantity, 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tab Receipt - ${tab.customerName}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm 2mm;
    }
    @media print {
      html, body {
        width: 74mm;
        margin: 0;
        padding: 0;
        background: #fff !important;
        color: #000 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Courier New', Courier, monospace, system-ui;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      width: 74mm;
      margin: 0 auto;
      padding: 6px 3px;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .header {
      border-bottom: 1px dashed #333;
      padding-bottom: 7px;
      margin-bottom: 6px;
      text-align: center;
    }
    .pub-name {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin: 0 0 2px 0;
    }
    .pub-tagline {
      font-size: 9px;
      text-transform: uppercase;
      color: #333;
      margin: 0 0 3px 0;
    }
    .status-badge {
      display: inline-block;
      border: 1px solid #000;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .meta-box {
      border-bottom: 1px dashed #333;
      padding-bottom: 5px;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 6px;
    }
    th {
      border-bottom: 1px solid #000;
      padding: 3px 0;
      font-size: 9px;
      font-weight: bold;
    }
    td {
      padding: 3px 0;
      vertical-align: top;
    }
    .item-title { font-weight: bold; }
    .item-sub { font-size: 8.5px; color: #444; }
    .totals-box {
      border-top: 1px dashed #333;
      padding-top: 5px;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .grand-total {
      font-size: 13.5px;
      font-weight: 900;
      border-top: 2px solid #000;
      padding-top: 4px;
      margin-top: 3px;
    }
    .credit-box {
      border: 1px solid #444;
      padding: 4px 6px;
      margin: 6px 0;
      font-size: 9.5px;
    }
    .payment-box {
      border: 1px dashed #333;
      padding: 5px;
      margin: 6px 0;
      text-align: center;
      font-size: 9.5px;
      background: #fbfbfb;
    }
    .barcode-box {
      letter-spacing: 3px;
      font-weight: bold;
      font-size: 11px;
      margin: 5px 0 2px 0;
    }
    .footer {
      border-top: 1px dashed #333;
      padding-top: 6px;
      margin-top: 6px;
      text-align: center;
      font-size: 8.5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="pub-name">${settings.pubName || 'THE CRAFT PUB & LOUNGE'}</div>
    <div class="pub-tagline">${settings.tagline || 'Bar & Restaurant'}</div>
    <div style="font-size: 8.5px; color: #444;">Nairobi, Kenya • Tel: +254 700 000 000</div>
    <div>
      <span class="status-badge">${tab.status === 'OPEN' ? 'RUNNING TAB STATEMENT' : 'SETTLED TAB RECEIPT'}</span>
    </div>
  </div>

  <div class="meta-box">
    <div class="flex-row">
      <span style="color:#555;">TAB REF:</span>
      <span class="bold">#TAB-${tab.id.toUpperCase()}</span>
    </div>
    <div class="flex-row">
      <span style="color:#555;">PATRON:</span>
      <span class="bold">${tab.customerName.toUpperCase()}</span>
    </div>
    ${tab.customerPhone ? `
    <div class="flex-row">
      <span style="color:#555;">PHONE:</span>
      <span>${tab.customerPhone}</span>
    </div>` : ''}
    <div class="flex-row">
      <span style="color:#555;">SERVER:</span>
      <span>${tab.waiterName}</span>
    </div>
    <div class="flex-row">
      <span style="color:#555;">OPENED:</span>
      <span>${dateOpened}</span>
    </div>
    <div class="flex-row">
      <span style="color:#555;">PRINTED:</span>
      <span>${datePrinted}</span>
    </div>
    ${tab.notes ? `
    <div class="flex-row">
      <span style="color:#555;">NOTE / SEAT:</span>
      <span>${tab.notes}</span>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-left" style="width: 50%;">ITEM</th>
        <th class="text-center" style="width: 14%;">QTY</th>
        <th class="text-right" style="width: 18%;">PRICE</th>
        <th class="text-right" style="width: 18%;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${tab.items.length === 0 ? `
      <tr>
        <td colspan="4" class="text-center" style="padding: 10px 0; color: #666;">No drinks logged on this tab.</td>
      </tr>
      ` : tab.items.map((it) => `
      <tr>
        <td>
          <div class="item-title">${it.name}</div>
          <div class="item-sub">${new Date(it.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${it.addedByWaiterName || tab.waiterName}</div>
        </td>
        <td class="text-center bold">${it.quantity}</td>
        <td class="text-right">${it.unitPrice.toLocaleString()}</td>
        <td class="text-right bold">${it.subtotal.toLocaleString()}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="flex-row">
      <span>TOTAL ITEMS:</span>
      <span class="bold">${totalItemsCount}</span>
    </div>
    <div class="flex-row">
      <span>SUBTOTAL:</span>
      <span>${settings.currency} ${tab.runningTotal.toLocaleString()}</span>
    </div>
    ${vatAmount > 0 ? `
    <div class="flex-row" style="font-size: 9.5px; color: #444;">
      <span>Incl. VAT (${settings.vatRate}%):</span>
      <span>${settings.currency} ${vatAmount.toLocaleString()}</span>
    </div>
    ` : ''}
    <div class="flex-row grand-total">
      <span>TOTAL RUNNING BILL:</span>
      <span>${settings.currency} ${tab.runningTotal.toLocaleString()}</span>
    </div>
  </div>

  <div class="credit-box">
    <div class="flex-row">
      <span>CREDIT LIMIT:</span>
      <span class="bold">${settings.currency} ${tab.creditLimit.toLocaleString()}</span>
    </div>
    <div class="flex-row">
      <span>AVAILABLE BALANCE:</span>
      <span class="bold">${settings.currency} ${remainingCredit.toLocaleString()}</span>
    </div>
    <div class="flex-row" style="margin-top: 1px;">
      <span>LIMIT UTILIZATION:</span>
      <span class="bold">${Math.round((tab.runningTotal / Math.max(1, tab.creditLimit)) * 100)}%</span>
    </div>
  </div>

  <div class="payment-box">
    <div class="bold" style="text-transform: uppercase;">Payment / Settlement Options</div>
    <div style="margin-top: 2px;">M-PESA BUY GOODS TILL: <span class="bold">${settings.mpesaTillNumber || '654321'}</span></div>
    <div>PAYBILL: <span class="bold">${settings.mpesaPaybillNumber || '888999'}</span> • ACC: <span class="bold">${tab.customerName.replace(/[^a-zA-Z0-9]/g, '') || tab.id}</span></div>
    <div style="font-size: 8px; color: #555; margin-top: 2px;">Cash, M-Pesa & Cards accepted at cashier counter</div>
  </div>

  <div class="footer">
    <div class="barcode-box text-center">*TAB-${tab.id}*</div>
    <div style="font-size: 8px; color: #444; text-transform: uppercase;">Official Bar Bill Statement</div>
    <div style="margin-top: 3px; font-style: italic;">${settings.receiptFooter || 'Thank you for your patronage! Please drink responsibly.'}</div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Generates an ASCII plaintext formatted version of a customer tab for sharing or copying.
 */
export const generateTabReceiptText = (tab: CustomerTab, settings: PubSettings): string => {
  const line = '------------------------------------------';
  const remainingCredit = Math.max(0, tab.creditLimit - tab.runningTotal);
  const totalItemsCount = tab.items.reduce((sum, item) => sum + item.quantity, 0);

  return `
==========================================
${(settings.pubName || 'THE CRAFT PUB & LOUNGE').toUpperCase()}
${(settings.tagline || 'BAR & RESTAURANT').toUpperCase()}
Nairobi, Kenya • Tel: +254 700 000 000
==========================================
CUSTOMER RUNNING TAB STATEMENT
TAB REF   : #TAB-${tab.id.toUpperCase()}
PATRON    : ${tab.customerName.toUpperCase()}
${tab.customerPhone ? `PHONE     : ${tab.customerPhone}\n` : ''}SERVER    : ${tab.waiterName}
STATUS    : ${tab.status}
OPENED    : ${new Date(tab.createdAt).toLocaleString()}
PRINTED   : ${new Date().toLocaleString()}
${tab.notes ? `LOCATION  : ${tab.notes}\n` : ''}${line}
ITEM DETAILS:
${tab.items.length === 0 ? 'No drinks logged on this tab yet.\n' : tab.items.map((i) => `${i.quantity}x ${i.name.padEnd(22).slice(0, 22)} @ ${i.unitPrice} = ${settings.currency} ${i.subtotal}`).join('\n')}
${line}
TOTAL ITEMS : ${totalItemsCount}
TOTAL DUE   : ${settings.currency} ${tab.runningTotal.toLocaleString()}
${line}
CREDIT LIMIT: ${settings.currency} ${tab.creditLimit.toLocaleString()}
AVAIL CREDIT: ${settings.currency} ${remainingCredit.toLocaleString()}
UTILIZATION : ${Math.round((tab.runningTotal / Math.max(1, tab.creditLimit)) * 100)}%
${line}
SETTLEMENT INFO:
M-PESA TILL : ${settings.mpesaTillNumber || '654321'}
PAYBILL     : ${settings.mpesaPaybillNumber || '888999'}
ACCOUNT     : ${tab.customerName.replace(/[^a-zA-Z0-9]/g, '') || tab.id}
${line}
${settings.receiptFooter || 'Thank you for your patronage! Please drink responsibly.'}
==========================================
  `.trim();
};

export const CustomerTabs: React.FC = () => {
  const {
    tabs,
    products,
    settings,
    openCustomerTab,
    addItemToTab,
    closeTab,
    selectedTabId: storeTabId,
    setSelectedTabId: setStoreTabId,
  } = usePubStore();

  const selectedTabId = storeTabId || tabs[0]?.id || null;
  const setSelectedTabId = setStoreTabId;
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState(settings.defaultCreditLimit);
  const [newNotes, setNewNotes] = useState('');

  // Quick drink adder state
  const [quickDrinkQuery, setQuickDrinkQuery] = useState('');
  const [tabForCheckout, setTabForCheckout] = useState<CustomerTab | null>(null);
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);

  // Tab receipt printing & preview state
  const [tabForReceipt, setTabForReceipt] = useState<CustomerTab | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  const activeTabs = tabs.filter((t) => t.status === 'OPEN');
  const selectedTab = tabs.find((t) => t.id === selectedTabId);

  // Filtered drinks for quick adding to tab
  const drinksToAdd = products
    .filter((p) => p.active && (!quickDrinkQuery || p.name.toLowerCase().includes(quickDrinkQuery.toLowerCase())))
    .slice(0, 12);

  /**
   * 'Print Receipt' helper function in CustomerTabs that generates a formatted printable version of a tab.
   * Creates a dedicated 80mm thermal receipt print document and triggers browser print,
   * while also providing a high-fidelity visual preview with copy and download options.
   *
   * @param tabToPrint Optional tab to print; defaults to the currently selected tab.
   */
  const printReceipt = (tabToPrint?: CustomerTab) => {
    const targetTab = tabToPrint || selectedTab;
    if (!targetTab) return;

    // Show printable receipt view in modal
    setTabForReceipt(targetTab);

    // Generate formatted printable HTML version
    const htmlContent = generateTabReceiptHtml(targetTab, settings);

    // Trigger printing via dedicated hidden iframe
    try {
      let printFrame = document.getElementById('tab-receipt-print-frame') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'tab-receipt-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0px';
        printFrame.style.height = '0px';
        printFrame.style.border = 'none';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();

        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed, falling back to window.print', e);
          }
        }, 300);
      }
    } catch (err) {
      console.warn('Print iframe initialization error:', err);
    }

    setPrintFeedback(`Print receipt formatted for ${targetTab.customerName} (#TAB-${targetTab.id})`);
    setTimeout(() => setPrintFeedback(null), 3500);
  };

  // Helper alias
  const handlePrintReceipt = printReceipt;

  const handleCopyReceiptText = (tab: CustomerTab) => {
    const text = generateTabReceiptText(tab, settings);
    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  const handleDownloadReceiptText = (tab: CustomerTab) => {
    const text = generateTabReceiptText(tab, settings);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-Tab-${tab.id}-${tab.customerName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateNewTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const created = openCustomerTab(newCustomerName.trim(), newCustomerPhone.trim(), newNotes.trim(), newCreditLimit);
    setSelectedTabId(created.id);
    setShowNewTabModal(false);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewNotes('');
  };

  const handleAddDrinkToTab = (productId: string) => {
    if (!selectedTab) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const cartItem: CartItem = {
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      unitPrice: prod.sellingPrice,
      costPrice: prod.costPrice,
      quantity: 1,
      discount: 0,
      subtotal: prod.sellingPrice,
    };

    addItemToTab(selectedTab.id, cartItem);
  };

  // Convert tab items to cart items for checkout
  const tabCartItems: CartItem[] = (tabForCheckout?.items || []).map((ti) => {
    const prod = products.find((p) => p.id === ti.productId);
    return {
      productId: ti.productId,
      name: ti.name,
      category: prod?.category || 'BEER',
      unit: prod?.unit || 'bottle',
      unitPrice: ti.unitPrice,
      costPrice: prod?.costPrice || ti.unitPrice * 0.5,
      quantity: ti.quantity,
      discount: 0,
      subtotal: ti.subtotal,
    };
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Patron Accounts</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {activeTabs.length} Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Customer Running Tabs
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Manage bar rounds, track cumulative drink orders, and enforce individual credit thresholds.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewTabModal(true)}
          className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Open New Tab</span>
        </button>
      </div>

      {/* Feedback Alert for Print */}
      {printFeedback && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 px-4 py-3 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
              <Printer className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <span>{printFeedback}</span>
          </div>
          <button
            onClick={() => setPrintFeedback(null)}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Microphone Voice Command Bar */}
      <VoiceOrderMicrophone defaultTarget="TAB" />

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Tabs List (4 cols) */}
        <div className="lg:col-span-4 space-y-3 max-h-[700px] overflow-y-auto pr-1">
          {activeTabs.length === 0 ? (
            <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-8 text-center text-white/30 space-y-3 shadow-xl">
              <Bookmark className="w-8 h-8 mx-auto text-white/20" />
              <p className="text-xs font-medium">No active customer tabs open.</p>
              <button
                onClick={() => setShowNewTabModal(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
              >
                + Open a Tab
              </button>
            </div>
          ) : (
            activeTabs.map((tab) => {
              const isSelected = selectedTabId === tab.id;
              const isCreditExceeded = tab.runningTotal > tab.creditLimit;

              return (
                <div
                  key={tab.id}
                  onClick={() => setSelectedTabId(tab.id)}
                  className={`p-4 rounded-[2rem] border transition-all cursor-pointer select-none shadow-xl ${
                    isSelected
                      ? 'bg-[#16161a] border-indigo-500/60 shadow-indigo-500/5'
                      : 'bg-[#121214] border-white/5 hover:border-white/15 hover:bg-[#151518]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{tab.customerName}</h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            printReceipt(tab);
                          }}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/40 hover:text-amber-400 transition-colors"
                          title="Print Receipt for this tab"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-white/40 flex items-center gap-1.5 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>{new Date(tab.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{tab.waiterName}</span>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {settings.currency} {tab.runningTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Credit Bar */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-white/40">
                      <span>Limit: {settings.currency} {tab.creditLimit.toLocaleString()}</span>
                      <span className={isCreditExceeded ? 'text-rose-400 font-bold' : 'text-white/60'}>
                        {Math.round((tab.runningTotal / tab.creditLimit) * 100)}% used
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCreditExceeded ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, (tab.runningTotal / tab.creditLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT: Selected Tab Details & Quick Drinks (8 cols) */}
        <div className="lg:col-span-8">
          {selectedTab ? (
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-7 space-y-5 shadow-2xl">
              {/* Tab Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base sm:text-lg font-black text-white uppercase">
                      {selectedTab.customerName}
                    </h2>
                    <span className="text-[10px] uppercase font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      OPEN BILL
                    </span>
                  </div>
                  <div className="text-xs text-white/40 mt-1 font-mono">
                    {selectedTab.customerPhone ? `Phone: ${selectedTab.customerPhone} • ` : ''}
                    Server: {selectedTab.waiterName}
                    {selectedTab.notes ? ` • Note: "${selectedTab.notes}"` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Print Receipt Button */}
                  <button
                    onClick={() => printReceipt(selectedTab)}
                    className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-white/10 hover:border-white/20 active:scale-95 transition-all cursor-pointer shadow-lg"
                    title="Generate and print receipt for this customer tab"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={() => setTabForCheckout(selectedTab)}
                    disabled={selectedTab.items.length === 0}
                    className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-indigo-600/25 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Close & Pay Bill ({settings.currency} {selectedTab.runningTotal.toLocaleString()})</span>
                  </button>
                </div>
              </div>

              {/* Quick Add Drinks to Tab */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white/80">
                  <span className="flex items-center gap-2">
                    <Beer className="w-4 h-4 text-indigo-400" />
                    <span>Quick Add Rounds to Tab</span>
                  </span>
                  <div className="w-48">
                    <input
                      type="text"
                      value={quickDrinkQuery}
                      onChange={(e) => setQuickDrinkQuery(e.target.value)}
                      placeholder="Filter drink..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                  {drinksToAdd.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleAddDrinkToTab(p.id)}
                      className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-indigo-500/40 text-left text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <div className="font-bold text-white/90 truncate">{p.name}</div>
                      <div className="text-[11px] font-mono font-bold text-amber-400 mt-1">
                        {settings.currency} {p.sellingPrice.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/40">
                    Tab Itemized Drinks Log ({selectedTab.items.length})
                  </h3>
                  {selectedTab.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => printReceipt(selectedTab)}
                      className="text-xs font-mono font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print Itemized Bill</span>
                    </button>
                  )}
                </div>

                {selectedTab.items.length === 0 ? (
                  <div className="py-10 text-center text-white/30 text-xs">
                    No drinks poured yet on this tab. Use the quick add buttons above.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {selectedTab.items.map((it) => (
                      <div
                        key={it.id}
                        className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white">{it.name}</span>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">
                            {it.quantity} × {settings.currency} {it.unitPrice.toLocaleString()} • Logged by{' '}
                            {it.addedByWaiterName} (
                            {new Date(it.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </div>
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          {settings.currency} {it.subtotal.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-16 text-center text-white/30 text-xs shadow-xl">
              Select a tab on the left or open a new customer tab.
            </div>
          )}
        </div>
      </div>

      {/* New Tab Modal */}
      {showNewTabModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">New Account</span>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <span>Open Customer Tab</span>
              </h3>
            </div>

            <form onSubmit={handleCreateNewTab} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Customer / Patron Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Kipchoge Keino / Dr. Mwangi"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Credit Limit ({settings.currency})
                </label>
                <input
                  type="number"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">Notes / Location (Optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. VIP Balcony, Watching Arsenal match"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTabModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Open Tab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout for Tab */}
      {tabForCheckout && (
        <PaymentModal
          items={tabCartItems}
          customer={{ name: tabForCheckout.customerName, phone: tabForCheckout.customerPhone, type: 'tab' }}
          discountPercentage={0}
          discountAmount={0}
          onClose={() => setTabForCheckout(null)}
          onSuccess={(sale) => {
            // Close tab
            closeTab(tabForCheckout.id, sale.paymentMethod, sale.payments);
            setTabForCheckout(null);
            setCompletedSale(sale);
          }}
        />
      )}

      {/* Receipt Modal for Completed Sale */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => setCompletedSale(null)}
        />
      )}

      {/* Formatted Printable Tab Receipt Modal */}
      {tabForReceipt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#151822] border border-[#2c3245] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            {/* Top Bar */}
            <div className="p-3.5 bg-[#10121b] border-b border-[#222736] flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Printer className="w-4 h-4" />
                <span className="uppercase tracking-wider">Printable Tab Statement</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-normal">
                  #TAB-{tabForReceipt.id}
                </span>
              </div>
              <button
                onClick={() => setTabForReceipt(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-[#1e2330] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Paper Area */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-zinc-950 flex justify-center">
              <div className="w-full bg-white text-zinc-950 p-5 rounded-lg shadow font-mono text-xs border border-zinc-300 leading-tight">
                {/* Header */}
                <div className="text-center border-b border-dashed border-zinc-400 pb-3 mb-3">
                  <h1 className="text-base font-black tracking-wider uppercase">{settings.pubName}</h1>
                  <p className="text-[10px] text-zinc-600 uppercase font-sans mt-0.5">{settings.tagline}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Nairobi, Kenya • Tel: +254 700 000 000</p>
                  <div className="mt-2 inline-block bg-zinc-950 text-white font-bold text-[9px] px-2.5 py-0.5 rounded uppercase tracking-widest">
                    {tabForReceipt.status === 'OPEN' ? 'RUNNING TAB STATEMENT' : 'SETTLED TAB RECEIPT'}
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-400 pb-2 mb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">TAB REFERENCE:</span>
                    <span className="font-bold">#TAB-{tabForReceipt.id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">CUSTOMER / PATRON:</span>
                    <span className="font-bold">{tabForReceipt.customerName.toUpperCase()}</span>
                  </div>
                  {tabForReceipt.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">PHONE NUMBER:</span>
                      <span>{tabForReceipt.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-600">SERVER / WAITER:</span>
                    <span>{tabForReceipt.waiterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">TAB OPENED:</span>
                    <span>{new Date(tabForReceipt.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">PRINT TIMESTAMP:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  {tabForReceipt.notes && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">LOCATION / NOTE:</span>
                      <span>{tabForReceipt.notes}</span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
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
                    {tabForReceipt.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-zinc-500 italic">
                          No drinks logged on this tab.
                        </td>
                      </tr>
                    ) : (
                      tabForReceipt.items.map((it) => (
                        <tr key={it.id} className="py-1">
                          <td className="py-1 pr-1">
                            <div className="font-semibold">{it.name}</div>
                            <div className="text-[9px] text-zinc-500">
                              {new Date(it.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                              • {it.addedByWaiterName || tabForReceipt.waiterName}
                            </div>
                          </td>
                          <td className="py-1 text-center font-bold">{it.quantity}</td>
                          <td className="py-1 text-right">{it.unitPrice.toLocaleString()}</td>
                          <td className="py-1 text-right font-bold">{it.subtotal.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Financial Summary */}
                <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[11px] mb-3">
                  <div className="flex justify-between">
                    <span>TOTAL ITEMS:</span>
                    <span>{tabForReceipt.items.reduce((s, i) => s + i.quantity, 0)} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SUBTOTAL:</span>
                    <span>
                      {settings.currency} {tabForReceipt.runningTotal.toLocaleString()}
                    </span>
                  </div>
                  {settings.isVatEnabled && settings.vatRate > 0 && (
                    <div className="flex justify-between text-zinc-600 text-[10px]">
                      <span>INCL. VAT ({settings.vatRate}%):</span>
                      <span>
                        {settings.currency}{' '}
                        {Math.round(
                          (tabForReceipt.runningTotal * settings.vatRate) / (100 + settings.vatRate)
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t-2 border-zinc-950 pt-1.5 mt-1">
                    <span>TOTAL BALANCE DUE:</span>
                    <span>
                      {settings.currency} {tabForReceipt.runningTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Credit Limit Tracking */}
                <div className="bg-zinc-100 p-2.5 rounded border border-zinc-200 text-[10px] space-y-1 mb-3">
                  <div className="flex justify-between font-bold text-zinc-800">
                    <span>AUTHORIZED CREDIT LIMIT:</span>
                    <span>
                      {settings.currency} {tabForReceipt.creditLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>AVAILABLE CREDIT:</span>
                    <span className="font-semibold text-emerald-800">
                      {settings.currency}{' '}
                      {Math.max(0, tabForReceipt.creditLimit - tabForReceipt.runningTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>CREDIT UTILIZATION:</span>
                    <span>
                      {Math.round((tabForReceipt.runningTotal / Math.max(1, tabForReceipt.creditLimit)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Settlement Info */}
                <div className="border border-dashed border-zinc-300 bg-zinc-50 p-2 rounded text-[10px] text-center space-y-0.5 mb-3">
                  <div className="font-bold uppercase text-zinc-800 text-[9.5px]">Payment & Settlement Instructions</div>
                  <div>
                    M-Pesa Buy Goods Till: <span className="font-bold">{settings.mpesaTillNumber || '654321'}</span>
                  </div>
                  <div>
                    Paybill: <span className="font-bold">{settings.mpesaPaybillNumber || '888999'}</span> • Acc:{' '}
                    <span className="font-bold">
                      {tabForReceipt.customerName.replace(/[^a-zA-Z0-9]/g, '') || tabForReceipt.id}
                    </span>
                  </div>
                </div>

                {/* Barcode & Footer */}
                <div className="text-center pt-2 border-t border-dashed border-zinc-400 space-y-1.5">
                  <div className="font-mono tracking-widest text-[11px] font-bold text-zinc-800">
                    *TAB-{tabForReceipt.id.toUpperCase()}*
                  </div>
                  <div className="flex justify-center items-center gap-1.5 text-zinc-500 text-[9px]">
                    <QrCode className="w-3.5 h-3.5 text-zinc-800" />
                    <span>SCAN CODE TO VERIFY RUNNING TAB</span>
                  </div>
                  <p className="text-[10px] italic text-zinc-600 mt-1">{settings.receiptFooter}</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3.5 bg-[#10121b] border-t border-[#222736] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCopyReceiptText(tabForReceipt)}
                className="p-2.5 rounded-xl bg-[#1b1f2c] hover:bg-[#222838] text-zinc-300 border border-[#2a3142] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copy ASCII Receipt Text"
              >
                {copiedReceipt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReceiptText(tabForReceipt)}
                className="p-2.5 rounded-xl bg-[#1b1f2c] hover:bg-[#222838] text-zinc-300 border border-[#2a3142] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download Receipt as Text File"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save .txt</span>
              </button>

              <button
                type="button"
                onClick={() => printReceipt(tabForReceipt)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-zinc-950" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
