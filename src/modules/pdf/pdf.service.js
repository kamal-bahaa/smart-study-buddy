import axios from 'axios';
import FormData from 'form-data';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';

const AI_SERVICE_URL = 'http://localhost:8000/extract';

/**
 * Sends the uploaded PDF to the AI extraction service,
 * persists the result in the database, and returns document metadata.
 *
 * @param {Express.Multer.File | undefined} file
 * @param {number} userId - from req.user.userId (set by authenticate middleware)
 * @returns {{ id: number, fileName: string, createdAt: Date, updatedAt: Date }}
 */
export const processUploadedPdf = async (file, userId) => {
    // 1. Validate file
    if (!file) {
        throw ApiError.badRequest('No PDF file provided');
    }

    // 2. Send to AI service
    const form = new FormData();
    form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
    });

    let aiResponse;
    try {
        aiResponse = await axios.post(AI_SERVICE_URL, form, {
            headers: form.getHeaders(),
        });
    } catch {
        throw ApiError.internal('AI service is unavailable');
    }

    if (!aiResponse.data?.success) {
        throw ApiError.internal(
            aiResponse.data?.message ?? 'AI service failed to extract text'
        );
    }

    const extractedText = aiResponse.data.text;

    // 3. Persist in database
    let document;
    try {
        document = await prisma.pdfDocument.create({
            data: {
                fileName: file.originalname,
                extractedText,
                userId,
            },
            select: {
                id: true,
                fileName: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    } catch {
        throw ApiError.internal('Failed to save document to database');
    }

    return document;
};