import express from 'express';

import authRoutes from './modules/auth/auth.routes.js';
import pdfRoutes from './modules/pdf/pdf.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import flashcardRoutes from './modules/flashcard/flashcard.routes.js';
import quizRoutes from './modules/mcq/quiz.routes.js';
import summaryRoutes from './modules/summary/summary.routes.js';
import historyRoutes from './modules/HistoryFeature/history.routes.js';  
import translationRoutes from './modules/translation/translation.routes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// ── Global middleware ─────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/pdfs/:id/quiz', quizRoutes);
app.use('/api/pdfs/:id/summary', summaryRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/history', historyRoutes);        
app.use('/api/translate', translationRoutes);

// ── Errors ────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;