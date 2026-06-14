import { Router, Request, Response } from 'express';
import { calculateZenith, getSunPosition } from '../services/zenithCalculator';

const router = Router();

// GET /api/zenith?lat=&lon=&minElevation=&time=
router.get('/', (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const minElevation = parseFloat((req.query.minElevation as string) || '70');
    const timeParam = req.query.time as string | undefined;

    if (isNaN(lat) || isNaN(lon)) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing lat/lon query parameters',
      });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        success: false,
        error: 'lat must be [-90,90], lon must be [-180,180]',
      });
      return;
    }

    const date = timeParam ? new Date(timeParam) : new Date();
    if (isNaN(date.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid time parameter',
      });
      return;
    }

    const objects = calculateZenith(lat, lon, date, minElevation);
    const sunPos = getSunPosition(date);

    res.json({
      success: true,
      data: {
        observer: { lat, lon },
        time: date.toISOString(),
        minElevation,
        objectCount: objects.length,
        objects,
        sunPosition: sunPos,
      },
    });
  } catch (error) {
    console.error('[Zenith] Calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate zenith objects',
    });
  }
});

export default router;
