/**
 * Node connectivity from last sensor reading time.
 *
 * Deployment model: field nodes send to a main ESP32 once per day; the main
 * device uploads batched data to the API (~24h cadence). Thresholds use
 * wall-clock age of the latest reading — not "last 2 hours" — so a node is
 * not marked offline after 12h when the next upload is still expected within 24h.
 *
 * - online:  last reading &lt; 48h ago (within normal daily batch window + slack)
 * - delayed: 48h–72h (overdue one expected cycle)
 * - offline: ≥72h (no data for ~2+ expected daily cycles)
 */

import type { SensorNode } from '@/lib/types';

/** Age of last reading in minutes above which we consider the node not "online". */
export const NODE_ONLINE_MAX_AGE_MIN = 48 * 60;

/** Age above which we consider the node not "delayed" (i.e. offline). */
export const NODE_DELAYED_MAX_AGE_MIN = 72 * 60;

export function deriveNodeStatusFromAgeMinutes(ageMins: number): SensorNode['status'] {
  if (!Number.isFinite(ageMins) || ageMins < 0) return 'offline';
  if (ageMins < NODE_ONLINE_MAX_AGE_MIN) return 'online';
  if (ageMins < NODE_DELAYED_MAX_AGE_MIN) return 'delayed';
  return 'offline';
}

/** Derive status from ISO last-sync time string (wall clock). */
export function deriveNodeStatusFromLastSyncIso(iso: string): SensorNode['status'] {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'offline';
  const ageMins = (Date.now() - t) / 60000;
  return deriveNodeStatusFromAgeMinutes(ageMins);
}

/** Human-readable summary for tooltips / admin UI. */
export function nodeStatusThresholdHelp(): string {
  return 'Online: last reading <48h · Delayed: 48–72h · Offline: ≥72h (daily batch uploads)';
}
