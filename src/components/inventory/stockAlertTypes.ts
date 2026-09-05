export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  category: string;
  barcode: string;
  sku: string;
  unit: string;
  currentStock: number;
  threshold: number; // Defined warning threshold (minStock)
  reorderLevel: number;
  deficit: number;
  severity: 'out_of_stock' | 'critical' | 'warning';
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  snoozedUntil?: number;
}

export interface AlertThresholdConfig {
  soundEnabled: boolean;
  autoToastEnabled: boolean;
  toastDurationMs: number;
  criticalThresholdRatio: number; // e.g. 0.5 = 50% of minStock
}
