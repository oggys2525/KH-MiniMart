import React, { useState } from 'react';
import { Search, AlertCircle, Check, RotateCcw, DollarSign } from 'lucide-react';
import api from '../../services/api';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const RefundReturn = () => {
  const [searchInput, setSearchInput] = useState('');
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [processing, setProcessing] = useState(false);
  const [refundMethod, setRefundMethod] = useState('original');

  const handleSearchSale = async () => {
    if (!searchInput.trim()) {
      setError('Please enter a receipt number');
      return;
    }

    setLoading(true);
    setError('');
    setSale(null);

    try {
      const response = await api.get(`/sales/${searchInput}`);
      setSale(response.data);
      setSelectedItems({});
      setReturnReason('');
      setSuccess('');
    } catch (err) {
      setError('Receipt not found. Please check the receipt number.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSelectAllItems = () => {
    if (sale?.saleDetails) {
      const allSelected = Object.values(selectedItems).every((v) => v);
      if (allSelected) {
        setSelectedItems({});
      } else {
        const newSelected = {};
        sale.saleDetails.forEach((item, idx) => {
          newSelected[idx] = true;
        });
        setSelectedItems(newSelected);
      }
    }
  };

  const getSelectedDetails = () => {
    if (!sale?.saleDetails) return [];
    return sale.saleDetails.filter((_, idx) => selectedItems[idx]);
  };

  const calculateRefundAmount = () => {
    return getSelectedDetails().reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
  };

  const handleProcessRefund = async () => {
    const selected = getSelectedDetails();
    if (selected.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!returnReason.trim()) {
      setError('Please provide a reason for the return');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const refundAmount = calculateRefundAmount();
      
      await api.post('/refunds', {
        saleId: sale.saleId,
        items: selected.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        refundAmount,
        refundMethod,
        reason: returnReason,
        processedAt: new Date().toISOString(),
        processedBy: localStorage.getItem('userName') || 'Staff',
      });

      setSuccess(`Refund processed successfully! Amount: ${formatCurrency(refundAmount)}`);
      setSale(null);
      setSearchInput('');
      setSelectedItems({});
      setReturnReason('');
      setRefundMethod('original');

      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process refund');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const refundAmount = calculateRefundAmount();
  const allItemsSelected = sale?.saleDetails && Object.keys(selectedItems).length === sale.saleDetails.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <RotateCcw className="text-amber-400" size={32} />
          <div>
            <h1 className="text-4xl font-black tracking-tight">Refunds & Returns</h1>
            <p className="text-slate-400">Process customer returns and refunds</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Search & Selection */}
          <div className="lg:col-span-2">
            {/* Search Section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 mb-6">
              <label className="block text-sm font-black text-slate-300 mb-3">
                Search Receipt Number
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Enter receipt number..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSale()}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition disabled:opacity-50"
                />
                <button
                  onClick={handleSearchSale}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-black text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search size={18} />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 rounded-lg border border-red-300/30 bg-red-500/10 p-4 flex gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-red-100">{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-6 rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-4 flex gap-3">
                <Check className="text-emerald-400 flex-shrink-0" size={20} />
                <p className="text-emerald-100">{success}</p>
              </div>
            )}

            {/* Sale Details */}
            {sale && (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Receipt #</p>
                      <p className="text-lg font-black text-white">#{sale.saleId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Date</p>
                      <p className="text-sm font-semibold text-white">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Total</p>
                      <p className="text-lg font-black text-emerald-400">
                        {formatCurrency(sale.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Payment Method</p>
                      <span className="inline-block px-2 py-1 rounded-full bg-slate-600 text-xs font-semibold">
                        {sale.payments?.[0]?.paymentMethod || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white">Items</h3>
                    <button
                      onClick={handleSelectAllItems}
                      className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      {allItemsSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sale.saleDetails?.map((item, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems[idx] || false}
                          onChange={() => handleToggleItem(idx)}
                          className="w-5 h-5 rounded border-white/20 accent-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">
                            {item.product?.productName}
                          </p>
                          <p className="text-sm text-slate-400">
                            {item.quantity} × {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Refund Summary */}
          {sale && (
            <div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 sticky top-8">
                <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                  <DollarSign size={20} className="text-amber-400" />
                  Refund Summary
                </h3>

                {/* Refund Amount */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <p className="text-sm text-slate-400 mb-2">Refund Amount</p>
                  <p className="text-3xl font-black text-amber-400">
                    {formatCurrency(refundAmount)}
                  </p>
                </div>

                {/* Refund Method */}
                <div className="mb-6">
                  <label className="block text-sm font-black text-slate-300 mb-3">
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition"
                  >
                    <option value="original">Original Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="store-credit">Store Credit</option>
                  </select>
                </div>

                {/* Return Reason */}
                <div className="mb-6">
                  <label className="block text-sm font-black text-slate-300 mb-3">
                    Return Reason
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="e.g., Defective product, changed mind..."
                    rows="4"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/20 outline-none transition resize-none"
                  />
                </div>

                {/* Process Button */}
                <button
                  onClick={handleProcessRefund}
                  disabled={processing || refundAmount === 0}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-4 font-black text-white transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={18} />
                  {processing ? 'Processing Refund...' : `Process Refund (${formatCurrency(refundAmount)})`}
                </button>

                {/* Info */}
                <div className="mt-6 rounded-lg border border-sky-300/30 bg-sky-500/10 p-4 text-xs text-sky-100">
                  <p className="font-semibold mb-2">ℹ Refund Info:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Stock will be returned to inventory</li>
                    <li>Refund will be processed to original payment method</li>
                    <li>Transaction will be logged for auditing</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundReturn;
