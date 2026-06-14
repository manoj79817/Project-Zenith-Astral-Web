import { Router, Request, Response } from 'express';
import { UserLocation } from '../models';
import { isMockStore } from '../db/connection';
import { mockStore } from '../db/mockStore';

const router = Router();

// GET /api/locations — List all saved locations
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (isMockStore()) {
      res.json({ success: true, data: mockStore.getLocations() });
      return;
    }

    const locations = await UserLocation.find().sort({ createdAt: -1 });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('[Locations] GET error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

// POST /api/locations — Save a new location
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, latitude, longitude } = req.body;

    if (!name || latitude == null || longitude == null) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, latitude, longitude',
      });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        success: false,
        error: 'Invalid coordinates: lat must be [-90,90], lon must be [-180,180]',
      });
      return;
    }

    if (isMockStore()) {
      const loc = mockStore.addLocation({ name, latitude, longitude });
      res.status(201).json({ success: true, data: loc });
      return;
    }

    const location = await UserLocation.create({ name, latitude, longitude });
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    console.error('[Locations] POST error:', error);
    res.status(500).json({ success: false, error: 'Failed to save location' });
  }
});

// DELETE /api/locations/:id — Delete a saved location
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (isMockStore()) {
      const deleted = mockStore.deleteLocation(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }
      res.json({ success: true, message: 'Location deleted' });
      return;
    }

    const result = await UserLocation.findByIdAndDelete(id);
    if (!result) {
      res.status(404).json({ success: false, error: 'Location not found' });
      return;
    }
    res.json({ success: true, message: 'Location deleted' });
  } catch (error) {
    console.error('[Locations] DELETE error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete location' });
  }
});

export default router;
