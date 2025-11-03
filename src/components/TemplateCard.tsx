import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Coins, User, TrendingUp, Eye } from "lucide-react";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";

interface TemplateCardProps {
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

export const TemplateCard = ({ template, onClone, userCredits }: TemplateCardProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const questionCount = template.surveys.sections?.reduce(
    (acc: number, section: any) => acc + (section.questions?.length || 0), 
    0
  ) || 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.surveys.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {template.surveys.description || "Nessuna descrizione"}
            </CardDescription>
          </div>
          <Badge variant={template.is_free ? "secondary" : "default"} className="shrink-0">
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
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{questionCount} domande</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{template.times_cloned} utilizzi</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Creato da <span className="font-medium text-foreground">
                {template.profiles?.full_name || "Anonimo"}
              </span>
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(true)} className="flex-1">
              <Eye className="h-4 w-4 mr-1" />
              Anteprima
            </Button>
            <Button onClick={onClone} className="flex-1">
              Usa Template
            </Button>
          </div>
        </div>
      </CardContent>

      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        template={template}
        onClone={onClone}
        userCredits={userCredits}
      />
    </Card>
  );
};
