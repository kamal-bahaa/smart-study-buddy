import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { uploadPdf } from './pdf.upload.js';
import {
    uploadPdfController,
    listDocumentsController,
    getDocumentController,
    getDocumentTextController,
    deleteDocumentController,
} from './pdf.controller.js';

import {
    generateFlashcardsController,
    generateFlashcardsStreamController,
    getFlashcardsController,
} from '../flashcard/flashcard.controller.js';

const router = Router();

router.use(authenticate);

// ── PDF CRUD ──────────────────────────────────────────────────────────────────
router.post('/', uploadPdf, uploadPdfController);
router.get('/', listDocumentsController);
router.get('/:id', getDocumentController);
router.get('/:id/text', getDocumentTextController);   
router.delete('/:id', deleteDocumentController);

// ── Flashcards ────────────────────────────────────────────────────────────────
router.post('/:id/flashcards', generateFlashcardsController);
router.get('/:id/flashcards', getFlashcardsController);
router.post('/:id/flashcards/stream', generateFlashcardsStreamController);

export default router;