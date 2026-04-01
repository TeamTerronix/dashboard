/**
 * SLIOT API Client
 * Connects the Next.js dashboard to the FastAPI backend.
 * Falls back to mock data when the backend is unreachable.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60s
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return await res.json();
  } catch {
    console.warn(`[SLIOT API] Backend unreachable for ${endpoint}, using mock data`);
    return fallback;
  }
}

// --- Endpoints ---

export async function getStats() {
  return fetchAPI('/api/stats', {
    total_sst_records: 4023,
    total_dhw_records: 4023,
    total_predictions: 1205,
    date_range: { start: '2015-01-01', end: '2026-02-25' },
    unique_coordinates: 1,
  });
}

export async function getSST(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/sst?${params}`, []);
}

export async function getDHW(start?: string, end?: string, limit = 1000) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  params.set('limit', String(limit));
  return fetchAPI(`/api/dhw?${params}`, []);
}

export async function getPredictions(minRisk = 0, limit = 500) {
  return fetchAPI(`/api/predictions?min_risk=${minRisk}&limit=${limit}`, []);
}

export async function getTrainingHistory() {
  return fetchAPI('/api/training-history', []);
}

export async function getRiskSummary() {
  return fetchAPI('/api/risk-summary', {
    total_points: 0,
    healthy: 0,
    warning: 0,
    danger: 0,
    avg_temperature: 0,
    max_temperature: 0,
    avg_risk_score: 0,
  });
}

export async function getLatestReadings() {
  return fetchAPI('/api/latest-readings', []);
}
