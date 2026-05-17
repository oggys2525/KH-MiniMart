import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';

const readStaffLanguage = () => {
  try {
    const raw = localStorage.getItem(STAFF_PREFERENCES_KEY);
    if (!raw) return 'en';
    const parsed = JSON.parse(raw);
    return parsed?.language === 'km' ? 'km' : 'en';
  } catch {
    return 'en';
  }
};

const StaffChangePassword = () => {
  const [form, setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow]     = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');
  const [valErr, setValErr]   = useState({});
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setValErr(e => ({ ...e, [k]: '' })); };

  const strength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const pw = form.newPassword;
  const str = strength(pw);
  const strLabels = ['', t('Weak', 'ខ្សោយ'), t('Fair', 'មធ្យម'), t('Good', 'ល្អ'), t('Strong', 'ខ្លាំង')];
  const strColors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];

  React.useEffect(() => {
    const syncLanguage = () => setStaffLanguage(readStaffLanguage());
    const onStorage = (event) => {
      if (event.key === STAFF_PREFERENCES_KEY) {
        syncLanguage();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncLanguage);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncLanguage);
    };
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = t('Current password is required', 'ត្រូវបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន');
    if (!form.newPassword || form.newPassword.length < 6) errs.newPassword = t('Min 6 characters', 'យ៉ាងហោចណាស់ ៦ តួអក្សរ');
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = t('Passwords do not match', 'ពាក្យសម្ងាត់មិនត្រូវគ្នា');
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setValErr(errs); return; }
    setSaving(true); setSuccess(''); setError('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(t('Password changed successfully!', 'បានប្ដូរពាក្យសម្ងាត់ដោយជោគជ័យ!'));
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || t('Failed to change password.', 'មិនអាចប្ដូរពាក្យសម្ងាត់បានទេ។'));
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, fieldKey, placeholder }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type={show[fieldKey] ? 'text' : 'password'}
          value={form[fieldKey]}
          onChange={e => set(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-colors
            ${valErr[fieldKey] ? 'border-red-300' : 'border-slate-200'}`}
        />
        <button
          type="button"
          onClick={() => setShow(s => ({ ...s, [fieldKey]: !s[fieldKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {valErr[fieldKey] && <p className="text-xs text-red-500 mt-1">{valErr[fieldKey]}</p>}
    </div>
  );

  return (
    <div className="max-w-lg space-y-5">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">{t('Change Password', 'ប្តូរពាក្យសម្ងាត់')}</h1>
            <p className="text-slate-300 text-sm">{t('Keep your account secure', 'រក្សាគណនីរបស់អ្នកឱ្យមានសុវត្ថិភាព')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('Current Password', 'ពាក្យសម្ងាត់បច្ចុប្បន្ន')}  fieldKey="currentPassword" placeholder={t('Enter current password', 'បញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន')} />
          <Field label={t('New Password', 'ពាក្យសម្ងាត់ថ្មី')}      fieldKey="newPassword"     placeholder={t('Enter new password', 'បញ្ចូលពាក្យសម្ងាត់ថ្មី')} />

          {/* Password strength */}
          {pw && (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                {[1,2,3,4].map(n => (
                  <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${n <= str ? strColors[str] : 'bg-slate-100'}`} />
                ))}
              </div>
              <p className={`text-xs font-medium ${str <= 1 ? 'text-red-500' : str === 2 ? 'text-yellow-600' : str === 3 ? 'text-blue-600' : 'text-green-600'}`}>
                {strLabels[str]} {t('password', 'ពាក្យសម្ងាត់')}
              </p>
            </div>
          )}

          <Field label={t('Confirm New Password', 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី')} fieldKey="confirmPassword" placeholder={t('Re-enter new password', 'បញ្ចូលពាក្យសម្ងាត់ថ្មីម្តងទៀត')} />

          <div className="pt-1">
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold text-sm rounded-xl hover:from-emerald-700 hover:to-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? t('Updating...', 'កំពុងធ្វើបច្ចុប្បន្នភាព...') : t('Update Password', 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់')}
            </button>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <p className="text-xs font-semibold text-blue-700 mb-2">{t('Password tips', 'គន្លឹះពាក្យសម្ងាត់')}</p>
        <ul className="space-y-1 text-xs text-blue-600">
          <li>• {t('At least 8 characters long', 'យ៉ាងហោចណាស់ ៨ តួអក្សរ')}</li>
          <li>• {t('Include uppercase and lowercase letters', 'រួមបញ្ចូលអក្សរធំ និងអក្សរតូច')}</li>
          <li>• {t('Add numbers and special characters', 'បន្ថែមលេខ និងតួអក្សរពិសេស')}</li>
          <li>• {t('Never reuse an old password', 'កុំប្រើពាក្យសម្ងាត់ចាស់ម្តងទៀត')}</li>
        </ul>
      </div>
    </div>
  );
};

export default StaffChangePassword;
