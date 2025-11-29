import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { SurveyState, SurveyAction } from "@/hooks/useSurveyState";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddSectionDialogProps {
  open: boolean;
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  onGenerate: () => void;
}

export const AddSectionDialog = ({
  open,
  state,
  dispatch,
  onGenerate,
}: AddSectionDialogProps) => {
  const { t } = useLanguage();
  const {
    newSectionTitle,
    newSectionDescription,
    newSectionLanguage,
    newSectionQuestionCount,
    generatingNewSection,
  } = state;

  return (
    <Dialog open={open} onOpenChange={(o) => dispatch({ type: 'SET_ADDING_SECTION_DIALOG', payload: o })}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addNewSection")}</DialogTitle>
          <DialogDescription>{t("newSectionDialogDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("surveyLanguage")} *
            </label>
            <select
              value={newSectionLanguage}
              onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_LANGUAGE', payload: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              disabled={generatingNewSection}
            >
              <option value="it">Italiano</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
              <option value="nl">Nederlands</option>
              <option value="pl">Polski</option>
              <option value="ru">Русский</option>
              <option value="zh">中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("sectionName")} *
            </label>
            <Input
              placeholder={t("sectionNamePlaceholder")}
              value={newSectionTitle}
              onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_TITLE', payload: e.target.value })}
              disabled={generatingNewSection}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t("questionDescription")} *
            </label>
            <Textarea
              placeholder={t("questionDescriptionPlaceholder")}
              value={newSectionDescription}
              onChange={(e) => dispatch({ type: 'SET_NEW_SECTION_DESCRIPTION', payload: e.target.value })}
              className="min-h-24"
              disabled={generatingNewSection}
            />
          </div>

          <div>
            <Label htmlFor="newSectionQuestionCount">Numero di domande</Label>
            <Select
              value={newSectionQuestionCount === null ? "auto" : newSectionQuestionCount.toString()}
              onValueChange={(value) =>
                dispatch({ type: 'SET_NEW_SECTION_QUESTION_COUNT', payload: value === "auto" ? null : parseInt(value) })
              }
            >
              <SelectTrigger id="newSectionQuestionCount">
                <SelectValue placeholder="-- Automatico (AI decide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">-- Automatico (AI decide)</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'domanda' : 'domande'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'RESET_NEW_SECTION_FORM' })}
              disabled={generatingNewSection}
            >
              {t("cancel")}
            </Button>
            <Button onClick={onGenerate} disabled={generatingNewSection}>
              {generatingNewSection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("generateSection")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
