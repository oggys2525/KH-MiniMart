import React, { useRef, useState } from 'react';
import { UserCircle, Camera, Save, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import api from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';
const STAFF_PROFILE_UPDATED_EVENT = 'khmart-staff-profile-updated';

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

const StaffProfile = () => {
  const storedName = localStorage.getItem('fullName') || '';
  const storedUser = localStorage.getItem('username') || '';
  const storedImage = localStorage.getItem('profileImage') || '';

  const [fullName, setFullName] = useState(storedName);
  const [profileImage, setProfileImage] = useState(storedImage);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const [staffLanguage, setStaffLanguage] = useState(() => readStaffLanguage());
  const fileInputRef = useRef(null);
  const t = (en, km) => (staffLanguage === 'km' ? km : en);

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

  React.useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setError('');

      try {
        const { data } = await api.get('/auth/profile');
        if (!active) return;

        const nextFullName = (data?.fullName || '').trim();
        const nextImage = data?.profileImage || '';

        setFullName(nextFullName || storedName);
        setProfileImage(nextImage);

        localStorage.setItem('fullName', nextFullName || storedName);
        localStorage.setItem('profileImage', nextImage);
      } catch {
        if (!active) return;
        setError(staffLanguage === 'km' ? 'មិនអាចទាញយកព័ត៌មានប្រវត្តិរូបបានទេ។' : 'Failed to load profile information.');
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [storedName, staffLanguage]);

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'S';

  const notifyProfileUpdated = (nextFullName, nextProfileImage) => {
    window.dispatchEvent(
      new CustomEvent(STAFF_PROFILE_UPDATED_EVENT, {
        detail: {
          fullName: nextFullName,
          profileImage: nextProfileImage,
        },
      })
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setSuccess('');
    setError('');

    try {
      const data = new FormData();
      data.append('file', file);

      const response = await api.post('/auth/profile/upload-image', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response?.data?.url || '';
      setProfileImage(imageUrl);
      setSuccess(t('Image uploaded. Click Save Changes to apply it.', 'រូបភាពបានអាប់ឡូត។ ចុច រក្សាទុកការផ្លាស់ប្តូរ ដើម្បីអនុវត្ត។'));
    } catch (uploadErr) {
      setError(uploadErr?.response?.data?.message || t('Failed to upload image.', 'មិនអាចអាប់ឡូតរូបភាពបានទេ។'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess(''); setError('');
    try {
      const response = await api.put('/auth/profile', {
        fullName,
        profileImage,
      });

      const nextFullName = response?.data?.fullName || fullName;
      const nextProfileImage = response?.data?.profileImage ?? profileImage;

      setFullName(nextFullName);
      setProfileImage(nextProfileImage);
      localStorage.setItem('fullName', nextFullName);
      localStorage.setItem('profileImage', nextProfileImage);
      notifyProfileUpdated(nextFullName, nextProfileImage);
      setSuccess(t('Profile updated successfully!', 'បានធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបដោយជោគជ័យ!'));
    } catch (saveErr) {
      setError(saveErr?.response?.data?.message || t('Failed to update profile. Please try again.', 'មិនអាចធ្វើបច្ចុប្បន្នភាពប្រវត្តិរូបបានទេ។ សូមព្យាយាមម្តងទៀត។'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <UserCircle className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">{t('My Profile', 'ប្រវត្តិរូបខ្ញុំ')}</h1>
            <p className="text-slate-300 text-sm">{t('Manage your personal information', 'គ្រប់គ្រងព័ត៌មានផ្ទាល់ខ្លួនរបស់អ្នក')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        {/* Avatar section */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {toAbsoluteImageUrl(profileImage) ? (
                <img
                  src={toAbsoluteImageUrl(profileImage)}
                  alt={t('Profile', 'ប្រវត្តិរូប')}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(fullName || storedName)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || loadingProfile}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-slate-200 flex items-center justify-center shadow hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-lg">{fullName || t('Staff User', 'អ្នកប្រើបុគ្គលិក')}</p>
            <p className="text-slate-400 text-sm">@{storedUser}</p>
            {uploadingImage && (
              <p className="mt-1 text-xs text-emerald-700 flex items-center gap-1.5">
                <Loader className="w-3.5 h-3.5 animate-spin" />
                {t('Uploading image...', 'កំពុងអាប់ឡូតរូបភាព...')}
              </p>
            )}
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">{t('Staff', 'បុគ្គលិក')}</span>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('Username', 'ឈ្មោះអ្នកប្រើ')}</label>
            <input
              value={storedUser} disabled
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">{t('Username cannot be changed', 'ឈ្មោះអ្នកប្រើមិនអាចប្តូរបាន')}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t('Full Name', 'ឈ្មោះពេញ')}</label>
            <input
              value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder={t('Enter your full name', 'បញ្ចូលឈ្មោះពេញរបស់អ្នក')}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              disabled={loadingProfile}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit" disabled={saving || loadingProfile || uploadingImage || !fullName.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold text-sm rounded-xl hover:from-emerald-700 hover:to-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving || loadingProfile ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save Changes', 'រក្សាទុកការផ្លាស់ប្តូរ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffProfile;
