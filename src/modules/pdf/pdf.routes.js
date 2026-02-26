import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { uploadPdf } from './pdf.upload.js';
import {
    uploadPdfController,
    listDocumentsController,
    getDocumentController,
    deleteDocumentController,
} from './pdf.controller.js';
import {
    generateFlashcardsController,
    generateFlashcardsStreamController,
    getFlashcardsController,
} from '../flashcard/flashcard.controller.js';
import {
    generateSummaryController,
    getSummaryController,
} from '../summary/summary.controller.js';

const router = Router();

router.use(authenticate);

// PDF
router.post('/', uploadPdf, uploadPdfController);
router.get('/', listDocumentsController);
router.get('/:id', getDocumentController);
router.delete('/:id', deleteDocumentController);

// Flashcards
router.post('/:id/flashcards', generateFlashcardsController);
router.get('/:id/flashcards', getFlashcardsController);
router.post('/:id/flashcards/stream', generateFlashcardsStreamController);

// Summary
router.post('/:id/summary', generateSummaryController);
router.get('/:id/summary', getSummaryController);

export default router;