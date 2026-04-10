import axios from 'axios';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

const MCQ_SERVICE_URL = env.MCQ_SERVICE_URL;
const REQUEST_TIMEOUT = 300000; // 5 min

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateQuiz = async (pdfId, userId) => {

    // 1. Fetch document + verify ownership
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

    if (!document.extractedText?.trim()) {
        throw ApiError.badRequest('Document has no extracted text to generate a quiz from');
    }

    // 2. Clean text — same pattern as flashcard service
    const cleanText = document.extractedText
        .replace(/\u0000/g, '')
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // 3. Call Python MCQ microservice
    let mcqResponse;
    try {
        const { data } = await axios.post(
            `${MCQ_SERVICE_URL}/generate-mcqs`,
            { context: cleanText, total_length: cleanText.length, limit: 20 },
            { timeout: REQUEST_TIMEOUT },
        );
        mcqResponse = data;
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            throw ApiError.internal('MCQ service is unreachable. Please try again later.');
        }
        if (error.code === 'ECONNABORTED') {
            throw ApiError.internal('MCQ service timed out. The document may be too large.');
        }
        throw ApiError.internal(error.response?.data?.error ?? 'MCQ service failed');
    }

    if (!mcqResponse?.success || !Array.isArray(mcqResponse.mcqs) || mcqResponse.mcqs.length === 0) {
        throw ApiError.internal('AI service returned no questions');
    }

    // 4. Deduplicate by question text
    const seen = new Set();
    const unique = mcqResponse.mcqs.filter(({ question }) => {
        if (seen.has(question)) return false;
        seen.add(question);
        return true;
    });

    console.log(`pdfId=${pdfId} → MCQs received: ${mcqResponse.mcqs.length}, unique: ${unique.length}`);

    // 5. Save to DB
    //    Schema: Question { text String, options String[], correctAnswer String }
    //    AI returns: { question, options: {A,B,C,D}, correct_answer: "A"|"B"|"C"|"D" }
    const quiz = await prisma.quiz.create({
        data: {
            pdfId,
            questions: {
                createMany: {
                    data: unique.map(({ question, options, correct_answer }) => ({
                        text: question,
                        options: [options.A, options.B, options.C, options.D],
                        correctAnswer: correct_answer,
                    })),
                },
            },
        },
        include: {
            questions: {
                select: {
                    id: true,
                    text: true,
                    options: true,
                    correctAnswer: true,
                },
            },
        },
    });

    const { extractedText: _, userId: __, ...docMeta } = document;

    return {
        document: docMeta,
        quizId: quiz.id,
        questionCount: quiz.questions.length,
        questions: quiz.questions,
    };
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getQuiz = async (pdfId, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id: pdfId },
        select: { id: true, fileName: true, userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    const quiz = await prisma.quiz.findFirst({
        where: { pdfId },
        orderBy: { createdAt: 'desc' },
        include: {
            questions: {
                select: {
                    id: true,
                    text: true,
                    options: true,
                    correctAnswer: true,
                },
            },
        },
    });

    if (!quiz) {
        throw ApiError.notFound('No quiz found for this document. Generate one first.');
    }

    return {
        document: { id: document.id, fileName: document.fileName },
        quizId: quiz.id,
        questionCount: quiz.questions.length,
        questions: quiz.questions,
    };
};