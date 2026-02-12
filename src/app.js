import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(express.json());                 
app.use(express.urlencoded({ extended: true })); 

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);


import { authenticate } from './middleware/authenticate.js';

app.get('/api/protected', authenticate, (req, res) => {
    res.json({
        success: true,
        message: 'You reached a protected route!',
        data: { userId: req.user.userId },
    });
});

// ── Catch-all & error handling ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;