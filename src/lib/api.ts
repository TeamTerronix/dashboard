/**
 * SLIOT API Client
 * Connects the Next.js dashboard to the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const tok = localStorage.getItem('sliot_token');
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
    headers,
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('sliot_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API ${res.status} for ${endpoint}`);
  return await res.json();
}

// --- Endpoints ---

export async function getStats() {
  return fetchAPI('/api/stats');
}

export async function getSST(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/sst?${params}`);
}

export async function getDHW(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/dhw?${params}`);
}

export async function getPredictions(minRisk = 0, limit = 500) {
  return fetchAPI(`/api/predictions?min_risk=${minRisk}&limit=${limit}`);
}

export async function getTrainingHistory() {
  return fetchAPI('/api/training-history');
}

export async function getRiskSummary() {
  return fetchAPI('/api/risk-summary');
}

export async function getLatestReadings() {
  return fetchAPI('/api/latest-readings');
}
