import { Request, Response } from 'express';
import { AxiosError } from 'axios';

interface ApiError extends Error {
    code?: string;
    status?: string | number;
    response?: {
        status?: string | number;
        data?: { message?: string; };
    };
}

interface ResumeAnalysisResult {
    skills?: string[];
    experience?: string[];
    education?: string[];
    summary?: string;
    // Add other properties as they become clear from AI response structure
}
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Resume } from '../models/resume.model';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
// Use local storage instead of Firestore
import { addResume, getResume, getResumeForUser, updateResume, getResumesByUser } from '../utils/localStorage';

interface CustomRequest extends Request {
    user?: any; // Simplified for local storage
}

// Initialize Google Generative AI 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Use Gemini 2.0 Flash

// Placeholder for uploadResume function
export const uploadResume = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        // If user is not authenticated, assign a generic or null userId
        const userId = req.user ? req.user.uid : 'anonymous';

        // Check if a file was uploaded by multer
        if (!req.file) {
            res.status(400).json({ message: 'Bad Request: No file uploaded' });
            return;
        }

        const file = req.file;
        let parsedText = '';

        console.log(`[upload]: Processing file: ${file.originalname}, Type: ${file.mimetype}, Size: ${file.size} bytes`);

        // Parse based on mimetype
        if (file.mimetype === 'application/pdf') {
            const data = await pdfParse(file.buffer);
            parsedText = data.text;
            console.log(`[upload]: PDF parsed successfully.`);
        } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const { value } = await mammoth.extractRawText({ buffer: file.buffer });
            parsedText = value;
            console.log(`[upload]: DOCX parsed successfully.`);
        } else {
            // This case should ideally be prevented by multer's fileFilter, but handle defensively
            res.status(400).json({ message: 'Unsupported file type' });
            return;
        }

        // Create Resume data object
        const resumeData = {
            userId: userId,
            originalFilename: file.originalname,
            parsedText: parsedText,
            uploadTimestamp: new Date().toISOString(),
            // analysis field will be added later
        };

        // Use local storage
        const resumeId = addResume(resumeData);
        console.log(`[upload]: Resume data saved locally with ID: ${resumeId}`);

        // Respond with the ID of the newly created resume document
        res.status(201).json({ message: 'Resume uploaded and parsed successfully', resumeId: resumeId });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("[upload]: Resume upload/parsing error:", error.message);
            res.status(500).json({ message: 'Internal server error during resume processing', error: error.message });
        }
    }
};

