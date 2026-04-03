'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, ZAxis,
  LineChart, Line,
} from 'recharts';
import { useDashboardStore } from '@/lib/store';
import { getSST } from '@/lib/api';
import type { TemperatureReading } from '@/lib/types';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';

const COLORS = [
  '#00E5FF', '#1DE9B6', '#FFB300', '#FF5252', '#7C4DFF',
  '#FF6E40', '#64FFDA', '#FFAB40', '#69F0AE', '#40C4FF',
  '#B388FF', '#FF80AB', '#A7FFEB', '#FFD180', '#CCFF90', '#84FFFF',
];

export default function AnalyticsPage() {
  const { selectedNodes } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [temperatureReadings, setTemperatureReadings] = useState<TemperatureReading[]>([]);
  const [dataRefreshTick, setDataRefreshTick] = useState(0);
  const [seriesNodeId, setSeriesNodeId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return subscribeDashboardDataRefresh(() => setDataRefreshTick((t) => t + 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sst = await getSST(undefined, undefined, 5000);
        const anySst = sst as any;
        const rows = (Array.isArray(anySst?.value) ? anySst.value : anySst) as any[];
        const mapped: TemperatureReading[] = rows.map((r) => ({
          time: r.time,
          nodeId: String(r.sensor_uid ?? r.sensor_id ?? 'unknown'),
          temperature: Number(r.temperature),
          dhw: 0,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        }));
        if (!cancelled) setTemperatureReadings(mapped);
      } catch {
        if (!cancelled) setTemperatureReadings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataRefreshTick]);

  // Time series data (kept for distribution/stats)
  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of temperatureReadings) {
      if (!selectedNodes.includes(r.nodeId)) continue;
      const date = r.time.split('T')[0];
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][r.nodeId] = r.temperature;
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, nodes]) => ({ date: date.slice(5), ...nodes }));
  }, [selectedNodes, temperatureReadings]);

  // Distribution histogram
  const histData = useMemo(() => {
    const bins: Record<string, number> = {};
    for (const r of temperatureReadings) {
      if (!selectedNodes.includes(r.nodeId)) continue;
      const bin = (Math.floor(r.temperature * 2) / 2).toFixed(1);
      bins[bin] = (bins[bin] || 0) + 1;
    }
    return Object.entries(bins)
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([temp, count]) => ({ temp, count }));
  }, [selectedNodes, temperatureReadings]);

  // Per-node statistics
  const nodeStats = useMemo(() => {
    const stats: Record<string, number[]> = {};
    for (const r of temperatureReadings) {
      if (!selectedNodes.includes(r.nodeId)) continue;
      if (!stats[r.nodeId]) stats[r.nodeId] = [];
      stats[r.nodeId].push(r.temperature);
    }
    return Object.entries(stats).map(([nodeId, temps]) => {
      const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
      const std = Math.sqrt(temps.reduce((a, b) => a + (b - mean) ** 2, 0) / temps.length);
      return {
        nodeId,
        mean: parseFloat(mean.toFixed(2)),
        std: parseFloat(std.toFixed(2)),
        min: parseFloat(Math.min(...temps).toFixed(2)),
        max: parseFloat(Math.max(...temps).toFixed(2)),
        count: temps.length,
      };
    });
  }, [selectedNodes, temperatureReadings]);

  const nodeOptionsForSeries = useMemo(() => {
    const ids = new Set<string>();
    for (const nid of selectedNodes) ids.add(nid);
    if (ids.size === 0) {
      for (const r of temperatureReadings) ids.add(r.nodeId);
    }
    return Array.from(ids).sort();
  }, [selectedNodes, temperatureReadings]);

  useEffect(() => {
    if (!nodeOptionsForSeries.length) {
      if (seriesNodeId) setSeriesNodeId('');
      return;
    }
    if (!seriesNodeId || !nodeOptionsForSeries.includes(seriesNodeId)) {
      setSeriesNodeId(nodeOptionsForSeries[0]);
    }
  }, [nodeOptionsForSeries, seriesNodeId]);

  const nodeTimeSeries = useMemo(() => {
    if (!seriesNodeId) return [];
    const points = temperatureReadings
      .filter((r) => r.nodeId === seriesNodeId)
      .map((r) => {
        const t = Date.parse(r.time);
        return {
          t: Number.isFinite(t) ? t : 0,
          time: r.time,
          temperature: r.temperature,
        };
      })
      .filter((p) => p.t > 0)
      .sort((a, b) => a.t - b.t);

    return points.map((p) => {
      const d = new Date(p.time);
      return {
        label: d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        iso: p.time,
        temperature: Number(p.temperature.toFixed(2)),
      };
    });
  }, [seriesNodeId, temperatureReadings]);

  // Correlation scatter data (BR-01 vs BR-07 for example)
  const scatterData = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    for (const r of temperatureReadings) {
      const date = r.time.split('T')[0];
      if (!byDate[date]) byDate[date] = {};
      byDate[date][r.nodeId] = r.temperature;
    }
    const a = selectedNodes[0];
    const b = selectedNodes[1];
    if (!a || !b) return [];
    return Object.values(byDate)
      .filter((d) => (d[a] != null) && (d[b] != null))
      .map((d) => ({ x: d[a], y: d[b] }));
  }, [selectedNodes, temperatureReadings]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {selectedNodes.length} nodes selected · {temperatureReadings.filter((r) => selectedNodes.includes(r.nodeId)).length} readings
        </span>
      </div>

      {/* Distribution + Correlation + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution Histogram */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Temperature Distribution
          </h3>
          <div className="h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                  <XAxis dataKey="temp" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Correlation BR-01 vs BR-07 */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Correlation: selected node pair
          </h3>
          <div className="h-48">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="BR-01"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    stroke="var(--grid-line)"
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="BR-07"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    stroke="var(--grid-line)"
                  />
                  <ZAxis range={[20, 20]} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Scatter data={scatterData} fill="var(--accent-teal)" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Statistics Table */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Statistics
          </h3>
          <div className="overflow-y-auto max-h-48">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-secondary)' }}>
                  <th className="text-left py-1">Node</th>
                  <th className="text-right py-1">Mean</th>
                  <th className="text-right py-1">σ</th>
                  <th className="text-right py-1">Min</th>
                  <th className="text-right py-1">Max</th>
                </tr>
              </thead>
              <tbody>
                {nodeStats.map((s) => (
                  <tr key={s.nodeId} className="border-t font-mono" style={{ borderColor: 'var(--grid-line)', color: 'var(--text-primary)' }}>
                    <td className="py-1">{s.nodeId}</td>
                    <td className="text-right">{s.mean}</td>
                    <td className="text-right">{s.std}</td>
                    <td className="text-right">{s.min}</td>
                    <td className="text-right" style={{ color: s.max >= 29 ? 'var(--danger-coral)' : 'inherit' }}>{s.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Temperature vs time — one node at a time */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Temperature over time
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Node
            </label>
            <select
              value={seriesNodeId}
              onChange={(e) => setSeriesNodeId(e.target.value)}
              className="text-xs rounded-lg border px-2 py-1.5 min-w-[140px] outline-none cursor-pointer"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {nodeOptionsForSeries.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
          Shows all samples returned for this node (same data as charts above). Select nodes from the dashboard
          node picker to scope which IDs appear here.
        </p>
        <div className="h-72">
          {mounted && nodeTimeSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={nodeTimeSeries} margin={{ top: 8, right: 16, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                  stroke="var(--grid-line)"
                  interval="preserveStartEnd"
                  angle={-35}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                  stroke="var(--grid-line)"
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => {
                    const v = typeof value === 'number' ? value : Number(value);
                    const text = Number.isFinite(v) ? `${v}°C` : '—';
                    return [text, 'Temperature'];
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="var(--accent-cyan)"
                  strokeWidth={2}
                  dot={{ r: 2, fill: 'var(--accent-cyan)' }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="h-full flex items-center justify-center rounded-lg text-xs"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {nodeOptionsForSeries.length === 0
                ? 'No nodes in scope — select nodes on the dashboard or wait for data.'
                : 'No readings for this node yet.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
