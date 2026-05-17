import React, { useEffect, useState } from 'react';
import {
  Building2,
  DollarSign,
  Globe,
  Image,
  Loader,
  Lock,
  Save,
  ShieldCheck,
  Store,
  UploadCloud,
  X,
} from 'lucide-react';
import api from '../../services/api';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';

const LOGO_KEY = 'khmart_logo_url';
const LOGO_UPDATED_EVENT = 'khmart-logo-updated';

const THEMES = [
  { value: 'cambodia', label: 'Cambodia Flag' },
  { value: 'ocean', label: 'Ocean Blue' },
  { value: 'forest', label: 'Forest Green' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'km', label: 'Khmer' },
];

const readUiPreferences = () => {
  try {
    const raw = localStorage.getItem(STAFF_PREFERENCES_KEY);
    if (!raw) {
      return { language: 'en', theme: 'cambodia' };
    }

    const parsed = JSON.parse(raw);
    return {
      language: parsed?.language === 'km' ? 'km' : 'en',
      theme: ['cambodia', 'ocean', 'forest'].includes(parsed?.theme) ? parsed.theme : 'cambodia',
    };
  } catch {
    return { language: 'en', theme: 'cambodia' };
  }
};

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
    <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const CURRENCIES = ['USD', 'KHR', 'THB', 'VND', 'SGD'];
const TIMEZONES = [
  'Asia/Phnom_Penh',
  'Asia/Bangkok',
  'Asia/Ho_Chi_Minh',
  'Asia/Singapore',
  'UTC',
];

const Settings = () => {
  // Store info
  const [store, setStore] = useState({
    storeName: 'KH Mart',
    address: '',
    phone: '',
    email: '',
  });

  // Regional
  const [regional, setRegional] = useState({
    currency: 'USD',
    timezone: 'Asia/Phnom_Penh',
    taxRate: 0,
  });

  // Password change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [success, setSuccess] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(() => localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
    const [logoSaving, setLogoSaving] = useState(false);
  const [error, setError] = useState('');
  const [uiPreferences, setUiPreferences] = useState(() => readUiPreferences());

  // Load persisted settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('khmart_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.store) setStore(parsed.store);
      if (parsed.regional) setRegional(parsed.regional);
    }
  }, []);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    setSaving(true);
    // Persist to localStorage (backend settings table can be added later)
    setTimeout(() => {
      localStorage.setItem('khmart_settings', JSON.stringify({ store, regional }));

      try {
        localStorage.setItem(STAFF_PREFERENCES_KEY, JSON.stringify(uiPreferences));
        window.dispatchEvent(new CustomEvent(STAFF_PREFERENCES_UPDATED_EVENT, { detail: uiPreferences }));
      } catch {
        // Silent fail for browsers blocking storage access.
      }

      setSaving(false);
      showSuccess('Settings saved successfully.');
    }, 400);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setPwSaving(true);
    setError('');
    try {
      await api.put('/users/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSaveLogo = async () => {
    if (!logoFile) return;
    setLogoSaving(true);
    setError('');
    try {
      const uploadForm = new FormData();
      uploadForm.append('imageFile', logoFile);
      const res = await api.post('/products/upload-image', uploadForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res?.data?.imageUrl;
      if (!url || typeof url !== 'string') {
        throw new Error('Missing imageUrl from upload response');
      }
      localStorage.setItem(LOGO_KEY, url);
      window.dispatchEvent(new CustomEvent(LOGO_UPDATED_EVENT, { detail: { url } }));
      setLogoFile(null);
      setLogoPreview(url);
      showSuccess('Logo updated successfully.');
    } catch {
      setError('Failed to upload logo. Please try again.');
    } finally {
      setLogoSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      {success && (
        <div className="p-3 text-sm border border-green-200 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="p-3 text-sm border border-red-200 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveGeneral} className="space-y-6">
        {/* Store Information */}
        <Section icon={Store} title="Store Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Store Name">
              <input
                className={inputCls}
                value={store.storeName}
                onChange={(e) => setStore({ ...store, storeName: e.target.value })}
                placeholder="e.g. KH Mart"
              />
            </Field>
            <Field label="Phone Number">
              <input
                className={inputCls}
                value={store.phone}
                onChange={(e) => setStore({ ...store, phone: e.target.value })}
                placeholder="e.g. +855 12 345 678"
              />
            </Field>
            <Field label="Email Address">
              <input
                type="email"
                className={inputCls}
                value={store.email}
                onChange={(e) => setStore({ ...store, email: e.target.value })}
                placeholder="e.g. info@khmart.com"
              />
            </Field>
            <Field label="Address">
              <input
                className={inputCls}
                value={store.address}
                onChange={(e) => setStore({ ...store, address: e.target.value })}
                placeholder="e.g. Phnom Penh, Cambodia"
              />
            </Field>
          </div>
        </Section>

        {/* Regional Settings */}
        <Section icon={Globe} title="Regional & Currency">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Currency">
              <select
                className={inputCls}
                value={regional.currency}
                onChange={(e) => setRegional({ ...regional, currency: e.target.value })}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select
                className={inputCls}
                value={regional.timezone}
                onChange={(e) => setRegional({ ...regional, timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Tax Rate (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className={inputCls}
                value={regional.taxRate}
                onChange={(e) => setRegional({ ...regional, taxRate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </Field>
          </div>
        </Section>

        {/* UI Preferences */}
        <Section icon={Globe} title="Language & Theme">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Language">
              <select
                className={inputCls}
                value={uiPreferences.language}
                onChange={(e) => setUiPreferences((current) => ({ ...current, language: e.target.value }))}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Theme">
              <select
                className={inputCls}
                value={uiPreferences.theme}
                onChange={(e) => setUiPreferences((current) => ({ ...current, theme: e.target.value }))}
              >
                {THEMES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-gray-500">
            These preferences apply across admin, staff, and customer display pages that support language/theme switching.
          </p>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </form>

      {/* Store Logo */}
      <Section icon={Image} title="Store Logo">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-1" />
            ) : (
              <Store className="w-10 h-10 text-gray-300" />
            )}
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-gray-500">
              Upload a new logo to replace the current one across all pages (sidebar, login, receipts, etc.).
              Recommended: square PNG with transparent background.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium cursor-pointer hover:bg-blue-100 transition-colors">
                <UploadCloud className="w-4 h-4" />
                Choose Image
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
              </label>
              {logoFile && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveLogo}
                    disabled={logoSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                  >
                    {logoSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Logo
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
            {logoFile && <p className="text-xs text-gray-400">Selected: {logoFile.name}</p>}
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section icon={Lock} title="Change Password">
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Current Password">
            <input
              type="password"
              className={inputCls}
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New Password">
            <input
              type="password"
              className={inputCls}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm New Password">
            <input
              type="password"
              className={inputCls}
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </Field>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={pwSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900 disabled:opacity-60"
            >
              {pwSaving ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Change Password
            </button>
          </div>
        </form>
      </Section>

      {/* System Info */}
      <Section icon={Building2} title="System Information">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'System', value: 'KH Mart' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Platform', value: 'ASP.NET Core 8 + React' },
            { label: 'Database', value: 'SQL Server' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className="font-medium text-gray-800 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export default Settings;
