/**
 * api.js — Centralized fetch wrapper
 *
 * - Attaches Authorization: Bearer <accessToken> to every request
 * - On 403 (expired access token) → silently refreshes via /api/auth/token/refresh
 * - On refresh failure → clears session and redirects to /login
 * - Access token is stored in module memory (not localStorage) to avoid XSS exposure
 * - Refresh token is stored in localStorage (survives page reload)
 */

let accessToken = null; // in-memory only

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('ticketSystemUser');
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(url, options = {}, isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, { ...options, headers });

  // 403 → try to refresh the access token once
  if (response.status === 403 && !isRetry) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearTokens();
      window.location.href = '/login';
      return;
    }

    const refreshRes = await fetch('/api/auth/token/refresh', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      clearTokens();
      window.location.href = '/login';
      return;
    }

    const { accessToken: newToken } = await refreshRes.json();
    setAccessToken(newToken);

    // Retry the original request once with the new token
    return apiFetch(url, options, true);
  }

  return response;
}

// ── Convenience methods ───────────────────────────────────────────────────────

export const api = {
  get:    (url)          => apiFetch(url),
  post:   (url, body)    => apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (url, body)    => apiFetch(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (url, body)    => apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (url)          => apiFetch(url, { method: 'DELETE' }),
};

// ── Response helper — throws on non-2xx with the server error message ─────────
export async function parseResponse(res) {
  if (!res) return null; // redirect was triggered
  if (res.ok) {
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  const text = await res.text();
  let message;
  try { message = JSON.parse(text).error || text; }
  catch { message = text; }
  throw new Error(message || `HTTP ${res.status}`);
}
