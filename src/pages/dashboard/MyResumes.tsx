import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Edit, FileText, MoreHorizontal, Plus, Trash2, CircleDashed, AlertTriangle, UploadCloud, Bot } from "lucide-react";
import { toast } from "sonner";
import apiClient from '@/lib/api';
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

interface UploadedResumeSummary {
  id: string;
  originalFilename: string;
  uploadTimestamp: string | { _seconds: number, _nanoseconds: number }; // Support both ISO string and Firestore format
  overallScore?: number;
  analysisTimestamp?: string | { _seconds: number, _nanoseconds: number };
}

interface GeneratedResumeSummary {
  id: string;
  createdAt: string | { _seconds: number, _nanoseconds: number }; // Support both ISO string and Firestore format
  inputName?: string;
  inputTargetRole?: string;
  version: number;
}

// --- Skeleton Card Component ---
const ResumeSkeletonCard = () => (
  <Card className="overflow-hidden">
    <CardHeader className="bg-gray-50 pb-4">
      <Skeleton className="h-5 w-3/4 mb-1" />
    </CardHeader>
    <CardContent className="p-4">
      <Skeleton className="h-4 w-1/2 mb-2" />
      <Skeleton className="h-4 w-1/4" />
    </CardContent>
    <CardFooter className="flex justify-end border-t p-3">
      <Skeleton className="h-8 w-24" />
    </CardFooter>
  </Card>
);

