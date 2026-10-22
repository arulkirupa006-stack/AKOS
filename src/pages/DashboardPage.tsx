import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../components/Navbar';
import { Product, Sale, StockAdjustment } from '../types';
import {
  getProducts,
  getSales,
  getStockAdjustments,
  adjustStock,
} from '../services/db';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Printer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface DashboardPageProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const { currentUser, storeSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [, setRecentAdjustments] = useState<StockAdjustment[]>([]);
  const [, setLoading] = useState<boolean>(true);

  // Quick restock modal
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('20');
  const [restockSubmitting, setRestockSubmitting] = useState<boolean>(false);

  // Receipt preview modal
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [allProd, allSales, adjustments] = await Promise.all([
        getProducts(),
        getSales(),
        getStockAdjustments(),
      ]);
      setProducts(allProd);
      setSales(allSales);
      setRecentAdjustments(adjustments.slice(0, 5));
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations for Today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.createdAt.startsWith(todayStr));
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

  // Low stock products
  const lowStockProducts = products.filter(
    p => p.stock <= (p.lowStockThreshold || storeSettings.lowStockThreshold || 10)
  );

  const handleQuickRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRestockProduct) return;
    const amount = parseInt(restockAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    setRestockSubmitting(true);
    try {
      await adjustStock(
        quickRestockProduct.id,
        amount,
        'Restock',
        currentUser?.fullName || 'Admin',
        currentUser?.id || 'admin'
      );
      setQuickRestockProduct(null);
      loadDashboardData();
    } catch (err) {
      console.error('Restock error:', err);
    } finally {
      setRestockSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-700 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-100 bg-sky-800/40 px-2.5 py-0.5 rounded-full border border-sky-400/30">
            Supermarket Control Hub
          </span>
          <h1 className="text-xl font-bold text-white mt-2">
            Welcome back, {currentUser?.fullName}
          </h1>
          <p className="text-xs text-sky-100 mt-1">
            Real-time terminal performance, inventory health, and fast billing shortcuts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('new_bill')}
            className="px-4 py-2.5 bg-white text-sky-700 hover:bg-sky-50 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4 text-sky-600" />
            <span>Open Cashier Billing</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today's Revenue</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-sky-700 tabular-nums">
            {currency}{todayRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-800">{todaySales.length} bills</span> completed today
          </div>
        </div>

        {/* Total Bills */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>All-Time Bills</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {sales.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Recorded in store history
          </div>
        </div>

        {/* Catalog Items */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Products</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {products.length}
          </div>
          <div className="text-[11px] text-slate-500">
            Items registered with barcodes
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Low Stock Alerts</span>
            <div className={`p-2 rounded-xl border ${lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tabular-nums ${
              lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-600'
            }`}
          >
            {lowStockProducts.length}
          </div>
          <div className="text-[11px] text-slate-500">
            {lowStockProducts.length > 0 ? 'Requires immediate restock' : 'All items well-stocked'}
          </div>
        </div>
      </div>

      {/* Quick Action Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveTab('new_bill')}
          className="p-3.5 bg-white hover:bg-sky-50/60 border border-sky-100 hover:border-sky-300 rounded-xl text-left transition-all group shadow-xs"
        >
          <div className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 flex items-center justify-between">
            <span>New Bill</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cashier terminal & scanner</p>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className="p-3.5 bg-white hover:bg-sky-50/60 border border-sky-100 hover:border-sky-300 rounded-xl text-left transition-all group shadow-xs"
        >
          <div className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 flex items-center justify-between">
            <span>Products</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Catalog & barcode manager</p>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className="p-3.5 bg-white hover:bg-sky-50/60 border border-sky-100 hover:border-sky-300 rounded-xl text-left transition-all group shadow-xs"
        >
          <div className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 flex items-center justify-between">
            <span>Inventory</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Stock adjustments & logs</p>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-3.5 bg-white hover:bg-sky-50/60 border border-sky-100 hover:border-sky-300 rounded-xl text-left transition-all group shadow-xs"
        >
          <div className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 flex items-center justify-between">
            <span>Reports</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Revenue & payment analytics</p>
        </button>
      </div>

      {/* Two-Column Lower Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Sales (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Sales
            </h3>
            <button
              onClick={() => setActiveTab('sales_history')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
            >
              <span>View All History</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No sales recorded yet. Start billing in New Bill!
            </div>
          ) : (
            <div className="divide-y divide-sky-100/70">
              {sales.slice(0, 6).map(sale => (
                <div
                  key={sale.id}
                  className="p-3.5 hover:bg-sky-50/40 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{sale.billNumber}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Cashier: {sale.cashierName} · {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sky-700 text-sm">
                        {currency}{sale.grandTotal.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {sale.items.reduce((s, i) => s + i.quantity, 0)} items
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSale(sale)}
                      className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg transition-colors"
                      title="View Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warnings (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Low-Stock Warnings</span>
            </h3>
            <span className="text-xs font-mono text-slate-600 bg-white px-2 py-0.5 rounded-md border border-sky-100 font-semibold">
              {lowStockProducts.length} items
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">All inventory levels healthy</p>
              <p className="text-[11px]">No products currently below their threshold.</p>
            </div>
          ) : (
            <div className="divide-y divide-sky-100/70 max-h-[360px] overflow-y-auto">
              {lowStockProducts.map(prod => (
                <div
                  key={prod.id}
                  className="p-3 hover:bg-sky-50/40 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="space-y-0.5 max-w-[180px]">
                    <div className="font-semibold text-slate-900 truncate">{prod.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {prod.barcode}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold font-mono text-[11px] border border-rose-200">
                      {prod.stock} left
                    </span>
                    <button
                      onClick={() => setQuickRestockProduct(prod)}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK RESTOCK MODAL */}
      {quickRestockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-sky-100 w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Quick Restock: {quickRestockProduct.name}
            </h3>
            <p className="text-xs text-slate-600">
              Current stock is <strong>{quickRestockProduct.stock} units</strong>. How many units would you like to add?
            </p>
            <form onSubmit={handleQuickRestock} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                value={restockAmount}
                onChange={e => setRestockAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickRestockProduct(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restockSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {restockSubmitting ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL PREVIEW */}
      <ReceiptModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        settings={storeSettings}
      />
    </div>
  );
};
