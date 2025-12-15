import { Request as ExpressRequest, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// Extend Express Request interface to include 'user' property
interface CustomRequest extends ExpressRequest {
    user?: admin.auth.DecodedIdToken;
}

export const authenticateToken = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        res.status(401).json({ message: 'Unauthorized: No token provided' });
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken; // Attach decoded user info to the request object
        console.log(`[auth]: User authenticated: ${decodedToken.uid}`);
        next(); // Proceed to the next middleware or route handler
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("[auth]: Token verification failed:", error.message);
            const err = error as { code?: string; message: string };
            if (err.code === 'auth/id-token-expired') {
                res.status(401).json({ message: 'Unauthorized: Token expired' });
            } else {
                res.status(401).json({ message: 'Unauthorized: Token verification failed', error: err.message });
            }
        }
    }
}; 

// Export authenticateToken as requireAuth for consistency across the codebase
export const requireAuth = authenticateToken;

// Optional authentication - sets req.user if token exists, but doesn't fail if missing
export const optionalAuth = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/middleware/auth.middleware.ts:optionalAuth',message:'optionalAuth entry',data:{path:String((req as any).originalUrl||''),hasAuthHeader:Boolean(authHeader),tokenLen:(token||'').length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!token) {
        // No token provided - continue as anonymous
        next();
        return;
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        console.log(`[auth]: User authenticated: ${decodedToken.uid}`);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/middleware/auth.middleware.ts:optionalAuth:ok',message:'optionalAuth verified token',data:{path:String((req as any).originalUrl||''),userAttached:Boolean((req as any).user)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        next();
    } catch (error: unknown) {
        // Token invalid - continue as anonymous but log the error
        if (error instanceof Error) {
            console.warn("[auth]: Optional auth failed, continuing as anonymous:", error.message);
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'backend/src/middleware/auth.middleware.ts:optionalAuth:fail',message:'optionalAuth verify failed',data:{path:String((req as any).originalUrl||''),errorMessage:String((error as any)?.message||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        next();
    }
}; 