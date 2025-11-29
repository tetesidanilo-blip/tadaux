import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Section } from "@/hooks/useSurveyState";
import { useLanguage } from "@/contexts/LanguageContext";

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  onPublish: () => void;
}

export const PreviewDialog = ({
  open,
  onOpenChange,
  sections,
  onPublish,
}: PreviewDialogProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("surveyPreview")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-4">
              <h3 className="text-xl font-semibold">{section.name}</h3>
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground">{questionIndex + 1}.</span>
                    <div className="flex-1">
                      <p className="font-medium">{question.question}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {question.type === "multiple" && "Risposta multipla"}
                        {question.type === "single" && "Risposta singola"}
                        {question.type === "open" && "Risposta aperta"}
                      </p>
                      {question.options && question.options.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              {question.type === "multiple" ? (
                                <Checkbox disabled />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2" />
                              )}
                              <span className="text-sm">{option}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {question.type === "open" && (
                        <Textarea className="mt-3" disabled placeholder="Risposta aperta..." />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <Button onClick={onPublish}>Pubblica</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
