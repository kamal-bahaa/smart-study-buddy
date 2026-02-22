import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { uploadPdf } from './pdf.upload.js';
import { uploadPdfController } from './pdf.controller.js';

const router = Router();

// POST /api/pdfs 
router.post('/', authenticate, uploadPdf, uploadPdfController);

export default router;