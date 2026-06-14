'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ZenithUpdate } from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [zenithData, setZenithData] = useState<ZenithUpdate | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setReconnecting(false);
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected');
    });

    socket.on('reconnect_attempt', () => {
      setReconnecting(true);
    });

    socket.on('zenith-update', (data: ZenithUpdate) => {
      setZenithData(data);
      setLastUpdate(new Date());
    });

    socket.on('error', (err: { message: string }) => {
      console.error('[Socket] Error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = useCallback(
    (lat: number, lon: number, minElevation = 20, timeOffset = 0) => {
      socketRef.current?.emit('subscribe', { lat, lon, minElevation, timeOffset });
    },
    []
  );

  const unsubscribe = useCallback(() => {
    socketRef.current?.emit('unsubscribe');
    setZenithData(null);
  }, []);

  const updateTimeOffset = useCallback((timeOffset: number) => {
    socketRef.current?.emit('update-time-offset', { timeOffset });
  }, []);

  return {
    isConnected,
    reconnecting,
    zenithData,
    lastUpdate,
    subscribe,
    unsubscribe,
    updateTimeOffset,
  };
}
