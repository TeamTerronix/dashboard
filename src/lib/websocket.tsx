'use client';

/**
 * websocket.tsx
 * =============
 * Client-side WebSocket connection for real-time bleaching alerts.
 *
 * - Reads the JWT from localStorage after mount (avoids SSR mismatch)
 * - Connects to /ws/alerts?token=<jwt>
 * - Shows a sonner Toast with a "View on Map" CTA when temp > 31°C
 * - Reconnects automatically on disconnect
 *
 * Mount <AlertWebSocket /> once in layout.tsx — it renders nothing to the DOM.
 */

import { useEffect, useMemo, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { toast } from 'sonner';

import { getBleachingAlertsWebSocketUrl } from './api-base';

interface AlertMessage {
  type: string;
  sensor_id: number;
  sensor_uid: string;
  location_name: string;
  temperature: number;
  risk_level: number;
  timestamp: string;
}

function AlertWebSocketInner({ token }: { token: string }) {
  const url = useMemo(() => getBleachingAlertsWebSocketUrl(token), [token]);
  if (!url) return null;
  return <AlertWebSocketConnected url={url} />;
}

function AlertWebSocketConnected({ url }: { url: string }) {
  const { lastJsonMessage } = useWebSocket(url, {
    shouldReconnect: () => true,
    reconnectAttempts: 20,
    reconnectInterval: 4000,
  });

  useEffect(() => {
    if (!lastJsonMessage) return;
    const msg = lastJsonMessage as AlertMessage;
    if (msg.type !== 'bleaching_alert') return;

    const loc = msg.location_name ?? msg.sensor_uid;
    toast.error(`Bleaching Alert — ${loc}`, {
      description: `Sensor ${msg.sensor_uid} recorded ${msg.temperature.toFixed(1)}°C (bleaching threshold exceeded)`,
      duration: 12000,
      action: {
        label: 'View on Map',
        onClick: () => { window.location.href = '/map'; },
      },
    });
  }, [lastJsonMessage]);

  return null;
}

/**
 * Mount once in layout.tsx.
 * Reads the token after hydration (useEffect) to avoid SSR/localStorage mismatch.
 * Renders nothing if no token is stored.
 */
export function AlertWebSocket() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('sliot_token'));
  }, []);

  if (!token) return null;
  return <AlertWebSocketInner token={token} />;
}
