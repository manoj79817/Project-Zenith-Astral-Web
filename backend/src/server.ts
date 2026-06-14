import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import schedule from 'node-schedule';
import { config } from './config';
import { connectDatabase } from './db/connection';
import { seedDatabase } from './db/seed';
import { setupSocketHandlers, cleanupAllSubscriptions } from './services/socketHandler';
import { refreshTLEData } from './services/tleFetcher';
import locationRoutes from './routes/locations';
import factRoutes from './routes/facts';
import zenithRoutes from './routes/zenith';
import satelliteRoutes from './routes/satellites';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Health check
app.get('/api/health', (_req: any, res: any) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/locations', locationRoutes);
app.use('/api/facts', factRoutes);
app.use('/api/zenith', zenithRoutes);
app.use('/api/satellites', satelliteRoutes);

// Setup Socket.IO handlers
setupSocketHandlers(io);

// Initialize and start
const start = async () => {
  // Connect to database (or fallback to mock store)
  await connectDatabase();

  // Seed data
  await seedDatabase();

  // Initial TLE refresh (non-blocking)
  refreshTLEData().catch((err) =>
    console.warn('[TLE] Initial refresh failed (using sample data):', err)
  );

  // Schedule TLE refresh every 6 hours
  schedule.scheduleJob('0 */6 * * *', async () => {
    console.log('[Schedule] Running TLE refresh...');
    await refreshTLEData();
  });

  // Start server
  server.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════╗
║   🌌 Project Zenith Backend Server      ║
║   Running on port ${config.port}                  ║
║   Environment: ${config.nodeEnv}            ║
║   Socket.IO: ✅ Active                   ║
║   TLE Refresh: Every 6 hours             ║
╚══════════════════════════════════════════╝
    `);
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, cleaning up...');
  cleanupAllSubscriptions();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, cleaning up...');
  cleanupAllSubscriptions();
  server.close();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server, io };
