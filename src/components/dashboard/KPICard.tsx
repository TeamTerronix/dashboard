'use client';

import { useEffect, useState } from 'react';
import type { DashboardKPI } from '@/lib/types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  kpi: DashboardKPI;
}

export default function KPICard({ kpi }: KPICardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const statusColors: Record<string, string> = {
    normal: 'var(--accent-teal)',
    warning: 'var(--warn-amber)',
    danger: 'var(--danger-coral)',
  };

  const sparkData = kpi.sparkline.map((v, i) => ({ v, i }));

  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-2 border ${kpi.status === 'danger' ? 'pulse-alert' : ''
        }`}
      style={{
        background: 'var(--bg-surface)',
        borderColor: kpi.status === 'danger' ? 'var(--danger-coral)' : 'var(--border)',
      }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {kpi.label}
      </span>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold font-mono" style={{ color: statusColors[kpi.status] }}>
            {kpi.value}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {kpi.unit}
          </span>
        </div>
        <span
          className="text-xs font-mono"
          style={{
            color:
              kpi.deltaDirection === 'up'
                ? kpi.status === 'danger'
                  ? 'var(--danger-coral)'
                  : 'var(--warn-amber)'
                : 'var(--accent-teal)',
          }}
        >
          {kpi.delta}
        </span>
      </div>

      {/* Sparkline */}
      <div className="h-8">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={statusColors[kpi.status]}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}
