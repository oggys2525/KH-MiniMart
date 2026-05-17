import React, { useCallback, useEffect, useState } from 'react';
import { Loader, Save, Trash2 } from 'lucide-react';
import api from '../../services/api';

const initialForm = {
  saleId: '',
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
};

const Payments = () => {
  const [rows, setRows] = useState([]);
  const [sales, setSales] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [paymentRes, salesRes] = await Promise.all([api.get('/payments'), api.get('/sales')]);
      setRows(paymentRes.data || []);
      setSales(salesRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        saleId: Number(form.saleId),
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
      };

      if (editingId) {
        await api.put(`/payments/${editingId}`, payload);
      } else {
        await api.post('/payments', payload);
      }

      setEditingId(null);
      setForm(initialForm);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.paymentId);
    setForm({
      saleId: row.saleId,
      amount: row.amount,
      paymentDate: new Date(row.paymentDate).toISOString().slice(0, 10),
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this payment?')) return;
    try {
      await api.delete(`/payments/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete payment.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
      {error && <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select value={form.saleId} onChange={(e) => setForm({ ...form, saleId: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" required>
          <option value="">Select sale</option>
          {sales.map((s) => (
            <option key={s.saleId} value={s.saleId}>Sale #{s.saleId} - ${Number(s.totalAmount || 0).toFixed(2)}</option>
          ))}
        </select>
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Amount" required />
        <input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" required />
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); }} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {loading ? <div className="py-10 flex justify-center"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sale</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.paymentId} className="border-t border-gray-100">
                  <td className="px-4 py-3">#{r.paymentId}</td>
                  <td className="px-4 py-3">Sale #{r.saleId}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(r.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{new Date(r.paymentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(r)} className="px-3 py-1 rounded bg-blue-50 text-blue-600">Edit</button>
                      <button onClick={() => onDelete(r.paymentId)} className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-50 text-red-600"><Trash2 className="w-3 h-3" />Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Payments;
