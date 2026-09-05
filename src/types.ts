export type Role = 'admin' | 'manager' | 'supervisor' | 'waiter';

export type Permission =
  | 'sales.create'
  | 'sales.view_own'
  | 'sales.view_all'
  | 'sales.void'
  | 'sales.refund'
  | 'discounts.apply'
  | 'inventory.view'
  | 'inventory.receive'
  | 'inventory.adjust'
  | 'inventory.count'
  | 'inventory.wastage'
  | 'tabs.manage'
  | 'shifts.manage'
  | 'reports.view'
  | 'reports.export'
  | 'staff.manage'
  | 'approvals.manage'
  | 'settings.manage';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: Role;
  roleTitle: string;
  status: 'active' | 'inactive';
  employeeId: string;
  permissions: Permission[];
  avatarColor: string;
}

export type ProductCategory =
  | 'BEER'
  | 'WHISKY'
  | 'VODKA'
  | 'GIN'
  | 'RUM'
  | 'BRANDY'
  | 'WINE'
  | 'COCKTAILS'
  | 'SHOTS'
  | 'SOFT DRINKS'
  | 'WATER'
  | 'ENERGY DRINKS'
  | 'OTHER';

export interface RecipeIngredient {
  productId: string;
  productName: string;
  volumeMl: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  sellingPrice: number;
  costPrice: number;
  volumeMl?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: ProductCategory;
  description?: string;
  sellingPrice: number;
  costPrice: number;
  unit: 'bottle' | 'can' | 'glass' | 'shot' | 'portion';
  volumeMl?: number; // Total bottle size in ml (e.g. 750)
  currentVolumeMl?: number; // For spirits open bottles
  stockQuantity: number; // Current physical units
  minStock: number;
  reorderLevel: number;
  active: boolean;
  trackInventory: boolean;
  trackByVolume?: boolean; // If true, tracks spirit by volume (e.g., 50ml shots)
  isComposite?: boolean; // Recipes (Mojito, Dawa)
  recipe?: RecipeIngredient[];
  variants?: ProductVariant[];
  quickSaleEligible?: boolean;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  category: ProductCategory;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  volumeMlDeducted?: number;
  discount: number;
  subtotal: number;
}

export type TransactionStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'VOIDED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';

export type PaymentMethod = 'CASH' | 'M-PESA' | 'CARD' | 'SPLIT';

export interface PaymentRecord {
  method: 'CASH' | 'M-PESA' | 'CARD';
  amount: number;
  reference?: string;
  tendered?: number;
  change?: number;
  timestamp: string;
}

export interface CustomerInfo {
  id?: string;
  name: string;
  phone?: string;
  type: 'walk-in' | 'regular' | 'vip' | 'tab';
  notes?: string;
}

export interface SaleTransaction {
  id: string; // e.g. GT-20260905-001054
  createdAt: string;
  waiterId: string;
  waiterName: string;
  shiftId: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  discountReason?: string;
  discountApprovedBy?: string;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  payments: PaymentRecord[];
  status: TransactionStatus;
  notes?: string;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;
  refundReason?: string;
  refundAmount?: number;
  refundedBy?: string;
  refundedAt?: string;
  synced: boolean;
}

export interface CustomerTabItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  addedAt: string;
  addedByWaiterId: string;
  addedByWaiterName: string;
}

export interface CustomerTab {
  id: string;
  customerName: string;
  customerPhone?: string;
  waiterId: string;
  waiterName: string;
  createdAt: string;
  updatedAt: string;
  items: CustomerTabItem[];
  runningTotal: number;
  creditLimit: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  notes?: string;
  closedTransactionId?: string;
}

export interface Shift {
  id: string;
  waiterId: string;
  waiterName: string;
  startedAt: string;
  endedAt?: string;
  openingCash: number;
  expectedCash: number;
  actualCash?: number;
  cashVariance?: number;
  mpesaTotal: number;
  cardTotal: number;
  totalSales: number;
  totalTransactions: number;
  varianceReason?: string;
  status: 'OPEN' | 'CLOSED';
}

export type InventoryMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'WASTAGE'
  | 'BREAKAGE'
  | 'SPILLAGE'
  | 'STAFF_DRINK'
  | 'COMPLIMENTARY'
  | 'ADJUSTMENT'
  | 'STOCK_COUNT_CORRECTION'
  | 'OPENING_BALANCE'
  | 'SALE_REVERSAL';

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryMovementType;
  quantity: number; // positive = stock in, negative = stock out
  volumeMl?: number;
  unit: string;
  previousBalance: number;
  newBalance: number;
  userId: string;
  userName: string;
  timestamp: string;
  reason: string;
  reference?: string; // e.g. Sale ID or Batch No
}

export interface StockCountItem {
  productId: string;
  productName: string;
  expectedStock: number;
  physicalCount: number;
  variance: number;
  variancePct: number;
  reason: string;
}

export interface StockCount {
  id: string;
  countedBy: string;
  countedByName: string;
  date: string;
  items: StockCountItem[];
  notes?: string;
  status: 'COMPLETED';
}

export interface StockReceiptItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface StockReceipt {
  id: string;
  receiptNumber: string;
  supplier: string;
  receivedBy: string;
  receivedByName: string;
  date: string;
  items: StockReceiptItem[];
  totalCost: number;
  notes?: string;
}

export interface WastageRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  volumeMl?: number;
  reason: 'Broken' | 'Spilled' | 'Expired' | 'Damaged' | 'Complimentary' | 'Staff drink' | 'Other';
  reportedBy: string;
  reportedByName: string;
  timestamp: string;
  notes?: string;
  approvedBy?: string;
}

export type ApprovalType =
  | 'DISCOUNT'
  | 'REFUND'
  | 'STOCK_ADJUSTMENT'
  | 'CREDIT_LIMIT'
  | 'LARGE_WASTAGE'
  | 'VOID';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  entityId: string;
  requestedBy: string;
  requestedByName: string;
  requesterRole: Role;
  details: {
    description: string;
    amount?: number;
    saleId?: string;
    productId?: string;
    requestedValue?: number;
    reason: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  reason?: string;
}

export interface PubNotification {
  id: string;
  type: 'CRITICAL_STOCK' | 'STOCK_VARIANCE' | 'APPROVAL_PENDING' | 'SHIFT_CLOSED' | 'CREDIT_ALERT' | 'PAYMENT_ALERT';
  title: string;
  message: string;
  severity: 'danger' | 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  linkTab?: string;
}

export interface PubSettings {
  pubName: string;
  tagline: string;
  currency: string;
  vatRate: number; // 0 or 16%
  isVatEnabled: boolean;
  serviceChargeRate: number; // 0 or %
  isServiceChargeEnabled: boolean;
  waiterDiscountCap: number; // 5%
  supervisorDiscountCap: number; // 15%
  managerDiscountCap: number; // 100%
  defaultCreditLimit: number; // KSh 10,000
  receiptFooter: string;
  lowStockThresholdDefault: number;
  criticalStockThresholdDefault: number;
  mpesaPaybillNumber: string;
  mpesaTillNumber: string;
}
