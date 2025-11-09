import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { addDays } from "date-fns";

interface ExtendExpiryDialogProps {
  surveyId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ExtendExpiryDialog = ({ surveyId, onClose, onSuccess }: ExtendExpiryDialogProps) => {
  const [newExpiryDays, setNewExpiryDays] = useState<number>(7);
  const { t } = useLanguage();

  const handleExtend = async () => {
    if (!surveyId) return;

    try {
      const newExpiryDate = addDays(new Date(), newExpiryDays);
      
      const { error } = await supabase
        .from("surveys")
        .update({ expires_at: newExpiryDate.toISOString() })
        .eq("id", surveyId);

      if (error) throw error;

      toast.success(t("expiryExtended"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error extending expiry:", error);
      toast.error("Failed to extend expiry");
    }
  };

  return (
    <Dialog open={!!surveyId} onOpenChange={onClose}>
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
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={handleExtend}>
            {t("extend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
