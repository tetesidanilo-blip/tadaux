import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

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
  description: string | null;
  sections: Section[];
  language: string;
  is_active: boolean;
  expires_at: string | null;
  expired_message: string | null;
}

const PublicSurvey = () => {
  const { shareToken } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const { setLanguage, t } = useLanguage();

  useEffect(() => {
    loadSurvey();
  }, [shareToken]);

  const loadSurvey = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("share_token", shareToken)
        .single();

      if (error) throw error;

      if (data) {
        setSurvey({
          ...data,
          sections: data.sections as unknown as Section[]
        });
        setLanguage(data.language as "en" | "it");
      }
    } catch (error) {
      console.error("Error loading survey:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSurveyExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!survey) return;

    // Validate required fields
    let hasError = false;
    survey.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        if (question.required) {
          const key = `${sectionIndex}-${questionIndex}`;
          if (!responses[key] || (Array.isArray(responses[key]) && responses[key].length === 0)) {
            toast.error(t("requiredField"));
            hasError = true;
          }
        }
      });
    });

    if (hasError) return;

    setSubmitting(true);

    try {
      const formattedResponses = Object.entries(responses).map(([key, answer]) => {
        const [sectionIndex, questionIndex] = key.split("-").map(Number);
        return {
          sectionIndex,
          questionIndex,
          answer
        };
      });

      const { error } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: survey.id,
          responses: formattedResponses
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success(t("responseSubmitted"));
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("surveyNotFound")}</h2>
              <p className="text-muted-foreground text-center">{t("surveyNotFoundDesc")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!survey.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("surveyInactive")}</h2>
              <p className="text-muted-foreground text-center">{t("surveyInactiveDesc")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSurveyExpired(survey.expires_at)) {
    const expiredMessage = survey.expired_message || 
      (survey.language === "it" ? "Questo questionario è scaduto" : "This survey has expired");
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("surveyExpired")}</h2>
              <p className="text-muted-foreground text-center">{expiredMessage}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">{t("thankYou")}</h2>
              <p className="text-muted-foreground text-center">{t("responseSubmitted")}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl">{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="text-base">{survey.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {survey.sections.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader>
                <CardTitle className="text-xl">{section.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {section.questions.map((question, questionIndex) => {
                  const key = `${sectionIndex}-${questionIndex}`;
                  
                  return (
                    <div key={questionIndex} className="space-y-3">
                      <Label className="text-base">
                        {question.text}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                      </Label>

                      {question.type === "text" && (
                        <Input
                          value={responses[key] || ""}
                          onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
                          required={question.required}
                        />
                      )}

                      {question.type === "textarea" && (
                        <Textarea
                          value={responses[key] || ""}
                          onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
                          required={question.required}
                          rows={4}
                        />
                      )}

                      {question.type === "radio" && question.options && (
                        <RadioGroup
                          value={responses[key]}
                          onValueChange={(value) => setResponses({ ...responses, [key]: value })}
                          required={question.required}
                        >
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <RadioGroupItem value={option} id={`${key}-${optionIndex}`} />
                              <Label htmlFor={`${key}-${optionIndex}`} className="font-normal">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.type === "checkbox" && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${key}-${optionIndex}`}
                                checked={responses[key]?.includes(option) || false}
                                onCheckedChange={(checked) => {
                                  const current = responses[key] || [];
                                  const updated = checked
                                    ? [...current, option]
                                    : current.filter((item: string) => item !== option);
                                  setResponses({ ...responses, [key]: updated });
                                }}
                              />
                              <Label htmlFor={`${key}-${optionIndex}`} className="font-normal">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === "select" && question.options && (
                        <Select
                          value={responses[key]}
                          onValueChange={(value) => setResponses({ ...responses, [key]: value })}
                          required={question.required}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {question.options.map((option, optionIndex) => (
                              <SelectItem key={optionIndex} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t("submitting") : t("submitSurvey")}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default PublicSurvey;
