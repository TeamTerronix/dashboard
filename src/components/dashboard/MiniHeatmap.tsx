'use client';

import { generatePredictionGrid, sensorNodes } from '@/lib/mock-data';
import { tempToColor } from '@/lib/utils';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Expand } from 'lucide-react';
import type { PredictionPoint } from '@/lib/types';

export default function MiniHeatmap() {
  const [grid, setGrid] = useState<PredictionPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setGrid(generatePredictionGrid());
    setMounted(true);
  }, []);

  const nodes = sensorNodes.filter((n) => n.status !== 'offline');

  // Canvas dimensions
  const W = 280;
  const H = 200;

  // Bounds
  const latMin = 8.870, latMax = 8.885;
  const lonMin = 79.518, lonMax = 79.533;

  const toX = (lon: number) => ((lon - lonMin) / (lonMax - lonMin)) * W;
  const toY = (lat: number) => H - ((lat - latMin) / (latMax - latMin)) * H;

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Spatial Heatmap
        </h3>
        <Link href="/map" className="hover:opacity-80" style={{ color: 'var(--accent-cyan)' }}>
          <Expand className="w-4 h-4" />
        </Link>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg" style={{ background: 'var(--bg-primary)' }}>
        {/* Heatmap cells */}
        {grid.map((p, i) => (
          <rect
            key={i}
            x={toX(p.longitude) - 6}
            y={toY(p.latitude) - 4}
            width={12}
            height={9}
            fill={tempToColor(p.temperature)}
            opacity={0.7}
          />
        ))}

        {/* Node markers */}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={toX(n.longitude)} cy={toY(n.latitude)} r={4} fill="white" opacity={0.9} />
            <circle cx={toX(n.longitude)} cy={toY(n.latitude)} r={2} fill="var(--bg-primary)" />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        <span>25°C</span>
        <div
          className="flex-1 mx-2 h-2 rounded"
          style={{
            background: 'linear-gradient(90deg, #00A0FF, #1DE9B6, #FFB300, #FF5252)',
          }}
        />
        <span>31°C</span>
      </div>
    </div>
  );
}
