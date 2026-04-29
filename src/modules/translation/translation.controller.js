import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export const translateController = async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw ApiError.badRequest('text field is required');
        }

        const cleanText = text.trim().replace(/\s+/g, ' ');

        if (cleanText.length > 5000) {
            throw ApiError.badRequest('text must be 5000 characters or less');
        }

        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a professional translator. Translate the given text to Arabic. ' +
                        'Return ONLY the translated text — no explanations, no notes, no original text.',
                },
                {
                    role: 'user',
                    content: cleanText,
                },
            ],
            temperature: 0.1,
            max_tokens: 2000,
        });

        const translated = response.choices[0].message.content.trim();

        return sendSuccess(res, 200, 'Text translated successfully', {
            original: cleanText,
            translated,
            targetLang: 'ar',
        });

    } catch (err) {
        if (err instanceof ApiError) return next(err);
        console.error('[Translation] Groq error:', err.message);
        next(ApiError.internal('Translation service failed. Please try again.'));
    }
};