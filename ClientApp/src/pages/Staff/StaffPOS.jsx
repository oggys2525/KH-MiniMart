import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Expand,
  Loader,
  Minus,
  Minimize2,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { toAbsoluteImageUrl } from '../../utils/imageUrl';
import PrintReceiptModal from '../../components/PrintReceiptModal';

const CUSTOMER_DISPLAY_STATE_KEY = 'khmart_customer_display_state';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const getProductPrice = (product) => Number(product?.sellingPrice ?? product?.price ?? 0);
const getProductStock = (product) => Number(product?.stockQty ?? product?.stockQuantity ?? 0);
const isProductActive = (product) => product?.status !== false;

const parseDiscountCode = (rawCode) => {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;

  const directPercentMatch = code.match(/^(\d{1,2})%$/);
  if (directPercentMatch) {
    const percent = Number(directPercentMatch[1]);
    if (percent >= 1 && percent <= 90) {
      return {
        code,
        type: 'percent',
        value: percent,
        label: `${percent}% off`,
      };
    }
  }

  const directAmountMatch = code.match(/^\d+(?:\.\d{1,2})?$/);
  if (directAmountMatch) {
    const amount = Number(code);
    if (amount > 0) {
      return {
        code,
        type: 'fixed',
        value: amount,
        label: `${formatCurrency(amount)} off`,
      };
    }
  }

  const percentMatch = code.match(/^(?:SAVE|DISC|OFF|KH)(\d{1,2})$/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    if (percent >= 1 && percent <= 90) {
      return {
        code,
        type: 'percent',
        value: percent,
        label: `${percent}% off`,
      };
    }
  }

  const flatMatch = code.match(/^LESS(\d{1,4})$/);
  if (flatMatch) {
    const amount = Number(flatMatch[1]);
    if (amount > 0) {
      return {
        code,
        type: 'fixed',
        value: amount,
        label: `${formatCurrency(amount)} off`,
      };
    }
  }

  return null;
};

const keypadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

