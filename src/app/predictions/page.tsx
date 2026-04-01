'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts';
import { generateForecast, zoneRisks, trainingHistory, generatePredictionGrid } from '@/lib/mock-data';
import { tempToColor } from '@/lib/utils';
import type { PredictionPoint, ForecastData } from '@/lib/types';

type ModelType = 'PINN' | 'LSTM' | 'Ensemble';
type Horizon = '72h' | '7d' | '30d';

export default function PredictionsPage() {
  const [model, setModel] = useState<ModelType>('PINN');
  const [horizon, setHorizon] = useState<Horizon>('7d');
  const [confidence, setConfidence] = useState<90 | 95>(95);
  const [mounted, setMounted] = useState(false);

  const horizonDays = horizon === '72h' ? 3 : horizon === '7d' ? 7 : 30;
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [predGrid, setPredGrid] = useState<PredictionPoint[]>([]);
  const [dhwData, setDhwData] = useState<{ week: string; dhw: number }[]>([]);

  useEffect(() => {
    setForecastData(generateForecast(horizonDays));
  }, [horizonDays]);

  useEffect(() => {
    setMounted(true);
    setPredGrid(generatePredictionGrid());
    setDhwData(Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      dhw: Math.max(0, 0.5 * i + Math.random() * 1.5 - 0.5),
    })));
  }, []);

  // Map dims
  const MW = 350, MH = 220;
  const latMin = 8.870, latMax = 8.885, lonMin = 79.518, lonMax = 79.533;
  const toX = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * MW;
  const toY = (lat: number) => MH - ((lat - latMin) / (latMax - latMin)) * MH;

  return (
    <div className="space-y-6">
      {/* Model Control Panel */}
      <div
        className="flex flex-wrap items-center gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Model:</span>
          {(['PINN', 'LSTM', 'Ensemble'] as ModelType[]).map((m) => (
            <button
              key={m}
              onClick={() => setModel(m)}
              className="px-3 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: model === m ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: model === m ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Horizon:</span>
          {(['72h', '7d', '30d'] as Horizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className="px-3 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: horizon === h ? 'var(--accent-teal)' : 'var(--bg-elevated)',
                color: horizon === h ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {h}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>CI:</span>
          {([90, 95] as const).map((c) => (
            <button
              key={c}
              onClick={() => setConfidence(c)}
              className="px-2 py-1 rounded text-xs font-mono cursor-pointer"
              style={{
                background: confidence === c ? 'var(--warn-amber)' : 'var(--bg-elevated)',
                color: confidence === c ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {c}%
            </button>
          ))}
        </div>

        <button
          className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
        >
          Run Forecast
        </button>
      </div>

      {/* Forecast Chart */}
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {model} Forecast — {horizon} Horizon ({confidence}% CI)
        </h3>
        <div className="h-72">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} stroke="var(--grid-line)" />
                <YAxis domain={[26, 30]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} stroke="var(--grid-line)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <ReferenceLine y={28} stroke="var(--warn-amber)" strokeDasharray="5 5" />
                <ReferenceLine y={29} stroke="var(--danger-coral)" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="upperBound" stroke="none" fill="var(--accent-cyan)" fillOpacity={0.1} name="Upper Bound" />
                <Area type="monotone" dataKey="lowerBound" stroke="none" fill="var(--accent-cyan)" fillOpacity={0.1} name="Lower Bound" />
                <Line type="monotone" dataKey="actual" stroke="var(--accent-teal)" strokeWidth={2} dot={false} name="Historical" />
                <Line type="monotone" dataKey="predicted" stroke="var(--accent-cyan)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Predicted" />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Bottom: Danger map + Risk cards + Model Performance + DHW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Danger Zone Map */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Predicted Danger Zones
          </h3>
          <svg viewBox={`0 0 ${MW} ${MH}`} className="w-full rounded-lg" style={{ background: 'var(--bg-primary)' }}>
            {predGrid.map((p, i) => (
              <rect
                key={i}
                x={toX(p.longitude) - 7}
                y={toY(p.latitude) - 5}
                width={15}
                height={10}
                fill={tempToColor(p.temperature)}
                opacity={0.65}
              />
            ))}
          </svg>

          {/* Risk score bars */}
          <div className="space-y-2 mt-3">
            {zoneRisks.map((z) => (
              <div key={z.zone} className="flex items-center gap-2 text-xs">
                <span className="w-14 font-mono" style={{ color: 'var(--text-primary)' }}>{z.zone}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${z.risk}%`,
                      background: z.risk > 60 ? 'var(--danger-coral)' : z.risk > 30 ? 'var(--warn-amber)' : 'var(--accent-teal)',
                    }}
                  />
                </div>
                <span className="font-mono w-10 text-right" style={{ color: 'var(--text-secondary)' }}>{z.risk}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Model Performance + DHW */}
        <div className="space-y-6">
          {/* Model perf */}
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Model Performance ({model})
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'MAE', value: '0.23°C' },
                { label: 'RMSE', value: '0.31°C' },
                { label: 'R²', value: '0.94' },
                { label: 'Physics Loss', value: '0.008' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <div className="font-mono text-lg font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {m.value}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DHW Accumulation */}
          <div
            className="rounded-xl border p-4"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Degree Heating Weeks (12-week Rolling)
            </h3>
            <div className="h-36">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dhwData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                    <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                    <YAxis domain={[0, 10]} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} stroke="var(--grid-line)" />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: 'var(--text-primary)',
                      }}
                    />
                    <ReferenceLine y={4} stroke="var(--warn-amber)" strokeDasharray="4 4" label={{ value: 'DHW=4 Alert', fill: 'var(--warn-amber)', fontSize: 9 }} />
                    <ReferenceLine y={8} stroke="var(--danger-coral)" strokeDasharray="4 4" label={{ value: 'DHW=8 Bleach', fill: 'var(--danger-coral)', fontSize: 9 }} />
                    <Area type="monotone" dataKey="dhw" stroke="var(--warn-amber)" fill="var(--warn-amber)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
