import React, { useState } from 'react';
import {
  Sliders,
  X,
  Check,
  Search,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  RefreshCw,
  Save,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Product } from '../../types';
import { playStockAlertChime } from './stockAlertAudio';

interface StockThresholdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onUpdateProduct: (product: Product) => void;
  targetProductId?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSimulateStockDrop: (productId: string, dropQty: number) => void;
}

export const StockThresholdManagerModal: React.FC<StockThresholdManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  onUpdateProduct,
  targetProductId,
  soundEnabled,
  onToggleSound,
  onSimulateStockDrop,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingThresholds, setEditingThresholds] = useState<
    Record<string, { minStock: number; reorderLevel: number }>
  >({});
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Bulk update state
  const [bulkCategory, setBulkCategory] = useState<string>('BEER');
  const [bulkMinStock, setBulkMinStock] = useState<number>(24);
  const [bulkReorder, setBulkReorder] = useState<number>(48);

  if (!isOpen) return null;

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products
    .filter((p) => p.trackInventory)
    .filter((p) => {
      if (targetProductId) return p.id === targetProductId;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });

  const handleFieldChange = (productId: string, field: 'minStock' | 'reorderLevel', val: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setEditingThresholds((prev) => ({
      ...prev,
      [productId]: {
        minStock: field === 'minStock' ? val : prev[productId]?.minStock ?? prod.minStock,
        reorderLevel: field === 'reorderLevel' ? val : prev[productId]?.reorderLevel ?? prod.reorderLevel,
      },
    }));
  };

  const handleSaveProductThreshold = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const edits = editingThresholds[productId];
    if (!prod || !edits) return;

    const updated: Product = {
      ...prod,
      minStock: Math.max(1, edits.minStock),
      reorderLevel: Math.max(edits.minStock, edits.reorderLevel),
    };

    onUpdateProduct(updated);
    setSavedFeedback(`Threshold updated for ${prod.name}! Min: ${updated.minStock}, Reorder: ${updated.reorderLevel}`);
    setTimeout(() => setSavedFeedback(null), 3000);
  };

  const handleApplyBulkCategory = () => {
    const targetProds = products.filter((p) => p.category === bulkCategory && p.trackInventory);
    targetProds.forEach((prod) => {
      onUpdateProduct({
        ...prod,
        minStock: bulkMinStock,
        reorderLevel: bulkReorder,
      });
    });

    setSavedFeedback(
      `Applied bulk threshold (Min: ${bulkMinStock}, Reorder: ${bulkReorder}) across ${targetProds.length} ${bulkCategory} items!`
    );
    setTimeout(() => setSavedFeedback(null), 3500);
  };

  return (
    <div
      id="stock-threshold-manager-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="stock-threshold-manager-modal"
        className="bg-[#121214] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">
                  Threshold Configuration
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Real-Time Rules
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                Define Stock Warning Thresholds
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Set minimum stock safety cushions and reorder trigger lines. Alerts automatically fire when inventory
                dips below these numbers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className={`p-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20'
                  : 'bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/5'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline font-mono">{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {savedFeedback && (
          <div className="mx-6 mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 flex items-center gap-2.5 font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedFeedback}</span>
          </div>
        )}

        {/* Bulk Category Setter Accordion */}
        <div className="p-6 sm:p-7 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Bulk Category Threshold Preset
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
              >
                {categories
                  .filter((c) => c !== 'ALL')
                  .map((c) => (
                    <option key={c} value={c} className="bg-[#18181b]">
                      {c}
                    </option>
                  ))}
              </select>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-white/40 font-mono">Min Threshold:</span>
                <input
                  type="number"
                  min="1"
                  value={bulkMinStock}
                  onChange={(e) => setBulkMinStock(Number(e.target.value))}
                  className="w-16 bg-white/[0.04] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] text-white/40 font-mono">Reorder Level:</span>
                <input
                  type="number"
                  min="1"
                  value={bulkReorder}
                  onChange={(e) => setBulkReorder(Number(e.target.value))}
                  className="w-16 bg-white/[0.04] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white text-center font-mono"
                />
              </div>

              <button
                onClick={handleApplyBulkCategory}
                className="py-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
              >
                Apply to All {bulkCategory}
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 bg-white/[0.01]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === c
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table of products */}
        <div className="p-6 sm:p-7 flex-1 overflow-y-auto max-h-[480px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-[10px] uppercase font-mono">
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3 text-center">Warning Threshold (Min)</th>
                <th className="py-2.5 px-3 text-center">Reorder Level</th>
                <th className="py-2.5 px-3 text-center">Live Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((p) => {
                const draft = editingThresholds[p.id];
                const activeMin = draft ? draft.minStock : p.minStock;
                const activeReorder = draft ? draft.reorderLevel : p.reorderLevel;
                const isModified = draft && (draft.minStock !== p.minStock || draft.reorderLevel !== p.reorderLevel);

                const isBelowMin = p.stockQuantity <= activeMin;
                const isCritical = p.stockQuantity <= Math.floor(activeMin / 2);

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-white/40 font-mono">
                        {p.category} • SKU: {p.sku}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono">
                      <span className={`font-bold ${isCritical ? 'text-rose-400' : isBelowMin ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {p.stockQuantity} {p.unit}s
                      </span>
                    </td>

                    {/* Warning Threshold Stepper */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
                        <button
                          onClick={() => handleFieldChange(p.id, 'minStock', Math.max(1, activeMin - 1))}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={activeMin}
                          onChange={(e) => handleFieldChange(p.id, 'minStock', Number(e.target.value))}
                          className="w-12 bg-transparent text-center text-xs font-bold text-white font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => handleFieldChange(p.id, 'minStock', activeMin + 1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Reorder Level Stepper */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
                        <button
                          onClick={() => handleFieldChange(p.id, 'reorderLevel', Math.max(activeMin, activeReorder - 1))}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={activeMin}
                          value={activeReorder}
                          onChange={(e) => handleFieldChange(p.id, 'reorderLevel', Number(e.target.value))}
                          className="w-12 bg-transparent text-center text-xs font-bold text-white font-mono focus:outline-none"
                        />
                        <button
                          onClick={() => handleFieldChange(p.id, 'reorderLevel', activeReorder + 1)}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Live Status */}
                    <td className="py-3 px-3 text-center">
                      {isCritical ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          CRITICAL ALERT
                        </span>
                      ) : isBelowMin ? (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          WARNING ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          SAFE LEVEL
                        </span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isModified && (
                          <button
                            onClick={() => handleSaveProductThreshold(p.id)}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
                            title="Save updated threshold"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        )}

                        {/* Test Stock Drop */}
                        <button
                          onClick={() => onSimulateStockDrop(p.id, 5)}
                          className="py-1.5 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                          title="Simulate stock reduction of 5 units to test real-time notification trigger"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span>Test Drop (-5)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <span className="text-xs text-white/40 font-mono">
            {filteredProducts.length} inventory products tracked with real-time threshold monitoring
          </span>

          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-2xl bg-white/[0.05] hover:bg-white/10 text-white font-semibold transition-colors cursor-pointer text-xs uppercase tracking-wider"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
