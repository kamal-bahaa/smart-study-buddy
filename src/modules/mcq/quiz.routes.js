import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
    generateQuizController,
    generateQuizStreamController,
    getQuizController,
} from './quiz.controller.js';

const router = Router({ mergeParams: true }); 

router.use(authenticate);

// POST /api/pdfs/:id/quiz          — generate a new quiz (regular JSON, backward compatible)
router.post('/', generateQuizController);

// GET  /api/pdfs/:id/quiz/stream   — generate a new quiz via SSE streaming
router.get('/stream', generateQuizStreamController);

// GET  /api/pdfs/:id/quiz          — retrieve latest saved quiz for this PDF
router.get('/', getQuizController);

export default router;