'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { SensorNode, TemperatureReading, MonitoringArea } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Helpers ──────────────────────────────────────────────────

/** Compute convex hull of 2D points (Andrew's monotone chain). Returns indices. */
function convexHull(points: [number, number][]): number[] {
  const n = points.length;
  if (n < 3) return points.map((_, i) => i);

  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((a, b) => points[a][0] - points[b][0] || points[a][1] - points[b][1]);

  const cross = (O: [number, number], A: [number, number], B: [number, number]) =>
    (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);

  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(points[lower[lower.length - 2]], points[lower[lower.length - 1]], points[i]) <= 0)
      lower.pop();
    lower.push(i);
  }

  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(points[upper[upper.length - 2]], points[upper[upper.length - 1]], points[i]) <= 0)
      upper.pop();
    upper.push(i);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Check if point (px, py) is inside polygon. */
function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** IDW interpolation: estimate temperature at (lat, lon) from sensor readings. */
function idwInterpolate(
  lat: number,
  lon: number,
  sensors: { lat: number; lon: number; temp: number }[],
  power: number = 2,
): number {
  let numerator = 0;
  let denominator = 0;
  for (const s of sensors) {
    const d = Math.sqrt((lat - s.lat) ** 2 + (lon - s.lon) ** 2);
    if (d < 1e-10) return s.temp;
    const w = 1 / d ** power;
    numerator += w * s.temp;
    denominator += w;
  }
  return numerator / denominator;
}

/** Convert temperature → [R, G, B]. Green → Yellow → Red. */
function tempToRGB(temp: number): [number, number, number] {
  const HEALTHY = 28.0;
  const WARNING = 30.0;
  if (temp <= 26) return [0, 200, 80];
  if (temp >= 32) return [230, 30, 30];
  if (temp < HEALTHY) {
    const t = (temp - 26) / (HEALTHY - 26);
    return [Math.round(t * 200), Math.round(200 + t * 55), Math.round(80 * (1 - t))];
  } else if (temp < WARNING) {
    const t = (temp - HEALTHY) / (WARNING - HEALTHY);
    return [Math.round(200 + t * 55), Math.round(255 - t * 120), 0];
  } else {
    const t = Math.min((temp - WARNING) / 2.0, 1.0);
    return [Math.round(255), Math.round(135 * (1 - t)), 0];
  }
}

/** Get human-readable risk label + emoji + color from temperature. */
function getRiskInfo(temp: number): { label: string; emoji: string; color: string } {
  if (temp < 28.0) return { label: 'Healthy', emoji: '🟢', color: '#00cc66' };
  if (temp < 30.0) return { label: 'Warning', emoji: '🟡', color: '#ddaa00' };
  return { label: 'Danger', emoji: '🔴', color: '#ee3333' };
}

