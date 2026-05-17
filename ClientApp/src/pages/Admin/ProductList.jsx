import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import api from '../../services/api';
import ProductModal from '../../components/ProductModal';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/products');
      setProducts(response.data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter(product => product.productId !== id && product.id !== id));
      setSuccess('Product deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product');
    }
  };

  const handleOpenModal = (product = null) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const handleModalSuccess = () => {
    fetchProducts();
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productId?.toString().includes(searchTerm) ||
    product.id?.toString().includes(searchTerm)
  );

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => handleOpenModal(null)}
          className="inline-flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 p-4 border border-red-200 rounded-lg bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 p-4 border border-green-200 rounded-lg bg-green-50">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            placeholder="Search products by name or ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        {paginatedProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr key={product.productId || product.id} className="transition-colors border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{product.productId || product.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.productName || product.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{product.category?.categoryName || 'Uncategorized'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${(product.sellingPrice || product.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (product.stockQty || product.stockQuantity || 0) > 20
                            ? 'bg-green-100 text-green-800'
                            : (product.stockQty || product.stockQuantity || 0) > 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stockQty || product.stockQuantity || 0} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (product.status !== false)
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {(product.status !== false) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(product.productId || product.id)}
                            className="p-2 text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-600 transition-colors rounded-lg hover:bg-white disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 text-gray-600 transition-colors rounded-lg hover:bg-white disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        product={selectedProduct}
        categories={categories}
      />

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="mb-2 text-lg font-bold text-gray-900">Delete Product?</h3>
              <p className="mb-6 text-sm text-gray-600">
                Are you sure you want to delete this product? This action cannot be undone.
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

export default ProductList;