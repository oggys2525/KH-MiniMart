import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Send } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const getSaleId = (sale) => sale?.saleId ?? sale?.id ?? 'N/A';
const getSaleTotal = (sale) => Number(sale?.totalAmount ?? sale?.amount ?? 0);
const getSaleSubtotal = (sale) => {
  const explicitSubtotal = Number(sale?.subtotal);
  if (Number.isFinite(explicitSubtotal) && explicitSubtotal >= 0) {
    return explicitSubtotal;
  }

  return getSaleTotal(sale) + getSaleDiscount(sale);
};
const getSalePaymentMethod = (sale) => sale?.paymentMethod || sale?.payments?.[0]?.paymentMethod || 'Cash';
const isCashPayment = (paymentMethod) => String(paymentMethod || '').trim().toLowerCase() === 'cash';
const getSaleAmountReceived = (sale) => {
  const fallbackTotal = getSaleTotal(sale);
  const rawAmount = Number(sale?.amountTendered ?? sale?.receivedAmount ?? sale?.payments?.[0]?.amount ?? fallbackTotal);
  return Number.isFinite(rawAmount) ? rawAmount : fallbackTotal;
};
const getSaleDiscount = (sale) => Number(sale?.discountAmount ?? 0);
const getSaleCustomerName = (sale) =>
  sale?.customerName?.trim() || sale?.customer?.customerName?.trim() || 'Walk-in';
const getSaleCashierName = (sale) => sale?.user?.fullName || sale?.staffName || 'Staff';
const getSaleItems = (sale) => sale?.saleDetails || sale?.items || [];

