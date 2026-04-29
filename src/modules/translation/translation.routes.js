import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { translateController } from './translation.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/translate
router.post('/', translateController);

export default router;