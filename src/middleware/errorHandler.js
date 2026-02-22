import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';


export const errorHandler = (err, req, res, next) => {
    
    if (env.NODE_ENV === 'development') {
        console.error(`[Error] ${err.name}: ${err.message}`);
        if (err.stack) console.error(err.stack);
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }

    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'A record with that value already exists',
        });
    }

    
    const message = env.NODE_ENV === 'development' ? err.message : 'Internal Server Error';
    return res.status(500).json({ success: false, message });
};