import React, { useCallback, useEffect, useState } from 'react';
import { Loader, Plus, Save, Search, Trash2, AlertCircle, RefreshCw, Inbox, X } from 'lucide-react';
import api from '../../services/api';

const emptyItem = { productId: '', quantity: 1, price: 0 };

const StockIns = () => {
  const [rows, setRows] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    stockInDate: new Date().toISOString().slice(0, 10),
    items: [emptyItem],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stockInRes, supplierRes, productRes] = await Promise.all([
        api.get('/stockins'),
        api.get('/suppliers'),
        api.get('/products'),
      ]);
      setRows(stockInRes.data || []);
      setSuppliers(supplierRes.data || []);
      setProducts(productRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock-ins.');
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
      supplierId: '',
      stockInDate: new Date().toISOString().slice(0, 10),
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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        supplierId: parseInt(form.supplierId, 10),
        stockInDate: form.stockInDate,
        items: form.items.map((i) => ({
          productId: parseInt(i.productId, 10),
          quantity: parseInt(i.quantity, 10),
          price: parseFloat(i.price),
        })),
      };

      if (editingId) {
        await api.put(`/stockins/${editingId}`, payload);
      } else {
        await api.post('/stockins', payload);
      }

      closeModal();
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save stock-in.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.stockInId);
    setForm({
      supplierId: row.supplierId,
      stockInDate: new Date(row.stockInDate).toISOString().slice(0, 10),
      items: (row.stockInDetails || []).map((d) => ({
        productId: d.productId,
        quantity: d.quantity,
        price: d.price,
      })),
    });
    setShowModal(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this stock-in record?')) return;
    try {
      await api.delete(`/stockins/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete stock-in.');
    }
  };

  const cancelEdit = () => {
    closeModal();
  };

  const filteredRows = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || (r.supplier?.supplierName || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold">Stock In Management</h1>
              <p className="text-blue-100 text-sm">Create & manage incoming inventory from suppliers</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Stock In
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

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-400 font-medium">No stock-in records found</p>
            <p className="text-slate-400 text-sm">Click "Add Stock In" button to create a new record</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Qty</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r, i) => {
                  const details = r.stockInDetails || [];
                  const totalQty = details.reduce((sum, d) => sum + d.quantity, 0);
                  return (
                    <tr key={r.stockInId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">#{i + 1}</td>
                      <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">{new Date(r.stockInDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{r.supplier?.supplierName || '–'}</td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{details.length}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-800">{totalQty}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => onEdit(r)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(r.stockInId)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredRows.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 text-xs text-slate-500">
            Showing <span className="font-bold text-slate-700">{filteredRows.length}</span> of <span className="font-bold text-slate-700">{rows.length}</span> stock-in records
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
                {editingId ? 'Edit Stock In' : 'Create New Stock In'}
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
              {/* Supplier & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Supplier</label>
                  <select
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((s) => <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Stock In Date</label>
                  <input
                    type="date"
                    value={form.stockInDate}
                    onChange={(e) => setForm({ ...form, stockInDate: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                      required
                      className="sm:col-span-6 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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
                      required
                      className="sm:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => changeItem(idx, 'price', e.target.value)}
                      placeholder="Price"
                      required
                      className="sm:col-span-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
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
                  {editingId ? 'Update Stock In' : 'Create Stock In'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIns;
