import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { SurveyState, SurveyAction } from "@/hooks/useSurveyState";

interface MoreQuestionsDialogProps {
  open: boolean;
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
  onGenerate: () => void;
}

export const MoreQuestionsDialog = ({
  open,
  state,
  dispatch,
  onGenerate,
}: MoreQuestionsDialogProps) => {
  const { newModelDescription, moreQuestionsCount } = state;

  return (
    <Dialog open={open} onOpenChange={(o) => dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: o })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuovo Modello/Argomento</DialogTitle>
          <DialogDescription>
            Inserisci le indicazioni per creare domande su un nuovo modello o argomento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrivi il nuovo modello o argomento</label>
            <Textarea
              placeholder="Es: Crea domande sul modello di leadership trasformazionale, sui principi della fisica quantistica, etc..."
              value={newModelDescription}
              onChange={(e) => dispatch({ type: 'SET_NEW_MODEL_DESCRIPTION', payload: e.target.value })}
              className="min-h-32"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="moreQuestionsCount">Numero di domande</Label>
            <Select
              value={moreQuestionsCount === null ? "auto" : moreQuestionsCount.toString()}
              onValueChange={(value) =>
                dispatch({ type: 'SET_MORE_QUESTIONS_COUNT', payload: value === "auto" ? null : parseInt(value) })
              }
            >
              <SelectTrigger id="moreQuestionsCount">
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

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                dispatch({ type: 'SET_SHOW_MORE_QUESTIONS_DIALOG', payload: false });
                dispatch({ type: 'RESET_MORE_QUESTIONS_FORM' });
              }}
            >
              Annulla
            </Button>
            <Button onClick={onGenerate} disabled={!newModelDescription.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Genera Domande
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
