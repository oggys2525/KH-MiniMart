import React, { useEffect, useState } from 'react';
import { Package, Search, Loader, AlertCircle, Tag } from 'lucide-react';
import api from '../../services/api';

const API_ORIGIN = (api.defaults.baseURL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');

const toAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return `${API_ORIGIN}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
};

const normalizeProduct = (product) => {
  const stockQty = Number(product.stockQty ?? product.stockQuantity ?? 0);
  const sellingPrice = Number(product.sellingPrice ?? product.price ?? 0);

  return {
    id: product.productId ?? product.id,
    productName: product.productName ?? product.name ?? 'Unnamed Product',
    categoryName: product.categoryName ?? product.category?.categoryName ?? '',
    imageUrl: toAbsoluteImageUrl(product.imageUrl),
    stockQty,
    sellingPrice,
  };
};

const isActiveProduct = (product) => product?.status !== false;

const StaffProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const response = await api.get('/products');
        const data = Array.isArray(response.data) ? response.data : [];

        if (!mounted) {
          return;
        }

        const activeProducts = data
          .filter(isActiveProduct)
          .map(normalizeProduct);

        setProducts(activeProducts);
        setError('');
      } catch {
        if (mounted) {
          setError('Failed to load products');
        }
      } finally {
        if (mounted && showLoader) {
          setLoading(false);
        }
      }
    };

    fetchProducts(true);
    const refreshId = window.setInterval(() => fetchProducts(false), 10000);

    return () => {
      mounted = false;
      window.clearInterval(refreshId);
    };
  }, []);

  const filtered = products.filter(p =>
    (p.productName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.categoryName || '').toLowerCase().includes(search.toLowerCase())
  );

  const stockBadge = (qty) => {
    if (qty <= 0)   return 'bg-red-100 text-red-600';
    if (qty <= 10)  return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="space-y-5 staff-products-page">
      <div className="staff-products-hero rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-blue-100 text-sm">Browse product catalog</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />{error}
        </div>
      )}

      <div className="staff-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} products</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader className="w-7 h-7 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="staff-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-16 text-slate-400">No products found</div>
            ) : filtered.map((p, i) => (
                <div
                  key={p.id || i}
                  className="group staff-product-card bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                  style={{ '--card-index': i }}
                >
                <div className="staff-product-image-wrap h-32 bg-gray-100 overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.productName} className="staff-product-image object-contain w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
                      <Package className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-slate-800 truncate text-sm">{p.productName}</p>
                  {p.categoryName && (
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <Tag className="w-3 h-3" />{p.categoryName}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-blue-700">${p.sellingPrice.toFixed(2)}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockBadge(p.stockQty)}`}>
                      {p.stockQty <= 0 ? 'Out of Stock' : `${p.stockQty} in stock`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProducts;
