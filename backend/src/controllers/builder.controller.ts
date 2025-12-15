import { Request, Response } from 'express';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GeneratedResume, ResumeInputData } from '../models/generated-resume.model';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// Use local storage instead of Firestore
import { addGeneratedResume, getGeneratedResume, getGeneratedResumesByUser } from '../utils/localStorageBuilder';

interface CustomRequest extends Request {
    user?: any; // Simplified for local storage
}

// Re-initialize AI client (Consider centralizing this later)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use Gemini 2.0 Flash

type ResumeTemplateId = 'classic-ats' | 'modern-blue' | 'minimal-serif';

const A4: [number, number] = [595.28, 841.89];

function safeText(value: unknown): string {
    // pdf-lib StandardFonts use WinAnsi encoding; normalize common Unicode punctuation
    // so PDF generation doesn't fail on characters like U+2011 (non-breaking hyphen).
    return String(value ?? '')
        .replace(/\u00A0/g, ' ') // nbsp
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-') // hyphens/dashes/minus
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u2026/g, '...')
        .replace(/\s+/g, ' ')
        .trim();
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = safeText(text).split(' ').filter(Boolean);
    if (words.length === 0) return [];
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const w = font.widthOfTextAtSize(test, fontSize);
        if (w <= maxWidth) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    return lines;
}

