import { Router, Request, Response } from 'express';
import { CelestialFact } from '../models';
import { isMockStore } from '../db/connection';
import { mockStore } from '../db/mockStore';

const router = Router();

// GET /api/facts — List all celestial facts
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (isMockStore()) {
      res.json({ success: true, data: mockStore.getFacts() });
      return;
    }

    const facts = await CelestialFact.find();
    res.json({ success: true, data: facts });
  } catch (error) {
    console.error('[Facts] GET error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch facts' });
  }
});

// GET /api/facts/:objectId — Get fact by objectId
router.get('/:objectId', async (req: Request, res: Response) => {
  try {
    const objectId = req.params.objectId as string;

    if (isMockStore()) {
      const fact = mockStore.getFactByObjectId(objectId);
      if (!fact) {
        res.status(404).json({ success: false, error: 'Fact not found' });
        return;
      }
      res.json({ success: true, data: fact });
      return;
    }

    const fact = await CelestialFact.findOne({ objectId });
    if (!fact) {
      res.status(404).json({ success: false, error: 'Fact not found' });
      return;
    }
    res.json({ success: true, data: fact });
  } catch (error) {
    console.error('[Facts] GET by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch fact' });
  }
});

export default router;
