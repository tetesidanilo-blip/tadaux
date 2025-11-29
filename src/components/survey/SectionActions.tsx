import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionActionsProps {
  sectionIndex: number;
  isGenerating: boolean;
  onContinuePrevious: () => void;
  onNewModel: () => void;
}

export const SectionActions = ({
  sectionIndex,
  isGenerating,
  onContinuePrevious,
  onNewModel,
}: SectionActionsProps) => {
  const { t } = useLanguage();

  return (
    <div className="mt-4 pt-4 border-t space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onContinuePrevious}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("generating")}
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Continua con modello precedente
          </>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNewModel}
        disabled={isGenerating}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Nuovo modello/argomento
      </Button>
    </div>
  );
};
