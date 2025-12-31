import React, { useState, useCallback, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Store } from "lucide-react";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { CreateResearchRequestDialog } from "@/components/CreateResearchRequestDialog";
import { toast } from "sonner";
import { SurveyGenerator } from "@/components/SurveyGenerator";
import { Navbar } from "@/components/Navbar";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { ExtendExpiryDialog } from "@/components/dashboard/ExtendExpiryDialog";
import { DeleteSurveyDialog } from "@/components/dashboard/DeleteSurveyDialog";
import { QrCodeDialog } from "@/components/dashboard/QrCodeDialog";
import { ActivateSurveyDialog } from "@/components/dashboard/ActivateSurveyDialog";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { UsageLimitsCard } from "@/components/dashboard/UsageLimitsCard";
import { SurveyCard, Survey } from "@/components/dashboard/SurveyCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

const SURVEYS_PER_PAGE = 12;

const Dashboard = () => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [extendSurveyId, setExtendSurveyId] = useState<string | null>(null);
  const [qrCodeSurvey, setQrCodeSurvey] = useState<string | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<any | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [findParticipantsSurveyId, setFindParticipantsSurveyId] = useState<string | null>(null);
  const [createRequestDialogOpen, setCreateRequestDialogOpen] = useState(false);
  const [activateSurveyId, setActivateSurveyId] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { 
    data: surveysData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['surveys', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return [];
      
      const from = pageParam * SURVEYS_PER_PAGE;
      const to = from + SURVEYS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from("surveys")
        .select("*, survey_responses(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      return data?.map((survey) => ({
        ...survey,
        response_count: survey.survey_responses?.[0]?.count || 0
      })) || [];
    },
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === SURVEYS_PER_PAGE ? pages.length : undefined,
    initialPageParam: 0,
    enabled: !!user?.id
  });

  const surveys: Survey[] = surveysData?.pages.flat() || [];

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  const refreshSurveys = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['surveys', user?.id] });
  }, [queryClient, user?.id]);

  const handleActivateClick = (id: string, currentState: boolean) => {
    if (currentState) {
      toggleActive(id, true);
    } else {
      setActivateSurveyId(id);
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const updateData: any = { 
        is_active: !currentState,
        expires_at: currentState ? null : undefined
      };

      const { error } = await supabase
        .from("surveys")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success(!currentState ? t("surveyActivated") : t("surveyDeactivated"));
      refreshSurveys();
    } catch (error) {
      console.error("Error toggling survey:", error);
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

    const existsSame = others.some(o => o.norm === baseNorm);
    if (!existsSame) return baseTitle;

    const escaped = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped} \\((\\d+)\\)$`, "i");
    
    const max = others.reduce((currentMax, o) => {
      const match = o.title.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        return !Number.isNaN(num) && num > currentMax ? num : currentMax;
      }
      return currentMax;
    }, 0);

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
        toast.info(t("titleModified") || "Title modified", {
          description: t("titleAlreadyExists") ? 
            t("titleAlreadyExists").replace("{title}", uniqueTitle) : 
            `A survey with this title already exists. Renamed to "${uniqueTitle}"`,
        });
      }

      const { error } = await supabase
        .from("surveys")
        .update({ title: uniqueTitle })
        .eq("id", id);

      if (error) throw error;

      toast.success(t("titleUpdated") || "Titolo aggiornato");
      refreshSurveys();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Navbar />
        <DashboardSkeleton />
      </div>
    );
  }

  if (showGenerator) {
    return <SurveyGenerator 
      onBack={() => {
        setShowGenerator(false);
        setEditingSurvey(null);
        refreshSurveys();
      }} 
      editingSurvey={editingSurvey}
    />;
  }

  const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
  const activeSurveys = surveys.filter(s => s.is_active && !isSurveyExpired(s.expires_at)).length;
  const expiredSurveys = surveys.filter(s => isSurveyExpired(s.expires_at)).length;

  const isFreeUser = profile?.subscription_tier === 'free';
  const surveysCreated = profile?.surveys_created_count || 0;
  const responsesCollected = profile?.total_responses_collected || 0;
  const canCreateSurvey = !isFreeUser || surveysCreated < 10;
  const userCredits = profile?.credits || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t("myQuestionnaires")}</h1>
            <div className="flex items-center gap-3">
              <CreditsDisplay credits={userCredits} />
              <Button variant="outline" size="sm" onClick={() => navigate('/community?tab=qshop')}>
                <Store className="h-4 w-4 mr-2" />
                Vai al Q Shop
              </Button>
            </div>
          </div>
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

        {isFreeUser && (
          <UsageLimitsCard 
            surveysCreated={surveysCreated}
            responsesCollected={responsesCollected}
            onUpgradeClick={() => setUpgradeDialogOpen(true)}
          />
        )}

        <DashboardStats 
          totalResponses={totalResponses}
          activeSurveys={activeSurveys}
          expiredSurveys={expiredSurveys}
        />

        {surveys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-xl text-muted-foreground mb-2">{t("noQuestionnaires")}</p>
              <p className="text-sm text-muted-foreground">{t("createFirstQuestionnaire")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                isEditingTitle={editingTitleId === survey.id}
                editingTitleValue={editingTitleValue}
                onEditTitleChange={setEditingTitleValue}
                onStartEditTitle={() => handleStartEditTitle(survey.id, survey.title)}
                onSaveTitle={() => handleSaveTitle(survey.id)}
                onCancelEditTitle={handleCancelEditTitle}
                onCopyLink={() => copyLink(survey.share_token)}
                onQrCode={() => setQrCodeSurvey(survey.share_token)}
                onShareEmail={() => shareViaEmail(survey.share_token, survey.title)}
                onShareWhatsApp={() => shareViaWhatsApp(survey.share_token, survey.title)}
                onView={() => navigate(`/survey-preview/${survey.id}`)}
                onViewResponses={() => navigate(`/survey-responses/${survey.id}`)}
                onToggleActive={() => handleActivateClick(survey.id, survey.is_active)}
                onExtendExpiry={() => setExtendSurveyId(survey.id)}
                onDelete={() => setDeleteId(survey.id)}
                onEdit={() => handleEditSurvey(survey.id)}
                onFindParticipants={() => {
                  setFindParticipantsSurveyId(survey.id);
                  setCreateRequestDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {hasNextPage && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isFetchingNextPage ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage}
              >
                Carica altri questionari
              </Button>
            )}
          </div>
        )}
      </div>

      <UpgradePlanDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        currentTier={profile?.subscription_tier || 'free'}
      />

      <DeleteSurveyDialog
        surveyId={deleteId}
        onClose={() => setDeleteId(null)}
        onSuccess={refreshSurveys}
      />

      <ExtendExpiryDialog
        surveyId={extendSurveyId}
        onClose={() => setExtendSurveyId(null)}
        onSuccess={refreshSurveys}
      />

      <ActivateSurveyDialog
        surveyId={activateSurveyId}
        onClose={() => setActivateSurveyId(null)}
        onSuccess={refreshSurveys}
      />

      <QrCodeDialog
        shareToken={qrCodeSurvey}
        onClose={() => setQrCodeSurvey(null)}
      />

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
