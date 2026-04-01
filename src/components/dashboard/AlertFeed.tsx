'use client';

import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

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
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Recent Alerts
      </h3>
      <div className="space-y-2 overflow-y-auto max-h-48">
        <div
          className="flex items-start gap-2 text-xs p-2 rounded-lg"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colorMap.info }} />
          <div className="flex-1 min-w-0">
            <p style={{ color: 'var(--text-primary)' }}>
              Alerts are delivered in real time over WebSocket when you’re logged in.
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Trigger one by posting a reading above 31°C to the backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
