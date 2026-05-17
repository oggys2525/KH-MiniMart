import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader, CheckCircle, Eye, EyeOff, Upload, User as UserIcon } from 'lucide-react';
import Modal from './Modal';
import api from '../services/api';
import { toAbsoluteImageUrl } from '../utils/imageUrl';

const UserModal = ({ isOpen, onClose, onSuccess, user = null, roles = [] }) => {
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleName: 'Staff',
    status: true,
    profileImage: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const isEdit = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        fullName: user.fullName || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        roleName: user.roleName || 'Staff',
        status: user.status !== false,
        profileImage: user.profileImage || '',
      });
    } else {
      setFormData({
        username: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        roleName: 'Staff',
        status: true,
        profileImage: '',
      });
    }
    setErrors({});
    setSuccess('');
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Valid email is required';
    }

    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
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
      let savedUser = null;
      const dataToSend = isEdit
        ? {
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            profileImage: formData.profileImage,
            roleName: formData.roleName,
            status: formData.status,
            ...(formData.password && { password: formData.password }),
          }
        : formData;

      if (isEdit) {
        const res = await api.put(`/users/${user.userId}`, dataToSend);
        savedUser = res?.data;
        setSuccess('User updated successfully!');
      } else {
        const res = await api.post('/users', dataToSend);
        savedUser = res?.data;
        setSuccess('User created successfully!');
      }

      setTimeout(() => {
        onSuccess(savedUser, isEdit ? 'updated' : 'created');
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/users/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData((prev) => ({ ...prev, profileImage: res.data.url }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Create New User'}
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
        {/* Username and Full Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                errors.username
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
              }`}
              disabled={loading || isEdit}
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
                errors.fullName
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
              }`}
              disabled={loading}
            />
            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email address"
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
              errors.email
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
            }`}
            disabled={loading}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Profile Image */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Image</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
              {formData.profileImage ? (
                <img src={toAbsoluteImageUrl(formData.profileImage)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingImage}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {uploadingImage ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingImage ? 'Uploading...' : 'Choose Image'}
            </button>
            {formData.profileImage && (
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, profileImage: '' }))}
                className="text-sm text-red-600 hover:text-red-700"
                disabled={loading || uploadingImage}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Password and Confirm Password */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password {!isEdit && '*'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Enter password'}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors pr-10 ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password {!isEdit && '*'}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={isEdit ? 'Leave blank to keep current' : 'Confirm password'}
                className={`w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors pr-10 ${
                  errors.confirmPassword
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>

        {/* Role and Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
            <select
              name="roleName"
              value={formData.roleName}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="flex items-center cursor-pointer pt-8">
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
            {isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
