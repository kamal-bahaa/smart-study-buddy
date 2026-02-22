import axios from 'axios';
import FormData from 'form-data';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';

const AI_SERVICE_URL = 'http://localhost:8000/extract';

// ─── Shared select ────
const METADATA_SELECT = {
    id: true,
    fileName: true,
    createdAt: true,
    updatedAt: true,
};

// ─── Upload & persist ─────────────────────────────────────────────────────────

export const processUploadedPdf = async (file, userId) => {
    if (!file) throw ApiError.badRequest('No PDF file provided');

    // Send to AI service
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

    // Persist
    try {
        return await prisma.pdfDocument.create({
            data: {
                fileName: file.originalname,
                extractedText: aiResponse.data.text,
                userId,
            },
            select: METADATA_SELECT,
        });
    } catch {
        throw ApiError.internal('Failed to save document to database');
    }
};

// ─── List all documents for a user ───────────────────────────────────────────

export const getUserDocuments = async (userId) => {
    return prisma.pdfDocument.findMany({
        where: { userId },
        select: METADATA_SELECT,
        orderBy: { createdAt: 'desc' },
    });
};

// ─── Get single document (ownership enforced) ─────────────────────────────────

export const getDocumentById = async (id, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id },
        select: { ...METADATA_SELECT, userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    // Strip internal userId before returning
    const { userId: _, ...metadata } = document;
    return metadata;
};

// ─── Delete document (ownership enforced) ─────────────────────────────────────

export const deleteDocument = async (id, userId) => {
    // Verify ownership first
    const document = await prisma.pdfDocument.findUnique({
        where: { id },
        select: { userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    // Cascade in schema handles summaries, flashcards, quizzes
    await prisma.pdfDocument.delete({ where: { id } });
};