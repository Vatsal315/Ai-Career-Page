import axios from 'axios';

// Resolve API base URL with sensible dev fallback so calls don't silently hit
// the Vite dev server (8080) when env vars are missing.
const defaultDevUrl = import.meta.env.DEV ? 'http://localhost:3000/api' : undefined;
let API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  defaultDevUrl;

// Ensure baseURL includes /api if not already present
if (API_BASE_URL && !API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = `${API_BASE_URL}/api`;
}

if (!API_BASE_URL) {
  console.error(
    'Error: API base URL is not set. Configure VITE_API_BASE_URL or VITE_BACKEND_API_URL.'
  );
}

// Create an Axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Firebase ID Token
apiClient.interceptors.request.use(
  (config) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/api.ts:request',message:'axios request',data:{baseURL:String(config.baseURL||''),url:String(config.url||''),method:String(config.method||''),hasToken:Boolean(localStorage.getItem('firebaseIdToken')),tokenLen:(localStorage.getItem('firebaseIdToken')||'').length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Get the token from local storage (stored by AuthContext)
    const token = localStorage.getItem('firebaseIdToken');
    if (token) {
      // Attach the token as a Bearer token to the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API Interceptor] Token attached to request');
    } else {
      console.log('[API Interceptor] No token found in localStorage.');
    }
    return config;
  },
  (error) => {
    // Log errors during request setup
    console.error('[API Interceptor] Error attaching token:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/api.ts:response',message:'axios response',data:{url:String(response.config?.url||''),status:Number(response.status)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return response; // Return successful responses directly
  },
  (error) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/lib/api.ts:error',message:'axios error',data:{url:String(error?.config?.url||''),status:Number(error?.response?.status||0),hasResponse:Boolean(error?.response),hasRequest:Boolean(error?.request),message:String(error?.message||''),responseMessage:String(error?.response?.data?.message||''),responseKeys:error?.response?.data?Object.keys(error.response.data).slice(0,10):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Handle common errors globally
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        console.error("[API Interceptor] 401 Unauthorized response");
        
        // Don't redirect from login page
        const isOnAuthPage = window.location.pathname.includes('/login') || 
                             window.location.pathname.includes('/signup');
        
        // Check if user was previously logged in
        const hadToken = localStorage.getItem('firebaseIdToken');
        
        if (hadToken && !isOnAuthPage) {
          console.log("[API Interceptor] Token invalid or expired. Clearing localStorage.");
          localStorage.removeItem('firebaseIdToken');
          
          // Avoid redirecting if already on an auth page
          if (!isOnAuthPage) {
            console.log("[API Interceptor] Redirecting to login...");
            // Store the current location to redirect back after login
            localStorage.setItem('authRedirectPath', window.location.pathname);
            window.location.href = '/login';
          }
        }
      } else if (status === 403) {
        console.error("[API Interceptor] 403 Forbidden - User doesn't have sufficient permissions");
      } else if (status >= 500) {
        console.error("[API Interceptor] Server error:", status, error.response.data);
      }
    } else if (error.request) {
      // Request was made but no response was received
      console.error("[API Interceptor] Network error - no response received:", error.request);
    } else {
      // Something else happened while setting up the request
      console.error("[API Interceptor] Error:", error.message);
    }
    
    // Always reject the promise for specific error handling in components
    return Promise.reject(error);
  }
);

export default apiClient; 