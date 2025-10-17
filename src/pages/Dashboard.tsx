import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Copy, ExternalLink, Eye, Power, PowerOff, Trash2, Plus, BarChart, Clock, Mail, QrCode, Edit, AlertCircle, Crown, Users } from "lucide-react";
import { CreateResearchRequestDialog } from "@/components/CreateResearchRequestDialog";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { SurveyGenerator } from "@/components/SurveyGenerator";
import { Navbar } from "@/components/Navbar";
import { QRCodeSVG } from "qrcode.react";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  share_token: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  response_count?: number;
  visible_in_community?: boolean;
  responses_public?: boolean;
}

const Dashboard = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [extendSurveyId, setExtendSurveyId] = useState<string | null>(null);
  const [newExpiryDays, setNewExpiryDays] = useState<number>(7);
  const [qrCodeSurvey, setQrCodeSurvey] = useState<string | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<any | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [findParticipantsSurveyId, setFindParticipantsSurveyId] = useState<string | null>(null);
  const [createRequestDialogOpen, setCreateRequestDialogOpen] = useState(false);
  const [activateSurveyId, setActivateSurveyId] = useState<string | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [expiryTime, setExpiryTime] = useState<string>("23:59");
  
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadSurveys();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setUserProfile(data);
  };

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

  const handleActivateClick = (id: string, currentState: boolean) => {
    if (currentState) {
      // If currently active, deactivate immediately
      toggleActive(id, true);
    } else {
      // If currently inactive, show activation dialog
      setActivateSurveyId(id);
      setExpiryDate(undefined);
      setExpiryTime("23:59");
    }
  };

  const toggleActive = async (id: string, currentState: boolean, expiresAt?: string | null) => {
    try {
      const updateData: any = { is_active: !currentState };
      
      // If activating with an expiry date, set it
      if (!currentState && expiresAt) {
        updateData.expires_at = expiresAt;
      }
      
      // If deactivating, clear expiry date
      if (currentState) {
        updateData.expires_at = null;
      }

      const { error } = await supabase
        .from("surveys")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success(!currentState ? t("surveyActivated") : t("surveyDeactivated"));
      loadSurveys();
    } catch (error) {
      console.error("Error toggling survey:", error);
      toast.error("Failed to update survey");
    }
  };

  const handleConfirmActivation = () => {
    if (!activateSurveyId) return;

    let expiresAtValue: string | null = null;

    if (expiryDate) {
      // Combine date and time
      const [hours, minutes] = expiryTime.split(':');
      const combinedDateTime = new Date(expiryDate);
      combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      expiresAtValue = combinedDateTime.toISOString();
    }

    toggleActive(activateSurveyId, false, expiresAtValue);
    setActivateSurveyId(null);
    setExpiryDate(undefined);
    setExpiryTime("23:59");
  };

  const copyLink = (shareToken: string) => {
    const link = `${window.location.origin}/survey/${shareToken}`;
    navigator.clipboard.writeText(link);
    toast.success(t("linkCopied"), {
      description: t("linkCopiedDesc")
    });
  };

  const shareViaEmail = (shareToken: string, title: string) => {
    const link = `${window.location.origin}/survey/${shareToken}`;
    const subject = encodeURIComponent(`${t("surveyInvitation")}: ${title}`);
    const body = encodeURIComponent(`${t("surveyEmailBody")}\n\n${link}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaWhatsApp = (shareToken: string, title: string) => {
    const link = `${window.location.origin}/survey/${shareToken}`;
    const text = encodeURIComponent(`${t("surveyWhatsAppMsg")} "${title}": ${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const isSurveyExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const handleEditSurvey = async (surveyId: string) => {
    try {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

      if (error) throw error;

      setEditingSurvey(data);
      setShowGenerator(true);
    } catch (error) {
      console.error("Error loading survey:", error);
      toast.error("Failed to load survey for editing");
    }
  };

  const handleStartEditTitle = (id: string, currentTitle: string) => {
    setEditingTitleId(id);
    setEditingTitleValue(currentTitle || "");
  };

  const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

  const ensureUniqueTitle = async (baseTitle: string, userId: string, currentSurveyId?: string): Promise<string> => {
    const { data: existingSurveys } = await supabase
      .from("surveys")
      .select("id, title")
      .eq("user_id", userId);

    if (!existingSurveys) return baseTitle;

    const baseNorm = normalize(baseTitle);
    const others = existingSurveys
      .filter(s => (currentSurveyId ? s.id !== currentSurveyId : true))
      .map(s => ({ id: s.id, title: s.title, norm: normalize(s.title) }));

    // Check if same normalized title exists
    const existsSame = others.some(o => o.norm === baseNorm);
    if (!existsSame) return baseTitle;

    // Find max existing suffix
    const escaped = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped} \\((\\d+)\\)$`, "i");
    let max = 0;

    for (const o of others) {
      const m = o.title.match(pattern);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > max) max = n;
      }
    }

    return `${baseTitle} (${max + 1})`;
  };

  const handleSaveTitle = async (id: string) => {
    const trimmedTitle = editingTitleValue.trim();
    
    if (!trimmedTitle) {
      toast.error(t("titleRequired"));
      setEditingTitleId(null);
      return;
    }

    if (!user) return;

    try {
      const uniqueTitle = await ensureUniqueTitle(trimmedTitle, user.id, id);
      
      if (uniqueTitle !== trimmedTitle) {
        toast.info("Titolo modificato", {
          description: `Un questionario con questo titolo esiste già. Rinominato in "${uniqueTitle}"`,
        });
      }

      const { error } = await supabase
        .from("surveys")
        .update({ title: uniqueTitle })
        .eq("id", id);

      if (error) throw error;

      setSurveys(surveys.map(s => 
        s.id === id ? { ...s, title: uniqueTitle } : s
      ));
      
      toast.success(t("titleUpdated") || "Titolo aggiornato");
      setEditingTitleId(null);
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showGenerator) {
    return <SurveyGenerator 
      onBack={() => {
        setShowGenerator(false);
        setEditingSurvey(null);
        loadSurveys();
      }} 
      editingSurvey={editingSurvey}
    />;
  }

  const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
  const activeSurveys = surveys.filter(s => s.is_active && !isSurveyExpired(s.expires_at)).length;
  const expiredSurveys = surveys.filter(s => isSurveyExpired(s.expires_at)).length;

  const isFreeUser = userProfile?.subscription_tier === 'free';
  const surveysCreated = userProfile?.surveys_created_count || 0;
  const responsesCollected = userProfile?.total_responses_collected || 0;
  const canCreateSurvey = !isFreeUser || surveysCreated < 10;

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
            disabled={!canCreateSurvey}
            title={!canCreateSurvey ? "Free tier limit reached. Upgrade to Pro for unlimited surveys." : ""}
          >
            <Plus className="h-5 w-5" />
            {t("createNew")}
          </Button>
        </div>

        {/* Usage Limits Card - Only for Free users */}
        {isFreeUser && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardContent className="flex items-center gap-4 pt-6">
              <AlertCircle className="h-8 w-8 text-primary flex-shrink-0" />
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-semibold">
                    Free Plan
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    You're using the Free plan
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Surveys Created</span>
                      <span className="font-medium">{surveysCreated}/10</span>
                    </div>
                    <Progress value={(surveysCreated / 10) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Responses Collected</span>
                      <span className="font-medium">{responsesCollected}/20</span>
                    </div>
                    <Progress value={(responsesCollected / 20) * 100} />
                  </div>
                </div>
              </div>
              
              <Button onClick={() => setUpgradeDialogOpen(true)} className="flex-shrink-0">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </CardContent>
          </Card>
        )}

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
                        {editingTitleId === survey.id ? (
                          <Input
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onBlur={() => handleSaveTitle(survey.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveTitle(survey.id);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelEditTitle();
                              }
                            }}
                            autoFocus
                            className="text-xl font-semibold mb-2 h-auto py-1"
                          />
                        ) : (
                          <CardTitle 
                            className="text-xl mb-2 cursor-pointer hover:text-primary transition-colors"
                            onClick={() => handleStartEditTitle(survey.id, survey.title)}
                          >
                            {survey.title || t("untitledDraft")}
                          </CardTitle>
                        )}
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

                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-semibold">{survey.response_count}</span> {t("responses")}
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {(survey as any).visible_in_community && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Users className="h-3 w-3" />
                              Community
                            </Badge>
                          )}
                          {(survey as any).responses_public && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Eye className="h-3 w-3" />
                              Pubbliche
                            </Badge>
                          )}
                        </div>
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
                          onClick={() => setQrCodeSurvey(survey.share_token)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Code
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareViaEmail(survey.share_token, survey.title)}
                        >
                          <Mail className="h-4 w-4 mr-1" />
                          Email
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareViaWhatsApp(survey.share_token, survey.title)}
                        >
                          <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/survey-preview/${survey.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {t("view")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/survey-responses/${survey.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("responses")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateClick(survey.id, survey.is_active)}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSurvey(survey.id)}
                          className="col-span-2"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t("edit")}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setFindParticipantsSurveyId(survey.id);
                            setCreateRequestDialogOpen(true);
                          }}
                          className="col-span-2"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Find Participants
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

      <UpgradePlanDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTier={userProfile?.subscription_tier || 'free'}
      />

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

      {/* Activation Dialog */}
      <Dialog open={!!activateSurveyId} onOpenChange={() => setActivateSurveyId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attiva Questionario</DialogTitle>
            <DialogDescription>
              Puoi impostare una data e ora di scadenza opzionale. Se non imposti nulla, il questionario rimarrà attivo finché non lo disattivi manualmente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data di scadenza (opzionale)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : "Seleziona una data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {expiryDate && (
              <div className="space-y-2">
                <Label>Ora di scadenza</Label>
                <Input
                  type="time"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  className="w-full"
                />
              </div>
            )}

            {expiryDate && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Il questionario scadrà il:</p>
                <p className="text-muted-foreground mt-1">
                  {format(expiryDate, "PPP")} alle {expiryTime}
                </p>
              </div>
            )}

            {!expiryDate && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p>Il questionario rimarrà attivo finché non lo disattivi manualmente.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateSurveyId(null)}>
              Annulla
            </Button>
            <Button onClick={handleConfirmActivation}>
              Attiva Questionario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeSurvey} onOpenChange={() => setQrCodeSurvey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("qrCode")}</DialogTitle>
            <DialogDescription>{t("qrCodeDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {qrCodeSurvey && (
              <>
                <QRCodeSVG 
                  value={`${window.location.origin}/survey/${qrCodeSurvey}`}
                  size={256}
                  level="H"
                  includeMargin
                />
                <p className="text-sm text-muted-foreground text-center">
                  {t("scanToAccess")}
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrCodeSurvey(null)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Research Request Dialog */}
      <CreateResearchRequestDialog
        open={createRequestDialogOpen}
        onOpenChange={setCreateRequestDialogOpen}
        surveyId={findParticipantsSurveyId || undefined}
        onSuccess={() => {
          toast.success("Research request created successfully!");
          setFindParticipantsSurveyId(null);
        }}
      />
    </div>
  );
};

export default Dashboard;
