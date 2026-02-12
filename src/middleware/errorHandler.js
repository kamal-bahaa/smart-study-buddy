import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

// Express recognises a 4-argument function as an error handler
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
    // Log in development
    if (env.NODE_ENV === 'development') {
        console.error(`[Error] ${err.name}: ${err.message}`);
        if (err.stack) console.error(err.stack);
    }

    // Our own controlled errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    // Prisma known request errors (e.g. unique constraint)
    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'A record with that value already exists',
        });
    }

    // Fallback — don't leak internals in production
    const message = env.NODE_ENV === 'development' ? err.message : 'Internal Server Error';
    return res.status(500).json({ success: false, message });
};