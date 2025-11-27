import { useState, useEffect, useRef } from "react";
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
import { CheckCircle2, XCircle, Copy, Loader2 } from "lucide-react";
import { normalizeSurveyData } from "@/lib/surveyUtils";

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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadSurvey();
  }, [shareToken]);

  const loadSurvey = async () => {
    try {
      // SECURITY FIX: Usa funzione security definer per evitare esposizione user_id
      const { data, error } = await supabase
        .rpc("get_public_survey_by_token", {
          _share_token: shareToken
        })
        .single();

      if (error) throw error;

      if (data) {
        // Normalize survey data to handle both 'text' and 'question' field names
        const normalizedData = normalizeSurveyData(data);
        setSurvey({
          ...normalizedData,
          sections: normalizedData.sections as unknown as Section[],
          is_active: true // La funzione ritorna solo survey attivi
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
            hasError = true;
          }
        }
      });
    });

    if (hasError) {
      toast.error(t("requiredField") || "Please fill in all required fields");
      // Accessibility: move focus to the first invalid element if possible
      // For simplicity, we alert via toast, but a focus management logic would be ideal here
      return;
    }

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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading survey">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16" role="main">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" aria-hidden="true" />
              <h1 className="text-2xl font-bold mb-2">{t("surveyNotFound")}</h1>
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
        <div className="flex items-center justify-center px-4 py-16" role="main">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" aria-hidden="true" />
              <h1 className="text-2xl font-bold mb-2">{t("surveyInactive")}</h1>
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
        <div className="flex items-center justify-center px-4 py-16" role="main">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <XCircle className="h-16 w-16 text-destructive mb-4" aria-hidden="true" />
              <h1 className="text-2xl font-bold mb-2">{t("surveyExpired")}</h1>
              <p className="text-muted-foreground text-center">{expiredMessage}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    const shareLink = `${window.location.origin}/survey/${shareToken}`;
    const shareText = encodeURIComponent(`${t("checkOutSurvey")}: ${survey?.title}`);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-16" role="main">
          <Card className="max-w-md w-full animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4 animate-scale-in" aria-hidden="true" />
              <h1 className="text-2xl font-bold mb-2">{t("thankYou")}</h1>
              <p className="text-muted-foreground text-center">{t("responseSubmitted")}</p>
              
              <div className="w-full pt-4 border-t space-y-3">
                <p className="text-sm text-center text-muted-foreground">{t("shareWithOthers")}</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      toast.success(t("linkCopied"));
                    }}
                    aria-label={t("copyLink")}
                  >
                    <Copy className="h-4 w-4 mr-1" aria-hidden="true" />
                    {t("copyLink")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/?text=${shareText}%20${encodeURIComponent(shareLink)}`, "_blank")}
                    aria-label="Share on WhatsApp"
                  >
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <main className="py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-3xl" role="heading" aria-level={1}>{survey.title}</CardTitle>
              {survey.description && (
                <CardDescription className="text-base">{survey.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
          {survey.sections.map((section, sectionIndex) => (
            <section key={sectionIndex} aria-labelledby={`section-title-${sectionIndex}`}>
              <Card>
                <CardHeader>
                  <CardTitle id={`section-title-${sectionIndex}`} className="text-xl" role="heading" aria-level={2}>
                    {section.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {section.questions.map((question, questionIndex) => {
                    const key = `${sectionIndex}-${questionIndex}`;
                    const isGroupedQuestion = question.type === "radio" || question.type === "checkbox";
                    
                    // ACCESSIBILITY FIX: Use fieldset for grouping radio/checkbox questions
                    // This allows screen readers to announce the question (legend) when navigating options
                    const Wrapper = isGroupedQuestion ? "fieldset" : "div";
                    
                    return (
                      <Wrapper key={questionIndex} className="space-y-3" role={isGroupedQuestion ? "radiogroup" : undefined} aria-labelledby={isGroupedQuestion ? undefined : key}>
                        {isGroupedQuestion ? (
                          <legend className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block mb-3">
                            {question.text}
                            {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                            {question.required && <span className="sr-only"> ({t("required") || "required"})</span>}
                          </legend>
                        ) : (
                          <Label htmlFor={key} className="text-base block mb-2">
                            {question.text}
                            {question.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                            {question.required && <span className="sr-only"> ({t("required") || "required"})</span>}
                          </Label>
                        )}

                        {question.type === "text" && (
                          <Input
                            id={key}
                            value={responses[key] || ""}
                            onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
                            required={question.required}
                            aria-required={question.required}
                          />
                        )}

                        {question.type === "textarea" && (
                          <Textarea
                            id={key}
                            value={responses[key] || ""}
                            onChange={(e) => setResponses({ ...responses, [key]: e.target.value })}
                            required={question.required}
                            aria-required={question.required}
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
                                <Label htmlFor={`${key}-${optionIndex}`} className="font-normal cursor-pointer">
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
                                <Label htmlFor={`${key}-${optionIndex}`} className="font-normal cursor-pointer">
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
                            <SelectTrigger id={key} aria-label={question.text}>
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
                      </Wrapper>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          ))}

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t("submitting")}
              </>
            ) : (
              t("submitSurvey")
            )}
          </Button>
        </form>
        </div>
      </main>
    </div>
  );
};

export default PublicSurvey;
