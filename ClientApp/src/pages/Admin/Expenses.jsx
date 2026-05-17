import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Loader, Save, Trash2, Wallet } from 'lucide-react';
import api from '../../services/api';

const initialForm = {
  title: '',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  note: '',
};

const Expenses = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/expenses');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = useMemo(() => rows.reduce((sum, e) => sum + Number(e.amount || 0), 0), [rows]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        note: form.note,
      };

      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }

      setEditingId(null);
      setForm(initialForm);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.expenseId);
    setForm({
      title: row.title || '',
      amount: row.amount || '',
      expenseDate: new Date(row.expenseDate).toISOString().slice(0, 10),
      note: row.note || '',
    });
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
      {error && <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${total.toFixed(2)}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">Entries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-end">
          <Wallet className="w-10 h-10 text-orange-400" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Title" required />
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Amount" required />
        <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" required />
        <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Note" />
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Note</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.expenseId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(r.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{new Date(r.expenseDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{r.note || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(r)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(r.expenseId)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
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

export default Expenses;
