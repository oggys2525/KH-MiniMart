import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Loader, AlertCircle, DollarSign, ShoppingCart, Calendar,
  Download, RefreshCw, Users, CreditCard, Award, Filter, RotateCcw,
  ChevronUp, ChevronDown, Eye,
} from 'lucide-react';
import api from '../../services/api';
import PrintReceiptModal from '../../components/PrintReceiptModal';

/* --- Persistence --------------------------------------------------------- */
const FILTERS_KEY = 'khmart_admin_sales_reports_filters';

const readSavedFilters = () => {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/* --- Safe field helpers -------------------------------------------------- */
const getSaleDate    = (s) => s?.saleDate ?? s?.dateCreated ?? s?.createdDate ?? null;
const getSaleAmount  = (s) => Number(s?.totalAmount ?? s?.amount ?? 0);
const getSaleId      = (s) => s?.saleId ?? s?.id;
const getSalePayment = (s) => s?.payments?.[0]?.paymentMethod || s?.paymentMethod || 'Unknown';
const getSaleStaff   = (s) => s?.user?.fullName || s?.staffName || 'Unknown';
const getSaleUserId  = (s) => s?.userId ?? s?.user?.userId ?? null;
const getSaleCustomer= (s) => s?.customerName || 'Walk-in';

const toDateKey = (v) => {
  const d = new Date(v);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const fmt = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(v || 0));

const fmtDate = (v) => {
  if (!v) return '--';
  try { const d = new Date(v); return isNaN(d) ? '--' : d.toLocaleString('en-GB'); }
  catch { return '--'; }
};

/* --- Preset helpers ------------------------------------------------------- */
const today       = () => new Date().toISOString().split('T')[0];
const daysAgo     = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; };
const startOfMonth= () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const startOfYear = () => `${new Date().getFullYear()}-01-01`;

const PRESETS = [
  { label: 'Today',       start: () => today(),        end: () => today() },
  { label: 'Last 7 Days', start: () => daysAgo(6),     end: () => today() },
  { label: 'This Month',  start: () => startOfMonth(), end: () => today() },
  { label: 'Last 30 Days',start: () => daysAgo(29),    end: () => today() },
  { label: 'This Year',   start: () => startOfYear(),  end: () => today() },
];

/* --- Small bar badge ----------------------------------------------------- */
const Badge = ({ value, max }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
};