async function renderResumePdf(pdfDoc: PDFDocument, templateId: ResumeTemplateId, input: ResumeInputData): Promise<Uint8Array> {
    const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const pageMargin = 48;
    let page = pdfDoc.addPage(A4);
    let { width, height } = page.getSize();
    const maxWidth = width - pageMargin * 2;
    let y = height - pageMargin;

    const colors = {
        text: rgb(0, 0, 0),
        muted: rgb(0.35, 0.35, 0.35),
        blue: rgb(0.12, 0.35, 0.85),
        line: rgb(0.75, 0.75, 0.75),
    };

    const ensureSpace = (needed: number) => {
        if (y - needed < pageMargin) {
            page = pdfDoc.addPage(A4);
            ({ width, height } = page.getSize());
            y = height - pageMargin;
        }
    };

    const drawLine = (x1: number, x2: number, lineY: number, color = colors.line, thickness = 1) => {
        page.drawLine({ start: { x: x1, y: lineY }, end: { x: x2, y: lineY }, thickness, color });
    };

    const drawText = (txt: string, x: number, font: any, size: number, color = colors.text, options?: { maxWidth?: number }) => {
        if (!txt) return;
        page.drawText(txt, { x, y, font, size, color, maxWidth: options?.maxWidth });
    };

    const newline = (h: number) => {
        y -= h;
    };

    const formatContactLine = () => {
        const parts = [
            safeText(input.personalInfo.phone),
            safeText(input.personalInfo.email),
            safeText(input.personalInfo.linkedin),
            safeText(input.personalInfo.portfolio),
        ].filter(Boolean);
        return parts.join('  |  ');
    };

    const name = safeText(input.personalInfo.name) || 'Your Name';
    const location = safeText(input.personalInfo.address);
    const contact = formatContactLine();

    // Header (3 styles)
    if (templateId === 'modern-blue') {
        ensureSpace(70);
        drawText(name, pageMargin, fontSansBold, 24, colors.blue);
        const rightText = [location, contact].filter(Boolean).join('\n');
        if (rightText) {
            const lines = rightText.split('\n').flatMap((l) => wrapText(l, fontSans, 10, maxWidth * 0.45));
            const rightX = pageMargin + maxWidth * 0.55;
            let ty = y;
            for (const ln of lines) {
                page.drawText(ln, { x: rightX, y: ty, font: fontSans, size: 10, color: colors.muted, maxWidth: maxWidth * 0.45 });
                ty -= 12;
            }
        }
        newline(34);
        drawLine(pageMargin, width - pageMargin, y, colors.blue, 1.5);
        newline(18);
    } else if (templateId === 'minimal-serif') {
        ensureSpace(70);
        const nameWidth = fontSerifBold.widthOfTextAtSize(name, 24);
        const nameX = Math.max(pageMargin, (width - nameWidth) / 2);
        page.drawText(name, { x: nameX, y, font: fontSerifBold, size: 24, color: colors.text });
        newline(24);
        const sub = [location, contact].filter(Boolean).join('  |  ');
        if (sub) {
            const subWidth = fontSerif.widthOfTextAtSize(sub, 10);
            const subX = Math.max(pageMargin, (width - subWidth) / 2);
            page.drawText(sub, { x: subX, y, font: fontSerif, size: 10, color: colors.muted });
            newline(16);
        } else {
            newline(10);
        }
        drawLine(pageMargin, width - pageMargin, y, colors.line, 1);
        newline(18);
    } else {
        // classic-ats
        ensureSpace(70);
        const nameWidth = fontSerifBold.widthOfTextAtSize(name, 24);
        const nameX = Math.max(pageMargin, (width - nameWidth) / 2);
        page.drawText(name, { x: nameX, y, font: fontSerifBold, size: 24, color: colors.text });
        newline(24);
        const sub = [location, contact].filter(Boolean).join('  |  ');
        if (sub) {
            const subWidth = fontSerif.widthOfTextAtSize(sub, 10);
            const subX = Math.max(pageMargin, (width - subWidth) / 2);
            page.drawText(sub, { x: subX, y, font: fontSerif, size: 10, color: colors.muted });
            newline(16);
        } else {
            newline(10);
        }
        drawLine(pageMargin, width - pageMargin, y, colors.text, 0.8);
        newline(18);
    }

    const heading = (title: string) => {
        ensureSpace(26);
        const isBlue = templateId === 'modern-blue';
        const font = templateId === 'minimal-serif' ? fontSerifBold : fontSansBold;
        const size = templateId === 'classic-ats' ? 12 : 12;
        const color = isBlue ? colors.blue : colors.text;
        const txt = templateId === 'classic-ats' ? title.toUpperCase() : title;
        page.drawText(txt, { x: pageMargin, y, font, size, color });
        newline(14);
        const lineColor = isBlue ? colors.blue : colors.line;
        drawLine(pageMargin, width - pageMargin, y, lineColor, isBlue ? 1.2 : 0.8);
        newline(12);
    };

    const drawParagraph = (text: string, font: any, size: number, color = colors.text, extraGap = 6) => {
        const lines = text.split('\n').flatMap((l) => wrapText(l, font, size, maxWidth));
        for (const ln of lines) {
            ensureSpace(size + 6);
            page.drawText(ln, { x: pageMargin, y, font, size, color });
            newline(size + 4);
        }
        newline(extraGap);
    };

    const drawBullets = (items: string[], font: any, size: number) => {
        for (const item of items.filter(Boolean)) {
            const bullet = '•';
            const bulletIndent = 10;
            const textIndent = 18;
            const lines = wrapText(item, font, size, maxWidth - textIndent);
            if (lines.length === 0) continue;
            ensureSpace(size + 6);
            page.drawText(bullet, { x: pageMargin + bulletIndent, y, font, size, color: colors.text });
            page.drawText(lines[0], { x: pageMargin + textIndent, y, font, size, color: colors.text, maxWidth: maxWidth - textIndent });
            newline(size + 4);
            for (const ln of lines.slice(1)) {
                ensureSpace(size + 6);
                page.drawText(ln, { x: pageMargin + textIndent, y, font, size, color: colors.text, maxWidth: maxWidth - textIndent });
                newline(size + 4);
            }
        }
        newline(6);
    };

    const bodyFont = templateId === 'minimal-serif' ? fontSerif : fontSans;
    const bodyBold = templateId === 'minimal-serif' ? fontSerifBold : fontSansBold;
    const bodySize = 11;

    // Summary
    if (safeText(input.summary)) {
        heading('Summary');
        drawParagraph(safeText(input.summary), bodyFont, bodySize, colors.text, 2);
    }

    // Education
    if (Array.isArray(input.education) && input.education.length > 0) {
        heading('Education');
        for (const edu of input.education) {
            const left = safeText(edu.institution);
            const right = safeText([edu.startDate, edu.endDate].filter(Boolean).join(' - '));
            ensureSpace(36);

            page.drawText(left, { x: pageMargin, y, font: bodyBold, size: bodySize, color: colors.text, maxWidth: maxWidth * 0.7 });
            if (right) {
                const rw = bodyBold.widthOfTextAtSize(right, bodySize);
                page.drawText(right, { x: width - pageMargin - rw, y, font: bodyBold, size: bodySize, color: colors.text });
            }
            newline(14);

            const line2 = safeText([edu.degree, edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : '', location ? '' : ''].filter(Boolean).join(' '));
            if (line2) {
                page.drawText(line2, { x: pageMargin, y, font: bodyFont, size: bodySize, color: colors.text, maxWidth });
                newline(14);
            }

            if (Array.isArray(edu.details) && edu.details.length > 0) {
                drawBullets(edu.details, bodyFont, bodySize);
            } else {
                newline(6);
            }
        }
    }

    // Experience
    if (Array.isArray(input.experience) && input.experience.length > 0) {
        heading('Experience');
        for (const exp of input.experience) {
            const companyLineLeft = safeText([exp.company, exp.location].filter(Boolean).join(', '));
            const dates = safeText([exp.startDate, exp.endDate].filter(Boolean).join(' - '));
            ensureSpace(46);
            page.drawText(companyLineLeft, { x: pageMargin, y, font: bodyBold, size: bodySize, color: colors.text, maxWidth: maxWidth * 0.7 });
            if (dates) {
                const dw = bodyBold.widthOfTextAtSize(dates, bodySize);
                page.drawText(dates, { x: width - pageMargin - dw, y, font: bodyBold, size: bodySize, color: colors.text });
            }
            newline(14);
            const role = safeText(exp.jobTitle);
            if (role) {
                page.drawText(role, { x: pageMargin, y, font: bodyFont, size: bodySize, color: colors.text, maxWidth });
                newline(14);
            }
            if (Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0) {
                drawBullets(exp.responsibilities, bodyFont, bodySize);
            } else {
                newline(8);
            }
        }
    }

    // Projects
    if (Array.isArray(input.projects) && input.projects.length > 0) {
        heading('Projects');
        for (const proj of input.projects) {
            const title = safeText(proj.name);
            const tech = Array.isArray(proj.technologies) && proj.technologies.length > 0 ? proj.technologies.join(', ') : '';
            ensureSpace(40);
            page.drawText(title, { x: pageMargin, y, font: bodyBold, size: bodySize, color: colors.text, maxWidth });
            newline(14);
            if (safeText(proj.description)) {
                drawParagraph(safeText(proj.description), bodyFont, bodySize, colors.text, 2);
            }
            if (tech) {
                page.drawText(`Tech: ${tech}`, { x: pageMargin, y, font: bodyFont, size: 10, color: colors.muted, maxWidth });
                newline(14);
            }
            if (safeText(proj.link)) {
                page.drawText(safeText(proj.link), { x: pageMargin, y, font: bodyFont, size: 10, color: colors.blue, maxWidth });
                newline(16);
            } else {
                newline(6);
            }
        }
    }

    // Skills
    if (Array.isArray(input.skills) && input.skills.length > 0) {
        heading('Skills');
        for (const skillSet of input.skills) {
            const cat = safeText(skillSet.category) || 'Skills';
            const items = Array.isArray(skillSet.items) ? skillSet.items.filter(Boolean) : [];
            if (items.length === 0) continue;
            ensureSpace(28);
            page.drawText(`${cat}:`, { x: pageMargin, y, font: bodyBold, size: bodySize, color: colors.text });
            const catWidth = bodyBold.widthOfTextAtSize(`${cat}:`, bodySize);
            const lines = wrapText(items.join(', '), bodyFont, bodySize, maxWidth - catWidth - 8);
            if (lines.length > 0) {
                page.drawText(lines[0], { x: pageMargin + catWidth + 8, y, font: bodyFont, size: bodySize, color: colors.text, maxWidth: maxWidth - catWidth - 8 });
                newline(14);
                for (const ln of lines.slice(1)) {
                    ensureSpace(20);
                    page.drawText(ln, { x: pageMargin + catWidth + 8, y, font: bodyFont, size: bodySize, color: colors.text, maxWidth: maxWidth - catWidth - 8 });
                    newline(14);
                }
            } else {
                newline(14);
            }
        }
        newline(6);
    }

    // Certifications
    if (Array.isArray(input.certifications) && input.certifications.length > 0) {
        heading('Certifications');
        const items = input.certifications.map((c) => {
            const left = safeText(c.name);
            const org = safeText(c.issuingOrganization);
            const date = safeText(c.dateObtained);
            const suffix = [org ? `(${org})` : '', date].filter(Boolean).join(' ');
            return [left, suffix].filter(Boolean).join(' ');
        });
        drawBullets(items, bodyFont, bodySize);
    }

    return await pdfDoc.save();
}

