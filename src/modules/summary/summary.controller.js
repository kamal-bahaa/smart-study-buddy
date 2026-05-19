import { generateSummary, getSummary, exportSummaryAsPdf } from './summary.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

const parseId = (raw) => {
    const id = parseInt(raw, 10);
    if (isNaN(id)) throw ApiError.badRequest('Invalid document ID');
    return id;
};

export const generateSummaryController = async (req, res, next) => {
    try {
        const result = await generateSummary(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 201, 'Summary generated successfully', result);
    } catch (err) {
        next(err);
    }
};

export const getSummaryController = async (req, res, next) => {
    try {
        const result = await getSummary(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 200, 'Summary retrieved successfully', result);
    } catch (err) {
        next(err);
    }
};

export const exportSummaryPdfController = async (req, res, next) => {
    try {
        const { buffer, fileName } = await exportSummaryAsPdf(
            parseId(req.params.id),
            req.user.userId,
        );
        const exportName = fileName.replace(/\.pdf$/i, '') + '_summary.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${exportName}"`);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
};