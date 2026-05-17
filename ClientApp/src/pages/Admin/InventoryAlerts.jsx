import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Loader, AlertCircle, Package, TrendingDown } from 'lucide-react';
import api from '../../services/api';

const InventoryAlerts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('critical'); // 'critical' or 'low'

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/products');
      const payload = response?.data;
      const data = Array.isArray(payload) ? payload : (payload?.items || []);
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const intervalId = window.setInterval(() => {
      fetchProducts();
    }, 10000);

    const onStorage = (event) => {
      if (event.key === 'khmart_last_sale_at') {
        fetchProducts();
      }
    };

    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchProducts]);

  const lowStockProducts = products.filter((p) => p.stockQty <= (p.minStock || 5));
  const criticalStockProducts = products.filter((p) => p.stockQty <= (p.minStock || 5) && p.stockQty === 0);

  const displayProducts =
    filterType === 'critical'
      ? criticalStockProducts
      : filterType === 'low'
      ? lowStockProducts
      : products;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Alerts</h2>
        <button
          onClick={fetchProducts}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Critical Stock</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{criticalStockProducts.length}</p>
              <p className="text-xs text-red-500 mt-1">Out of stock items</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Low Stock</p>
              <p className="text-3xl font-bold text-yellow-700 mt-2">{lowStockProducts.length}</p>
              <p className="text-xs text-yellow-500 mt-1">Items below minimum</p>
            </div>
            <TrendingDown className="w-12 h-12 text-yellow-400" />
          </div>
        </div>

        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">In Stock</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{products.length - lowStockProducts.length}</p>
              <p className="text-xs text-green-500 mt-1">Normal stock levels</p>
            </div>
            <Package className="w-12 h-12 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setFilterType('critical')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'critical'
              ? 'bg-red-500 text-white'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          Critical ({criticalStockProducts.length})
        </button>
        <button
          onClick={() => setFilterType('low')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterType === 'low'
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          Low Stock ({lowStockProducts.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No alerts found</p>
          <p className="text-gray-500 text-sm">All inventory items are at healthy levels</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Barcode</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Min Stock</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayProducts.map((product) => {
                const isOutOfStock = product.stockQty === 0;
                const isLowStock = product.stockQty <= (product.minStock || 5) && product.stockQty > 0;

                return (
                  <tr key={product.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl && (
                          <img
                            src={`http://localhost:5000${product.imageUrl}`}
                            alt={product.productName}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span className="font-medium text-gray-900">{product.productName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.barcode}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.category?.categoryName || 'N/A'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{product.stockQty}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{product.minStock || 5}</td>
                    <td className="px-6 py-4">
                      {isOutOfStock ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InventoryAlerts;