// Helper function to format input data for the prompt (optional but good practice)
const formatInputForPrompt = (data: ResumeInputData): string => {
    let promptData = ``;
    promptData += `Personal Information:\nName: ${data.personalInfo.name}\nEmail: ${data.personalInfo.email}${data.personalInfo.phone ? `\nPhone: ${data.personalInfo.phone}` : ''}${data.personalInfo.linkedin ? `\nLinkedIn: ${data.personalInfo.linkedin}` : ''}${data.personalInfo.portfolio ? `\nPortfolio: ${data.personalInfo.portfolio}` : ''}${data.personalInfo.address ? `\nAddress: ${data.personalInfo.address}` : ''}\n\n`;
    if (data.summary) promptData += `Professional Summary:\n${data.summary}\n\n`;
    promptData += `Education:\n${data.education.map(edu => `- ${edu.degree} ${edu.fieldOfStudy ? `in ${edu.fieldOfStudy} ` : ''}at ${edu.institution}${edu.startDate || edu.endDate ? ` (${edu.startDate || ''} - ${edu.endDate || ''})` : ''}${edu.details ? `\n  Details: ${edu.details.join(', ')}` : ''}`).join('\n')}\n\n`;
    promptData += `Experience:\n${data.experience.map(exp => `- ${exp.jobTitle} at ${exp.company}${exp.location ? `, ${exp.location}` : ''} (${exp.startDate} - ${exp.endDate})\n  Responsibilities:\n${exp.responsibilities.map(r => `    * ${r}`).join('\n')}`).join('\n\n')}\n\n`;
    promptData += `Skills:\n${data.skills.map(skillSet => `${skillSet.category ? `${skillSet.category}: ` : ''}${skillSet.items.join(', ')}`).join('\n')}\n\n`;
    if (data.certifications && data.certifications.length > 0) promptData += `Certifications:\n${data.certifications.map(cert => `- ${cert.name}${cert.issuingOrganization ? ` (${cert.issuingOrganization})` : ''}${cert.dateObtained ? `, ${cert.dateObtained}` : ''}`).join('\n')}\n\n`;
    if (data.projects && data.projects.length > 0) promptData += `Projects:\n${data.projects.map(proj => `- ${proj.name}: ${proj.description}${proj.technologies ? ` (Tech: ${proj.technologies.join(', ')})` : ''}${proj.link ? ` [${proj.link}]` : ''}`).join('\n')}\n\n`;
    if (data.targetJobRole) promptData += `Target Job Role: ${data.targetJobRole}\n`;
    if (data.targetJobDescription) promptData += `Target Job Description:\n${data.targetJobDescription}\n`;
    return promptData.trim();
};

