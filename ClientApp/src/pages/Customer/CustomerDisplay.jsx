import React, { useEffect, useMemo, useState } from 'react';
import { Expand, Minimize2 } from 'lucide-react';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

const CUSTOMER_DISPLAY_STATE_KEY = 'khmart_customer_display_state';
const CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY = 'khmart_customer_display_fullscreen_pref';
const ABA_QR_IMAGE_URL = '/images/aba-qr.jpg';

const getInitialDisplayState = () => ({
  cart: [],
  paymentMethod: 'Cash',
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  amountTendered: 0,
  changeAmount: 0,
  displayPhase: 'idle',
  thankYouUntil: null,
  updatedAt: null,
});

const readDisplayState = () => {
  try {
    const raw = localStorage.getItem(CUSTOMER_DISPLAY_STATE_KEY);
    if (!raw) {
      return getInitialDisplayState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...getInitialDisplayState(),
      ...parsed,
      cart: Array.isArray(parsed?.cart) ? parsed.cart : [],
    };
  } catch {
    return getInitialDisplayState();
  }
};

const CustomerDisplay = () => {
  const [displayState, setDisplayState] = useState(() => readDisplayState());
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));

  const requestFullscreen = async () => {
    if (document.fullscreenElement) {
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
    } catch {
    }
  };

  const syncFromStorage = () => {
    setDisplayState(readDisplayState());
  };

  useEffect(() => {
    const clockId = setInterval(() => setNow(new Date()), 1000);
    const fallbackSyncId = setInterval(() => syncFromStorage(), 800);

    const onStorage = (event) => {
      if (event.key === CUSTOMER_DISPLAY_STATE_KEY) {
        syncFromStorage();
      }
    };

    const onCustomUpdate = () => syncFromStorage();
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'khmart-customer-display-request-fullscreen') {
        localStorage.setItem(CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY, '1');
        requestFullscreen();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('khmart-customer-display-updated', onCustomUpdate);
    window.addEventListener('message', onMessage);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    if (localStorage.getItem(CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY) === '1') {
      requestFullscreen();
    }

    return () => {
      clearInterval(clockId);
      clearInterval(fallbackSyncId);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('khmart-customer-display-updated', onCustomUpdate);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        localStorage.setItem(CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY, '1');
        await requestFullscreen();
      } else {
        localStorage.setItem(CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY, '0');
        await document.exitFullscreen();
      }
    } catch {
    }
  };

  const goBackToStaff = () => {
    if (document.fullscreenElement) {
      localStorage.setItem(CUSTOMER_DISPLAY_FULLSCREEN_PREF_KEY, '1');
    }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = '/staff/pos';
        window.opener.focus();
        return;
      } catch {
      }
    }

    window.location.href = '/staff/pos';
  };

  const cart = useMemo(() => (Array.isArray(displayState.cart) ? displayState.cart : []), [displayState.cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0), [cart]);
  const subtotal = Number(displayState.subtotal || 0);
  const discountAmount = Number(displayState.discountAmount || 0);
  const total = Number(displayState.total || 0);
  const amountTendered = Number(displayState.amountTendered || 0);
  const changeAmount = Number(displayState.changeAmount || 0);
  const paymentMethod = String(displayState.paymentMethod || 'Cash');
  const displayPhase = String(displayState.displayPhase || 'idle');
  const showThankYou = displayPhase === 'thankyou' && (!displayState.thankYouUntil || Date.now() <= Number(displayState.thankYouUntil));
  const showPendingPopup = displayPhase === 'pending' && paymentMethod !== 'Cash';

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(circle_at_8%_8%,rgba(59,130,246,0.24),transparent_36%),radial-gradient(circle_at_95%_0%,rgba(16,185,129,0.24),transparent_30%),linear-gradient(130deg,#0f172a_0%,#111827_50%,#052e2b_100%)]">
      {showThankYou && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/78 px-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-emerald-300/35 bg-[linear-gradient(140deg,rgba(5,150,105,0.22),rgba(14,116,144,0.25))] p-10 text-center shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
            <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-emerald-200">Payment Confirmed</p>
            <h2 className="mt-3 text-5xl font-black tracking-tight text-white">Thank You!</h2>
            <p className="mt-4 text-lg text-emerald-100/90">Your payment is complete. Please take your receipt.</p>
          </div>
        </div>
      )}

      {showPendingPopup && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/55 px-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-sky-200/35 bg-white/95 p-5 text-slate-900 shadow-[0_28px_75px_rgba(2,6,23,0.5)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Processing Payment</p>
            <h3 className="mt-1 text-2xl font-black text-slate-900">Waiting For Staff Confirmation</h3>
            <p className="mt-2 text-sm text-slate-600">Please complete payment. Staff will confirm once payment is received.</p>

            {total > 0 && (
              <div className="mx-auto mt-4 w-full max-w-[220px] overflow-hidden rounded-xl border border-sky-200 bg-white p-2">
                <img src={ABA_QR_IMAGE_URL} alt="ABA QR" className="h-auto w-full" />
              </div>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-600">
                <span>Discount</span>
                <span className="font-bold text-emerald-600">- {formatCurrency(discountAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-base font-black text-slate-900">Total</span>
                <span className="text-2xl font-black text-sky-700">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 px-4 py-3 border-b border-white/10 bg-slate-950/45 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mx-auto max-w-screen-2xl">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-300">Live POS Screen</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">KH Mart Customer View</h1>
            <p className="text-xs text-emerald-100/85">Scanned products update in realtime</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBackToStaff}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-white transition border rounded-xl border-white/15 bg-white/10 hover:bg-white/15"
              >
                Back to Staff
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white transition border rounded-xl border-white/15 bg-white/10 hover:bg-white/15"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tabular-nums">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
              <p className="text-xs text-emerald-200/90">{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-28 mx-auto max-w-screen-2xl">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
              <h2 className="text-base font-black tracking-tight text-white">Current Order</h2>
              <span className="px-3 py-1 text-xs font-bold border rounded-full border-emerald-300/30 bg-emerald-400/10 text-emerald-100">
                {itemCount} item(s)
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_62px_80px_90px] gap-2 border-b border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-200/80">
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Total</span>
            </div>

            <div className="max-h-[58vh] overflow-auto px-2.5 py-2">
              {cart.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-950/20 px-5 text-center">
                  <div>
                    <h3 className="text-xl font-black text-white">Waiting for scanned products...</h3>
                    <p className="mt-1.5 text-sm text-emerald-100/85">Items scanned in POS will appear here in realtime.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((item, index) => (
                    <div
                      key={`${item.productId || index}-${index}`}
                      className="grid grid-cols-[44px_minmax(0,1fr)_62px_80px_90px] items-center gap-2 rounded-lg border border-white/10 bg-slate-950/20 px-2 py-1.5"
                    >
                      <div className="w-10 h-10 overflow-hidden rounded-lg bg-black/25">
                        {item.imageUrl ? (
                          <img
                            src={toAbsoluteImageUrl(item.imageUrl)}
                            alt={item.productName || 'Product'}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-300">No Img</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{item.productName || 'Unnamed Product'}</p>
                        <p className="text-[11px] text-emerald-100/80">Realtime POS item</p>
                      </div>
                      <div className="text-sm font-black text-center text-emerald-200">x{Number(item.qty) || 0}</div>
                      <div className="text-sm font-bold text-right text-white">{formatCurrency(item.price)}</div>
                      <div className="text-base font-black text-right text-emerald-200">{formatCurrency(item.lineTotal)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-3">
            <div className="rounded-xl border border-white/15 bg-white/[0.08] p-3 shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-200">Payment Method</p>
                <span className="rounded-full border border-sky-300/30 bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-100">
                  {paymentMethod}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/15 bg-white/[0.08] p-3 shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between text-emerald-100/80">
                    <span>Subtotal</span>
                    <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-100/80">
                    <span>Discount</span>
                    <span className="font-bold text-emerald-200">- {formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-base font-black">Grand Total</span>
                    <span className="text-2xl font-black text-emerald-200">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {total > 0 && paymentMethod !== 'Cash' ? (
                <div className="rounded-xl border border-sky-200/40 bg-sky-500/10 p-3 text-center shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-sky-200">Scan to Pay</p>
                  <p className="mt-1 text-base font-black text-white">KHQR Payment</p>
                  <div className="mx-auto mt-3 w-full max-w-[190px] overflow-hidden rounded-xl border border-white/20 bg-white p-2.5">
                    <img src={ABA_QR_IMAGE_URL} alt="ABA QR" className="w-full h-auto" />
                  </div>
                  <p className="mt-2 text-lg font-black text-emerald-100">{formatCurrency(total)}</p>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/15 bg-white/[0.08] p-3 shadow-[0_12px_36px_rgba(2,6,23,0.35)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-200">Cash Summary</p>
                <div className="mt-1.5 space-y-1.5 text-sm text-emerald-100/85">
                  <div className="flex items-center justify-between">
                    <span>Received</span>
                    <span className="font-bold text-white">{formatCurrency(amountTendered)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Change</span>
                    <span className="font-bold text-emerald-200">{formatCurrency(changeAmount)}</span>
                  </div>
                </div>
              </div>

              {displayState.updatedAt && (
                <p className="text-xs text-right text-emerald-100/70">
                  Last update: {new Date(displayState.updatedAt).toLocaleTimeString('en-US')}
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/15 bg-slate-950/85 backdrop-blur-xl">
        <div className="overflow-hidden py-3.5">
          <p className="customer-footer-marquee whitespace-nowrap text-base font-black uppercase tracking-[0.12em] text-emerald-100">
            Promo Today: Buy 2 Get 1 Free on selected drinks • Weekend Deal: 10% off for orders above $20 • Thank you for shopping at KH Mart
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes customerFooterMarquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        .customer-footer-marquee {
          animation: customerFooterMarquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerDisplay;
