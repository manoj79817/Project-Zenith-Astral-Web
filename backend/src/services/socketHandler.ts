/**
 * Socket.IO real-time handler — Manages zenith update subscriptions.
 * Each client subscribes with {lat, lon} and receives periodic zenith updates.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { calculateZenith, ZenithObject } from './zenithCalculator';
import { zenithCache } from './cache';

interface SubscriptionData {
  lat: number;
  lon: number;
  minElevation?: number;
  timeOffset?: number; // hours offset for time travel
}

interface ActiveSubscription {
  lat: number;
  lon: number;
  minElevation: number;
  timeOffset: number;
  intervalId: ReturnType<typeof setInterval>;
}

// Track active subscriptions per socket
const activeSubscriptions = new Map<string, ActiveSubscription>();

function getZenithData(
  lat: number,
  lon: number,
  minElevation: number,
  timeOffset: number
): ZenithObject[] {
  const cacheKey = `zenith:${lat.toFixed(2)}:${lon.toFixed(2)}:${minElevation}:${timeOffset}`;
  const cached = zenithCache.get<ZenithObject[]>(cacheKey);
  if (cached) return cached;

  const date = new Date();
  if (timeOffset !== 0) {
    date.setTime(date.getTime() + timeOffset * 3600 * 1000);
  }

  const result = calculateZenith(lat, lon, date, minElevation);
  zenithCache.set(cacheKey, result, 5); // 5 second cache
  return result;
}

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Subscribe to zenith updates for a location
    socket.on('subscribe', (data: SubscriptionData) => {
      try {
        const { lat, lon, minElevation = 20, timeOffset = 0 } = data;

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          socket.emit('error', { message: 'Invalid coordinates' });
          return;
        }

        // Clean up existing subscription
        cleanupSubscription(socket.id);

        console.log(`[Socket.IO] ${socket.id} subscribing to lat=${lat}, lon=${lon}`);

        // Send initial data immediately
        const initialData = getZenithData(lat, lon, minElevation, timeOffset);
        socket.emit('zenith-update', {
          objects: initialData,
          observer: { lat, lon },
          time: new Date().toISOString(),
          objectCount: initialData.length,
        });

        // Set up periodic updates every 10 seconds
        const intervalId = setInterval(() => {
          try {
            const sub = activeSubscriptions.get(socket.id);
            if (!sub) return;

            const objects = getZenithData(sub.lat, sub.lon, sub.minElevation, sub.timeOffset);
            socket.emit('zenith-update', {
              objects,
              observer: { lat: sub.lat, lon: sub.lon },
              time: new Date().toISOString(),
              objectCount: objects.length,
            });
          } catch (error) {
            console.error(`[Socket.IO] Update error for ${socket.id}:`, error);
          }
        }, 10000);

        activeSubscriptions.set(socket.id, {
          lat,
          lon,
          minElevation,
          timeOffset,
          intervalId,
        });
      } catch (error) {
        console.error(`[Socket.IO] Subscribe error:`, error);
        socket.emit('error', { message: 'Failed to subscribe' });
      }
    });

    // Update time offset (for time travel feature)
    socket.on('update-time-offset', (data: { timeOffset: number }) => {
      const sub = activeSubscriptions.get(socket.id);
      if (sub) {
        sub.timeOffset = data.timeOffset || 0;
        // Send immediate update with new time offset
        const objects = getZenithData(sub.lat, sub.lon, sub.minElevation, sub.timeOffset);
        socket.emit('zenith-update', {
          objects,
          observer: { lat: sub.lat, lon: sub.lon },
          time: new Date().toISOString(),
          objectCount: objects.length,
        });
      }
    });

    // Unsubscribe
    socket.on('unsubscribe', () => {
      cleanupSubscription(socket.id);
      console.log(`[Socket.IO] ${socket.id} unsubscribed`);
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      cleanupSubscription(socket.id);
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}

function cleanupSubscription(socketId: string): void {
  const sub = activeSubscriptions.get(socketId);
  if (sub) {
    clearInterval(sub.intervalId);
    activeSubscriptions.delete(socketId);
  }
}

// Cleanup all subscriptions (for graceful shutdown)
export function cleanupAllSubscriptions(): void {
  for (const [id, sub] of activeSubscriptions) {
    clearInterval(sub.intervalId);
    activeSubscriptions.delete(id);
  }
}
