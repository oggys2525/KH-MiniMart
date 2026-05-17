import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import api from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';

const ALL_PAGES = ['Pos', 'Orders', 'Products', 'Customers', 'Reports', 'Profile', 'ChangePassword', 'Overview'];
const DEFAULT_ALL_PAGES = ALL_PAGES.join(',');
const STAFF_PERMISSIONS_UPDATED_KEY = 'khmart_staff_permissions_updated';
const STAFF_PERMISSIONS_UPDATED_EVENT = 'khmart-staff-permissions-updated';
const PAGE_LABELS = {
  Pos: 'POS',
  Orders: 'Orders',
  Products: 'Products',
  Customers: 'Customers',
  Reports: 'Reports',
  Profile: 'Profile',
  ChangePassword: 'Password',
  Overview: 'Overview',
};

const Toggle = ({ enabled, onChange, saving }) => (
  <input
    type="checkbox"
    checked={enabled}
    onChange={onChange}
    disabled={saving}
    className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
  />
);

const notifyStaffPermissionChanged = (userId) => {
  const detail = {
    userId: String(userId || ''),
    updatedAt: Date.now(),
  };

  localStorage.setItem(STAFF_PERMISSIONS_UPDATED_KEY, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent(STAFF_PERMISSIONS_UPDATED_EVENT, { detail }));
};

