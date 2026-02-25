import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
    deleteFlashcardController,
    updateFlashcardController,
} from './flashcard.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// DELETE /api/flashcards/:id — delete single flashcard
router.delete('/:id', deleteFlashcardController);

// PATCH /api/flashcards/:id  — update single flashcard
router.patch('/:id', updateFlashcardController);

export default router;