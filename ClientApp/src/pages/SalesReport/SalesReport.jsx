import React, { useEffect, useState } from 'react';
import {
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Download,
} from 'lucide-react';
import api from '../../services/api';

const SALES_REPORT_FILTERS_KEY = 'khmart_sales_report_filters';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSaleDateValue = (sale) => sale?.saleDate ?? sale?.dateCreated ?? sale?.createdDate ?? null;
const getSaleAmount = (sale) => Number(sale?.totalAmount ?? sale?.amount ?? 0);
const getSaleId = (sale) => sale?.saleId ?? sale?.id ?? 'N/A';
const getPaymentMethod = (sale) => sale?.payments?.[0]?.paymentMethod || 'N/A';

const readSavedFilters = () => {
  try {
    const raw = localStorage.getItem(SALES_REPORT_FILTERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const SalesReport = () => {
  const savedFilters = readSavedFilters();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(
    savedFilters?.startDate || new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    savedFilters?.endDate || new Date().toISOString().split('T')[0]
  );
  const [filterMethod, setFilterMethod] = useState(savedFilters?.filterMethod || 'all');

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  useEffect(() => {
    localStorage.setItem(
      SALES_REPORT_FILTERS_KEY,
      JSON.stringify({ startDate, endDate, filterMethod }),
    );
  }, [startDate, endDate, filterMethod]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales');
      setSales(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch sales data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by date and payment method
  const filteredSales = sales.filter((sale) => {
    const saleDate = toDateKey(getSaleDateValue(sale));
    if (!saleDate) return false;

    const dateMatch = saleDate >= startDate && saleDate <= endDate;
    const methodMatch = filterMethod === 'all' || getPaymentMethod(sale) === filterMethod;
    return dateMatch && methodMatch;
  });

  // Calculate totals
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + getSaleAmount(sale), 0);
  const totalSales = filteredSales.length;
  const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Revenue by payment method
  const revenueByMethod = {};
  filteredSales.forEach((sale) => {
    const method = getPaymentMethod(sale) || 'Unknown';
    if (!revenueByMethod[method]) {
      revenueByMethod[method] = { count: 0, total: 0 };
    }
    revenueByMethod[method].count += 1;
    revenueByMethod[method].total += getSaleAmount(sale);
  });

  // Top products
  const productSales = {};
  filteredSales.forEach((sale) => {
    sale.saleDetails?.forEach((detail) => {
      const productName = detail.product?.productName || 'Unknown';
      if (!productSales[productName]) {
        productSales[productName] = { qty: 0, revenue: 0 };
      }
      productSales[productName].qty += detail.quantity || 0;
      productSales[productName].revenue += (detail.quantity || 0) * (detail.price || 0);
    });
  });

  const topProducts = Object.entries(productSales)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Daily revenue
  const dailyRevenue = {};
  filteredSales.forEach((sale) => {
    const date = toDateKey(getSaleDateValue(sale));
    if (!date) {
      return;
    }
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = { count: 0, total: 0 };
    }
    dailyRevenue[date].count += 1;
    dailyRevenue[date].total += getSaleAmount(sale);
  });

  const dailyData = Object.entries(dailyRevenue)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleExportCSV = () => {
    const headers = ['Date', 'Receipt #', 'Items', 'Total', 'Payment Method', 'Cashier'];
    const rows = filteredSales.map((sale) => [
      new Date(getSaleDateValue(sale) || Date.now()).toLocaleString(),
      getSaleId(sale),
      sale.saleDetails?.length || 0,
      getSaleAmount(sale).toFixed(2),
      getPaymentMethod(sale),
      sale.user?.fullName || 'Unknown',
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${cell}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales-Report-${startDate}-to-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur px-8 py-6">
        <h1 className="text-4xl font-black tracking-tight mb-2">Sales Report</h1>
        <p className="text-slate-400">View sales analytics and performance metrics</p>
      </div>

      {/* Filters */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur px-8 py-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <label className="text-sm font-semibold text-slate-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition"
            />
          </div>
          <div className="flex gap-2">
            <label className="text-sm font-semibold text-slate-300">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition"
            />
          </div>
          <div className="flex gap-2">
            <label className="text-sm font-semibold text-slate-300">Payment Method</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="ABA">ABA</option>
            </select>
          </div>
          <button
            onClick={handleExportCSV}
            className="ml-auto flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading sales data...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Total Revenue</span>
                  <DollarSign className="text-emerald-400" size={24} />
                </div>
                <p className="text-3xl font-black text-white">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Total Sales</span>
                  <ShoppingCart className="text-blue-400" size={24} />
                </div>
                <p className="text-3xl font-black text-white">{totalSales}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Avg Order Value</span>
                  <TrendingUp className="text-sky-400" size={24} />
                </div>
                <p className="text-3xl font-black text-white">
                  {formatCurrency(avgOrderValue)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400">Date Range</span>
                  <Calendar className="text-purple-400" size={24} />
                </div>
                <p className="text-lg font-black text-white">
                  {Math.ceil(
                    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
                  )}{' '}
                  days
                </p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Revenue by Payment Method */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <h2 className="text-lg font-black text-white mb-6">Revenue by Payment Method</h2>
                <div className="space-y-3">
                  {Object.entries(revenueByMethod).map(([method, data]) => (
                    <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div>
                        <p className="font-semibold text-white">{method}</p>
                        <p className="text-sm text-slate-400">{data.count} transactions</p>
                      </div>
                      <p className="text-xl font-black text-emerald-400">
                        {formatCurrency(data.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <h2 className="text-lg font-black text-white mb-6">Top 10 Products</h2>
                <div className="space-y-2 max-h-[350px] overflow-y-auto">
                  {topProducts.map((product, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white text-sm line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-400">{product.qty} units sold</p>
                      </div>
                      <p className="text-sm font-black text-emerald-400">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Sales Trend */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 mb-8">
              <h2 className="text-lg font-black text-white mb-6">Daily Sales Trend</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {dailyData.map((day) => {
                  const maxRevenue = Math.max(...dailyData.map((d) => d.total));
                  const percentage = (day.total / maxRevenue) * 100 || 0;
                  return (
                    <div key={day.date} className="flex items-center gap-4">
                      <span className="w-24 text-sm font-semibold text-slate-400">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex-1">
                        <div className="bg-white/5 rounded-full h-8 overflow-hidden relative">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full flex items-center justify-end pr-3 transition-all"
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage > 15 && (
                              <span className="text-xs font-bold text-white">
                                {formatCurrency(day.total)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="w-20 text-right text-sm font-semibold text-slate-300">
                        {day.count} sales
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales Table */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-left font-black text-slate-300">
                        Receipt #
                      </th>
                      <th className="px-6 py-4 text-left font-black text-slate-300">
                        Date & Time
                      </th>
                      <th className="px-6 py-4 text-center font-black text-slate-300">
                        Items
                      </th>
                      <th className="px-6 py-4 text-right font-black text-slate-300">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left font-black text-slate-300">
                        Method
                      </th>
                      <th className="px-6 py-4 text-left font-black text-slate-300">
                        Cashier
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.slice(0, 20).map((sale) => (
                      <tr
                        key={getSaleId(sale)}
                        className="border-b border-white/10 hover:bg-white/5 transition"
                      >
                        <td className="px-6 py-4 font-semibold text-white">
                          #{getSaleId(sale)}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {new Date(getSaleDateValue(sale) || Date.now()).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300">
                          {sale.saleDetails?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                          {formatCurrency(getSaleAmount(sale))}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          <span className="inline-flex items-center rounded-full border border-slate-400/30 bg-slate-500/20 px-2.5 py-0.5 text-xs font-semibold">
                            {getPaymentMethod(sale)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {sale.user?.fullName || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredSales.length > 20 && (
              <div className="text-center text-sm text-slate-400 mt-4">
                Showing 20 of {filteredSales.length} sales
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesReport;
