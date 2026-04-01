'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { sensorNodes, monitoringAreas, getLatestReadings } from '@/lib/mock-data';
import { MapPin, Thermometer, ChevronDown, Layers, Box } from 'lucide-react';

const mapLoader = (
  <div
    className="w-full flex items-center justify-center rounded-xl"
    style={{ background: 'var(--bg-elevated)', height: 540 }}
  >
    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading map...</span>
  </div>
);

// Dynamically import both maps — no SSR for either (canvas / Leaflet)
const SensorMap = dynamic(() => import('@/components/map/SensorMap'), {
  ssr: false,
  loading: () => mapLoader,
});

const DeckMap = dynamic(() => import('@/components/map/DeckMap'), {
  ssr: false,
  loading: () => mapLoader,
});

export default function MapPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'2d' | '3d'>('2d');

  const nodes = sensorNodes;
  const areas = monitoringAreas;
  const latestReadings = getLatestReadings();

  const currentArea = areas.find((a) => a.id === selectedArea);
  const areaNodes = selectedArea ? nodes.filter((n) => n.areaId === selectedArea) : nodes;
  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Coral Reef Monitoring — {currentArea ? currentArea.name : 'All Areas'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {currentArea
                ? `${currentArea.description} — PINN model temperature heatmap overlay`
                : `Sri Lanka — ${areas.length} monitoring areas, ${nodes.length} total nodes`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Area selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setAreaDropdownOpen(!areaDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: currentArea?.color ?? 'var(--text-secondary)' }}
              />
              {currentArea?.name ?? 'All Areas'}
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
            </button>

            {areaDropdownOpen && (
              <div
                className="absolute top-full right-0 mt-1 w-52 rounded-lg border shadow-lg z-50 overflow-hidden"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => { setSelectedArea(null); setSelectedNode(null); setAreaDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors"
                  style={{
                    background: selectedArea === null ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                    color: 'var(--text-primary)',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = selectedArea === null ? 'rgba(0, 229, 255, 0.08)' : 'transparent')}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                  All Areas
                  <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                    {nodes.length} nodes
                  </span>
                </button>
                {areas.map((a) => {
                  const count = nodes.filter((n) => n.areaId === a.id).length;
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedArea(a.id); setSelectedNode(null); setAreaDropdownOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors"
                      style={{
                        background: selectedArea === a.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                        color: 'var(--text-primary)',
                        border: 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = selectedArea === a.id ? 'rgba(0, 229, 255, 0.08)' : 'transparent')}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                      {a.name}
                      <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        {count} nodes
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Thermometer className="w-3.5 h-3.5" />
            {areaNodes.filter((n) => n.status === 'online').length}/{areaNodes.length} nodes online
          </span>

          {/* 2D / 3D toggle */}
          <div
            className="flex rounded-lg border overflow-hidden text-xs font-medium"
            style={{ borderColor: 'var(--border)' }}
          >
            {(['2d', '3d'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
                style={{
                  background: mapMode === mode ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                  color: mapMode === mode ? '#000' : 'var(--text-secondary)',
                  border: 'none',
                }}
              >
                {mode === '2d' ? <Layers className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main map area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map - 3/4 */}
        <div
          className="lg:col-span-3 rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {mapMode === '2d' ? (
            <SensorMap
              nodes={nodes}
              areas={areas}
              latestReadings={latestReadings}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              selectedArea={selectedArea}
              onSelectArea={(id) => { setSelectedArea(id); setSelectedNode(null); }}
              showHeatmap={true}
            />
          ) : (
            <DeckMap
              nodes={areaNodes}
              latestReadings={latestReadings}
              centerLat={currentArea?.center.lat ?? 7.8731}
              centerLon={currentArea?.center.lon ?? 80.7718}
              zoom={currentArea ? (currentArea.defaultZoom - 2) : 7}
            />
          )}
        </div>

        {/* Node Detail Panel - 1/4 */}
        <div
          className="rounded-xl border p-4 flex flex-col gap-3"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {selectedNodeData ? 'Node Detail' : currentArea ? `${currentArea.name}` : 'Area Overview'}
          </h3>

          {selectedNodeData ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background:
                      selectedNodeData.status === 'online'
                        ? 'var(--accent-teal)'
                        : selectedNodeData.status === 'delayed'
                        ? 'var(--warn-amber)'
                        : 'var(--danger-coral)',
                  }}
                />
                <span className="font-mono font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                  {selectedNodeData.id}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedNodeData.name}
                </span>
              </div>

              {[
                ['Status', selectedNodeData.status],
                ['Area', areas.find((a) => a.id === selectedNodeData.areaId)?.name ?? '—'],
                ['Depth', `${selectedNodeData.depth}m`],
                ['Battery', `${selectedNodeData.battery}%`],
                ['Last Sync', selectedNodeData.lastSync.split('T')[0]],
                ['Lat', selectedNodeData.latitude.toFixed(4)],
                ['Lon', selectedNodeData.longitude.toFixed(4)],
                ['Readings', selectedNodeData.totalReadings.toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--grid-line)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{val}</span>
                </div>
              ))}
            </div>
          ) : currentArea ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Click a node marker on the map to view its details.
            </p>
          ) : (
            // Area overview cards
            <div className="space-y-2">
              {areas.map((a) => {
                const aNodes = nodes.filter((n) => n.areaId === a.id);
                const online = aNodes.filter((n) => n.status === 'online').length;
                return (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedArea(a.id); setSelectedNode(null); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border text-left cursor-pointer transition-colors"
                    style={{
                      background: 'var(--bg-elevated)',
                      borderColor: 'var(--border)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = a.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {a.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--accent-cyan)' }}>
                      {online}/{aNodes.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sensor summary */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--grid-line)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {currentArea ? `${currentArea.name} Sensors` : 'Network Overview'}
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Total Nodes</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{areaNodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Online</span>
                <span className="font-mono" style={{ color: 'var(--accent-teal)' }}>
                  {areaNodes.filter((n) => n.status === 'online').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Delayed</span>
                <span className="font-mono" style={{ color: 'var(--warn-amber)' }}>
                  {areaNodes.filter((n) => n.status === 'delayed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Offline</span>
                <span className="font-mono" style={{ color: 'var(--danger-coral)' }}>
                  {areaNodes.filter((n) => n.status === 'offline').length}
                </span>
              </div>
              {!selectedArea && (
                <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--grid-line)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Areas</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{areas.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Map info */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--grid-line)' }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              About This Map
            </h4>
            <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {currentArea
                ? `Real-world sensor locations at ${currentArea.name}, ${currentArea.description}. The heatmap overlay is generated via IDW interpolation from active sensor readings. The dashed boundary marks the convex hull monitoring area.`
                : `Overview of ${areas.length} coral reef monitoring areas across Sri Lanka. Click an area marker or select from the dropdown to view individual sensor nodes and heatmap overlays.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
