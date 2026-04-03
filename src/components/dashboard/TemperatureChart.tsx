'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDashboardStore } from '@/lib/store';
import { getSST, getPredictions } from '@/lib/api';
import type { TemperatureReading } from '@/lib/types';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';

const NODE_COLORS = [
  '#00E5FF', '#1DE9B6', '#FFB300', '#FF5252', '#7C4DFF',
  '#FF6E40', '#64FFDA', '#FFAB40', '#69F0AE', '#40C4FF',
  '#B388FF', '#FF80AB', '#A7FFEB', '#FFD180', '#CCFF90', '#84FFFF',
];

// ── Custom Legend ──────────────────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[10px] justify-center mt-1" style={{ color: 'var(--text-secondary)' }}>
      <span className="flex items-center gap-1">
        <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="var(--text-secondary)" strokeWidth="2" /></svg>
        Historical (actual)
      </span>
      <span className="flex items-center gap-1">
        <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="var(--text-secondary)" strokeWidth="2" strokeDasharray="4 2" /></svg>
        PINN 7-day forecast
      </span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TemperatureChart() {
  const { selectedNodes } = useDashboardStore();
  const [mounted, setMounted] = useState(false);
  const [readings, setReadings] = useState<TemperatureReading[]>([]);
  const [forecastByNode, setForecastByNode] = useState<Record<string, { time: string; predicted: number }[]>>({});
  const [dataRefreshTick, setDataRefreshTick] = useState(0);

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
        if (!cancelled) setReadings(mapped);
      } catch {
        if (!cancelled) setReadings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataRefreshTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const preds = await getPredictions(0, 5000);
        const anyPreds = preds as any;
        const rows = (Array.isArray(anyPreds?.value) ? anyPreds.value : anyPreds) as any[];
        const by: Record<string, { time: string; predicted: number }[]> = {};
        for (const p of rows) {
          const nodeId = String(p.sensor_uid ?? p.sensor_id ?? 'unknown');
          if (!by[nodeId]) by[nodeId] = [];
          by[nodeId].push({ time: String(p.target_timestamp), predicted: Number(p.predicted_temp) });
        }
        for (const k of Object.keys(by)) by[k].sort((a, b) => a.time.localeCompare(b.time));
        if (!cancelled) setForecastByNode(by);
      } catch {
        if (!cancelled) setForecastByNode({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataRefreshTick]);

  const chartData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    for (const r of readings) {
      if (!selectedNodes.includes(r.nodeId)) continue;
      const date = r.time.split('T')[0];
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][r.nodeId] = r.temperature;
    }

    const historicalEntries = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14);

    const combined: Record<string, number | string>[] = [];
    for (const [date, nodes] of historicalEntries) combined.push({ date: date.slice(5), ...nodes });

    // Forecast: use predictions table (first 7 days) if available
    const horizon = 7 * 24;
    const firstNode = selectedNodes[0];
    const anyForecast = firstNode ? (forecastByNode[firstNode] ?? []) : [];
    const fcSlice = anyForecast.slice(0, horizon);
    for (const item of fcSlice) {
      const row: Record<string, number | string> = { date: String(item.time).slice(5, 10) };
      for (const nodeId of selectedNodes) {
        const series = forecastByNode[nodeId];
        const match = series?.find((s) => s.time === item.time);
        if (match) row[`${nodeId}_fc`] = Number(match.predicted.toFixed(2));
      }
      combined.push(row);
    }
    return combined;
  }, [forecastByNode, readings, selectedNodes]);

  const activeNodeIds = selectedNodes;

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Temperature Time Series — Historical + 7-day PINN Forecast
        </h3>
      </div>

      <CustomLegend />

      <div className="h-72 mt-2">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                stroke="var(--grid-line)"
              />
              <YAxis
                domain={[25, 32]}
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
                formatter={(value, name) => {
                  const n = String(name ?? '');
                  const isForecast = n.endsWith('_fc');
                  const nodeId = isForecast ? n.replace('_fc', '') : n;
                  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
                  return [`${numericValue.toFixed(2)}°C`, isForecast ? `${nodeId} (forecast)` : nodeId] as [string, string];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }}
                formatter={(value: string) => {
                  const isFc = value.endsWith('_fc');
                  return isFc ? `${value.replace('_fc', '')} ┄` : value;
                }}
              />

              {/* Threshold reference lines */}
              <ReferenceLine
                y={28}
                stroke="var(--warn-amber)"
                strokeDasharray="5 5"
                label={{ value: '28°C Warning', fill: 'var(--warn-amber)', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={30}
                stroke="var(--danger-coral)"
                strokeDasharray="5 5"
                label={{ value: '30°C Danger', fill: 'var(--danger-coral)', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                y={31}
                stroke="#ff00aa"
                strokeDasharray="3 3"
                label={{ value: '31°C Bleaching', fill: '#ff00aa', fontSize: 10, position: 'right' }}
              />

              {/* Historical lines — solid */}
              {activeNodeIds.map((nodeId, i) => (
                <Line
                  key={nodeId}
                  type="monotone"
                  dataKey={nodeId}
                  name={nodeId}
                  stroke={NODE_COLORS[i % NODE_COLORS.length]}
                  strokeWidth={1.8}
                  dot={false}
                  strokeOpacity={0.85}
                  connectNulls={false}
                />
              ))}

              {/* Forecast lines — dashed, same color, slightly thinner */}
              {activeNodeIds.map((nodeId, i) => (
                <Line
                  key={`${nodeId}_fc`}
                  type="monotone"
                  dataKey={`${nodeId}_fc`}
                  name={`${nodeId}_fc`}
                  stroke={NODE_COLORS[i % NODE_COLORS.length]}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  dot={false}
                  strokeOpacity={0.6}
                  connectNulls={false}
                  legendType="none"
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {/* Forecast badge */}
      <p className="text-[10px] mt-2 text-right" style={{ color: 'var(--text-secondary)' }}>
        Dashed lines represent PINN-predicted temperatures for the next 7 days · Physics residual enforced via heat-diffusion equation
      </p>
    </div>
  );
}
