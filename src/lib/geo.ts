import type { MonitoringArea } from './types';

/** Prefer backend network_group_id; otherwise nearest area among the allowed list. */
export function resolveNodeAreaId(
  reading: { networkGroupId?: string; latitude: number; longitude: number },
  areas: MonitoringArea[],
): string {
  if (reading.networkGroupId) {
    return reading.networkGroupId;
  }
  if (areas.length === 0) return 'unknown';
  return nearestAreaId(areas, reading.latitude, reading.longitude) ?? areas[0].id;
}

export function nearestAreaId(
  areas: MonitoringArea[],
  lat: number | null | undefined,
  lon: number | null | undefined,
): string | null {
  if (lat == null || lon == null) return null;
  let best: { id: string; d: number } | null = null;
  for (const a of areas) {
    const d = (lat - a.center.lat) ** 2 + (lon - a.center.lon) ** 2;
    if (!best || d < best.d) best = { id: a.id, d };
  }
  return best?.id ?? null;
}

