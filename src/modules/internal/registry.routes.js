import { Router } from 'express';
import { registerService } from '../../config/service.registry.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

const router = Router();

/**
 * POST /api/internal/register-service
 *
 * Called by Colab at startup to register its ngrok URL.
 * Protected by x-internal-secret header.
 *
 * Body: { "service": "flashcard" | "mcq", "url": "https://xxxx.ngrok.io" }
 */
router.post('/register-service', (req, res, next) => {
    try {
        const { service, url } = req.body;
        const secret = req.headers['x-internal-secret'];

        if (!secret || secret !== env.INTERNAL_SECRET) {
            throw ApiError.unauthorized('Invalid secret');
        }

        if (!service || !url) {
            throw ApiError.badRequest('service and url are required');
        }

        if (!url.startsWith('https://')) {
            throw ApiError.badRequest('url must start with https://');
        }

        registerService(service, url);

        return sendSuccess(res, 200, `${service} service registered successfully`, { service, url });

    } catch (err) {
        next(err);
    }
});

export default router;