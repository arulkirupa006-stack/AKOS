import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sale, Product } from '../types';
import { getSales, getProducts } from '../services/db';
import {
  BarChart3,
  CreditCard,
  Banknote,
  QrCode,
  CircleDollarSign,
  Download,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { storeSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  const [sales, setSales] = useState<Sale[]>([]);
  const [, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSales, allProd] = await Promise.all([getSales(), getProducts()]);
      setSales(allSales);
      setProducts(allProd);
    } catch (e) {
      console.error('Error loading reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales based on period
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const filteredSales = sales.filter(s => {
    const sDate = new Date(s.createdAt);
    if (period === 'daily') return s.createdAt.startsWith(todayStr);
    if (period === 'weekly') return sDate >= sevenDaysAgo;
    if (period === 'monthly') return sDate >= thirtyDaysAgo;
    return true;
  });

  // Financial Metrics
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalBills = filteredSales.length;
  const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;
  const totalDiscounts = filteredSales.reduce((sum, s) => sum + s.discount, 0);
  const totalItemsSold = filteredSales.reduce(
    (sum, s) => sum + s.items.reduce((acc, i) => acc + i.quantity, 0),
    0
  );

  // Payment Breakdown
  const paymentStats = {
    cash: { count: 0, amount: 0 },
    upi: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    other: { count: 0, amount: 0 },
  };

  filteredSales.forEach(s => {
    const method = s.paymentMethod as keyof typeof paymentStats;
    if (paymentStats[method]) {
      paymentStats[method].count++;
      paymentStats[method].amount += s.grandTotal;
    }
  });

  // Top Selling Products Calculation
  const productSalesMap: Record<string, { name: string; barcode: string; qty: number; revenue: number }> = {};

  filteredSales.forEach(s => {
    s.items.forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.name,
          barcode: item.barcode,
          qty: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Daily Breakdown Map
  const dailyBreakdown: Record<string, { bills: number; revenue: number; items: number }> = {};
  filteredSales.forEach(s => {
    const day = s.createdAt.slice(0, 10);
    if (!dailyBreakdown[day]) {
      dailyBreakdown[day] = { bills: 0, revenue: 0, items: 0 };
    }
    dailyBreakdown[day].bills++;
    dailyBreakdown[day].revenue += s.grandTotal;
    dailyBreakdown[day].items += s.items.reduce((acc, i) => acc + i.quantity, 0);
  });

  const dailyRows = Object.entries(dailyBreakdown).sort((a, b) => b[0].localeCompare(a[0]));

  const handleExportReportCsv = () => {
    const headers = ['Date', 'Bills Count', 'Items Sold', 'Total Revenue'];
    const rows = dailyRows.map(([day, data]) => [
      `"${day}"`,
      data.bills,
      data.items,
      data.revenue.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AKOS_Report_${period}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Sales & Financial Analytics</h1>
            <p className="text-xs text-slate-500">
              Aggregated business metrics, payment breakdowns, and item sales velocities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-sky-50/70 p-1 rounded-xl border border-sky-100 text-xs">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === 'daily' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === 'weekly' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === 'monthly' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === 'all' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={handleExportReportCsv}
            disabled={dailyRows.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Net Revenue</div>
          <div className="text-2xl font-black font-mono text-sky-700 tabular-nums">
            {currency}{totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Across {totalBills} transactions</div>
        </div>

        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Average Ticket Size</div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {currency}{avgBillValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Average basket value</div>
        </div>

        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Units Sold</div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {totalItemsSold}
          </div>
          <div className="text-[11px] text-slate-500">Total individual product items</div>
        </div>

        <div className="bg-white border border-sky-100 rounded-2xl p-5 space-y-2 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Bill Discounts</div>
          <div className="text-2xl font-black font-mono text-amber-600 tabular-nums">
            {currency}{totalDiscounts.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">Given to customers</div>
        </div>
      </div>

      {/* Payment Method Breakdown & Top Sellers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Payment Methods (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Payment Method Breakdown
          </h3>

          <div className="space-y-3">
            {/* Cash */}
            <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-sky-600" />
                  <span className="font-semibold text-slate-900">Cash</span>
                  <span className="text-slate-500">({paymentStats.cash.count} bills)</span>
                </div>
                <span className="font-mono font-bold text-sky-700">
                  {currency}{paymentStats.cash.amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-1.5 rounded-full"
                  style={{
                    width: `${totalRevenue > 0 ? (paymentStats.cash.amount / totalRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* UPI */}
            <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-900">UPI / QR</span>
                  <span className="text-slate-500">({paymentStats.upi.count} bills)</span>
                </div>
                <span className="font-mono font-bold text-blue-700">
                  {currency}{paymentStats.upi.amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{
                    width: `${totalRevenue > 0 ? (paymentStats.upi.amount / totalRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Card */}
            <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-900">Debit / Credit Card</span>
                  <span className="text-slate-500">({paymentStats.card.count} bills)</span>
                </div>
                <span className="font-mono font-bold text-indigo-700">
                  {currency}{paymentStats.card.amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{
                    width: `${totalRevenue > 0 ? (paymentStats.card.amount / totalRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Other */}
            <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-900">Other / Vouchers</span>
                  <span className="text-slate-500">({paymentStats.other.count} bills)</span>
                </div>
                <span className="font-mono font-bold text-amber-700">
                  {currency}{paymentStats.other.amount.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full"
                  style={{
                    width: `${totalRevenue > 0 ? (paymentStats.other.amount / totalRevenue) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Selling Products (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Top-Selling Products by Volume
          </h3>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No product sales data in this period.
            </div>
          ) : (
            <div className="divide-y divide-sky-100">
              {topProducts.map((p, index) => (
                <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-4 font-mono text-slate-400 font-bold">{index + 1}.</span>
                      <span>{p.name}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 pl-6">
                      Barcode: {p.barcode}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-sky-700">
                      {p.qty} units
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {currency}{p.revenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Daily Performance Ledger
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {dailyRows.length} active billing days
          </span>
        </div>

        {dailyRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No sales recorded in the selected timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/40 text-slate-600 font-medium">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Bills Completed</th>
                  <th className="py-3 px-4 text-center">Items Sold</th>
                  <th className="py-3 px-4 text-right">Daily Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70 font-mono">
                {dailyRows.map(([day, data]) => (
                  <tr key={day} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{day}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{data.bills}</td>
                    <td className="py-3 px-4 text-center text-slate-700">{data.items}</td>
                    <td className="py-3 px-4 text-right font-bold text-sky-700">
                      {currency}{data.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
