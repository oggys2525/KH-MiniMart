import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  XCircle,
  Barcode,
  Boxes,
  Filter,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import ProductModal from '../../components/ProductModal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const itemsPerPage = 12;

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
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();

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
  }, [fetchProducts, fetchCategories]);

  const handleProductSaved = useCallback((savedProduct, isEdit) => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSuccess(isEdit ? 'Product updated successfully!' : 'Product created successfully!');
    setTimeout(() => setSuccess(''), 3000);

    // Ensure newly saved product is visible immediately
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);

    if (savedProduct) {
      const savedId = savedProduct.productId || savedProduct.id;
      setProducts((prev) => {
        const withoutCurrent = prev.filter((p) => (p.productId || p.id) !== savedId);
        return [savedProduct, ...withoutCurrent];
      });
    }

    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = useCallback(async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      setSuccess('Product deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setDeleteConfirm(null);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product. Please try again.');
    }
  }, [fetchProducts]);

  const handleEdit = useCallback((product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  }, []);

  const toAbsoluteImageUrl = useCallback((url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const apiBaseUrl = api.defaults.baseURL || '';
    const origin = apiBaseUrl.replace(/\/api\/?$/, '');
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${origin}${normalizedPath}`;
  }, []);

  const resolveCategoryName = useCallback((product) => {
    const categoryId = product.categoryId;
    return (
      categories.find((c) => c.categoryId === categoryId)?.categoryName ||
      product.category?.categoryName ||
      'Uncategorized'
    );
  }, [categories]);

  const normalizedProducts = useMemo(() => {
    return products.map((product) => {
      const stockQty = Number(product.stockQty ?? product.stockQuantity ?? 0);
      const minStock = Number(product.minStock ?? 0);
      const isActive = product.status !== false;
      const id = product.productId || product.id;
      const name = product.productName || product.name || 'Unnamed Product';
      const categoryName = resolveCategoryName(product);
      const isLowStock = stockQty > 0 && stockQty <= (minStock || 10);
      const outOfStock = stockQty <= 0;

      return {
        ...product,
        id,
        name,
        stockQty,
        minStock,
        isActive,
        categoryName,
        isLowStock,
        outOfStock,
      };
    });
  }, [products, resolveCategoryName]);

  const stats = useMemo(() => {
    const total = normalizedProducts.length;
    const active = normalizedProducts.filter((p) => p.isActive).length;
    const lowStock = normalizedProducts.filter((p) => p.isLowStock).length;
    const outOfStock = normalizedProducts.filter((p) => p.outOfStock).length;

    return { total, active, lowStock, outOfStock };
  }, [normalizedProducts]);

  const filteredProducts = useMemo(() => {
    return normalizedProducts.filter((product) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        product.name?.toLowerCase().includes(q) ||
        product.id?.toString().includes(searchTerm) ||
        product.barcode?.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === 'all' || String(product.categoryId) === categoryFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && product.isActive) ||
        (statusFilter === 'inactive' && !product.isActive) ||
        (statusFilter === 'low' && product.isLowStock) ||
        (statusFilter === 'out' && product.outOfStock);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [normalizedProducts, searchTerm, categoryFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  if (loading && products.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Products Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog efficiently</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="fixed right-4 top-4 z-[120] w-[min(360px,calc(100vw-2rem))]">
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-white p-4 shadow-[0_16px_40px_rgba(16,185,129,0.2)]">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Success</p>
              <p className="mt-0.5 text-sm text-slate-700">{success}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess('')}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close success message"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 text-blue-600 rounded-lg bg-blue-50">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Products</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.lowStock}</p>
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stats.outOfStock}</p>
              <p className="text-sm text-gray-500">Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-white border border-gray-200 shadow-sm rounded-xl">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Search Products</label>
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Product name, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2.5 pl-9 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Category</label>
            <div className="relative">
              <Filter className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-2.5 pl-9 pr-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={String(cat.categoryId)}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block mb-1.5 text-sm font-semibold text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-end gap-2 lg:col-span-2">
            <button
              onClick={() => setCurrentPage(1)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={handleClearFilters}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {paginatedProducts.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
          <p className="text-lg text-gray-500">
            {filteredProducts.length === 0 && (searchTerm || categoryFilter !== 'all' || statusFilter !== 'all')
              ? 'No products match your filters'
              : 'No products found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paginatedProducts.map((product) => {
            const imageUrl = toAbsoluteImageUrl(product.imageUrl);
            const stockBadgeClass = product.outOfStock
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : product.isLowStock
              ? 'bg-amber-100 text-amber-700 border border-amber-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200';

            return (
              <div
                key={product.id}
                className="group overflow-hidden transition duration-200 bg-white border border-gray-200 shadow-sm rounded-xl hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_12px_35px_rgba(37,99,235,0.18)]"
              >
                <div className="h-32 bg-gray-100 overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="object-contain w-full h-full transition duration-300 group-hover:scale-110" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-200">
                      <Package className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="p-2.5 space-y-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 truncate" title={product.name}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md">
                        {product.categoryName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Barcode className="w-3 h-3" />
                        {product.barcode || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-emerald-600">
                      ${(Number(product.sellingPrice) || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Cost: ${(Number(product.costPrice) || 0).toFixed(2)}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${stockBadgeClass}`}>
                        <span className="inline-flex items-center gap-1">
                          <Boxes className="w-3 h-3" />
                          {product.stockQty}
                        </span>
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Min: {product.minStock}</p>
                  </div>

                  <div className="flex items-center justify-end">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        product.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors rounded-lg bg-blue-50 hover:bg-blue-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product.id)}
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors rounded-lg bg-red-50 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col items-start justify-between gap-3 p-4 bg-white border border-gray-200 rounded-xl md:flex-row md:items-center">
          <p className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        onSave={handleProductSaved}
        product={selectedProduct}
        categories={categories}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Product?</h3>
              <p className="mb-6 text-sm text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {products.find((p) => p.productId === deleteConfirm || p.id === deleteConfirm)?.productName ||
                    products.find((p) => p.productId === deleteConfirm || p.id === deleteConfirm)?.name ||
                    'this product'}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