export const generateResume = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        const userId = req.user.uid;

        // TODO: Add robust validation for req.body against ResumeInputData structure
        const inputData: ResumeInputData = req.body;
        if (!inputData || !inputData.personalInfo || !inputData.experience || !inputData.education || !inputData.skills) {
            res.status(400).json({ message: 'Bad Request: Missing essential resume input data (personalInfo, experience, education, skills)' });
            return;
        }

        console.log(`[builder]: Starting resume generation for user: ${userId}`);

        // --- Prepare Prompt for Gemini --- 
        const formattedInput = formatInputForPrompt(inputData);
        const prompt = `
          Generate a professional resume based on the following information. 
          Format the output clearly with standard resume sections (Summary/Objective, Education, Experience, Skills, Projects, Certifications, etc. as applicable based on the provided data).
          Use bullet points for responsibilities and achievements under Experience.
          Tailor the resume towards the 'Target Job Role' if provided.
          Ensure the tone is professional and concise.

          Resume Information:
          --- START INFO ---
          ${formattedInput}
          --- END INFO ---

          Generated Resume Text:
        `;

        // --- Call Gemini API --- 
        const generationConfig = { temperature: 0.5 }; // Allow some creativity
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        console.log(`[builder]: Sending prompt to Gemini for user: ${userId}`);
        const result = await model.generateContent(
            prompt
            // { generationConfig, safetySettings } // Consider enabling these
        );
        const response = await result.response;
        const generatedText = response.text();
        console.log(`[builder]: Received generated text from Gemini for user: ${userId}`);

        // --- Save to local storage --- 
        const templateId = (req.body as any)?.templateId as ResumeTemplateId | undefined;
        const generatedResumeData = {
            userId,
            inputData,
            generatedText,
            templateId: templateId || 'classic-ats',
            version: 1,
            createdAt: new Date().toISOString(),
        };

        const generatedResumeId = addGeneratedResume(generatedResumeData);
        console.log(`[builder]: Saved generated resume locally with ID: ${generatedResumeId} for user: ${userId}`);

        // --- Return Generated Text --- 
        res.status(201).json({ message: 'Resume generated successfully', generatedResumeId, generatedText });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("[builder]: Resume generation error:", error.message);
            if (error.message.includes('GOOGLE_API_KEY_INVALID')) {
                res.status(500).json({ message: 'Internal Server Error: Invalid Gemini API Key configured.' });
            } else {
                res.status(500).json({ message: 'Internal server error during resume generation', error: error.message });
            }
        }
    }
};

