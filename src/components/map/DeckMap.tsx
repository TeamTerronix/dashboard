'use client';

/**
 * DeckMap.tsx
 * ===========
 * 3D sensor visualisation using deck.gl ColumnLayer on an OpenStreetMap base.
 *
 * Each approved sensor is rendered as an extruded column ("pillar") where:
 *   Height  → scales with temperature (taller = warmer)
 *   Color   → Green (< 28°C healthy) · Yellow (28–30°C warning) · Red (> 30°C danger)
 *
 * No Mapbox token required — tiles served from OpenStreetMap.
 */

import { useCallback, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import type { PickingInfo } from '@deck.gl/core';
import type { SensorNode, TemperatureReading } from '@/lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function tempToColor(temp: number): [number, number, number, number] {
  if (temp < 28.0) return [0, 200, 80, 230];     // green  — healthy
  if (temp < 30.0) return [255, 185, 0, 230];     // yellow — warning
  return [230, 50, 50, 230];                       // red    — danger
}

function tempToElevation(temp: number): number {
  // Scale temperature 26-32°C → 0-60,000 m visual height
  return Math.max(0, (temp - 26) * 10000);
}

function riskLabel(temp: number): string {
  if (temp < 28) return 'Healthy';
  if (temp < 30) return 'Warning';
  return 'Danger';
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface SensorDatum {
  sensor_uid: string;
  name: string;
  longitude: number;
  latitude: number;
  depth: number;
  battery: number;
  status: string;
  temperature: number;
}

interface TooltipContent {
  x: number;
  y: number;
  object: SensorDatum;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface DeckMapProps {
  nodes: SensorNode[];
  latestReadings?: TemperatureReading[];
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function DeckMap({
  nodes,
  latestReadings = [],
  centerLat = 7.8731,
  centerLon = 80.7718,
  zoom = 7,
}: DeckMapProps) {
  const [tooltip, setTooltip] = useState<TooltipContent | null>(null);

  // Build temperature lookup
  const tempMap = new Map<string, number>();
  for (const r of latestReadings) {
    tempMap.set(r.nodeId, r.temperature);
  }

  // Merge node metadata with temperature
  const sensorData: SensorDatum[] = nodes
    .filter((n) => n.status !== 'offline')
    .map((n) => {
      const temp =
        tempMap.get(n.id) ??
        parseFloat(
          Math.max(26, Math.min(32,
            27.5 + (n.latitude - 7.5) * 0.8 + (n.longitude - 80.0) * 0.3
          )).toFixed(2)
        );
      return {
        sensor_uid: n.id,
        name: n.name,
        longitude: n.longitude,
        latitude: n.latitude,
        depth: n.depth,
        battery: n.battery,
        status: n.status,
        temperature: temp,
      };
    });

  // OSM base tile layer
  const tileLayer = new TileLayer({
    id: 'osm-tiles',
    data: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props) => {
      const { boundingBox } = props.tile;
      const [min, max] = boundingBox;
      return new BitmapLayer({
        ...props,
        data: undefined,
        image: props.data as string,
        bounds: [min[0], min[1], max[0], max[1]] as [number, number, number, number],
      });
    },
  });

  // 3D column layer — one pillar per sensor
  const columnLayer = new ColumnLayer<SensorDatum>({
    id: 'sensor-columns',
    data: sensorData,
    getPosition: (d) => [d.longitude, d.latitude],
    getElevation: (d) => tempToElevation(d.temperature),
    getFillColor: (d) => tempToColor(d.temperature),
    getLineColor: [0, 0, 0, 60],
    radius: 400,           // metres; visible at zoom 7-10
    diskResolution: 12,
    extruded: true,
    pickable: true,
    elevationScale: 1,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1,
    updateTriggers: {
      getElevation: sensorData.map((d) => d.temperature),
      getFillColor: sensorData.map((d) => d.temperature),
    },
  });

  const onHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      setTooltip({ x: info.x, y: info.y, object: info.object as SensorDatum });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <div className="relative w-full" style={{ height: 540 }}>
      <DeckGL
        initialViewState={{
          longitude: centerLon,
          latitude: centerLat,
          zoom,
          pitch: 50,
          bearing: 0,
        }}
        controller={true}
        layers={[tileLayer, columnLayer]}
        onHover={onHover}
        style={{ borderRadius: '0.75rem', overflow: 'hidden' }}
      />

      {/* Hover Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 rounded-lg border p-3 text-xs shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: 'rgba(13, 17, 23, 0.95)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            minWidth: 180,
          }}
        >
          <p className="font-bold mb-1" style={{ color: tempToColor(tooltip.object.temperature).slice(0, 3).join(',') === '230,50,50' ? '#ee3333' : tooltip.object.temperature < 28 ? '#00cc66' : '#ddaa00' }}>
            {tooltip.object.sensor_uid} — {riskLabel(tooltip.object.temperature)}
          </p>
          <div className="space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
            <p>Temp: <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{tooltip.object.temperature.toFixed(2)}°C</span></p>
            <p>Name: {tooltip.object.name}</p>
            <p>Depth: {tooltip.object.depth}m</p>
            <p>Battery: {tooltip.object.battery}%</p>
            <p>Status: {tooltip.object.status}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute top-3 right-3 z-[1000] rounded-lg border p-3 text-xs"
        style={{
          background: 'rgba(13, 17, 23, 0.92)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p className="font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>3D Temp Pillars</p>
        <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p><span style={{ color: '#00c850' }}>■</span> Healthy &lt; 28°C</p>
          <p><span style={{ color: '#ffb900' }}>■</span> Warning 28–30°C</p>
          <p><span style={{ color: '#e63232' }}>■</span> Danger &gt; 30°C</p>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
          Height ∝ Temperature
        </p>
      </div>

      {/* OSM Attribution */}
      <div
        className="absolute bottom-1 right-1 text-[9px] z-[1000]"
        style={{ color: 'rgba(150,150,150,0.8)' }}
      >
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>OpenStreetMap</a>
      </div>
    </div>
  );
}
