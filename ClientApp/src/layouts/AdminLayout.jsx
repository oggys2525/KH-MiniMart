import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  Bell,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Wallet,
  UserCheck,
  Warehouse,
  FileText,
  Truck,
  Shield,
  Loader,
} from 'lucide-react';
import api from '../services/api';
import { resolveLogoUrl, toAbsoluteImageUrl } from '../utils/imageUrl';

const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';
const LOGO_KEY = 'khmart_logo_url';
const LOGO_UPDATED_EVENT = 'khmart-logo-updated';

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

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

const NOTIFICATIONS_CLEARED_AT_KEY = 'khmart_admin_notifications_cleared_at';

const ADMIN_AUTO_TRANSLATIONS = {
  Dashboard: 'ផ្ទាំងគ្រប់គ្រង',
  Products: 'ទំនិញ',
  Categories: 'ប្រភេទ',
  'Manage Stock': 'គ្រប់គ្រងស្តុក',
  'Stock Ins': 'ស្តុកចូល',
  'Inventory Alerts': 'ការជូនដំណឹងស្តុក',
  Orders: 'ការបញ្ជាទិញ',
  'Sales History': 'ប្រវត្តិការលក់',
  'Sales Reports': 'របាយការណ៍ការលក់',
  Payments: 'ការទូទាត់',
  Customers: 'អតិថិជន',
  Users: 'អ្នកប្រើប្រាស់',
  Roles: 'តួនាទី',
  Suppliers: 'អ្នកផ្គត់ផ្គង់',
  'Staff Permissions': 'សិទ្ធិបុគ្គលិក',
  Expenses: 'ចំណាយ',
  Settings: 'ការកំណត់',
  'System Texts': 'អត្ថបទប្រព័ន្ធ',
  MAIN: 'មេ',
  INVENTORY: 'ស្តុក',
  SALES: 'ការលក់',
  MANAGEMENT: 'ការគ្រប់គ្រង',
  OPERATIONS: 'ប្រតិបត្តិការ',
  Logout: 'ចាកចេញ',
  'Sign Out': 'ចាកចេញ',
  Notifications: 'ការជូនដំណឹង',
  'Admin Notifications': 'ការជូនដំណឹងអ្នកគ្រប់គ្រង',
  'No notifications yet.': 'មិនទាន់មានការជូនដំណឹង។',
  Reports: 'របាយការណ៍',
  'Sales performance overview': 'ទិដ្ឋភាពទូទៅនៃលទ្ធផលការលក់',
  Today: 'ថ្ងៃនេះ',
  '7 Days': '៧ ថ្ងៃ',
  'This Month': 'ខែនេះ',
  'All Time': 'គ្រប់ពេល',
  'Total Revenue': 'ចំណូលសរុប',
  'Total Orders': 'ការបញ្ជាទិញសរុប',
  'Avg Order Value': 'តម្លៃមធ្យមក្នុងមួយបញ្ជាទិញ',
  'Revenue by Day': 'ចំណូលតាមថ្ងៃ',
  Peak: 'ខ្ពស់បំផុត',
  Date: 'កាលបរិច្ឆេទ',
  Customer: 'អតិថិជន',
  Amount: 'ចំនួនទឹកប្រាក់',
  'Walk-in': 'អតិថិជនដើរចូល',
  'My Profile': 'ប្រវត្តិរូបខ្ញុំ',
  Staff: 'បុគ្គលិក',
  Username: 'ឈ្មោះអ្នកប្រើ',
  'Full Name': 'ឈ្មោះពេញ',
  'Save Changes': 'រក្សាទុកការផ្លាស់ប្តូរ',
  'Change Password': 'ប្តូរពាក្យសម្ងាត់',
  'Current Password': 'ពាក្យសម្ងាត់បច្ចុប្បន្ន',
  'New Password': 'ពាក្យសម្ងាត់ថ្មី',
  'Confirm New Password': 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី',
  'Update Password': 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់',
  'Password tips': 'គន្លឹះពាក្យសម្ងាត់',
  'Store Information': 'ព័ត៌មានហាង',
  'Phone Number': 'លេខទូរស័ព្ទ',
  'Email Address': 'អ៊ីមែល',
  Address: 'អាសយដ្ឋាន',
  'Regional & Currency': 'តំបន់ និងរូបិយប័ណ្ណ',
  Currency: 'រូបិយប័ណ្ណ',
  Timezone: 'តំបន់ពេលវេលា',
  'Tax Rate (%)': 'អត្រាពន្ធ (%)',
  'Save Settings': 'រក្សាទុកការកំណត់',
  Language: 'ភាសា',
  Theme: 'ផ្ទៃពណ៌',
  'Language & Theme': 'ភាសា និងផ្ទៃពណ៌',
  'All Methods': 'គ្រប់វិធី',
  'All Status': 'គ្រប់ស្ថានភាព',
  Completed: 'បានបញ្ចប់',
  Paid: 'បានបង់',
  Pending: 'កំពុងរង់ចាំ',
  Cancelled: 'បានបោះបង់',
  Refresh: 'ធ្វើបច្ចុប្បន្នភាព',
  Search: 'ស្វែងរក',
  Status: 'ស្ថានភាព',
  'Add New Product': 'បន្ថែមទំនិញថ្មី',
  'Products Management': 'ការគ្រប់គ្រងទំនិញ',
  'Manage your product catalog efficiently': 'គ្រប់គ្រងបញ្ជីទំនិញរបស់អ្នកប្រកបដោយប្រសិទ្ធភាព',
  'Total Products': 'ទំនិញសរុប',
  Active: 'សកម្ម',
  'Low Stock': 'ស្តុកទាប',
  'Out of Stock': 'អស់ស្តុក',
  'Search Products': 'ស្វែងរកទំនិញ',
  'Product name, barcode...': 'ឈ្មោះទំនិញ, បាកូដ...',
  Category: 'ប្រភេទ',
  'All Categories': 'គ្រប់ប្រភេទ',
  Inactive: 'អសកម្ម',
  Clear: 'លុបចោល',
  'No products match your filters': 'រកមិនឃើញទំនិញដែលត្រូវនឹងតម្រង',
  'No products found': 'រកមិនឃើញទំនិញ',
  // Product modal form
  'Create New Product': 'បង្កើតទំនិញថ្មី',
  'Edit Product': 'កែប្រែទំនិញ',
  'Product Name *': 'ឈ្មោះទំនិញ *',
  'Enter product name': 'បញ្ចូលឈ្មោះទំនិញ',
  'Cost Price *': 'តម្លៃដើម *',
  'Selling Price *': 'តម្លៃលក់ *',
  'Barcode *': 'បាកូដ *',
  Barcode: 'បាកូដ',
  'Product Image': 'រូបភាពទំនិញ',
  'Choose an image file from your computer.': 'ជ្រើសរើសឯកសាររូបភាពពីកុំព្យូទ័ររបស់អ្នក។',
  'Category *': 'ប្រភេទ *',
  'Select a category': 'ជ្រើសរើសប្រភេទ',
  'Stock Quantity *': 'បរិមាណស្តុក *',
  Description: 'បរិយាយ',
  'Enter product description': 'បញ្ចូលការបរិយាយទំនិញ',
  Cancel: 'បោះបង់',
  'Create Product': 'បង្កើតទំនិញ',
  'Update Product': 'ធ្វើបច្ចុប្បន្នភាពទំនិញ',
  'Product name is required': 'ត្រូវការឈ្មោះទំនិញ',
  'Selling price is required': 'ត្រូវការតម្លៃលក់',
  'Cost price is required': 'ត្រូវការតម្លៃដើម',
  'Category is required': 'ត្រូវការប្រភេទ',
  'Stock quantity is required': 'ត្រូវការបរិមាណស្តុក',
  'Barcode is required': 'ត្រូវការបាកូដ',
  'Failed to save product': 'បរាជ័យក្នុងការរក្សាទុកទំនិញ',
  'Product updated successfully!': 'ទំនិញត្រូវបានធ្វើបច្ចុប្បន្នភាពដោយជោគជ័យ!',
  'Product created successfully!': 'ទំនិញត្រូវបានបង្កើតដោយជោគជ័យ!',
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isOutOfStockNotification = (item) => {
  const type = String(item?.type || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const message = String(item?.message || '').toLowerCase();
  return type.includes('outofstock') || title.includes('out of stock') || message.includes('out of stock');
};

const playOutOfStockAlert = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(980, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.16);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.36);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.36);

    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch {
    // Keep notification flow stable if browser blocks audio.
  }
};

