import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Local storage directory
const STORAGE_DIR = path.join(__dirname, '../../data');
const GENERATED_RESUMES_FILE = path.join(STORAGE_DIR, 'generated-resumes.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize generated resumes file if it doesn't exist
if (!fs.existsSync(GENERATED_RESUMES_FILE)) {
    fs.writeFileSync(GENERATED_RESUMES_FILE, JSON.stringify({}));
}

interface LocalStorage {
    [key: string]: any;
}

// Read all generated resumes from storage
function readGeneratedResumes(): LocalStorage {
    try {
        const data = fs.readFileSync(GENERATED_RESUMES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Write generated resumes to storage
function writeGeneratedResumes(resumes: LocalStorage): void {
    fs.writeFileSync(GENERATED_RESUMES_FILE, JSON.stringify(resumes, null, 2));
}

// Add a new generated resume
export function addGeneratedResume(data: any): string {
    const resumes = readGeneratedResumes();
    const id = uuidv4();
    resumes[id] = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        version: data.version || 1
    };
    writeGeneratedResumes(resumes);
    return id;
}

// Get a generated resume by ID
export function getGeneratedResume(id: string): any | null {
    const resumes = readGeneratedResumes();
    return resumes[id] || null;
}

// Update a generated resume
export function updateGeneratedResume(id: string, data: any): void {
    const resumes = readGeneratedResumes();
    if (resumes[id]) {
        resumes[id] = {
            ...resumes[id],
            ...data
        };
        writeGeneratedResumes(resumes);
    }
}

// Get all generated resumes for a user
export function getGeneratedResumesByUser(userId: string): any[] {
    const resumes = readGeneratedResumes();
    return Object.values(resumes).filter((resume: any) => resume.userId === userId);
}

// Delete a generated resume
export function deleteGeneratedResume(id: string): void {
    const resumes = readGeneratedResumes();
    delete resumes[id];
    writeGeneratedResumes(resumes);
}



