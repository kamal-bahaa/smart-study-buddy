import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendError } from '../utils/ApiResponse.js';

/**
 * Middleware — verifies the Authorization: Bearer <token> header.
 * On success, attaches `req.user = { userId }` and calls next().
 * On failure, sends 401 immediately.
 */
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 401, 'Access token required');
    }

    const token = authHeader.split(' ')[1]; // Bearer [accessToken]

    try {
        const payload = jwt.verify(token, env.JWT_SECRET);
        req.user = { userId: payload.userId };
        next();
    } 
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return sendError(res, 401, 'Access token has expired');
        }
        return sendError(res, 401, 'Invalid access token');
    }
};