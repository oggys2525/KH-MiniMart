import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  Search,
  Loader,
  AlertCircle,
  ClipboardList,
  Filter,
  Printer,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import PrintReceiptModal from '../../components/PrintReceiptModal';

const Orders = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/sales');
      setSales(response.data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const filteredOrders = sales.filter((sale) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      String(sale.saleId || sale.id).includes(searchLower) ||
      (sale.customerName || '').toLowerCase().includes(searchLower) ||
      (sale.user?.fullName || '').toLowerCase().includes(searchLower);

    const matchesMethod =
      filterMethod === 'all' ||
      sale.payments?.[0]?.paymentMethod === filterMethod;

    const matchesStatus =
      filterStatus === 'all' || sale.status === filterStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const handleViewOrder = (sale) => {
    setSelectedOrder(sale);
    setShowPrintModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '–';
    try {
      return new Date(dateString).toLocaleString('en-GB');
    } catch {
      return '–';
    }
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return `$${num.toFixed(2)}`;
  };

  const getPaymentMethod = (sale) => {
    return sale.payments?.[0]?.paymentMethod || 'Unknown';
  };

  const getOrderStatus = (sale) => {
    return sale.status || 'Completed';
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'paid' || statusLower === 'completed')
      return 'bg-green-100 text-green-700';
    if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  const paymentMethods = [
    ...new Set(sales.map((s) => s.payments?.[0]?.paymentMethod).filter(Boolean)),
  ].sort();

  const handleClearFilters = () => {
    setSearch('');
    setFilterMethod('all');
    setFilterStatus('all');
  };

  if (loading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">
            View all sales transactions and manage orders
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Search Orders
            </label>
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Order ID or customer name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2.5 pl-9 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Payment Method
            </label>
            <div className="relative">
              <Filter className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full py-2.5 pl-9 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  #
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Staff
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((sale) => (
                  <tr
                    key={sale.saleId || sale.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">
                      #{sale.saleId || sale.id}
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(sale.saleDate)}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-sm">
                      {sale.user?.fullName || 'Unknown'}
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-800">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {getPaymentMethod(sale)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          getOrderStatus(sale)
                        )}`}
                      >
                        {getOrderStatus(sale)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => handleViewOrder(sale)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors inline-flex items-center gap-1"
                        title="View order"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
            Showing {filteredOrders.length} of {sales.length} orders
          </div>
        )}
      </div>

      {selectedOrder && (
        <PrintReceiptModal
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedOrder(null);
          }}
          sale={selectedOrder}
        />
      )}
    </div>
  );
};

export default Orders;
