import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Edit2, Loader, Save, Search, Trash2, Truck, Upload } from 'lucide-react';
import api from '../../services/api';

const initialForm = {
  supplierName: '',
  contactNumber: '',
  email: '',
  image: '',
};

const Suppliers = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/suppliers');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load suppliers.');
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
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
      } else {
        await api.post('/suppliers', form);
      }
      setEditingId(null);
      setForm(initialForm);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier.');
    } finally {
      setSaving(false);
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/suppliers/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, image: res.data.url }));
      setImagePreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.supplierId);
    setForm({
      supplierName: row.supplierName || '',
      contactNumber: row.contactNumber || '',
      email: row.email || '',
      image: row.image || '',
    });
    setImagePreview(row.image ? row.image : '');
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete supplier.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Suppliers</h2>
      {error && <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers by name, contact, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Supplier Name" required />
        <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Contact Number" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg" placeholder="Email" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Choose Image'}
          </button>
          {(imagePreview || form.image) && (
            <img
              src={imagePreview || form.image}
              alt="preview"
              className="w-9 h-9 rounded-lg object-cover border border-gray-200"
            />
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(initialForm); setImagePreview(''); }} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {loading ? <div className="py-10 flex justify-center"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => {
                const q = search.toLowerCase();
                return (
                  !q ||
                  (r.supplierName || '').toLowerCase().includes(q) ||
                  (r.contactNumber || '').toLowerCase().includes(q) ||
                  (r.email || '').toLowerCase().includes(q)
                );
              }).map((r) => (
                <tr key={r.supplierId} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    {r.image ? (
                      <img src={r.image} alt={r.supplierName} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.supplierName}</td>
                  <td className="px-4 py-3">{r.contactNumber || '-'}</td>
                  <td className="px-4 py-3">{r.email || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(r)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(r.supplierId)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
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

export default Suppliers;
