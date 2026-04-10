import prisma from '../../prisma/client.js';

/**
 * Builds a unified activity feed from the three existing tables
 * (Summary, Quiz, Flashcard) — no extra DB model needed.
 *
 * Each entry shape:
 * {
 *   type      : 'SUMMARY' | 'QUIZ' | 'FLASHCARD'
 *   resultId  : id of the resource  (for deep-linking on the frontend)
 *   createdAt : when it was generated
 *   pdf       : { id, fileName }
 * }
 */
export const getUserHistory = async (userId) => {

    // Run all three queries in parallel
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

        // For flashcards we group by pdfId — one entry per PDF, using the
        // most-recent flashcard's createdAt as the activity timestamp.
        prisma.flashcard.findMany({
            where: { pdf: { userId } },
            select: {
                id: true,
                createdAt: true,
                pdf: { select: { id: true, fileName: true } },
            },
        }),

    ]);

    // ── Deduplicate flashcards: one entry per PDF (keep latest) ──────────────
    const flashcardMap = new Map(); // pdfId → row
    for (const fc of flashcards) {
        const existing = flashcardMap.get(fc.pdf.id);
        if (!existing || fc.createdAt > existing.createdAt) {
            flashcardMap.set(fc.pdf.id, fc);
        }
    }
    const uniqueFlashcards = Array.from(flashcardMap.values());

    // ── Normalise to a common shape ───────────────────────────────────────────
    const feed = [
        ...summaries.map((s) => ({
            type: 'SUMMARY',
            resultId: s.id,
            createdAt: s.createdAt,
            pdf: s.pdf,
        })),
        ...quizzes.map((q) => ({
            type: 'QUIZ',
            resultId: q.id,
            createdAt: q.createdAt,
            pdf: q.pdf,
        })),
        ...uniqueFlashcards.map((f) => ({
            type: 'FLASHCARD',
            resultId: f.id,
            createdAt: f.createdAt,
            pdf: f.pdf,
        })),
    ];

    // ── Sort newest first ─────────────────────────────────────────────────────
    feed.sort((a, b) => b.createdAt - a.createdAt);

    return feed;
};