import axios from 'axios';
import FormData from 'form-data';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';

const AI_SERVICE_URL = 'http://localhost:8000/extract';

// ─── Shared select ────────────────────────────────────────────────────────────
const METADATA_SELECT = {
    id: true,
    fileName: true,
    createdAt: true,
    updatedAt: true,
};

// ─── Upload & persist ─────────────────────────────────────────────────────────

export const processUploadedPdf = async (file, userId) => {
    if (!file) throw ApiError.badRequest('No PDF file provided');

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

// ─── Get single document with full details ────────────────────────────────────

export const getDocumentById = async (id, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id },
        select: {
            ...METADATA_SELECT,
            userId: true,

            flashcards: {
                select: {
                    id: true,
                    front: true,
                    back: true,
                    difficulty: true,
                    createdAt: true,
                },
                orderBy: { id: 'asc' },
            },

            quizzes: {
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    questions: {
                        select: {
                            id: true,
                            text: true,
                            options: true,
                            correctAnswer: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },

            summaries: {
                select: { id: true, content: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    const { userId: _, quizzes, summaries, flashcards, ...metadata } = document;

    return {
        ...metadata,
        flashcardCount: flashcards.length,
        flashcards,
        quiz: quizzes[0]
            ? {
                id: quizzes[0].id,
                title: quizzes[0].title,
                createdAt: quizzes[0].createdAt,
                questionCount: quizzes[0].questions.length,
                questions: quizzes[0].questions,
            }
            : null,
        summary: summaries[0] ?? null,
    };
};



export const getDocumentText = async (id, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id },
        select: {
            userId: true,
            extractedText: true,
        },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    return { extractedText: document.extractedText };
};

// ─── Delete document ─────────────────────────────────────

export const deleteDocument = async (id, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id },
        select: { userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    await prisma.pdfDocument.delete({ where: { id } });
};