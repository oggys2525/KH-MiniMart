import React, { useMemo, useState } from 'react';
import { FileText, Loader, Save } from 'lucide-react';

const SYSTEM_TEXTS_KEY = 'khmart_system_texts';
const SYSTEM_TEXTS_UPDATED_EVENT = 'khmart-system-texts-updated';

const DEFAULT_PROMOS = [
  'KH MART PROMOTION: Buy 2 get 1 free on selected drinks',
  'Fresh arrival every morning at KH Mart',
  'Weekend special: 10% off bakery from 5 PM - 8 PM',
  'Thank you for shopping with KH Mart',
];

const DEFAULT_TEXTS = {
  customerTitle: 'KH Mart Customer View',
  customerSubtitle: 'Scanned products update in realtime',
  waitingTitle: 'Waiting for scanned products...',
  waitingSubtitle: 'Items scanned in POS will appear here in realtime.',
  promoLabel: 'KH MART PROMO',
  promoItems: DEFAULT_PROMOS,
};

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const textareaCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[110px]';

const readStoredTexts = () => {
  try {
    const raw = localStorage.getItem(SYSTEM_TEXTS_KEY);
    if (!raw) {
      return DEFAULT_TEXTS;
    }

    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_TEXTS,
      ...parsed,
      promoItems: Array.isArray(parsed?.promoItems)
        ? parsed.promoItems.filter((item) => String(item || '').trim().length > 0)
        : DEFAULT_TEXTS.promoItems,
    };
  } catch {
    return DEFAULT_TEXTS;
  }
};

const Section = ({ title, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
    <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    {children}
  </div>
);

const SystemTexts = () => {
  const [form, setForm] = useState(() => {
    const initial = readStoredTexts();
    return {
      customerTitle: initial.customerTitle,
      customerSubtitle: initial.customerSubtitle,
      waitingTitle: initial.waitingTitle,
      waitingSubtitle: initial.waitingSubtitle,
      promoLabel: initial.promoLabel,
      promoItemsText: (initial.promoItems || []).join('\n'),
    };
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  const promoCount = useMemo(
    () => form.promoItemsText.split('\n').map((line) => line.trim()).filter(Boolean).length,
    [form.promoItemsText],
  );

  const save = (event) => {
    event.preventDefault();
    setSaving(true);

    const promoItems = form.promoItemsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      customerTitle: form.customerTitle.trim() || DEFAULT_TEXTS.customerTitle,
      customerSubtitle: form.customerSubtitle.trim() || DEFAULT_TEXTS.customerSubtitle,
      waitingTitle: form.waitingTitle.trim() || DEFAULT_TEXTS.waitingTitle,
      waitingSubtitle: form.waitingSubtitle.trim() || DEFAULT_TEXTS.waitingSubtitle,
      promoLabel: form.promoLabel.trim() || DEFAULT_TEXTS.promoLabel,
      promoItems: promoItems.length > 0 ? promoItems : DEFAULT_TEXTS.promoItems,
    };

    window.setTimeout(() => {
      localStorage.setItem(SYSTEM_TEXTS_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(SYSTEM_TEXTS_UPDATED_EVENT));

      if (typeof window.BroadcastChannel !== 'undefined') {
        const channel = new window.BroadcastChannel('khmart-system-texts');
        channel.postMessage({ type: 'updated', timestamp: Date.now() });
        channel.close();
      }

      setSaving(false);
      setStatus('System texts saved. Customer screen will update automatically.');
      window.setTimeout(() => setStatus(''), 2600);
    }, 250);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Texts</h2>
          <p className="text-sm text-gray-500">Manage customer view text and promo ticker content.</p>
        </div>
      </div>

      {status && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{status}</div>
      )}

      <form onSubmit={save} className="space-y-6">
        <Section title="Customer Header Text">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
              <input
                className={inputCls}
                value={form.customerTitle}
                onChange={(event) => setForm((prev) => ({ ...prev, customerTitle: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subtitle</label>
              <input
                className={inputCls}
                value={form.customerSubtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, customerSubtitle: event.target.value }))}
              />
            </div>
          </div>
        </Section>

        <Section title="Empty Cart Text">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Waiting Title</label>
              <input
                className={inputCls}
                value={form.waitingTitle}
                onChange={(event) => setForm((prev) => ({ ...prev, waitingTitle: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Waiting Subtitle</label>
              <input
                className={inputCls}
                value={form.waitingSubtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, waitingSubtitle: event.target.value }))}
              />
            </div>
          </div>
        </Section>

        <Section title="Footer Promotion Text">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Promo Label</label>
              <input
                className={inputCls}
                value={form.promoLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, promoLabel: event.target.value }))}
                placeholder="KH MART PROMO"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Promo Lines (1 per line)</label>
              <textarea
                className={textareaCls}
                value={form.promoItemsText}
                onChange={(event) => setForm((prev) => ({ ...prev, promoItemsText: event.target.value }))}
                placeholder={'First promo line\nSecond promo line\nThird promo line'}
              />
              <p className="mt-1 text-xs text-gray-500">Current lines: {promoCount}</p>
            </div>
          </div>
        </Section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save System Texts
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemTexts;
