/**
 * Single source for API base URL (see dashboard/.env.example for Vercel).
 * Use a relative path (e.g. /backend-api) on Vercel with BACKEND_PROXY_URL rewrite.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Resolve WebSocket origin (no path) for the API, or null if the browser cannot
 * safely open a WebSocket (e.g. HTTPS page + http:// API = mixed content; ws:// is blocked).
 */
function getWebSocketOrigin(): string | null {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const base = API_BASE;
  if (base.startsWith('/')) {
    if (typeof window === 'undefined') return `ws://localhost:3000${base}`;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${base}`;
  }
  if (base.startsWith('https://')) {
    return base.replace(/^https/, 'wss');
  }
  if (base.startsWith('http://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return null;
    }
    return base.replace(/^http/, 'ws');
  }
  return null;
}

/** Full URL for bleaching WebSocket, or null to skip connecting (avoids 404 / mixed-content spam). */
export function getBleachingAlertsWebSocketUrl(token: string): string | null {
  const origin = getWebSocketOrigin();
  if (!origin) return null;
  return `${origin}/ws/alerts?token=${encodeURIComponent(token)}`;
}
