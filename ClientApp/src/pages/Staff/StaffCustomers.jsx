import React, { useEffect, useState } from 'react';
import { Users, Search, Loader, AlertCircle, User } from 'lucide-react';
import api from '../../services/api';

const StaffCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/customers')
      .then(r => setCustomers(r.data || []))
      .catch(() => setError('Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    (c.fullName || c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const avatarColor = (name = '') => {
    const colors = ['from-blue-400 to-blue-600','from-emerald-400 to-emerald-600','from-purple-400 to-purple-600','from-orange-400 to-orange-600','from-pink-400 to-pink-600'];
    return colors[(name.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <div className="space-y-5">
      <div className="p-6 text-white shadow-lg bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm text-teal-100">View and look up customer records</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 text-sm text-red-700 border border-red-200 bg-red-50 rounded-xl">
          <AlertCircle className="flex-shrink-0 w-5 h-5" />{error}
        </div>
      )}

      <div className="overflow-hidden bg-white border shadow-sm rounded-2xl border-slate-200">
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, or email…"
              className="w-full py-2 pr-4 text-sm border pl-9 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <span className="ml-auto text-sm text-slate-400">{filtered.length} customers</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader className="text-teal-500 w-7 h-7 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <User className="w-12 h-12 mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c, i) => {
              const name = c.fullName || c.name || 'Unknown';
              return (
                <div key={c.customerId || i} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-slate-800">{name}</p>
                    <p className="text-xs truncate text-slate-400">{c.email || '–'}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm text-slate-600">{c.phone || '–'}</p>
                    {c.totalPurchases !== undefined && (
                      <p className="text-xs text-slate-400">${Number(c.totalPurchases).toFixed(2)} total</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffCustomers;