const StaffPermissions = () => {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Link existing staff user
  const [showAdd, setShowAdd] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Create new staff account + permissions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [selectedPages, setSelectedPages] = useState([...ALL_PAGES]);
  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    status: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [permRes, userRes] = await Promise.all([
        api.get('/staffpermissions'),
        api.get('/users?page=1&pageSize=500'),
      ]);
      setRows(permRes.data || []);
      setUsers(userRes.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load staff permissions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPages = (allowedPages) =>
    (allowedPages || '').split(',').map((p) => p.trim()).filter(Boolean);

  const normalize = (value) => (value || '').toString().toLowerCase().trim();

  const rowsWithUser = useMemo(() => rows.map((r) => {
    const userFromList = users.find((u) => u.userId === r.userId);
    return {
      ...r,
      user: r.user || userFromList || null,
    };
  }), [rows, users]);

  const staffUsers = useMemo(
    () => users.filter((u) => normalize(u.roleName) === 'staff'),
    [users],
  );

  const setAllPages = async (row, pages) => {
    const newAllowedPages = pages.join(',');
    setSavingId(`${row.id}-all`);
    try {
      await api.put(`/staffpermissions/${row.id}`, {
        userId: row.userId,
        allowedPages: newAllowedPages,
      });
      notifyStaffPermissionChanged(row.userId);
      setRows((prev) =>
        prev.map((r) => r.id === row.id ? { ...r, allowedPages: newAllowedPages } : r)
      );
      setSuccess('Permissions updated successfully.');
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setSavingId(null);
    }
  };

  const togglePage = async (row, page) => {
    const current = getPages(row.allowedPages);
    const updated = current.includes(page)
      ? current.filter((p) => p !== page)
      : [...current, page];
    const newAllowedPages = updated.join(',');

    setSavingId(`${row.id}-${page}`);
    try {
      await api.put(`/staffpermissions/${row.id}`, {
        userId: row.userId,
        allowedPages: newAllowedPages,
      });
      notifyStaffPermissionChanged(row.userId);
      setRows((prev) =>
        prev.map((r) => r.id === row.id ? { ...r, allowedPages: newAllowedPages } : r)
      );
      setSuccess('Permission updated successfully.');
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update permission.');
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this permission record?')) return;
    try {
      const row = rows.find((item) => item.id === id);
      await api.delete(`/staffpermissions/${id}`);
      if (row?.userId) {
        notifyStaffPermissionChanged(row.userId);
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSuccess('Permission record deleted.');
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete permission.');
    }
  };

  const onAddUser = async () => {
    if (!addUserId) return;
    setAddSaving(true);
    setError('');
    try {
      await api.post('/staffpermissions', {
        userId: Number(addUserId),
        allowedPages: DEFAULT_ALL_PAGES,
      });
      notifyStaffPermissionChanged(addUserId);
      setShowAdd(false);
      setAddUserId('');
      setSuccess('Staff user linked with permissions.');
      setTimeout(() => setSuccess(''), 1800);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add permission.');
    } finally {
      setAddSaving(false);
    }
  };

  const toggleCreatePage = (page) => {
    setSelectedPages((prev) => (
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    ));
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      status: true,
    });
    setSelectedPages([...ALL_PAGES]);
  };

  const onCreateStaff = async () => {
    setError('');

    if (!createForm.username.trim() || !createForm.fullName.trim()) {
      setError('Username and full name are required.');
      return;
    }

    if (!createForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email.');
      return;
    }

    if (createForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }

    setCreateSaving(true);

    try {
      const createUserRes = await api.post('/users', {
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        roleName: 'Staff',
        status: createForm.status,
        profileImage: '',
      });

      const createdUserId = createUserRes?.data?.userId;

      if (!createdUserId) {
        throw new Error('Could not get new staff user id.');
      }

      await api.post('/staffpermissions', {
        userId: createdUserId,
        allowedPages: selectedPages.join(','),
      });
      notifyStaffPermissionChanged(createdUserId);

      setShowCreateModal(false);
      resetCreateForm();
      setSuccess('New staff account and permissions created successfully.');
      setTimeout(() => setSuccess(''), 2200);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create staff account.');
    } finally {
      setCreateSaving(false);
    }
  };

  const assignedUserIds = new Set(rowsWithUser.map((r) => r.userId));
  const availableUsers = staffUsers.filter((u) => !assignedUserIds.has(u.userId));

  const filteredRows = rowsWithUser.filter((r) => {
    const keyword = search.toLowerCase();
    const fullName = (r.user?.fullName || '').toLowerCase();
    const username = (r.user?.username || '').toLowerCase();
    const email = (r.user?.email || '').toLowerCase();
    return fullName.includes(keyword) || username.includes(keyword) || email.includes(keyword);
  });

  const sortedFilteredRows = useMemo(() => (
    [...filteredRows].sort((a, b) => {
      const aName = (a.user?.fullName || a.user?.username || '').toLowerCase();
      const bName = (b.user?.fullName || b.user?.username || '').toLowerCase();
      const byName = aName.localeCompare(bName);
      if (byName !== 0) return byName;
      return Number(a.userId || 0) - Number(b.userId || 0);
    })
  ), [filteredRows]);

  const summary = useMemo(() => {
    const total = rowsWithUser.length;
    const withAll = rowsWithUser.filter((r) => getPages(r.allowedPages).length === ALL_PAGES.length).length;
    const limited = total - withAll;
    return { total, withAll, limited };
  }, [rowsWithUser]);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <section className="p-6 border shadow-sm rounded-2xl border-slate-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Staff Accounts & Permissions</h2>
            <p className="mt-1 text-sm text-slate-600">Manage each staff account and control exactly which pages they can access.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <UserCheck className="w-4 h-4" /> Link Existing Staff
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" /> New Staff Account
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-slate-500"><Users className="w-4 h-4" /> <span className="text-sm">Managed Staff</span></div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</div>
        </div>
        <div className="p-4 border shadow-sm rounded-xl border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-700"><ShieldCheck className="w-4 h-4" /> <span className="text-sm">Full Access</span></div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{summary.withAll}</div>
        </div>
        <div className="p-4 border shadow-sm rounded-xl border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700"><KeyRound className="w-4 h-4" /> <span className="text-sm">Limited Access</span></div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{summary.limited}</div>
        </div>
      </div>

      {error && (
        <div className="fixed z-[100] top-5 right-5 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-red-200 bg-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Error</p>
              <p className="mt-0.5 text-sm text-slate-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError('')}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 rounded-b-xl bg-gradient-to-r from-red-400 to-red-500" />
        </div>
      )}

      {success && (
        <div className="fixed z-[100] top-5 right-5 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-emerald-200 bg-white shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Success</p>
              <p className="mt-0.5 text-sm text-slate-600">{success}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess('')}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 rounded-b-xl bg-gradient-to-r from-emerald-400 to-green-500" />
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="p-4 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Link Existing Staff Account</h3>
            <button
              onClick={() => { setShowAdd(false); setAddUserId(''); }}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={addUserId}
              onChange={(e) => setAddUserId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded-lg border-slate-300"
            >
              <option value="">Select staff account...</option>
              {availableUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {(u.fullName || u.username)} ({u.username})
                </option>
              ))}
            </select>
            <button
              onClick={onAddUser}
              disabled={!addUserId || addSaving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {addSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Staff Account</h3>
                <p className="text-sm text-slate-500">Create account and assign page permissions in one step.</p>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300"
                  placeholder="staff.username"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300"
                  placeholder="Staff member name"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full py-2 pr-3 text-sm border rounded-lg border-slate-300 pl-9"
                    placeholder="staff@khmart.com"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Status</label>
                <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg border-slate-300 bg-slate-50 text-slate-700">
                  <input
                    type="checkbox"
                    checked={createForm.status}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.checked }))}
                  />
                  Active account
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <div className="p-4 mt-5 border rounded-xl border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">Page Permissions</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPages([...ALL_PAGES])}
                    className="px-2 py-1 text-xs font-semibold bg-white border rounded-lg border-slate-300 text-slate-700"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPages([])}
                    className="px-2 py-1 text-xs font-semibold bg-white border rounded-lg border-slate-300 text-slate-700"
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {ALL_PAGES.map((page) => {
                  const checked = selectedPages.includes(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => toggleCreatePage(page)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        checked
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                className="px-4 py-2 text-sm font-semibold border rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateStaff}
                disabled={createSaving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
        <input
          type="text"
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="w-full bg-white border shadow-sm rounded-xl border-slate-200">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : sortedFilteredRows.length === 0 ? (
          <div className="py-10 text-sm text-center text-gray-400">No staff permissions found.</div>
        ) : (
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: '36%' }} />
              {ALL_PAGES.map((page) => (
                <col key={page} style={{ width: '6.5%' }} />
              ))}
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-left text-gray-700 uppercase">Staff</th>
                {ALL_PAGES.map((page) => (
                  <th key={page} className="px-2 py-3 text-xs font-semibold tracking-wide text-center text-gray-700 uppercase">
                    {PAGE_LABELS[page]}
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-semibold tracking-wide text-center text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredRows.map((r) => {
                const pages = getPages(r.allowedPages);
                const staffName = r.user?.fullName || r.user?.username || `User #${r.userId}`;
                const staffAvatar = toAbsoluteImageUrl(r.user?.profileImage);
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden border rounded-full border-slate-200 bg-slate-100">
                          {staffAvatar ? (
                            <img src={staffAvatar} alt={staffName} className="object-cover w-full h-full" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate text-slate-900">{staffName}</div>
                          <div className="text-xs truncate text-slate-500">{r.user?.email || r.user?.username || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    {ALL_PAGES.map((page) => (
                      <td key={page} className="px-2 py-3 text-center align-middle">
                        <div className="flex justify-center">
                          <Toggle
                            enabled={pages.includes(page)}
                            onChange={() => togglePage(r, page)}
                            saving={savingId === `${r.id}-${page}` || savingId === `${r.id}-all`}
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Grant all permissions"
                          disabled={savingId === `${r.id}-all`}
                          onClick={() => setAllPages(r, ALL_PAGES)}
                          className="p-1.5 text-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-40"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <button
                          title="Revoke all permissions"
                          disabled={savingId === `${r.id}-all`}
                          onClick={() => setAllPages(r, [])}
                          className="p-1.5 text-amber-500 rounded-lg hover:bg-amber-50 disabled:opacity-40"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffPermissions;
