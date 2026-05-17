import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Calendar, Loader, AlertCircle } from 'lucide-react';
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

const getSaleDate = (sale) => {
  const rawDate = sale?.saleDate || sale?.dateCreated || sale?.createdAt;
  const parsed = rawDate ? new Date(rawDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const getSaleAmount = (sale) => Number(sale?.totalAmount ?? sale?.amount ?? 0);

const StaffReports = () => {
  const [sales, setSales]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [range, setRange]     = useState('today');
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

  useEffect(() => {
    api.get('/sales')
      .then(r => setSales(r.data || []))
      .catch(() => setError(t('Failed to load reports', 'មិនអាចទាញយករបាយការណ៍បានទេ')))
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

  const now  = new Date();
  const filter = (s) => {
    const d = getSaleDate(s);
    if (!d) return false;
    if (range === 'today') return d.toDateString() === now.toDateString();
    if (range === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - 7);
      return d >= start;
    }
    if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = sales
    .filter(filter)
    .sort((a, b) => {
      const dateA = getSaleDate(a)?.getTime() || 0;
      const dateB = getSaleDate(b)?.getTime() || 0;
      return dateB - dateA;
    });
  const total   = filtered.reduce((a, s) => a + getSaleAmount(s), 0);
  const avgOrder = filtered.length > 0 ? total / filtered.length : 0;

  // Group by day for mini chart
  const byDay = {};
  filtered.forEach(s => {
    const saleDate = getSaleDate(s);
    if (!saleDate) return;
    const day = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    byDay[day] = (byDay[day] || 0) + getSaleAmount(s);
  });
  const chartData = Object.entries(byDay).slice(-7);
  const maxVal = Math.max(...chartData.map(([,v]) => v), 1);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-orange-100 text-sm">{t('Sales performance overview', 'ទិដ្ឋភាពទូទៅនៃលទ្ធផលការលក់')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Range Filter */}
      <div className="flex gap-2">
        {[
          ['today', t('Today', 'ថ្ងៃនេះ')],
          ['week', t('7 Days', '៧ ថ្ងៃ')],
          ['month', t('This Month', 'ខែនេះ')],
          ['all', t('All Time', 'គ្រប់ពេល')],
        ].map(([k,l]) => (
          <button
            key={k} onClick={() => setRange(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2
              ${range === k ? 'bg-orange-500 text-white border-orange-500 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}`}
          >
            <Calendar className="w-3.5 h-3.5" />{l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader className="w-8 h-8 text-orange-500 animate-spin" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: t('Total Revenue', 'ចំណូលសរុប'),   value: `$${total.toFixed(2)}`,        icon: DollarSign,  color: 'text-emerald-600 bg-emerald-50' },
              { label: t('Total Orders', 'ការបញ្ជាទិញសរុប'),    value: filtered.length,                icon: ShoppingCart, color: 'text-blue-600 bg-blue-50'    },
              { label: t('Avg Order Value', 'តម្លៃមធ្យមក្នុងមួយបញ្ជាទិញ'), value: `$${avgOrder.toFixed(2)}`,      icon: TrendingUp,  color: 'text-purple-600 bg-purple-50' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
                  <p className="text-xs text-slate-400 font-medium">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-800">{t('Revenue by Day', 'ចំណូលតាមថ្ងៃ')}</h2>
                <p className="text-xs text-slate-500 mt-1">{t('Last', 'រយៈពេល')} {chartData.length || 0} {t('day(s) in selected range', 'ថ្ងៃ ក្នុងជួរពេលដែលបានជ្រើស')}</p>
              </div>
              {chartData.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                  {t('Peak', 'ខ្ពស់បំផុត')}: ${maxVal.toFixed(2)}
                </div>
              )}
            </div>

            {chartData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
                {t('No revenue data in this date range', 'មិនមានទិន្នន័យចំណូលក្នុងជួរកាលបរិច្ឆេទនេះទេ')}
              </div>
            ) : (
              <div className="rounded-xl bg-gradient-to-b from-amber-50 to-white p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {chartData.map(([day, val]) => (
                    <div key={day} className="rounded-lg border border-amber-100 bg-white/80 px-3 py-3">
                      <div className="mb-2 text-center text-[11px] font-semibold text-slate-500">{day}</div>
                      <div className="mx-auto flex h-28 w-8 items-end">
                        <div className="w-full rounded-full bg-amber-100 p-[2px]">
                          <div
                            className="w-full rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 transition-all duration-500"
                            style={{ height: `${Math.max((val / maxVal) * 96, 6)}px` }}
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-center text-xs font-bold text-slate-700">${val.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{t('Recent Transactions', 'ប្រតិបត្តិការថ្មីៗ')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['#', t('Date', 'កាលបរិច្ឆេទ'), t('Customer', 'អតិថិជន'), t('Amount', 'ចំនួនទឹកប្រាក់')].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.slice(0, 10).map((s, i) => (
                    <tr key={s.saleId || i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">#{s.saleId || i+1}</td>
                      <td className="px-5 py-3 text-slate-600">{getSaleDate(s)?.toLocaleDateString() || '-'}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{s.customerName || t('Walk-in', 'អតិថិជនដើរចូល')}</td>
                      <td className="px-5 py-3 font-bold text-emerald-600">${getSaleAmount(s).toFixed(2)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="py-12 text-center text-slate-400">{t('No data for this period', 'មិនមានទិន្នន័យសម្រាប់រយៈពេលនេះ')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffReports;
