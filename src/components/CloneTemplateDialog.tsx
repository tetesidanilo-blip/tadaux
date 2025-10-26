import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coins, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CloneTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    credit_price: number;
    is_free: boolean;
    surveys: {
      title: string;
      sections: any;
    };
  } | null;
  userCredits: number;
  onSuccess?: () => void;
}

export const CloneTemplateDialog = ({ open, onOpenChange, template, userCredits, onSuccess }: CloneTemplateDialogProps) => {
  const [customTitle, setCustomTitle] = useState("");
  const [cloning, setCloning] = useState(false);
  const navigate = useNavigate();

  const handleClone = async () => {
    if (!template) return;

    setCloning(true);
    try {
      const { data, error } = await supabase.functions.invoke('clone-survey-template', {
        body: {
          templateId: template.id,
          customTitle: customTitle.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.error) {
        if (data.error === 'Insufficient credits') {
          toast.error('Crediti insufficienti', {
            description: `Ti servono ${data.required} crediti, ne hai ${data.available}`
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success('Template clonato!', {
        description: `Il questionario è stato aggiunto ai tuoi draft`,
        action: {
          label: 'Vai alla Dashboard',
          onClick: () => navigate('/dashboard')
        }
      });

      onOpenChange(false);
      setCustomTitle("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Clone error:', error);
      toast.error('Errore durante la clonazione', {
        description: error.message
      });
    } finally {
      setCloning(false);
    }
  };

  if (!template) return null;

  const questionCount = template.surveys.sections?.reduce(
    (acc: number, section: any) => acc + (section.questions?.length || 0), 
    0
  ) || 0;

  const insufficientCredits = !template.is_free && userCredits < template.credit_price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Clona Template</DialogTitle>
          <DialogDescription>
            Crea una copia personalizzabile di questo questionario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template Originale</Label>
            <div className="text-sm font-medium">{template.surveys.title}</div>
            <div className="text-xs text-muted-foreground">{questionCount} domande</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-title">Titolo Personalizzato (opzionale)</Label>
            <Input
              id="custom-title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`${template.surveys.title} (Copia)`}
            />
          </div>

          {!template.is_free && (
            <Alert className={insufficientCredits ? "border-destructive" : "border-amber-500"}>
              <Coins className={`h-4 w-4 ${insufficientCredits ? "text-destructive" : "text-amber-500"}`} />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Costo: {template.credit_price} crediti</span>
                  <span className="font-semibold">
                    Saldo: {userCredits} crediti
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {insufficientCredits && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Non hai abbastanza crediti. Completa il tuo profilo o crea template per guadagnarne.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cloning}>
            Annulla
          </Button>
          <Button onClick={handleClone} disabled={cloning || insufficientCredits}>
            {cloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clonazione...
              </>
            ) : (
              <>
                {template.is_free ? "Clona Gratis" : `Clona (${template.credit_price} crediti)`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
