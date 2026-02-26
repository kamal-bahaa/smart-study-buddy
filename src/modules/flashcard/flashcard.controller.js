import {
    generateFlashcards,
    generateFlashcardsStream,
    getFlashcards,
    deleteFlashcard,
    updateFlashcard,
} from './flashcard.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

const parseId = (raw) => {
    const id = parseInt(raw, 10);
    if (isNaN(id)) throw ApiError.badRequest('Invalid ID');
    return id;
};

// POST /api/pdfs/:id/flashcards          — regular JSON response
export const generateFlashcardsController = async (req, res, next) => {
    try {
        const result = await generateFlashcards(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 201, 'Flashcards generated successfully', result);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id/flashcards/stream    
export const generateFlashcardsStreamController = async (req, res, next) => {
    try {
        await generateFlashcardsStream(parseId(req.params.id), req.user.userId, res);
    } catch (err) {
        next(err);
    }
};

// GET /api/pdfs/:id/flashcards
export const getFlashcardsController = async (req, res, next) => {
    try {
        const result = await getFlashcards(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 200, 'Flashcards retrieved successfully', result);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/flashcards/:id
export const deleteFlashcardController = async (req, res, next) => {
    try {
        await deleteFlashcard(parseId(req.params.id), req.user.userId);
        return sendSuccess(res, 200, 'Flashcard deleted successfully');
    } catch (err) {
        next(err);
    }
};

// PATCH /api/flashcards/:id
export const updateFlashcardController = async (req, res, next) => {
    try {
        const updated = await updateFlashcard(
            parseId(req.params.id),
            req.user.userId,
            req.body,
        );
        return sendSuccess(res, 200, 'Flashcard updated successfully', updated);
    } catch (err) {
        next(err);
    }
};