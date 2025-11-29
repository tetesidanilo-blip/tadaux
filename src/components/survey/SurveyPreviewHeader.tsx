import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Download, Eye, FileText, Undo2, Redo2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SurveyPreviewHeaderProps {
  isSaving: boolean;
  historyIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onClearAll: () => void;
  onExportCSV: () => void;
  onExportWord: () => void;
  onExportPDF: () => void;
}

export const SurveyPreviewHeader = ({
  isSaving,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  onPreview,
  onClearAll,
  onExportCSV,
  onExportWord,
  onExportPDF,
}: SurveyPreviewHeaderProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-bold">{t("yourSurvey")}</h3>
        {isSaving && (
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Salvataggio...
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onUndo}
          disabled={historyIndex <= 0}
          title="Annulla (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onRedo}
          disabled={historyIndex >= historyLength - 1}
          title="Ripeti (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
        <Button variant="outline" onClick={onPreview}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background">
            <DropdownMenuItem onClick={onExportCSV}>
              <FileText className="w-4 h-4 mr-2" />
              CSV (Google Forms)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportWord}>
              <FileText className="w-4 h-4 mr-2" />
              Word (.doc)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={onClearAll}>
          {t("clearAll")}
        </Button>
      </div>
    </div>
  );
};
