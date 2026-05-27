'use client';

import { useEffect, useRef, useState } from 'react';
import { getIntelligenceWsUrl } from './intelligence';
import type { IntelligenceRealtimeEvent } from './types';

interface UseIntelligenceRealtimeOptions {
  onEvent?: (event: IntelligenceRealtimeEvent) => void;
}

export function useIntelligenceRealtime(options: UseIntelligenceRealtimeOptions = {}) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onEvent = options.onEvent;

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let shouldReconnect = true;

    const connect = () => {
      const socket = new WebSocket(getIntelligenceWsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        setConnected(true);
      };

      socket.onclose = () => {
        setConnected(false);
        if (shouldReconnect) {
          reconnectTimer = setTimeout(connect, 2500);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as IntelligenceRealtimeEvent;
          onEvent?.(parsed);
        } catch {
          // Ignore malformed messages.
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [onEvent]);

  return { connected };
}
