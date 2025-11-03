import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Coins } from "lucide-react";

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    credit_price: number;
    is_free: boolean;
    times_cloned: number;
    surveys: {
      title: string;
      description: string | null;
      sections: any;
    };
    profiles: {
      full_name: string | null;
    };
  };
  onClone: () => void;
  userCredits?: number;
}

export const TemplatePreviewDialog = ({ 
  open, 
  onOpenChange, 
  template, 
  onClone,
  userCredits 
}: TemplatePreviewDialogProps) => {
  const sections = template.surveys.sections || [];
  const totalQuestions = sections.reduce(
    (acc: number, section: any) => acc + (section.questions?.length || 0), 
    0
  );

  const canAfford = template.is_free || (userCredits !== undefined && userCredits >= template.credit_price);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{template.surveys.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {template.surveys.description || "Nessuna descrizione disponibile"}
              </DialogDescription>
            </div>
            <Badge variant={template.is_free ? "secondary" : "default"}>
              {template.is_free ? (
                "Gratis"
              ) : (
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {template.credit_price}
                </span>
              )}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{totalQuestions} domande</span>
            </div>
            <span>•</span>
            <span>Creato da <span className="font-medium text-foreground">
              {template.profiles?.full_name || "Anonimo"}
            </span></span>
            <span>•</span>
            <span>{template.times_cloned} utilizzi</span>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {sections.map((section: any, sectionIndex: number) => (
              <div key={sectionIndex} className="space-y-3">
                <h3 className="font-semibold text-lg">
                  {section.name || `Sezione ${sectionIndex + 1}`}
                </h3>
                
                <div className="space-y-2 pl-4">
                  {section.questions?.map((question: any, qIndex: number) => (
                    <div key={qIndex} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium text-muted-foreground shrink-0">
                          {qIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">{question.text || question.question}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {question.type}
                            </Badge>
                            {question.required && (
                              <Badge variant="secondary" className="text-xs">
                                Obbligatorio
                              </Badge>
                            )}
                          </div>
                          {question.options && question.options.length > 0 && (
                            <div className="mt-2 pl-3 space-y-1">
                              {question.options.map((option: string, optIndex: number) => (
                                <div key={optIndex} className="text-xs text-muted-foreground">
                                  • {option}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <Button 
            onClick={() => {
              onClone();
              onOpenChange(false);
            }}
            disabled={!canAfford}
          >
            {canAfford ? "Clona Template" : "Crediti Insufficienti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