// --- Download Generated Resume Function ---
export const downloadGeneratedResume = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        const userId = req.user.uid;
        const { generatedResumeId } = req.params;

        if (!generatedResumeId) {
            res.status(400).json({ message: 'Bad Request: Missing generatedResumeId parameter' });
            return;
        }

        console.log(`[download]: Request to download generated resume ${generatedResumeId} for user ${userId}`);

        // Fetch generated resume from local storage
        const resumeData = getGeneratedResume(generatedResumeId);

        if (!resumeData) {
            res.status(404).json({ message: 'Generated resume not found' });
            return;
        }

        // Verify ownership
        if (resumeData.userId !== userId) {
            res.status(403).json({ message: 'Forbidden: You do not own this generated resume' });
            return;
        }

        console.log(`[download]: Generating styled PDF for generated resume ${generatedResumeId}`);

        const pdfDoc = await PDFDocument.create();
        const templateId = (resumeData.templateId as ResumeTemplateId | undefined) || 'classic-ats';

        if (resumeData.inputData) {
            const pdfBytes = await renderResumePdf(pdfDoc, templateId, resumeData.inputData as ResumeInputData);
            res.setHeader('Content-Disposition', `attachment; filename=\"resume_${templateId}_${generatedResumeId}.pdf\"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(Buffer.from(pdfBytes));
            return;
        }

        // Fallback to old plain-text PDF if inputData missing
        if (!resumeData.generatedText || resumeData.generatedText.trim() === '') {
            res.status(400).json({ message: 'Cannot download: Generated resume content is missing' });
            return;
        }

        const page = pdfDoc.addPage(A4);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 11;
        const margin = 50;
        const textWidth = width - 2 * margin;
        const lineHeight = fontSize * 1.2;
        let y = height - margin;
        const lines = String(resumeData.generatedText).split('\n');
        for (const line of lines) {
            let currentLine = '';
            const words = line.split(' ');
            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);
                if (testWidth < textWidth) {
                    currentLine = testLine;
                } else {
                    page.drawText(currentLine, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
                    y -= lineHeight;
                    currentLine = word;
                    if (y < margin) break;
                }
            }
            page.drawText(currentLine, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) });
            y -= lineHeight;
            if (y < margin) break;
        }
        const pdfBytes = await pdfDoc.save();
        res.setHeader('Content-Disposition', `attachment; filename=\"generated_resume_${generatedResumeId}.pdf\"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[download]: Error generating or downloading PDF for resume ${req.params.generatedResumeId}:`, error.message);
            if (!res.headersSent) { // Avoid sending error if response already started
                if (error.message.includes('GOOGLE_API_KEY_INVALID')) {
                    res.status(500).json({ message: 'Internal Server Error: Invalid Gemini API Key configured.' });
                } else {
                    res.status(500).json({ message: 'Internal server error during PDF download', error: error.message });
                }
            }
        }
    }
};

