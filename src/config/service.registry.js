/**
 * In-memory registry for AI service URLs.
 * When a Colab notebook starts, it registers its ngrok URL here.
 * Node.js services read from here instead of process.env.
 */

const registry = {
    flashcard: process.env.FLASHCARD_SERVICE_URL ?? null,
    mcq: process.env.MCQ_SERVICE_URL ?? null,
};

export const registerService = (name, url) => {
    if (!['flashcard', 'mcq'].includes(name)) {
        throw new Error(`Unknown service: ${name}`);
    }
    registry[name] = url;
    console.log(`[Registry] ${name} service registered: ${url}`);
};

export const getServiceUrl = (name) => {
    return registry[name] ?? null;
};