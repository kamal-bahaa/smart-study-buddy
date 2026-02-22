import { processUploadedPdf } from './pdf.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// POST /api/pdfs
export const uploadPdfController = (req, res, next) => {
    try {
        const result = processUploadedPdf(req.file);
        return sendSuccess(res, 200, 'PDF received and validated', result);
    } catch (err) {
        next(err);
    }
};