import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product, StockAdjustment } from '../types';
import {
  getProducts,
  getStockAdjustments,
  adjustStock,
} from '../services/db';
import {
  Layers,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { currentUser, storeSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'levels' | 'history'>('levels');

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Stock Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce'>('add');
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<StockAdjustment['reason']>('Restock');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      const [allProd, allAdj] = await Promise.all([
        getProducts(),
        getStockAdjustments(),
      ]);
      setProducts(allProd);
      setAdjustments(allAdj);
    } catch (e) {
      console.error('Error loading inventory:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustQty('');
    setAdjustReason('Restock');
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: 'error', text: 'Please enter a valid positive quantity.' });
      return;
    }

    const delta = adjustmentType === 'add' ? qty : -qty;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await adjustStock(
        selectedProduct.id,
        delta,
        adjustReason,
        currentUser?.fullName || 'Admin',
        currentUser?.id || 'admin'
      );

      setFeedback({
        type: 'success',
        text: `Stock for "${selectedProduct.name}" updated successfully by ${delta > 0 ? '+' : ''}${delta} units.`,
      });
      setIsAdjustModalOpen(false);
      loadInventoryData();
    } catch (err: any) {
      console.error('Adjustment error:', err);
      setFeedback({ type: 'error', text: err?.message || 'Failed to adjust stock.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);

    const threshold = p.lowStockThreshold || storeSettings.lowStockThreshold || 10;
    if (stockFilter === 'low') return matchesSearch && p.stock <= threshold && p.stock > 0;
    if (stockFilter === 'out') return matchesSearch && p.stock <= 0;
    return matchesSearch;
  });

  // Filtered adjustments
  const filteredAdjustments = adjustments.filter(adj => {
    return (
      adj.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adj.barcode.includes(searchQuery) ||
      adj.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adj.adjustedByName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Inventory & Stock Tracking</h1>
            <p className="text-xs text-slate-500">
              Audit stock movements, log restocks and write-offs, and inspect history.
            </p>
          </div>
        </div>

        {/* Tab switcher: Levels vs Audit History */}
        <div className="flex items-center bg-sky-50/70 p-1 rounded-xl border border-sky-100 text-xs">
          <button
            onClick={() => setActiveView('levels')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeView === 'levels'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Stock Levels
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movement Audit Log
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold px-1">
            ×
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeView === 'levels'
                ? 'Search product or barcode...'
                : 'Search audit log by item, reason, or operator...'
            }
            className="w-full pl-10 pr-3.5 py-2 bg-sky-50/40 border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 transition-colors"
          />
        </div>

        {activeView === 'levels' && (
          <div className="flex items-center gap-1.5 p-1 bg-sky-50/60 border border-sky-100 rounded-xl text-xs">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs border border-sky-100 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'low' ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                stockFilter === 'out' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: STOCK LEVELS TABLE */}
      {activeView === 'levels' && (
        <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading stock data...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No items match current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sky-100 bg-sky-50/60 text-slate-600 font-medium">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Low-Stock Alert Level</th>
                    <th className="py-3 px-4 text-center">Current In-Stock</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/70">
                  {filteredProducts.map(prod => {
                    const threshold = prod.lowStockThreshold || storeSettings.lowStockThreshold || 10;
                    const isLow = prod.stock <= threshold && prod.stock > 0;
                    const isOut = prod.stock <= 0;

                    return (
                      <tr key={prod.id} className="hover:bg-sky-50/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{prod.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200">
                            {prod.barcode}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{prod.category || '—'}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800 font-medium">
                          {currency}{prod.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {threshold} units
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-xs ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {prod.stock} units
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => openAdjustModal(prod)}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-medium transition-colors"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MOVEMENT AUDIT LOG */}
      {activeView === 'history' && (
        <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading audit log...</div>
          ) : filteredAdjustments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sky-100 bg-sky-50/60 text-slate-600 font-medium">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3 text-right">Previous</th>
                    <th className="py-3 px-3 text-center">Change</th>
                    <th className="py-3 px-3 text-right">New Stock</th>
                    <th className="py-3 px-4">Adjusted By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/70 font-mono">
                  {filteredAdjustments.map(adj => (
                    <tr key={adj.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(adj.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">{adj.productName}</td>
                      <td className="py-3 px-4 text-slate-700 text-[11px]">{adj.barcode}</td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            adj.reason === 'Sale'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : adj.reason === 'Restock'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : adj.reason === 'Damage / Expiry'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {adj.reason}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">{adj.previousStock}</td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            adj.change > 0 ? 'text-sky-700' : 'text-rose-600'
                          }`}
                        >
                          {adj.change > 0 ? '+' : ''}
                          {adj.change}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{adj.newStock}</td>
                      <td className="py-3 px-4 font-sans text-slate-700">{adj.adjustedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-sky-100 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adjust Stock Level</h3>
                <p className="text-xs text-slate-500">{selectedProduct.name}</p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Barcode:</span>
                <span className="font-mono text-slate-800">{selectedProduct.barcode}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Stock:</span>
                <span className="font-mono font-bold text-sky-700">
                  {selectedProduct.stock} units
                </span>
              </div>
            </div>

            <form onSubmit={handleStockAdjustmentSubmit} className="space-y-4">
              {/* Type toggle: Add or Reduce */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('add');
                      setAdjustReason('Restock');
                    }}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                      adjustmentType === 'add'
                        ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold ring-1 ring-sky-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/40'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add Stock (Restock)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('reduce');
                      setAdjustReason('Damage / Expiry');
                    }}
                    className={`py-2 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                      adjustmentType === 'reduce'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 font-bold ring-1 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50/40'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reduce Stock</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity ({adjustmentType === 'add' ? 'to add' : 'to deduct'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment *
                </label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  {adjustmentType === 'add' ? (
                    <>
                      <option value="Restock">Supplier Restock / New Delivery</option>
                      <option value="Return">Customer Return</option>
                      <option value="Physical Audit">Physical Inventory Recount</option>
                      <option value="Manual Correction">Manual Correction</option>
                    </>
                  ) : (
                    <>
                      <option value="Damage / Expiry">Damage / Breakage / Expiry</option>
                      <option value="Physical Audit">Shrinkage / Inventory Recount</option>
                      <option value="Manual Correction">Manual Correction</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-3 border-t border-sky-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Recording...' : 'Save Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
