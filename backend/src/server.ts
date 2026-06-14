import express, { Request, Response } from 'express';
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

const allowedOrigins = [
  'http://localhost:3000',
  'https://project-zenith-astral-web.vercel.app',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
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