// --- Analyze Resume Function ---
export const analyzeResume = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user ? req.user.uid : 'anonymous';
        const { resumeId } = req.params;

        if (!resumeId) {
            res.status(400).json({ message: 'Bad Request: Missing resumeId parameter' });
            return;
        }

        // Use local storage (and claim anonymous resumes when user is authenticated)
        const resumeData = getResumeForUser(resumeId, userId, { claimAnonymous: true });

        if (!resumeData) {
            const exists = getResume(resumeId);
            if (exists) {
                res.status(403).json({ message: 'Forbidden: You do not own this resume' });
                return;
            } else {
                res.status(404).json({ message: 'Resume not found' });
                return;
            }
        }

        if (!resumeData.parsedText || resumeData.parsedText.trim() === '') {
            res.status(400).json({ message: 'Cannot analyze empty resume text' });
            return;
        }

        console.log(`[analyze]: Starting analysis for resume: ${resumeId}, User: ${userId}`);

        // --- Prepare Prompt for Gemini --- (Aligned with frontend ResumeAnalysis interface)
        const prompt = `
          Analyze the following resume text and provide feedback. Structure your response as a JSON object adhering STRICTLY to the following format:
          {
            "overallScore": <integer score 0-100>,
            "categoryScores": {
              "formatting": <integer score 0-100 for layout, readability, consistency>,
              "content": <integer score 0-100 for clarity, conciseness, grammar, spelling>,
              "keywords": <integer score 0-100 for relevance of skills and terms to common job descriptions>,
              "impact": <integer score 0-100 for showcasing achievements and quantifiable results>
            },
            "suggestions": [<array of specific, actionable suggestion strings>],
            "strengths": [<array of specific strength strings>]
          }

          Resume Text:
          --- START RESUME ---
          ${resumeData.parsedText}
          --- END RESUME ---

          Ensure your entire response is ONLY the JSON object requested, without any introductory text, code block markers (\`\`\`), or explanations.

          JSON Response:
        `;

        // --- Call Gemini API --- (Consider adding safety settings)
        const generationConfig = {
            temperature: 0.2, // Lower temperature for more deterministic/factual response
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
        };
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];

        const result = await model.generateContent(
            prompt
            // Consider passing generationConfig and safetySettings if needed
            // { generationConfig, safetySettings }
        );
        const response = await result.response;
        const aiTextResponse = response.text();

        console.log(`[analyze]: Received raw response from Gemini for resume ${resumeId}.`);

        // --- Parse Gemini Response --- (Robust parsing needed)
        let analysisResult: ResumeAnalysisResult = {};
        try {
            // Attempt to parse the text response as JSON
            // Find the start and end of the JSON block if necessary
            const jsonMatch = aiTextResponse.match(/\{.*\}/s);
            if (jsonMatch && jsonMatch[0]) {
                analysisResult = JSON.parse(jsonMatch[0]);
                console.log(`[analyze]: Successfully parsed JSON from Gemini response for resume ${resumeId}.`);
            } else {
                console.error(`[analyze]: Failed to find valid JSON in Gemini response for resume ${resumeId}. Response: ${aiTextResponse}`);
                throw new Error('Failed to parse AI analysis response as JSON.');
            }

            // TODO: Add validation for the structure of analysisResult (ensure required keys exist)

        } catch (parseError: unknown) {
            if (parseError instanceof Error) {
                console.error(`[analyze]: Error parsing Gemini response for resume ${resumeId}:`, parseError.message);
                // Log the raw response for debugging
                console.error(`[analyze]: Raw AI response: ${aiTextResponse}`);
                res.status(500).json({ message: 'Failed to parse AI analysis response', error: parseError.message });
                return;
            }
        }

        // --- Update local storage --- 
        const analysisUpdateData = {
            analysis: {
                ...analysisResult, // Spread the parsed data
                analysisTimestamp: new Date().toISOString()
            }
        };
        // Update local storage
        updateResume(resumeId, analysisUpdateData);
        console.log(`[analyze]: Analysis results updated locally for resume: ${resumeId}`);

        res.status(200).json({ message: 'Resume analyzed successfully', analysis: analysisUpdateData.analysis });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[analyze]: Error during resume analysis for resume ${req.params.resumeId}:`, error.message);
            if ((error as ApiError).message.includes('GOOGLE_API_KEY_INVALID')) {
                res.status(500).json({ message: 'Internal Server Error: Invalid Gemini API Key configured.' });
            } else if ((error as ApiError).code === 'permission-denied' || (error as ApiError).status === 'PERMISSION_DENIED') {
                res.status(500).json({ message: 'Internal Server Error: Firebase permission issue.' });
            } else {
                res.status(500).json({ message: 'Internal server error during analysis', error: (error as ApiError).message });
            }
        }
    }
};

// --- Get Uploaded Resumes Function ---
export const getUploadedResumes = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        // Allow both authenticated and anonymous users
        const userId = req.user?.uid || 'anonymous';

        console.log(`[getResumes]: Fetching uploaded resumes for user ${userId}`);

        const userResumes = getResumesByUser(userId);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/controllers/resume.controller.ts:getUploadedResumes',message:'getUploadedResumes',data:{userType:userId==='anonymous'?'anonymous':'authed',count:Array.isArray(userResumes)?userResumes.length:-1},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (userResumes.length === 0) {
            console.log(`[getResumes]: No uploaded resumes found for user ${userId}`);
            res.status(200).json({ resumes: [] }); // Return empty array, not an error
            return;
        }

        // Sort by upload timestamp (newest first)
        const resumes = userResumes
            .sort((a, b) => new Date(b.uploadTimestamp).getTime() - new Date(a.uploadTimestamp).getTime())
            .map(data => {
                // Return only necessary fields to the frontend
                return {
                    id: data.id,
                    originalFilename: data.originalFilename,
                    uploadTimestamp: data.uploadTimestamp,
                    overallScore: data.analysis?.overallScore, // Include score if available
                    analysisTimestamp: data.analysis?.analysisTimestamp
                };
            });

        console.log(`[getResumes]: Found ${resumes.length} uploaded resumes for user ${userId}`);
        res.status(200).json({ resumes });

    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[getResumes]: Error fetching uploaded resumes for user ${req.user?.uid}:`, error.message);
            if ((error as ApiError).code === 'permission-denied' || (error as ApiError).status === 'PERMISSION_DENIED') {
                res.status(500).json({ message: 'Internal Server Error: Firebase permission issue.' });
            } else {
                res.status(500).json({ message: 'Internal server error fetching uploaded resumes', error: error.message });
            }
        }
    }
};

// --- Get Resume Details by ID (includes analysis if present) ---
export const getResumeById = async (req: CustomRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.uid || 'anonymous';
        const { resumeId } = req.params;

        if (!resumeId) {
            res.status(400).json({ message: 'Bad Request: Missing resumeId parameter' });
            return;
        }

        const resumeData = getResumeForUser(resumeId, userId, { claimAnonymous: true });
        if (!resumeData) {
            const exists = getResume(resumeId);
            if (exists) {
                res.status(403).json({ message: 'Forbidden: You do not own this resume' });
                return;
            } else {
                res.status(404).json({ message: 'Resume not found' });
                return;
            }
        }

        res.status(200).json({
            resume: {
                id: resumeData.id,
                originalFilename: resumeData.originalFilename,
                uploadTimestamp: resumeData.uploadTimestamp,
                analysis: resumeData.analysis || null
            }
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error(`[getResumeById]: Error fetching resume ${req.params.resumeId} for user ${req.user?.uid}:`, error.message);
            res.status(500).json({ message: 'Internal server error fetching resume', error: error.message });
        }
    }
};

// TODO: Add other resume controller functions later (getResumeById, getAllResumes) 