/** Render heatmap to canvas and return a data URL + geographic bounds. */
function renderHeatmapImage(
  sensors: { lat: number; lon: number; temp: number }[],
  hull: [number, number][],
  canvasSize: number = 256,
): { dataUrl: string; bounds: [[number, number], [number, number]] } | null {
  if (sensors.length < 2) return null;

  const lats = sensors.map((s) => s.lat);
  const lons = sensors.map((s) => s.lon);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const latRange = latMax - latMin || 0.001;
  const lonRange = lonMax - lonMin || 0.001;
  const latPad = latRange * 0.12;
  const lonPad = lonRange * 0.12;

  const south = latMin - latPad;
  const north = latMax + latPad;
  const west = lonMin - lonPad;
  const east = lonMax + lonPad;

  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(canvasSize, canvasSize);
  const data = imgData.data;

  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const lat = north - (y / (canvasSize - 1)) * (north - south);
      const lon = west + (x / (canvasSize - 1)) * (east - west);
      if (hull.length >= 3 && !pointInPolygon(lat, lon, hull)) continue;
      const temp = idwInterpolate(lat, lon, sensors);
      const [r, g, b] = tempToRGB(temp);
      const idx = (y * canvasSize + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 155;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { dataUrl: canvas.toDataURL(), bounds: [[south, west], [north, east]] };
}

/** Compute average temperature for an area's nodes to determine health color. */
function getAreaHealthColor(
  areaNodes: SensorNode[],
  readings: Map<string, number>,
): string {
  const activeNodes = areaNodes.filter((n) => n.status !== 'offline');
  if (activeNodes.length === 0) return '#888888';
  let sum = 0;
  let count = 0;
  for (const n of activeNodes) {
    const t = readings.get(n.id);
    if (t != null) { sum += t; count++; }
  }
  if (count === 0) return '#888888';
  const avg = sum / count;
  if (avg < 28) return '#00cc66';
  if (avg < 30) return '#ddaa00';
  return '#ee3333';
}

// ── Node health color helper ────────────────────────────────

function getNodeHealthColor(temp: number | undefined, status: string): string {
  if (status === 'offline') return '#888888';
  if (temp == null || isNaN(temp)) return '#888888';
  if (temp < 28) return '#00cc66';  // healthy green
  if (temp < 30) return '#ddaa00';  // warning yellow
  return '#ee3333';                  // danger red
}

function getNodeBorderColor(status: string, isSelected: boolean): string {
  if (isSelected) return '#ffffff';
  if (status === 'offline') return '#555555';
  if (status === 'delayed') return '#ff9800';
  return '#ffffff';
}

// Zoom threshold: below this we show area markers, above we show nodes
const AREA_ZOOM_THRESHOLD = 11;

// ── Component ───────────────────────────────────────────────

interface SensorMapProps {
  nodes: SensorNode[];
  areas: MonitoringArea[];
  latestReadings?: TemperatureReading[];
  selectedNode: string | null;
  onSelectNode: (id: string | null) => void;
  selectedArea: string | null;
  onSelectArea: (id: string | null) => void;
  showHeatmap?: boolean;
}

export default function SensorMap({
  nodes,
  areas,
  latestReadings,
  selectedNode,
  onSelectNode,
  selectedArea,
  onSelectArea,
  showHeatmap = true,
}: SensorMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const areaMarkersRef = useRef<L.CircleMarker[]>([]);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const clickPopupRef = useRef<L.Popup | null>(null);
  const sensorsRef = useRef<{ lat: number; lon: number; temp: number }[]>([]);
  const hullPolygonRef = useRef<[number, number][]>([]);
  const [ready, setReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(8);

  // Derived: is zoom close enough to show individual nodes?
  const isAreaView = selectedArea === null && currentZoom < AREA_ZOOM_THRESHOLD;

  // Build latest-temperature map
  const tempMap = useCallback(() => {
    const m = new Map<string, number>();
    if (latestReadings && latestReadings.length > 0) {
      for (const r of latestReadings) m.set(r.nodeId, r.temperature);
    } else {
      for (const n of nodes) {
        if (n.status === 'offline') continue;
        const base = 27.5 + (n.latitude - 7.5) * 0.8 + (n.longitude - 80.0) * 0.3;
        m.set(n.id, parseFloat(Math.max(26, Math.min(31, base)).toFixed(2)));
      }
    }
    return m;
  }, [nodes, latestReadings]);

  // Get the nodes for the currently selected area (or all if none)
  const areaNodes = useCallback(() => {
    if (!selectedArea) return nodes;
    return nodes.filter((n) => n.areaId === selectedArea);
  }, [nodes, selectedArea]);

  // Initialise Leaflet map — always center on Sri Lanka overview
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [7.8731, 80.7718], // Sri Lanka center
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Track zoom level
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Click handler: show interpolated health at clicked position
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const sensors = sensorsRef.current;
      const hull = hullPolygonRef.current;

      if (clickPopupRef.current) { map.closePopup(clickPopupRef.current); clickPopupRef.current = null; }
      if (sensors.length < 2) return;

      const insideHull = hull.length >= 3 ? pointInPolygon(lat, lng, hull) : true;
      const temp = idwInterpolate(lat, lng, sensors);
      const risk = getRiskInfo(temp);
      const insideTag = insideHull
        ? ''
        : '<p style="margin:4px 0 0;font-size:10px;color:#888">⚠ Outside monitoring area (extrapolated)</p>';

      clickPopupRef.current = L.popup({ closeButton: true, className: 'health-popup' })
        .setLatLng(e.latlng)
        .setContent(`
          <div style="min-width:170px;font-family:system-ui,sans-serif">
            <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${risk.color}">
              ${risk.emoji} ${risk.label}
            </p>
            <p style="margin:2px 0;font-size:12px">Temperature: <strong>${temp.toFixed(2)}°C</strong></p>
            <hr style="border:none;border-top:1px solid #ddd;margin:6px 0"/>
            <p style="margin:2px 0;font-size:10px;color:#666">Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}</p>
            ${insideTag}
          </div>
        `)
        .openOn(map);
    });

    mapInstanceRef.current = map;
    setCurrentZoom(map.getZoom());
    setReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to selected area or zoom out to Sri Lanka overview
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;

    if (selectedArea) {
      const area = areas.find((a) => a.id === selectedArea);
      if (area) {
        map.flyTo([area.center.lat, area.center.lon], area.defaultZoom, { duration: 1.2 });
      }
    } else {
      // Zoom out to Sri Lanka overview
      map.flyTo([7.8731, 80.7718], 8, { duration: 1.0 });
    }
  }, [selectedArea, areas, ready]);

  // Draw area cluster markers (when zoomed out, no area selected)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;

    // Clear previous area markers
    areaMarkersRef.current.forEach((m) => map.removeLayer(m));
    areaMarkersRef.current = [];

    if (!isAreaView) return;

    const readings = tempMap();

    for (const area of areas) {
      const aNodes = nodes.filter((n) => n.areaId === area.id);
      const online = aNodes.filter((n) => n.status === 'online').length;
      const total = aNodes.length;
      const healthColor = getAreaHealthColor(aNodes, readings);

      const circleMarker = L.circleMarker([area.center.lat, area.center.lon], {
        radius: 22,
        fillColor: healthColor,
        fillOpacity: 0.7,
        color: '#ffffff',
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      // Tooltip with area info
      circleMarker.bindTooltip(
        `<div style="text-align:center;font-family:system-ui,sans-serif">
          <strong style="font-size:13px">${area.name}</strong><br/>
          <span style="font-size:11px;color:#666">${area.description}</span><br/>
          <span style="font-size:11px">${online}/${total} nodes online</span>
        </div>`,
        { direction: 'top', offset: [0, -15] }
      );

      // Label inside the circle
      const label = L.marker([area.center.lat, area.center.lon], {
        icon: L.divIcon({
          className: 'area-label',
          html: `<div style="
            display:flex;align-items:center;justify-content:center;
            width:44px;height:44px;border-radius:50%;
            font-family:system-ui,sans-serif;font-weight:700;font-size:14px;
            color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5);
            pointer-events:none;
          ">${total}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
        interactive: false,
      }).addTo(map);

      // Click → select area and zoom in
      circleMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectArea(area.id);
      });

      areaMarkersRef.current.push(circleMarker);
      areaMarkersRef.current.push(label as unknown as L.CircleMarker);
    }
  }, [isAreaView, areas, nodes, tempMap, onSelectArea, ready]);

  // Draw heatmap + convex hull + populate sensor data for interpolation
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;

    // Clear previous overlays
    if (polylineRef.current) { map.removeLayer(polylineRef.current); polylineRef.current = null; }
    if (overlayRef.current) { map.removeLayer(overlayRef.current); overlayRef.current = null; }
    sensorsRef.current = [];
    hullPolygonRef.current = [];

    // Nothing to render in area overview (zoomed out, no area selected)
    if (isAreaView) return;

    // Build sensor data for click-to-interpolate (all visible nodes)
    const visibleNodes = (selectedArea ? areaNodes() : nodes).filter((n) => n.status !== 'offline');
    if (visibleNodes.length < 2) return;

    const readings = tempMap();
    const sensors: { lat: number; lon: number; temp: number }[] = [];
    for (const n of visibleNodes) {
      const temp = readings.get(n.id);
      if (temp != null) sensors.push({ lat: n.latitude, lon: n.longitude, temp });
    }
    sensorsRef.current = sensors;

    // Only render heatmap overlay + hull when a specific area is selected
    if (!selectedArea) return;

    // Compute hull
    let hullPts: [number, number][] = [];
    if (sensors.length >= 3) {
      const pts: [number, number][] = sensors.map((s) => [s.lat, s.lon]);
      const hullIdx = convexHull(pts);
      hullPts = hullIdx.map((i) => pts[i]);
      hullPolygonRef.current = hullPts;

      const area = areas.find((a) => a.id === selectedArea);
      const hullColor = area?.color ?? '#00E5FF';

      const hullClosed = [...hullPts, hullPts[0]];
      polylineRef.current = L.polyline(hullClosed as L.LatLngExpression[], {
        color: hullColor,
        weight: 2.5,
        opacity: 0.8,
        dashArray: '8, 4',
      }).addTo(map).bindPopup(`${area?.name ?? 'Monitoring Area'} — ${visibleNodes.length} active nodes`);
    }

    // Render heatmap
    if (showHeatmap && sensors.length >= 2) {
      const result = renderHeatmapImage(sensors, hullPts, 300);
      if (result) {
        overlayRef.current = L.imageOverlay(result.dataUrl, result.bounds, {
          opacity: 0.75,
          interactive: false,
        }).addTo(map);
        overlayRef.current.bringToBack();
      }
    }
  }, [isAreaView, selectedArea, nodes, ready, showHeatmap, tempMap, areaNodes, areas]);

  // Update node markers (when zoomed in or area selected)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Don't show individual markers in area overview (zoomed out)
    if (isAreaView) return;

    const readings = tempMap();
    const currentNodes = selectedArea ? areaNodes() : nodes;

    currentNodes.forEach((node) => {
      const isSelected = node.id === selectedNode;
      const temp = readings.get(node.id);
      const tempStr = temp != null && !isNaN(temp) ? `${temp.toFixed(1)}°C` : '—';
      const healthColor = getNodeHealthColor(temp, node.status);
      const borderColor = getNodeBorderColor(node.status, isSelected);
      const risk = temp != null && !isNaN(temp) ? getRiskInfo(temp) : { label: 'Unknown', emoji: '⚪', color: '#888' };
      const radius = isSelected ? 10 : 7;

      const circleMarker = L.circleMarker([node.latitude, node.longitude], {
        radius,
        fillColor: node.status === 'offline' ? '#555555' : healthColor,
        fillOpacity: node.status === 'offline' ? 0.5 : 0.9,
        color: borderColor,
        weight: isSelected ? 3 : 2,
        opacity: 1,
      })
        .addTo(map)
        .bindTooltip(`<strong>${node.id}</strong> — ${tempStr} ${risk.emoji}`, { sticky: true })
        .bindPopup(`
          <div style="min-width:170px;font-family:system-ui,sans-serif">
            <h4 style="margin:0 0 4px;font-weight:bold">${node.id} — ${node.name}</h4>
            <p style="margin:2px 0;font-size:12px;color:${risk.color};font-weight:600">${risk.emoji} ${risk.label}</p>
            <p style="margin:2px 0;font-size:12px">Temp: <strong>${tempStr}</strong></p>
            <p style="margin:2px 0;font-size:12px">Status: <strong>${node.status}</strong></p>
            <p style="margin:2px 0;font-size:12px">Depth: ${node.depth}m</p>
            <p style="margin:2px 0;font-size:12px">Lat: ${node.latitude.toFixed(4)}</p>
            <p style="margin:2px 0;font-size:12px">Lon: ${node.longitude.toFixed(4)}</p>
            <p style="margin:2px 0;font-size:12px">Readings: ${node.totalReadings.toLocaleString()}</p>
          </div>
        `);

      circleMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectNode(isSelected ? null : node.id);
      });
      markersRef.current.push(circleMarker as unknown as L.Marker);
    });
  }, [isAreaView, selectedArea, selectedNode, onSelectNode, ready, tempMap, areaNodes, nodes]);

  return (
    <div className="relative w-full" style={{ height: 540 }}>
      <div ref={mapRef} className="w-full h-full" style={{ borderRadius: '0.75rem' }} />

      {/* Bleaching Risk Legend */}
      <div
        className="absolute top-3 right-3 z-[1000] rounded-lg border p-3"
        style={{
          background: 'rgba(13, 17, 23, 0.9)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Bleaching Risk
        </p>
        <div className="space-y-1 text-[11px]">
          <p style={{ color: 'var(--text-secondary)' }}>🟢 Healthy: &lt; 28°C</p>
          <p style={{ color: 'var(--text-secondary)' }}>🟡 Warning: 28–30°C</p>
          <p style={{ color: 'var(--text-secondary)' }}>🔴 Danger: &gt; 30°C</p>
        </div>
      </div>

      {/* Back to overview button (when viewing an area) */}
      {selectedArea && (
        <button
          onClick={() => { onSelectArea(null); onSelectNode(null); }}
          className="absolute top-3 left-3 z-[1000] rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors"
          style={{
            background: 'rgba(13, 17, 23, 0.9)',
            borderColor: 'var(--border)',
            color: 'var(--accent-cyan)',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(13, 17, 23, 0.9)')}
        >
          ← All Areas
        </button>
      )}

      {/* Sensor count indicator (only in area view) */}
      {selectedArea && (
        <div
          className="absolute bottom-3 left-3 z-[1000] rounded-lg border p-3"
          style={{
            background: 'rgba(13, 17, 23, 0.9)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            {areas.find((a) => a.id === selectedArea)?.name ?? 'Sensor Network'}
          </p>
          <div className="space-y-0.5 text-[10px]">
            <p style={{ color: 'var(--accent-cyan)' }}>
              🔵 Online: {areaNodes().filter((n) => n.status === 'online').length}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              🟠 Delayed: {areaNodes().filter((n) => n.status === 'delayed').length}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              🔴 Offline: {areaNodes().filter((n) => n.status === 'offline').length}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Total: {areaNodes().length} nodes
            </p>
          </div>
        </div>
      )}

      {/* Area overview legend (when zoomed out) */}
      {!selectedArea && (
        <div
          className="absolute bottom-3 left-3 z-[1000] rounded-lg border p-3"
          style={{
            background: 'rgba(13, 17, 23, 0.9)',
            borderColor: 'var(--border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Monitoring Areas
          </p>
          <div className="space-y-1 text-[10px]">
            {areas.map((a) => {
              const aNodes = nodes.filter((n) => n.areaId === a.id);
              const online = aNodes.filter((n) => n.status === 'online').length;
              return (
                <button
                  key={a.id}
                  onClick={() => onSelectArea(a.id)}
                  className="flex items-center gap-2 w-full text-left cursor-pointer rounded px-1 py-0.5 transition-colors"
                  style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: getAreaHealthColor(nodes.filter((n) => n.areaId === a.id), tempMap()) }}
                  />
                  <span>{a.name}</span>
                  <span className="ml-auto font-mono" style={{ color: 'var(--text-primary)' }}>
                    {online}/{aNodes.length}
                  </span>
                </button>
              );
            })}
            <p className="pt-1 border-t" style={{ borderColor: 'var(--grid-line)', color: 'var(--text-secondary)' }}>
              Total: {nodes.length} nodes across {areas.length} areas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
