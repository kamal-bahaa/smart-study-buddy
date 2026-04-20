import { generateQuiz, generateQuizStream, getQuiz } from './quiz.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

const parseId = (raw) => {
    const id = parseInt(raw, 10);
    if (isNaN(id)) throw ApiError.badRequest('Invalid ID');
    return id;
};

// POST /api/pdfs/:id/quiz          
export const generateQuizController = async (req, res, next) => {
    try {
        const result = await generateQuiz(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 201, 'Quiz generated successfully', result);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id/quiz/stream    — SSE streaming response
export const generateQuizStreamController = async (req, res, next) => {
    try {
        await generateQuizStream(parseId(req.params.id), req.user.userId, res);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id/quiz
export const getQuizController = async (req, res, next) => {
    try {
        const result = await getQuiz(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 200, 'Quiz retrieved successfully', result);
    } catch (err) {
        next(err);
    }
};