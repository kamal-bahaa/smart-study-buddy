import axios from 'axios';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

const AI_SERVICE_URL = env.FLASHCARD_SERVICE_URL;
const CHUNK_SIZE = 2000;  
const REQUEST_TIMEOUT = 120000;


const generationLocks = new Set();


const splitIntoChunks = (text) => {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
        const next = current ? `${current} ${sentence}` : sentence;
        if (next.length <= CHUNK_SIZE) {
            current = next;
        } else {
            if (current) chunks.push(current.trim());
            current = sentence;
        }
    }

    if (current) chunks.push(current.trim());
    return chunks;
};

const assertFlashcardOwnership = async (flashcardId, userId) => {
    const flashcard = await prisma.flashcard.findUnique({
        where: { id: flashcardId },
        select: {
            id: true,
            front: true,
            back: true,
            difficulty: true,
            createdAt: true,
            pdf: { select: { userId: true } },
        },
    });

    if (!flashcard || flashcard.pdf.userId !== userId) {
        throw ApiError.notFound('Flashcard not found');
    }

    return flashcard;
};


export const generateFlashcards = async (pdfId, userId) => {
    if (generationLocks.has(pdfId)) {
        throw ApiError.conflict(
            'Flashcard generation is already in progress for this document. Please wait.'
        );
    }

    generationLocks.add(pdfId);

    try {
        const document = await prisma.pdfDocument.findUnique({
            where: { id: pdfId },
            select: {
                id: true,
                fileName: true,
                extractedText: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!document || document.userId !== userId) {
            throw ApiError.notFound('Document not found');
        }

        const cleanText = document.extractedText
            .replace(/\u0000/g, '')
            .replace(/[\r\n\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const chunks = splitIntoChunks(cleanText);
        console.log(`pdfId=${pdfId} → ${chunks.length} chunk(s), total ${cleanText.length} chars`);

        const allFlashcards = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`  chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

            try {
                const response = await axios.post(
                    AI_SERVICE_URL,
                    { context: chunk, total_length: cleanText.length },
                    { timeout: REQUEST_TIMEOUT },
                );

                if (response.data?.success && Array.isArray(response.data.flashcards)) {
                    allFlashcards.push(...response.data.flashcards);
                    console.log(`  ✓ got ${response.data.flashcards.length} flashcard(s)`);
                }
            } catch (error) {
                console.warn(`  ✗ chunk ${i + 1} failed:`, error.response?.data ?? error.message);
            }
        }

        if (allFlashcards.length === 0) {
            throw ApiError.internal('AI service returned no flashcards');
        }

        const seen = new Set();
        const uniqueFlashcards = allFlashcards.filter(({ question }) => {
            if (seen.has(question)) return false;
            seen.add(question);
            return true;
        });

        console.log(`Total: ${allFlashcards.length} → unique: ${uniqueFlashcards.length}`);

        await prisma.$transaction([
            prisma.flashcard.deleteMany({ where: { pdfId } }),
            prisma.flashcard.createMany({
                data: uniqueFlashcards.map(({ question, answer, difficulty }) => ({
                    front: question,
                    back: answer,
                    difficulty: difficulty ?? 'easy',
                    pdfId,
                })),
            }),
        ]);

        const { extractedText: _, userId: __, ...metadata } = document;
        return { document: metadata, count: uniqueFlashcards.length };

    } finally {
        generationLocks.delete(pdfId);
    }
};


export const getFlashcards = async (pdfId, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id: pdfId },
        select: { id: true, fileName: true, userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    const flashcards = await prisma.flashcard.findMany({
        where: { pdfId },
        select: { id: true, front: true, back: true, difficulty: true, createdAt: true },
        orderBy: { id: 'asc' },
    });

    return {
        document: { id: document.id, fileName: document.fileName },
        count: flashcards.length,
        flashcards,
    };
};


export const deleteFlashcard = async (flashcardId, userId) => {
    await assertFlashcardOwnership(flashcardId, userId);
    await prisma.flashcard.delete({ where: { id: flashcardId } });
};


const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

export const updateFlashcard = async (flashcardId, userId, updates) => {
    const { front, back, difficulty } = updates;

    if (!front && !back && !difficulty) {
        throw ApiError.badRequest('At least one field must be provided: front, back, or difficulty');
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
        throw ApiError.badRequest(`difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`);
    }

    await assertFlashcardOwnership(flashcardId, userId);

    const data = {};
    if (front) data.front = front;
    if (back) data.back = back;
    if (difficulty) data.difficulty = difficulty;

    return prisma.flashcard.update({
        where: { id: flashcardId },
        data,
        select: { id: true, front: true, back: true, difficulty: true, createdAt: true },
    });
};