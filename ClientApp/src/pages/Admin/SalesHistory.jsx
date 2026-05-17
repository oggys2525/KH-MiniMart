import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader, Plus, Save, Trash2, X, RefreshCw, AlertCircle, ShoppingCart } from 'lucide-react';
import api from '../../services/api';

const emptyItem = { productId: '', quantity: 1, price: 0 };

const SalesHistory = () => {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    userId: Number(localStorage.getItem('userId')) || 1,
    customerId: '',
    saleDate: new Date().toISOString().slice(0, 10),
    items: [emptyItem],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, productRes, customerRes] = await Promise.all([
        api.get('/sales'),
        api.get('/products'),
        api.get('/customers'),
      ]);
      setRows(salesRes.data || []);
      setProducts(productRes.data || []);
      setCustomers(customerRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNewModal = () => {
    setEditingId(null);
    setForm({
      userId: Number(localStorage.getItem('userId')) || 1,
      customerId: '',
      saleDate: new Date().toISOString().slice(0, 10),
      items: [emptyItem],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError('');
  };

  const changeItem = (idx, key, value) => {
    const copy = [...form.items];
    copy[idx] = { ...copy[idx], [key]: value };
    setForm({ ...form, items: copy });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const computedTotal = useMemo(
    () => form.items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0),
    [form.items]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        userId: Number(form.userId) || 1,
        customerId: form.customerId ? Number(form.customerId) : null,
        saleDate: form.saleDate,
        items: form.items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          price: Number(i.price),
        })),
      };

      if (editingId) {
        await api.put(`/sales/${editingId}`, payload);
      } else {
        await api.post('/sales', payload);
      }

      closeModal();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save sale.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.saleId);
    setForm({
      userId: row.userId,
      customerId: row.customerId || '',
      saleDate: new Date(row.saleDate).toISOString().slice(0, 10),
      items: (row.saleDetails || []).map((d) => ({ productId: d.productId, quantity: d.quantity, price: d.price })),
    });
    setShowModal(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this sale? Stock will be restored.')) return;
    try {
      await api.delete(`/sales/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete sale.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Sales History</h1>
              <p className="text-blue-100 text-sm">View & manage all sales transactions</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Sale
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-medium">No sales found</p>
            <p className="text-slate-400 text-sm">Click "Add Sale" button to create a new sale</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={r.saleId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">#{i + 1}</td>
                    <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">{new Date(r.saleDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{r.customer?.customerName || 'Walk-in'}</td>
                    <td className="px-5 py-3.5 text-center text-slate-600">{(r.saleDetails || []).length}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800">${Number(r.totalAmount || 0).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => onEdit(r)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(r.saleId)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 text-xs text-slate-500">
            Showing <span className="font-bold text-slate-700">{rows.length}</span> sales
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          {/* Modal Card */}
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Sale' : 'Create New Sale'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              {/* User & Customer & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Staff ID</label>
                  <input
                    type="number"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Customer</label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">Walk-in customer</option>
                    {customers.map((c) => <option key={c.customerId} value={c.customerId}>{c.customerName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Sale Date</label>
                  <input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Items ({form.items.length})</label>
                </div>

                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <select
                      value={item.productId}
                      onChange={(e) => changeItem(idx, 'productId', e.target.value)}
                      className="sm:col-span-6 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      required
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => <option key={p.productId} value={p.productId}>{p.productName}</option>)}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => changeItem(idx, 'quantity', e.target.value)}
                      placeholder="Quantity"
                      className="sm:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => changeItem(idx, 'price', e.target.value)}
                      placeholder="Price"
                      className="sm:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                      className="sm:col-span-2 px-3 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* Total & Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-semibold text-slate-600">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">${computedTotal.toFixed(2)}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Update Sale' : 'Create Sale'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
