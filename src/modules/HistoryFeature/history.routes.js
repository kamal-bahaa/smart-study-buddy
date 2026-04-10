import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getHistoryController } from './history.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/history
router.get('/', getHistoryController);

export default router;