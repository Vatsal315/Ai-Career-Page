import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Local storage directory
const STORAGE_DIR = path.join(__dirname, '../../data');
const RESUMES_FILE = path.join(STORAGE_DIR, 'resumes.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize resumes file if it doesn't exist
if (!fs.existsSync(RESUMES_FILE)) {
    fs.writeFileSync(RESUMES_FILE, JSON.stringify({}));
}

interface LocalStorage {
    [key: string]: any;
}

// Read all resumes from storage
function readResumes(): LocalStorage {
    try {
        const data = fs.readFileSync(RESUMES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Write resumes to storage
function writeResumes(resumes: LocalStorage): void {
    fs.writeFileSync(RESUMES_FILE, JSON.stringify(resumes, null, 2));
}

// Add a new resume
export function addResume(data: any): string {
    const resumes = readResumes();
    const id = uuidv4();
    resumes[id] = {
        ...data,
        id,
        uploadTimestamp: new Date().toISOString()
    };
    writeResumes(resumes);
    return id;
}

// Get a resume by ID
export function getResume(id: string): any | null {
    const resumes = readResumes();
    return resumes[id] || null;
}

// Get a resume by ID, ensuring the given user can access it.
// In local-dev mode, this can optionally "claim" anonymous resumes once a user is authenticated.
export function getResumeForUser(
    id: string,
    userId: string,
    options?: { claimAnonymous?: boolean }
): any | null {
    const resumes = readResumes();
    const resume = resumes[id];
    if (!resume) return null;

    if (resume.userId === userId) return resume;
    if (resume.userId === 'anonymous' && userId === 'anonymous') return resume;

    if (options?.claimAnonymous && resume.userId === 'anonymous' && userId !== 'anonymous') {
        const updated = { ...resume, userId };
        resumes[id] = updated;
        writeResumes(resumes);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/utils/localStorage.ts:getResumeForUser',message:'claimed anonymous resume',data:{resumeId:id,from:'anonymous',to:'authed'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
        // #endregion

        return updated;
    }

    return null;
}

// Update a resume
export function updateResume(id: string, data: any): void {
    const resumes = readResumes();
    if (resumes[id]) {
        resumes[id] = {
            ...resumes[id],
            ...data
        };
        writeResumes(resumes);
    }
}

// Get all resumes for a user
export function getResumesByUser(userId: string): any[] {
    const resumes = readResumes();
    return Object.values(resumes).filter((resume: any) => resume.userId === userId);
}

// Delete a resume
export function deleteResume(id: string): void {
    const resumes = readResumes();
    delete resumes[id];
    writeResumes(resumes);
}



