import { useState } from "react";
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
import { CalendarIcon, Info } from "lucide-react";
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
}

export const SaveSurveyDialog = ({ open, onOpenChange, sections, surveyLanguage }: SaveSurveyDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [expiredMessage, setExpiredMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleQuickExpiration = (days: number | null) => {
    if (days === null) {
      setExpiresAt(undefined);
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      setExpiresAt(date);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t("titleRequired"), {
        description: t("titleRequiredDesc")
      });
      return;
    }

    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);

    try {
      // Check if there's a draft to update
      const { data: existingDrafts } = await supabase
        .from('surveys')
        .select('id, share_token')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1);

      let shareToken: string;
      let surveyId: string | null = null;

      if (existingDrafts && existingDrafts.length > 0) {
        // Update existing draft to published
        shareToken = existingDrafts[0].share_token;
        surveyId = existingDrafts[0].id;

        const { error } = await supabase
          .from("surveys")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            sections: sections as any,
            language: surveyLanguage,
            is_active: true,
            status: 'published',
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            expired_message: expiredMessage.trim() || null
          })
          .eq('id', surveyId);

        if (error) throw error;
      } else {
        // Create new published survey
        shareToken = crypto.randomUUID();

        const { data, error } = await supabase
          .from("surveys")
          .insert([{
            user_id: user.id,
            title: title.trim(),
            description: description.trim() || null,
            sections: sections as any,
            language: surveyLanguage,
            share_token: shareToken,
            is_active: true,
            status: 'published',
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            expired_message: expiredMessage.trim() || null
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) surveyId = data.id;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Popover>
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
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
              disabled={saving}
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
