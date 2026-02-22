import * as pdfService from './pdf.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// POST /api/pdfs
export const uploadPdfController = async (req, res, next) => {
    try {
        const result = await pdfService.processUploadedPdf(req.file, req.user.userId);
        return sendSuccess(res, 201, 'PDF uploaded and saved', result);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs
export const listDocumentsController = async (req, res, next) => {
    try {
        const documents = await pdfService.getUserDocuments(req.user.userId);
        return sendSuccess(res, 200, 'Documents retrieved', documents);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id
export const getDocumentController = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return next(ApiError.badRequest('Invalid document ID'));

        const document = await pdfService.getDocumentById(id, req.user.userId);
        return sendSuccess(res, 200, 'Document retrieved', document);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/pdfs/:id
export const deleteDocumentController = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return next(ApiError.badRequest('Invalid document ID'));

        await pdfService.deleteDocument(id, req.user.userId);
        return sendSuccess(res, 200, 'Document deleted successfully');
    } catch (err) {
        next(err);
    }
};