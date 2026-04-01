'use client';

import { useState } from 'react';
import { alerts, alertRules } from '@/lib/mock-data';
import { AlertTriangle, CheckCircle, XCircle, Info, Plus, Pause, Play } from 'lucide-react';
import { timeAgo, formatDate } from '@/lib/utils';

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

export default function AlertsPage() {
  const [filter, setFilter] = useState<string>('all');

  const criticalCount = alerts.filter((a) => a.type === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.type === 'warning' && !a.acknowledged).length;
  const resolvedCount = alerts.filter((a) => a.type === 'resolved').length;

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.type === filter);

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      <div
        className="flex items-center gap-6 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: 'var(--danger-coral)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--danger-coral)' }}>{criticalCount} Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: 'var(--warn-amber)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--warn-amber)' }}>{warningCount} Warnings</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: 'var(--accent-teal)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--accent-teal)' }}>{resolvedCount} Resolved</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {['all', 'critical', 'warning', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded text-xs capitalize cursor-pointer"
              style={{
                background: filter === f ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                color: filter === f ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Rules */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Alert Rules</h3>
            <button
              className="flex items-center gap-1 px-3 py-1 rounded text-xs cursor-pointer"
              style={{ background: 'var(--accent-cyan)', color: 'var(--bg-primary)' }}
            >
              <Plus className="w-3 h-3" /> New Rule
            </button>
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--text-secondary)' }}>
                <th className="text-left py-2">Rule</th>
                <th className="text-left py-2">Condition</th>
                <th className="text-left py-2">Nodes</th>
                <th className="text-left py-2">Action</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {alertRules.map((rule) => (
                <tr key={rule.id} className="border-t" style={{ borderColor: 'var(--grid-line)', color: 'var(--text-primary)' }}>
                  <td className="py-2 font-medium">{rule.name}</td>
                  <td className="py-2 font-mono">{rule.condition}</td>
                  <td className="py-2">{rule.nodes}</td>
                  <td className="py-2 capitalize">{rule.action}</td>
                  <td className="py-2 text-center">
                    <button className="cursor-pointer" style={{ color: rule.status === 'active' ? 'var(--accent-teal)' : 'var(--text-secondary)' }}>
                      {rule.status === 'active' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alert History */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Alert History</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map((alert) => {
              const Icon = iconMap[alert.type];
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: colorMap[alert.type] }} />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold" style={{ color: colorMap[alert.type] }}>{alert.nodeId}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{formatDate(alert.timestamp)}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>({timeAgo(alert.timestamp)})</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
                    {alert.temperature && (
                      <span className="font-mono" style={{ color: colorMap[alert.type] }}>{alert.temperature}°C</span>
                    )}
                  </div>
                  {!alert.acknowledged && (
                    <button
                      className="text-[10px] px-2 py-0.5 rounded cursor-pointer"
                      style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
                    >
                      ACK
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