const translateTextValue = (value, language) => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  let next = value;
  const pairs = Object.entries(ADMIN_AUTO_TRANSLATIONS);

  if (language === 'km') {
    pairs.forEach(([en, km]) => {
      next = next.replace(new RegExp(escapeRegExp(en), 'g'), km);
    });
    return next;
  }

  pairs.forEach(([en, km]) => {
    next = next.replace(new RegExp(escapeRegExp(km), 'g'), en);
  });
  return next;
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifToast, setNotifToast] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [uiPreferences, setUiPreferences] = useState(() => readUiPreferences());
  const notifRef = useRef(null);
  const previousUnreadCountRef = useRef(null);
  const hasLoadedNotificationsRef = useRef(false);
    const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
  const userMenuRef = useRef(null);
  const contentRootRef = useRef(null);
    const normalizedLogoUrl = resolveLogoUrl(logoUrl);
  const t = (en, km) => (uiPreferences.language === 'km' ? km : en);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncPreferences = () => {
      setUiPreferences(readUiPreferences());
    };

    const onStorage = (event) => {
      if (event.key === STAFF_PREFERENCES_KEY) {
        syncPreferences();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncPreferences);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAFF_PREFERENCES_UPDATED_EVENT, syncPreferences);
    };
  }, []);

  useEffect(() => {
    const onLogoUpdated = (e) => {
      setLogoUrl(e.detail?.url || localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
    };
    const onStorage = (e) => {
      if (e.key === LOGO_KEY) {
        setLogoUrl(localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
      }
    };
    window.addEventListener(LOGO_UPDATED_EVENT, onLogoUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOGO_UPDATED_EVENT, onLogoUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const root = contentRootRef.current;
    if (!root) {
      return undefined;
    }

    const applyNodeTranslation = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = translateTextValue(node.nodeValue || '', uiPreferences.language);
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = node;
      if (['SCRIPT', 'STYLE'].includes(element.tagName)) {
        return;
      }

      ['placeholder', 'title', 'aria-label'].forEach((attr) => {
        const current = element.getAttribute(attr);
        if (current) {
          element.setAttribute(attr, translateTextValue(current, uiPreferences.language));
        }
      });

      element.childNodes.forEach((child) => applyNodeTranslation(child));
    };

    let observer;
    const applyAll = () => {
      if (observer) {
        observer.disconnect();
      }

      applyNodeTranslation(root);

      observer = new MutationObserver((mutations) => {
        if (observer) {
          observer.disconnect();
        }

        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((addedNode) => applyNodeTranslation(addedNode));
          if (mutation.type === 'characterData' && mutation.target) {
            applyNodeTranslation(mutation.target);
          }
        });

        if (observer) {
          observer.observe(root, { childList: true, subtree: true, characterData: true });
        }
      });

      observer.observe(root, { childList: true, subtree: true, characterData: true });
    };

    applyAll();

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [location.pathname, uiPreferences.language]);

  const loadNotifications = async (withLoader = false) => {
    if (withLoader) {
      setNotifLoading(true);
    }

    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications?take=15'),
        api.get('/notifications/unread-count'),
      ]);

      const rawList = Array.isArray(listRes?.data) ? listRes.data : [];
      const clearedAt = Number(localStorage.getItem(NOTIFICATIONS_CLEARED_AT_KEY) || 0);
      const visibleList = clearedAt > 0
        ? rawList.filter((item) => {
            const ts = new Date(item?.createdAt).getTime();
            return Number.isNaN(ts) || ts > clearedAt;
          })
        : rawList;

      setNotifications(visibleList);

      const serverUnreadCount = Number(countRes?.data?.count || 0);
      const visibleUnreadCount = visibleList.filter((item) => !item?.isRead).length;
      const nextUnreadCount = clearedAt > 0 ? visibleUnreadCount : serverUnreadCount;
      setUnreadCount(nextUnreadCount);

      if (hasLoadedNotificationsRef.current) {
        const previousUnreadCount = Number(previousUnreadCountRef.current || 0);
        if (nextUnreadCount > previousUnreadCount) {
          const latestUnread = visibleList.find((item) => !item?.isRead) || visibleList[0];
          if (latestUnread) {
            const critical = isOutOfStockNotification(latestUnread);
            setNotifToast({
              id: latestUnread.adminNotificationId || Date.now(),
              title: latestUnread.title || 'New notification',
              message: latestUnread.message || 'You have a new admin notification.',
              critical,
            });

            if (critical) {
              playOutOfStockAlert();
            }
          }
        }
      }

      previousUnreadCountRef.current = nextUnreadCount;
      hasLoadedNotificationsRef.current = true;
    } catch {
      // Silent fail to avoid blocking the admin layout for temporary API errors.
    } finally {
      if (withLoader) {
        setNotifLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications(true);
    const intervalId = window.setInterval(() => {
      loadNotifications(false);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'khmart_last_sale_at') {
        loadNotifications(false);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!notifToast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotifToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notifToast]);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  const toggleNotifications = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      await loadNotifications(true);
    }
  };

  const markNotificationAsRead = async (notificationId, isRead) => {
    if (isRead) {
      return;
    }

    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((item) => (
        item.adminNotificationId === notificationId ? { ...item, isRead: true } : item
      )));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      // Keep UI stable even when the request fails.
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      previousUnreadCountRef.current = 0;
    } catch {
      // Keep UI stable even when the request fails.
    }
  };

  const clearAllNotifications = async () => {
    const clearedAt = Date.now();
    localStorage.setItem(NOTIFICATIONS_CLEARED_AT_KEY, String(clearedAt));
    setNotifications([]);
    setUnreadCount(0);
    previousUnreadCountRef.current = 0;

    try {
      await api.delete('/notifications/clear-all');
    } catch {
      try {
        await api.post('/notifications/clear-all');
      } catch {
        try {
          await api.post('/notifications/read-all');
        } catch {
          // Keep UI stable even when all requests fail.
        }
      }
    }
  };

  const resolveNotificationTarget = (item) => {
    const type = String(item?.type || '').toLowerCase();
    const text = `${item?.title || ''} ${item?.message || ''}`.toLowerCase();
    const saleId = Number(item?.relatedSaleId || 0);
    const saleQuery = saleId > 0 ? `?saleId=${saleId}` : '';

    if (type.includes('payment') || text.includes('payment')) {
      return `/admin/payments${saleQuery}`;
    }

    if (type.includes('sale') || text.includes('sale #')) {
      return `/admin/sales-history${saleQuery}`;
    }

    if (text.includes('stock') || text.includes('inventory')) {
      return '/admin/stock-ins';
    }

    return '/admin/dashboard';
  };

  const handleNotificationClick = async (item) => {
    await markNotificationAsRead(item.adminNotificationId, item.isRead);
    setNotifOpen(false);
    navigate(resolveNotificationTarget(item));
  };

  const formatNotificationDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('profileImage');
    localStorage.removeItem('allowedPages');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('rememberedUsername');
    window.location.href = '/login';
  };

  const fullName = localStorage.getItem('fullName') || 'Administrator';
  const roleName = localStorage.getItem('role') || 'Admin';
  const profileImageUrl = toAbsoluteImageUrl(localStorage.getItem('profileImage') || '');

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navSections = [
    {
      section: 'MAIN',
      items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      section: 'INVENTORY',
      items: [
        { path: '/admin/products', label: 'Products', icon: Package },
        { path: '/admin/categories', label: 'Categories', icon: Tags },
        { path: '/admin/manage-stock', label: 'Manage Stock', icon: Warehouse },
        { path: '/admin/stock-ins', label: 'Stock Ins', icon: ShoppingCart },
        { path: '/admin/inventory-alerts', label: 'Inventory Alerts', icon: AlertTriangle },
      ]
    },
    {
      section: 'SALES',
      items: [
        { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
        { path: '/admin/sales-history', label: 'Sales History', icon: FileText },
        { path: '/admin/sales-reports', label: 'Sales Reports', icon: TrendingUp },
        { path: '/admin/payments', label: 'Payments', icon: Wallet },
      ]
    },
    {
      section: 'MANAGEMENT',
      items: [
        { path: '/admin/customers', label: 'Customers', icon: UserCheck },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/roles', label: 'Roles', icon: Shield },
        { path: '/admin/suppliers', label: 'Suppliers', icon: Truck },
        { path: '/admin/staff-permissions', label: 'Staff Permissions', icon: UserCheck },
      ]
    },
    {
      section: 'OPERATIONS',
      items: [
        { path: '/admin/expenses', label: 'Expenses', icon: Wallet },
        { path: '/admin/settings', label: 'Settings', icon: Settings },
        { path: '/admin/system-texts', label: 'System Texts', icon: FileText },
      ]
    },
  ];

  const themeSidebarClasses = {
    cambodia: 'from-[#032b6b] via-[#0f172a] to-[#0f172a] border-[#0b4db8]/30',
    ocean: 'from-sky-900 via-blue-900 to-indigo-950 border-sky-500/30',
    forest: 'from-emerald-900 via-green-900 to-teal-950 border-emerald-500/30',
  };

  const translateLabel = (label) => {
    const map = {
      Dashboard: t('Dashboard', 'ផ្ទាំងគ្រប់គ្រង'),
      Products: t('Products', 'ទំនិញ'),
      Categories: t('Categories', 'ប្រភេទ'),
      'Manage Stock': t('Manage Stock', 'គ្រប់គ្រងស្តុក'),
      'Stock Ins': t('Stock Ins', 'ស្តុកចូល'),
      'Inventory Alerts': t('Inventory Alerts', 'ការជូនដំណឹងស្តុក'),
      Orders: t('Orders', 'ការបញ្ជាទិញ'),
      'Sales History': t('Sales History', 'ប្រវត្តិការលក់'),
      'Sales Reports': t('Sales Reports', 'របាយការណ៍ការលក់'),
      Payments: t('Payments', 'ការទូទាត់'),
      Customers: t('Customers', 'អតិថិជន'),
      Users: t('Users', 'អ្នកប្រើប្រាស់'),
      Roles: t('Roles', 'តួនាទី'),
      Suppliers: t('Suppliers', 'អ្នកផ្គត់ផ្គង់'),
      'Staff Permissions': t('Staff Permissions', 'សិទ្ធិបុគ្គលិក'),
      Expenses: t('Expenses', 'ចំណាយ'),
      Settings: t('Settings', 'ការកំណត់'),
      'System Texts': t('System Texts', 'អត្ថបទប្រព័ន្ធ'),
      MAIN: t('MAIN', 'មេ'),
      INVENTORY: t('INVENTORY', 'ស្តុក'),
      SALES: t('SALES', 'ការលក់'),
      MANAGEMENT: t('MANAGEMENT', 'ការគ្រប់គ្រង'),
      OPERATIONS: t('OPERATIONS', 'ប្រតិបត្តិការ'),
    };

    return map[label] || label;
  };

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b ${themeSidebarClasses[uiPreferences.theme]} text-white transition-all duration-300 flex flex-col border-r shadow-xl`}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <img
                  src={normalizedLogoUrl}
                  alt="KH Mart Logo"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/kh-mart-logo.png';
                  }}
                />
                <div>
                  <h3 className="font-bold text-sm">KH Mart</h3>
                  <p className="text-xs text-blue-100/80">{t('POS System', '\u1794\u17d2\u179a\u1796\u17d0\u1793\u17d2\u1792 POS')}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.section}>
              {sidebarOpen && (
                <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  {translateLabel(section.section)}
                </p>
              )}
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative ${
                        active
                          ? 'bg-gradient-to-r from-[#0b4db8] to-[#c8102e] text-white shadow-lg'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                      title={!sidebarOpen ? item.label : ''}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-sm font-medium">{translateLabel(item.label)}</span>
                          {active && <ChevronRight className="w-4 h-4" />}
                        </>
                      )}
                      {!sidebarOpen && active && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#c8102e] rounded-l-full"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-200 hover:bg-[#c8102e]/20 hover:text-red-200 transition-all duration-200 text-sm font-medium"
            title={t('Logout', 'ចាកចេញ')}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>{t('Logout', 'ចាកចេញ')}</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {notifToast && (
          <div className="fixed right-4 top-20 z-[130] w-[min(420px,calc(100vw-2rem))]">
            <button
              type="button"
              onClick={() => setNotifToast(null)}
              className={`w-full rounded-xl bg-white p-4 text-left shadow-[0_20px_50px_rgba(0,0,0,0.12)] ${
                notifToast.critical ? 'border border-red-200' : 'border border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-2 ${notifToast.critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold uppercase tracking-wide ${notifToast.critical ? 'text-red-700' : 'text-amber-700'}`}>
                    {notifToast.critical ? 'Out Of Stock Alert' : 'Admin Alert'}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{notifToast.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{notifToast.message}</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Top Nav Bar */}
        <div className="bg-white border-b border-gray-200 h-16 px-6 shadow-sm grid grid-cols-3 items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {navSections
                .flatMap(section => section.items)
                .find(item => isActive(item.path))?.label
                ? translateLabel(navSections.flatMap(section => section.items).find(item => isActive(item.path))?.label)
                : t('Dashboard', 'ផ្ទាំងគ្រប់គ្រង')}
            </h1>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-gray-700">
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs text-gray-400">
              {now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center justify-end gap-4">
            <div ref={notifRef} className="relative">
              <button
                onClick={toggleNotifications}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                title={t('Notifications', 'ការជូនដំណឹង')}
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#c8102e] rounded-full text-[10px] leading-[18px] text-white font-bold text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[360px] max-h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">{t('Admin Notifications', 'ការជូនដំណឹងអ្នកគ្រប់គ្រង')}</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {t('Mark all read', 'សម្គាល់អានទាំងអស់')}
                      </button>
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        {t('Clear all', 'សម្អាតទាំងអស់')}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="py-8 flex justify-center">
                        <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">
                        {t('No notifications yet.', 'មិនទាន់មានការជូនដំណឹង។')}
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.adminNotificationId}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${item.isRead ? 'bg-white' : 'bg-blue-50/50'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                              <p className="mt-1 text-xs text-gray-600 leading-relaxed">{item.message}</p>
                              <p className="mt-1.5 text-[11px] text-gray-400">{formatNotificationDate(item.createdAt)}</p>
                            </div>
                            {!item.isRead && <span className="mt-1 w-2 h-2 rounded-full bg-blue-600" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div ref={userMenuRef} className="relative pl-2 border-l border-gray-200">
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={fullName}
                    className="object-cover w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#0b4db8] to-[#c8102e] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {getInitials(fullName)}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold leading-tight text-gray-700">{fullName}</p>
                  <p className="text-xs leading-tight text-gray-400">{roleName}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 overflow-hidden bg-white border shadow-xl w-44 rounded-xl border-slate-200">
                  <Link
                    to="/admin/settings"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" /> {t('Settings', 'ការកំណត់')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> {t('Sign Out', 'ចាកចេញ')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div ref={contentRootRef} className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;