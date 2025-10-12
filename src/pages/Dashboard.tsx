import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Copy, ExternalLink, Eye, Power, PowerOff, Trash2, Plus, BarChart, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { SurveyGenerator } from "@/components/SurveyGenerator";
import { Navbar } from "@/components/Navbar";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  share_token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  response_count?: number;
}

const Dashboard = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [extendSurveyId, setExtendSurveyId] = useState<string | null>(null);
  const [newExpiryDays, setNewExpiryDays] = useState<number>(7);
  
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSurveys();
    }
  }, [user]);

  const loadSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*, survey_responses(count)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const surveysWithCounts = data?.map((survey: any) => ({
        ...survey,
        response_count: survey.survey_responses?.[0]?.count || 0
      })) || [];

      setSurveys(surveysWithCounts);
    } catch (error) {
      console.error("Error loading surveys:", error);
      toast.error("Failed to load surveys");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendExpiry = async () => {
    if (!extendSurveyId) return;

    try {
      const newExpiryDate = addDays(new Date(), newExpiryDays);
      
      const { error } = await supabase
        .from("surveys")
        .update({ expires_at: newExpiryDate.toISOString() })
        .eq("id", extendSurveyId);

      if (error) throw error;

      toast.success(t("expiryExtended"));
      loadSurveys();
      setExtendSurveyId(null);
    } catch (error) {
      console.error("Error extending expiry:", error);
      toast.error("Failed to extend expiry");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success(t("surveyDeleted"));
      setSurveys(surveys.filter(s => s.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error("Failed to delete survey");
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast.success(!currentState ? t("surveyActivated") : t("surveyDeactivated"));
      loadSurveys();
    } catch (error) {
      console.error("Error updating survey:", error);
      toast.error("Failed to update survey");
    }
  };

  const copyLink = (shareToken: string) => {
    const link = `${window.location.origin}/survey/${shareToken}`;
    navigator.clipboard.writeText(link);
    toast.success(t("linkCopied"), {
      description: t("linkCopiedDesc")
    });
  };

  const isSurveyExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showGenerator) {
    return <SurveyGenerator onBack={() => setShowGenerator(false)} />;
  }

  const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
  const activeSurveys = surveys.filter(s => s.is_active && !isSurveyExpired(s.expires_at)).length;
  const expiredSurveys = surveys.filter(s => isSurveyExpired(s.expires_at)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{t("myQuestionnaires")}</h1>
          <Button 
            onClick={() => setShowGenerator(true)}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            {t("createNew")}
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("totalResponses")}</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalResponses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("activeSurveys")}</CardTitle>
              <Power className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSurveys}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("expiredSurveys")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiredSurveys}</div>
            </CardContent>
          </Card>
        </div>

        {surveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-xl text-muted-foreground mb-2">{t("noQuestionnaires")}</p>
              <p className="text-sm text-muted-foreground">{t("createFirstQuestionnaire")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => {
              const expired = isSurveyExpired(survey.expires_at);
              
              return (
                <Card key={survey.id} className="relative">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{survey.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {survey.description || "No description"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1">
                        {survey.is_active && !expired && (
                          <Badge variant="default">{t("active")}</Badge>
                        )}
                        {!survey.is_active && (
                          <Badge variant="secondary">{t("inactive")}</Badge>
                        )}
                        {expired && (
                          <Badge variant="destructive">{t("expired")}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{t("createdOn")} {format(new Date(survey.created_at), "PPP")}</span>
                        </div>
                        {survey.expires_at && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            <span className={expired ? "text-destructive" : ""}>
                              {t("expiresOn")} {format(new Date(survey.expires_at), "PPP")}
                            </span>
                          </div>
                        )}
                        {!survey.expires_at && (
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            <span>{t("noExpiration")}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-sm">
                        <span className="font-semibold">{survey.response_count}</span> {t("responses")}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(survey.share_token)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          {t("copyLink")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/survey/${survey.share_token}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/survey/${survey.id}/responses`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("responses")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(survey.id, survey.is_active)}
                        >
                          {survey.is_active ? (
                            <><PowerOff className="h-4 w-4 mr-1" />{t("deactivate")}</>
                          ) : (
                            <><Power className="h-4 w-4 mr-1" />{t("activate")}</>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExtendSurveyId(survey.id)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          {t("extendExpiry")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteId(survey.id)}
                          className="col-span-2"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t("delete")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmMsg")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend Expiry Dialog */}
      <Dialog open={!!extendSurveyId} onOpenChange={() => setExtendSurveyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("extendExpiry")}</DialogTitle>
            <DialogDescription>{t("extendExpiryDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("extendByDays")}</label>
              <div className="flex gap-2">
                {[7, 14, 30, 60].map((days) => (
                  <Button
                    key={days}
                    variant={newExpiryDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewExpiryDays(days)}
                  >
                    {days} {t("days")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendSurveyId(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleExtendExpiry}>
              {t("extend")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
