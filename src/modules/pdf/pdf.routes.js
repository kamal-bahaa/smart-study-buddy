import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { uploadPdf } from './pdf.upload.js';
import {
    uploadPdfController,
    listDocumentsController,
    getDocumentController,
    deleteDocumentController,
} from './pdf.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/pdfs  — upload & extract
router.post('/', uploadPdf, uploadPdfController);

// GET /api/pdfs   — list user's documents
router.get('/', listDocumentsController);

// GET /api/pdfs/:id  — get single document
router.get('/:id', getDocumentController);

// DELETE /api/pdfs/:id  — delete document
router.delete('/:id', deleteDocumentController);

export default router;