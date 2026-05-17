import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { resolveLogoUrl, toAbsoluteImageUrl } from '../utils/imageUrl';
import './staff-theme.css';
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Package,
  Users,
  BarChart3,
  UserCircle,
  Lock,
  Activity,
  SlidersHorizontal,
  LogOut,
  Menu,
  ChevronRight,
  Bell,
  ChevronDown,
  Store,
  Loader,
} from 'lucide-react';

const STAFF_NOTIFICATIONS_CLEARED_AT_KEY = 'khmart_staff_notifications_cleared_at';
const STAFF_PREFERENCES_KEY = 'khmart_staff_preferences';
const STAFF_PREFERENCES_UPDATED_EVENT = 'khmart-staff-preferences-updated';
const STAFF_PERMISSIONS_UPDATED_KEY = 'khmart_staff_permissions_updated';
const STAFF_PERMISSIONS_UPDATED_EVENT = 'khmart-staff-permissions-updated';
const STAFF_PROFILE_UPDATED_EVENT = 'khmart-staff-profile-updated';
const LOGO_KEY = 'khmart_logo_url';
const LOGO_UPDATED_EVENT = 'khmart-logo-updated';

const DEFAULT_STAFF_PREFERENCES = {
  theme: 'cambodia',
  language: 'en',
};

const readStaffPreferences = () => {
  try {
    const raw = localStorage.getItem(STAFF_PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_STAFF_PREFERENCES;
    }

    const parsed = JSON.parse(raw);
    const theme = ['cambodia', 'ocean', 'forest'].includes(parsed?.theme) ? parsed.theme : DEFAULT_STAFF_PREFERENCES.theme;
    const language = ['en', 'km'].includes(parsed?.language) ? parsed.language : DEFAULT_STAFF_PREFERENCES.language;
    return { theme, language };
  } catch {
    return DEFAULT_STAFF_PREFERENCES;
  }
};

// All possible nav items mapped to permission keys
const ALL_NAV_ITEMS = [
  { key: 'Dashboard',      path: '/staff/dashboard',       label: 'Dashboard',       icon: LayoutDashboard, always: true },
  { key: 'Overview',       path: '/staff/overview',        label: 'Overview',        icon: Activity },
  { key: 'Pos',            path: '/staff/pos',             label: 'Point of Sale',   icon: ShoppingCart },
  { key: 'Orders',         path: '/staff/orders',          label: 'Orders',          icon: ClipboardList },
  { key: 'Products',       path: '/staff/products',        label: 'Products',        icon: Package },
  { key: 'Customers',      path: '/staff/customers',       label: 'Customers',       icon: Users },
  { key: 'Reports',        path: '/staff/reports',         label: 'Reports',         icon: BarChart3 },
  { key: 'Settings',       path: '/staff/settings',        label: 'Settings',        icon: SlidersHorizontal, always: true },
  { key: 'Profile',        path: '/staff/profile',         label: 'My Profile',      icon: UserCircle },
  { key: 'ChangePassword', path: '/staff/change-password', label: 'Change Password', icon: Lock },
];

const PERMISSION_KEY_MAP = {
  dashboard: 'Dashboard',
  overview: 'Overview',
  pos: 'Pos',
  orders: 'Orders',
  products: 'Products',
  customers: 'Customers',
  reports: 'Reports',
  profile: 'Profile',
  changepassword: 'ChangePassword',
};

const normalizePermissionKey = (value = '') => {
  const compact = String(value || '').replace(/[\s_-]/g, '').toLowerCase();
  return PERMISSION_KEY_MAP[compact] || null;
};

const parseAllowedPages = (raw = '') => {
  const normalized = String(raw || '')
    .split(',')
    .map((p) => normalizePermissionKey(p))
    .filter(Boolean);
  return [...new Set(normalized)];
};

const getAllowedPagesFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = token.split('.')[1];
    if (!payload) return '';
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded?.AllowedPages || decoded?.allowedPages || '';
  } catch {
    return '';
  }
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'S';

const readStaffIdentity = () => ({
  fullName: localStorage.getItem('fullName') || 'Staff',
  username: localStorage.getItem('username') || 'staff',
  profileImage: localStorage.getItem('profileImage') || '',
});

const StaffLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [topUserMenuOpen, setTopUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [staffPreferences, setStaffPreferences] = useState(() => readStaffPreferences());
  const [now, setNow] = useState(new Date());
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(LOGO_KEY) || '/images/kh-mart-logo.png');
  const [staffIdentity, setStaffIdentity] = useState(() => readStaffIdentity());
  const normalizedLogoUrl = resolveLogoUrl(logoUrl);
  const [allowedPages, setAllowedPages] = useState(() => {
    const stored = localStorage.getItem('allowedPages') ?? '';
    const storedParsed = parseAllowedPages(stored).join(',');
    if (storedParsed) return storedParsed;

    const tokenParsed = parseAllowedPages(getAllowedPagesFromToken()).join(',');
    if (tokenParsed) {
      localStorage.setItem('allowedPages', tokenParsed);
      return tokenParsed;
    }
    return '';
  });
  const topUserMenuRef = useRef(null);
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || '';

  const t = (en, km) => (staffPreferences.language === 'km' ? km : en);

  const getNavLabel = (item) => {
    const labels = {
      Dashboard: t('Dashboard', 'ផ្ទាំងគ្រប់គ្រង'),
      Overview: t('Overview', 'ទិដ្ឋភាពទូទៅ'),
      Pos: t('Point of Sale', 'ចំណុចលក់'),
      Orders: t('Orders', 'ការបញ្ជាទិញ'),
      Products: t('Products', 'ទំនិញ'),
      Customers: t('Customers', 'អតិថិជន'),
      Reports: t('Reports', 'របាយការណ៍'),
      Settings: t('Settings', 'ការកំណត់'),
      Profile: t('My Profile', 'ប្រវត្តិរូបខ្ញុំ'),
      ChangePassword: t('Change Password', 'ប្តូរពាក្យសម្ងាត់'),
    };

    return labels[item.key] || item.label;
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncIdentity = () => {
      setStaffIdentity(readStaffIdentity());
    };

    const onStorage = (event) => {
      if (event.key === 'fullName' || event.key === 'username' || event.key === 'profileImage') {
        syncIdentity();
      }
    };

    const onProfileUpdated = (event) => {
      const nextFullName = event?.detail?.fullName ?? localStorage.getItem('fullName') ?? 'Staff';
      const nextProfileImage = event?.detail?.profileImage ?? localStorage.getItem('profileImage') ?? '';
      const nextUsername = localStorage.getItem('username') || 'staff';
      setStaffIdentity({
        fullName: nextFullName,
        username: nextUsername,
        profileImage: nextProfileImage,
      });
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STAFF_PROFILE_UPDATED_EVENT, onProfileUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAFF_PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
  }, []);

  useEffect(() => {
    const syncPreferences = () => {
      setStaffPreferences(readStaffPreferences());
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
    document.documentElement.setAttribute('lang', staffPreferences.language === 'km' ? 'km' : 'en');
  }, [staffPreferences.language]);

  const loadNotifications = async (withLoader = false) => {
    if (withLoader) {
      setNotifLoading(true);
    }

    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications?take=12'),
        api.get('/notifications/unread-count'),
      ]);

      const rawList = Array.isArray(listRes?.data) ? listRes.data : [];
      const clearedAt = Number(localStorage.getItem(STAFF_NOTIFICATIONS_CLEARED_AT_KEY) || 0);
      const visibleList = clearedAt > 0
        ? rawList.filter((item) => {
            const ts = new Date(item?.createdAt).getTime();
            return Number.isNaN(ts) || ts > clearedAt;
          })
        : rawList;

      setNotifications(visibleList);

      const serverUnreadCount = Number(countRes?.data?.count || 0);
      const visibleUnreadCount = visibleList.filter((item) => !item?.isRead).length;
      setUnreadCount(clearedAt > 0 ? visibleUnreadCount : serverUnreadCount);
    } catch {
      // Keep UI stable if notifications endpoint is unavailable.
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

  const syncPermissions = useCallback(async () => {
    const role = (localStorage.getItem('role') || '').toLowerCase().trim();
    if (role !== 'staff') return;

    try {
      const res = await api.get('/staffpermissions/me');
      const hasApiPages = Object.prototype.hasOwnProperty.call(res.data || {}, 'allowedPages');
      const apiPages = parseAllowedPages(res.data?.allowedPages ?? '').join(',');
      const current = parseAllowedPages(localStorage.getItem('allowedPages') || '').join(',');
      const tokenPages = parseAllowedPages(getAllowedPagesFromToken()).join(',');
      const next = hasApiPages ? apiPages : (current || tokenPages);
      setAllowedPages(next);
      localStorage.setItem('allowedPages', next);
    } catch {
      // Keep existing local permissions if refresh fails.
    }
  }, []);

  useEffect(() => {
    syncPermissions();
  }, [syncPermissions]);

  useEffect(() => {
    const shouldSyncForUser = (payload) => String(payload?.userId || '') === currentUserId;

    const handlePermissionsUpdated = (payload) => {
      if (shouldSyncForUser(payload)) {
        syncPermissions();
      }
    };

    const onStorage = (event) => {
      if (event.key !== STAFF_PERMISSIONS_UPDATED_KEY || !event.newValue) {
        return;
      }

      try {
        handlePermissionsUpdated(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed events.
      }
    };

    const onCustomEvent = (event) => {
      handlePermissionsUpdated(event.detail || {});
    };

    const onFocus = () => {
      syncPermissions();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(STAFF_PERMISSIONS_UPDATED_EVENT, onCustomEvent);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STAFF_PERMISSIONS_UPDATED_EVENT, onCustomEvent);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [currentUserId, syncPermissions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }

      if (topUserMenuRef.current && !topUserMenuRef.current.contains(event.target)) {
        setTopUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setTopUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

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
      // Silent fail to keep staff layout responsive.
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail to keep staff layout responsive.
    }
  };

  const clearAllNotifications = async () => {
    const clearedAt = Date.now();
    localStorage.setItem(STAFF_NOTIFICATIONS_CLEARED_AT_KEY, String(clearedAt));
    setNotifications([]);
    setUnreadCount(0);

    try {
      await api.delete('/notifications/clear-all');
    } catch {
      try {
        await api.post('/notifications/clear-all');
      } catch {
        try {
          await api.post('/notifications/read-all');
        } catch {
          // Silent fail to keep staff layout responsive.
        }
      }
    }
  };

  const handleNotificationClick = async (item) => {
    await markNotificationAsRead(item.adminNotificationId, item.isRead);
    setNotifOpen(false);
    navigate('/staff/orders');
  };

  const formatNotificationDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB');
  };

  const fullName = staffIdentity.fullName;
  const username = staffIdentity.username;
  const profileImageUrl = toAbsoluteImageUrl(staffIdentity.profileImage);
  const allowedSet = useMemo(
    () => new Set(parseAllowedPages(allowedPages)),
    [allowedPages]
  );

  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.always || allowedSet.has(item.key)
  );

  const getPageKeyFromPath = (pathname) => {
    if (pathname === '/staff' || pathname === '/staff/dashboard' || pathname.startsWith('/staff/dashboard/')) return 'Dashboard';
    if (pathname === '/staff/overview' || pathname.startsWith('/staff/overview/')) return 'Overview';
    if (pathname === '/staff/pos' || pathname.startsWith('/staff/pos/')) return 'Pos';
    if (pathname === '/staff/orders' || pathname.startsWith('/staff/orders/')) return 'Orders';
    if (pathname === '/staff/products' || pathname.startsWith('/staff/products/')) return 'Products';
    if (pathname === '/staff/customers' || pathname.startsWith('/staff/customers/')) return 'Customers';
    if (pathname === '/staff/reports' || pathname.startsWith('/staff/reports/')) return 'Reports';
    if (pathname === '/staff/settings' || pathname.startsWith('/staff/settings/')) return 'Settings';
    if (pathname === '/staff/profile' || pathname.startsWith('/staff/profile/')) return 'Profile';
    if (pathname === '/staff/change-password' || pathname.startsWith('/staff/change-password/')) return 'ChangePassword';
    return null;
  };

  useEffect(() => {
    const requiredPage = getPageKeyFromPath(location.pathname);
    if (!requiredPage || requiredPage === 'Dashboard') return;
    const requiredItem = ALL_NAV_ITEMS.find((item) => item.key === requiredPage);
    if (requiredItem?.always) return;
    if (allowedSet.has(requiredPage)) return;

    const fallback = navItems[0]?.path || '/staff/dashboard';
    if (location.pathname !== fallback) {
      navigate(fallback, { replace: true });
    }
  }, [location.pathname, allowedSet, navItems, navigate]);

  const handleLogout = () => {
    ['token', 'role', 'username', 'fullName', 'profileImage', 'allowedPages', 'rememberMe', 'rememberedUsername'].forEach(
      (k) => localStorage.removeItem(k)
    );
    setAllowedPages('');
    setStaffIdentity({ fullName: 'Staff', username: 'staff', profileImage: '' });
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const activeLabel =
    getNavLabel(navItems.find((item) => isActive(item.path)) || { key: 'Portal', label: t('Staff Portal', 'ផ្ទាំងបុគ្គលិក') });
  const isPosPage = location.pathname === '/staff/pos' || location.pathname.startsWith('/staff/pos/');

  const themeClass = `theme-${staffPreferences.theme}`;

  return (
    <div className={`staff-theme ${themeClass} flex h-screen overflow-hidden bg-slate-100`}>

      {/* ── SIDEBAR ── */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } relative flex flex-col bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-white transition-all duration-300 ease-in-out shadow-2xl z-30`}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-emerald-800/60 min-h-[64px]">
          {sidebarOpen && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={normalizedLogoUrl}
                alt="KH Mart Logo"
                className="w-9 h-9 rounded-full object-cover flex-shrink-0 shadow-lg"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/kh-mart-logo.png';
                }}
              />
              <div className="truncate">
                <p className="font-bold text-sm leading-tight text-white">KH Mart</p>
                <p className="text-xs text-emerald-400 leading-tight">{t('Staff Portal', 'ផ្ទាំងបុគ្គលិក')}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            title={sidebarOpen ? t('Collapse sidebar', 'បង្រួមម៉ឺនុយ') : t('Expand sidebar', 'ពង្រីកម៉ឺនុយ')}
            className={`p-2 rounded-xl hover:bg-emerald-700/60 active:bg-emerald-700 transition-colors flex-shrink-0 ${!sidebarOpen ? 'mx-auto' : ''}`}
          >
            <Menu className="w-5 h-5 text-emerald-300" />
          </button>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? getNavLabel(item) : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                  ${active
                    ? 'bg-gradient-to-r from-emerald-500/90 to-green-500/80 text-white shadow-lg shadow-emerald-900/40'
                    : 'text-emerald-300 hover:bg-emerald-800/50 hover:text-white'
                  }`}
              >
                {/* Active left bar */}
                {active && (
                  <span className="absolute left-0 w-1 h-6 -translate-y-1/2 bg-white rounded-r-full top-1/2" />
                )}
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-emerald-400 group-hover:text-white'}`} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-sm font-medium truncate">{getNavLabel(item)}</span>
                    {active && <ChevronRight className="flex-shrink-0 w-4 h-4 text-white/70" />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── User Panel ── */}
        <div className="p-3 border-t border-emerald-800/60">
          <button
            onClick={() => sidebarOpen && setUserMenuOpen(!userMenuOpen)}
            className="flex items-center w-full gap-3 px-2 py-2 transition-colors rounded-xl hover:bg-emerald-800/50 group"
          >
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-bold text-white rounded-full shadow bg-gradient-to-br from-emerald-400 to-green-600 overflow-hidden">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(fullName)
              )}
            </div>
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-white truncate">{fullName}</p>
                  <p className="text-xs truncate text-emerald-400">@{username}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-emerald-400 flex-shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>

          {/* Dropdown */}
          {sidebarOpen && userMenuOpen && (
            <div className="mx-1 mt-2 overflow-hidden border rounded-xl bg-emerald-800/70 border-emerald-700/50">
              {allowedSet.has('Profile') && (
                <Link
                  to="/staff/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-emerald-200 hover:bg-emerald-700/60 hover:text-white transition-colors"
                >
                  <UserCircle className="w-4 h-4" /> {t('My Profile', 'ប្រវត្តិរូបខ្ញុំ')}
                </Link>
              )}
              {allowedSet.has('ChangePassword') && (
                <Link
                  to="/staff/change-password"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-emerald-200 hover:bg-emerald-700/60 hover:text-white transition-colors"
                >
                  <Lock className="w-4 h-4" /> {t('Change Password', 'ប្តូរពាក្យសម្ងាត់')}
                </Link>
              )}
              <Link
                to="/staff/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-emerald-200 hover:bg-emerald-700/60 hover:text-white transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" /> {t('Settings', 'ការកំណត់')}
                </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" /> {t('Sign Out', 'ចាកចេញ')}
              </button>
            </div>
          )}

          {/* Collapsed logout button */}
          {!sidebarOpen && (
            <button
              onClick={handleLogout}
              title={t('Sign Out', 'ចាកចេញ')}
              className="mt-2 w-full flex items-center justify-center p-2.5 rounded-xl text-emerald-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Top Bar ── */}
        <header className="grid grid-cols-3 items-center flex-shrink-0 h-16 px-6 bg-white border-b shadow-sm border-slate-200">
          {/* Left: page title */}
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-800">{activeLabel}</h1>
          </div>

          {/* Center: live clock */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-sm font-semibold text-slate-700">
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs text-slate-400">
              {now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center justify-end gap-2">
            {/* Notification bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={toggleNotifications}
                className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                title={t('Notifications', 'ការជូនដំណឹង')}
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 rounded-full text-[10px] leading-[16px] text-white font-bold text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] max-h-[380px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{t('Staff Notifications', 'ការជូនដំណឹងបុគ្គលិក')}</h3>
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

                  <div className="max-h-[320px] overflow-y-auto">
                    {notifLoading ? (
                      <div className="py-8 flex justify-center">
                        <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('No notifications yet.', 'មិនទាន់មានការជូនដំណឹង។')}
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.adminNotificationId}
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.isRead ? 'bg-white' : 'bg-blue-50/50'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{item.title || t('Notification', 'ការជូនដំណឹង')}</p>
                              <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{item.message || t('New update available.', 'មានព័ត៌មានថ្មី។')}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{formatNotificationDate(item.createdAt)}</p>
                            </div>
                            {!item.isRead && <span className="mt-1 w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Dropdown */}
            <div ref={topUserMenuRef} className="relative pl-2 ml-1 border-l border-slate-200">
              <button
                onClick={() => setTopUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-center text-sm font-bold text-white rounded-full shadow w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-600 overflow-hidden">
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(fullName)
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold leading-tight text-slate-700">{fullName}</p>
                  <p className="text-xs leading-tight text-slate-400">{t('Staff', 'បុគ្គលិក')}</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${topUserMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {topUserMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 overflow-hidden bg-white border shadow-xl w-52 rounded-xl border-slate-200">
                  {allowedSet.has('Profile') && (
                    <Link
                      to="/staff/profile"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <UserCircle className="w-4 h-4 text-slate-500" /> {t('My Profile', 'ប្រវត្តិរូបខ្ញុំ')}
                    </Link>
                  )}
                  {allowedSet.has('ChangePassword') && (
                    <Link
                      to="/staff/change-password"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Lock className="w-4 h-4 text-slate-500" /> {t('Change Password', 'ប្តូរពាក្យសម្ងាត់')}
                    </Link>
                  )}
                    <Link
                      to="/staff/settings"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-slate-500" /> {t('Settings', 'ការកំណត់')}
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
        </header>

        {/* ── Content ── */}
        <main className={isPosPage ? 'staff-main flex-1 overflow-hidden bg-slate-50' : 'staff-main flex-1 overflow-auto bg-slate-50'}>
          <div className={isPosPage ? 'staff-content-shell h-full' : 'staff-content-shell p-6 mx-auto max-w-screen-2xl'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;