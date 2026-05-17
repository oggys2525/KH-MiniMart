import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, DollarSign, Users, Package, TrendingUp,
  ArrowUpRight, ArrowDownRight, Loader, AlertCircle, Activity,
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

const KpiCard = ({ title, value, icon: Icon, change, color }) => {
  const colors = {
    green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600'  },
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600'   },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-500', text: 'text-orange-600' },
  };
  const c = colors[color] || colors.blue;
  const positive = change >= 0;
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${c.icon} w-10 h-10 rounded-xl flex items-center justify-center shadow`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(change)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className={`text-sm font-medium mt-1 ${c.text}`}>{title}</p>
    </div>
  );
};

const StaffOverview = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

  useEffect(() => {
    api.get('/sales')
      .then(r => setSales(r.data || []))
      .catch(() => setError(t('Failed to load data', 'មិនអាចទាញយកទិន្នន័យបានទេ')))
      .finally(() => setLoading(false));
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

  const today = new Date().toDateString();
  const todaySales  = sales.filter(s => new Date(s.saleDate).toDateString() === today);
  const todayTotal  = todaySales.reduce((a, s) => a + (s.totalAmount || 0), 0);
  const todayOrders = todaySales.length;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{t('Overview', 'ទិដ្ឋភាពទូទៅ')}</h1>
        </div>
        <p className="text-emerald-100 text-sm">{t("A quick summary of today's operations", 'សង្ខេបរហ័សនៃប្រតិបត្តិការថ្ងៃនេះ')}</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t("Today's Revenue", 'ចំណូលថ្ងៃនេះ')}    value={`$${todayTotal.toFixed(2)}`}  icon={DollarSign}  change={12}  color="green"  />
        <KpiCard title={t('Orders Today', 'ការបញ្ជាទិញថ្ងៃនេះ')}       value={todayOrders}                  icon={ShoppingCart} change={5}  color="blue"   />
        <KpiCard title={t('Total Orders', 'ការបញ្ជាទិញសរុប')}       value={sales.length}                 icon={TrendingUp}  change={8}   color="purple" />
        <KpiCard title={t('Avg Order Value', 'តម្លៃមធ្យមក្នុងមួយការបញ្ជាទិញ')}    value={todayOrders > 0 ? `$${(todayTotal/todayOrders).toFixed(2)}` : '$0.00'} icon={Package} change={-2} color="orange" />
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{t('Recent Sales', 'ការលក់ថ្មីៗ')}</h2>
          <span className="text-xs text-slate-400">{todayOrders} {t('transactions today', 'ប្រតិបត្តិការថ្ងៃនេះ')}</span>
        </div>
        {todaySales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">{t('No sales today yet', 'មិនទាន់មានការលក់នៅថ្ងៃនេះ')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[ '#', t('Time', 'ម៉ោង'), t('Customer', 'អតិថិជន'), t('Amount', 'ចំនួនទឹកប្រាក់'), t('Status', 'ស្ថានភាព') ].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaySales.slice(0, 8).map((s, i) => (
                  <tr key={s.saleId || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">#{s.saleId || i+1}</td>
                    <td className="px-5 py-3 text-slate-600">{new Date(s.saleDate).toLocaleTimeString()}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{s.customerName || t('Walk-in', 'អតិថិជនដើរចូល')}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">${(s.totalAmount||0).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">{t('Paid', 'បានបង់')}</span>
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

export default StaffOverview;
