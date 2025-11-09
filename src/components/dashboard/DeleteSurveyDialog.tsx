import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface DeleteSurveyDialogProps {
  surveyId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteSurveyDialog = ({ surveyId, onClose, onSuccess }: DeleteSurveyDialogProps) => {
  const { t } = useLanguage();

  const handleDelete = async () => {
    if (!surveyId) return;

    try {
      const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId);

      if (error) throw error;

      toast.success(t("surveyDeleted"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting survey:", error);
      toast.error("Failed to delete survey");
    }
  };

  return (
    <AlertDialog open={!!surveyId} onOpenChange={onClose}>
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
  );
};
