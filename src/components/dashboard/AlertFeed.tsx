'use client';

import { alerts } from '@/lib/mock-data';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

const iconMap = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  resolved: CheckCircle,
};

const colorMap = {
  critical: 'var(--danger-coral)',
  warning: 'var(--warn-amber)',
  info: 'var(--accent-cyan)',
  resolved: 'var(--accent-teal)',
};

export default function AlertFeed() {
  const recentAlerts = alerts.slice(0, 6);

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Recent Alerts
      </h3>
      <div className="space-y-2 overflow-y-auto max-h-48">
        {recentAlerts.map((alert) => {
          const Icon = iconMap[alert.type];
          return (
            <div
              key={alert.id}
              className="flex items-start gap-2 text-xs p-2 rounded-lg"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colorMap[alert.type] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold" style={{ color: colorMap[alert.type] }}>
                    {alert.nodeId}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{timeAgo(alert.timestamp)}</span>
                </div>
                <p style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
                {alert.temperature && (
                  <span className="font-mono" style={{ color: colorMap[alert.type] }}>
                    {alert.temperature}°C
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
