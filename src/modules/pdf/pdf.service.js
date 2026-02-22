import { ApiError } from '../../utils/ApiError.js';

/**
 * Validates the uploaded file and returns its metadata.
 * This is the single place responsible for PDF business logic.
 *
 * @param {Express.Multer.File | undefined} file - The file object from req.file
 * @returns {{ filename: string, size: number, mimetype: string }}
 */
export const processUploadedPdf = (file) => {
    if (!file) {
        throw ApiError.badRequest('No PDF file provided');
    }

    return {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
    };
};