import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, LayoutTemplate, ArrowRight } from "lucide-react";
import { resumeTemplates, type ResumeTemplate } from "@/utils/resumeTemplates";

export default function ResumeTemplates() {
  const navigate = useNavigate();

  const handleUseTemplate = (template: ResumeTemplate) => {
    toast.success(`Template selected: ${template.name}`);
    navigate(`/dashboard/builder?template=${encodeURIComponent(template.id)}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Resume Templates</h2>
          <p className="text-muted-foreground">
            Pick a template and start editing instantly in the Resume Builder.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          <LayoutTemplate className="h-4 w-4 mr-2" /> 3 Templates
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {resumeTemplates.map((t) => (
          <Card key={t.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {t.name}
                  </CardTitle>
                  <CardDescription className="mt-1">{t.description}</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t.tag}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-lg border bg-white overflow-hidden">
                <img
                  src={t.previewSrc}
                  alt={`${t.name} preview`}
                  className="w-full h-72 object-cover"
                  loading="lazy"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t bg-gray-50">
              <Button
                onClick={() => handleUseTemplate(t)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Use Template <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

