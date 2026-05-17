import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';

export const getUserHistory = async (userId) => {
    const [summaries, quizzes, flashcards] = await Promise.all([
        prisma.summary.findMany({
            where: { pdf: { userId } },
            select: {
                id: true,
                createdAt: true,
                pdf: { select: { id: true, fileName: true } },
            },
        }),
        prisma.quiz.findMany({
            where: { pdf: { userId } },
            select: {
                id: true,
                createdAt: true,
                pdf: { select: { id: true, fileName: true } },
            },
        }),
        prisma.flashcard.findMany({
            where: { pdf: { userId } },
            select: {
                id: true,
                createdAt: true,
                pdfId: true,
                pdf: { select: { id: true, fileName: true } },
            },
        }),
    ]);

    const flashcardMap = new Map();
    for (const fc of flashcards) {
        const existing = flashcardMap.get(fc.pdf.id);
        if (!existing || fc.createdAt > existing.createdAt) {
            flashcardMap.set(fc.pdf.id, fc);
        }
    }
    const uniqueFlashcards = Array.from(flashcardMap.values());

    const feed = [
        ...summaries.map((s) => ({ type: 'SUMMARY', resultId: s.id, createdAt: s.createdAt, pdf: s.pdf })),
        ...quizzes.map((q) => ({ type: 'QUIZ', resultId: q.id, createdAt: q.createdAt, pdf: q.pdf })),
        ...uniqueFlashcards.map((f) => ({ type: 'FLASHCARD', resultId: f.id, createdAt: f.createdAt, pdf: f.pdf })),
    ];

    feed.sort((a, b) => b.createdAt - a.createdAt);
    return feed;
};

export const deleteHistoryItem = async (userId, type, resultId) => {
    const id = parseInt(resultId);
    if (isNaN(id)) throw ApiError.badRequest('Invalid id');

    const finders = {
        SUMMARY: () => prisma.summary.findFirst({ where: { id, pdf: { userId } } }),
        QUIZ: () => prisma.quiz.findFirst({ where: { id, pdf: { userId } } }),
        FLASHCARD: () => prisma.flashcard.findFirst({ where: { id, pdf: { userId } } }),
    };

    if (!finders[type]) throw ApiError.badRequest('type must be SUMMARY, QUIZ, or FLASHCARD');

    const record = await finders[type]();
    if (!record) throw ApiError.notFound('History item not found');

    const deletes = {
        SUMMARY: () => prisma.summary.delete({ where: { id } }),
        QUIZ: () => prisma.quiz.delete({ where: { id } }),
        FLASHCARD: () => prisma.flashcard.deleteMany({ where: { pdfId: record.pdfId } }),
    };

    await deletes[type]();
};