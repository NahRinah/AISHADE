import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Product,
  PubSettings,
  SaleTransaction,
  CustomerTab,
  Shift,
  InventoryTransaction,
  StockReceipt,
  StockCount,
  WastageRecord,
  ApprovalRequest,
  AuditLogEntry,
  PubNotification,
  CartItem,
  PaymentRecord,
  PaymentMethod,
  ApprovalType,
  Permission,
  ProductVariant,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_SALES,
  INITIAL_SHIFTS,
  INITIAL_CUSTOMER_TABS,
  INITIAL_INVENTORY_LEDGER,
  INITIAL_APPROVALS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData';
import { parseVoiceOrder } from './voiceOrderParser';
import {
  playVoiceSuccessChime,
  playVoiceErrorChime,
  speakConfirmationText,
} from './voiceAudio';

interface PubStoreContextType {
  // Auth & Permissions
  currentUser: User;
  users: User[];
  switchUser: (userId: string) => void;
  hasPermission: (permission: Permission) => boolean;

  // Network & Sync
  isOnline: boolean;
  toggleNetworkStatus: () => void;
  offlineQueueCount: number;
  syncOfflineQueue: () => Promise<void>;

  // Core Data
  products: Product[];
  sales: SaleTransaction[];
  tabs: CustomerTab[];
  shifts: Shift[];
  currentShift: Shift | null;
  inventoryLedger: InventoryTransaction[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLogEntry[];
  notifications: PubNotification[];
  settings: PubSettings;

  // Actions - Sales
  createSale: (
    items: CartItem[],
    customer: { name: string; phone?: string; type: 'walk-in' | 'regular' | 'vip' | 'tab' },
    paymentMethod: PaymentMethod,
    payments: PaymentRecord[],
    discountPercentage?: number,
    discountAmount?: number,
    discountReason?: string
  ) => Promise<{ success: boolean; sale?: SaleTransaction; error?: string }>;

  voidSale: (saleId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  refundSale: (saleId: string, refundAmount: number, reason: string) => Promise<{ success: boolean; error?: string }>;

  // Actions - Tabs
  openCustomerTab: (name: string, phone?: string, notes?: string, creditLimit?: number) => CustomerTab;
  addItemToTab: (tabId: string, item: CartItem) => { success: boolean; error?: string };
  closeTab: (tabId: string, paymentMethod: PaymentMethod, payments: PaymentRecord[]) => Promise<{ success: boolean; sale?: SaleTransaction; error?: string }>;

  // Actions - Inventory
  receiveStock: (receipt: { supplier: string; items: Array<{ productId: string; quantity: number; unitCost: number; batchNumber?: string; expiryDate?: string }>; notes?: string }) => void;
  recordWastage: (productId: string, quantity: number, volumeMl: number | undefined, reason: WastageRecord['reason'], notes?: string) => { success: boolean; requiresApproval?: boolean };
  submitStockCount: (items: Array<{ productId: string; expectedStock: number; physicalCount: number; reason: string }>, notes?: string) => void;
  updateProduct: (product: Product) => void;
  addProduct: (product: Omit<Product, 'id'>) => Product;

  // Actions - Shifts
  startShift: (openingCash: number) => Shift;
  closeShift: (actualCash: number, varianceReason?: string) => Shift;

  // Actions - Approvals
  createApprovalRequest: (type: ApprovalType, details: any, entityId: string) => ApprovalRequest;
  resolveApproval: (approvalId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => void;

  // Actions - Notifications & Settings
  addNotification: (notif: Omit<PubNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (notifId: string) => void;
  clearAllNotifications: () => void;
  updateSettings: (newSettings: Partial<PubSettings>) => void;
  resetToDemoData: () => void;
  logAudit: (action: string, entity: string, entityId: string, before?: any, after?: any, reason?: string) => void;

  // POS Cart State & Voice Commands
  posCart: CartItem[];
  addToPosCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  updatePosCartQuantity: (index: number, delta: number) => void;
  removeFromPosCart: (index: number) => void;
  clearPosCart: () => void;
  setPosCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  selectedTabId: string | null;
  setSelectedTabId: (tabId: string | null) => void;
  executeVoiceCommand: (
    commandText: string,
    fallbackTarget?: 'POS' | 'TAB'
  ) => {
    success: boolean;
    message: string;
    productName?: string;
    quantity?: number;
    target?: 'POS' | 'TAB';
    tabName?: string;
  };
}

const STORAGE_KEYS = {
  USERS: 'got_pub_users_v1',
  CURRENT_USER_ID: 'got_pub_current_user_id_v1',
  PRODUCTS: 'got_pub_products_v1',
  SALES: 'got_pub_sales_v1',
  TABS: 'got_pub_tabs_v1',
  SHIFTS: 'got_pub_shifts_v1',
  INVENTORY: 'got_pub_inventory_v1',
  APPROVALS: 'got_pub_approvals_v1',
  AUDIT: 'got_pub_audit_v1',
  NOTIFICATIONS: 'got_pub_notifications_v1',
  SETTINGS: 'got_pub_settings_v1',
  POS_CART: 'got_pub_pos_cart_v1',
};

const PubStoreContext = createContext<PubStoreContextType | null>(null);

export const PubStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from localStorage or seed
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return saved || INITIAL_USERS[3].id; // Default to Waiter (Podrick) for authentic POS first impression, or user can toggle
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<SaleTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [tabs, setTabs] = useState<CustomerTab[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TABS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMER_TABS;
  });

  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    return saved ? JSON.parse(saved) : INITIAL_SHIFTS;
  });

