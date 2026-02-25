const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'FLASHCARD_SERVICE_URL'];

for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

export const env = {
    // Server
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),

    // Database
    DATABASE_URL: process.env.DATABASE_URL,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

    // Bcrypt
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

    // AI Services
    FLASHCARD_SERVICE_URL: process.env.FLASHCARD_SERVICE_URL,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};