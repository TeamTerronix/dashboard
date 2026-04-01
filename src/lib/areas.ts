import type { MonitoringArea } from './types';

export const monitoringAreas: MonitoringArea[] = [
  {
    id: 'bar-reef',
    name: 'Bar Reef',
    description: 'Kalpitiya Peninsula, NW coast',
    center: { lat: 8.877, lon: 79.525 },
    color: '#00E5FF',
    defaultZoom: 14,
  },
  {
    id: 'pigeon-island',
    name: 'Pigeon Island',
    description: 'Trincomalee, NE coast',
    center: { lat: 8.725, lon: 81.18 },
    color: '#FF6B6B',
    defaultZoom: 15,
  },
  {
    id: 'hikkaduwa',
    name: 'Hikkaduwa Reef',
    description: 'Hikkaduwa, SW coast',
    center: { lat: 6.139, lon: 80.092 },
    color: '#FFD93D',
    defaultZoom: 15,
  },
  {
    id: 'rumassala',
    name: 'Rumassala',
    description: 'Galle, Southern coast',
    center: { lat: 6.003, lon: 80.239 },
    color: '#6BCB77',
    defaultZoom: 15,
  },
];

