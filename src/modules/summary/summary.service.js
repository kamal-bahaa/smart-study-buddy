import Groq from 'groq-sdk';
import prisma from '../../prisma/client.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert academic assistant helping university students deeply understand lecture material.

Analyze the following lecture content and produce a comprehensive summary using this EXACT markdown structure:

## Main Topic
A clear and detailed sentence (or two) describing the core subject of the lecture.

## Key Concepts
- **Concept Name**: A thorough explanation covering what it is, how it works, and why it matters. Be specific.
- **Concept Name**: A thorough explanation covering what it is, how it works, and why it matters. Be specific.

## Important Details
- A specific and meaningful detail that students must understand — not vague, not obvious.
- Include numbers, comparisons, trade-offs, or formulas where relevant.
- Minimum 5 details, maximum 10.

## Conclusion
Two to three paragraphs synthesizing the lecture's key ideas, highlighting relationships between concepts, and explaining the broader significance of the material.

Rules:
- Be thorough and precise — this summary will be used for exam revision.
- Use academic language suitable for university students.
- Do NOT add any extra sections or text outside this structure.
- Do NOT use JSON or code blocks.
- Do NOT be vague — every sentence must add value.`;


const parseMarkdown = (markdown) => {
    const extract = (section) => {
        const regex = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`);
        const match = markdown.match(regex);
        return match ? match[1].trim() : '';
    };

    const toList = (text) =>
        text
            .split('\n')
            .map((line) => line.replace(/^[-*]\s+/, '').trim())
            .filter(Boolean);

    const cleanText = (text) => text.replace(/\n+/g, ' ').trim();

    return {
        mainTopic: cleanText(extract('Main Topic')),
        keyConcepts: toList(extract('Key Concepts')),
        importantDetails: toList(extract('Important Details')),
        conclusion: cleanText(extract('Conclusion')),
    };
};


const formatSummary = (summary) => {
    const parsed = parseMarkdown(summary.content);
    return {
        id: summary.id,
        mainTopic: parsed.mainTopic,
        keyConcepts: parsed.keyConcepts,
        importantDetails: parsed.importantDetails,
        conclusion: parsed.conclusion,
        createdAt: summary.createdAt,
    };
};


export const generateSummary = async (pdfId, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id: pdfId },
        select: {
            id: true,
            fileName: true,
            extractedText: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    let summaryText;
    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Lecture content:\n${document.extractedText}` },
            ],
            temperature: 0.3,  
            max_tokens: 2048,
        });

        summaryText = completion.choices[0].message.content.trim();
    } catch (err) {
        console.error('Groq error:', err.message);
        throw ApiError.internal('Failed to generate summary');
    }

    await prisma.summary.deleteMany({ where: { pdfId } });

    const summary = await prisma.summary.create({
        data: { content: summaryText, pdfId },
        select: { id: true, content: true, createdAt: true },
    });

    const { extractedText: _, userId: __, ...metadata } = document;
    return { document: metadata, summary: formatSummary(summary) };
};


export const getSummary = async (pdfId, userId) => {
    const document = await prisma.pdfDocument.findUnique({
        where: { id: pdfId },
        select: { id: true, fileName: true, userId: true },
    });

    if (!document || document.userId !== userId) {
        throw ApiError.notFound('Document not found');
    }

    const summary = await prisma.summary.findFirst({
        where: { pdfId },
        select: { id: true, content: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });

    return {
        document: { id: document.id, fileName: document.fileName },
        summary: summary ? formatSummary(summary) : null,
    };
};