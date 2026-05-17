import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { getHistoryController, deleteHistoryController } from './history.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/history
router.get('/', getHistoryController);

// DELETE /api/history/:resultId?type=QUIZ
router.delete('/:id', deleteHistoryController);

export default router;