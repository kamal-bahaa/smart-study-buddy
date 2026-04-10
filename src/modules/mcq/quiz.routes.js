import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { generateQuizController, getQuizController } from './quiz.controller.js';

const router = Router({ mergeParams: true }); // needed to access :id from parent pdf router

router.use(authenticate);

// POST /api/pdfs/:id/quiz  — generate a new quiz from PDF
router.post('/', generateQuizController);

// GET  /api/pdfs/:id/quiz  — retrieve latest quiz for this PDF
router.get('/', getQuizController);

export default router;