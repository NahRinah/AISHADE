import React, { useState, useRef, useEffect } from 'react';
import {
  Package,
  Camera,
  Plus,
  AlertTriangle,
  FileText,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  Droplets,
  CheckCircle2,
  X,
  Search,
  Check,
  AlertCircle,
  Bell,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  PackageCheck,
  ShieldAlert,
  Mail,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { Product, InventoryTransaction, WastageRecord } from '../../types';
import { StockAlert } from './stockAlertTypes';
import { playStockAlertChime } from './stockAlertAudio';
import { StockWarningToast } from './StockWarningToast';
import { StockNotificationCenter } from './StockNotificationCenter';
import { StockThresholdManagerModal } from './StockThresholdManagerModal';
import { RestockEmailModal } from './RestockEmailModal';
import { RestockNowBadge } from './RestockNowBadge';

export const InventoryHub: React.FC = () => {
  const {
    products,
    inventoryLedger,
    settings,
    receiveStock,
    recordWastage,
    submitStockCount,
    updateProduct,
    addProduct,
    currentUser,
    addNotification,
    logAudit,
  } = usePubStore();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'thresholds' | 'receive' | 'ledger' | 'count' | 'wastage' | 'spirits'
  >('overview');

  // Search filter
  const [productSearch, setProductSearch] = useState('');

  // Receiving state
  const [receiveSupplier, setReceiveSupplier] = useState('Kenya Breweries Ltd (KBL)');
  const [receiveItems, setReceiveItems] = useState<
    Array<{ productId: string; quantity: number; unitCost: number; batchNumber?: string }>
  >([]);
  const [receiveSearch, setReceiveSearch] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraFeedback, setCameraFeedback] = useState<string | null>(null);

  // Wastage state
  const [wastageProductId, setWastageProductId] = useState<string>(products[0]?.id || '');
  const [wastageQuantity, setWastageQuantity] = useState<number>(1);
  const [wastageReason, setWastageReason] = useState<WastageRecord['reason']>('Broken');
  const [wastageNotes, setWastageNotes] = useState<string>('');
  const [wastageFeedback, setWastageFeedback] = useState<string | null>(null);

  // Stock count state
  const [stockCountEntries, setStockCountEntries] = useState<
    Record<string, { physicalCount: number; reason: string }>
  >({});
  const [countFeedback, setCountFeedback] = useState<string | null>(null);

  // Real-Time Notification & Threshold System State
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>(() => {
    return products
      .filter((p) => p.trackInventory && p.stockQuantity <= p.minStock)
      .map((p) => {
        const isOos = p.stockQuantity === 0;
        const isCrit = p.stockQuantity <= Math.floor(p.minStock / 2);
        return {
          id: `alert-${p.id}`,
          productId: p.id,
          productName: p.name,
          category: p.category,
          barcode: p.barcode,
          sku: p.sku,
          unit: p.unit,
          currentStock: p.stockQuantity,
          threshold: p.minStock,
          reorderLevel: p.reorderLevel,
          deficit: Math.max(0, p.minStock - p.stockQuantity),
          severity: isOos ? 'out_of_stock' : isCrit ? 'critical' : 'warning',
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
        };
      });
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('got_pub_stock_alert_sound');
    return saved !== null ? saved === 'true' : true;
  });

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdModalTargetProductId, setThresholdModalTargetProductId] = useState<string | undefined>(undefined);
  const [activeToastAlert, setActiveToastAlert] = useState<StockAlert | null>(null);
  const [isRestockEmailModalOpen, setIsRestockEmailModalOpen] = useState(false);
  const [restockEmailTargetProductId, setRestockEmailTargetProductId] = useState<string | undefined>(undefined);

  const handleOpenRestockEmail = (productId?: string) => {
    setRestockEmailTargetProductId(productId);
    setIsRestockEmailModalOpen(true);
  };

  const prevStockMapRef = useRef<Record<string, number>>({});
  const isInitialMountRef = useRef<boolean>(true);

  // Monitor stock levels in real time whenever products state updates
  useEffect(() => {
    if (isInitialMountRef.current) {
      products.forEach((p) => {
        prevStockMapRef.current[p.id] = p.stockQuantity;
      });
      isInitialMountRef.current = false;
      return;
    }

    let newlyBreachedAlert: StockAlert | null = null;

    setStockAlerts((prevAlerts) => {
      const updatedAlerts = [...prevAlerts];

      products.forEach((p) => {
        if (!p.trackInventory) return;

        const prevStock = prevStockMapRef.current[p.id];
        const currentStock = p.stockQuantity;
        const threshold = p.minStock;
        const isBelow = currentStock <= threshold;

        const existingAlertIdx = updatedAlerts.findIndex((a) => a.productId === p.id);

        if (isBelow) {
          const isOos = currentStock === 0;
          const isCrit = currentStock <= Math.floor(threshold / 2);
          const severity: 'out_of_stock' | 'critical' | 'warning' = isOos
            ? 'out_of_stock'
            : isCrit
            ? 'critical'
            : 'warning';

          const alertObj: StockAlert = {
            id: `alert-${p.id}`,
            productId: p.id,
            productName: p.name,
            category: p.category,
            barcode: p.barcode,
            sku: p.sku,
            unit: p.unit,
            currentStock,
            threshold,
            reorderLevel: p.reorderLevel,
            deficit: Math.max(0, threshold - currentStock),
            severity,
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
          };

          const stockDecreased = prevStock !== undefined && currentStock < prevStock;
          const crossedThreshold = prevStock !== undefined && prevStock > threshold && isBelow;

          if (crossedThreshold || (stockDecreased && existingAlertIdx === -1)) {
            newlyBreachedAlert = alertObj;
          }

          if (existingAlertIdx >= 0) {
            updatedAlerts[existingAlertIdx] = {
              ...updatedAlerts[existingAlertIdx],
              currentStock,
              threshold,
              deficit: alertObj.deficit,
              severity,
            };
            if (stockDecreased) {
              updatedAlerts[existingAlertIdx].acknowledged = false;
              newlyBreachedAlert = updatedAlerts[existingAlertIdx];
            }
          } else {
            updatedAlerts.unshift(alertObj);
          }
        } else {
          // Stock is above threshold: automatically resolve alert
          if (existingAlertIdx >= 0) {
            updatedAlerts.splice(existingAlertIdx, 1);
          }
        }

        prevStockMapRef.current[p.id] = currentStock;
      });

      return updatedAlerts;
    });

    if (newlyBreachedAlert) {
      const alert: StockAlert = newlyBreachedAlert;
      setActiveToastAlert(alert);
      if (soundEnabled) {
        playStockAlertChime(alert.severity);
      }
      addNotification({
        type: 'CRITICAL_STOCK',
        title: `Low Stock Alert: ${alert.productName}`,
        message: `${alert.productName} fell to ${alert.currentStock} ${alert.unit}s (Threshold: ${alert.threshold} ${alert.unit}s, deficit: ${alert.deficit} units).`,
        severity: alert.severity === 'out_of_stock' || alert.severity === 'critical' ? 'danger' : 'warning',
        linkTab: 'inventory',
      });
    }
  }, [products, soundEnabled, addNotification]);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('got_pub_stock_alert_sound', String(next));
      return next;
    });
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setStockAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true, acknowledgedBy: currentUser.name } : a))
    );
  };

  const handleAcknowledgeAll = () => {
    setStockAlerts((prev) =>
      prev.map((a) => ({ ...a, acknowledged: true, acknowledgedBy: currentUser.name }))
    );
  };

  const handleSnoozeAlert = (alertId: string, minutes: number) => {
    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    setStockAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, snoozedUntil: snoozeUntil } : a))
    );
  };

  const handleQuickRestockFromAlert = (productId: string, suggestedQuantity: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setReceiveItems((prev) => {
      const existing = prev.find((it) => it.productId === productId);
      if (existing) {
        return prev.map((it) =>
          it.productId === productId ? { ...it, quantity: it.quantity + suggestedQuantity } : it
        );
      }
      return [
        ...prev,
        {
          productId,
          quantity: suggestedQuantity,
          unitCost: prod.costPrice,
          batchNumber: `RESTOCK-${Date.now().toString().slice(-4)}`,
        },
      ];
    });

    setActiveTab('receive');
    setCameraFeedback(`Added ${suggestedQuantity} units of ${prod.name} to intake delivery list!`);
    setTimeout(() => setCameraFeedback(null), 3500);
  };

  const handleSimulateStockDrop = (productId: string, dropQty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newStock = Math.max(0, prod.stockQuantity - dropQty);
    updateProduct({
      ...prod,
      stockQuantity: newStock,
    });
  };

  // Inventory KPI calculations
  const totalProductsCount = products.length;
  const activeBreachesCount = stockAlerts.filter((a) => !a.acknowledged).length;
  const lowStockCount = products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.minStock && p.stockQuantity > 0
  ).length;
  const criticalStockCount = products.filter(
    (p) => p.trackInventory && p.stockQuantity <= p.minStock / 2
  ).length;
  const outOfStockCount = products.filter((p) => p.trackInventory && p.stockQuantity === 0).length;
  const totalStockValue = products.reduce(
    (acc, p) => acc + (p.trackInventory ? p.stockQuantity * p.costPrice : 0),
    0
  );

  // Camera video stream handling for scanning
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraActive && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setCameraFeedback('Camera not accessible or permission denied. You can still scan or pick items below.');
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive]);

  // Handle simulated/camera barcode scan
  const handleScanBarcode = (barcode: string) => {
    const prod = products.find((p) => p.barcode === barcode || p.sku === barcode);
    if (prod) {
      setCameraFeedback(`Product Detected: ${prod.name}! Adding to delivery list...`);
      setReceiveItems((prev) => {
        const existing = prev.find((item) => item.productId === prod.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === prod.id ? { ...item, quantity: item.quantity + 12 } : item
          );
        }
        return [
          ...prev,
          {
            productId: prod.id,
            quantity: 24,
            unitCost: prod.costPrice,
            batchNumber: `B-${Date.now().toString().slice(-4)}`,
          },
        ];
      });
    } else {
      setCameraFeedback(`Barcode ${barcode} not found in catalog.`);
    }
    setTimeout(() => setCameraFeedback(null), 3000);
  };

  const handleConfirmReceive = () => {
    if (receiveItems.length === 0) return;

    receiveStock({
      supplier: receiveSupplier,
      items: receiveItems,
      notes: `Received by ${currentUser.name}`,
    });

    setReceiveItems([]);
    setIsCameraActive(false);
    setActiveTab('overview');
  };

  const handleExecuteWastage = (e: React.FormEvent) => {
    e.preventDefault();
    const res = recordWastage(wastageProductId, wastageQuantity, undefined, wastageReason, wastageNotes);
    if (res.requiresApproval) {
      setWastageFeedback('Large wastage logged! Sent to Supervisor/Manager for authorization.');
    } else {
      setWastageFeedback('Wastage recorded and stock ledger updated.');
    }
    setTimeout(() => setWastageFeedback(null), 3000);
    setWastageQuantity(1);
    setWastageNotes('');
  };

  const handleSaveStockCount = () => {
    const entries = (
      Object.entries(stockCountEntries) as [string, { physicalCount: number; reason: string }][]
    ).map(([prodId, data]) => {
      const prod = products.find((p) => p.id === prodId)!;
      return {
        productId: prodId,
        expectedStock: prod.stockQuantity,
        physicalCount: data.physicalCount,
        reason: data.reason || 'Physical Audit Reconciliation',
      };
    });

    if (entries.length === 0) return;

    submitStockCount(entries, 'Physical Stock Count Reconciliation');
    setCountFeedback('Stock count reconciled! Variances have been corrected in ledger.');
    setTimeout(() => setCountFeedback(null), 3500);
    setStockCountEntries({});
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Floating Real-Time Warning Toast */}
      <StockWarningToast
        alert={activeToastAlert}
        onDismiss={() => setActiveToastAlert(null)}
        onRestock={handleQuickRestockFromAlert}
        onAdjustThreshold={(prodId) => {
          setThresholdModalTargetProductId(prodId);
          setIsThresholdModalOpen(true);
        }}
        onOpenRestockEmail={handleOpenRestockEmail}
        soundEnabled={soundEnabled}
        toggleSound={handleToggleSound}
        currency={settings.currency}
      />

      {/* Real-Time Stock Notification Center Modal */}
      <StockNotificationCenter
        alerts={stockAlerts}
        products={products}
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        onAcknowledge={handleAcknowledgeAlert}
        onAcknowledgeAll={handleAcknowledgeAll}
        onSnooze={handleSnoozeAlert}
        onRestock={handleQuickRestockFromAlert}
        onOpenThresholdModal={(prodId) => {
          setThresholdModalTargetProductId(prodId);
          setIsThresholdModalOpen(true);
        }}
        onOpenRestockEmail={handleOpenRestockEmail}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onSimulateStockDrop={handleSimulateStockDrop}
      />

      {/* Restock Request Email Modal */}
      <RestockEmailModal
        isOpen={isRestockEmailModalOpen}
        onClose={() => setIsRestockEmailModalOpen(false)}
        products={products}
        currentUser={currentUser}
        settings={settings}
        preSelectedProductId={restockEmailTargetProductId}
        onPushToIntake={(intakeItems) => {
          setReceiveItems((prev) => [...prev, ...intakeItems]);
          setActiveTab('receive');
        }}
        onLogAudit={logAudit}
        onAddNotification={addNotification}
      />

      {/* Threshold Configuration Modal */}
      <StockThresholdManagerModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        products={products}
        onUpdateProduct={updateProduct}
        targetProductId={thresholdModalTargetProductId}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onSimulateStockDrop={handleSimulateStockDrop}
      />

      {/* Top Banner & Hub KPIs */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">
                  Stock & Cellar
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Audit Ready
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Inventory & Cellar Hub
              </h1>
              <p className="text-xs text-white/40 mt-0.5">
                Real-time stock ledger.
              </p>
            </div>
          </div>

          {/* Real-Time Watchdog Actions & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Real-time Warning Badge Button */}
            <button
              onClick={() => setIsNotificationCenterOpen(true)}
              className={`py-2 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                activeBreachesCount > 0
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10 animate-pulse'
                  : 'bg-white/[0.02] hover:bg-white/5 text-white/60 border-white/5'
              }`}
              title="Open Real-Time Stock Warning Center"
            >
              <div className="relative flex items-center">
                <Bell className="w-4 h-4" />
                {activeBreachesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span>Stock Alerts ({activeBreachesCount})</span>
            </button>

            {/* Auto-Generate Restock Email Button */}
            <button
              onClick={() => handleOpenRestockEmail()}
              className={`py-2 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                lowStockCount > 0
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              }`}
              title="Auto-generate beverage restock request email template based on low-stock items"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              <span>Auto-Generate Restock Email</span>
              {lowStockCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-mono font-bold">
                  {lowStockCount}
                </span>
              )}
            </button>

            {/* Threshold Rules Button */}
            <button
              onClick={() => {
                setThresholdModalTargetProductId(undefined);
                setIsThresholdModalOpen(true);
              }}
              className="py-2 px-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configure Defined Thresholds"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Thresholds</span>
            </button>

            {/* Sound Chime Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? 'Alert chime is ON. Click to mute.' : 'Alert chime is MUTED. Click to enable.'}
              className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hub Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'thresholds', label: 'Threshold Rules' },
            { id: 'receive', label: 'Receive Stock' },
            { id: 'ledger', label: 'Movement Ledger' },
            { id: 'count', label: 'Stock Count' },
            { id: 'wastage', label: 'Wastage & Breakage' },
            { id: 'spirits', label: 'Volume (Spirits)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.id === 'thresholds' && activeBreachesCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                  {activeBreachesCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stock Overview Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Total Products</span>
            <div className="text-xl font-mono font-bold text-white mt-1">{totalProductsCount} items</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Stock Value</span>
            <div className="text-xl font-mono font-bold text-amber-400 mt-1">
              {settings.currency} {Math.round(totalStockValue).toLocaleString()}
            </div>
          </div>
          <div
            onClick={() => setIsNotificationCenterOpen(true)}
            className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-4 rounded-2xl cursor-pointer transition-colors"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 flex items-center justify-between">
              <span>Low Stock Warning</span>
              <Bell className="w-3 h-3 text-amber-400" />
            </span>
            <div className="text-xl font-mono font-bold text-amber-400 mt-1">{lowStockCount} items</div>
          </div>
          <div
            onClick={() => setIsNotificationCenterOpen(true)}
            className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-4 rounded-2xl cursor-pointer transition-colors"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 flex items-center justify-between">
              <span>Critical Deficit</span>
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            </span>
            <div className="text-xl font-mono font-bold text-rose-400 mt-1">{criticalStockCount} items</div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Out of Stock</span>
            <div className="text-xl font-mono font-bold text-white/60 mt-1">{outOfStockCount}</div>
          </div>
        </div>
      </div>

      {/* TAB 1: PRODUCT CATALOG OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name, SKU or barcode..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setThresholdModalTargetProductId(undefined);
                  setIsThresholdModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manage All Thresholds</span>
              </button>
            </div>
          </div>

          {/* Table with Defined Thresholds and Live Status */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-center">In Stock</th>
                  <th className="py-2.5 px-3 text-center">Defined Threshold</th>
                  <th className="py-2.5 px-3 text-center">Level Gauge</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter((p) => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .map((p) => {
                    const isLow = p.stockQuantity <= p.minStock && p.trackInventory;
                    const isCritical = p.stockQuantity <= Math.floor(p.minStock / 2) && p.trackInventory;
                    const fillPct = Math.min(100, Math.round((p.stockQuantity / Math.max(1, p.minStock)) * 100));

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{p.name}</div>
                          <span className="text-[10px] text-white/40 font-mono">
                            {p.sku} • {p.barcode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-white/60">{p.category}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {settings.currency} {p.sellingPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          {p.trackInventory ? (
                            <span
                              className={`font-bold ${
                                isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {p.stockQuantity} {p.unit}s
                            </span>
                          ) : (
                            <span className="text-white/30">N/A</span>
                          )}
                        </td>

                        {/* Defined Threshold */}
                        <td className="py-3 px-3 text-center">
                          {p.trackInventory ? (
                            <button
                              onClick={() => {
                                setThresholdModalTargetProductId(p.id);
                                setIsThresholdModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 font-mono text-xs text-white/80 transition-colors cursor-pointer"
                              title="Click to edit threshold"
                            >
                              <span>Min: {p.minStock}</span>
                              <span className="text-white/30">|</span>
                              <span className="text-white/50">Reorder: {p.reorderLevel}</span>
                            </button>
                          ) : (
                            <span className="text-white/30 text-[10px] font-mono">Untracked</span>
                          )}
                        </td>

                        {/* Visual Gauge */}
                        <td className="py-3 px-3 text-center">
                          {p.trackInventory ? (
                            <div className="w-24 mx-auto space-y-1">
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-white/40">{fillPct}%</span>
                            </div>
                          ) : (
                            <span className="text-white/30 text-[10px]">-</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {!p.trackInventory ? (
                            <span className="px-2 py-0.5 rounded-xl text-[10px] font-mono bg-zinc-800 text-zinc-400">
                              Recipe / Bar
                            </span>
                          ) : isLow ? (
                            <RestockNowBadge product={p} onClick={handleOpenRestockEmail} size="sm" />
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              SAFE
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isLow && (
                              <button
                                onClick={() => handleOpenRestockEmail(p.id)}
                                className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                                title="Auto-generate restock request email template for this product"
                              >
                                <Mail className="w-3 h-3 text-amber-400" />
                                <span>Email PO</span>
                              </button>
                            )}

                            {p.trackInventory && (
                              <button
                                onClick={() => handleSimulateStockDrop(p.id, 5)}
                                className="py-1 px-2 rounded-lg bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/5 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                                title="Simulate 5 drinks sold to test real-time warning trigger"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>Test (-5)</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setThresholdModalTargetProductId(p.id);
                                setIsThresholdModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-colors cursor-pointer"
                              title="Edit Threshold"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: THRESHOLD RULES CONFIGURATION */}
      {activeTab === 'thresholds' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">
                  Threshold Management & Alert System
                </span>
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                Safety Stock Thresholds & Notification Rules
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Every beverage has a configured warning threshold. When inventory drops below this number, the hub
                triggers an audible chime.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleOpenRestockEmail()}
                className="py-2.5 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/5"
              >
                <Mail className="w-4 h-4 text-amber-400" />
                <span>Auto-Generate Restock Email</span>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-mono">
                    {lowStockCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsNotificationCenterOpen(true)}
                className="py-2.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                <span>View {activeBreachesCount} Active Alerts</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Warning Line (minStock)</h4>
              </div>
              <p className="text-xs text-white/50">
                Alerts staff to add the beverage to the next intake delivery.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Critical Line (50% minStock)</h4>
              </div>
              <p className="text-xs text-white/50">
                Triggers higher-priority urgent alerts.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-400">
                <Volume2 className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase">Auditory Notification Chime</h4>
              </div>
              <p className="text-xs text-white/50">
                Synthesizes instant dual-tone Web Audio chimes right in the browser when bar sales cause threshold breaches.
              </p>
            </div>
          </div>

          {/* Quick Threshold Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Current Stock</th>
                  <th className="py-2.5 px-3 text-center">Warning Threshold (Min)</th>
                  <th className="py-2.5 px-3 text-center">Reorder Target</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter((p) => p.trackInventory)
                  .map((p) => {
                    const isBelow = p.stockQuantity <= p.minStock;
                    const isCrit = p.stockQuantity <= Math.floor(p.minStock / 2);

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{p.name}</td>
                        <td className="py-3 px-3 text-white/60 font-mono">{p.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={isCrit ? 'text-rose-400' : isBelow ? 'text-amber-400' : 'text-emerald-400'}>
                            {p.stockQuantity} {p.unit}s
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="font-bold text-white">{p.minStock}</span> {p.unit}s
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-white/60">
                          {p.reorderLevel} {p.unit}s
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isBelow ? (
                            <RestockNowBadge product={p} onClick={handleOpenRestockEmail} size="sm" />
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              SAFE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isBelow && (
                              <button
                                onClick={() => handleOpenRestockEmail(p.id)}
                                className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                                title="Auto-generate restock request email"
                              >
                                <Mail className="w-3 h-3 text-amber-400" />
                                <span>Email PO</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleSimulateStockDrop(p.id, 5)}
                              className="py-1 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-mono transition-colors cursor-pointer"
                            >
                              Simulate -5
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVE STOCK (SCANNER / MANUAL) */}
      {activeTab === 'receive' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">Stock Delivery Intake</h2>
              <p className="text-xs text-white/40">Scan delivery barcodes or manually select supplier products to receive.</p>
            </div>

            <button
              onClick={() => setIsCameraActive(!isCameraActive)}
              className={`py-2 px-3.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isCameraActive
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  : 'bg-indigo-600/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-600/20'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>{isCameraActive ? 'Close Camera' : 'Live Camera Barcode Scanner'}</span>
            </button>
          </div>

          {/* Camera Viewport */}
          {isCameraActive && (
            <div className="bg-black/90 rounded-3xl overflow-hidden p-4 border border-indigo-500/30 space-y-3">
              <div className="relative max-w-sm mx-auto aspect-video bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-4 border-2 border-dashed border-indigo-400 rounded-xl pointer-events-none opacity-80 animate-pulse" />
              </div>
              <p className="text-center text-[11px] text-white/40">
                Point camera at keg or bottle barcode, or use fast barcode test buttons below:
              </p>
              {/* Quick Barcode Test Buttons */}
              <div className="flex justify-center gap-2 flex-wrap pt-1">
                {products.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleScanBarcode(p.barcode)}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/80 text-[10px] font-mono border border-white/10 cursor-pointer"
                  >
                    Scan {p.name.split(' ')[0]} ({p.barcode.slice(-4)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {cameraFeedback && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5 font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cameraFeedback}</span>
            </div>
          )}

          {/* Supplier details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">Supplier / Distributor</label>
              <input
                type="text"
                value={receiveSupplier}
                onChange={(e) => setReceiveSupplier(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">Add Product to Intake List</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) {
                      setReceiveItems((prev) => [
                        ...prev,
                        { productId: prod.id, quantity: 24, unitCost: prod.costPrice },
                      ]);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled className="bg-[#18181b]">
                    -- Choose Product to Receive --
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#18181b]">
                      {p.name} (Current Stock: {p.stockQuantity} • Min: {p.minStock})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items being received */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-white/40">Intake Inventory Items ({receiveItems.length})</h3>
            {receiveItems.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-xs border border-dashed border-white/10 rounded-2xl">
                No items added to current delivery. Scan barcodes or choose from the dropdown above.
              </div>
            ) : (
              <div className="space-y-2">
                {receiveItems.map((item, idx) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={idx}
                      className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-[160px]">
                        <span className="font-bold text-white">{prod?.name}</span>
                        <div className="text-[10px] text-white/40 font-mono">
                          Current on shelf: {prod?.stockQuantity} • Defined Min: {prod?.minStock}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-white/40 font-mono">Receive Qty:</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            setReceiveItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, quantity: Number(e.target.value) } : it))
                            )
                          }
                          className="w-20 bg-white/[0.03] border border-white/10 rounded-xl px-2.5 py-1 text-center font-bold text-white font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-white/40 font-mono">Unit Cost:</span>
                        <input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) =>
                            setReceiveItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, unitCost: Number(e.target.value) } : it))
                            )
                          }
                          className="w-24 bg-white/[0.03] border border-white/10 rounded-xl px-2.5 py-1 text-right font-bold text-white font-mono"
                        />
                      </div>

                      <button
                        onClick={() => setReceiveItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={handleConfirmReceive}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  Commit Delivery Intake to Ledger
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">
                Stock Movement Ledger ({inventoryLedger.length} Records)
              </h2>
              <span className="text-xs text-white/40">Every sale, purchase, breakage & count logged immutably</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3 text-center">Delta (Units)</th>
                  <th className="py-2.5 px-3 text-center">Prev → New</th>
                  <th className="py-2.5 px-3">Logged By</th>
                  <th className="py-2.5 px-3">Reason / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {inventoryLedger.map((txn) => {
                  const isPositive = txn.quantity > 0;
                  return (
                    <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-white/40 font-mono">
                        {new Date(txn.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{txn.productName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            txn.type === 'PURCHASE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                              : txn.type === 'SALE'
                              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                              : txn.type === 'SALE_REVERSAL'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-center font-mono font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${txn.quantity}` : txn.quantity} {txn.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-white/60">
                        {txn.previousBalance} → <strong className="text-white">{txn.newBalance}</strong>
                      </td>
                      <td className="py-2.5 px-3 text-white/70">{txn.userName}</td>
                      <td className="py-2.5 px-3 text-white/40 text-[11px] truncate max-w-[200px]" title={txn.reason}>
                        {txn.reason} {txn.reference ? `(${txn.reference})` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PHYSICAL STOCK COUNT & AUDIT */}
      {activeTab === 'count' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-tight">
                Physical Stock Count & Variance
              </h2>
              <p className="text-xs text-white/40">
                Audit expected bottles vs actual shelf count. Variances are audited and auto-trigger threshold alerts if
                count drops below safety lines.
              </p>
            </div>
            <button
              onClick={handleSaveStockCount}
              className="py-2.5 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
            >
              Reconcile Count
            </button>
          </div>

          {countFeedback && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{countFeedback}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-center">Expected (System)</th>
                  <th className="py-2.5 px-3 text-center">Defined Threshold</th>
                  <th className="py-2.5 px-3 text-center">Physical Count</th>
                  <th className="py-2.5 px-3 text-center">Variance</th>
                  <th className="py-2.5 px-3">Variance Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter((p) => p.trackInventory)
                  .map((prod) => {
                    const enteredCount = stockCountEntries[prod.id]?.physicalCount ?? prod.stockQuantity;
                    const variance = enteredCount - prod.stockQuantity;
                    const variancePct = prod.stockQuantity > 0 ? Math.round((variance / prod.stockQuantity) * 100) : 0;

                    return (
                      <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-bold text-white">{prod.name}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-white/80">
                          {prod.stockQuantity} {prod.unit}s
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-white/40">
                          {prod.minStock} {prod.unit}s
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            value={enteredCount}
                            onChange={(e) =>
                              setStockCountEntries((prev) => ({
                                ...prev,
                                [prod.id]: {
                                  physicalCount: Number(e.target.value),
                                  reason: prev[prod.id]?.reason || '',
                                },
                              }))
                            }
                            className="w-20 bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 text-center font-bold text-white font-mono"
                          />
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {variance === 0 ? (
                            <span className="text-white/30">0</span>
                          ) : (
                            <span className={variance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                              {variance > 0 ? `+${variance}` : variance} ({variancePct}%)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            placeholder="Reason if variance..."
                            value={stockCountEntries[prod.id]?.reason || ''}
                            onChange={(e) =>
                              setStockCountEntries((prev) => ({
                                ...prev,
                                [prod.id]: {
                                  physicalCount: prev[prod.id]?.physicalCount ?? prod.stockQuantity,
                                  reason: e.target.value,
                                },
                              }))
                            }
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WASTAGE & BREAKAGE */}
      {activeTab === 'wastage' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 max-w-xl mx-auto space-y-5 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-tight">Log Bar Wastage & Spillage</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Audit drops, shattered bottles, staff drinks, or contaminated pours. If stock dips below threshold, real-time warning fires automatically.
            </p>
          </div>

          {wastageFeedback && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 flex items-center gap-2.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{wastageFeedback}</span>
            </div>
          )}

          <form onSubmit={handleExecuteWastage} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">Product</label>
              <select
                value={wastageProductId}
                onChange={(e) => setWastageProductId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {products
                  .filter((p) => p.trackInventory)
                  .map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#18181b]">
                      {p.name} (Stock: {p.stockQuantity} • Min: {p.minStock})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={wastageQuantity}
                  onChange={(e) => setWastageQuantity(Number(e.target.value))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1">Reason</label>
                <select
                  value={wastageReason}
                  onChange={(e) => setWastageReason(e.target.value as any)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Broken" className="bg-[#18181b]">Broken Bottle</option>
                  <option value="Spilled" className="bg-[#18181b]">Spilled Pour</option>
                  <option value="Expired" className="bg-[#18181b]">Expired</option>
                  <option value="Damaged" className="bg-[#18181b]">Damaged in Transit</option>
                  <option value="Complimentary" className="bg-[#18181b]">Complimentary / VIP</option>
                  <option value="Staff drink" className="bg-[#18181b]">Staff Drink Allowance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 mb-1">Incident Notes</label>
              <textarea
                rows={2}
                value={wastageNotes}
                onChange={(e) => setWastageNotes(e.target.value)}
                placeholder="Explain the incident (e.g. Slipped off tray near bar counter)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs uppercase tracking-wider shadow cursor-pointer"
            >
              Submit Wastage Entry
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: SPIRITS BY VOLUME */}
      {activeTab === 'spirits' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-tight">
              Spirit & High-End Liquid Volume Accounting
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Track open bottle milliliters vs sealed cellar bottles. When shots (50ml) or cocktails are poured, liquid decreases precisely.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter((p) => p.trackByVolume)
              .map((prod) => {
                const totalBottleVol = prod.volumeMl || 750;
                const openVol = prod.currentVolumeMl ?? totalBottleVol;
                const pctRemainingInOpen = Math.round((openVol / totalBottleVol) * 100);

                return (
                  <div key={prod.id} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs text-white">{prod.name}</h3>
                        <span className="text-[10px] text-white/40 font-mono">
                          {prod.stockQuantity} sealed 750ml bottles in storage
                        </span>
                      </div>
                      <Droplets className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>

                    {/* Open Bottle Gauge */}
                    <div className="space-y-1.5 bg-white/[0.03] p-3.5 rounded-2xl border border-white/5">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">Open Bottle:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {openVol}ml / {totalBottleVol}ml ({pctRemainingInOpen}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                          style={{ width: `${pctRemainingInOpen}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-white/40 text-right font-mono">
                        ~ {Math.floor(openVol / 50)} double shots (50ml) remaining in current bottle
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
