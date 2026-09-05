import React, { useState, useMemo } from 'react';
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  X,
  PackagePlus,
  AlertTriangle,
  Building,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  FileCode,
  Send,
  Calendar,
  DollarSign,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { Product, User, PubSettings } from '../../types';

interface RestockItemSelection {
  productId: string;
  name: string;
  category: string;
  sku: string;
  barcode: string;
  currentStock: number;
  minStock: number;
  reorderLevel: number;
  deficit: number;
  reorderQuantity: number;
  unit: string;
  unitCost: number;
  subtotal: number;
  selected: boolean;
}

interface SupplierPreset {
  id: string;
  name: string;
  email: string;
  phone: string;
  categories: string[];
}

const SUPPLIER_PRESETS: SupplierPreset[] = [
  {
    id: 'kbl',
    name: 'Kenya Breweries Ltd (KBL / EABL)',
    email: 'orders@kbl.co.ke',
    phone: '+254 711 018 000',
    categories: ['BEER', 'CIDER'],
  },
  {
    id: 'udv',
    name: 'UDV Kenya (Spirits & Liqueurs)',
    email: 'orders@udvkenya.com',
    phone: '+254 722 205 555',
    categories: ['WHISKY', 'VODKA', 'GIN', 'RUM', 'BRANDY'],
  },
  {
    id: 'pernod',
    name: 'Pernod Ricard East Africa',
    email: 'orders.kenya@pernod-ricard.com',
    phone: '+254 20 427 0000',
    categories: ['WHISKY', 'GIN', 'VODKA', 'WINE'],
  },
  {
    id: 'ccba',
    name: 'Coca-Cola Beverages Africa (Soft Drinks)',
    email: 'orders@ccba.co.ke',
    phone: '+254 720 600 000',
    categories: ['SOFT DRINKS', 'WATER', 'ENERGY DRINKS'],
  },
  {
    id: 'custom distributor - one',
    name: 'General Distributor / Custom Supplier',
    email: 'supplies@beveragedistributor.ke',
    phone: '+254 700 000 000',
    categories: ['ALL'],
  },
  {
    id: 'custom distributor -two' ,
    name: 'General Distrbutor',
    email: 'supplies@generaldistributor.co.ke',
    phone: '+254 765 000 000',
    categories: ['ALL'],
  }
];

interface RestockEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currentUser: User;
  settings: PubSettings;
  preSelectedProductId?: string;
  onPushToIntake?: (items: Array<{ productId: string; quantity: number; unitCost: number; batchNumber?: string }>) => void;
  onLogAudit?: (action: string, entity: string, entityId: string, before?: any, after?: any, reason?: string) => void;
  onAddNotification?: (notif: { type: any; title: string; message: string; severity: 'info' | 'warning' | 'danger' | 'success'; linkTab?: string }) => void;
}

