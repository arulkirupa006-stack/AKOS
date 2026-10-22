import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sale } from '../types';
import { getSales } from '../services/db';
import { ReceiptModal } from '../components/ReceiptModal';
import {
  History,
  Search,
  Printer,
  Download,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  CircleDollarSign,
} from 'lucide-react';

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export const SalesHistoryPage: React.FC = () => {
  const { storeSettings, refreshSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await getSales();
      setSales(data);
    } catch (e) {
      console.error('Error fetching sales history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Date filtering logic
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(now.getDate() - 30);

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const saleDateStr = sale.createdAt.slice(0, 10);

    // Date range filter
    if (dateFilter === 'today' && saleDateStr !== todayStr) return false;
    if (dateFilter === 'yesterday' && saleDateStr !== yesterdayStr) return false;
    if (dateFilter === 'week' && saleDate < oneWeekAgo) return false;
    if (dateFilter === 'month' && saleDate < oneMonthAgo) return false;
    if (dateFilter === 'custom') {
      if (customStart && saleDateStr < customStart) return false;
      if (customEnd && saleDateStr > customEnd) return false;
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesBill = sale.billNumber.toLowerCase().includes(q);
      const matchesCashier = sale.cashierName.toLowerCase().includes(q);
      const matchesItem = sale.items.some(i => i.name.toLowerCase().includes(q) || i.barcode.includes(q));
      if (!matchesBill && !matchesCashier && !matchesItem) return false;
    }

    return true;
  });

  const totalFilteredRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);

  // CSV Export of sales
  const handleExportCsv = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Bill Number', 'Date', 'Time', 'Cashier', 'Item Count', 'Payment Method', 'Subtotal', 'Discount', 'Grand Total'];
    const rows = filteredSales.map(s => {
      const d = new Date(s.createdAt);
      return [
        `"${s.billNumber}"`,
        `"${d.toLocaleDateString()}"`,
        `"${d.toLocaleTimeString()}"`,
        `"${s.cashierName.replace(/"/g, '""')}"`,
        s.items.reduce((acc, i) => acc + i.quantity, 0),
        `"${s.paymentMethod}"`,
        s.subtotal,
        s.discount,
        s.grandTotal,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AKOS_Sales_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Sales History & Receipt Archives</h1>
            <p className="text-xs text-slate-500">
              Audit recorded bills, inspect line items, and reprint thermal receipts.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={filteredSales.length === 0}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-sky-100 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bill #, cashier, or item name..."
              className="w-full pl-10 pr-3.5 py-2 bg-sky-50/40 border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Quick Date Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1 bg-sky-50/70 p-1 rounded-xl border border-sky-100 text-xs w-full md:w-auto">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'today' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'yesterday' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'week' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'month' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                dateFilter === 'custom' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-sky-100 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-white border border-sky-200 text-slate-800 px-2 py-1 rounded-lg focus:outline-none focus:border-sky-500"
            />
            <span className="text-slate-600">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-white border border-sky-200 text-slate-800 px-2 py-1 rounded-lg focus:outline-none focus:border-sky-500"
            />
          </div>
        )}

        {/* Aggregate Banner for Filtered Range */}
        <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{filteredSales.length}</strong> transactions
          </div>
          <div>
            Filtered Revenue:{' '}
            <strong className="text-sky-700 font-mono font-bold text-sm">
              {currency}{totalFilteredRevenue.toFixed(2)}
            </strong>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading sales records...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No sales found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/60 text-slate-600 font-medium">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-3 text-center">Payment</th>
                  <th className="py-3 px-3 text-right">Subtotal</th>
                  <th className="py-3 px-3 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.billNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{sale.cashierName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      <span className="font-semibold text-slate-800 mr-1.5">
                        ({sale.items.reduce((s, i) => s + i.quantity, 0)})
                      </span>
                      {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 uppercase font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700">
                        {sale.paymentMethod === 'cash' && <Banknote className="w-3 h-3 text-sky-600" />}
                        {sale.paymentMethod === 'upi' && <QrCode className="w-3 h-3 text-blue-600" />}
                        {sale.paymentMethod === 'card' && <CreditCard className="w-3 h-3 text-indigo-600" />}
                        {sale.paymentMethod === 'other' && <CircleDollarSign className="w-3 h-3 text-amber-600" />}
                        <span>{sale.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {currency}{sale.subtotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sky-600">
                      {sale.discount > 0 ? `-${currency}${sale.discount.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-sky-700 text-sm">
                      {currency}{sale.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-medium flex items-center gap-1.5 mx-auto transition-colors"
                        title="View / Print Receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        settings={storeSettings}
        onSettingsUpdate={refreshSettings}
      />
    </div>
  );
};
