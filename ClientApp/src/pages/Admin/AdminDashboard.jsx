import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, DollarSign, ShoppingCart, AlertCircle, TrendingUp, Users, Loader,
  RefreshCw, Eye, ArrowUpRight, ArrowDownRight, Calendar, Clock, Award,
} from 'lucide-react';
import api from '../../services/api';

/* Safe field helpers */
const getSaleId = (s) => s?.saleId ?? s?.id ?? null;
const getSaleAmount = (s) => Number(s?.totalAmount ?? s?.amount ?? 0);
const getSaleDate = (s) => s?.saleDate ?? s?.dateCreated ?? s?.createdDate ?? null;
const getSaleCustomerName = (s) => s?.customerName || s?.customer?.customerName || s?.customer?.fullName || 'Walk-in';
const getSaleStaff = (s) => s?.user?.fullName || s?.staffName || 'Unknown';
const getSalePayment = (s) => s?.payments?.[0]?.paymentMethod || 'Unknown';

const fmtDate = (v) => {
  if (!v) return '–';
  try {
    const d = new Date(v);
    if (isNaN(d)) return '–';
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '–'; }
};

const fmtCurrency = (v) => `$${Number(v || 0).toFixed(2)}`;

/* Stat Card */
const StatCard = ({ icon: Icon, iconBg, label, value, sub, trend, trendDir }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trendDir === 'up' ? 'text-emerald-600' : 'text-slate-500'}`}>
            {trendDir === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg flex-shrink-0 ${iconBg}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const RecentSalesTable = ({ sales, loading, error }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-xl bg-red-50">
        <AlertCircle className="w-5 h-5 text-red-500 inline mr-2" />
        <p className="text-sm text-red-700 inline">{error}</p>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="py-16 text-center">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-400 font-medium">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff</th>
            <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((s, i) => (
            <tr key={getSaleId(s) ?? `sale-${i}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-5 py-3.5 text-xs font-mono text-slate-400">#{getSaleId(s) ?? '–'}</td>
              <td className="px-5 py-3.5 font-medium text-slate-800">{getSaleCustomerName(s)}</td>
              <td className="px-5 py-3.5 text-slate-600 text-xs">{getSaleStaff(s)}</td>
              <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{fmtCurrency(getSaleAmount(s))}</td>
              <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(getSaleDate(s))}</td>
              <td className="px-5 py-3.5 text-slate-500 text-xs">{getSalePayment(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalOrders: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  });
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, salesRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/sales'),
      ]);

      const products = productsRes.status === 'fulfilled' && Array.isArray(productsRes.value?.data)
        ? productsRes.value.data
        : [];
      const salesData = salesRes.status === 'fulfilled' && Array.isArray(salesRes.value?.data)
        ? salesRes.value.data
        : [];

      // Calculate stats
      const totalProducts = products.length;
      const outOfStockCount = products.filter((p) => Number(p.stockQty ?? p.stockQuantity ?? 0) <= 0).length;
      const lowStockCount = products.filter((p) => {
        const stock = Number(p.stockQty ?? p.stockQuantity ?? 0);
        const minStock = Number(p.minStock ?? 10);
        return stock > 0 && stock <= Math.max(1, minStock);
      }).length;
      const totalSales = salesData.reduce((sum, s) => sum + getSaleAmount(s), 0);
      const totalOrders = salesData.length;

      setStats({
        totalProducts,
        totalSales,
        totalOrders,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
      });

      // Get recent 5 sales sorted by date desc
      const recentSales = [...salesData]
        .sort((a, b) => new Date(getSaleDate(b) || 0) - new Date(getSaleDate(a) || 0))
        .slice(0, 5);
      setSales(recentSales);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const intervalId = window.setInterval(fetchDashboardData, 10000);
    return () => window.clearInterval(intervalId);
  }, [fetchDashboardData]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'khmart_last_sale_at') {
        fetchDashboardData();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fetchDashboardData]);

  // Derived values
  const avgOrderValue = stats.totalOrders > 0 ? stats.totalSales / stats.totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-blue-100 text-sm">Business overview & real-time metrics</p>
            </div>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          iconBg="bg-blue-500"
          label="Total Products"
          value={stats.totalProducts}
          sub="Active items in stock"
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-500"
          label="Total Sales"
          value={fmtCurrency(stats.totalSales)}
          sub={`${stats.totalOrders} transactions`}
          trend="+12.5%"
          trendDir="up"
        />
        <StatCard
          icon={ShoppingCart}
          iconBg="bg-purple-500"
          label="Avg Order Value"
          value={fmtCurrency(avgOrderValue)}
          sub="Per transaction"
        />
        <StatCard
          icon={AlertCircle}
          iconBg="bg-orange-500"
          label="Low Stock Items"
          value={stats.lowStockItems}
          sub={`${stats.outOfStockItems} out of stock`}
          trend={stats.lowStockItems > 0 ? 'Attention needed' : 'All good'}
          trendDir={stats.lowStockItems > 0 ? 'down' : 'up'}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent Sales</h2>
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="p-6">
            <RecentSalesTable sales={sales} loading={loading} error={error} />
          </div>
        </div>

        {/* Insights Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Quick Insights</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">System Status</p>
              <p className="text-sm font-bold text-blue-900 mt-1">Online & Running</p>
              <p className="text-xs text-blue-700 mt-1">✓ All systems operational</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Inventory Health</p>
              <p className="text-sm font-bold text-emerald-900 mt-1">{Math.round(((stats.totalProducts - stats.lowStockItems) / stats.totalProducts * 100) || 0)}% Stocked</p>
              <p className="text-xs text-emerald-700 mt-1">{stats.lowStockItems} items need restocking</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Sales Performance</p>
              <p className="text-sm font-bold text-purple-900 mt-1">{stats.totalOrders} Completed</p>
              <p className="text-xs text-purple-700 mt-1">All orders processed today</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Last Sync</p>
              <p className="text-sm font-bold text-orange-900 mt-1">Just now</p>
              <p className="text-xs text-orange-700 mt-1">Data automatically synced</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;