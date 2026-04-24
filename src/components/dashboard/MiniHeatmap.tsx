'use client';

import { tempToColor } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Expand } from 'lucide-react';
import { getLatestReadings } from '@/lib/api';
import { subscribeDashboardDataRefresh } from '@/lib/data-refresh';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MiniHeatmap() {
  const [points, setPoints] = useState<{ lat: number; lon: number; temp: number }[]>([]);
  const [mounted, setMounted] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const latest = await getLatestReadings();
        const anyLatest = latest as any;
        const rows = (Array.isArray(anyLatest?.value) ? anyLatest.value : anyLatest) as any[];
        const mapped = rows
          .filter((r) => r.latitude != null && r.longitude != null)
          .map((r) => ({ lat: Number(r.latitude), lon: Number(r.longitude), temp: Number(r.temperature) }));
        if (!cancelled) setPoints(mapped);
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setMounted(true);
      }
    };
    load();
    const unsub = subscribeDashboardDataRefresh(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  // Canvas dimensions
  const W = 280;
  const H = 200;

  // Bounds around Sri Lanka reef sites (broad; mini preview only)
  const latMin = 5.8, latMax = 9.1;
  const lonMin = 79.4, lonMax = 81.4;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Small non-interactive Leaflet map for the dashboard card.
    const map = L.map(mapRef.current, {
      center: [(latMin + latMax) / 2, (lonMin + lonMax) / 2],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    map.fitBounds([[latMin, lonMin], [latMax, lonMax]], { padding: [6, 6] });

    const layer = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerRef.current = layer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when points change.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    for (const p of points) {
      const color = tempToColor(p.temp);
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: 6,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.9,
      });
      marker.addTo(layer);
    }
  }, [points]);

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

      <div
        className="w-full rounded-lg overflow-hidden"
        style={{ background: 'var(--bg-primary)', width: W, height: H, maxWidth: '100%' }}
      >
        {/* Leaflet needs an explicit-size container */}
        <div
          ref={mapRef}
          style={{ width: '100%', height: '100%', opacity: mounted ? 1 : 0.7 }}
        />
      </div>

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
