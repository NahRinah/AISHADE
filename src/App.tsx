import React, { useState, useEffect, lazy, Suspense } from 'react';
import { PubStoreProvider, usePubStore } from './services/store';
import { Header } from './components/layout/Header';
import { Search, X, Zap, Bookmark, Package, Clock, ShieldCheck, ShoppingCart, Loader2 } from 'lucide-react';

const NormalPOS = lazy(() => import('./components/pos/NormalPOS').then((m) => ({ default: m.NormalPOS })));
const QuickSale = lazy(() => import('./components/pos/QuickSale').then((m) => ({ default: m.QuickSale })));
const CustomerTabs = lazy(() => import('./components/tabs/CustomerTabs').then((m) => ({ default: m.CustomerTabs })));
const InventoryHub = lazy(() => import('./components/inventory/InventoryHub').then((m) => ({ default: m.InventoryHub })));
const OperationsHub = lazy(() => import('./components/operations/OperationsHub').then((m) => ({ default: m.OperationsHub })));
const ShiftManagement = lazy(() => import('./components/staff/ShiftManagement').then((m) => ({ default: m.ShiftManagement })));
const ManagementBI = lazy(() => import('./components/analytics/ManagementBI').then((m) => ({ default: m.ManagementBI })));
const PubSettingsView = lazy(() => import('./components/settings/PubSettingsView').then((m) => ({ default: m.PubSettingsView })));

function MainPubApp() {
  const { products, tabs, sales, settings } = usePubStore();
  const [currentTab, setCurrentTab] = useState<string>('pos');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcut listeners (Ctrl+K for global spotlight search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered search results
  const matchingProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5);

  const matchingTabs = tabs
    .filter((t) => t.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#e0e0e4] flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openGlobalSearch={() => setIsSearchOpen(true)}
      />

      {/* Main Content Body with Lazy Loading & Suspense */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1600px] w-full mx-auto pb-14">
        <Suspense
          fallback={
            <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Loading Iron Savanna Module...</p>
            </div>
          }
        >
          {currentTab === 'pos' && <NormalPOS />}
          {currentTab === 'quicksale' && <QuickSale />}
          {currentTab === 'tabs' && <CustomerTabs />}
          {currentTab === 'inventory' && <InventoryHub />}
          {currentTab === 'operations' && <OperationsHub />}
          {currentTab === 'shifts' && <ShiftManagement />}
          {currentTab === 'analytics' && <ManagementBI />}
          {currentTab === 'settings' && <PubSettingsView />}
        </Suspense>
      </main>

      {/* Global Spotlight / Search Modal (Ctrl+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-20 p-4">
          <div className="bg-[#121214] border border-white/10 rounded-[2rem] max-w-xl w-full shadow-2xl shadow-black/80 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search drinks, SKU, customer tabs, or system actions..."
                className="w-full bg-transparent text-sm text-[#e0e0e4] placeholder-white/30 focus:outline-none font-medium"
              />
              <span className="text-[10px] font-mono uppercase bg-white/5 text-white/40 px-2 py-1 rounded-lg border border-white/10">
                ESC
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4 divide-y divide-white/5">
              {/* Quick Jump Navigation */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Quick Jump</span>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCurrentTab('quicksale');
                      setIsSearchOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-xs text-white/90 flex items-center gap-2.5 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold">Quick Sale</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab('tabs');
                      setIsSearchOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-xs text-white/90 flex items-center gap-2.5 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Bookmark className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold">Tabs</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentTab('inventory');
                      setIsSearchOpen(false);
                    }}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-left text-xs text-white/90 flex items-center gap-2.5 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold">Inventory</span>
                  </button>
                </div>
              </div>

              {/* Products match */}
              {searchQuery && (
                <div className="pt-3 space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Drinks & Beers</span>
                  {matchingProducts.length === 0 ? (
                    <div className="text-xs text-white/30 py-1">No matching drinks found.</div>
                  ) : (
                    matchingProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setCurrentTab('pos');
                          setIsSearchOpen(false);
                        }}
                        className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all"
                      >
                        <div>
                          <span className="font-bold text-[#e0e0e4]">{p.name}</span>
                          <span className="text-[10px] text-white/40 ml-2 font-mono">{p.sku}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          {settings.currency} {p.sellingPrice.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Customer tabs match */}
              {searchQuery && (
                <div className="pt-3 space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Customer Tabs</span>
                  {matchingTabs.length === 0 ? (
                    <div className="text-xs text-white/30 py-1">No customer tabs found.</div>
                  ) : (
                    matchingTabs.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setCurrentTab('tabs');
                          setIsSearchOpen(false);
                        }}
                        className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs cursor-pointer transition-all"
                      >
                        <div>
                          <span className="font-bold text-[#e0e0e4]">{t.customerName}</span>
                          <span className="text-[10px] text-white/40 ml-2 uppercase font-mono">{t.status}</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-400">
                          {settings.currency} {t.runningTotal.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <PubStoreProvider>
      <MainPubApp />
    </PubStoreProvider>
  );
}
