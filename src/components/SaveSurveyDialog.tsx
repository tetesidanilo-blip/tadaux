import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Section {
  name: string;
  questions: any[];
}

interface SaveSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  surveyLanguage: string;
  editingSurveyId?: string | null;
}

export const SaveSurveyDialog = ({ open, onOpenChange, sections, surveyLanguage, editingSurveyId }: SaveSurveyDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [expiredMessage, setExpiredMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [userTier, setUserTier] = useState<string>('free');
  const [visibleInCommunity, setVisibleInCommunity] = useState(false);
  const [responsesPublic, setResponsesPublic] = useState(false);
  const [legalConsent, setLegalConsent] = useState(false);
  const [expiresPopoverOpen, setExpiresPopoverOpen] = useState(false);

  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Auto-populate title with first section name when dialog opens
  useEffect(() => {
    if (open && !title && sections.length > 0 && sections[0].name) {
      setTitle(sections[0].name);
    }
  }, [open, sections]);

  // Fetch user tier when dialog opens
  useEffect(() => {
    const fetchUserTier = async () => {
      if (user && open) {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
        
        const tier = data?.subscription_tier || 'free';
        setUserTier(tier);
        
        // Auto-set for FREE tier
        if (tier === 'free') {
          setVisibleInCommunity(true);
        }
      }
    };
    fetchUserTier();
  }, [user, open]);

  const handleQuickExpiration = (days: number | null) => {
    if (days === null) {
      setExpiresAt(undefined);
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      setExpiresAt(date);
    }
  };

  const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

  const ensureUniqueTitle = async (baseTitle: string, userId: string, currentSurveyId?: string | null): Promise<string> => {
    // Query to find all user surveys with similar titles
    const { data: existingSurveys } = await supabase
      .from('surveys')
      .select('title, id')
      .eq('user_id', userId);
    
    if (!existingSurveys) return baseTitle;
    
    const baseNorm = normalize(baseTitle);
    const others = existingSurveys
      .filter(s => currentSurveyId ? s.id !== currentSurveyId : true)
      .map(s => ({ id: s.id, title: s.title, norm: normalize(s.title) }));
    
    // If the base title doesn't exist, use it directly
    if (!others.some(o => o.norm === baseNorm)) {
      return baseTitle;
    }
    
    // Find the highest number already used for this title
    const escapedTitle = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedTitle} \\((\\d+)\\)$`, 'i');
    let maxNumber = 0;
    
    others.forEach(o => {
      const match = o.title.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
    
    // Return the new title with the next number
    return `${baseTitle} (${maxNumber + 1})`;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t("titleRequired"), {
        description: t("titleRequiredDesc")
      });
      return;
    }

    if (responsesPublic && !legalConsent) {
      toast.error("Consenso richiesto", {
        description: "Devi confermare di assumerti la responsabilità delle risposte pubblicate"
      });
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);

    try {
      let shareToken: string;
      let surveyId: string | null = null;

      // If we're editing an existing survey
      if (editingSurveyId) {
        // Ensure unique title for editing
        const uniqueTitle = await ensureUniqueTitle(title.trim(), user.id, editingSurveyId);
        
        // Notify user if title was changed
        if (uniqueTitle !== title.trim()) {
          toast.info("Titolo modificato", {
            description: `Un survey con questo nome esiste già. Rinominato in "${uniqueTitle}"`
          });
        }

        const { data: existingSurvey } = await supabase
          .from('surveys')
          .select('share_token')
          .eq('id', editingSurveyId)
          .single();

        shareToken = existingSurvey?.share_token || crypto.randomUUID();
        surveyId = editingSurveyId;

        const { error } = await supabase
          .from("surveys")
          .update({
            title: uniqueTitle,
            description: description.trim() || null,
            sections: sections as any,
            language: surveyLanguage,
            is_active: true,
            status: 'published',
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            expired_message: expiredMessage.trim() || null,
            visible_in_community: userTier === 'free' ? true : visibleInCommunity,
            responses_public: responsesPublic,
            updated_at: new Date().toISOString()
          })
          .eq('id', surveyId);

        if (error) throw error;
      } else {
        // Check if there's a draft to update
        const { data: existingDrafts } = await supabase
          .from('surveys')
          .select('id, share_token')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (existingDrafts && existingDrafts.length > 0) {
          // Ensure unique title for draft update
          const uniqueTitle = await ensureUniqueTitle(title.trim(), user.id, existingDrafts[0].id);
          
          // Notify user if title was changed
          if (uniqueTitle !== title.trim()) {
            toast.info("Titolo modificato", {
              description: `Un survey con questo nome esiste già. Rinominato in "${uniqueTitle}"`
            });
          }

          // Update existing draft to published
          shareToken = existingDrafts[0].share_token;
          surveyId = existingDrafts[0].id;

          const { error } = await supabase
            .from("surveys")
            .update({
              title: uniqueTitle,
              description: description.trim() || null,
              sections: sections as any,
              language: surveyLanguage,
              is_active: true,
              status: 'published',
              expires_at: expiresAt ? expiresAt.toISOString() : null,
              expired_message: expiredMessage.trim() || null,
              visible_in_community: userTier === 'free' ? true : visibleInCommunity,
              responses_public: responsesPublic
            })
            .eq('id', surveyId);

          if (error) throw error;
        } else {
          // Ensure unique title for new survey
          const uniqueTitle = await ensureUniqueTitle(title.trim(), user.id, null);
          
          // Notify user if title was changed
          if (uniqueTitle !== title.trim()) {
            toast.info("Titolo modificato", {
              description: `Un survey con questo nome esiste già. Rinominato in "${uniqueTitle}"`
            });
          }

          // Create new published survey
          shareToken = crypto.randomUUID();

          const { data, error } = await supabase
            .from("surveys")
            .insert([{
              user_id: user.id,
              title: uniqueTitle,
              description: description.trim() || null,
              sections: sections as any,
              language: surveyLanguage,
              share_token: shareToken,
              is_active: true,
              status: 'published',
              expires_at: expiresAt ? expiresAt.toISOString() : null,
              expired_message: expiredMessage.trim() || null,
              visible_in_community: userTier === 'free' ? true : visibleInCommunity,
              responses_public: responsesPublic
            }])
            .select()
            .single();

          if (error) throw error;
          if (data) surveyId = data.id;
        }
      }

      const surveyLink = `${window.location.origin}/survey/${shareToken}`;
      
      toast.success(t("surveySaved"), {
        description: t("surveySavedDesc"),
        action: {
          label: t("copyLink"),
          onClick: () => {
            navigator.clipboard.writeText(surveyLink);
            toast.success(t("linkCopied"));
          }
        }
      });

      onOpenChange(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving survey:", error);
      toast.error("Failed to save survey");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setExpiresPopoverOpen(false);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("saveSurvey")}</DialogTitle>
          <DialogDescription>
            {t("surveyTitle")}
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("surveyTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("surveyTitlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("surveyDescription")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("surveyDescriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label>{t("expirationDate")}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Imposta quando il questionario smetterà di accettare risposte. Puoi lasciarlo vuoto per un questionario sempre attivo.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExpiration(7)}
              >
                {t("days7")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExpiration(30)}
              >
                {t("days30")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickExpiration(null)}
              >
                {t("noExpirationOption")}
              </Button>
            </div>
            <Popover open={expiresPopoverOpen} onOpenChange={setExpiresPopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP") : <span>{t("pickDate")}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" onInteractOutside={() => setExpiresPopoverOpen(false)}>
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => {
                    setExpiresAt(date);
                    setExpiresPopoverOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {expiresAt && (
            <div className="space-y-2">
              <Label htmlFor="expiredMessage">{t("customExpirationMessage")}</Label>
              <Textarea
                id="expiredMessage"
                value={expiredMessage}
                onChange={(e) => setExpiredMessage(e.target.value)}
                placeholder={t("customExpirationPlaceholder")}
                rows={2}
              />
            </div>
          )}

          {/* Visibility Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Visibilità</h3>
            
            {/* Survey Visibility (Questions) */}
            {userTier === 'free' ? (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  I questionari del piano Free sono automaticamente visibili nella Community
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visible-community"
                  checked={visibleInCommunity}
                  onCheckedChange={(checked) => setVisibleInCommunity(checked as boolean)}
                />
                <Label htmlFor="visible-community" className="text-sm font-normal cursor-pointer">
                  Rendi le domande visibili nella Community
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Altri utenti potranno vedere e compilare il tuo questionario</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Responses Visibility */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="responses-public"
                  checked={responsesPublic}
                  onCheckedChange={(checked) => {
                    setResponsesPublic(checked as boolean);
                    if (!checked) setLegalConsent(false);
                  }}
                />
                <Label htmlFor="responses-public" className="text-sm font-normal cursor-pointer">
                  Rendi pubbliche le risposte raccolte
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Le risposte saranno visibili a tutti gli utenti autenticati. Assicurati di avere il consenso dei partecipanti.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {responsesPublic && (
                <div className="space-y-2 pl-6">
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-900 dark:text-amber-100 text-xs">
                      ⚠️ Condividendo le risposte, ti assumi la responsabilità legale del contenuto pubblicato. La piattaforma si riserva il diritto di rimuovere contenuti inappropriati o illegali.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="legal-consent"
                      checked={legalConsent}
                      onCheckedChange={(checked) => setLegalConsent(checked as boolean)}
                      required={responsesPublic}
                    />
                    <Label htmlFor="legal-consent" className="text-xs font-normal leading-tight cursor-pointer">
                      Confermo di avere ottenuto il consenso necessario dai partecipanti e di assumermi la responsabilità del contenuto delle risposte pubblicate
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (responsesPublic && !legalConsent)}
              className="flex-1"
            >
              {saving ? t("submitting") : t("save")}
            </Button>
          </div>
        </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};
