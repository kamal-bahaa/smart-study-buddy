import axios from 'axios';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

const MCQ_SERVICE_URL = env.MCQ_SERVICE_URL;
const REQUEST_TIMEOUT = 300000; // 5 min

// ─── Generate (original — kept for backward compatibility) ────────────────────

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



// ─── Generate with SSE Streaming ─────────────────────────────────────────────


export const generateQuizStream = async (pdfId, userId, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sseError = (message) => {
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
        res.end();
    };

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
        return sseError('Document not found');
    }

    if (!document.extractedText?.trim()) {
        return sseError('Document has no extracted text to generate a quiz from');
    }

    const cleanText = document.extractedText
        .replace(/\u0000/g, '')
        .replace(/[\r\n\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const { extractedText: _, userId: __, ...docMeta } = document;

    let fastApiResponse;
    try {
        fastApiResponse = await axios.post(
            `${MCQ_SERVICE_URL}/generate-mcqs-stream`,
            { context: cleanText, total_length: cleanText.length, limit: 20 },
            {
                timeout: REQUEST_TIMEOUT,
                responseType: 'stream',          
                headers: { Accept: 'text/event-stream' },
            },
        );
    } catch (error) {
        console.error('[MCQ Stream] Failed to connect to FastAPI:', error.message);
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return sseError('MCQ service is unreachable. Please try again later.');
        }
        return sseError('MCQ service failed to start streaming.');
    }

    const allMcqs = [];         
    const seen = new Set();   
    let buffer = '';          

    const stream = fastApiResponse.data;  

    stream.on('data', (chunk) => {
        buffer += chunk.toString('utf8');

        const blocks = buffer.split('\n\n');
        buffer = blocks.pop(); 

        for (const block of blocks) {
            if (!block.trim()) continue;

            let eventType = 'message';
            let dataLine = '';

            for (const line of block.split('\n')) {
                if (line.startsWith('event:')) {
                    eventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                    dataLine = line.slice(5).trim();
                }
            }

            if (!dataLine) continue;

            let payload;
            try {
                payload = JSON.parse(dataLine);
            } catch {
                console.warn('[MCQ Stream] Could not parse SSE data:', dataLine);
                continue;
            }

            if (eventType === 'start') {
                res.write(`event: start\ndata: ${JSON.stringify({
                    totalChunks: payload.totalChunks,
                    fileName: document.fileName,
                })}\n\n`);

            } else if (eventType === 'mcqs') {
                const batch = (payload.mcqs ?? []).filter(({ question }) => {
                    if (seen.has(question)) return false;
                    seen.add(question);
                    return true;
                }).map(({ question, options, correct_answer }) => ({
                    text: question,
                    options: [options.A, options.B, options.C, options.D],
                    correctAnswer: correct_answer,
                }));

                if (batch.length > 0) {
                    allMcqs.push(...batch);
                    res.write(`event: mcqs\ndata: ${JSON.stringify({
                        chunk: payload.chunk,
                        totalChunks: payload.totalChunks,
                        mcqs: batch,
                    })}\n\n`);
                }

            } else if (eventType === 'error') {
                console.error('[MCQ Stream] FastAPI error event:', payload.message);
                res.write(`event: error\ndata: ${JSON.stringify({ message: payload.message })}\n\n`);
            }
        }
    });

    stream.on('error', (err) => {
        console.error('[MCQ Stream] Stream error:', err.message);
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Stream connection lost' })}\n\n`);
        res.end();
    });

    stream.on('end', async () => {
        if (allMcqs.length === 0) {
            res.write(`event: error\ndata: ${JSON.stringify({ message: 'AI service returned no questions' })}\n\n`);
            res.end();
            return;
        }

        try {
            const quiz = await prisma.quiz.create({
                data: {
                    pdfId,
                    questions: {
                        createMany: {
                            data: allMcqs.map(({ text, options, correctAnswer }) => ({
                                text,
                                options,
                                correctAnswer,
                            })),
                        },
                    },
                },
                select: { id: true },
            });

            console.log(`[MCQ Stream] pdfId=${pdfId} → saved ${allMcqs.length} MCQs, quizId=${quiz.id}`);

            res.write(`event: done\ndata: ${JSON.stringify({
                document: docMeta,
                quizId: quiz.id,
                questionCount: allMcqs.length,
            })}\n\n`);

        } catch (dbErr) {
            console.error('[MCQ Stream] DB save failed:', dbErr.message);
            res.write(`event: error\ndata: ${JSON.stringify({ message: 'Failed to save quiz to database' })}\n\n`);
        }

        res.end();
    });
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