export const RestockEmailModal: React.FC<RestockEmailModalProps> = ({
  isOpen,
  onClose,
  products,
  currentUser,
  settings,
  preSelectedProductId,
  onPushToIntake,
  onLogAudit,
  onAddNotification,
}) => {
  // Filter products that have reached or breached threshold (or pre-selected)
  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) => p.trackInventory && (p.stockQuantity <= p.minStock || p.id === preSelectedProductId)
    );
  }, [products, preSelectedProductId]);

  // Calculate default order items
  const [items, setItems] = useState<RestockItemSelection[]>(() => {
    return products
      .filter((p) => p.trackInventory && (p.stockQuantity <= p.minStock || p.id === preSelectedProductId))
      .map((p) => {
        const deficit = Math.max(0, p.minStock - p.stockQuantity);
        // Smart case/pack quantity calculation
        const packSize = p.category === 'BEER' || p.category === 'SOFT DRINKS' ? 24 : 6;
        const rawSuggested = Math.max(p.reorderLevel - p.stockQuantity, p.minStock * 2 - p.stockQuantity, packSize);
        const reorderQty = Math.ceil(rawSuggested / packSize) * packSize;

        return {
          productId: p.id,
          name: p.name,
          category: p.category,
          sku: p.sku,
          barcode: p.barcode,
          currentStock: p.stockQuantity,
          minStock: p.minStock,
          reorderLevel: p.reorderLevel,
          deficit,
          reorderQuantity: reorderQty,
          unit: p.unit,
          unitCost: p.costPrice,
          subtotal: reorderQty * p.costPrice,
          selected: true,
        };
      });
  });

  // Re-sync items when modal opens or products change
  React.useEffect(() => {
    if (isOpen) {
      setItems(
        products
          .filter((p) => p.trackInventory && (p.stockQuantity <= p.minStock || p.id === preSelectedProductId))
          .map((p) => {
            const deficit = Math.max(0, p.minStock - p.stockQuantity);
            const packSize = p.category === 'BEER' || p.category === 'SOFT DRINKS' ? 24 : 6;
            const rawSuggested = Math.max(p.reorderLevel - p.stockQuantity, p.minStock * 2 - p.stockQuantity, packSize);
            const reorderQty = Math.ceil(rawSuggested / packSize) * packSize;

            return {
              productId: p.id,
              name: p.name,
              category: p.category,
              sku: p.sku,
              barcode: p.barcode,
              currentStock: p.stockQuantity,
              minStock: p.minStock,
              reorderLevel: p.reorderLevel,
              deficit,
              reorderQuantity: reorderQty,
              unit: p.unit,
              unitCost: p.costPrice,
              subtotal: reorderQty * p.costPrice,
              selected: true,
            };
          })
      );
    }
  }, [isOpen, products, preSelectedProductId]);

  // Supplier state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('kbl');
  const [customSupplierName, setCustomSupplierName] = useState<string>('Kenya Breweries Ltd (KBL)');
  const [supplierEmail, setSupplierEmail] = useState<string>('orders@kbl.co.ke');
  const [supplierPhone, setSupplierPhone] = useState<string>('+254 711 018 000');

  // Order Details
  const [poNumber] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${today}-${rand}`;
  });
  const [urgency, setUrgency] = useState<'Standard' | 'Next Day' | 'Same Day Critical'>('Next Day');
  const [deliveryBay, setDeliveryBay] = useState<string>('Main Cellar & Bar Receiving Bay 1');
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [specialNotes, setSpecialNotes] = useState<string>(
    'Please ensure delivery before 2:00 PM for shift handover. Cold chain integrity required for draught kegs and bottled beers. Include duplicate commercial invoice.'
  );

  // View state: 'preview' or 'text'
  const [viewMode, setViewMode] = useState<'preview' | 'text'>('preview');
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [pushedFeedback, setPushedFeedback] = useState<boolean>(false);
  const [includeNearThreshold, setIncludeNearThreshold] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const preset = SUPPLIER_PRESETS.find((s) => s.id === supId);
    if (preset) {
      setCustomSupplierName(preset.name);
      setSupplierEmail(preset.email);
      setSupplierPhone(preset.phone);
    }
  };

  // Toggle item selection
  const handleToggleItem = (productId: string) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, selected: !it.selected } : it))
    );
  };

  // Update item reorder quantity
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    const validQty = Math.max(1, newQty);
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              reorderQuantity: validQty,
              subtotal: validQty * it.unitCost,
            }
          : it
      )
    );
  };

  // Select all / Deselect all
  const handleToggleAll = (select: boolean) => {
    setItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  // Add an additional product to the order list
  const handleAddAdditionalProduct = (prodId: string) => {
    if (!prodId) return;
    const existing = items.find((it) => it.productId === prodId);
    if (existing) {
      setItems((prev) =>
        prev.map((it) => (it.productId === prodId ? { ...it, selected: true } : it))
      );
      return;
    }

    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const packSize = prod.category === 'BEER' || prod.category === 'SOFT DRINKS' ? 24 : 6;
    const newItem: RestockItemSelection = {
      productId: prod.id,
      name: prod.name,
      category: prod.category,
      sku: prod.sku,
      barcode: prod.barcode,
      currentStock: prod.stockQuantity,
      minStock: prod.minStock,
      reorderLevel: prod.reorderLevel,
      deficit: Math.max(0, prod.minStock - prod.stockQuantity),
      reorderQuantity: packSize,
      unit: prod.unit,
      unitCost: prod.costPrice,
      subtotal: packSize * prod.costPrice,
      selected: true,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  // Active selected items & totals
  const selectedItems = items.filter((it) => it.selected);
  const totalUnits = selectedItems.reduce((acc, it) => acc + it.reorderQuantity, 0);
  const totalEstimatedCost = selectedItems.reduce((acc, it) => acc + it.subtotal, 0);

  // Email Subject Line
  const emailSubject = `[PURCHASE ORDER: ${poNumber}] Stock Replenishment Request - ${settings.pubName} (${selectedItems.length} Low-Stock Items)`;

  // Email Body (Plain Text Format)
  const generatePlainTextEmail = () => {
    const pubName = settings.pubName || 'The Pub';
    const dateFormatted = new Date().toLocaleDateString('en-KE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const itemLines = selectedItems
      .map((item, idx) => {
        const lineDeficit =
          item.deficit > 0
            ? `[DEFICIT: ${item.deficit} ${item.unit}s below threshold]`
            : `[Near Threshold]`;
        return `${idx + 1}. ${item.name}
   - SKU: ${item.sku} | Barcode: ${item.barcode}
   - Current Cellar Stock: ${item.currentStock} ${item.unit}s (Min Safety Limit: ${item.minStock})
   - Order Quantity: ${item.reorderQuantity} ${item.unit}s ${lineDeficit}
   - Estimated Unit Cost: ${settings.currency} ${item.unitCost.toLocaleString()}
   - Line Subtotal: ${settings.currency} ${item.subtotal.toLocaleString()}`;
      })
      .join('\n\n');

    return `To: ${customSupplierName} <${supplierEmail}>
