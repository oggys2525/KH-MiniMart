import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';

const CategoryModal = ({ isOpen, onClose, onSuccess, category = null }) => {
  const [formData, setFormData] = useState({
    categoryName: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const isEdit = !!category;

  useEffect(() => {
    if (category) {
      setFormData({
        categoryName: category.categoryName || '',
      });
    } else {
      setFormData({
        categoryName: '',
      });
    }
    setErrors({});
    setSuccess('');
    setError('');
  }, [category, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.categoryName.trim()) {
      newErrors.categoryName = 'Category name is required';
    } else if (formData.categoryName.length < 2) {
      newErrors.categoryName = 'Category name must be at least 2 characters';
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
      if (isEdit) {
        await api.put(`/categories/${category.categoryId}`, formData);
        setSuccess('Category updated successfully!');
      } else {
        await api.post('/categories', formData);
        setSuccess('Category created successfully!');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'Create New Category'}
      size="md"
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
        {/* Category Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Category Name *</label>
          <input
            type="text"
            name="categoryName"
            value={formData.categoryName}
            onChange={handleChange}
            placeholder="Enter category name"
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
              errors.categoryName
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
            }`}
            disabled={loading}
          />
          {errors.categoryName && <p className="text-red-500 text-xs mt-1">{errors.categoryName}</p>}
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
            {isEdit ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryModal;
