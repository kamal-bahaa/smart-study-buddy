import { generateSummary, getSummary } from './summary.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

const parseId = (raw) => {
    const id = parseInt(raw, 10);
    if (isNaN(id)) throw ApiError.badRequest('Invalid document ID');
    return id;
};

// POST /api/pdfs/:id/summary
export const generateSummaryController = async (req, res, next) => {
    try {
        const result = await generateSummary(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 201, 'Summary generated successfully', result);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id/summary
export const getSummaryController = async (req, res, next) => {
    try {
        const result = await getSummary(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 200, 'Summary retrieved successfully', result);
    } catch (err) {
        next(err);
    }
};