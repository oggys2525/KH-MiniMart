import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Loader, Package, Save, Search, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';

const initialForm = {
  productId: '',
  stockQty: 0,
  minStock: 5,
  status: true,
};

const ManageStock = () => {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stockRes, productRes] = await Promise.all([api.get('/stock'), api.get('/products')]);
      setRows(stockRes.data || []);
      setProducts(productRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const intervalId = window.setInterval(() => {
      fetchData();
    }, 10000);

    const onStorage = (event) => {
      if (event.key === 'khmart_last_sale_at') {
        fetchData();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchData]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        productId: parseInt(form.productId, 10),
        stockQty: parseInt(form.stockQty, 10),
        minStock: parseInt(form.minStock, 10),
        status: Boolean(form.status),
      };

      if (!payload.productId) {
        setError('Product is required.');
        setSaving(false);
        return;
      }

      if (editingId) {
        await api.put(`/stock/${editingId}`, payload);
      } else {
        await api.post('/stock', payload);
      }

      setForm(initialForm);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save stock.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.productId);
    setForm({
      productId: row.productId,
      stockQty: row.stockQty,
      minStock: row.minStock,
      status: row.status,
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Set this product stock to 0?')) return;
    try {
      await api.delete(`/stock/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete stock item.');
    }
  };

  const productImageMap = useMemo(
    () => new Map(products.map((product) => [product.productId, toAbsoluteImageUrl(product.imageUrl)])),
    [products],
  );

  const filteredRows = rows.filter((row) => {
    const q = search.toLowerCase();
    return !q || (row.productName || '').toLowerCase().includes(q) || (row.categoryName || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Manage Stock</h2>
      </div>

      {error && <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by product or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={form.productId}
          onChange={(e) => setForm({ ...form, productId: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          required
          disabled={Boolean(editingId)}
        >
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>{p.productName}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={form.stockQty}
          onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Stock Qty"
          required
        />
        <input
          type="number"
          min="0"
          value={form.minStock}
          onChange={(e) => setForm({ ...form, minStock: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Min Stock"
          required
        />
        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.status)}
            onChange={(e) => setForm({ ...form, status: e.target.checked })}
          />
          Active
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            <Save className="w-4 h-4" />
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="py-10 flex items-center justify-center"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Min</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.productId} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {productImageMap.get(row.productId) ? (
                        <img
                          src={productImageMap.get(row.productId)}
                          alt={row.productName || 'Product'}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Package className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.productName}</td>
                  <td className="px-4 py-3 text-gray-600">{row.categoryName || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{row.stockQty}</td>
                  <td className="px-4 py-3 text-right">{row.minStock}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.stockQty <= row.minStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {row.stockQty <= row.minStock ? 'Low' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit(row)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(row.productId)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                    <div className="inline-flex items-center gap-2"><Package className="w-4 h-4" /> No stock records</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManageStock;