// POST /api/builder/download-pdf - Download a resume PDF directly from inputData + templateId
export const downloadResumePdf = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }

        const templateId = (req.body as any)?.templateId as ResumeTemplateId | undefined;
        const inputData = (req.body as any)?.inputData as ResumeInputData | undefined;

        if (!inputData || !inputData.personalInfo || !inputData.experience || !inputData.education || !inputData.skills) {
            res.status(400).json({ message: 'Bad Request: Missing essential resume input data' });
            return;
        }

        const pdfDoc = await PDFDocument.create();
        const pdfBytes = await renderResumePdf(pdfDoc, templateId || 'classic-ats', inputData);

        res.setHeader('Content-Disposition', `attachment; filename=\"resume_${templateId || 'classic-ats'}.pdf\"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.status(200).send(Buffer.from(pdfBytes));
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('[download-pdf]: Error generating resume PDF:', error.message);
        }
        if (!res.headersSent) {
            res.status(500).json({ message: 'Internal server error during PDF generation' });
        }
    }
};

// --- Get Generated Resumes Function ---
export const getGeneratedResumes = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized: User not authenticated' });
            return;
        }
        const userId = req.user.uid;

        console.log(`[getGenerated]: Fetching generated resumes for user ${userId}`);

        const userResumes = getGeneratedResumesByUser(userId);

        if (userResumes.length === 0) {
            console.log(`[getGenerated]: No generated resumes found for user ${userId}`);
            res.status(200).json({ generatedResumes: [] }); // Return empty array
            return;
        }

        // Sort by created date (newest first)
        const generatedResumes = userResumes
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(data => {
                // Return only necessary summary fields to the frontend
                return {
                    id: data.id,
                    createdAt: data.createdAt,
                    // Extract some identifying info from inputData if possible
                    inputName: data.inputData?.personalInfo?.name,
                    inputTargetRole: data.inputData?.targetJobRole,
                    version: data.version,
                    // Avoid sending the full inputData or generatedText in the list view
                };
            });

        console.log(`[getGenerated]: Found ${generatedResumes.length} generated resumes for user ${userId}`);
        res.status(200).json({ generatedResumes });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[getGenerated]: Error fetching generated resumes for user ${req.user?.uid}:`, error.message);
            const err = error as { code?: string; status?: string; message: string };
            if (err.code === 'permission-denied' || err.status === 'PERMISSION_DENIED') {
                res.status(500).json({ message: 'Internal Server Error: Firebase permission issue.' });
            } else {
                res.status(500).json({ message: 'Internal server error fetching generated resumes', error: error.message });
            }
        }
    }
}; 