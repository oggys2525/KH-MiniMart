import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { resolveLogoUrl } from '../utils/imageUrl';
import { Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const Login = () => {
  const [username, setUsername] = useState('');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('khmart_logo_url') || '/images/kh-mart-logo.png');
  const normalizedLogoUrl = resolveLogoUrl(logoUrl);

  useEffect(() => {
    const onLogoUpdated = (e) => setLogoUrl(e.detail?.url || localStorage.getItem('khmart_logo_url') || '/images/kh-mart-logo.png');
    const onStorage = (e) => {
      if (e.key === 'khmart_logo_url') {
        setLogoUrl(localStorage.getItem('khmart_logo_url') || '/images/kh-mart-logo.png');
      }
    };
    window.addEventListener('khmart-logo-updated', onLogoUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('khmart-logo-updated', onLogoUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginType = searchParams.get('type'); // 'admin' | 'staff' | null

  const validateForm = () => {
    const errors = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', String(response.data.userId || ''));
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('username', response.data.username || username);
      localStorage.setItem('fullName', response.data.fullName || username);
      localStorage.setItem('profileImage', response.data.profileImage || '');
      // Keep empty string when admin has disabled all staff pages.
      localStorage.setItem('allowedPages', response.data.allowedPages ?? '');
      const normalizedRole = normalizeRole(response.data.role);
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }

      if (normalizedRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (normalizedRole === 'staff') {
        navigate('/staff/dashboard');
      } else {
        setLoading(false);
        setError('Your account role is not configured for dashboard access.');
      }
    } catch (err) {
      setLoading(false);
      if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.response?.status === 403) {
        setError('Your account is disabled. Please contact an administrator.');
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to the server. Please check your connection.');
      } else {
        const serverMessage = err.response?.data?.message;
        setError(serverMessage || 'An error occurred. Please try again.');
      }
    }
  };

  // Load remembered username on mount
  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberMe');
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (remembered && savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full w-96 h-96 opacity-5"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 bg-white rounded-full w-96 h-96 opacity-5"></div>
      </div>

      {/* Login Container */}
      <div className="z-10 w-full max-w-md">
        <div className="overflow-hidden bg-white shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="px-6 py-8 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center justify-center mb-4">
              <img
                src={normalizedLogoUrl}
                alt="KH Mart Logo"
                className="w-20 h-20 rounded-full object-cover shadow-lg"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/kh-mart-logo.png';
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-center text-white">KH Mart POS</h1>
            <p className="mt-2 text-sm text-center text-blue-100">
              {loginType === 'admin'
                ? 'Administrator access portal'
                : loginType === 'staff'
                ? 'Staff access portal'
                : 'Please sign in to continue'}
            </p>
          </div>

          <div className="px-6 py-8">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block mb-2 text-sm font-semibold text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationErrors.username) {
                      setValidationErrors({ ...validationErrors, username: '' });
                    }
                  }}
                  placeholder="Enter your username"
                  className={`w-full px-4 py-2.5 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    validationErrors.username
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  disabled={loading}
                />
                {validationErrors.username && (
                  <p className="text-red-500 text-xs mt-1.5">{validationErrors.username}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors({ ...validationErrors, password: '' });
                      }
                    }}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-2.5 border-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 pr-10 ${
                      validationErrors.password
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute text-gray-500 transition-colors -translate-y-1/2 right-3 top-1/2 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-red-500 text-xs mt-1.5">{validationErrors.password}</p>
                )}
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-700">Remember me</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-xs text-center text-gray-600">
              © 2026 KH Mart. All rights reserved.
            </p>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Login;