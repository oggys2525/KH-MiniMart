import React, { useCallback, useEffect, useState } from 'react';
import { Edit2, Loader, Save, Shield, Trash2 } from 'lucide-react';
import api from '../../services/api';

const Roles = () => {
  const [rows, setRows] = useState([]);
  const [roleName, setRoleName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/roles');
      setRows(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load roles.');
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
      const payload = { roleName };
      if (editingId) {
        await api.put(`/roles/${editingId}`, payload);
      } else {
        await api.post('/roles', payload);
      }
      setEditingId(null);
      setRoleName('');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setEditingId(row.roleId);
    setRoleName(row.roleName || '');
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete role.');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
      {error && <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <input value={roleName} onChange={(e) => setRoleName(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg min-w-[280px]" placeholder="Role name" required />
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"><Save className="w-4 h-4" /> {editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setRoleName(''); }} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>}
      </form>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        {loading ? <div className="py-10 flex justify-center"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div> : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.roleId} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900 inline-flex items-center gap-2"><Shield className="w-4 h-4 text-gray-500" /> {r.roleName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(r)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(r.roleId)} className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
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

export default Roles;