  const [inventoryLedger, setInventoryLedger] = useState<InventoryTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY_LEDGER;
  });

  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPROVALS);
    return saved ? JSON.parse(saved) : INITIAL_APPROVALS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<PubNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<PubSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [posCart, setPosCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POS_CART);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedTabId, setSelectedTabId] = useState<string | null>(() => {
    return INITIAL_CUSTOMER_TABS[0]?.id || null;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POS_CART, JSON.stringify(posCart));
  }, [posCart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventoryLedger));
  }, [inventoryLedger]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPROVALS, JSON.stringify(approvals));
  }, [approvals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Current active user
  const currentUser = useMemo(() => {
    return users.find((u) => u.id === currentUserId) || users[0];
  }, [users, currentUserId]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return currentUser.permissions.includes(permission);
    },
    [currentUser]
  );

  const switchUser = useCallback((userId: string) => {
    setCurrentUserId(userId);
  }, []);

  // Shift for current user
  const currentShift = useMemo(() => {
    return shifts.find((s) => s.waiterId === currentUser.id && s.status === 'OPEN') || null;
  }, [shifts, currentUser.id]);

  const offlineQueueCount = useMemo(() => {
    return sales.filter((s) => !s.synced).length;
  }, [sales]);

  const toggleNetworkStatus = useCallback(() => {
    setIsOnline((prev) => !prev);
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    setSales((prev) =>
      prev.map((s) => (s.synced ? s : { ...s, synced: true }))
    );
  }, []);

  // Helper: Log audit
  const logAudit = useCallback(
    (action: string, entity: string, entityId: string, before?: any, after?: any, reason?: string) => {
      const entry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action,
        entity,
        entityId,
        before,
        after,
        reason,
      };
      setAuditLogs((prev) => [entry, ...prev]);
    },
    [currentUser]
  );

  // Helper: Add notification
  const addNotification = useCallback(
    (notif: Omit<PubNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: PubNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    []
  );

  // CREATE SALE: Transaction-Centric & Atomic Inventory Update
  const createSale = useCallback(
    async (
      items: CartItem[],
      customer: { name: string; phone?: string; type: 'walk-in' | 'regular' | 'vip' | 'tab' },
      paymentMethod: PaymentMethod,
      payments: PaymentRecord[],
      discountPercentage: number = 0,
      discountAmount: number = 0,
      discountReason?: string
    ) => {
      if (!items.length) {
        return { success: false, error: 'Cart is empty.' };
      }

      // 1. Calculate financial figures
      const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
      const computedDiscount = discountAmount > 0 ? discountAmount : (subtotal * discountPercentage) / 100;
      const taxableSubtotal = Math.max(0, subtotal - computedDiscount);
      const taxAmount = settings.isVatEnabled ? (taxableSubtotal * settings.vatRate) / 100 : 0;
      const serviceCharge = settings.isServiceChargeEnabled
        ? (taxableSubtotal * settings.serviceChargeRate) / 100
        : 0;
      const total = Math.round(taxableSubtotal + taxAmount + serviceCharge);

      // Validate payment coverage
      const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
      if (totalPaid < total) {
        return {
          success: false,
          error: `Payment incomplete. Due: ${settings.currency} ${total.toLocaleString()}, Provided: ${settings.currency} ${totalPaid.toLocaleString()}`,
        };
      }

      // 2. Generate unique collision-safe transaction ID: GT-YYYYMMDD-XXXXXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randSuffix = String(Math.floor(Math.random() * 900000) + 100000);
      const transactionId = `GT-${dateStr}-${randSuffix}`;

      // 3. Atomically deduct inventory and create ledger transactions
      const newLedgerEntries: InventoryTransaction[] = [];
      const updatedProducts = [...products];

      for (const item of items) {
        const prodIndex = updatedProducts.findIndex((p) => p.id === item.productId);
        if (prodIndex >= 0) {
          const prod = { ...updatedProducts[prodIndex] };

          // Handle composite/recipe items (e.g. cocktails)
          if (prod.isComposite && prod.recipe?.length) {
            for (const ing of prod.recipe) {
              const ingProdIndex = updatedProducts.findIndex((p) => p.id === ing.productId);
              if (ingProdIndex >= 0) {
                const ingProd = { ...updatedProducts[ingProdIndex] };
                const totalVolUsed = ing.volumeMl * item.quantity;
                const prevVol = ingProd.currentVolumeMl || ingProd.volumeMl || 750;
                let newVol = prevVol - totalVolUsed;
                let bottlesUsed = 0;

                while (newVol < 0 && ingProd.stockQuantity > 0) {
                  ingProd.stockQuantity -= 1;
                  newVol += ingProd.volumeMl || 750;
                  bottlesUsed += 1;
                }
                ingProd.currentVolumeMl = Math.max(0, newVol);

                const ledgerEntry: InventoryTransaction = {
                  id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  productId: ingProd.id,
                  productName: `${ingProd.name} (Recipe: ${prod.name})`,
                  type: 'SALE',
                  quantity: -bottlesUsed,
                  volumeMl: -totalVolUsed,
                  unit: 'ml',
                  previousBalance: prevVol,
                  newBalance: newVol,
                  userId: currentUser.id,
                  userName: currentUser.name,
                  timestamp: now.toISOString(),
                  reason: `Sold in cocktail: ${prod.name} × ${item.quantity}`,
                  reference: transactionId,
                };
                newLedgerEntries.push(ledgerEntry);
                updatedProducts[ingProdIndex] = ingProd;
              }
            }
          } else if (prod.trackInventory) {
            const prevStock = prod.stockQuantity;
            const newStock = Math.max(0, prevStock - item.quantity);
            prod.stockQuantity = newStock;

            // Check low stock triggers
            if (newStock <= prod.minStock) {
              addNotification({
                type: 'CRITICAL_STOCK',
                title: `Low Stock: ${prod.name}`,
                message: `Stock level dropped to ${newStock} ${prod.unit}s (Reorder level is ${prod.reorderLevel}).`,
                severity: newStock <= (prod.criticalStockThresholdDefault || 10) ? 'danger' : 'warning',
                linkTab: 'inventory',
              });
            }

            const ledgerEntry: InventoryTransaction = {
              id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'SALE',
              quantity: -item.quantity,
              unit: prod.unit,
              previousBalance: prevStock,
              newBalance: newStock,
              userId: currentUser.id,
              userName: currentUser.name,
              timestamp: now.toISOString(),
              reason: 'Customer sale completed',
              reference: transactionId,
            };
            newLedgerEntries.push(ledgerEntry);
            updatedProducts[prodIndex] = prod;
          }
        }
      }

      // 4. Create Sale Record
      const newSale: SaleTransaction = {
        id: transactionId,
        createdAt: now.toISOString(),
        waiterId: currentUser.id,
        waiterName: currentUser.name,
        shiftId: currentShift?.id || 'shift-general',
        customer,
        items,
        subtotal,
        discountPercentage,
        discountAmount: computedDiscount,
        discountReason,
        taxAmount,
        serviceCharge,
        total,
        paymentStatus: 'CONFIRMED',
        paymentMethod,
        payments,
        status: 'PAID',
        synced: isOnline,
      };

      // 5. Update Shift stats if active
      if (currentShift) {
        setShifts((prevShifts) =>
          prevShifts.map((s) => {
            if (s.id === currentShift.id) {
              const cashAdd = payments.filter((p) => p.method === 'CASH').reduce((a, b) => a + b.amount, 0);
              const mpesaAdd = payments.filter((p) => p.method === 'M-PESA').reduce((a, b) => a + b.amount, 0);
              const cardAdd = payments.filter((p) => p.method === 'CARD').reduce((a, b) => a + b.amount, 0);

              return {
                ...s,
                expectedCash: s.expectedCash + cashAdd,
                mpesaTotal: s.mpesaTotal + mpesaAdd,
                cardTotal: s.cardTotal + cardAdd,
                totalSales: s.totalSales + total,
                totalTransactions: s.totalTransactions + 1,
              };
            }
            return s;
          })
        );
      }

      // Commit state updates
      setProducts(updatedProducts);
      setInventoryLedger((prev) => [...newLedgerEntries, ...prev]);
      setSales((prev) => [newSale, ...prev]);

      logAudit('SALE_COMPLETED', 'SaleTransaction', transactionId, null, {
        total,
        itemsCount: items.length,
        paymentMethod,
      });

      return { success: true, sale: newSale };
    },
    [products, settings, isOnline, currentUser, currentShift, logAudit, addNotification]
  );

  // VOID SALE: Reverses stock and audits
  const voidSale = useCallback(
    async (saleId: string, reason: string) => {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return { success: false, error: 'Sale not found.' };
      if (sale.status === 'VOIDED') return { success: false, error: 'Sale is already voided.' };

      // Reverse inventory
      const updatedProducts = [...products];
      const reversalLedgerEntries: InventoryTransaction[] = [];

      for (const item of sale.items) {
        const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIdx >= 0) {
          const prod = { ...updatedProducts[pIdx] };
          if (prod.trackInventory && !prod.isComposite) {
            const prev = prod.stockQuantity;
            const next = prev + item.quantity;
            prod.stockQuantity = next;
            updatedProducts[pIdx] = prod;

            reversalLedgerEntries.push({
              id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'SALE_REVERSAL',
              quantity: item.quantity,
              unit: prod.unit,
              previousBalance: prev,
              newBalance: next,
              userId: currentUser.id,
              userName: currentUser.name,
              timestamp: new Date().toISOString(),
              reason: `Sale voided: ${reason}`,
              reference: saleId,
            });
          }
        }
      }

      setProducts(updatedProducts);
      setInventoryLedger((prev) => [...reversalLedgerEntries, ...prev]);
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                status: 'VOIDED',
                voidReason: reason,
                voidedBy: currentUser.name,
                voidedAt: new Date().toISOString(),
              }
            : s
        )
      );

      logAudit('SALE_VOIDED', 'SaleTransaction', saleId, { status: sale.status }, { status: 'VOIDED', reason });
      addNotification({
        type: 'PAYMENT_ALERT',
        title: `Sale Voided: #${saleId}`,
        message: `Sale for ${settings.currency} ${sale.total.toLocaleString()} was voided by ${currentUser.name}. Reason: ${reason}`,
        severity: 'warning',
        linkTab: 'sales',
      });

      return { success: true };
    },
    [sales, products, currentUser, logAudit, addNotification, settings.currency]
  );

  // REFUND SALE
  const refundSale = useCallback(
    async (saleId: string, refundAmount: number, reason: string) => {
      const sale = sales.find((s) => s.id === saleId);
      if (!sale) return { success: false, error: 'Sale not found.' };

      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId
            ? {
                ...s,
                status: refundAmount >= s.total ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                refundAmount,
                refundReason: reason,
                refundedBy: currentUser.name,
                refundedAt: new Date().toISOString(),
              }
            : s
        )
      );

      logAudit('SALE_REFUNDED', 'SaleTransaction', saleId, null, { refundAmount, reason });
      return { success: true };
    },
    [sales, currentUser, logAudit]
  );

  // CUSTOMER TABS
  const openCustomerTab = useCallback(
    (name: string, phone?: string, notes?: string, creditLimit?: number) => {
      const newTab: CustomerTab = {
        id: `tab-${Date.now()}`,
        customerName: name || 'Valued Patron',
        customerPhone: phone,
        waiterId: currentUser.id,
        waiterName: currentUser.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: [],
        runningTotal: 0,
        creditLimit: creditLimit || settings.defaultCreditLimit,
        status: 'OPEN',
        notes,
      };

      setTabs((prev) => [newTab, ...prev]);
      logAudit('TAB_OPENED', 'CustomerTab', newTab.id, null, { customerName: name });
      return newTab;
    },
    [currentUser, settings.defaultCreditLimit, logAudit]
  );

  const addItemToTab = useCallback(
    (tabId: string, item: CartItem) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return { success: false, error: 'Tab not found.' };
      if (tab.status !== 'OPEN') return { success: false, error: 'Tab is closed.' };

      const newTotal = tab.runningTotal + item.subtotal;
      if (newTotal > tab.creditLimit) {
        addNotification({
          type: 'CREDIT_ALERT',
          title: `Credit Exceeded: ${tab.customerName}`,
          message: `Tab total (${settings.currency} ${newTotal.toLocaleString()}) exceeds limit (${settings.currency} ${tab.creditLimit.toLocaleString()}). Supervisor approval recommended.`,
          severity: 'danger',
          linkTab: 'tabs',
        });
      }

      const tabItem = {
        id: `tabitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        addedAt: new Date().toISOString(),
        addedByWaiterId: currentUser.id,
        addedByWaiterName: currentUser.name,
      };

      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                items: [...t.items, tabItem],
                runningTotal: newTotal,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );

      logAudit('TAB_ITEM_ADDED', 'CustomerTab', tabId, null, { item: item.name, qty: item.quantity });
      return { success: true };
    },
    [tabs, currentUser, settings.currency, logAudit, addNotification]
  );

  const closeTab = useCallback(
    async (tabId: string, paymentMethod: PaymentMethod, payments: PaymentRecord[]) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return { success: false, error: 'Tab not found.' };
      if (!tab.items.length) return { success: false, error: 'Tab has no items.' };

      // Convert tab items into CartItems
      const cartItems: CartItem[] = tab.items.map((ti) => {
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

      const res = await createSale(
        cartItems,
        { name: tab.customerName, phone: tab.customerPhone, type: 'tab' },
        paymentMethod,
        payments
      );

      if (res.success && res.sale) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  status: 'CLOSED',
                  closedTransactionId: res.sale!.id,
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        );
        logAudit('TAB_CLOSED', 'CustomerTab', tabId, { status: 'OPEN' }, { status: 'CLOSED', saleId: res.sale.id });
      }

      return res;
    },
    [tabs, products, createSale, logAudit]
  );

  // INVENTORY OPERATIONS
  const receiveStock = useCallback(
    (receiptData: {
      supplier: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitCost: number;
        batchNumber?: string;
        expiryDate?: string;
      }>;
      notes?: string;
    }) => {
      const receiptId = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        Math.random() * 900 + 100
      )}`;
      const updatedProducts = [...products];
      const newLedger: InventoryTransaction[] = [];

      for (const item of receiptData.items) {
        const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIdx >= 0) {
          const prod = { ...updatedProducts[pIdx] };
          const prev = prod.stockQuantity;
          const next = prev + item.quantity;
          prod.stockQuantity = next;
          prod.costPrice = item.unitCost;
          updatedProducts[pIdx] = prod;

          newLedger.push({
            id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: prod.id,
            productName: prod.name,
            type: 'PURCHASE',
            quantity: item.quantity,
            unit: prod.unit,
            previousBalance: prev,
            newBalance: next,
            userId: currentUser.id,
            userName: currentUser.name,
            timestamp: new Date().toISOString(),
            reason: `Stock delivery from ${receiptData.supplier} (Receipt: ${receiptId})`,
            reference: receiptId,
          });
        }
      }

      setProducts(updatedProducts);
      setInventoryLedger((prev) => [...newLedger, ...prev]);
      logAudit('STOCK_RECEIVED', 'StockReceipt', receiptId, null, {
        supplier: receiptData.supplier,
        itemsCount: receiptData.items.length,
      });

      addNotification({
        type: 'STOCK_VARIANCE',
        title: 'Stock Received & Reconciled',
        message: `Successfully received ${receiptData.items.reduce(
          (a, b) => a + b.quantity,
          0
        )} items from ${receiptData.supplier}.`,
        severity: 'success',
        linkTab: 'inventory',
      });
    },
    [products, currentUser, logAudit, addNotification]
  );

  const recordWastage = useCallback(
    (
      productId: string,
      quantity: number,
      volumeMl: number | undefined,
      reason: WastageRecord['reason'],
      notes?: string
    ) => {
      const prod = products.find((p) => p.id === productId);
      if (!prod) return { success: false };

      const costLost = quantity * prod.costPrice;
      const requiresApproval = costLost > 2000; // Large wastage rule

      if (requiresApproval && currentUser.role === 'waiter') {
        const appr: ApprovalRequest = {
          id: `appr-${Date.now()}`,
          type: 'LARGE_WASTAGE',
          entityId: productId,
          requestedBy: currentUser.id,
          requestedByName: currentUser.name,
          requesterRole: currentUser.role,
          details: {
            description: `Wastage reported for ${prod.name} (${quantity} units, cost: ${settings.currency} ${costLost.toLocaleString()})`,
            amount: costLost,
            productId,
            reason: `${reason}: ${notes || 'No extra notes'}`,
          },
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        setApprovals((prev) => [appr, ...prev]);
        addNotification({
          type: 'APPROVAL_PENDING',
          title: 'Wastage Approval Required',
          message: `${currentUser.name} reported high wastage on ${prod.name} (${settings.currency} ${costLost.toLocaleString()}).`,
          severity: 'warning',
          linkTab: 'approvals',
        });
        return { success: true, requiresApproval: true };
      }

      // Deduct stock directly
      const prev = prod.stockQuantity;
      const next = Math.max(0, prev - quantity);

      setProducts((prevProds) =>
        prevProds.map((p) => (p.id === productId ? { ...p, stockQuantity: next } : p))
      );

      // Low stock warning check
      if (prod.trackInventory && next <= prod.minStock) {
        addNotification({
          type: 'CRITICAL_STOCK',
          title: `Low Stock Alert: ${prod.name}`,
          message: `${prod.name} dropped to ${next} ${prod.unit}s following wastage (Defined threshold: ${prod.minStock}).`,
          severity: next === 0 || next <= Math.floor(prod.minStock / 2) ? 'danger' : 'warning',
          linkTab: 'inventory',
        });
      }

      const txnType = reason === 'Broken' ? 'BREAKAGE' : reason === 'Spilled' ? 'SPILLAGE' : 'WASTAGE';
      const ledgerEntry: InventoryTransaction = {
        id: `inv-${Date.now()}`,
        productId: prod.id,
        productName: prod.name,
        type: txnType,
        quantity: -quantity,
        volumeMl: volumeMl ? -volumeMl : undefined,
        unit: prod.unit,
        previousBalance: prev,
        newBalance: next,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        reason: `${reason} - ${notes || 'Logged'}`,
      };

      setInventoryLedger((prev) => [ledgerEntry, ...prev]);
      logAudit('WASTAGE_RECORDED', 'Product', productId, { stock: prev }, { stock: next, reason });

      return { success: true, requiresApproval: false };
    },
    [products, currentUser, settings.currency, logAudit, addNotification]
  );

  const submitStockCount = useCallback(
    (
      items: Array<{ productId: string; expectedStock: number; physicalCount: number; reason: string }>,
      notes?: string
    ) => {
      const updatedProducts = [...products];
      const newLedger: InventoryTransaction[] = [];
      let highVarianceCount = 0;

      for (const item of items) {
        const pIdx = updatedProducts.findIndex((p) => p.id === item.productId);
        if (pIdx >= 0) {
          const prod = { ...updatedProducts[pIdx] };
          const variance = item.physicalCount - item.expectedStock;

          if (variance !== 0) {
            const variancePct = item.expectedStock > 0 ? Math.abs((variance / item.expectedStock) * 100) : 100;
            if (variancePct > 5) highVarianceCount++;

            prod.stockQuantity = item.physicalCount;
            updatedProducts[pIdx] = prod;

            // Low stock warning check on physical audit count
            if (prod.trackInventory && item.physicalCount <= prod.minStock) {
              addNotification({
                type: 'CRITICAL_STOCK',
                title: `Audit Stock Warning: ${prod.name}`,
                message: `Audit reconciliation verified ${prod.name} at ${item.physicalCount} ${prod.unit}s (Defined threshold: ${prod.minStock}).`,
                severity: item.physicalCount === 0 || item.physicalCount <= Math.floor(prod.minStock / 2) ? 'danger' : 'warning',
                linkTab: 'inventory',
              });
            }

            newLedger.push({
              id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: prod.id,
              productName: prod.name,
              type: 'STOCK_COUNT_CORRECTION',
              quantity: variance,
              unit: prod.unit,
              previousBalance: item.expectedStock,
              newBalance: item.physicalCount,
              userId: currentUser.id,
              userName: currentUser.name,
              timestamp: new Date().toISOString(),
              reason: `Physical stock count correction: ${item.reason || 'Audit reconciliation'}`,
            });
          }
        }
      }

      setProducts(updatedProducts);
      setInventoryLedger((prev) => [...newLedger, ...prev]);
      logAudit('STOCK_COUNT_COMPLETED', 'StockCount', `count-${Date.now()}`, null, {
        reconciledItems: items.length,
        notes,
      });

      if (highVarianceCount > 0) {
        addNotification({
          type: 'STOCK_VARIANCE',
          title: 'High Stock Variances Detected',
          message: `${highVarianceCount} products showed significant stock variance (>5%) during the physical count.`,
          severity: 'danger',
          linkTab: 'inventory',
        });
      }
    },
    [products, currentUser, logAudit, addNotification]
  );

  const updateProduct = useCallback(
    (updated: Product) => {
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      logAudit('PRODUCT_UPDATED', 'Product', updated.id, null, { name: updated.name, price: updated.sellingPrice });
    },
    [logAudit]
  );

  const addProduct = useCallback(
    (productData: Omit<Product, 'id'>): Product => {
      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      setProducts((prev) => [newProduct, ...prev]);
      logAudit('PRODUCT_CREATED', 'Product', newProduct.id, null, { name: newProduct.name });
      return newProduct;
    },
    [logAudit]
  );

  // SHIFT MANAGEMENT
  const startShift = useCallback(
    (openingCash: number): Shift => {
      const newShift: Shift = {
        id: `shift-${Date.now()}`,
        waiterId: currentUser.id,
        waiterName: currentUser.name,
        startedAt: new Date().toISOString(),
        openingCash,
        expectedCash: openingCash,
        mpesaTotal: 0,
        cardTotal: 0,
        totalSales: 0,
        totalTransactions: 0,
        status: 'OPEN',
      };

      setShifts((prev) => [newShift, ...prev]);
      logAudit('SHIFT_OPENED', 'Shift', newShift.id, null, { openingCash });
      return newShift;
    },
    [currentUser, logAudit]
  );

  const closeShift = useCallback(
    (actualCash: number, varianceReason?: string): Shift => {
      if (!currentShift) throw new Error('No open shift found.');

      const cashVariance = actualCash - currentShift.expectedCash;
      const closedShift: Shift = {
        ...currentShift,
        endedAt: new Date().toISOString(),
        actualCash,
        cashVariance,
        varianceReason,
        status: 'CLOSED',
      };

      setShifts((prev) => prev.map((s) => (s.id === currentShift.id ? closedShift : s)));
      logAudit('SHIFT_CLOSED', 'Shift', currentShift.id, currentShift, {
        actualCash,
        cashVariance,
        varianceReason,
      });

      if (Math.abs(cashVariance) > 100) {
        addNotification({
          type: 'SHIFT_CLOSED',
          title: `Shift Cash Discrepancy: ${currentUser.name}`,
          message: `Shift closed with ${cashVariance < 0 ? 'shortage' : 'surplus'} of ${settings.currency} ${Math.abs(
            cashVariance
          ).toLocaleString()}. Reason: ${varianceReason || 'None'}`,
          severity: 'warning',
          linkTab: 'shifts',
        });
      }

      return closedShift;
    },
    [currentShift, currentUser, settings.currency, logAudit, addNotification]
  );

  // APPROVALS
  const createApprovalRequest = useCallback(
    (type: ApprovalType, details: any, entityId: string): ApprovalRequest => {
      const newAppr: ApprovalRequest = {
        id: `appr-${Date.now()}`,
        type,
        entityId,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
        requesterRole: currentUser.role,
        details,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      setApprovals((prev) => [newAppr, ...prev]);
      logAudit('APPROVAL_REQUESTED', 'ApprovalRequest', newAppr.id, null, { type, entityId });
      return newAppr;
    },
    [currentUser, logAudit]
  );

  const resolveApproval = useCallback(
    (approvalId: string, decision: 'APPROVED' | 'REJECTED', notes?: string) => {
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === approvalId
            ? {
                ...a,
                status: decision,
                reviewedBy: currentUser.id,
                reviewedByName: currentUser.name,
                reviewedAt: new Date().toISOString(),
                reviewerNotes: notes,
              }
            : a
        )
      );
      logAudit('APPROVAL_RESOLVED', 'ApprovalRequest', approvalId, null, { decision, notes });
    },
    [currentUser, logAudit]
  );

  // NOTIFICATIONS & SETTINGS
  const markNotificationAsRead = useCallback((notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback(
    (newSettings: Partial<PubSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      logAudit('SETTINGS_UPDATED', 'PubSettings', 'config', null, newSettings);
    },
    [logAudit]
  );

  const resetToDemoData = useCallback(() => {
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[3].id);
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setTabs(INITIAL_CUSTOMER_TABS);
    setShifts(INITIAL_SHIFTS);
    setInventoryLedger(INITIAL_INVENTORY_LEDGER);
    setApprovals(INITIAL_APPROVALS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSettings(INITIAL_SETTINGS);
    setPosCart([]);
    localStorage.clear();
  }, []);

  // POS CART HANDLERS
  const addToPosCart = useCallback((product: Product, quantity = 1, variant?: ProductVariant) => {
    setPosCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.variantId === variant?.id
      );
      const price = variant ? variant.sellingPrice : product.sellingPrice;
      const cost = variant ? variant.costPrice : product.costPrice;
      const name = variant ? `${product.name} (${variant.name})` : product.name;

      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
                subtotal: (item.quantity + quantity) * item.unitPrice,
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          productId: product.id,
          variantId: variant?.id,
          name,
          category: product.category,
          unit: product.unit,
          unitPrice: price,
          costPrice: cost,
          quantity,
          discount: 0,
          subtotal: price * quantity,
        };
        return [...prev, newItem];
      }
    });
  }, []);

  const updatePosCartQuantity = useCallback((index: number, delta: number) => {
    setPosCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((it, i) =>
        i === index
          ? {
              ...it,
              quantity: newQty,
              subtotal: newQty * it.unitPrice,
            }
          : it
      );
    });
  }, []);

  const removeFromPosCart = useCallback((index: number) => {
    setPosCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearPosCart = useCallback(() => {
    setPosCart([]);
  }, []);

  // VOICE ORDER COMMAND EXECUTION
  const executeVoiceCommand = useCallback(
    (commandText: string, fallbackTarget: 'POS' | 'TAB' = 'TAB') => {
      const parsed = parseVoiceOrder(commandText, products, tabs, fallbackTarget, selectedTabId);

      if (!parsed || !parsed.matchedProduct) {
        playVoiceErrorChime();
        return {
          success: false,
          message: `Could not identify beverage from "${commandText}". Try saying: "Add two lagers to tab".`,
        };
      }

      const { matchedProduct, quantity, target } = parsed;

      if (target === 'TAB') {
        let tabId = parsed.targetTabId;
        let tabName = parsed.targetTabName;

        // If no open tab is found, auto-create one
        if (!tabId) {
          const newTab = openCustomerTab(
            tabName || 'Voice Patron',
            undefined,
            'Auto-created via Voice Order Command'
          );
          tabId = newTab.id;
          tabName = newTab.customerName;
          setSelectedTabId(newTab.id);
        }

        const cartItem: CartItem = {
          productId: matchedProduct.id,
          name: matchedProduct.name,
          category: matchedProduct.category,
          unit: matchedProduct.unit,
          unitPrice: matchedProduct.sellingPrice,
          costPrice: matchedProduct.costPrice,
          quantity,
          discount: 0,
          subtotal: matchedProduct.sellingPrice * quantity,
        };

        const res = addItemToTab(tabId, cartItem);
        if (res.success) {
          playVoiceSuccessChime();
          speakConfirmationText(`Added ${quantity} ${matchedProduct.name} to tab`);
          addNotification({
            type: 'SYSTEM_ALERT',
            title: 'Voice Order Added to Tab',
            message: `Voice order: Added ${quantity} × ${matchedProduct.name} to tab for ${tabName || 'patron'}.`,
            severity: 'info',
            linkTab: 'tabs',
          });
          return {
            success: true,
            message: `Added ${quantity} × ${matchedProduct.name} to ${tabName || 'Tab'}`,
            productName: matchedProduct.name,
            quantity,
            target: 'TAB' as const,
            tabName,
          };
        } else {
          playVoiceErrorChime();
          return {
            success: false,
            message: res.error || 'Failed to add drink to tab.',
          };
        }
      } else {
        // Target is POS Cart
        addToPosCart(matchedProduct, quantity);
        playVoiceSuccessChime();
        speakConfirmationText(`Added ${quantity} ${matchedProduct.name} to POS cart`);
        addNotification({
          type: 'SYSTEM_ALERT',
          title: 'Voice Order Added to POS Cart',
          message: `Voice order: Added ${quantity} × ${matchedProduct.name} to POS Cart.`,
          severity: 'info',
          linkTab: 'pos',
        });
        return {
          success: true,
          message: `Added ${quantity} × ${matchedProduct.name} to POS Cart`,
          productName: matchedProduct.name,
          quantity,
          target: 'POS' as const,
        };
      }
    },
    [products, tabs, selectedTabId, openCustomerTab, addItemToTab, addToPosCart, addNotification]
  );

  return (
    <PubStoreContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        hasPermission,
        isOnline,
        toggleNetworkStatus,
        offlineQueueCount,
        syncOfflineQueue,
        products,
        sales,
        tabs,
        shifts,
        currentShift,
        inventoryLedger,
        approvals,
        auditLogs,
        notifications,
        settings,
        posCart,
        addToPosCart,
        updatePosCartQuantity,
        removeFromPosCart,
        clearPosCart,
        setPosCart,
        selectedTabId,
        setSelectedTabId,
        executeVoiceCommand,
        createSale,
        voidSale,
        refundSale,
        openCustomerTab,
        addItemToTab,
        closeTab,
        receiveStock,
        recordWastage,
        submitStockCount,
        updateProduct,
        addProduct,
        startShift,
        closeShift,
        createApprovalRequest,
        resolveApproval,
        addNotification,
        markNotificationAsRead,
        clearAllNotifications,
        updateSettings,
        resetToDemoData,
        logAudit,
      }}
    >
      {children}
    </PubStoreContext.Provider>
  );
};

export const usePubStore = () => {
  const context = useContext(PubStoreContext);
  if (!context) {
    throw new Error('usePubStore must be used within a PubStoreProvider');
  }
  return context;
};
