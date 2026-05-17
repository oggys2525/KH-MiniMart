import api from '../services/api';

export const toAbsoluteImageUrl = (url) => {
  if (!url) return '';

  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const apiBaseUrl = api.defaults.baseURL || '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${normalizedPath}`;
};

export const resolveLogoUrl = (url, fallback = '/images/kh-mart-logo.png') => {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith('/images/')) {
    return trimmed;
  }

  // Do not persist temporary browser object URLs or local machine file paths as app logo URLs.
  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:') || /^[A-Za-z]:[\\/]/.test(trimmed) || trimmed.includes('\\')) {
    return fallback;
  }

  const absolute = toAbsoluteImageUrl(trimmed);
  return absolute || fallback;
};