export default function MyResumes() {
  const navigate = useNavigate();
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResumeSummary[]>([]);
  const [generatedResumes, setGeneratedResumes] = useState<GeneratedResumeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/dashboard/MyResumes.tsx:fetchData',message:'fetch resumes start',data:{paths:['/resumes','/builder/generated']},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        const [uploadedRes, generatedRes] = await Promise.all([
          apiClient.get('/resumes'),
          apiClient.get('/builder/generated')
        ]);

        if (uploadedRes.data && Array.isArray(uploadedRes.data.resumes)) {
          setUploadedResumes(uploadedRes.data.resumes);
        } else {
          console.warn('Unexpected format for uploaded resumes:', uploadedRes.data);
          setUploadedResumes([]);
        }

        if (generatedRes.data && Array.isArray(generatedRes.data.generatedResumes)) {
          setGeneratedResumes(generatedRes.data.generatedResumes);
        } else {
          console.warn('Unexpected format for generated resumes:', generatedRes.data);
          setGeneratedResumes([]);
        }

      } catch (err: any) {
        console.error("Error fetching resumes:", err);
        const message = err.response?.data?.message || err.message || "Failed to load your resumes.";
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/87199f04-e26a-4732-af6e-c50d61b27704',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/pages/dashboard/MyResumes.tsx:catch',message:'fetch resumes failed',data:{message:String(message),status:Number(err?.response?.status||0),hasResponse:Boolean(err?.response),hasRequest:Boolean(err?.request)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        setError(message);
        toast.error(`Error loading resumes: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = (id: string, type: 'uploaded' | 'generated') => {
    toast.warning(`Deleting ${type} resume ${id} (Not Implemented)`);
    console.log(`Request to delete ${type} resume with ID: ${id}`);
  };

  const handleEdit = (id: string, type: 'uploaded' | 'generated') => {
    toast.info(`Editing ${type} resume ${id} (Not Implemented)`);
    console.log(`Request to edit ${type} resume with ID: ${id}`);
  };

  const handleDownload = async (id: string, type: 'uploaded' | 'generated') => {
    if (type === 'generated') {
      try {
        toast.info("Preparing PDF download...");
        
        const response = await apiClient.get(`/builder/download/${id}`, {
          responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `resume-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success("Resume downloaded successfully!");
      } catch (error: any) {
        console.error("Download error:", error);
        toast.error(error.response?.data?.message || "Failed to download resume");
      }
    } else {
      toast.info(`Downloading ${type} resume ${id} (Not Implemented for uploaded yet)`);
    }
    console.log(`Request to download ${type} resume with ID: ${id}`);
  };

  const handleClone = (id: string, type: 'uploaded' | 'generated') => {
    toast.info(`Cloning ${type} resume ${id} (Not Implemented)`);
    console.log(`Request to clone ${type} resume with ID: ${id}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = file.type;
      
      if (
        fileType === "application/pdf" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setUploadFile(file);
      } else {
        toast.error("Please upload a PDF or DOCX file");
        setUploadFile(null);
      }
    }
  };

  const handleUploadResume = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resumeFile', uploadFile);

    try {
      const response = await apiClient.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201) {
        toast.success("Resume uploaded successfully!");
        setUploadFile(null);
        // Clear the file input
        const input = document.getElementById('resume-upload-input') as HTMLInputElement;
        if (input) input.value = "";
        
        // Refresh the resumes list
        const uploadedRes = await apiClient.get('/resumes');
        if (uploadedRes.data && Array.isArray(uploadedRes.data.resumes)) {
          setUploadedResumes(uploadedRes.data.resumes);
        }
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      toast.error(error.response?.data?.message || "Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewAnalysis = (id: string) => {
    // Route defined in App.tsx: /dashboard/analyze (no :id param route exists)
    navigate(`/dashboard/analyze?resumeId=${encodeURIComponent(id)}`);
  };

  const formatTimestamp = (timestamp: string | { _seconds: number, _nanoseconds: number }): string => {
    if (!timestamp) {
      return 'Date unavailable';
    }
    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        // ISO string format from local storage
        date = new Date(timestamp);
      } else if (typeof timestamp._seconds === 'number') {
        // Firestore timestamp format
        date = new Date(timestamp._seconds * 1000);
      } else {
        return 'Date unavailable';
      }
      return format(date, 'PPP p');
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Resumes</h2>
            <p className="text-muted-foreground">Manage your uploaded and generated resumes</p>
          </div>
          <Button asChild disabled>
            <a href="/builder">
              <Plus className="mr-2 h-4 w-4" />
              Create New Resume
            </a>
          </Button>
        </div>

        <section>
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <UploadCloud className="mr-3 h-6 w-6 text-theme-blue" /> Uploaded Resumes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <ResumeSkeletonCard key={`uploaded-skel-${i}`} />)}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-semibold mb-4 flex items-center">
            <Bot className="mr-3 h-6 w-6 text-theme-purple" /> AI Generated Resumes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <ResumeSkeletonCard key={`generated-skel-${i}`} />)}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-medium">Failed to load resumes</p>
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Resumes</h2>
          <p className="text-muted-foreground">Manage your uploaded and generated resumes</p>
        </div>
        <Button asChild>
          <a href="/builder">
            <Plus className="mr-2 h-4 w-4" />
            Create New Resume
          </a>
        </Button>
      </div>

      {/* Upload Resume Section */}
      <Card className="border-dashed border-2 border-blue-300 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-700">
            <UploadCloud className="mr-2 h-5 w-5" />
            Upload New Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <input
                type="file"
                id="resume-upload-input"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="resume-upload-input"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Choose File
              </label>
              {uploadFile && (
                <span className="ml-3 text-sm text-gray-600">
                  Selected: {uploadFile.name}
                </span>
              )}
            </div>
            <Button
              onClick={handleUploadResume}
              disabled={!uploadFile || isUploading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <CircleDashed className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Resume
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <FileText className="mr-3 h-6 w-6 text-theme-blue" /> Uploaded Resumes
        </h3>
        {uploadedResumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploadedResumes.map((resume) => (
              <Card key={resume.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gray-50 pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg break-all">
                      {resume.originalFilename || `Resume ${resume.id.substring(0, 6)}`}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(resume.id, 'uploaded')}>
                          <Download className="mr-2 h-4 w-4" /> Download Original
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(resume.id, 'uploaded')}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground">
                      Uploaded: {formatTimestamp(resume.uploadTimestamp)}
                    </span>
                    {resume.overallScore !== undefined && (
                      <div className="flex items-center gap-1" title={`Analyzed: ${formatTimestamp(resume.analysisTimestamp)}`}>
                        <span className="font-semibold text-theme-blue text-sm">{resume.overallScore}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resume.overallScore === undefined}
                    title={resume.overallScore === undefined ? "Resume not yet analyzed" : "View Analysis"}
                    onClick={() => handleViewAnalysis(resume.id)}
                  >
                    View Analysis
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No resumes uploaded yet.</p>
        )}
      </section>

      <section>
        <h3 className="text-2xl font-semibold mb-4 flex items-center">
          <Bot className="mr-3 h-6 w-6 text-theme-purple" /> AI Generated Resumes
        </h3>
        {generatedResumes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedResumes.map((resume) => (
              <Card key={resume.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {resume.inputName ? `${resume.inputName}'s Resume` : 'Generated Resume'}
                      {resume.inputTargetRole ? ` (${resume.inputTargetRole})` : ''}
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(resume.id, 'generated')}>
                          <Download className="mr-2 h-4 w-4" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClone(resume.id, 'generated')}>
                          <Plus className="mr-2 h-4 w-4" /> Clone Input
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(resume.id, 'generated')}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Generated: {formatTimestamp(resume.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Version: {resume.version}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end border-t p-3">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(resume.id, 'generated')}>
                    <Edit className="mr-2 h-4 w-4" /> View/Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No resumes generated yet.</p>
        )}
      </section>
    </div>
  );
}
