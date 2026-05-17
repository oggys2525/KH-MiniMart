import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';

const ProductModal = ({ isOpen, onClose, onSuccess, onSave, product = null, categories = [] }) => {
  const [formData, setFormData] = useState({
    productName: '',
    sellingPrice: '',
    costPrice: '',
    imageUrl: '',
    description: '',
    categoryId: '',
    stockQty: '',
    barcode: '',
    status: true,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const isEdit = !!product;
  // Support both onSuccess and onSave callbacks
  const handleSuccess = onSave || onSuccess;
  const DRAFT_KEY = 'productFormDraft';

  const toAbsoluteImageUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const apiBaseUrl = api.defaults.baseURL || '';
    const origin = apiBaseUrl.replace(/\/api\/?$/, '');
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${origin}${normalizedPath}`;
  };

  useEffect(() => {
    if (product) {
      const existingPreview = toAbsoluteImageUrl(product.imageUrl || '');
      setFormData({
        productName: product.productName || '',
        sellingPrice: product.sellingPrice || '',
        costPrice: product.costPrice || '',
        imageUrl: product.imageUrl || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        stockQty: product.stockQty || '',
        barcode: product.barcode || '',
        status: product.status !== false,
      });
      setImagePreview(existingPreview);
      setImageFile(null);
    } else {
      // Restore draft from localStorage for new products
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData(parsed);
          if (parsed.imageUrl) setImagePreview(toAbsoluteImageUrl(parsed.imageUrl));
        } catch {
          localStorage.removeItem(DRAFT_KEY);
        }
      } else {
        setFormData({
          productName: '',
          sellingPrice: '',
          costPrice: '',
          imageUrl: '',
          description: '',
          categoryId: '',
          stockQty: '',
          barcode: '',
          status: true,
        });
        setImagePreview('');
      }
      setImageFile(null);
    }
    setErrors({});
    setSuccess('');
    setError('');
  }, [product, isOpen]);

  // Persist draft to localStorage on every change (add mode only)
  useEffect(() => {
    if (!isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }
  }, [formData, isEdit]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productName.trim()) {
      newErrors.productName = 'Product name is required';
    }

    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Selling price is required';
    }

    if (!formData.costPrice || parseFloat(formData.costPrice) < 0) {
      newErrors.costPrice = 'Cost price is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!formData.stockQty || parseInt(formData.stockQty) < 0) {
      newErrors.stockQty = 'Stock quantity is required';
    }

    if (!formData.barcode.trim()) {
      newErrors.barcode = 'Barcode is required';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }

    if (name === 'imageUrl') {
      setImagePreview(toAbsoluteImageUrl(value));
      if (imageFile) {
        setImageFile(null);
      }
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(toAbsoluteImageUrl(formData.imageUrl));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, imageFile: 'Please select a valid image file.' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageFile: 'Image size must be less than 5MB.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, imageFile: '' }));
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const productId = product ? (product.productId || product.id || 0) : 0;
      const payload = {
        ...formData,
        productId,
        categoryId: parseInt(formData.categoryId, 10) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        stockQty: parseInt(formData.stockQty, 10) || 0,
        minStock: parseInt(formData.minStock, 10) || 0,
        status: formData.status === true || formData.status === 'true',
      };

      if (imageFile) {
        const uploadForm = new FormData();
        uploadForm.append('imageFile', imageFile);
        const uploadResponse = await api.post('/products/upload-image', uploadForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        payload.imageUrl = uploadResponse?.data?.imageUrl || payload.imageUrl;
      }

      let savedProduct = {
        ...product,
        ...payload,
      };

      if (isEdit) {
        const response = await api.put(`/products/${productId}`, payload);
        savedProduct = response?.data || { ...savedProduct, productId, id: productId };
        setSuccess('Product updated successfully!');
      } else {
        const response = await api.post('/products', payload);
        savedProduct = response?.data || savedProduct;
        setSuccess('Product created successfully!');
        localStorage.removeItem(DRAFT_KEY);
      }

      setTimeout(() => {
        if (handleSuccess) {
          handleSuccess(savedProduct, isEdit);
        } else {
          onClose();
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Create New Product'}
      size="lg"
    >
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name *</label>
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            placeholder="Enter product name"
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
              errors.productName
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
            }`}
            disabled={loading}
          />
          {errors.productName && <p className="text-red-500 text-xs mt-1">{errors.productName}</p>}
        </div>

        {/* Cost Price and Selling Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cost Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full pl-8 pr-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                  errors.costPrice
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                }`}
                disabled={loading}
              />
            </div>
            {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Selling Price *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full pl-8 pr-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                  errors.sellingPrice
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                }`}
                disabled={loading}
              />
            </div>
            {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
          </div>
        </div>

        {/* Barcode */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode *</label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="Barcode"
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
              errors.barcode
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
            }`}
            disabled={loading}
          />
          {errors.barcode && <p className="text-red-500 text-xs mt-1">{errors.barcode}</p>}
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
          {errors.imageFile && <p className="text-red-500 text-xs mt-1">{errors.imageFile}</p>}

          <p className="mt-1 text-xs text-gray-500">Choose an image file from your computer.</p>

          {imagePreview && (
            <div className="mt-3 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Category and Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                errors.categoryId
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
              }`}
              disabled={loading}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity *</label>
            <input
              type="number"
              name="stockQty"
              value={formData.stockQty}
              onChange={handleChange}
              placeholder="0"
              min="0"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                errors.stockQty
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
              }`}
              disabled={loading}
            />
            {errors.stockQty && <p className="text-red-500 text-xs mt-1">{errors.stockQty}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter product description"
            rows="3"
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="status"
              checked={formData.status}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
          </label>
        </div>

        {/* Form Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductModal;
