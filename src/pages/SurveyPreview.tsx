import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { normalizeSurveyData } from "@/lib/surveyUtils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  text: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface Section {
  name: string;
  questions: Question[];
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  sections: Section[];
  language: string;
}

const SurveyPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSurvey();
  }, [id, user]);

  const loadSurvey = async () => {
    if (!user || !id) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("surveys")
        .select("id, title, description, sections, language, user_id")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Survey not found");
        setLoading(false);
        return;
      }

      // Verify ownership
      if (data.user_id !== user.id) {
        setError("You don't have permission to view this survey");
        setLoading(false);
        return;
      }

      // Normalize survey data to handle both 'text' and 'question' field names
      const normalizedSurvey = normalizeSurveyData(data);
      setSurvey(normalizedSurvey);
    } catch (err: any) {
      console.error("Error loading survey:", err);
      setError(err.message || "Failed to load survey");
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: "Text Response",
      textarea: "Long Text",
      multiple_choice: "Multiple Choice",
      checkboxes: "Checkboxes",
      dropdown: "Dropdown",
      email: "Email",
      number: "Number",
      date: "Date"
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <p className="text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || "Survey not found"}</AlertDescription>
          </Alert>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-primary hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary hover:underline"
          >
            ← Back to Dashboard
          </button>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            PREVIEW MODE
          </Badge>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl">{survey.title}</CardTitle>
            {survey.description && (
              <CardDescription className="text-base mt-2">
                {survey.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>

        {survey.sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">{section.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-base flex-1">
                      {questionIndex + 1}. {question.text}
                      {question.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </h4>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {getQuestionTypeLabel(question.type)}
                    </Badge>
                  </div>
                  
                  {question.required && (
                    <Badge variant="secondary" className="mb-2">
                      Required
                    </Badge>
                  )}

                  {question.options && question.options.length > 0 && (
                    <div className="mt-3 pl-4 space-y-2">
                      <p className="text-sm text-muted-foreground mb-2">Options:</p>
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-2">
                          <div className="h-4 w-4 rounded border border-input" />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This is a preview of how your survey will appear to respondents. No responses can be submitted in preview mode.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default SurveyPreview;
