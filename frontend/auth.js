const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE)
  || (window.location.port && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '');

const TOKEN_KEY = 'lpgAuthToken';
const USER_KEY = 'lpgAuthUser';

export function getApiBase() {
  return API_BASE;
}

export function getHeaders(auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function requireRole(role) {
  const user = getUser();
  if (!user || user.role !== role) {
    clearAuth();
    window.location.href = 'login.html';
    return false;
  }
  return true;
}
