import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import pdfRoutes from './modules/pdf/pdf.routes.js';
import flashcardRoutes from './modules/flashcard/flashcard.routes.js';
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
app.use('/api/pdfs', pdfRoutes);
app.use('/api/flashcards', flashcardRoutes);

// ── Catch-all & error handling ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;