import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Loader,
  AlertCircle,
  CreditCard,
  Package,
} from 'lucide-react';
import api from '../../services/api';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';

const readStaffLanguage = () => {
  try {
    const raw = localStorage.getItem(STAFF_PREFERENCES_KEY);
    if (!raw) return 'en';
    const parsed = JSON.parse(raw);
    return parsed?.language === 'km' ? 'km' : 'en';
  } catch {
    return 'en';
  }
};

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    todaysSales: 0,
    salesCount: 0,
    totalCash: 0,
    avgSaleValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

  useEffect(() => {
    fetchStaffData();
  }, []);

  useEffect(() => {
    const syncLanguage = () => setStaffLanguage(readStaffLanguage());
    const onStorage = (event) => {
      if (event.key === STAFF_PREFERENCES_KEY) {
        syncLanguage();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncLanguage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncLanguage);
    };
  }, []);

  const fetchStaffData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/sales') || { data: [] };
      const salesData = response.data || [];

      // Get today's sales
      const today = new Date().toDateString();
      const todaysSales = salesData.filter(
        sale => new Date(sale.saleDate).toDateString() === today
      );

      const todayTotal = todaysSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
      const avgValue = todaysSales.length > 0 ? todayTotal / todaysSales.length : 0;

      setStats({
        todaysSales: todayTotal,
        salesCount: todaysSales.length,
        totalCash: todayTotal,
        avgSaleValue: avgValue,
      });

      setRecentTransactions(todaysSales.slice(0, 5));
    } catch (err) {
      console.error('Error fetching staff data:', err);
      setError(t('Failed to load dashboard data', 'មិនអាចទាញយកទិន្នន័យផ្ទាំងគ្រប់គ្រងបានទេ'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">{t('Welcome back! 👋', 'សូមស្វាគមន៍ត្រឡប់មកវិញ! 👋')}</h1>
        <p className="text-green-100">{t("Your point-of-sale dashboard for today's transactions", 'ផ្ទាំងចំណុចលក់សម្រាប់ប្រតិបត្តិការថ្ងៃនេះរបស់អ្នក')}</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          title={t("Today's Sales", 'ការលក់ថ្ងៃនេះ')}
          value={`$${stats.todaysSales.toFixed(2)}`}
          subtitle={t('Total revenue', 'ចំណូលសរុប')}
          color="green"
        />
        <StatCard
          icon={ShoppingCart}
          title={t('Total Transactions', 'ប្រតិបត្តិការសរុប')}
          value={stats.salesCount}
          subtitle={t('Completed sales', 'ការលក់បានបញ្ចប់')}
          color="blue"
        />
        <StatCard
          icon={CreditCard}
          title={t('Avg Sale Value', 'តម្លៃលក់មធ្យម')}
          value={`$${stats.avgSaleValue.toFixed(2)}`}
          subtitle={t('Per transaction', 'ក្នុងមួយប្រតិបត្តិការ')}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          title={t('Cash Collected', 'សាច់ប្រាក់ប្រមូលបាន')}
          value={`$${stats.totalCash.toFixed(2)}`}
          subtitle={t('Ready for deposit', 'រួចរាល់សម្រាប់ដាក់ប្រាក់')}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">{t("Today's Transactions", 'ប្រតិបត្តិការថ្ងៃនេះ')}</h2>
          </div>
          <div className="p-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            {recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t('No transactions yet today', 'មិនទាន់មានប្រតិបត្តិការនៅថ្ងៃនេះ')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {t('Customer', 'អតិថិជន')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {t('Items', 'មុខទំនិញ')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        {t('Amount', 'ចំនួនទឹកប្រាក់')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((transaction, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(transaction.saleDate).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {transaction.customerName || t('Walk-in', 'អតិថិជនដើរចូល')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(transaction.saleDetails?.length || 0)} {t('items', 'មុខទំនិញ')}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          ${(transaction.totalAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{t('Quick Actions', 'សកម្មភាពរហ័ស')}</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  {t('New Sale', 'ការលក់ថ្មី')}
                </div>
              </button>
              <button className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t('Check Stock', 'ពិនិត្យស្តុក')}
                </div>
              </button>
              <button className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('View Reports', 'មើលរបាយការណ៍')}
                </div>
              </button>
            </div>
          </div>

          {/* Shift Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t('Shift Info', 'ព័ត៌មានវេនការងារ')}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('Shift Status', 'ស្ថានភាពវេន')}</span>
                <span className="font-bold text-blue-600">{t('Active', 'កំពុងដំណើរការ')}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('Start Time', 'ម៉ោងចាប់ផ្តើម')}</span>
                <span className="font-bold text-green-600">
                  {new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-700">{t('Till Balance', 'សមតុល្យទូទាត់')}</span>
                <span className="font-bold text-orange-600">$0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchStaffData}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
        {t('Refresh Dashboard', 'ធ្វើបច្ចុប្បន្នភាពផ្ទាំងគ្រប់គ្រង')}
      </button>
    </div>
  );
};

export default StaffDashboard;