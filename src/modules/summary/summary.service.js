import Groq from 'groq-sdk';
import PDFDocument from 'pdfkit';
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

export const exportSummaryAsPdf = async (pdfId, userId) => {
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

    if (!summary) throw ApiError.notFound('No summary found. Generate one first.');

    const parsed = parseMarkdown(summary.content);
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), fileName: document.fileName }));
        doc.on('error', reject);

        // ── Title ──
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a1a')
            .text('Summary', { align: 'center' });
        doc.moveDown(0.4);
        doc.fontSize(10).font('Helvetica').fillColor('#777777')
            .text(document.fileName, { align: 'center' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
        doc.moveDown(1.2);

        // ── Section header helper ──
        const sectionHeader = (title) => {
            doc.fontSize(13).font('Helvetica-Bold').fillColor('#2c3e50').text(title);
            doc.moveDown(0.4);
        };

        // ── Inline bold helper ──
        const renderInlineBold = (text) => {
            const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
            parts.forEach((part, i) => {
                const isBold = /^\*\*[^*]+\*\*$/.test(part);
                const content = isBold ? part.slice(2, -2) : part;
                if (!content) return;
                const isLast = i === parts.length - 1;
                doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(11)
                    .fillColor('#2c2c2c')
                    .text(content, { continued: !isLast });
            });
        };

        // ── Main Topic ──
        sectionHeader('Main Topic');
        doc.fontSize(11).font('Helvetica').fillColor('#2c2c2c').lineGap(3)
            .text(parsed.mainTopic);
        doc.moveDown(1);

        // ── Key Concepts ──
        sectionHeader('Key Concepts');
        parsed.keyConcepts.forEach((concept) => {
            doc.fontSize(11).font('Helvetica').fillColor('#2c2c2c')
                .text('• ', { continued: true });
            renderInlineBold(concept);
            doc.moveDown(0.8);
        });
        doc.moveDown(0.5);

        // ── Important Details ──
        sectionHeader('Important Details');
        parsed.importantDetails.forEach((detail) => {
            doc.fontSize(11).font('Helvetica').fillColor('#2c2c2c')
                .text(`• ${detail}`, { lineGap: 4, paragraphGap: 6 });
        });
        doc.moveDown(0.7);

        // ── Conclusion ──
        sectionHeader('Conclusion');
        doc.fontSize(11).font('Helvetica').fillColor('#2c2c2c').lineGap(4)
            .text(parsed.conclusion);

        doc.end();
    });
};