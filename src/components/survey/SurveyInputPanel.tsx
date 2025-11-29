import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { SurveyState, SurveyAction } from "@/hooks/useSurveyState";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyInputPanelProps {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  onGenerate: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SurveyInputPanel = ({
  state,
  dispatch,
  onGenerate,
  onFileUpload,
}: SurveyInputPanelProps) => {
  const { t } = useLanguage();
  const { description, sectionName, language, questionCount, isGenerating, sections, uploadedFile } = state;

  return (
    <Card className="p-6 backdrop-blur-sm bg-card/50">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t("surveyLanguage")} *
          </label>
          <select
            value={language}
            onChange={(e) => dispatch({ type: 'SET_LANGUAGE', payload: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            disabled={isGenerating}
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
            value={sectionName}
            onChange={(e) => dispatch({ type: 'SET_SECTION_NAME', payload: e.target.value })}
            disabled={isGenerating}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t("questionDescription")}
          </label>
          <Textarea
            placeholder={t("questionDescriptionPlaceholder")}
            value={description}
            onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', payload: e.target.value })}
            className="min-h-32"
            disabled={isGenerating}
          />
        </div>

        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {t("uploadDocument")}
          </label>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadedFile ? uploadedFile.name : t("chooseFile")}
            </Button>
            {uploadedFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_UPLOADED_FILE', payload: null })}
              >
                {t("clear")}
              </Button>
            )}
          </div>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.csv"
            className="hidden"
            onChange={onFileUpload}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {t("supportsFiles")} (PDF, Word, CSV)
          </p>
        </div>

        <div>
          <Label htmlFor="questionCount">Numero di domande</Label>
          <Select
            value={questionCount === null ? "auto" : questionCount.toString()}
            onValueChange={(value) => dispatch({ type: 'SET_QUESTION_COUNT', payload: value === "auto" ? null : parseInt(value) })}
          >
            <SelectTrigger id="questionCount">
              <SelectValue placeholder="-- Automatico (AI decide)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">-- Automatico (AI decide)</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <SelectItem key={num} value={num.toString()}>
                  {num} {num === 1 ? 'domanda' : 'domande'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={onGenerate}
          disabled={isGenerating || (!description && !uploadedFile) || !sectionName.trim()}
          className="w-full"
          size="lg"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: 'var(--shadow-elegant)',
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("generating")}
            </>
          ) : (
            sections.length > 0 ? t("addNewSection") : t("generateFirstSection")
          )}
        </Button>
      </div>
    </Card>
  );
};
