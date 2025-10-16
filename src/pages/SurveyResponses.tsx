import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navbar } from "@/components/Navbar";

interface Response {
  id: string;
  submitted_at: string;
  responses: Array<{
    sectionIndex: number;
    questionIndex: number;
    answer: any;
  }>;
}

interface Survey {
  id: string;
  title: string;
  sections: any[];
}

const SurveyResponses = () => {
  const { id } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, id]);

  const loadData = async () => {
    try {
      // Load survey - check ownership first
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();

      if (surveyError) throw surveyError;

      if (!surveyData) {
        navigate("/dashboard");
        return;
      }

      // Check if user is owner or if responses are public
      const userIsOwner = surveyData.user_id === user?.id;
      const responsesArePublic = surveyData.responses_public === true;

      setIsOwner(userIsOwner);
      setIsPublic(responsesArePublic);

      // If not owner and not public, redirect
      if (!userIsOwner && !responsesArePublic) {
        toast.error("Non hai accesso a queste risposte");
        navigate("/");
        return;
      }

      setSurvey({
        ...surveyData,
        sections: surveyData.sections as any[]
      });

      // Load responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", id)
        .order("submitted_at", { ascending: false });

      if (responsesError) throw responsesError;

      const formattedResponses = (responsesData || []).map(item => ({
        ...item,
        responses: item.responses as unknown as Array<{
          sectionIndex: number;
          questionIndex: number;
          answer: any;
        }>
      }));

      setResponses(formattedResponses);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load responses");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!survey || responses.length === 0) return;

    const headers = ["Submitted At"];
    const allQuestions: string[] = [];

    survey.sections.forEach((section: any) => {
      section.questions.forEach((question: any) => {
        allQuestions.push(`${section.name} - ${question.text}`);
      });
    });

    headers.push(...allQuestions);

    const csvRows = [headers.join(",")];

    responses.forEach((response) => {
      const row = [format(new Date(response.submitted_at), "PPpp")];
      
      const responseMap = new Map(
        response.responses.map((r: any) => [`${r.sectionIndex}-${r.questionIndex}`, r.answer])
      );

      let questionIndex = 0;
      survey.sections.forEach((section: any, sectionIndex: number) => {
        section.questions.forEach((_question: any, qIndex: number) => {
          const key = `${sectionIndex}-${qIndex}`;
          const answer = responseMap.get(key);
          const answerStr = Array.isArray(answer) ? answer.join("; ") : (answer || "");
          row.push(`"${String(answerStr).replace(/"/g, '""')}"`);
          questionIndex++;
        });
      });

      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${survey.title}_responses.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(t("responsesExported"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(isOwner ? "/dashboard" : "/community")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isOwner ? t("backToHome") : "Torna alla Community"}
          </Button>
          <h1 className="text-4xl font-bold">{survey.title}</h1>
        </div>

        {isPublic && !isOwner && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              Stai visualizzando le risposte pubbliche di questo questionario
            </AlertDescription>
          </Alert>
        )}

        {isPublic && isOwner && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              Queste risposte sono pubbliche e visibili a tutti gli utenti autenticati
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between items-center mb-6">
          <p className="text-lg text-muted-foreground">
            {responses.length} {t("responses")}
          </p>
          {responses.length > 0 && (
            <Button onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t("exportResponses")}
            </Button>
          )}
        </div>

        {responses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-xl text-muted-foreground mb-2">{t("noResponses")}</p>
              <p className="text-sm text-muted-foreground">{t("noResponsesDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <Card key={response.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t("submittedAt")}: {format(new Date(response.submitted_at), "PPpp")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {survey.sections.map((section: any, sectionIndex: number) => (
                      <div key={sectionIndex}>
                        <h3 className="font-semibold mb-3">{section.name}</h3>
                        <div className="space-y-2">
                          {section.questions.map((question: any, questionIndex: number) => {
                            const responseItem = response.responses.find(
                              (r: any) => r.sectionIndex === sectionIndex && r.questionIndex === questionIndex
                            );
                            
                            return (
                              <div key={questionIndex} className="pl-4">
                                <p className="text-sm font-medium text-muted-foreground">{question.text}</p>
                                <p className="text-base">
                                  {Array.isArray(responseItem?.answer)
                                    ? responseItem.answer.join(", ")
                                    : responseItem?.answer || "-"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyResponses;
