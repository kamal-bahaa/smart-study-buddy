import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
    generateSummaryController,
    getSummaryController,
} from './summary.controller.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post('/', generateSummaryController);
router.get('/', getSummaryController);

export default router;