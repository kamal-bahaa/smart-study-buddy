import 'dotenv/config';       
import { env } from './config/env.js';
import app from './app.js';
import prisma from './prisma/client.js';

const server = app.listen(env.PORT, () => {
    console.log(` Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log(' Database disconnected. Goodbye!');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});