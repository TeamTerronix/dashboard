/**
 * Single source for API base URL (see dashboard/.env.example for Vercel).
 * Use a relative path (e.g. /backend-api) on Vercel with BACKEND_PROXY_URL rewrite.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** WebSocket base: full http(s) URL or relative path (same host as the Next app). */
export function getWebSocketBase(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const base = API_BASE;
  if (base.startsWith('/')) {
    if (typeof window === 'undefined') return `ws://localhost:3000${base}`;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${base}`;
  }
  return base.replace(/^http/, 'ws');
}
