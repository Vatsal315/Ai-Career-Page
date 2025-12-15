import { Router } from 'express';
import { downloadCoverLetterPdfController, generateCoverLetterController } from '../controllers/coverLetter.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/cover-letter/generate - Generate a cover letter (works for anonymous users)
router.post('/generate', optionalAuth, generateCoverLetterController);

// POST /api/cover-letter/download - Download cover letter as PDF
router.post('/download', optionalAuth, downloadCoverLetterPdfController);

export default router; 