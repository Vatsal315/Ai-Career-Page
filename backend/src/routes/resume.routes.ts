import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';
// Import controller and multer config
import { uploadResume, analyzeResume, getUploadedResumes, getResumeById } from '../controllers/resume.controller';
import upload from '../config/multer.config'; // Import the configured multer instance

const router = Router();

// GET /api/resumes - Get list of uploaded resumes for the user
router.get(
    '/', // Root path relative to /api/resumes
    optionalAuth, // Allow both authenticated and anonymous users
    getUploadedResumes
);

// POST /api/resumes/upload - Upload and parse a resume
router.post(
    '/upload',
    optionalAuth, // Attach user if token is provided, otherwise continue as anonymous
    upload.single('resumeFile'), // Handle single file upload named 'resumeFile'
    uploadResume // Process the uploaded file
);

// POST /api/resumes/:resumeId/analyze - Analyze a specific resume
router.post(
    '/:resumeId/analyze',
    optionalAuth, // Attach user if token is provided, otherwise continue as anonymous
    analyzeResume // Call the analysis controller function
);

// GET /api/resumes/:resumeId - Get a specific resume (includes analysis if present)
router.get(
    '/:resumeId',
    optionalAuth,
    getResumeById
);

// TODO: Add other resume routes later (e.g., GET /api/resumes/:id)

export default router; 