import { processUploadedPdf } from './pdf.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// POST /api/pdfs
export const uploadPdfController = async (req, res, next) => {
    try {
        const result = await processUploadedPdf(req.file, req.user.userId);
        return sendSuccess(res, 201, 'PDF uploaded and saved', result);
    } catch (err) {
        next(err);
    }
};