const StaffPOS = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState('Cash');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [selectedCartItemId, setSelectedCartItemId] = useState(null);
  const [qtyInput, setQtyInput] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [alertPopup, setAlertPopup] = useState(null);
  const [toastAlert, setToastAlert] = useState(null);
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  const [allProductsSearch, setAllProductsSearch] = useState('');
  const [showAddedOnly, setShowAddedOnly] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [customerDisplayWindow, setCustomerDisplayWindow] = useState(null);
  const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [customerDisplayPhase, setCustomerDisplayPhase] = useState('idle');
  const [thankYouUntil, setThankYouUntil] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [autoDownloadReceiptPdf, setAutoDownloadReceiptPdf] = useState(false);
  const containerRef = useRef(null);
  const shouldRestoreFullscreenRef = useRef(false);

  const restoreFullscreenIfNeeded = async () => {
    if (!shouldRestoreFullscreenRef.current || document.fullscreenElement) {
      return;
    }

    try {
      await containerRef.current?.requestFullscreen();
    } catch {
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async (showLoader = false) => {
      if (showLoader && mounted) {
        setLoading(true);
      }

      try {
        setError('');
        const [productsRes, categoriesRes] = await Promise.allSettled([
          api.get('/products'),
          api.get('/categories'),
        ]);

        if (!mounted) {
          return;
        }

        const productItems = productsRes.status === 'fulfilled' && Array.isArray(productsRes.value?.data)
          ? productsRes.value.data
          : [];

        const categoryItems = categoriesRes.status === 'fulfilled' && Array.isArray(categoriesRes.value?.data)
          ? categoriesRes.value.data
          : [];

        const activeProducts = productItems
          .filter(isProductActive)
          .sort((left, right) => (left.productName || '').localeCompare(right.productName || ''));

        setProducts(activeProducts);
        setCategories(categoryItems);
      } catch {
        if (mounted) {
          setError('Failed to load products.');
        }
      } finally {
        if (mounted && showLoader) {
          setLoading(false);
        }
      }
    };

    fetchData(true);
    const refreshId = window.setInterval(() => fetchData(false), 10000);

    return () => {
      mounted = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    if (!error && !successMsg) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError('');
      setSuccessMsg('');
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [error, successMsg]);

  useEffect(() => {
    if (!toastAlert) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastAlert(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [toastAlert]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [isFullscreen]);

  const categoryChips = useMemo(() => {
    const map = new Map();

    categories.forEach((category) => {
      const id = String(category?.categoryId ?? category?.id ?? '');
      const name = category?.categoryName || category?.name;

      if (id && name) {
        map.set(id, { id, name });
      }
    });

    products.forEach((product) => {
      const id = String(product?.categoryId ?? product?.category?.categoryId ?? '');
      const name = product?.category?.categoryName || product?.categoryName;

      if (id && name && !map.has(id)) {
        map.set(id, { id, name });
      }
    });

    return [{ id: 'all', name: 'All' }, ...Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name))];
  }, [categories, products]);

  const categoryNameMap = useMemo(() => {
    const map = new Map();
    categoryChips.forEach((chip) => {
      if (chip.id !== 'all') {
        map.set(chip.id, chip.name);
      }
    });
    return map;
  }, [categoryChips]);

  const getCategoryName = (product) => {
    const fromRelation = product?.category?.categoryName || product?.categoryName;
    if (fromRelation) {
      return fromRelation;
    }

    const id = String(product?.categoryId ?? product?.category?.categoryId ?? '');
    return categoryNameMap.get(id) || 'Uncategorized';
  };

  const getCategoryId = (product) => String(product?.categoryId ?? product?.category?.categoryId ?? '');

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    products.forEach((product) => {
      const id = getCategoryId(product);
      if (!id) return;
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = activeCategory === 'all' || getCategoryId(product) === activeCategory;
      const matchesSearch = !query
        || (product.productName || '').toLowerCase().includes(query)
        || (product.barcode || '').toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, search]);

  const cartQtyByProductId = useMemo(() => {
    const map = new Map();
    cart.forEach((item) => {
      map.set(item.productId, Number(item.qty) || 0);
    });
    return map;
  }, [cart]);

  const allProductsForPopup = useMemo(() => {
    const query = allProductsSearch.trim().toLowerCase();
    return products.filter((product) => {
      const inCart = (cartQtyByProductId.get(product.productId) || 0) > 0;
      if (showAddedOnly && !inCart) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        (product.productName || '').toLowerCase().includes(query)
        || (product.barcode || '').toLowerCase().includes(query)
        || (
          product?.category?.categoryName
          || product?.categoryName
          || categoryNameMap.get(String(product?.categoryId ?? product?.category?.categoryId ?? ''))
          || 'Uncategorized'
        ).toLowerCase().includes(query)
      );
    });
  }, [allProductsSearch, cartQtyByProductId, categoryNameMap, products, showAddedOnly]);

  const openAddedProductsModal = () => {
    setShowAddedOnly(true);
    setAllProductsSearch('');
    setShowAllProductsModal(true);
  };

  const selectedCartItem = useMemo(
    () => cart.find((item) => item.productId === selectedCartItemId) || null,
    [cart, selectedCartItemId],
  );

  const cartCount = useMemo(() => cart.reduce((count, item) => count + item.qty, 0), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((total, item) => total + getProductPrice(item) * item.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (!appliedDiscount || subtotal <= 0) {
      return 0;
    }

    if (appliedDiscount.type === 'percent') {
      return Math.min(subtotal, (subtotal * appliedDiscount.value) / 100);
    }

    return Math.min(subtotal, appliedDiscount.value);
  }, [appliedDiscount, subtotal]);

  const grandTotal = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const amountTendered = useMemo(() => {
    if (payMethod !== 'Cash') {
      return grandTotal;
    }

    const parsed = Number(amountPaidInput);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountPaidInput, grandTotal, payMethod]);
  const changeAmount = useMemo(
    () => (payMethod === 'Cash' ? Math.max(0, amountTendered - grandTotal) : 0),
    [amountTendered, grandTotal, payMethod],
  );

  const showFeedback = (message, type = 'success', options = {}) => {
    const { popup = false, toast = false, title } = options;

    if (toast) {
      setToastAlert({
        type,
        title: title || (type === 'error' ? 'Alert' : 'Success'),
        message,
      });
    }

    if (type === 'error') {
      setSuccessMsg('');
      setError(message);

      if (popup) {
        setAlertPopup({
          type,
          title: title || 'Alert',
          message,
        });
      }

      return;
    }

    setError('');
    setSuccessMsg(message);

    if (popup) {
      setAlertPopup({
        type,
        title: title || 'Success',
        message,
      });
    }
  };

  const addToCart = (product, quantity = 1) => {
    const stock = getProductStock(product);
    const amount = Math.max(1, Number(quantity) || 1);

    if (stock <= 0) {
      showFeedback('This product is out of stock.', 'error', { popup: true, title: 'Out Of Stock' });
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.productId);
      const nextQty = (existing?.qty || 0) + amount;

      if (nextQty > stock) {
        showFeedback(`Only ${stock} item(s) available in stock.`, 'error', { popup: true, title: 'Stock Limit' });
        return currentCart;
      }

      if (existing) {
        return currentCart.map((item) => (
          item.productId === product.productId
            ? { ...item, qty: nextQty }
            : item
        ));
      }

      return [...currentCart, { ...product, qty: amount }];
    });

    setSelectedCartItemId(product.productId);
    setQtyInput('');
    showFeedback(`${product.productName || 'Item'} added to cart.`, 'success', { toast: true, title: 'Added To Cart' });
  };

  const updateItemQty = (productId, nextQty) => {
    setCart((currentCart) => currentCart.reduce((items, item) => {
      if (item.productId !== productId) {
        items.push(item);
        return items;
      }

      const stock = getProductStock(item);
      const safeQty = Math.min(Math.max(0, Number(nextQty) || 0), stock);

      if (safeQty <= 0) {
        return items;
      }

      items.push({ ...item, qty: safeQty });
      return items;
    }, []));
  };

  const changeQty = (productId, delta) => {
    const cartItem = cart.find((item) => item.productId === productId);
    if (!cartItem) {
      return;
    }

    const nextQty = cartItem.qty + delta;
    const stock = getProductStock(cartItem);

    if (nextQty > stock) {
      showFeedback(`Only ${stock} item(s) available in stock.`, 'error', { popup: true, title: 'Stock Limit' });
      return;
    }

    updateItemQty(productId, nextQty);
    setSelectedCartItemId(productId);
  };

  const removeItem = (productId) => {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));

    if (selectedCartItemId === productId) {
      setSelectedCartItemId(null);
      setQtyInput('');
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCartItemId(null);
    setQtyInput('');
    setDiscountCodeInput('');
    setAppliedDiscount(null);
    setAmountPaidInput('');
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalQty(1);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setModalQty(1);
  };

  const applyKeypadQuantity = () => {
    if (!selectedCartItem || !qtyInput) {
      return;
    }

    const requestedQty = Number(qtyInput);
    const stock = getProductStock(selectedCartItem);

    if (requestedQty > stock) {
      showFeedback(`Only ${stock} item(s) available in stock.`, 'error', { popup: true, title: 'Stock Limit' });
      return;
    }

    updateItemQty(selectedCartItem.productId, requestedQty);
    setQtyInput('');
    showFeedback('Cart quantity updated.');
  };

  const handleKeypadPress = (value) => {
    setQtyInput((current) => (current === '0' ? value : `${current}${value}`).slice(0, 3));
  };

  const applyDiscountCodeValue = (rawCode) => {
    if (subtotal <= 0) {
      showFeedback('Add items to cart before applying a discount.', 'error', { popup: true, title: 'Cannot Apply Discount' });
      return;
    }

    const parsed = parseDiscountCode(rawCode);
    if (!parsed) {
      showFeedback('Invalid discount input. Use SAVE10, LESS5, 50, or 10%.', 'error', { popup: true, title: 'Invalid Discount' });
      return;
    }

    setAppliedDiscount(parsed);
    setDiscountCodeInput(parsed.code);
    showFeedback(`Discount applied: ${parsed.label}.`);
  };

  const applyDiscountCode = () => {
    applyDiscountCodeValue(discountCodeInput);
  };

  const applyQuickPromo = (code) => {
    applyDiscountCodeValue(code);
  };

  const clearDiscountCode = () => {
    setDiscountCodeInput('');
    setAppliedDiscount(null);
    showFeedback('Discount removed.');
  };

  useEffect(() => {
    if (customerDisplayPhase !== 'thankyou' || !thankYouUntil) {
      return undefined;
    }

    const remainingMs = Math.max(0, thankYouUntil - Date.now());
    const timer = window.setTimeout(() => {
      setCustomerDisplayPhase('idle');
      setThankYouUntil(null);
    }, remainingMs);

    return () => window.clearTimeout(timer);
  }, [customerDisplayPhase, thankYouUntil]);

  // Sync cart and payment data to customer display window
  useEffect(() => {
    const displayState = {
      cart: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        price: getProductPrice(item),
        qty: item.qty,
        lineTotal: getProductPrice(item) * item.qty,
        imageUrl: item.imageUrl,
      })),
      paymentMethod: payMethod,
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      total: Number(grandTotal.toFixed(2)),
      amountTendered: Number((payMethod === 'Cash' ? amountTendered : grandTotal).toFixed(2)),
      changeAmount: Number(changeAmount.toFixed(2)),
      displayPhase: customerDisplayPhase,
      thankYouUntil,
      updatedAt: new Date().toISOString(),
    };

    // Save to localStorage for customer display window to read
    localStorage.setItem(CUSTOMER_DISPLAY_STATE_KEY, JSON.stringify(displayState));

    // Send custom event to notify customer display window of update
    window.dispatchEvent(new Event('khmart-customer-display-updated'));
  }, [
    amountTendered,
    cart,
    changeAmount,
    customerDisplayPhase,
    discountAmount,
    grandTotal,
    payMethod,
    subtotal,
    thankYouUntil,
  ]);

  const openPaymentConfirmationPopup = () => {
    if (cart.length === 0 || paying) {
      return;
    }

    if (payMethod === 'Cash' && amountTendered < grandTotal) {
      showFeedback('Cash received must cover the total amount.', 'error', { popup: true, title: 'Insufficient Cash' });
      return;
    }

    setIsPaymentPopupOpen(true);
    setCustomerDisplayPhase(payMethod === 'Cash' ? 'idle' : 'pending');
  };

  const closePaymentConfirmationPopup = () => {
    if (isConfirmingPayment) {
      return;
    }

    setIsPaymentPopupOpen(false);
    setCustomerDisplayPhase('idle');
  };

  const confirmCheckout = async () => {
    if (cart.length === 0 || paying) {
      return;
    }

    const cartSnapshot = [...cart];
    const createdAtIso = new Date().toISOString();

    setPaying(true);
    setIsConfirmingPayment(true);

    try {
      const userId = Number(localStorage.getItem('userId')) || 0;

      const response = await api.post('/sales', {
        userId,
        saleDate: createdAtIso,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          price: Number(getProductPrice(item).toFixed(2)),
        })),
        paymentMethod: payMethod,
        amountTendered: Number((payMethod === 'Cash' ? amountTendered : grandTotal).toFixed(2)),
        discountCode: appliedDiscount?.code || null,
        discountAmount: Number(discountAmount.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
      });

      const fallbackSale = {
        saleId: `POS-${Date.now()}`,
        saleDate: createdAtIso,
        paymentMethod: payMethod,
        subtotal: Number(subtotal.toFixed(2)),
        amountTendered: Number((payMethod === 'Cash' ? amountTendered : grandTotal).toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        totalAmount: Number(grandTotal.toFixed(2)),
        user: {
          fullName: localStorage.getItem('fullName') || 'Staff',
        },
        items: cartSnapshot.map((item) => ({
          productName: item.productName,
          quantity: Number(item.qty || 0),
          price: Number(getProductPrice(item).toFixed(2)),
          product: {
            productName: item.productName,
          },
        })),
      };

      const responseSale = response?.data && typeof response.data === 'object' ? response.data : {};
      const normalizedSale = {
        ...fallbackSale,
        ...responseSale,
        paymentMethod: responseSale.paymentMethod || fallbackSale.paymentMethod,
        subtotal: Number(responseSale.subtotal ?? fallbackSale.subtotal),
        discountAmount: Number(responseSale.discountAmount ?? fallbackSale.discountAmount),
        totalAmount: Number(responseSale.totalAmount ?? responseSale.amount ?? fallbackSale.totalAmount),
        amountTendered: Number(responseSale.amountTendered ?? fallbackSale.amountTendered),
        saleDate: responseSale.saleDate || fallbackSale.saleDate,
        user: responseSale.user || fallbackSale.user,
        saleDetails: Array.isArray(responseSale.saleDetails) && responseSale.saleDetails.length > 0
          ? responseSale.saleDetails
          : undefined,
        items: Array.isArray(responseSale.items) && responseSale.items.length > 0
          ? responseSale.items
          : fallbackSale.items,
      };

      setReceiptSale(normalizedSale);
      setAutoPrintReceipt(false);
      setAutoDownloadReceiptPdf(false);
      shouldRestoreFullscreenRef.current = Boolean(document.fullscreenElement);
      setIsReceiptModalOpen(true);

      setIsPaymentPopupOpen(false);
      setCustomerDisplayPhase('thankyou');
      setThankYouUntil(Date.now() + 10000);
      localStorage.setItem('khmart_last_sale_at', String(Date.now()));
      clearCart();
      showFeedback(`Payment completed by ${payMethod}.${payMethod === 'Cash' ? ` Change: ${formatCurrency(changeAmount)}.` : ''}`, 'success', { popup: true, title: 'Payment Completed' });
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to process sale. Try again.', 'error', { popup: true, title: 'Payment Failed' });
    } finally {
      setIsConfirmingPayment(false);
      setPaying(false);
    }
  };

  const openCustomerDisplay = () => {
    if (customerDisplayWindow && !customerDisplayWindow.closed) {
      customerDisplayWindow.focus();
      return;
    }

    const newWindow = window.open('/customer-display', 'KHMartCustomerDisplay', 'width=1024,height=768,resizable=yes');
    if (newWindow) {
      setCustomerDisplayWindow(newWindow);
      showFeedback('Customer display opened in new window.', 'success', { toast: true, title: 'Display Opened' });
    } else {
      showFeedback('Failed to open customer display. Check popup blocker settings.', 'error', { popup: true, title: 'Popup Blocked' });
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      showFeedback('Fullscreen is not available on this browser.', 'error', { popup: true, title: 'Fullscreen Error' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${isFullscreen ? 'h-screen rounded-none p-2 sm:p-3' : 'h-full min-h-[640px] rounded-none p-3 sm:p-4 lg:p-5'} bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(180deg,_#f6f9ff_0%,_#eef4ff_52%,_#e9f7f3_100%)]`}
    >
      {toastAlert && (
        <div className="fixed right-4 top-4 z-[130] w-[min(360px,calc(100vw-2rem))] rounded-none border border-emerald-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${toastAlert.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {toastAlert.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900">{toastAlert.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{toastAlert.message}</p>
            </div>
          </div>
        </div>
      )}

      {alertPopup && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-none border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${alertPopup.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {alertPopup.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{alertPopup.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{alertPopup.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                className="inline-flex items-center justify-center w-8 h-8 transition rounded-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                className={`w-full rounded-none px-4 py-2.5 text-sm font-black text-white transition ${alertPopup.type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`grid h-full min-h-0 gap-4 ${compactMode ? 'lg:grid-cols-[minmax(0,1fr)_500px] xl:grid-cols-[minmax(0,1fr)_560px]' : 'lg:grid-cols-[minmax(0,1fr)_560px] 2xl:grid-cols-[minmax(0,1fr)_620px]'}`}>
        <section className="flex min-h-0 flex-col overflow-hidden rounded-none border border-white/80 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur-md">
          <div className={`${compactMode ? 'px-3 py-3 sm:px-4' : 'px-4 py-4 sm:px-6'} border-b border-slate-200/80 bg-white/70 backdrop-blur`}>
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-700/80">Sell / POS</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">KH Mart</h1>
              </div>

              {isFullscreen && (
                <div className="absolute flex-col items-center justify-center hidden -translate-x-1/2 lg:flex left-1/2">
                  <span className="text-base font-black text-slate-800">
                    {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={openCustomerDisplay}
                  className="inline-flex items-center gap-1.5 rounded-none border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900"
                >
                  Add Customer Display
                </button>
                <button
                  type="button"
                  onClick={() => setCompactMode((previous) => !previous)}
                  className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {compactMode ? 'Comfort' : 'Compact'}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
              </div>
            </div>

            {isFullscreen && (
              <div className="flex flex-col items-center justify-center lg:hidden">
                <span className="text-sm font-black text-slate-800">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}

            <div className="relative mt-4">
              <Search className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-4 top-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Scan barcode or search name..."
                className="w-full pl-12 pr-4 text-base transition bg-white border rounded-none outline-none h-14 border-slate-200 text-slate-800 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex gap-3 pb-1 mt-4 overflow-x-auto">
              {categoryChips.map((category) => {
                const isActive = category.id === activeCategory;
                const count = category.id === 'all' ? products.length : (categoryCounts.get(category.id) || 0);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                      className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    {category.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 px-4 py-4 overflow-y-auto sm:px-6">
            {loading ? (
              <div className="flex items-center justify-center h-72 text-slate-400">
                <Loader className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center border border-dashed rounded-none h-72 border-slate-200 bg-slate-50 text-slate-400">
                <Package className="w-10 h-10 mb-3" />
                <p className="text-lg font-semibold text-slate-600">No products found</p>
                <p className="mt-1 text-sm">Try another search or switch category.</p>
              </div>
            ) : (
              <div className={`grid gap-4 ${compactMode ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}`}>
                {filteredProducts.map((product) => {
                  const stock = getProductStock(product);
                  const imageUrl = toAbsoluteImageUrl(product.imageUrl);

                  return (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => openProductModal(product)}
                        className="group overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_18px_45px_rgba(37,99,235,0.16)]"
                    >
                      <div className={`relative overflow-hidden bg-[linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_55%,_#ecfeff_100%)] ${compactMode ? 'h-40' : 'h-48'} flex items-center justify-center`}>
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.productName} className="object-contain w-full h-full p-2 transition duration-300 group-hover:scale-110" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <Package className="w-10 h-10" />
                          </div>
                        )}
                          <div className="absolute px-3 py-1 text-xs font-semibold rounded-full shadow-sm left-3 top-3 bg-white/95 text-slate-700">
                          {getCategoryName(product)}
                        </div>
                      </div>

                      <div className={`${compactMode ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
                        <div>
                          <h2 className={`${compactMode ? 'text-sm' : 'text-base'} font-bold line-clamp-2 text-slate-900`}>{product.productName}</h2>
                          <p className="mt-1 line-clamp-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            {product.barcode || 'No barcode'}
                          </p>
                        </div>

                        <div className="pt-2 space-y-2 border-t border-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-500">Price</p>
                            <p className={`${compactMode ? 'text-lg' : 'text-2xl'} font-black text-blue-600`}>{formatCurrency(getProductPrice(product))}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-slate-500">Stock</p>
                            <div className={`rounded-full border px-2.5 py-1.5 text-xs font-bold ${stock > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                              {stock}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-none border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-md">
          <div className="px-4 py-4 border-b border-slate-200 sm:px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-none bg-blue-50 p-2.5 text-blue-600">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Cart</h2>
                  <p className="text-sm text-slate-500">Tap an item to adjust it</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={openAddedProductsModal}
                  className="rounded-none border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  View Added
                </button>
                <div className="flex h-10 min-w-10 items-center justify-center rounded-none bg-blue-600 px-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)]">
                  {cartCount}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[34px_minmax(0,1fr)_58px_56px_60px_24px] gap-1 border-b border-slate-100 px-2 py-2 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400 sm:grid-cols-[40px_minmax(0,1fr)_68px_62px_68px_28px] sm:gap-2 sm:px-4 sm:text-[10px] sm:tracking-[0.12em]">
            <span>Image</span>
            <span>Name</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">Total</span>
            <span className="text-right">X</span>
          </div>

          <div className="flex-1 min-h-0 px-2 py-2 overflow-auto sm:px-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center border border-dashed rounded-none border-slate-200 bg-slate-50 text-slate-400">
                <ShoppingCart className="mb-4 h-14 w-14" />
                <p className="text-xl font-bold text-slate-600">Cart is empty</p>
                <p className="mt-2 text-sm">Select a product from the left to start the sale.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {cart.map((item) => {
                  const imageUrl = toAbsoluteImageUrl(item.imageUrl);
                  const lineTotal = getProductPrice(item) * item.qty;
                  const selected = selectedCartItemId === item.productId;

                  return (
                    <button
                      key={item.productId}
                      type="button"
                      onClick={() => setSelectedCartItemId(item.productId)}
                      className={`grid w-full grid-cols-[34px_minmax(0,1fr)_58px_56px_60px_24px] items-center gap-1 rounded-none border px-1.5 py-2 text-left transition sm:grid-cols-[40px_minmax(0,1fr)_68px_62px_68px_28px] sm:gap-2 sm:px-2 ${selected ? 'border-blue-300 bg-blue-50/60 shadow-[0_8px_24px_rgba(59,130,246,0.15)]' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                    >
                      <div className="overflow-hidden rounded-none h-7 w-7 bg-slate-100 sm:h-8 sm:w-8">
                        {imageUrl ? (
                          <img src={imageUrl} alt={item.productName} className="object-cover w-full h-full" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-slate-900 sm:text-sm">{item.productName}</p>
                        <p className="mt-0.5 text-[10px] truncate text-slate-500">{getCategoryName(item)}</p>
                      </div>

                      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            changeQty(item.productId, -1);
                          }}
                          className="inline-flex items-center justify-center w-4 h-4 bg-white border rounded-none border-slate-200 text-slate-600 hover:border-slate-300 sm:h-5 sm:w-5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-3 text-xs font-bold text-center text-slate-900 sm:w-4 sm:text-sm">{item.qty}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            changeQty(item.productId, 1);
                          }}
                          className="inline-flex items-center justify-center w-4 h-4 text-blue-600 border border-blue-200 rounded-none bg-blue-50 hover:border-blue-300 sm:h-5 sm:w-5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-[11px] font-semibold text-right text-slate-700 sm:text-sm">{formatCurrency(getProductPrice(item))}</div>
                      <div className="text-xs font-black text-right text-slate-900 sm:text-sm">{formatCurrency(lineTotal)}</div>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item.productId);
                        }}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-none text-slate-300 hover:bg-red-50 hover:text-red-500 sm:h-6 sm:w-6"
                      >
                        <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isFullscreen && (
          <div className="px-4 py-3 bg-white border-t border-slate-200 sm:px-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
              <div className="space-y-3">
                <div className="rounded-none border border-slate-200 bg-slate-50 px-2.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Discount Code</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      value={discountCodeInput}
                      onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                      placeholder="SAVE10 / LESS5 / 50 / 10%"
                      className="w-full px-2 text-xs font-semibold bg-white border rounded-none outline-none h-9 border-slate-200 text-slate-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={applyDiscountCode}
                      disabled={cart.length === 0}
                      className="h-9 rounded-none border border-emerald-300 bg-emerald-500 px-2.5 text-xs font-black text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={clearDiscountCode}
                      disabled={!appliedDiscount && !discountCodeInput}
                      className="h-9 rounded-none border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                  {appliedDiscount && (
                    <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">
                      Applied {appliedDiscount.code}: {appliedDiscount.label}
                    </p>
                  )}
                </div>

                <div className="px-3 py-3 bg-white border rounded-none border-slate-200">
                  <div className="space-y-1.5 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-700">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Discount</span>
                      <span className="font-semibold text-emerald-600">- {formatCurrency(discountAmount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <span className="text-xl font-black text-slate-900">Total:</span>
                    <span className="text-3xl font-black tracking-tight text-blue-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <div className="px-3 py-3 border rounded-none border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Payment Method</p>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700">{payMethod}</span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Cash', value: 'Cash', icon: Banknote, activeClass: 'from-emerald-500 to-teal-500' },
                      { label: 'ABA', value: 'ABA', icon: ReceiptText, activeClass: 'from-blue-500 to-indigo-500' },
                      { label: 'Card', value: 'Card', icon: CreditCard, activeClass: 'from-slate-700 to-slate-900' },
                    ].map((method) => {
                      const active = payMethod === method.value;
                      const Icon = method.icon;

                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPayMethod(method.value)}
                          className={`rounded-none border px-2 py-2.5 text-center text-xs font-bold transition ${active ? `border-transparent bg-gradient-to-r ${method.activeClass} text-white shadow-xl` : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                        >
                          <Icon className="w-5 h-5 mx-auto mb-1" />
                          {method.label}
                        </button>
                      );
                    })}
                  </div>

                  {payMethod === 'Cash' ? (
                    <>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountPaidInput}
                          onChange={(event) => setAmountPaidInput(event.target.value)}
                          placeholder="Cash received"
                          className="w-full px-2 text-xs font-semibold bg-white border rounded-none outline-none h-9 border-slate-200 text-slate-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                          type="button"
                          onClick={() => setAmountPaidInput(grandTotal > 0 ? grandTotal.toFixed(2) : '')}
                          className="h-9 rounded-none border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-700 hover:border-slate-300"
                        >
                          Exact
                        </button>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Received</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(amountTendered)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Change</span>
                          <span className="font-semibold text-emerald-600">{formatCurrency(changeAmount)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {payMethod} payment will charge the exact total amount of {formatCurrency(grandTotal)}.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-none border border-slate-200 bg-white px-2.5 py-2 text-center">
                  <p className="text-xs text-slate-400">Qty: <span className="font-bold text-blue-600">{qtyInput || selectedCartItem?.qty || '-'}</span></p>
                  {selectedCartItem && (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">Selected: {selectedCartItem.productName}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {keypadDigits.map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className={`py-1.5 text-lg font-bold transition bg-white border rounded-none border-slate-200 text-slate-900 hover:border-blue-200 hover:text-blue-600 ${digit === '0' ? 'col-span-2' : ''}`}
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setQtyInput('')}
                    className="py-1.5 text-lg font-bold transition bg-white border rounded-none border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  >
                    C
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {[
                    { code: 'SAVE10', label: '10% OFF' },
                    { code: 'DISC15', label: '15% OFF' },
                    { code: 'LESS5', label: '$5 OFF' },
                  ].map((promo) => (
                    <button
                      key={promo.code}
                      type="button"
                      onClick={() => applyQuickPromo(promo.code)}
                      disabled={cart.length === 0}
                      className="rounded-none border border-amber-200 bg-amber-50 px-1.5 py-1.5 text-center text-[10px] font-black text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {promo.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-[1.7fr_1.15fr_1fr] gap-1">
                  <button
                    type="button"
                    onClick={applyKeypadQuantity}
                    className="py-1.5 text-sm font-black text-white transition rounded-none shadow-lg bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600"
                  >
                    ENTER
                  </button>
                  <button
                    type="button"
                    onClick={openPaymentConfirmationPopup}
                    disabled={cart.length === 0 || paying}
                    className="px-2 py-1.5 text-[11px] font-black text-center text-white transition rounded-none shadow-lg bg-violet-600 shadow-violet-200 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ReceiptText className="mx-auto mb-0.5 h-3.5 w-3.5" />
                    {paying ? 'Saving' : 'Receipt'}
                  </button>
                  <button
                    type="button"
                    onClick={clearCart}
                    disabled={cart.length === 0}
                    className="px-2 py-1.5 text-[11px] font-black text-center text-white transition bg-red-500 rounded-none shadow-lg shadow-red-200 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="mx-auto mb-0.5 h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
          )}
        </aside>
      </div>

      {showAllProductsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-950/45 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-none border border-white/70 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 sm:px-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">{showAddedOnly ? 'Added Products' : 'All Products'}</h3>
                <p className="text-xs text-slate-500">Click Add to put item into cart quickly.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddedOnly((prev) => !prev)}
                  className={`h-9 rounded-none border px-2.5 text-xs font-black transition ${showAddedOnly ? 'border-emerald-300 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                >
                  {showAddedOnly ? 'Showing Added' : 'Show Added Only'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllProductsModal(false);
                    setAllProductsSearch('');
                  }}
                  className="inline-flex items-center justify-center transition rounded-none w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 sm:px-6">
              <div className="relative">
                <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
                <input
                  value={allProductsSearch}
                  onChange={(event) => setAllProductsSearch(event.target.value)}
                  placeholder="Search name, barcode or category..."
                  className="w-full h-10 pl-10 pr-3 text-sm bg-white border rounded-none outline-none border-slate-200 text-slate-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto px-4 py-3 sm:px-6">
              {allProductsForPopup.length === 0 ? (
                <p className="py-8 text-sm text-center text-slate-400">No products match your search.</p>
              ) : (
                <div className="space-y-2">
                  {allProductsForPopup.map((product) => {
                    const stock = getProductStock(product);
                    const inCartQty = cartQtyByProductId.get(product.productId) || 0;
                    return (
                      <div
                        key={product.productId}
                        className="grid grid-cols-[minmax(0,1fr)_70px_120px_74px] items-center gap-2 rounded-none border border-slate-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate text-slate-900">{product.productName}</p>
                          <p className="text-[11px] truncate text-slate-500">{getCategoryName(product)} • {product.barcode || 'No barcode'}{inCartQty > 0 ? ` • In Cart: ${inCartQty}` : ''}</p>
                        </div>
                        <p className="text-xs font-semibold text-center text-slate-600">{stock}</p>
                        <p className="text-sm font-black text-right text-blue-700">{formatCurrency(getProductPrice(product))}</p>
                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          disabled={stock <= 0}
                          className="h-8 text-xs font-black text-white transition border rounded-none border-emerald-300 bg-emerald-500 hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950/45 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-none border border-white/70 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.24)]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900">{selectedProduct.productName}</h3>
                <p className="mt-1 text-sm text-slate-500">{getCategoryName(selectedProduct)}</p>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                className="inline-flex items-center justify-center w-10 h-10 transition rounded-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-6 text-center">
              <div className="mx-auto mb-5 h-56 w-full max-w-xs overflow-hidden rounded-none bg-[linear-gradient(135deg,_#eff6ff_0%,_#f8fafc_55%,_#ecfeff_100%)] flex items-center justify-center">
                {toAbsoluteImageUrl(selectedProduct.imageUrl) ? (
                  <img src={toAbsoluteImageUrl(selectedProduct.imageUrl)} alt={selectedProduct.productName} className="object-contain w-full h-full p-3" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300">
                    <Package className="w-12 h-12" />
                  </div>
                )}
              </div>

              <p className="text-5xl font-black tracking-tight text-blue-600">{formatCurrency(getProductPrice(selectedProduct))}</p>
              <p className="mt-3 text-sm font-medium text-emerald-600">Stock available: {getProductStock(selectedProduct)}</p>

              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setModalQty((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center justify-center transition bg-white border rounded-none shadow-sm h-14 w-14 border-slate-200 text-slate-700 hover:border-slate-300"
                >
                  <Minus className="w-6 h-6" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={getProductStock(selectedProduct)}
                  value={modalQty}
                  onChange={(event) => {
                    const nextQty = Number(event.target.value);
                    if (Number.isNaN(nextQty)) {
                      return;
                    }

                    const stock = getProductStock(selectedProduct);
                    setModalQty(Math.min(stock, Math.max(1, nextQty)));
                  }}
                  onBlur={() => {
                    const stock = getProductStock(selectedProduct);
                    setModalQty((current) => Math.min(stock, Math.max(1, Number(current) || 1)));
                  }}
                  className="h-14 min-w-24 rounded-none border border-slate-200 bg-slate-50 px-3 text-center text-3xl font-black text-slate-900 outline-none [appearance:textfield] focus:border-blue-300 focus:ring-4 focus:ring-blue-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setModalQty((current) => Math.min(getProductStock(selectedProduct), current + 1))}
                  className="inline-flex items-center justify-center text-blue-600 transition border border-blue-200 rounded-none shadow-sm h-14 w-14 bg-blue-50 hover:border-blue-300"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-6 py-5 border-t border-slate-200">
              <button
                type="button"
                onClick={closeProductModal}
                className="px-5 py-4 text-lg font-bold transition bg-white border rounded-none border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct, modalQty);
                  closeProductModal();
                }}
                className="px-5 py-4 text-lg font-black text-white transition rounded-none shadow-xl bg-gradient-to-r from-blue-600 to-blue-500 shadow-blue-200 hover:from-blue-700 hover:to-blue-600"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentPopupOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-sky-200/40 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.26)]">
            <div className="bg-[linear-gradient(140deg,#1d4ed8_0%,#0ea5e9_55%,#059669_100%)] px-5 py-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-100">Waiting For Staff Confirm</p>
              <h3 className="mt-1 text-xl font-black">Payment Confirmation</h3>
              <p className="mt-1 text-sm text-sky-100">Review payment details, then confirm to finish sale.</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="p-3 border rounded-xl border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                  <span>Discount</span>
                  <span className="font-bold text-emerald-600">- {formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200">
                  <span className="text-base font-black text-slate-900">Total</span>
                  <span className="text-2xl font-black text-blue-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="p-3 text-center border rounded-xl border-sky-200 bg-sky-50">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Payment Method</p>
                <p className="mt-1 text-base font-black text-sky-900">{payMethod}</p>
                <p className="mt-2 text-sm font-semibold text-sky-700">Staff confirmation required</p>
                {payMethod === 'Cash' && (
                  <div className="mt-3 space-y-1.5 border-t border-sky-200 pt-2 text-left text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Received</span>
                      <span className="font-bold text-slate-900">{formatCurrency(amountTendered)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Change</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(changeAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closePaymentConfirmationPopup}
                  disabled={isConfirmingPayment}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCheckout}
                  disabled={isConfirmingPayment}
                  className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isConfirmingPayment ? 'Confirming...' : 'Staff Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrintReceiptModal
        isOpen={isReceiptModalOpen}
        sale={receiptSale}
        autoPrint={autoPrintReceipt}
        autoDownloadPdf={autoDownloadReceiptPdf}
        autoCloseAfterAutoActions={false}
        onAfterPrint={restoreFullscreenIfNeeded}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setAutoPrintReceipt(false);
          setAutoDownloadReceiptPdf(false);
          restoreFullscreenIfNeeded();
        }}
      />
    </div>
  );
};

export default StaffPOS;

