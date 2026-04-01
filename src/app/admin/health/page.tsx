'use client';

/**
 * /admin/health — Admin Device Health Portal
 *
 * Displays every registered sensor node with:
 *   - Last Sync time
 *   - Battery level (colour-coded)
 *   - Connection status:
 *       Online  — last sync within 2 hours of the most recent sync date in data
 *       Delayed — last sync within 48 hours
 *       Offline — last sync older than 48 hours (or status === 'offline')
 */

import { useMemo, useState } from 'react';
import { ShieldCheck, Wifi, WifiOff, Clock, Battery, Search, RefreshCw } from 'lucide-react';
import { monitoringAreas } from '@/lib/areas';
import { nearestAreaId } from '@/lib/geo';
import { getLatestReadings } from '@/lib/api';
import type { SensorNode, TemperatureReading } from '@/lib/types';
import { useEffect } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseSync(iso: string): Date {
  return new Date(iso);
}

/** Compute connectivity status relative to the latest known sync in the dataset. */
function deriveStatus(lastSync: string, latestKnown: Date): 'online' | 'delayed' | 'offline' {
  const syncDate = parseSync(lastSync);
  const diffMs = latestKnown.getTime() - syncDate.getTime();
  const diffHours = diffMs / 3_600_000;
  if (diffHours <= 2) return 'online';
  if (diffHours <= 48) return 'delayed';
  return 'offline';
}

function batteryColor(pct: number): string {
  if (pct > 50) return 'var(--accent-teal)';
  if (pct > 20) return 'var(--warn-amber)';
  return 'var(--danger-coral)';
}

function statusBadge(s: 'online' | 'delayed' | 'offline') {
  const map = {
    online:  { label: 'Online',  bg: 'rgba(0,200,80,0.15)',  color: '#00c850' },
    delayed: { label: 'Delayed', bg: 'rgba(255,185,0,0.15)', color: '#ffb900' },
    offline: { label: 'Offline', bg: 'rgba(230,50,50,0.15)', color: '#e63232' },
  };
  return map[s];
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminHealthPage() {
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [latestReadings, setLatestReadings] = useState<TemperatureReading[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const latest = await getLatestReadings();
        const anyLatest = latest as any;
        const rows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        const mapped: TemperatureReading[] = rows.map((r) => ({
          time: r.time,
          nodeId: String(r.sensor_uid),
          temperature: Number(r.temperature),
          dhw: 0,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        }));
        if (!cancelled) setLatestReadings(mapped);
      } catch {
        if (!cancelled) setLatestReadings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sensorNodes: SensorNode[] = useMemo(() => {
    return latestReadings.map((r) => {
      const areaId = nearestAreaId(monitoringAreas, r.latitude, r.longitude) ?? 'hikkaduwa';
      return {
        id: r.nodeId,
        name: r.nodeId,
        areaId,
        latitude: r.latitude,
        longitude: r.longitude,
        depth: 0,
        battery: 0,
        status: 'online',
        lastSync: r.time,
        totalReadings: 0,
      };
    });
  }, [latestReadings]);

  // Reference "now" = latest lastSync across all nodes
  const latestKnown = useMemo(() => {
    if (sensorNodes.length === 0) return new Date();
    return new Date(Math.max(...sensorNodes.map((n) => parseSync(n.lastSync).getTime())));
  }, [sensorNodes]);

  const rows = useMemo(() => {
    return sensorNodes
      .map((n) => ({
        ...n,
        area: monitoringAreas.find((a) => a.id === n.areaId)?.name ?? n.areaId,
        connectivity: deriveStatus(n.lastSync, latestKnown),
      }))
      .filter((n) => {
        const q = search.toLowerCase();
        if (q && !n.id.toLowerCase().includes(q) && !n.name.toLowerCase().includes(q)) return false;
        if (areaFilter !== 'all' && n.areaId !== areaFilter) return false;
        if (statusFilter !== 'all' && n.connectivity !== statusFilter) return false;
        return true;
      });
  }, [search, areaFilter, statusFilter, latestKnown, sensorNodes]);

  const online  = rows.filter((n) => n.connectivity === 'online').length;
  const delayed = rows.filter((n) => n.connectivity === 'delayed').length;
  const offline = rows.filter((n) => n.connectivity === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Admin Health Portal
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Real-time device health — {sensorNodes.length} registered sensors across {monitoringAreas.length} areas
            </p>
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-3 text-xs">
          {[
            { label: 'Online',  count: online,  color: '#00c850' },
            { label: 'Delayed', count: delayed, color: '#ffb900' },
            { label: 'Offline', count: offline, color: '#e63232' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
              style={{ background: `${color}18`, borderColor: `${color}40` }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="font-mono font-bold" style={{ color }}>{count}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 min-w-48"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search node ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Area filter */}
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="all">All Areas</option>
          {monitoringAreas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none cursor-pointer"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="all">All Statuses</option>
          <option value="online">Online</option>
          <option value="delayed">Delayed</option>
          <option value="offline">Offline</option>
        </select>

        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reference: {latestKnown.toISOString().replace('T', ' ').slice(0, 16)} UTC
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
              {['Node ID', 'Name', 'Area', 'Depth', 'Battery', 'Last Sync', 'Total Readings', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((node, idx) => {
              const badge = statusBadge(node.connectivity);
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={node.id}
                  style={{
                    background: isEven ? 'transparent' : 'rgba(255,255,255,0.01)',
                    borderBottom: '1px solid var(--grid-line)',
                  }}
                >
                  {/* Node ID */}
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {node.id}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    {node.name}
                  </td>

                  {/* Area */}
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {node.area}
                  </td>

                  {/* Depth */}
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {node.depth}m
                  </td>

                  {/* Battery */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5" style={{ color: batteryColor(node.battery) }} />
                      <span className="font-mono font-bold" style={{ color: batteryColor(node.battery) }}>
                        {node.battery}%
                      </span>
                      {/* Mini battery bar */}
                      <div
                        className="w-12 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--bg-elevated)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${node.battery}%`,
                            background: batteryColor(node.battery),
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Last Sync */}
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {node.lastSync.replace('T', ' ').slice(0, 16)}
                    </div>
                  </td>

                  {/* Total Readings */}
                  <td className="px-4 py-3 font-mono text-right" style={{ color: 'var(--text-secondary)' }}>
                    {node.totalReadings.toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className="flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {node.connectivity === 'online' ? (
                        <Wifi className="w-3 h-3" />
                      ) : node.connectivity === 'delayed' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <WifiOff className="w-3 h-3" />
                      )}
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No nodes match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer */}
        <div
          className="px-4 py-2 text-[10px] border-t flex justify-between"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
        >
          <span>Showing {rows.length} of {sensorNodes.length} devices</span>
          <span>Online = last sync within 2h · Delayed = within 48h · Offline = older than 48h</span>
        </div>
      </div>
    </div>
  );
}
