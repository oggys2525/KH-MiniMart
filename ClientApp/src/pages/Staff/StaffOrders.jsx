import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Search, Loader, AlertCircle, Eye, Filter, RotateCcw, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import PrintReceiptModal from '../../components/PrintReceiptModal';

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

const getSaleId       = (s) => s?.saleId ?? s?.id;
const getSaleDate     = (s) => s?.saleDate ?? s?.dateCreated ?? s?.createdDate ?? null;
const getSaleAmount   = (s) => Number(s?.totalAmount ?? s?.amount ?? 0);
const getSalePayment  = (s) => s?.payments?.[0]?.paymentMethod || s?.paymentMethod || '–';
const getSaleStatus   = (s) => s?.status || 'Completed';
const getSaleStaff    = (s) => s?.user?.fullName || s?.staffName || '–';
const getSaleCustomer = (s) => s?.customerName || 'Walk-in';

const formatDate = (dateStr) => {
  if (!dateStr) return '–';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '–';
    return d.toLocaleString('en-GB');
  } catch { return '–'; }
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'completed') return 'bg-green-100 text-green-700';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-600';
  return 'bg-blue-100 text-blue-700';
};

const StaffOrders = () => {
  const [orders, setOrders]         = useState([]);
  const [search, setSearch]         = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/sales');
      setOrders(res.data || []);
    } catch {
      setError(t('Failed to load orders. Please try again.', 'មិនអាចទាញយកការបញ្ជាទិញបានទេ។ សូមព្យាយាមម្តងទៀត។'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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

  const paymentMethods = [
    ...new Set(orders.map(getSalePayment).filter(m => m && m !== '–'))
  ].sort();

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch =
      String(getSaleId(o) || '').includes(q) ||
      getSaleCustomer(o).toLowerCase().includes(q) ||
      getSaleStaff(o).toLowerCase().includes(q);
    const matchMethod = filterMethod === 'all' || getSalePayment(o) === filterMethod;
    const matchStatus = filterStatus === 'all' || getSaleStatus(o).toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchMethod && matchStatus;
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowPrintModal(true);
  };

  const handleClearFilters = () => {
    setSearch('');
    setFilterMethod('all');
    setFilterStatus('all');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Orders</h1>
              <p className="text-blue-100 text-sm">{t('View and print all sales transactions', 'មើល និងបោះពុម្ពប្រតិបត្តិការលក់ទាំងអស់')}</p>
            </div>
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> {t('Refresh', 'ធ្វើបច្ចុប្បន្នភាព')}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <label className="block mb-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('Search', 'ស្វែងរក')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Order ID, customer or staff...', 'លេខបញ្ជាទិញ អតិថិជន ឬបុគ្គលិក...')}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block mb-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('Payment', 'ការទូទាត់')}</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={filterMethod}
                onChange={e => setFilterMethod(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="all">{t('All Methods', 'គ្រប់វិធី')}</option>
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{t('Status', 'ស្ថានភាព')}</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="all">{t('All Status', 'គ្រប់ស្ថានភាព')}</option>
              <option value="Completed">{t('Completed', 'បានបញ្ចប់')}</option>
              <option value="Paid">{t('Paid', 'បានបង់')}</option>
              <option value="Pending">{t('Pending', 'កំពុងរង់ចាំ')}</option>
              <option value="Cancelled">{t('Cancelled', 'បានបោះបង់')}</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
                <RotateCcw className="w-4 h-4" /> {t('Reset', 'កំណត់ឡើងវិញ')}
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['#', t('Date', 'កាលបរិច្ឆេទ'), t('Customer', 'អតិថិជន'), t('Staff', 'បុគ្គលិក'), t('Amount', 'ចំនួនទឹកប្រាក់'), t('Payment', 'ការទូទាត់'), t('Status', 'ស្ថានភាព'), ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-slate-400">{t('No orders found', 'រកមិនឃើញការបញ្ជាទិញ')}</td></tr>
                ) : filtered.map((o) => (
                  <tr key={getSaleId(o)} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">#{getSaleId(o)}</td>
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">{formatDate(getSaleDate(o))}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{getSaleCustomer(o)}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{getSaleStaff(o)}</td>
                    <td className="px-5 py-3 font-bold text-slate-800">{formatCurrency(getSaleAmount(o))}</td>
                    <td className="px-5 py-3 text-slate-600">{getSalePayment(o)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(getSaleStatus(o))}`}>
                        {getSaleStatus(o)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleViewOrder(o)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                        title={t('View & Print', 'មើល និងបោះពុម្ព')}
                      ><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
            {t('Showing', 'កំពុងបង្ហាញ')} <span className="font-semibold text-slate-700">{filtered.length}</span> {t('of', 'នៃ')} <span className="font-semibold text-slate-700">{orders.length}</span> {t('orders', 'ការបញ្ជាទិញ')}
          </div>
        )}
      </div>

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

export default StaffOrders;
