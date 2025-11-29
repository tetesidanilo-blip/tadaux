import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { SurveyAction } from "@/hooks/useSurveyState";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionHeaderProps {
  sectionName: string;
  sectionIndex: number;
  isEditing: boolean;
  editedName: string;
  dispatch: React.Dispatch<SurveyAction>;
  onRemove: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export const SectionHeader = ({
  sectionName,
  sectionIndex,
  isEditing,
  editedName,
  dispatch,
  onRemove,
  onSave,
  onCancel,
}: SectionHeaderProps) => {
  const { t } = useLanguage();

  if (isEditing) {
    return (
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editedName}
            onChange={(e) => dispatch({ type: 'SET_EDITED_SECTION_NAME', payload: e.target.value })}
            className="text-xl font-bold"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave();
              if (e.key === 'Escape') onCancel();
            }}
          />
          <Button variant="ghost" size="sm" onClick={onSave}>
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b pb-2">
      <h4
        className="text-xl font-bold text-primary cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
        onClick={() => dispatch({ type: 'START_EDIT_SECTION_NAME', payload: sectionIndex })}
        title="Clicca per modificare il nome"
      >
        {sectionName}
      </h4>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        {t("removeSection")}
      </Button>
    </div>
  );
};
