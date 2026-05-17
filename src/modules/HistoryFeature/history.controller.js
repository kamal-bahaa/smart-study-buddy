import { getUserHistory, deleteHistoryItem } from './history.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

// GET /api/history
export const getHistoryController = async (req, res, next) => {
    try {
        const history = await getUserHistory(req.user.userId);
        return sendSuccess(res, 200, 'History retrieved', history);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/history/:id?type=QUIZ
export const deleteHistoryController = async (req, res, next) => {
    try {
        const { type } = req.query;
        if (!type) throw ApiError.badRequest('Query param "type" is required (SUMMARY | QUIZ | FLASHCARD)');
        await deleteHistoryItem(req.user.userId, type.toUpperCase(), req.params.id);
        return sendSuccess(res, 200, 'History item deleted');
    } catch (err) {
        next(err);
    }
};