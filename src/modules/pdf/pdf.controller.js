import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// POST /api/pdfs
export const uploadPdfController = (req, res, next) => {
    try {
        if (!req.file) {
            throw ApiError.badRequest('No PDF file provided');
        }

        return sendSuccess(res, 200, 'PDF received and validated', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
        });
    } catch (err) {
        next(err);
    }
};