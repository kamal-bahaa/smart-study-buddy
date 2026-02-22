import multer from 'multer';
import { ApiError } from '../../utils/ApiError.js';

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const fileFilter = (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(ApiError.badRequest('Only PDF files are accepted'), false);
    }
};

const multerMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE_BYTES },
    fileFilter,
}).single('file');

/**
 * Wraps the raw multer middleware so that all upload errors are converted
 * into ApiError instances before reaching the global errorHandler.
 *
 * Cases handled:
 *  - LIMIT_FILE_SIZE  → 400 ApiError (file too large)
 *  - ApiError         → passed through as-is (e.g. wrong mimetype from fileFilter)
 *  - anything else    → forwarded to the global errorHandler unchanged
 */

export const uploadPdf = (req, res, next) => {
    multerMiddleware(req, res, (err) => {
        if (!err) return next();

        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(ApiError.badRequest('File exceeds the 10 MB limit'));
        }

        if (err instanceof ApiError) {
            return next(err);
        }

        next(err);
    });
};