From: ${currentUser.name} (${currentUser.roleTitle}) - ${pubName}
Date: ${dateFormatted}
Subject: ${emailSubject}

================================================================================
PURCHASE ORDER / BEVERAGE REPLENISHMENT REQUEST
Purchase Order Ref: ${poNumber}
Priority / Urgency: ${urgency.toUpperCase()}
Requested Delivery Date: ${deliveryDate}
Delivery Receiving Bay: ${deliveryBay}
================================================================================

Dear ${customSupplierName} Orders Team,

Please accept this official purchase replenishment order for ${pubName}. 
The items listed below have reached or breached our pub's critical safety stock thresholds and require urgent replenishment:

--------------------------------------------------------------------------------
ORDERED INVENTORY ITEMS (${selectedItems.length} Products | ${totalUnits} Total Units)
--------------------------------------------------------------------------------
${itemLines || 'No items selected.'}

--------------------------------------------------------------------------------
ORDER FINANCIAL SUMMARY
--------------------------------------------------------------------------------
Total Line Items: ${selectedItems.length}
Total Requested Units: ${totalUnits} Units / Bottles / Cans
Estimated Order Total: ${settings.currency} ${totalEstimatedCost.toLocaleString()}

--------------------------------------------------------------------------------
DELIVERY & INVOICING INSTRUCTIONS
--------------------------------------------------------------------------------
1. Receiving Location: ${deliveryBay}, ${pubName}
2. Required Arrival: By ${deliveryDate} (Urgency: ${urgency})
3. Delivery Verification Contact: ${currentUser.name} (${currentUser.roleTitle})
4. Special Instructions:
   ${specialNotes}

Please confirm receipt of this order and reply with your estimated delivery dispatch time and official commercial invoice.

Warm regards,

