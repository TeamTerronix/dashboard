'use client';

import { Battery, Wifi, WifiOff, Clock, Signal } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { getLatestReadings } from '@/lib/api';
import { monitoringAreas } from '@/lib/areas';
import { nearestAreaId } from '@/lib/geo';
import type { SensorNode, TemperatureReading } from '@/lib/types';

export default function NodesPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

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
      const t = Date.parse(r.time);
      const ageMins = Number.isFinite(t) ? (Date.now() - t) / 60000 : 1e9;
      const status: SensorNode['status'] = ageMins < 120 ? 'online' : ageMins < 2880 ? 'delayed' : 'offline';
      return {
        id: r.nodeId,
        name: r.nodeId,
        areaId,
        latitude: r.latitude,
        longitude: r.longitude,
        depth: 0,
        battery: 0,
        status,
        lastSync: r.time,
        totalReadings: 0,
      };
    });
  }, [latestReadings]);

  const onlineCount = sensorNodes.filter((n) => n.status === 'online').length;
  const delayedCount = sensorNodes.filter((n) => n.status === 'delayed').length;
  const offlineCount = sensorNodes.filter((n) => n.status === 'offline').length;

  return (
    <div className="space-y-6">
      {/* Fleet Status */}
      <div
        className="flex items-center gap-6 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Node Fleet Status
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--accent-teal)' }} />
          <span style={{ color: 'var(--accent-teal)' }}>{onlineCount} Online</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--warn-amber)' }} />
          <span style={{ color: 'var(--warn-amber)' }}>{delayedCount} Delayed</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--danger-coral)' }} />
          <span style={{ color: 'var(--danger-coral)' }}>{offlineCount} Offline</span>
        </div>
      </div>

      {/* Node Table */}
      <div
        className="rounded-xl border p-4 overflow-x-auto"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th className="text-left py-2 px-2">Node</th>
              <th className="text-left py-2 px-2">Area</th>
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-right py-2 px-2">Depth</th>
              <th className="text-right py-2 px-2">Battery</th>
              <th className="text-left py-2 px-2">Last TX</th>
              <th className="text-right py-2 px-2">Readings</th>
              <th className="text-left py-2 px-2">Health</th>
            </tr>
          </thead>
          <tbody>
            {sensorNodes.map((node) => {
              const healthPct = node.status === 'offline' ? 0 : node.status === 'delayed' ? 40 : Math.min(100, node.battery + 20);
              const healthColor =
                node.status === 'offline'
                  ? 'var(--danger-coral)'
                  : node.status === 'delayed'
                  ? 'var(--warn-amber)'
                  : healthPct > 70
                  ? 'var(--accent-teal)'
                  : 'var(--warn-amber)';

              return (
                <tr
                  key={node.id}
                  className="border-t cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  style={{
                    borderColor: 'var(--grid-line)',
                    color: 'var(--text-primary)',
                    background: selectedNode === node.id ? 'var(--bg-elevated)' : 'transparent',
                  }}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  <td className="py-2.5 px-2 font-mono font-bold">{node.id}</td>
                  <td className="py-2.5 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {monitoringAreas.find((a) => a.id === node.areaId)?.name ?? '—'}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize"
                      style={{
                        background:
                          node.status === 'online'
                            ? 'rgba(29,233,182,0.15)'
                            : node.status === 'delayed'
                            ? 'rgba(255,179,0,0.15)'
                            : 'rgba(255,82,82,0.15)',
                        color:
                          node.status === 'online'
                            ? 'var(--accent-teal)'
                            : node.status === 'delayed'
                            ? 'var(--warn-amber)'
                            : 'var(--danger-coral)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            node.status === 'online'
                              ? 'var(--accent-teal)'
                              : node.status === 'delayed'
                              ? 'var(--warn-amber)'
                              : 'var(--danger-coral)',
                        }}
                      />
                      {node.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">{node.depth}m</td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Battery
                        className="w-3.5 h-3.5"
                        style={{
                          color: 'var(--text-secondary)',
                        }}
                      />
                      <span className="font-mono">{node.battery}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2" style={{ color: 'var(--text-secondary)' }}>
                    {timeAgo(node.lastSync)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">{node.totalReadings.toLocaleString()}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${healthPct}%`, background: healthColor }}
                        />
                      </div>
                      <span className="text-[10px]" style={{ color: healthColor }}>
                        {healthPct > 70 ? 'Good' : healthPct > 30 ? 'Fair' : 'Low'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected node detail */}
      {selectedNode && (() => {
        const node = sensorNodes.find((n) => n.id === selectedNode);
        if (!node) return null;
        return (
          <div
            className="rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Node ID</div>
              <div className="text-lg font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{node.id}</div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Coordinates</div>
              <div className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Signal Quality</div>
              <div className="flex items-center gap-1">
                <Signal className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                  {node.status === 'offline' ? 'N/A' : node.status === 'delayed' ? 'Weak' : 'Strong'}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Last Sync</div>
              <div className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{node.lastSync.split('T')[0]}</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
