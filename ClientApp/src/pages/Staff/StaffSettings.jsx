import React, { useMemo, useState } from 'react';
import { CheckCircle2, Globe2, Palette, Save, Settings2 } from 'lucide-react';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';

const THEMES = [
  {
    value: 'cambodia',
    labelEn: 'Cambodia Flag',
    labelKm: 'ទង់ជាតិកម្ពុជា',
    colors: ['#032b6b', '#c8102e', '#032b6b'],
  },
  {
    value: 'ocean',
    labelEn: 'Ocean Blue',
    labelKm: 'ខៀវសមុទ្រ',
    colors: ['#0f172a', '#0ea5e9', '#1d4ed8'],
  },
  {
    value: 'forest',
    labelEn: 'Forest Green',
    labelKm: 'បៃតងព្រៃ',
    colors: ['#14532d', '#16a34a', '#064e3b'],
  },
];

const LANGUAGES = [
  { value: 'en', labelEn: 'English', labelKm: 'អង់គ្លេស' },
  { value: 'km', labelEn: 'Khmer', labelKm: 'ខ្មែរ' },
];

const readPreferences = () => {
  try {
    const raw = localStorage.getItem(STAFF_PREFERENCES_KEY);
    if (!raw) {
      return { theme: 'cambodia', language: 'en' };
    }

    const parsed = JSON.parse(raw);
    return {
      theme: ['cambodia', 'ocean', 'forest'].includes(parsed?.theme) ? parsed.theme : 'cambodia',
      language: ['en', 'km'].includes(parsed?.language) ? parsed.language : 'en',
    };
  } catch {
    return { theme: 'cambodia', language: 'en' };
  }
};

const StaffSettings = () => {
  const [form, setForm] = useState(() => readPreferences());
  const [saved, setSaved] = useState(false);

  const t = (en, km) => (form.language === 'km' ? km : en);

  const selectedTheme = useMemo(
    () => THEMES.find((item) => item.value === form.theme) || THEMES[0],
    [form.theme]
  );

  const handleSave = (event) => {
    event.preventDefault();

    localStorage.setItem(STAFF_PREFERENCES_KEY, JSON.stringify(form));
    window.dispatchEvent(new CustomEvent(STAFF_PREFERENCES_UPDATED_EVENT, { detail: form }));
    setSaved(true);

    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-600 to-sky-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">{t('Staff Settings', 'ការកំណត់បុគ្គលិក')}</h1>
            <p className="text-sm text-emerald-50/90">{t('Manage theme and language for staff panel.', 'គ្រប់គ្រងផ្ទៃពណ៌ និងភាសាសម្រាប់ផ្ទាំងបុគ្គលិក។')}</p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {t('Settings saved successfully.', 'បានរក្សាទុកការកំណត់ដោយជោគជ័យ។')}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-600" />
            <h2 className="text-base font-bold text-slate-800">{t('Theme', 'ផ្ទៃពណ៌')}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEMES.map((theme) => {
              const active = form.theme === theme.value;
              return (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, theme: theme.value }))}
                  className={`rounded-xl border p-3 text-left transition ${active ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <div className="mb-2 flex overflow-hidden rounded-lg border border-slate-200">
                    {theme.colors.map((color) => (
                      <span key={color} style={{ backgroundColor: color }} className="h-7 flex-1" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{form.language === 'km' ? theme.labelKm : theme.labelEn}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-slate-600" />
            <h2 className="text-base font-bold text-slate-800">{t('Language', 'ភាសា')}</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {LANGUAGES.map((language) => (
              <button
                key={language.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, language: language.value }))}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${form.language === language.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
              >
                {form.language === 'km' ? language.labelKm : language.labelEn}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('Preview', 'មើលជាមុន')}</p>
          <p className="mt-1 text-sm text-slate-700">
            {t('Theme', 'ផ្ទៃពណ៌')}: <span className="font-semibold">{form.language === 'km' ? selectedTheme.labelKm : selectedTheme.labelEn}</span>
            {' • '}
            {t('Language', 'ភាសា')}: <span className="font-semibold">{form.language === 'km' ? 'ខ្មែរ' : 'English'}</span>
          </p>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Save className="h-4 w-4" />
            {t('Save Settings', 'រក្សាទុកការកំណត់')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffSettings;
