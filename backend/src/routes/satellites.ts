import { Router, Request, Response } from 'express';
import { refreshTLEData, fetchISSPosition } from '../services/tleFetcher';
import { getTLEData } from '../services/zenithCalculator';

const router = Router();

// GET /api/satellites — List current TLE data stats
router.get('/', (_req: Request, res: Response) => {
  const tleData = getTLEData();
  res.json({
    success: true,
    data: {
      count: tleData.length,
      satellites: tleData.map((t) => ({
        noradId: t.noradId,
        name: t.name,
        category: t.category,
      })),
    },
  });
});

// GET /api/satellites/refresh — Manual TLE refresh trigger
router.get('/refresh', async (_req: Request, res: Response) => {
  try {
    const result = await refreshTLEData();
    res.json({
      success: true,
      data: result,
      message: `Refreshed ${result.count} TLE entries from ${result.source}`,
    });
  } catch (error) {
    console.error('[Satellites] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh TLE data',
    });
  }
});

// GET /api/satellites/iss — Get current ISS position
router.get('/iss', async (_req: Request, res: Response) => {
  try {
    const position = await fetchISSPosition();
    if (position) {
      res.json({ success: true, data: position });
    } else {
      res.status(503).json({
        success: false,
        error: 'ISS position unavailable',
      });
    }
  } catch (error) {
    console.error('[ISS] Position error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ISS position',
    });
  }
});

export default router;
