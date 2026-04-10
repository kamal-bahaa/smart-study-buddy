import { getUserHistory } from './history.service.js';
import { sendSuccess } from '../../utils/ApiResponse.js';

// GET /api/history
export const getHistoryController = async (req, res, next) => {
    try {
        const history = await getUserHistory(req.user.userId);
        return sendSuccess(res, 200, 'History retrieved', history);
    } catch (err) {
        next(err);
    }
};