/* --- Stat card ------------------------------------------------------------ */
const StatCard = ({ icon: Icon, iconClass, label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${iconClass}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ========================================================================= */
const SalesReports = () => {
  const saved = readSavedFilters();
  const [sales, setSales]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [startDate, setStartDate]     = useState(saved?.startDate || daysAgo(29));
  const [endDate, setEndDate]         = useState(saved?.endDate   || today());
  const [filterMethod, setFilterMethod] = useState(saved?.filterMethod || 'all');
  const [filterStaff,  setFilterStaff]  = useState(saved?.filterStaff  || 'all');
  const [activeTab, setActiveTab]     = useState('overview');
  const [activePreset, setActivePreset] = useState(saved?.activePreset ?? 3);
  const [sortField, setSortField]     = useState('date');
  const [sortDir,   setSortDir]       = useState('desc');
  const [selectedOrder, setSelectedOrder]   = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  /* fetch */
  const fetchSales = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get('/sales');
      const payload = res?.data;
      setSales(Array.isArray(payload) ? payload : (payload?.items || []));
    } catch {
      setError('Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  /* persist */
  useEffect(() => {
    localStorage.setItem(FILTERS_KEY, JSON.stringify({ startDate, endDate, filterMethod, filterStaff, activePreset }));
  }, [startDate, endDate, filterMethod, filterStaff, activePreset]);

  /* preset */
  const applyPreset = (idx) => { const p = PRESETS[idx]; setStartDate(p.start()); setEndDate(p.end()); setActivePreset(idx); };
  const clearFilters = () => { applyPreset(3); setFilterMethod('all'); setFilterStaff('all'); };

  /* filter */
  const filteredSales = useMemo(() => sales.filter(s => {
    const dk = toDateKey(getSaleDate(s));
    if (!dk) return false;
    return dk >= startDate && dk <= endDate
      && (filterMethod === 'all' || getSalePayment(s) === filterMethod)
      && (filterStaff  === 'all' || String(getSaleUserId(s)) === filterStaff);
  }), [sales, startDate, endDate, filterMethod, filterStaff]);

  /* derived */
  const totalRevenue = useMemo(() => filteredSales.reduce((a,s) => a + getSaleAmount(s), 0), [filteredSales]);
  const avgOrder     = filteredSales.length ? totalRevenue / filteredSales.length : 0;

  const paymentBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const m = getSalePayment(s);
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count++; map[m].total += getSaleAmount(s);
    });
    return Object.entries(map).sort((a,b) => b[1].total - a[1].total);
  }, [filteredSales]);

  const staffBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const uid = String(getSaleUserId(s) ?? 'unknown');
      if (!map[uid]) map[uid] = { uid, name: getSaleStaff(s), count: 0, total: 0 };
      map[uid].count++; map[uid].total += getSaleAmount(s);
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [filteredSales]);

  const topStaff = staffBreakdown[0];

  const dailyBreakdown = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const dk = toDateKey(getSaleDate(s)); if (!dk) return;
      if (!map[dk]) map[dk] = { date: dk, count: 0, total: 0 };
      map[dk].count++; map[dk].total += getSaleAmount(s);
    });
    return Object.values(map).sort((a,b) => b.date.localeCompare(a.date));
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      (s.saleDetails || []).forEach(d => {
        const name = d.product?.productName || 'Unknown';
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty     += d.quantity || 0;
        map[name].revenue += (d.quantity || 0) * (d.price || 0);
      });
    });
    return Object.values(map).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  const paymentMethods = useMemo(() =>
    [...new Set(sales.map(getSalePayment).filter(m => m && m !== 'Unknown'))].sort()
  , [sales]);

  const staffList = useMemo(() => {
    const map = {};
    sales.forEach(s => { const uid = String(getSaleUserId(s) ?? 'unknown'); if (!map[uid]) map[uid] = { uid, name: getSaleStaff(s) }; });
    return Object.values(map).sort((a,b) => a.name.localeCompare(b.name));
  }, [sales]);

  const sortedTx = useMemo(() => {
    return [...filteredSales].sort((a,b) => {
      let va, vb;
      if      (sortField === 'date')   { va = getSaleDate(a)||'';  vb = getSaleDate(b)||''; }
      else if (sortField === 'amount') { va = getSaleAmount(a);    vb = getSaleAmount(b); }
      else if (sortField === 'id')     { va = getSaleId(a)||0;     vb = getSaleId(b)||0; }
      else                             { va = getSaleStaff(a);     vb = getSaleStaff(b); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [filteredSales, sortField, sortDir]);

  const toggleSort = (f) => { if (sortField === f) setSortDir(d => d==='asc'?'desc':'asc'); else { setSortField(f); setSortDir('asc'); } };

  const exportCSV = () => {
    const headers = ['Sale #','Date','Customer','Staff','Items','Total','Payment'];
    const rows = sortedTx.map(s => [getSaleId(s), fmtDate(getSaleDate(s)), getSaleCustomer(s), getSaleStaff(s), s.saleDetails?.length||0, getSaleAmount(s).toFixed(2), getSalePayment(s)]);
    const csv = [headers,...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `Sales-Report-${startDate}-to-${endDate}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const SortIcon = ({ field }) => sortField === field
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
    : null;

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'staff',        label: `Staff (${staffBreakdown.length})` },
    { id: 'transactions', label: `Transactions (${filteredSales.length})` },
    { id: 'products',     label: 'Top Products' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Sales Reports</h1>
              <p className="text-blue-100 text-sm">Revenue analytics, staff performance and trends</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchSales}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => applyPreset(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activePreset === i ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setActivePreset(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activePreset === null ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Custom
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActivePreset(null); }}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActivePreset(null); }}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Staff</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="all">All Staff</option>
                {staffList.map(st => <option key={st.uid} value={st.uid}>{st.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Payment</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                <option value="all">All Methods</option>
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <button onClick={clearFilters}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}   iconClass="bg-emerald-50 text-emerald-600"
          label="Total Revenue"      value={fmt(totalRevenue)}
          sub={`${filteredSales.length} transactions`} />
        <StatCard icon={ShoppingCart} iconClass="bg-blue-50 text-blue-600"
          label="Total Transactions" value={filteredSales.length}
          sub={`${startDate} to ${endDate}`} />
        <StatCard icon={TrendingUp}   iconClass="bg-orange-50 text-orange-600"
          label="Avg per Transaction" value={fmt(avgOrder)}
          sub="Based on filtered range" />
        <StatCard icon={Award}        iconClass="bg-purple-50 text-purple-600"
          label="Top Staff"          value={topStaff?.name || '--'}
          sub={topStaff ? `${fmt(topStaff.total)} -- ${topStaff.count} sales` : 'No data'} />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === t.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sales found for the selected period</p>
          </div>
        ) : (
          <div className="p-5">

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Daily Breakdown</h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-y-auto max-h-80">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Sales</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Avg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dailyBreakdown.map(d => (
                            <tr key={d.date} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 font-medium text-slate-700">{d.date}</td>
                              <td className="px-4 py-2.5 text-right text-slate-600">{d.count}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{fmt(d.total)}</td>
                              <td className="px-4 py-2.5 text-right text-slate-500">{fmt(d.total / d.count)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Payment Methods</h3>
                  <div className="space-y-3">
                    {paymentBreakdown.map(([method, data]) => {
                      const pct = totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0;
                      return (
                        <div key={method} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold text-slate-700 text-sm">{method}</span>
                            </div>
                            <span className="font-bold text-slate-900">{fmt(data.total)}</span>
                          </div>
                          <Badge value={data.total} max={totalRevenue} />
                          <p className="text-xs text-slate-400 mt-1">{data.count} transactions -- {pct.toFixed(1)}% of revenue</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Staff tab */}
            {activeTab === 'staff' && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rank</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Staff</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Sales</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Avg/Sale</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffBreakdown.map((st, i) => (
                      <tr key={st.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          {i === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700">
                              <Award className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">#{i+1}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(st.name||'?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">{st.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right text-slate-600">{st.count}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-emerald-600">{fmt(st.total)}</td>
                        <td className="px-5 py-3.5 text-right text-slate-500">{fmt(st.total / st.count)}</td>
                        <td className="px-5 py-3.5 w-32"><Badge value={st.total} max={totalRevenue} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Transactions tab */}
            {activeTab === 'transactions' && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('id')}># <SortIcon field="id" /></th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('date')}>Date <SortIcon field="date" /></th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('staff')}>Staff <SortIcon field="staff" /></th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('amount')}>Amount <SortIcon field="amount" /></th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Payment</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedTx.map(s => (
                        <tr key={getSaleId(s)} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">#{getSaleId(s)}</td>
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap text-xs">{fmtDate(getSaleDate(s))}</td>
                          <td className="px-5 py-3 text-slate-700">{getSaleCustomer(s)}</td>
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {getSaleStaff(s).charAt(0).toUpperCase()}
                              </span>
                              <span className="text-slate-700 text-xs">{getSaleStaff(s)}</span>
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-slate-800">{fmt(getSaleAmount(s))}</td>
                          <td className="px-5 py-3 text-slate-600 text-xs">{getSalePayment(s)}</td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => { setSelectedOrder(s); setShowPrintModal(true); }}
                              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="View receipt">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
                  {filteredSales.length} transactions -- Total: <span className="font-bold text-slate-700">{fmt(totalRevenue)}</span>
                </div>
              </div>
            )}

            {/* Products tab */}
            {activeTab === 'products' && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {topProducts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">No product data found for this period</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rank</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Units Sold</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-40">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topProducts.map((p, i) => (
                        <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-slate-400">#{i+1}</td>
                          <td className="px-5 py-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{p.qty}</td>
                          <td className="px-5 py-3 text-right font-bold text-emerald-600">{fmt(p.revenue)}</td>
                          <td className="px-5 py-3 w-40"><Badge value={p.revenue} max={topProducts[0]?.revenue || 1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print modal */}
      {selectedOrder && (
        <PrintReceiptModal
          isOpen={showPrintModal}
          onClose={() => { setShowPrintModal(false); setSelectedOrder(null); }}
          sale={selectedOrder}
        />
      )}
    </div>
  );
};

export default SalesReports;
