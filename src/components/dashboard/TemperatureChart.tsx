'use client';

import { useEffect, useState } from 'react';
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
import { temperatureReadings, sensorNodes, generateForecast } from '@/lib/mock-data';
import { useDashboardStore } from '@/lib/store';

const NODE_COLORS = [
  '#00E5FF', '#1DE9B6', '#FFB300', '#FF5252', '#7C4DFF',
  '#FF6E40', '#64FFDA', '#FFAB40', '#69F0AE', '#40C4FF',
  '#B388FF', '#FF80AB', '#A7FFEB', '#FFD180', '#CCFF90', '#84FFFF',
];

// ── Data helpers ───────────────────────────────────────────────────────────────

/**
 * Merges the last 14 days of historical readings with a 7-day PINN forecast
 * per selected node.  Historical keys: nodeId.  Forecast keys: nodeId + "_fc".
 * Both share the same `date` axis so the chart reads as one continuous timeline.
 */
function buildChartData(selectedNodes: string[]) {
  const HISTORICAL_DAYS = 14;
  const FORECAST_DAYS = 7;

  // ── Historical ────────────────────────────────────────────────────────────
  const dateMap: Record<string, Record<string, number>> = {};

  for (const r of temperatureReadings) {
    if (!selectedNodes.includes(r.nodeId)) continue;
    const date = r.time.split('T')[0];
    if (!dateMap[date]) dateMap[date] = {};
    dateMap[date][r.nodeId] = r.temperature;
  }

  const historicalEntries = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-HISTORICAL_DAYS);

  // ── Forecast (per-node with small per-node variation) ─────────────────────
  const baseForecast = generateForecast(FORECAST_DAYS);
  const forecastRows = baseForecast.filter((f) => f.actual === undefined);

  // ── Combine ───────────────────────────────────────────────────────────────
  const combined: Record<string, number | string>[] = [];

  for (const [date, nodes] of historicalEntries) {
    combined.push({ date: date.slice(5), ...nodes });
  }

  for (let i = 0; i < forecastRows.length; i++) {
    const row: Record<string, number | string> = {
      date: forecastRows[i].time.slice(5),
    };
    for (const nodeId of selectedNodes) {
      const nodeNum = parseInt(nodeId.replace(/^[A-Z]+-/, ''), 10) || 1;
      const variation = (nodeNum - 8) * 0.04;
      row[`${nodeId}_fc`] = parseFloat((forecastRows[i].predicted + variation).toFixed(2));
    }
    combined.push(row);
  }

  return combined;
}

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = buildChartData(selectedNodes);
  const activeNodes = sensorNodes.filter((n) => selectedNodes.includes(n.id));

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
              {activeNodes.map((node, i) => (
                <Line
                  key={node.id}
                  type="monotone"
                  dataKey={node.id}
                  name={node.id}
                  stroke={NODE_COLORS[i % NODE_COLORS.length]}
                  strokeWidth={1.8}
                  dot={false}
                  strokeOpacity={0.85}
                  connectNulls={false}
                />
              ))}

              {/* Forecast lines — dashed, same color, slightly thinner */}
              {activeNodes.map((node, i) => (
                <Line
                  key={`${node.id}_fc`}
                  type="monotone"
                  dataKey={`${node.id}_fc`}
                  name={`${node.id}_fc`}
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