const PrintReceiptModal = ({
  isOpen,
  sale,
  onClose,
  onAfterPrint,
  autoPrint = false,
  autoDownloadPdf = false,
  autoCloseAfterAutoActions = false,
}) => {
  const receiptRef = useRef(null);
  const hasAutoPrintedRef = useRef(false);
  const hasAutoActionsRunRef = useRef(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handlePrint = () => {
    if (!receiptRef.current) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=700');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to print the receipt.');
      return;
    }

    const receiptHtml = receiptRef.current.innerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${getSaleId(sale)}</title>
          <style>
            body {
              margin: 0;
              padding: 16px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .receipt-paper {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 16px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .mb-6 { margin-bottom: 24px; }
            .mb-4 { margin-bottom: 16px; }
            .mb-1 { margin-bottom: 4px; }
            .mt-1 { margin-top: 4px; }
            .pt-2 { padding-top: 8px; }
            .pt-4 { padding-top: 16px; }
            .pb-4 { padding-bottom: 16px; }
            .border-b-2 { border-bottom: 2px dashed #9ca3af; }
            .border-t-2 { border-top: 2px dashed #9ca3af; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .space-y-2 > * + * { margin-top: 8px; }
            .text-xs { font-size: 12px; }
            .text-base { font-size: 16px; }
            .font-semibold { font-weight: 600; }
            .font-black { font-weight: 900; }
            .text-slate-900 { color: #0f172a; }
            .text-slate-600 { color: #475569; }
            .text-emerald-600 { color: #059669; }
            @media print {
              body {
                padding: 0;
              }
              .receipt-paper {
                border: 0;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-paper">${receiptHtml}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();

    if (typeof onAfterPrint === 'function') {
      onAfterPrint();
    }
  };

  useEffect(() => {
    if (!isOpen || !sale) {
      hasAutoPrintedRef.current = false;
      hasAutoActionsRunRef.current = false;
    }
  }, [isOpen, sale]);

  const handleSendEmail = async () => {
    if (!customerEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch('/api/reports/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: getSaleId(sale),
          customerEmail: customerEmail.trim(),
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setCustomerEmail('');
        setTimeout(() => {
          setEmailSent(false);
        }, 3000);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Check console for details.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPDF = async (silent = false) => {
    try {
      // Send to backend to generate PDF
      const response = await fetch('/api/reports/receipt-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: getSaleId(sale) }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receipt-${getSaleId(sale)}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (!silent) {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      if (!silent) {
        alert('Failed to generate PDF');
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !sale || hasAutoActionsRunRef.current) {
      return undefined;
    }

    if (!autoPrint && !autoDownloadPdf && !autoCloseAfterAutoActions) {
      return undefined;
    }

    hasAutoActionsRunRef.current = true;
    hasAutoPrintedRef.current = true;

    let cancelled = false;

    const runAutoActions = async () => {
      if (autoPrint) {
        handlePrint();
      }

      if (autoDownloadPdf) {
        await handleDownloadPDF(true);
      }

      if (autoCloseAfterAutoActions && !cancelled) {
        window.setTimeout(() => {
          if (!cancelled) {
            onClose();
          }
        }, 450);
      }
    };

    const timer = window.setTimeout(() => {
      runAutoActions();
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoCloseAfterAutoActions, autoDownloadPdf, autoPrint, isOpen, onClose, sale]);

  if (!isOpen || !sale) {
    return null;
  }

  const paymentMethod = getSalePaymentMethod(sale);
  const isCash = isCashPayment(paymentMethod);
  const totalAmount = getSaleTotal(sale);
  const subtotalAmount = getSaleSubtotal(sale);
  const amountReceived = getSaleAmountReceived(sale);
  const discountAmount = getSaleDiscount(sale);
  const changeAmount =
    isCash
      ? Math.max(0, amountReceived - totalAmount)
      : 0;
  const customerName = getSaleCustomerName(sale);
  const cashierName = getSaleCashierName(sale);
  const saleItems = getSaleItems(sale);
  const saleDate = sale.saleDate ? new Date(sale.saleDate).toLocaleString('en-GB') : new Date().toLocaleString('en-GB');

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-black text-slate-900">Receipt Preview</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-200 rounded-lg transition"
            >
              <X size={20} className="text-slate-600" />
            </button>
          </div>

          {/* Receipt Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Receipt Paper */}
            <div ref={receiptRef} className="bg-white p-6 border border-slate-300 rounded-lg print:border-0 print:p-0">
              {/* Store Header */}
              <div className="text-center mb-6 pb-4 border-b-2 border-dashed border-slate-400">
                <h1 className="text-2xl font-black text-slate-900">KH MART</h1>
                <p className="text-xs text-slate-600 mt-1">
                  📍 Khmer Shopping System
                </p>
                <p className="text-xs text-slate-600">
                  Phone: (855) 123-4567
                </p>
              </div>

              {/* Receipt Info */}
              <div className="text-center mb-4 text-xs text-slate-600">
                <p>
                  <span className="font-semibold">Receipt #:</span> {getSaleId(sale)}
                </p>
                <p>
                  <span className="font-semibold">Date:</span>{' '}
                  {saleDate}
                </p>
                <p>
                  <span className="font-semibold">Cashier:</span> {cashierName}
                </p>
                <p>
                  <span className="font-semibold">Customer:</span> {customerName}
                </p>
              </div>

              {/* Items */}
              <div className="mb-6 pb-4 border-b-2 border-dashed border-slate-400">
                <div className="space-y-2">
                  {saleItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.product?.productName || item.productName || 'Item'}
                        </p>
                        <p className="text-slate-600">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <div className="text-right font-semibold text-slate-900">
                        {formatCurrency(item.quantity * item.price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6 text-xs pb-4 border-b-2 border-dashed border-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(subtotalAmount)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-2">
                  <span>TOTAL</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6 text-xs">
                <p className="font-semibold text-slate-900 mb-1">
                  Payment Method: {paymentMethod}
                </p>
                {isCash && (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Received</span>
                      <span>{formatCurrency(amountReceived)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>Change</span>
                      <span>{formatCurrency(changeAmount)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-slate-600 pt-4 border-t-2 border-dashed border-slate-400">
                <p className="font-semibold mb-1">Thank you for shopping!</p>
                <p>Please come again</p>
              </div>
            </div>
          </div>

          {/* Email Section */}
          <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-200 print:hidden">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Send Receipt via Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={isSendingEmail || emailSent}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition disabled:bg-slate-100 disabled:text-slate-500"
              />
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !customerEmail.trim() || emailSent}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailSent ? (
                  <>✓ Sent</>
                ) : isSendingEmail ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={14} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 p-4 bg-slate-50 border-t border-slate-200 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-700"
            >
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-black text-slate-900 transition hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-0 {
            border: 0 !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .fixed {
            position: static !important;
          }
          .z-40,
          .z-50 {
            z-index: auto !important;
          }
        }
      `}</style>
    </>
  );
};

export default PrintReceiptModal;