${currentUser.name}
${currentUser.roleTitle}
${pubName}
Email: operations@pub.co.ke
Powered by Cellar & Inventory Hub
`;
  };

  const plainTextEmail = generatePlainTextEmail();

  // Copy to clipboard
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(plainTextEmail);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 3000);

      if (onLogAudit) {
        onLogAudit(
          'RESTOCK_EMAIL_COPIED',
          'InventoryOrder',
          poNumber,
          undefined,
          { itemsCount: selectedItems.length, totalCost: totalEstimatedCost, supplier: customSupplierName },
          `Copied restock request email template for ${selectedItems.length} low-stock items to clipboard.`
        );
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Open in default mail client
  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(supplierEmail)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(plainTextEmail)}`;
    window.location.href = mailtoUrl;

    if (onAddNotification) {
      onAddNotification({
        type: 'SYSTEM_ALERT',
        title: 'Restock Email Dispatched',
        message: `Prepared restock order email for ${customSupplierName} (${selectedItems.length} items, ${settings.currency} ${totalEstimatedCost.toLocaleString()}).`,
        severity: 'success',
        linkTab: 'inventory',
      });
    }

    if (onLogAudit) {
      onLogAudit(
        'RESTOCK_EMAIL_DISPATCHED',
        'InventoryOrder',
        poNumber,
        undefined,
        { itemsCount: selectedItems.length, totalCost: totalEstimatedCost, supplier: customSupplierName },
        `Triggered mail client with restock order email template for ${selectedItems.length} low-stock items.`
      );
    }
  };

  // Push directly to Intake List
  const handlePushToIntake = () => {
    if (!onPushToIntake || selectedItems.length === 0) return;

    const intakeItems = selectedItems.map((it) => ({
      productId: it.productId,
      quantity: it.reorderQuantity,
      unitCost: it.unitCost,
      batchNumber: `${poNumber.replace('PO-', 'REC-')}`,
    }));

    onPushToIntake(intakeItems);
    setPushedFeedback(true);
    setTimeout(() => {
      setPushedFeedback(false);
      onClose();
    }, 1500);

    if (onAddNotification) {
      onAddNotification({
        type: 'SYSTEM_ALERT',
        title: 'Restock Items Added to Delivery Intake',
        message: `Added ${selectedItems.length} items (${totalUnits} units) to the Intake Delivery Manifest for receiving.`,
        severity: 'info',
        linkTab: 'inventory',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#121214] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* MODAL HEADER */}
        <div className="p-6 sm:p-7 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-indigo-950/30 via-transparent to-amber-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-indigo-400">
                  Procurement & Replenishment
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {selectedItems.length} Deficit Items Flagged
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10 text-[10px] font-mono">
                  {poNumber}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Auto-Generate Restock Request Email
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Automatically consolidates all items reaching safety thresholds into a clean, professional purchase order.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/50 hover:text-white border border-white/5 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable Split / Tabbed) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* TOP CONFIGURATION: Supplier & Urgency Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Preset */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-400" />
                <span>Beverage Supplier</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {SUPPLIER_PRESETS.map((sup) => (
                  <option key={sup.id} value={sup.id} className="bg-[#18181b]">
                    {sup.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-white/50 font-mono flex items-center justify-between pt-1">
                <span>Email: {supplierEmail}</span>
              </div>
            </div>

            {/* Urgency & Delivery Date */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Restock Urgency</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Standard', 'Next Day', 'Same Day Critical'] as const).map((urg) => (
                  <button
                    key={urg}
                    type="button"
                    onClick={() => setUrgency(urg)}
                    className={`py-2 px-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      urgency === urg
                        ? urg === 'Same Day Critical'
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                          : 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                        : 'bg-white/[0.03] text-white/50 hover:text-white border border-white/5'
                    }`}
                  >
                    {urg}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="text-white/40 text-[11px]">Arrival:</span>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white font-mono"
                />
              </div>
            </div>

            {/* Receiving Dock */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Receiving Dock / Bay</span>
              </label>
              <input
                type="text"
                value={deliveryBay}
                onChange={(e) => setDeliveryBay(e.target.value)}
                placeholder="Receiving Bay"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="text-[10px] text-white/40 font-mono">
                Attn: {currentUser.name} ({currentUser.roleTitle})
              </div>
            </div>
          </div>

          {/* LOW-STOCK ITEMS TABLE & REORDER QUANTITIES */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                    Low-Stock Reorder Items ({items.length})
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {selectedItems.length} selected for PO
                  </span>
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Suggested quantities are automatically calculated to refill to safety levels in commercial case sizes.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/10 text-white/50 hover:text-white border border-white/10 text-[11px] font-mono transition-colors cursor-pointer"
                >
                  Deselect
                </button>
                {/* Append Another Product */}
                <select
                  className="bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white/70 hover:text-white cursor-pointer"
                  onChange={(e) => {
                    handleAddAdditionalProduct(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled className="bg-[#18181b]">
                    + Add Other Product to Order...
                  </option>
                  {products
                    .filter((p) => p.trackInventory && !items.some((it) => it.productId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#18181b]">
                        {p.name} (Stock: {p.stockQuantity} / Min: {p.minStock})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Item List Table */}
            {items.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-2xl space-y-2">
                <Check className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="font-bold text-white">All inventory items are currently above safety thresholds!</p>
                <p className="text-[11px] text-white/40">
                  You can still manually pick products to include using the dropdown above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                      <th className="py-2 px-3 w-10 text-center">Include</th>
                      <th className="py-2 px-3">Beverage Item</th>
                      <th className="py-2 px-3 text-center">Current Stock</th>
                      <th className="py-2 px-3 text-center">Min Threshold</th>
                      <th className="py-2 px-3 text-center">Deficit</th>
                      <th className="py-2 px-3 text-center">Order Qty</th>
                      <th className="py-2 px-3 text-right">Est. Unit Cost</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) => {
                      const isCritical = item.currentStock === 0 || item.currentStock <= item.minStock / 2;
                      const isBelow = item.currentStock <= item.minStock;

                      return (
                        <tr
                          key={item.productId}
                          className={`transition-colors ${
                            item.selected ? 'hover:bg-white/[0.03]' : 'opacity-40 hover:opacity-60 bg-black/20'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.productId)}
                              className="w-4 h-4 rounded text-indigo-600 bg-white/10 border-white/20 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isCritical ? (
                                <span className="px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-300 text-[9px] font-mono border border-rose-500/30">
                                  CRITICAL
                                </span>
                              ) : isBelow ? (
                                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                                  DEFICIT
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-white/40 font-mono">
                              {item.category} • SKU: {item.sku}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={isCritical ? 'text-rose-400' : isBelow ? 'text-amber-400' : 'text-emerald-400'}>
                              {item.currentStock} {item.unit}s
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-white/50">
                            {item.minStock} {item.unit}s
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            {item.deficit > 0 ? (
                              <span className="text-rose-400 font-bold">-{item.deficit}</span>
                            ) : (
                              <span className="text-white/30">Refill</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.productId, item.reorderQuantity - 6)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.reorderQuantity}
                                onChange={(e) => handleUpdateQuantity(item.productId, Number(e.target.value))}
                                className="w-14 bg-transparent text-center font-mono font-bold text-white text-xs focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.productId, item.reorderQuantity + 6)}
                                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-white/70">
                            {settings.currency} {item.unitCost.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-300">
                            {settings.currency} {item.subtotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 font-bold">
                      <td colSpan={5} className="py-3 px-3 text-right text-xs uppercase font-mono text-white/60">
                        Order Totals ({selectedItems.length} items selected):
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-white">
                        {totalUnits} units
                      </td>
                      <td className="py-3 px-3"></td>
                      <td className="py-3 px-3 text-right font-mono text-base text-amber-400">
                        {settings.currency} {totalEstimatedCost.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* SPECIAL NOTES */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-white/40">
              Special Delivery Instructions / Distributor Notes
            </label>
            <textarea
              rows={2}
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
              placeholder="e.g. Please deliver by 11:00 AM. Require crates with intact seal."
            />
          </div>

          {/* EMAIL TEMPLATE PREVIEW & RAW TEXT */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
                  Generated Email Output
                </span>
                <span className="text-[10px] text-white/30 font-mono">| Ready to copy or send</span>
              </div>

              <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Formatted Email Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'text'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Plain Text (Raw)</span>
                </button>
              </div>
            </div>

            {/* Email Preview View */}
            {viewMode === 'preview' ? (
              <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 space-y-5 text-zinc-300 text-xs font-sans shadow-inner">
                {/* Email Header Meta */}
                <div className="border-b border-white/10 pb-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-white font-bold text-sm">
                      <span className="text-white/40 font-normal">Subject: </span>
                      {emailSubject}
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                      {urgency} Priority
                    </span>
                  </div>
                  <div className="text-white/60 text-[11px]">
                    <strong>To:</strong> {customSupplierName} &lt;{supplierEmail}&gt;
                  </div>
                  <div className="text-white/60 text-[11px]">
                    <strong>From:</strong> {currentUser.name} ({currentUser.roleTitle}) &lt;operations@pub.co.ke&gt;
                  </div>
                </div>

                {/* Email Content Body */}
                <div className="space-y-3 leading-relaxed">
                  <p>Dear <strong>{customSupplierName}</strong> Orders Team,</p>
                  <p>
                    Please accept this official stock replenishment order for{' '}
                    <strong className="text-white">{settings.pubName}</strong>. The items listed below have reached or
                    breached our pub safety stock thresholds and require urgent restocking:
                  </p>

                  {/* Order Table inside email */}
                  <div className="border border-white/10 rounded-xl overflow-hidden my-3">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-white/5 border-b border-white/10 font-mono uppercase text-white/50 text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Item Name</th>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3 text-center">Current Shelf</th>
                          <th className="py-2 px-3 text-center">Safety Min</th>
                          <th className="py-2 px-3 text-center">Order Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {selectedItems.map((item) => (
                          <tr key={item.productId} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-3 font-semibold text-white">{item.name}</td>
                            <td className="py-2 px-3 font-mono text-white/40">{item.sku}</td>
                            <td className="py-2 px-3 text-center font-mono text-amber-300">
                              {item.currentStock} {item.unit}s
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-white/50">
                              {item.minStock} {item.unit}s
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-white">
                              {item.reorderQuantity} {item.unit}s
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {settings.currency} {item.unitCost.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                              {settings.currency} {item.subtotal.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-white/5 font-bold border-t border-white/10">
                        <tr>
                          <td colSpan={4} className="py-2.5 px-3 text-right uppercase font-mono text-white/60">
                            Estimated Order Value:
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-white">
                            {totalUnits} units
                          </td>
                          <td></td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400 text-xs">
                            {settings.currency} {totalEstimatedCost.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-1 text-[11px]">
                    <div className="font-bold text-white">Delivery Coordinates & Terms:</div>
                    <div>• <strong>Receiving Location:</strong> {deliveryBay}</div>
                    <div>• <strong>Target Arrival Date:</strong> {deliveryDate} ({urgency})</div>
                    <div>• <strong>Delivery Contact:</strong> {currentUser.name} ({currentUser.roleTitle})</div>
                    <div>• <strong>Special Notes:</strong> {specialNotes}</div>
                  </div>

                  <p className="pt-2">
                    Please confirm receipt and acknowledge this order with an estimated dispatch time.
                  </p>

                  <div className="pt-3 border-t border-white/10 text-white/60">
                    <div className="font-bold text-white">{currentUser.name}</div>
                    <div>{currentUser.roleTitle}</div>
                    <div>{settings.pubName}</div>
                  </div>
                </div>
              </div>
            ) : (
              /* Raw Plain Text View */
              <div className="relative">
                <textarea
                  readOnly
                  rows={14}
                  value={plainTextEmail}
                  className="w-full bg-[#18181b] border border-white/10 rounded-2xl p-4 font-mono text-xs text-white/80 focus:outline-none select-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER: Actions */}
        <div className="p-5 sm:p-6 border-t border-white/5 bg-[#0f0f11] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
            <span>Total Value:</span>
            <span className="font-bold text-amber-400 text-sm">
              {settings.currency} {totalEstimatedCost.toLocaleString()}
            </span>
            <span className="text-white/30">•</span>
            <span>{selectedItems.length} Products</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-fill Intake Manifest */}
            {onPushToIntake && (
              <button
                type="button"
                onClick={handlePushToIntake}
                disabled={selectedItems.length === 0}
                className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  pushedFeedback
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                }`}
                title="Automatically push low-stock order quantities to the Delivery Intake manifest for receiving"
              >
                {pushedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Added to Intake!</span>
                  </>
                ) : (
                  <>
                    <PackagePlus className="w-4 h-4 text-indigo-400" />
                    <span>Push to Intake Delivery</span>
                  </>
                )}
              </button>
            )}

            {/* Copy to Clipboard */}
            <button
              type="button"
              onClick={handleCopyEmail}
              className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                copiedFeedback
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/[0.04] hover:bg-white/10 text-white border border-white/10'
              }`}
            >
              {copiedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white/60" />
                  <span>Copy Email Text</span>
                </>
              )}
            </button>

            {/* Open in Mail Client */}
            <button
              type="button"
              onClick={handleOpenMailClient}
              disabled={selectedItems.length === 0}
              className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Open in Email App</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
